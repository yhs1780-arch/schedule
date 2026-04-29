import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ calendarId: string; linkId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { calendarId, linkId } = await ctx.params;

  const member = await prisma.calendarMember.findFirst({
    where: { calendarId, userId: user.id, role: "OWNER" },
  });
  if (!member) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const link = await prisma.calendarShareLink.findFirst({
    where: { id: linkId, calendarId },
  });
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as {
    shareRole?: string;
    label?: string | null;
    expiresInDays?: number | null;
    expiresAt?: string | null;
    revoke?: boolean;
    guestApprovalRequired?: boolean;
  };

  if (body.revoke) {
    const cal = await prisma.calendar.findUnique({ where: { id: calendarId } });
    await prisma.$transaction([
      prisma.calendarShareLink.update({
        where: { id: linkId },
        data: { revokedAt: new Date() },
      }),
      ...(cal?.shareToken === link.token
        ? [prisma.calendar.update({ where: { id: calendarId }, data: { shareToken: null, shareRole: "VIEWER" } })]
        : []),
    ]);
    return NextResponse.json({ ok: true, revoked: true });
  }

  const data: Record<string, unknown> = {};
  if (body.shareRole === "EDITOR" || body.shareRole === "VIEWER") data.shareRole = body.shareRole;
  if ("label" in body) data.label = body.label?.trim() || null;
  if (typeof body.guestApprovalRequired === "boolean") data.guestApprovalRequired = body.guestApprovalRequired;
  if (body.expiresAt === null) {
    data.expiresAt = null;
  } else if (body.expiresInDays != null) {
    if (body.expiresInDays <= 0) data.expiresAt = null;
    else {
      const d = new Date();
      d.setDate(d.getDate() + Math.min(Math.floor(body.expiresInDays), 3650));
      data.expiresAt = d;
    }
  } else if (body.expiresAt) {
    const d = new Date(body.expiresAt);
    if (!Number.isNaN(d.getTime())) data.expiresAt = d;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없어요." }, { status: 400 });
  }

  const updated = await prisma.calendarShareLink.update({
    where: { id: linkId },
    data: data as { shareRole?: string; label?: string | null; expiresAt?: Date | null; guestApprovalRequired?: boolean },
  });

  return NextResponse.json({ ok: true, link: updated });
}
