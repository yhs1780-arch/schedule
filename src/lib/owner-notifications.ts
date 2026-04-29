import { prisma } from "@/lib/prisma";
import type { Event } from "@prisma/client";

/** 롤백 API와 동일한 형태의 스냅샷 */
export function eventSnapshotForRollback(e: Event, opts?: { deleted?: boolean }) {
  return {
    ...(opts?.deleted ? { _deleted: true as const } : {}),
    id: e.id,
    title: e.title,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt?.toISOString() ?? null,
    allDay: e.allDay,
    location: e.location,
    locationDetail: e.locationDetail,
    description: e.description,
    url: e.url,
    reminderMinutes: e.reminderMinutes,
    calendarId: e.calendarId,
    tags: e.tags,
    isTask: e.isTask,
    isDone: e.isDone,
    guestName: e.guestName,
  };
}

/** 캘린더 소유자(멤버가 아닌 편집자의 변경은 제외하려면 호출부에서 처리) */
export async function notifyCalendarOwner(opts: {
  calendarId: string;
  eventId: string;
  type: string;
  message: string;
  actorName: string;
  snapshot: Record<string, unknown>;
}) {
  const owner = await prisma.calendarMember.findFirst({
    where: { calendarId: opts.calendarId, role: "OWNER" },
    select: { userId: true },
  });
  if (!owner) return;

  await prisma.notification.create({
    data: {
      userId: owner.userId,
      calendarId: opts.calendarId,
      eventId: opts.eventId,
      actorName: opts.actorName,
      type: opts.type,
      message: opts.message,
      snapshot: JSON.stringify(opts.snapshot),
    },
  });
}
