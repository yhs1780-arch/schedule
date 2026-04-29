import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 소유 캘린더의 공유 링크·방문자 + 동시 공유 링크 요약 (한 번에 불러오기)
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await prisma.calendarMember.findMany({
    where: { userId: user.id, role: "OWNER" },
    include: { calendar: true },
  });

  const calendarBlocks = await Promise.all(
    owned.map(async m => {
      const links = await prisma.calendarShareLink.findMany({
        where: { calendarId: m.calendarId, revokedAt: null },
        orderBy: { createdAt: "desc" },
        include: { visitors: { orderBy: { lastSeenAt: "desc" } } },
      });
      return {
        calendarId: m.calendarId,
        calendarName: m.calendar.name,
        color: m.calendar.color,
        links,
      };
    }),
  );

  const multiShares = await prisma.multiShare.findMany({
    where: { ownerId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    include: { visitors: { orderBy: { lastSeenAt: "desc" } } },
  });

  const multiIds = [...new Set(multiShares.flatMap(ms => {
    try { return JSON.parse(ms.calendarIds) as string[]; } catch { return []; }
  }))];
  const nameRows = multiIds.length
    ? await prisma.calendar.findMany({ where: { id: { in: multiIds } }, select: { id: true, name: true } })
    : [];
  const calNameMap = new Map(nameRows.map(r => [r.id, r.name] as const));

  const multiWithNames = multiShares.map(ms => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(ms.calendarIds) as string[];
    } catch {
      ids = [];
    }
    return {
      ...ms,
      calendarNames: ids.map(id => calNameMap.get(id) ?? id),
    };
  });

  return NextResponse.json({ calendars: calendarBlocks, multiShares: multiWithNames });
}
