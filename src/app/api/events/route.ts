import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleCalendarClient } from "@/lib/google-calendar";

function forbidden() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function ensurePersonalCalendar(userId: string, userName: string | null, userSlug: string) {
  try {
    const personalKey = `personal-${userSlug || userId.slice(0, 8)}`;
    const existing = await prisma.calendar.findUnique({ where: { key: personalKey } });
    if (!existing) {
      const cal = await prisma.calendar.create({
        data: {
          key: personalKey,
          name: `${userName ?? "나"} 개인 일정`,
          color: "bg-emerald-500/20 text-emerald-300",
        },
      });
      await prisma.calendarMember.create({
        data: { calendarId: cal.id, userId, role: "OWNER" },
      });
    }
  } catch {
    // 실패해도 나머지 데이터 로드는 계속
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return forbidden();

  // 매 로드마다 개인 캘린더 존재 여부 보장
  await ensurePersonalCalendar(user.id, user.name ?? null, user.slug ?? "");

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
          reactions: { orderBy: { createdAt: "asc" } },
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
    endAt?: string;
    allDay?: boolean;
    location?: string;
    locationDetail?: string;
    description?: string;
    url?: string;
    reminderMinutes?: string;
    isTask?: boolean;
  };
  const calendarId = body.calendarId?.trim();
  const title = body.title?.trim();
  const startAt = body.startAt?.trim();
  if (!calendarId || !title || !startAt) {
    return NextResponse.json({ error: "calendarId, title, startAt are required" }, { status: 400 });
  }

  if (user.role !== "OWNER") {
    const membership = await prisma.calendarMember.findFirst({
      where: { calendarId, userId: user.id, role: { in: ["OWNER", "EDITOR"] } },
      select: { id: true },
    });
    if (!membership) return NextResponse.json({ error: "No permission" }, { status: 403 });
  }

  const allDay = body.allDay ?? false;
  const endAt = body.endAt?.trim() ? new Date(body.endAt.trim()) : null;
  const location = body.location?.trim() || null;
  const locationDetail = body.locationDetail?.trim() || null;
  const description = body.description?.trim() || null;
  const url = body.url?.trim() || null;
  const reminderMinutes = body.reminderMinutes?.trim() || null;
  const isTask = body.isTask ?? false;

  const event = await prisma.event.create({
    data: {
      calendarId,
      title,
      startAt: new Date(startAt),
      endAt,
      allDay,
      location,
      locationDetail,
      description,
      url,
      reminderMinutes,
      isTask,
      createdById: user.id,
    },
  });

  try {
    const googleClient = await getGoogleCalendarClient(user.id);
    if (googleClient) {
      const startDate = new Date(startAt);
      const endDate = endAt ?? new Date(startDate.getTime() + 60 * 60 * 1000);
      const inserted = await googleClient.calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: title,
          location: location ?? undefined,
          description: description ?? undefined,
          start: allDay
            ? { date: startDate.toISOString().split("T")[0] }
            : { dateTime: startDate.toISOString() },
          end: allDay
            ? { date: endDate.toISOString().split("T")[0] }
            : { dateTime: endDate.toISOString() },
        },
      });
      const googleEventId = inserted.data.id ?? null;
      if (googleEventId) {
        await prisma.event.update({ where: { id: event.id }, data: { externalGoogleEventId: googleEventId } });
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

