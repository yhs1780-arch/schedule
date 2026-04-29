import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { allowShareRequest } from "@/lib/share-token";
import { requireMultiShareForGuest } from "@/lib/share-guest-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ token: string }> };

function allowMultiGet(request: Request, token: string) {
  if (!allowShareRequest(request, token)) return false;
  if (!checkRateLimit(`ms:ag:${getClientIp(request)}`, 100, 60_000)) return false;
  return true;
}

export async function GET(request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  if (!allowMultiGet(request, token)) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const access = await requireMultiShareForGuest(request, token);
  if (!access.ok) return access.response;

  const ms = access.multiShare;
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
    shareRole: access.effectiveRole,
    calendars: calendars.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      events: c.events,
    })),
  });
}
