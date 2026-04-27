import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CAL_COLORS, normalizeCalendarColor } from "@/lib/calendar-colors";

type Ctx = { params: Promise<{ calendarId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { calendarId } = await ctx.params;
  const body = (await req.json()) as { name?: string; color?: string };

  // 소유자 또는 편집자 확인
  const member = await prisma.calendarMember.findFirst({
    where: { calendarId, userId: user.id, role: { in: ["OWNER", "EDITOR"] } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updateData: { name?: string; color?: string } = {};
  if (body.name?.trim()) updateData.name = body.name.trim();
  if (body.color !== undefined && body.color !== null && body.color !== "") {
    updateData.color = normalizeCalendarColor(body.color) ?? CAL_COLORS[0].db;
  }

  const calendar = await prisma.calendar.update({ where: { id: calendarId }, data: updateData });
  return NextResponse.json({ ok: true, calendar });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { calendarId } = await ctx.params;

  // 소유자만 삭제 가능
  const member = await prisma.calendarMember.findFirst({
    where: { calendarId, userId: user.id, role: "OWNER" },
  });
  if (!member) return NextResponse.json({ error: "Only owner can delete" }, { status: 403 });

  // cascade: events, members, shares 모두 삭제
  await prisma.calendar.delete({ where: { id: calendarId } });
  return NextResponse.json({ ok: true });
}
