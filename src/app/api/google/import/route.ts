import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleCalendarClient } from "@/lib/google-calendar";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await getGoogleCalendarClient(user.id);
  if (!client) {
    return NextResponse.json(
      { error: "Google 계정 연동이 필요합니다. 먼저 Google로 로그인해 주세요." },
      { status: 400 },
    );
  }

  const personal = await prisma.calendar.findUnique({
    where: { key: `personal-${user.slug}` },
    select: { id: true },
  });
  if (!personal) return NextResponse.json({ error: "개인 캘린더를 찾을 수 없습니다." }, { status: 404 });

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);

  const result = await client.calendar.events.list({
    calendarId: "primary",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const items = result.data.items ?? [];
  let importedCount = 0;

  for (const item of items) {
    const startAt = item.start?.dateTime ?? item.start?.date;
    const title = item.summary?.trim();
    if (!startAt || !title) continue;
    const googleId = item.id ?? null;
    if (!googleId) continue;

    const existing = await prisma.event.findFirst({
      where: { externalGoogleEventId: googleId, createdById: user.id },
      select: { id: true },
    });
    if (existing) continue;

    const event = await prisma.event.create({
      data: {
        calendarId: personal.id,
        title,
        startAt: new Date(startAt),
        createdById: user.id,
        externalGoogleEventId: googleId,
      },
    });
    await prisma.eventActivity.create({
      data: {
        eventId: event.id,
        actorId: user.id,
        action: "Google Calendar에서 가져오기",
      },
    });
    importedCount += 1;
  }

  return NextResponse.json({ ok: true, importedCount });
}

