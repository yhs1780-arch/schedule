import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleCalendarClient } from "@/lib/google-calendar";

function forbidden() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return forbidden();

  const memberships = await prisma.calendarMember.findMany({
    where: { userId: user.id },
    select: { calendarId: true, role: true },
  });
  const allowedCalendarIds =
    user.role === "OWNER" ? undefined : memberships.map((membership) => membership.calendarId);

  const calendars = await prisma.calendar.findMany({
    where: allowedCalendarIds ? { id: { in: allowedCalendarIds } } : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        include: { user: { select: { id: true, slug: true, name: true, role: true } } },
        orderBy: { joinedAt: "asc" },
      },
      events: {
        orderBy: { startAt: "asc" },
        include: {
          comments: {
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: "asc" },
          },
          activities: {
            include: { actor: { select: { id: true, name: true } } },
            orderBy: { createdAt: "asc" },
          },
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ user, calendars });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return forbidden();

  const body = (await request.json()) as {
    calendarId?: string;
    title?: string;
    startAt?: string;
  };
  const calendarId = body.calendarId?.trim();
  const title = body.title?.trim();
  const startAt = body.startAt?.trim();
  if (!calendarId || !title || !startAt) {
    return NextResponse.json({ error: "calendarId, title, startAt are required" }, { status: 400 });
  }

  if (user.role !== "OWNER") {
    const membership = await prisma.calendarMember.findFirst({
      where: {
        calendarId,
        userId: user.id,
        role: { in: ["OWNER", "EDITOR"] },
      },
      select: { id: true },
    });
    if (!membership) return NextResponse.json({ error: "No permission" }, { status: 403 });
  }

  const event = await prisma.event.create({
    data: {
      calendarId,
      title,
      startAt: new Date(startAt),
      createdById: user.id,
    },
  });

  // 연동된 사용자는 서비스 일정 생성 시 Google Calendar에도 자동 반영
  try {
    const googleClient = await getGoogleCalendarClient(user.id);
    if (googleClient) {
      const inserted = await googleClient.calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: title,
          start: { dateTime: new Date(startAt).toISOString() },
          end: { dateTime: new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString() },
        },
      });
      const googleEventId = inserted.data.id ?? null;
      if (googleEventId) {
        await prisma.event.update({
          where: { id: event.id },
          data: { externalGoogleEventId: googleEventId },
        });
      }
    }
  } catch {
    // Google API 오류가 있어도 서비스 일정 생성은 성공 처리
  }

  await prisma.eventActivity.create({
    data: { eventId: event.id, actorId: user.id, action: "일정 생성" },
  });

  return NextResponse.json({ ok: true, event });
}

