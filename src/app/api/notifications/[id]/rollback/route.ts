import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const notif = await prisma.notification.findUnique({ where: { id } });

  if (!notif || notif.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!notif.snapshot) {
    return NextResponse.json({ error: "롤백 데이터가 없습니다." }, { status: 400 });
  }

  type EventSnapshot = {
    id?: string;
    title?: string;
    startAt?: string;
    endAt?: string | null;
    allDay?: boolean;
    location?: string | null;
    description?: string | null;
    url?: string | null;
    reminderMinutes?: string | null;
    calendarId?: string;
    _deleted?: boolean;
  };

  const snap = JSON.parse(notif.snapshot) as EventSnapshot;

  if (snap._deleted && snap.id) {
    // 삭제된 일정 복원: 원본 calendarId에 멤버 자격 확인 후 재생성
    const calId = snap.calendarId;
    if (!calId) return NextResponse.json({ error: "캘린더 정보 없음" }, { status: 400 });

    const member = await prisma.calendarMember.findFirst({
      where: { calendarId: calId, userId: user.id, role: { in: ["OWNER", "EDITOR"] } },
    });
    if (!member) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const restored = await prisma.event.create({
      data: {
        calendarId: calId,
        title: snap.title ?? "복원된 일정",
        startAt: new Date(snap.startAt ?? new Date()),
        endAt: snap.endAt ? new Date(snap.endAt) : null,
        allDay: snap.allDay ?? false,
        location: snap.location,
        description: snap.description,
        url: snap.url,
        reminderMinutes: snap.reminderMinutes,
        createdById: user.id,
      },
    });

    // 알림 삭제 (롤백 완료)
    await prisma.notification.delete({ where: { id } });
    await prisma.eventActivity.create({
      data: { eventId: restored.id, actorId: user.id, action: "삭제된 일정 롤백 (복원)" },
    });

    return NextResponse.json({ ok: true, type: "restored", event: restored });
  }

  // 수정된 일정 롤백 (이전 상태로 되돌리기)
  if (!snap.id) return NextResponse.json({ error: "이벤트 ID 없음" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: snap.id } });
  if (!event) return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });

  const rolled = await prisma.event.update({
    where: { id: snap.id },
    data: {
      title: snap.title ?? event.title,
      startAt: snap.startAt ? new Date(snap.startAt) : event.startAt,
      endAt: snap.endAt !== undefined ? (snap.endAt ? new Date(snap.endAt) : null) : event.endAt,
      allDay: snap.allDay !== undefined ? snap.allDay : event.allDay,
      location: snap.location !== undefined ? snap.location : event.location,
      description: snap.description !== undefined ? snap.description : event.description,
      url: snap.url !== undefined ? snap.url : event.url,
    },
  });

  await prisma.eventActivity.create({
    data: { eventId: snap.id, actorId: user.id, action: "변경 롤백 (이전 상태로 복원)" },
  });

  // 알림 읽음 처리
  await prisma.notification.update({ where: { id }, data: { isRead: true } });

  return NextResponse.json({ ok: true, type: "rolled_back", event: rolled });
}
