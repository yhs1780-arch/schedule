import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { calendarIds?: string[]; shareRole?: string };
  const ids = body.calendarIds ?? [];
  if (ids.length < 2) return NextResponse.json({ error: "2개 이상의 캘린더를 선택해주세요." }, { status: 400 });

  // 모두 OWNER인지 확인
  const memberships = await prisma.calendarMember.findMany({
    where: { calendarId: { in: ids }, userId: user.id, role: "OWNER" },
    select: { calendarId: true },
  });
  if (memberships.length !== ids.length) {
    return NextResponse.json({ error: "소유자 권한이 없는 캘린더가 포함되어 있어요." }, { status: 403 });
  }

  const token = randomBytes(24).toString("hex");
  const shareRole = body.shareRole === "EDITOR" ? "EDITOR" : "VIEWER";

  // MultiShare 레코드 생성
  const ms = await prisma.multiShare.create({
    data: {
      token,
      shareRole,
      ownerId: user.id,
      calendarIds: JSON.stringify(ids),
    },
  });

  return NextResponse.json({ ok: true, token: ms.token, shareRole: ms.shareRole });
}
