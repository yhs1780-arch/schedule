import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "crypto";
import { ensureLegacyShareLinkMigrated } from "@/lib/ensure-legacy-share-link";

type Ctx = { params: Promise<{ calendarId: string }> };

/** @deprecated Use GET /api/calendars/:id/share-links. 호환 응답 유지. */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { calendarId } = await ctx.params;

  const member = await prisma.calendarMember.findFirst({
    where: { calendarId, userId: user.id, role: "OWNER" },
  });
  if (!member) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const cal = await prisma.calendar.findUnique({ where: { id: calendarId } });
  if (!cal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ensureLegacyShareLinkMigrated(calendarId);

  const links = await prisma.calendarShareLink.findMany({
    where: { calendarId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { visitors: true } } },
  });

  const first = links[0];
  return NextResponse.json({
    token: first?.token ?? cal.shareToken,
    shareRole: first?.shareRole ?? cal.shareRole,
    links: links.map(l => ({
      id: l.id,
      token: l.token,
      shareRole: l.shareRole,
      label: l.label,
      expiresAt: l.expiresAt,
      createdAt: l.createdAt,
      visitorCount: l._count.visitors,
    })),
  });
}

type PostBody = {
  shareRole?: string;
  revoke?: boolean;
  linkId?: string;
  label?: string;
  expiresInDays?: number | null;
  guestApprovalRequired?: boolean;
};

export async function POST(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { calendarId } = await ctx.params;

  const member = await prisma.calendarMember.findFirst({
    where: { calendarId, userId: user.id, role: "OWNER" },
  });
  if (!member) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = (await request.json()) as PostBody;

  if (body.revoke) {
    if (body.linkId) {
      const link = await prisma.calendarShareLink.findFirst({
        where: { id: body.linkId, calendarId },
      });
      if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const cal = await prisma.calendar.findUnique({ where: { id: calendarId } });
      await prisma.$transaction([
        prisma.calendarShareLink.update({
          where: { id: body.linkId },
          data: { revokedAt: new Date() },
        }),
        ...(cal?.shareToken === link.token
          ? [prisma.calendar.update({ where: { id: calendarId }, data: { shareToken: null, shareRole: "VIEWER" } })]
          : []),
      ]);
      return NextResponse.json({ ok: true, token: null });
    }
    // 링크 ID 없이 해제(구 동작): 해당 캘린더의 활성 링크 전부 폐기 + legacy 토큰 제거
    await prisma.$transaction([
      prisma.calendarShareLink.updateMany({
        where: { calendarId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.calendar.update({
        where: { id: calendarId },
        data: { shareToken: null, shareRole: "VIEWER" },
      }),
    ]);
    return NextResponse.json({ ok: true, token: null });
  }

  const shareRole = body.shareRole === "EDITOR" ? "EDITOR" : "VIEWER";
  const label = body.label?.trim() || null;
  let expiresAt: Date | null = null;
  if (body.expiresInDays != null && body.expiresInDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + Math.min(Math.floor(body.expiresInDays), 3650));
    expiresAt = d;
  }

  const guestApprovalRequired = body.guestApprovalRequired !== false;
  const token = randomBytes(32).toString("hex");
  const link = await prisma.calendarShareLink.create({
    data: { calendarId, token, shareRole, label, expiresAt, guestApprovalRequired },
  });

  return NextResponse.json({ ok: true, token: link.token, shareRole: link.shareRole, linkId: link.id });
}
