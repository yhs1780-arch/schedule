import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditEvent, getCurrentUser } from "@/lib/auth";
import { getGoogleCalendarClient } from "@/lib/google-calendar";

type Ctx = { params: Promise<{ eventId: string }> };

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    description?: string | null;
  };

  const editable = await canEditEvent(user.id, user.role, eventId);
  if (!editable) return NextResponse.json({ error: "No permission" }, { status: 403 });

  const updateData: {
    title?: string;
    startAt?: Date;
    endAt?: Date | null;
    allDay?: boolean;
    location?: string | null;
    description?: string | null;
  } = {};

  if (body.title?.trim()) updateData.title = body.title.trim();
  if (body.startAt?.trim()) updateData.startAt = new Date(body.startAt.trim());
  if ("endAt" in body) updateData.endAt = body.endAt ? new Date(body.endAt) : null;
  if ("allDay" in body) updateData.allDay = body.allDay;
  if ("location" in body) updateData.location = body.location?.trim() || null;
  if ("description" in body) updateData.description = body.description?.trim() || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "no updatable field provided" }, { status: 400 });
  }

  const updated = await prisma.event.update({ where: { id: eventId }, data: updateData });

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
  } catch {
    // Google 업데이트 실패는 서비스 수정을 막지 않음
  }

  const actionParts: string[] = [];
  if (updateData.title) actionParts.push(`제목 → ${updateData.title}`);
  if (updateData.startAt) actionParts.push(`날짜 → ${updateData.startAt.toLocaleString("ko-KR", { hour12: false })}`);
  if (updateData.location !== undefined) actionParts.push(`장소 → ${updateData.location ?? "삭제"}`);

  await prisma.eventActivity.create({
    data: { eventId, actorId: user.id, action: actionParts.join(", ") || "일정 수정" },
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

  // Google Calendar 연동된 경우 Google에서도 삭제
  if (event.externalGoogleEventId) {
    try {
      const googleClient = await getGoogleCalendarClient(user.id);
      if (googleClient) {
        await googleClient.calendar.events.delete({
          calendarId: "primary",
          eventId: event.externalGoogleEventId,
        });
      }
    } catch {
      // Google 삭제 실패해도 로컬 삭제 진행
    }
  }

  await prisma.event.delete({ where: { id: eventId } });

  return NextResponse.json({ ok: true });
}
