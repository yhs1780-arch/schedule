import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "crypto";

type Ctx = { params: Promise<{ calendarId: string }> };

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

  return NextResponse.json({ token: cal.shareToken, shareRole: cal.shareRole });
}

export async function POST(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { calendarId } = await ctx.params;

  const member = await prisma.calendarMember.findFirst({
    where: { calendarId, userId: user.id, role: "OWNER" },
  });
  if (!member) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const body = (await request.json()) as { shareRole?: string; revoke?: boolean };
  if (body.revoke) {
    await prisma.calendar.update({ where: { id: calendarId }, data: { shareToken: null } });
    return NextResponse.json({ ok: true, token: null });
  }

  const token = randomBytes(20).toString("hex");
  const shareRole = body.shareRole === "EDITOR" ? "EDITOR" : "VIEWER";
  const cal = await prisma.calendar.update({
    where: { id: calendarId },
    data: { shareToken: token, shareRole },
  });

  return NextResponse.json({ ok: true, token: cal.shareToken, shareRole: cal.shareRole });
}
