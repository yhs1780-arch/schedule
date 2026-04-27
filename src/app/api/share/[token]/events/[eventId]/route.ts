import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ token: string; eventId: string }> };

async function getCalByToken(token: string) {
  return prisma.calendar.findUnique({ where: { shareToken: token } });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { token, eventId } = await ctx.params;
  const cal = await getCalByToken(token);
  if (!cal) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (cal.shareRole !== "EDITOR") return NextResponse.json({ error: "편집 권한 없음" }, { status: 403 });

  const event = await prisma.event.findFirst({ where: { id: eventId, calendarId: cal.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  // 활동 로그
  const owner = await prisma.calendarMember.findFirst({ where: { calendarId: cal.id, role: "OWNER" } });
  if (owner) {
    await prisma.eventActivity.create({
      data: { eventId, actorId: owner.userId, action: `게스트(${body.guestName ?? "비회원"}) 일정 수정` },
    });
  }

  return NextResponse.json({ ok: true, event: updated });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { token, eventId } = await ctx.params;
  const cal = await getCalByToken(token);
  if (!cal) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (cal.shareRole !== "EDITOR") return NextResponse.json({ error: "편집 권한 없음" }, { status: 403 });

  const event = await prisma.event.findFirst({ where: { id: eventId, calendarId: cal.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.event.delete({ where: { id: eventId } });
  return NextResponse.json({ ok: true });
}
