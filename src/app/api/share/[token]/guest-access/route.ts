import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allowShareRequest } from "@/lib/share-token";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveShareToken } from "@/lib/share-token";
import { isValidShareVisitorKey } from "@/lib/share-visitor-key";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  if (!allowShareRequest(request, token)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }
  const ip = getClientIp(request);
  if (!checkRateLimit(`gacc:cal:${ip}`, 40, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  const resolved = await resolveShareToken(token);
  if (!resolved?.linkId) {
    return NextResponse.json({ ok: true, skipped: true, message: "이 링크는 별도 승인 없이 열람할 수 있어요." });
  }

  const link = await prisma.calendarShareLink.findFirst({
    where: { id: resolved.linkId, revokedAt: null },
  });
  if (!link) return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 });

  if (!link.guestApprovalRequired) {
    return NextResponse.json({ ok: true, skipped: true, message: "승인 절차가 꺼져 있는 링크입니다." });
  }

  const key = request.headers.get("x-share-visitor")?.trim() ?? "";
  if (!isValidShareVisitorKey(key)) {
    return NextResponse.json({ error: "게스트 식별키가 필요합니다. 페이지를 새로고침 해 주세요." }, { status: 400 });
  }

  const body = (await request.json()) as { displayName?: string };
  const displayName = body.displayName?.trim().slice(0, 64) ?? "";
  if (displayName.length < 2) {
    return NextResponse.json({ error: "이름을 2글자 이상 입력해 주세요." }, { status: 400 });
  }

  const existing = await prisma.shareLinkVisitor.findUnique({
    where: { linkId_visitorKey: { linkId: link.id, visitorKey: key } },
  });

  if (existing?.approvalStatus === "REVOKED") {
    return NextResponse.json({ error: "이 링크에 대한 접근이 차단된 기기입니다. 소유자에게 문의해 주세요." }, { status: 403 });
  }

  if (existing?.approvalStatus === "APPROVED" || existing?.approvalStatus === "AUTO") {
    return NextResponse.json({ ok: true, status: "approved" });
  }

  await prisma.shareLinkVisitor.upsert({
    where: { linkId_visitorKey: { linkId: link.id, visitorKey: key } },
    create: {
      linkId: link.id,
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

  const owner = await prisma.calendarMember.findFirst({
    where: { calendarId: link.calendarId, role: "OWNER" },
  });
  if (owner) {
    await prisma.notification.create({
      data: {
        userId: owner.userId,
        calendarId: link.calendarId,
        actorName: displayName,
        type: "share_guest_pending",
        message: `공유 링크 접속 요청: "${displayName}" 님이 승인을 기다리고 있어요.`,
      },
    });
  }

  return NextResponse.json({ ok: true, status: "pending" });
}
