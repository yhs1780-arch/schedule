import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleCalendarClient } from "@/lib/google-calendar";

type Ctx = { params: Promise<{ id: string }> };

/**
 * '수정됨' 알림에 대해: 현재 일정을 통째로 삭제 (게스트 수정을 되돌리지 않고 제거)
 */
export async function POST(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (notif.type !== "event_edited" || !notif.snapshot) {
    return NextResponse.json({ error: "이 알림에서는 일정 삭제를 쓸 수 없습니다." }, { status: 400 });
  }

  type Snap = { id?: string; _deleted?: boolean; calendarId?: string };
  let snap: Snap;
  try {
    snap = JSON.parse(notif.snapshot) as Snap;
  } catch {
    return NextResponse.json({ error: "잘못된 알림 데이터" }, { status: 400 });
  }
  if (!snap.id || snap._deleted) {
    return NextResponse.json({ error: "이미 삭제된 일정 알림이에요. 복원은 '일정 복원'을 사용하세요." }, { status: 400 });
  }

  const calId = notif.calendarId ?? snap.calendarId;
  if (!calId) return NextResponse.json({ error: "캘린더 정보 없음" }, { status: 400 });

  const member = await prisma.calendarMember.findFirst({
    where: { calendarId: calId, userId: user.id, role: { in: ["OWNER", "EDITOR"] } },
  });
  if (!member) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const ev = await prisma.event.findFirst({ where: { id: snap.id, calendarId: calId } });
  if (!ev) {
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  if (ev.externalGoogleEventId) {
    try {
      const googleClient = await getGoogleCalendarClient(user.id);
      if (googleClient) {
        await googleClient.calendar.events.delete({
          calendarId: "primary",
          eventId: ev.externalGoogleEventId,
        });
      }
    } catch { /* Google 삭제 실패해도 로컬 삭제 */ }
  }

  await prisma.event.delete({ where: { id: ev.id } });
  await prisma.notification.update({ where: { id }, data: { isRead: true } });

  return NextResponse.json({ ok: true });
}
