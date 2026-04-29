import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allowShareRequest } from "@/lib/share-token";
import { requireCalendarShareForGuest } from "@/lib/share-guest-access";

type Ctx = { params: Promise<{ token: string; eventId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { token, eventId } = await ctx.params;
  if (!allowShareRequest(request, token)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }
  const access = await requireCalendarShareForGuest(request, token);
  if (!access.ok) return access.response;

  const cal = access.calendar;

  const body = (await request.json()) as { content?: string; guestName?: string };
  const content = body.content?.trim();
  const guestName = body.guestName?.trim() || "게스트";
  if (!content) return NextResponse.json({ error: "내용 필요" }, { status: 400 });

  const owner = await prisma.calendarMember.findFirst({ where: { calendarId: cal.id, role: "OWNER" } });
  if (!owner) return NextResponse.json({ error: "오류" }, { status: 500 });

  const event = await prisma.event.findFirst({ where: { id: eventId, calendarId: cal.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.eventComment.create({
    data: { eventId, authorId: owner.userId, content: `[${guestName}] ${content}` },
    include: { author: { select: { id: true, name: true } } },
  });

  await prisma.notification.create({
    data: {
      userId: owner.userId,
      calendarId: cal.id,
      eventId,
      actorName: guestName,
      type: "comment_added",
      message: `게스트 "${guestName}"이(가) 댓글을 남겼어요: "${content.slice(0, 40)}${content.length > 40 ? "…" : ""}"`,
    },
  });

  const result = { ...comment, author: { ...comment.author, name: guestName } };

  return NextResponse.json({ ok: true, comment: result });
}
