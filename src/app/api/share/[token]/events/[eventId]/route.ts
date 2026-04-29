import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventSnapshotForRollback, notifyCalendarOwner } from "@/lib/owner-notifications";
import { allowShareRequest } from "@/lib/share-token";
import { requireCalendarShareForGuest } from "@/lib/share-guest-access";

type Ctx = { params: Promise<{ token: string; eventId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { token, eventId } = await ctx.params;
  if (!allowShareRequest(request, token)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }
  const access = await requireCalendarShareForGuest(request, token);
  if (!access.ok) return access.response;

  const cal = access.calendar;
  if (access.effectiveRole !== "EDITOR") return NextResponse.json({ error: "편집 권한 없음" }, { status: 403 });

  const event = await prisma.event.findFirst({ where: { id: eventId, calendarId: cal.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const prevEvent = { ...event };

  const body = (await request.json()) as {
    title?: string; startAt?: string; endAt?: string | null;
    allDay?: boolean; location?: string | null; locationDetail?: string | null; description?: string | null;
    url?: string | null; guestName?: string;
    tags?: string | null;
  };

  const updateData: Record<string, unknown> = {};
  if (body.title?.trim()) updateData.title = body.title.trim();
  if (body.startAt) updateData.startAt = new Date(body.startAt);
  if ("endAt" in body) updateData.endAt = body.endAt ? new Date(body.endAt) : null;
  if ("allDay" in body) updateData.allDay = body.allDay;
  if ("location" in body) updateData.location = body.location?.trim() || null;
  if ("locationDetail" in body) updateData.locationDetail = body.locationDetail?.trim() || null;
  if ("description" in body) updateData.description = body.description?.trim() || null;
  if ("url" in body) updateData.url = body.url?.trim() || null;
  if ("tags" in body) {
    if (body.tags === null || body.tags === "") updateData.tags = null;
    else {
      try {
        const raw = String(body.tags);
        const arr = raw.trim().startsWith("[") ? (JSON.parse(raw) as string[]) : raw.split(/[,\s#]+/).map(s => s.trim()).filter(Boolean);
        const clean = [...new Set(arr.map(t => String(t).trim()).filter(Boolean))].slice(0, 20);
        updateData.tags = clean.length ? JSON.stringify(clean) : null;
      } catch { /* ignore */ }
    }
  }

  if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "변경 사항 없음" }, { status: 400 });

  const updated = await prisma.event.update({ where: { id: eventId }, data: updateData });

  const guestLabel = (body.guestName ?? "비회원").trim() || "비회원";
  const owner = await prisma.calendarMember.findFirst({ where: { calendarId: cal.id, role: "OWNER" } });
  if (owner) {
    await prisma.eventActivity.create({
      data: { eventId, actorId: owner.userId, action: `게스트(${guestLabel}) 일정 수정` },
    });
  }

  const actionBits: string[] = [];
  if ("title" in updateData) actionBits.push("제목");
  if ("startAt" in updateData) actionBits.push("시작");
  if ("endAt" in updateData) actionBits.push("종료");
  if ("allDay" in updateData) actionBits.push("종일");
  if ("location" in updateData) actionBits.push("장소");
  if ("locationDetail" in updateData) actionBits.push("상세주소");
  if ("description" in updateData) actionBits.push("메모");
  if ("url" in updateData) actionBits.push("URL");
  if ("tags" in updateData) actionBits.push("태그");

  await notifyCalendarOwner({
    calendarId: cal.id,
    eventId: prevEvent.id,
    type: "event_edited",
    message: `게스트 "${guestLabel}"님이 "${prevEvent.title}" 일정을 수정했어요. (${actionBits.join(" · ") || "내용 반영"})`,
    actorName: `게스트 ${guestLabel}`,
    snapshot: eventSnapshotForRollback(prevEvent),
  });

  return NextResponse.json({ ok: true, event: updated });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { token, eventId } = await ctx.params;
  if (!allowShareRequest(request, token)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }
  const access = await requireCalendarShareForGuest(request, token);
  if (!access.ok) return access.response;

  const cal = access.calendar;
  if (access.effectiveRole !== "EDITOR") return NextResponse.json({ error: "편집 권한 없음" }, { status: 403 });

  const event = await prisma.event.findFirst({ where: { id: eventId, calendarId: cal.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let guestLabel = "게스트";
  try {
    const b = (await request.json()) as { guestName?: string };
    if (b?.guestName?.trim()) guestLabel = b.guestName.trim();
  } catch { /* 본문 없음 */ }

  const snap = eventSnapshotForRollback(event, { deleted: true });
  await prisma.event.delete({ where: { id: eventId } });

  await notifyCalendarOwner({
    calendarId: cal.id,
    eventId: event.id,
    type: "event_deleted",
    message: `게스트 "${guestLabel}"님이 "${event.title}" 일정을 삭제했어요. 알림에서 '일정 복원'을 누르면 되돌릴 수 있어요.`,
    actorName: `게스트 ${guestLabel}`,
    snapshot: snap,
  });

  return NextResponse.json({ ok: true });
}
