import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allowShareRequest } from "@/lib/share-token";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isValidShareVisitorKey } from "@/lib/share-visitor-key";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  if (!allowShareRequest(request, token)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }
  const ip = getClientIp(request);
  if (!checkRateLimit(`gacc:ms:${ip}`, 40, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  const now = new Date();
  const ms = await prisma.multiShare.findFirst({
    where: {
      token,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
  if (!ms) return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 });

  if (!ms.guestApprovalRequired) {
    return NextResponse.json({ ok: true, skipped: true, message: "승인 절차가 꺼져 있는 링크입니다." });
  }

  const key = request.headers.get("x-share-visitor")?.trim() ?? "";
  if (!isValidShareVisitorKey(key)) {
    return NextResponse.json({ error: "게스트 식별키가 필요합니다." }, { status: 400 });
  }

  const body = (await request.json()) as { displayName?: string };
  const displayName = body.displayName?.trim().slice(0, 64) ?? "";
  if (displayName.length < 2) {
    return NextResponse.json({ error: "이름을 2글자 이상 입력해 주세요." }, { status: 400 });
  }

  const existing = await prisma.multiShareVisitor.findUnique({
    where: { multiShareId_visitorKey: { multiShareId: ms.id, visitorKey: key } },
  });

  if (existing?.approvalStatus === "REVOKED") {
    return NextResponse.json({ error: "접근이 차단된 기기입니다." }, { status: 403 });
  }

  if (existing?.approvalStatus === "APPROVED" || existing?.approvalStatus === "AUTO") {
    return NextResponse.json({ ok: true, status: "approved" });
  }

  await prisma.multiShareVisitor.upsert({
    where: { multiShareId_visitorKey: { multiShareId: ms.id, visitorKey: key } },
    create: {
      multiShareId: ms.id,
      visitorKey: key,
      guestDisplayName: displayName,
      approvalStatus: "PENDING",
      accessCount: 0,
    },
    update: {
      guestDisplayName: displayName,
      approvalStatus: "PENDING",
    },
  });

  await prisma.notification.create({
    data: {
      userId: ms.ownerId,
      actorName: displayName,
      type: "share_guest_pending",
      message: `동시 공유 링크 접속 요청: "${displayName}" 님이 승인을 기다리고 있어요.`,
    },
  });

  return NextResponse.json({ ok: true, status: "pending" });
}
