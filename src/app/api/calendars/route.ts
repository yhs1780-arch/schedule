import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CAL_COLORS, isValidCalendarColorDb } from "@/lib/calendar-colors";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { name?: string; color?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const color = isValidCalendarColorDb(body.color ?? null) ? body.color! : CAL_COLORS[0].db;
  const key = `cal-${user.id.slice(0, 8)}-${Date.now()}`;

  const calendar = await prisma.calendar.create({ data: { key, name, color } });
  await prisma.calendarMember.create({
    data: { calendarId: calendar.id, userId: user.id, role: "OWNER" },
  });

  return NextResponse.json({ ok: true, calendar });
}
