import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleCalendarClient } from "@/lib/google-calendar";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { eventId?: string };
  const eventId = body.eventId?.trim();
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      calendar: {
        include: {
          members: { where: { userId: user.id }, select: { role: true } },
        },
      },
    },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const canAccess =
    user.role === "OWNER" ||
    event.createdById === user.id ||
    event.calendar.members.some((m) => m.role === "OWNER" || m.role === "EDITOR");
  if (!canAccess) return NextResponse.json({ error: "No permission" }, { status: 403 });

  const client = await getGoogleCalendarClient(user.id);
  if (!client) {
    return NextResponse.json(
      { error: "Google 계정 연동이 필요합니다. 먼저 Google로 로그인해 주세요." },
      { status: 400 },
    );
  }

  const payload = {
    summary: event.title,
    start: { dateTime: event.startAt.toISOString() },
    end: { dateTime: new Date(event.startAt.getTime() + 60 * 60 * 1000).toISOString() },
  };

  let googleEventId = event.externalGoogleEventId;
  if (googleEventId) {
    await client.calendar.events.update({
      calendarId: "primary",
      eventId: googleEventId,
      requestBody: payload,
    });
  } else {
    const created = await client.calendar.events.insert({
      calendarId: "primary",
      requestBody: payload,
    });
    googleEventId = created.data.id ?? null;
  }

  if (googleEventId) {
    await prisma.event.update({
      where: { id: event.id },
      data: { externalGoogleEventId: googleEventId },
    });
  }
  await prisma.eventActivity.create({
    data: { eventId: event.id, actorId: user.id, action: "Google Calendar로 내보내기" },
  });

  return NextResponse.json({ ok: true, googleEventId });
}

