import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditEvent, getCurrentUser } from "@/lib/auth";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { eventId } = await context.params;
  const body = (await request.json()) as { content?: string };
  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const editable = await canEditEvent(user.id, user.role, eventId);
  if (!editable) return NextResponse.json({ error: "No permission" }, { status: 403 });

  const comment = await prisma.eventComment.create({
    data: { eventId, authorId: user.id, content },
  });
  await prisma.eventActivity.create({
    data: { eventId, actorId: user.id, action: "댓글 작성" },
  });

  return NextResponse.json({ ok: true, comment });
}

