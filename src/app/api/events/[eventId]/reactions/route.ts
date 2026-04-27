import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const reactions = await prisma.eventReaction.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ reactions });
}

export async function POST(req: Request, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const body = (await req.json()) as { emoji?: string; authorName?: string };
  if (!body.emoji || !body.authorName) return NextResponse.json({ error: "emoji and authorName required" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 같은 사람이 같은 이모지로 다시 누르면 제거 (토글)
  const existing = await prisma.eventReaction.findFirst({
    where: { eventId, emoji: body.emoji, authorName: body.authorName },
  });
  if (existing) {
    await prisma.eventReaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, removed: true });
  }

  const reaction = await prisma.eventReaction.create({
    data: { eventId, emoji: body.emoji, authorName: body.authorName },
  });
  return NextResponse.json({ ok: true, reaction });
}
