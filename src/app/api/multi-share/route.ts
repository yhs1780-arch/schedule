import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    calendarIds?: string[];
    shareRole?: string;
    expiresInDays?: number | null;
    guestApprovalRequired?: boolean;
  };
  const raw = body.calendarIds ?? [];
  const ids = [...new Set(raw.map(id => String(id).trim()).filter(Boolean))];
  if (ids.length < 2) return NextResponse.json({ error: "2개 이상의 캘린더를 선택해주세요." }, { status: 400 });

  if (user.role === "OWNER") {
    const found = await prisma.calendar.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      return NextResponse.json({ error: "존재하지 않는 캘린더가 포함되어 있어요." }, { status: 400 });
    }
  } else {
    const memberships = await prisma.calendarMember.findMany({
      where: { calendarId: { in: ids }, userId: user.id, role: "OWNER" },
      select: { calendarId: true },
    });
    if (memberships.length !== ids.length) {
      return NextResponse.json({ error: "소유자 권한이 없는 캘린더가 포함되어 있어요." }, { status: 403 });
    }
  }

  const token = randomBytes(32).toString("hex");
  const shareRole = body.shareRole === "EDITOR" ? "EDITOR" : "VIEWER";

  let expiresAt: Date | null = null;
  if (body.expiresInDays != null && body.expiresInDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + Math.min(Math.floor(body.expiresInDays), 3650));
    expiresAt = d;
  }

  const guestApprovalRequired = body.guestApprovalRequired !== false;

  try {
    const ms = await prisma.multiShare.create({
      data: {
        token,
        shareRole,
        guestApprovalRequired,
        ownerId: user.id,
        calendarIds: JSON.stringify(ids),
        expiresAt,
      },
    });
    return NextResponse.json({ ok: true, token: ms.token, shareRole: ms.shareRole });
  } catch (e) {
    console.error("[multi-share POST] create failed:", e);
    return NextResponse.json(
      { error: "링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
