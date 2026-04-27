import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const cal = await prisma.calendar.findUnique({
    where: { shareToken: token },
    include: {
      members: { select: { role: true, user: { select: { id: true, name: true } } } },
      events: {
        orderBy: { startAt: "asc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!cal) return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 });

  return NextResponse.json({
    calendar: {
      id: cal.id,
      name: cal.name,
      color: cal.color,
      shareRole: cal.shareRole,
      memberCount: cal.members.length,
    },
    events: cal.events,
  });
}

// 비회원 편집자가 이벤트 생성 (EDITOR 공유 링크)
export async function POST(request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const cal = await prisma.calendar.findUnique({ where: { shareToken: token } });
  if (!cal) return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 });
  if (cal.shareRole !== "EDITOR") return NextResponse.json({ error: "편집 권한이 없습니다." }, { status: 403 });

  const body = (await request.json()) as {
    title?: string; startAt?: string; endAt?: string | null;
    allDay?: boolean; location?: string; locationDetail?: string; description?: string; url?: string; guestName?: string;
    tags?: string | null;
  };
  const title = body.title?.trim();
  const startAt = body.startAt?.trim();
  if (!title || !startAt) return NextResponse.json({ error: "제목과 시작 날짜는 필수입니다." }, { status: 400 });

  let eventTags: string | null = null;
  if (body.tags) {
    try {
      const arr = body.tags.trim().startsWith("[") ? JSON.parse(body.tags) as unknown[] : String(body.tags).split(/[,\s#]+/).map(s => s.trim()).filter(Boolean);
      const clean = [...new Set((arr as string[]).map(t => String(t).trim()).filter(Boolean))].slice(0, 20);
      if (clean.length) eventTags = JSON.stringify(clean);
    } catch { /* ignore */ }
  }

  // 게스트용 시스템 유저 찾기 (없으면 캘린더 첫 번째 OWNER 사용)
  const owner = cal ? await prisma.calendarMember.findFirst({
    where: { calendarId: cal.id, role: "OWNER" },
  }) : null;
  if (!owner) return NextResponse.json({ error: "캘린더 소유자를 찾을 수 없습니다." }, { status: 500 });

  const event = await prisma.event.create({
    data: {
      calendarId: cal.id,
      title,
      startAt: new Date(startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      allDay: body.allDay ?? false,
      location: body.location?.trim() || null,
      locationDetail: body.locationDetail?.trim() || null,
      description: body.description?.trim() || null,
      url: body.url?.trim() || null,
      tags: eventTags,
      guestName: (body.guestName ?? "비회원").trim() || null,
      createdById: owner.userId,
    },
    include: { createdBy: { select: { id: true, name: true } }, comments: true },
  });

  const guestLabel = body.guestName ?? "비회원";
  await prisma.eventActivity.create({
    data: { eventId: event.id, actorId: owner.userId, action: `게스트(${guestLabel}) 일정 생성` },
  });

  // 캘린더 소유자에게 알림
  await prisma.notification.create({
    data: {
      userId: owner.userId,
      calendarId: cal.id,
      eventId: event.id,
      actorName: guestLabel,
      type: "event_created",
      message: `게스트 "${guestLabel}"이(가) 새 일정 "${title}"을(를) 추가했어요.`,
    },
  });

  return NextResponse.json({ ok: true, event });
}
