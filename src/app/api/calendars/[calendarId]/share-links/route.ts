import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "crypto";
import { ensureLegacyShareLinkMigrated } from "@/lib/ensure-legacy-share-link";

type Ctx = { params: Promise<{ calendarId: string }> };

function assertOwner(calendarId: string, userId: string) {
  return prisma.calendarMember.findFirst({
    where: { calendarId, userId, role: "OWNER" },
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { calendarId } = await ctx.params;

  if (!(await assertOwner(calendarId, user.id))) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  await ensureLegacyShareLinkMigrated(calendarId);

  const links = await prisma.calendarShareLink.findMany({
    where: { calendarId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      visitors: { orderBy: { lastSeenAt: "desc" } },
    },
  });

  return NextResponse.json({ links });
}

export async function POST(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { calendarId } = await ctx.params;

  if (!(await assertOwner(calendarId, user.id))) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = (await request.json()) as {
    shareRole?: string;
    label?: string;
    expiresInDays?: number | null;
    guestApprovalRequired?: boolean;
  };
  const shareRole = body.shareRole === "EDITOR" ? "EDITOR" : "VIEWER";
  const label = body.label?.trim() || null;
  const guestApprovalRequired = body.guestApprovalRequired !== false;

  let expiresAt: Date | null = null;
  if (body.expiresInDays != null && body.expiresInDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + Math.min(Math.floor(body.expiresInDays), 3650));
    expiresAt = d;
  }

  const token = randomBytes(32).toString("hex");

  const link = await prisma.calendarShareLink.create({
    data: { calendarId, token, shareRole, label, expiresAt, guestApprovalRequired },
  });

  return NextResponse.json({
    ok: true,
    link: {
      id: link.id,
      token: link.token,
      shareRole: link.shareRole,
      label: link.label,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      guestApprovalRequired: link.guestApprovalRequired,
    },
  });
}
