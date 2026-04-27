import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ token: string; eventId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { token, eventId } = await ctx.params;
  const cal = await prisma.calendar.findUnique({ where: { shareToken: token } });
  if (!cal) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const body = (await request.json()) as { content?: string; guestName?: string };
  const content = body.content?.trim();
  const guestName = body.guestName?.trim() || "게스트";
  if (!content) return NextResponse.json({ error: "내용 필요" }, { status: 400 });

  // 캘린더 소유자 계정으로 댓글 작성 (게스트 이름 prefix 포함)
  const owner = await prisma.calendarMember.findFirst({ where: { calendarId: cal.id, role: "OWNER" } });
  if (!owner) return NextResponse.json({ error: "오류" }, { status: 500 });

  const event = await prisma.event.findFirst({ where: { id: eventId, calendarId: cal.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.eventComment.create({
    data: { eventId, authorId: owner.userId, content: `[${guestName}] ${content}` },
    include: { author: { select: { id: true, name: true } } },
  });

  // 캘린더 소유자에게 알림
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

  // 게스트 이름으로 author name 오버라이드
  const result = { ...comment, author: { ...comment.author, name: guestName } };

  return NextResponse.json({ ok: true, comment: result });
}
