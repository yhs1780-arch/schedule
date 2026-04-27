import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditEvent, getCurrentUser } from "@/lib/auth";
import { getGoogleCalendarClient } from "@/lib/google-calendar";

type Ctx = { params: Promise<{ eventId: string }> };

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** 캘린더 OWNER 찾기 (본인이 아닌 경우에만 알림 생성) */
async function maybeNotifyOwner(opts: {
  calendarId: string;
  actorId: string;
  actorName: string;
  type: string;
  message: string;
  eventId: string;
  snapshot: Record<string, unknown>;
}) {
  const { calendarId, actorId, actorName, type, message, eventId, snapshot } = opts;
  const owner = await prisma.calendarMember.findFirst({
    where: { calendarId, role: "OWNER" },
    select: { userId: true },
  });
  if (!owner || owner.userId === actorId) return; // 본인이 오너이면 알림 불필요
  await prisma.notification.create({
    data: {
      userId: owner.userId,
      calendarId,
      eventId,
      actorName,
      type,
      message,
      snapshot: JSON.stringify(snapshot),
    },
  });
}

export async function PATCH(request: Request, context: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { eventId } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    startAt?: string;
    endAt?: string | null;
    allDay?: boolean;
    location?: string | null;
    locationDetail?: string | null;
    description?: string | null;
    url?: string | null;
    reminderMinutes?: string | null;
    calendarId?: string;
    isTask?: boolean;
    isDone?: boolean;
    tags?: string | null;
  };

  const editable = await canEditEvent(user.id, user.role, eventId);
  if (!editable) return NextResponse.json({ error: "No permission" }, { status: 403 });

  // 이전 상태 스냅샷 (롤백용)
  const prevEvent = await prisma.event.findUnique({ where: { id: eventId } });
  if (!prevEvent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: {
    title?: string;
    startAt?: Date;
    endAt?: Date | null;
    allDay?: boolean;
    location?: string | null;
    locationDetail?: string | null;
    description?: string | null;
    url?: string | null;
    reminderMinutes?: string | null;
    calendarId?: string;
    isTask?: boolean;
    isDone?: boolean;
    tags?: string | null;
  } = {};

  if (body.title?.trim()) updateData.title = body.title.trim();
  if (body.startAt?.trim()) updateData.startAt = new Date(body.startAt.trim());
  if ("endAt" in body) updateData.endAt = body.endAt ? new Date(body.endAt) : null;
  if ("allDay" in body) updateData.allDay = body.allDay;
  if ("location" in body) updateData.location = body.location?.trim() || null;
  if ("locationDetail" in body) updateData.locationDetail = body.locationDetail?.trim() || null;
  if ("description" in body) updateData.description = body.description?.trim() || null;
  if ("url" in body) updateData.url = body.url?.trim() || null;
  if ("reminderMinutes" in body) updateData.reminderMinutes = body.reminderMinutes?.trim() || null;
  if ("isTask" in body) updateData.isTask = body.isTask;
  if ("isDone" in body) updateData.isDone = body.isDone;
  if ("tags" in body) {
    if (body.tags === null || body.tags === "") updateData.tags = null;
    else {
      try {
        const raw = body.tags;
        const arr = typeof raw === "string" ? (raw.trim().startsWith("[") ? JSON.parse(raw) : raw.split(/[,\s#]+/).map(s => s.trim()).filter(Boolean)) : raw;
        if (Array.isArray(arr)) {
          const clean = [...new Set(arr.map((t: unknown) => String(t).trim()).filter(Boolean))].slice(0, 20);
          updateData.tags = clean.length ? JSON.stringify(clean) : null;
        }
      } catch { /* ignore */ }
    }
  }
  if (body.calendarId) {
    const access = await prisma.calendarMember.findFirst({
      where: { calendarId: body.calendarId, userId: user.id },
    });
    if (access) updateData.calendarId = body.calendarId;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "no updatable field provided" }, { status: 400 });
  }

  const updated = await prisma.event.update({ where: { id: eventId }, data: updateData });

  // Google 동기화
  try {
    if (updated.externalGoogleEventId) {
      const googleClient = await getGoogleCalendarClient(user.id);
      if (googleClient) {
        const requestBody: Record<string, unknown> = {};
        if (updateData.title) requestBody.summary = updateData.title;
        if (updateData.location !== undefined) requestBody.location = updateData.location ?? "";
        if (updateData.description !== undefined) requestBody.description = updateData.description ?? "";
        if (updateData.startAt) {
          const s = updateData.startAt;
          const e = updated.endAt ?? new Date(s.getTime() + 60 * 60 * 1000);
          requestBody.start = { dateTime: s.toISOString() };
          requestBody.end = { dateTime: e.toISOString() };
        }
        await googleClient.calendar.events.patch({
          calendarId: "primary",
          eventId: updated.externalGoogleEventId,
          requestBody,
        });
      }
    }
  } catch { /* Google 업데이트 실패는 무시 */ }

  const actionParts: string[] = [];
  if (updateData.title) actionParts.push(`제목 → ${updateData.title}`);
  if (updateData.startAt) actionParts.push(`날짜 → ${updateData.startAt.toLocaleString("ko-KR", { hour12: false })}`);
  if (updateData.location !== undefined) actionParts.push(`장소 → ${updateData.location ?? "삭제"}`);
  if (updateData.calendarId) actionParts.push("캘린더 이동");

  await prisma.eventActivity.create({
    data: { eventId, actorId: user.id, action: actionParts.join(", ") || "일정 수정" },
  });

  // 오너가 아닌 멤버가 수정한 경우 → 오너에게 알림
  await maybeNotifyOwner({
    calendarId: prevEvent.calendarId,
    actorId: user.id,
    actorName: user.name ?? "알 수 없음",
    type: "event_edited",
    message: `${user.name ?? "누군가"}님이 "${prevEvent.title}" 일정을 수정했습니다. (${actionParts.join(", ") || "내용 변경"})`,
    eventId,
    snapshot: {
      id: prevEvent.id,
      title: prevEvent.title,
      startAt: prevEvent.startAt.toISOString(),
      endAt: prevEvent.endAt?.toISOString() ?? null,
      allDay: prevEvent.allDay,
      location: prevEvent.location,
      description: prevEvent.description,
      url: prevEvent.url,
      reminderMinutes: prevEvent.reminderMinutes,
      calendarId: prevEvent.calendarId,
    },
  });

  return NextResponse.json({ ok: true, event: updated });
}

export async function DELETE(_request: Request, context: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { eventId } = await context.params;

  const editable = await canEditEvent(user.id, user.role, eventId);
  if (!editable) return NextResponse.json({ error: "No permission" }, { status: 403 });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (event.externalGoogleEventId) {
    try {
      const googleClient = await getGoogleCalendarClient(user.id);
      if (googleClient) {
        await googleClient.calendar.events.delete({
          calendarId: "primary",
          eventId: event.externalGoogleEventId,
        });
      }
    } catch { /* Google 삭제 실패해도 로컬 삭제 진행 */ }
  }

  await prisma.event.delete({ where: { id: eventId } });

  // 오너가 아닌 멤버가 삭제한 경우 → 오너에게 알림 + 스냅샷 저장
  await maybeNotifyOwner({
    calendarId: event.calendarId,
    actorId: user.id,
    actorName: user.name ?? "알 수 없음",
    type: "event_deleted",
    message: `${user.name ?? "누군가"}님이 "${event.title}" 일정을 삭제했습니다.`,
    eventId,
    snapshot: {
      _deleted: true,
      id: event.id,
      title: event.title,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt?.toISOString() ?? null,
      allDay: event.allDay,
      location: event.location,
      description: event.description,
      url: event.url,
      reminderMinutes: event.reminderMinutes,
      calendarId: event.calendarId,
    },
  });

  return NextResponse.json({ ok: true });
}
