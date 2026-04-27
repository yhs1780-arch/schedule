import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;

  const ms = await prisma.multiShare.findUnique({ where: { token } });
  if (!ms) return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 });

  const ids = JSON.parse(ms.calendarIds as string) as string[];
  const calendars = await prisma.calendar.findMany({
    where: { id: { in: ids } },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
          reactions: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  return NextResponse.json({
    shareRole: ms.shareRole,
    calendars: calendars.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      events: c.events,
    })),
  });
}
