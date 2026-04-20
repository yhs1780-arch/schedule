import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const VALID_COLORS = [
  "bg-emerald-500/20 text-emerald-300",
  "bg-sky-500/20 text-sky-300",
  "bg-violet-500/20 text-violet-300",
  "bg-rose-500/20 text-rose-300",
  "bg-amber-500/20 text-amber-300",
  "bg-indigo-500/20 text-indigo-300",
  "bg-pink-500/20 text-pink-300",
];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { name?: string; color?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const color = VALID_COLORS.includes(body.color ?? "") ? body.color! : VALID_COLORS[0];
  const key = `cal-${user.id.slice(0, 8)}-${Date.now()}`;

  const calendar = await prisma.calendar.create({ data: { key, name, color } });
  await prisma.calendarMember.create({
    data: { calendarId: calendar.id, userId: user.id, role: "OWNER" },
  });

  return NextResponse.json({ ok: true, calendar });
}
