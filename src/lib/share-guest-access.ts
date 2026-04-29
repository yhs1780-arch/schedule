import { createHmac } from "crypto";
import type { Calendar, MultiShare } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";
import { isValidShareVisitorKey } from "@/lib/share-visitor-key";
import { resolveShareToken } from "@/lib/share-token";

function privacyHash(input: string, purpose: "ip" | "ua"): string {
  const secret = process.env.SHARE_PRIVACY_SALT || "syncnest-dev-salt";
  return createHmac("sha256", secret).update(`${purpose}:${input}`).digest("hex").slice(0, 32);
}

function visitorHashes(request: Request): { lastIpHash: string | null; lastUaHash: string | null } {
  const ip = getClientIp(request);
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 300);
  return {
    lastIpHash: ip !== "unknown" ? privacyHash(ip, "ip") : null,
    lastUaHash: ua ? privacyHash(ua, "ua") : null,
  };
}

export type CalendarShareGuestOk = {
  ok: true;
  effectiveRole: string;
  calendarId: string;
  calendar: Calendar;
};

export type CalendarShareGuestFail = { ok: false; response: NextResponse };

/** 단일 캘린더 공유 토큰: 승인·역할 검증 후 API에서 사용 */
export async function requireCalendarShareForGuest(request: Request, token: string): Promise<CalendarShareGuestOk | CalendarShareGuestFail> {
  const resolved = await resolveShareToken(token);
  if (!resolved) {
    return { ok: false, response: NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 }) };
  }

  if (!resolved.linkId) {
    return {
      ok: true,
      effectiveRole: resolved.linkShareRole,
      calendarId: resolved.calendar.id,
      calendar: resolved.calendar,
    };
  }

  const link = await prisma.calendarShareLink.findFirst({
    where: { id: resolved.linkId, revokedAt: null },
  });
  if (!link) {
    return { ok: false, response: NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 }) };
  }

  const key = request.headers.get("x-share-visitor")?.trim() ?? "";
  if (!isValidShareVisitorKey(key)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          code: "VISITOR_KEY_REQUIRED",
          guestApprovalRequired: link.guestApprovalRequired,
          error: "게스트 식별이 필요합니다. 페이지를 새로고침해 주세요.",
        },
        { status: 403 },
      ),
    };
  }

  const visitor = await prisma.shareLinkVisitor.findUnique({
    where: { linkId_visitorKey: { linkId: link.id, visitorKey: key } },
  });
  const hashes = visitorHashes(request);

  if (!link.guestApprovalRequired) {
    const v = await prisma.shareLinkVisitor.upsert({
      where: { linkId_visitorKey: { linkId: link.id, visitorKey: key } },
      create: {
        linkId: link.id,
        visitorKey: key,
        approvalStatus: "AUTO",
        ...hashes,
        accessCount: 1,
      },
      update: {
        lastSeenAt: new Date(),
        accessCount: { increment: 1 },
        ...hashes,
      },
    });
    const role = v.guestRole ?? link.shareRole;
    return { ok: true, effectiveRole: role, calendarId: resolved.calendar.id, calendar: resolved.calendar };
  }

  if (!visitor) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          code: "GUEST_ACCESS_NEEDED",
          guestApprovalRequired: true,
          message: "이름을 입력하고 소유자 승인을 받은 뒤 이용할 수 있어요.",
        },
        { status: 403 },
      ),
    };
  }

  if (visitor.approvalStatus === "REVOKED") {
    return {
      ok: false,
      response: NextResponse.json(
        { code: "GUEST_REVOKED", message: "이 링크에 대한 접근이 차단되었습니다." },
        { status: 403 },
      ),
    };
  }

  if (visitor.approvalStatus === "PENDING") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          code: "GUEST_PENDING",
          guestApprovalRequired: true,
          guestDisplayName: visitor.guestDisplayName,
          message: "소유자 승인 대기 중입니다.",
        },
        { status: 403 },
      ),
    };
  }

  await prisma.shareLinkVisitor.update({
    where: { id: visitor.id },
    data: { lastSeenAt: new Date(), accessCount: { increment: 1 }, ...hashes },
  });

  const role = visitor.guestRole ?? link.shareRole;
  return { ok: true, effectiveRole: role, calendarId: resolved.calendar.id, calendar: resolved.calendar };
}

export type MultiShareGuestOk = { ok: true; effectiveRole: string; multiShare: MultiShare };

export async function requireMultiShareForGuest(request: Request, token: string): Promise<MultiShareGuestOk | CalendarShareGuestFail> {
  const now = new Date();
  const ms = await prisma.multiShare.findFirst({
    where: {
      token,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
  if (!ms) {
    return { ok: false, response: NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 }) };
  }

  const key = request.headers.get("x-share-visitor")?.trim() ?? "";
  if (!isValidShareVisitorKey(key)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          code: "VISITOR_KEY_REQUIRED",
          guestApprovalRequired: ms.guestApprovalRequired,
          error: "게스트 식별이 필요합니다.",
        },
        { status: 403 },
      ),
    };
  }

  const visitor = await prisma.multiShareVisitor.findUnique({
    where: { multiShareId_visitorKey: { multiShareId: ms.id, visitorKey: key } },
  });
  const hashes = visitorHashes(request);

  if (!ms.guestApprovalRequired) {
    const v = await prisma.multiShareVisitor.upsert({
      where: { multiShareId_visitorKey: { multiShareId: ms.id, visitorKey: key } },
      create: {
        multiShareId: ms.id,
        visitorKey: key,
        approvalStatus: "AUTO",
        ...hashes,
        accessCount: 1,
      },
      update: {
        lastSeenAt: new Date(),
        accessCount: { increment: 1 },
        ...hashes,
      },
    });
    return { ok: true, effectiveRole: v.guestRole ?? ms.shareRole, multiShare: ms };
  }

  if (!visitor) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          code: "GUEST_ACCESS_NEEDED",
          guestApprovalRequired: true,
          message: "이름을 입력하고 소유자 승인을 받은 뒤 이용할 수 있어요.",
        },
        { status: 403 },
      ),
    };
  }

  if (visitor.approvalStatus === "REVOKED") {
    return {
      ok: false,
      response: NextResponse.json(
        { code: "GUEST_REVOKED", message: "이 링크에 대한 접근이 차단되었습니다." },
        { status: 403 },
      ),
    };
  }

  if (visitor.approvalStatus === "PENDING") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          code: "GUEST_PENDING",
          guestApprovalRequired: true,
          guestDisplayName: visitor.guestDisplayName,
          message: "소유자 승인 대기 중입니다.",
        },
        { status: 403 },
      ),
    };
  }

  await prisma.multiShareVisitor.update({
    where: { id: visitor.id },
    data: { lastSeenAt: new Date(), accessCount: { increment: 1 }, ...hashes },
  });

  return { ok: true, effectiveRole: visitor.guestRole ?? ms.shareRole, multiShare: ms };
}
