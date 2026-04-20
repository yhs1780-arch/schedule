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
  const body = (await request.json()) as { title?: string; startAt?: string };
  const title = body.title?.trim();
  const startAt = body.startAt?.trim();

  if (!title && !startAt) {
    return NextResponse.json({ error: "title or startAt is required" }, { status: 400 });
  }

  const editable = await canEditEvent(user.id, user.role, eventId);
  if (!editable) return NextResponse.json({ error: "No permission" }, { status: 403 });

  const updateData: { title?: string; startAt?: Date } = {};
  if (title) updateData.title = title;
  if (startAt) updateData.startAt = new Date(startAt);

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
  });

  try {
    if (updated.externalGoogleEventId) {
      const googleClient = await getGoogleCalendarClient(user.id);
      if (googleClient) {
        const requestBody: { summary?: string; start?: object; end?: object } = {};
        if (title) requestBody.summary = title;
        if (startAt) {
          const startDate = new Date(startAt);
          requestBody.start = { dateTime: startDate.toISOString() };
          requestBody.end = { dateTime: new Date(startDate.getTime() + 60 * 60 * 1000).toISOString() };
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
  if (title) actionParts.push(`제목 수정 → ${title}`);
  if (startAt) actionParts.push(`날짜 수정 → ${new Date(startAt).toLocaleString("ko-KR", { hour12: false })}`);

  await prisma.eventActivity.create({
    data: { eventId, actorId: user.id, action: actionParts.join(", ") },
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
