import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Calendar } from "@prisma/client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isValidShareVisitorKey } from "@/lib/share-visitor-key";

export type ResolvedShare = {
  calendar: Calendar;
  linkId: string | null;
  linkShareRole: string;
  guestApprovalRequired: boolean;
};

function privacyHash(input: string, purpose: "ip" | "ua"): string {
  const secret = process.env.SHARE_PRIVACY_SALT || "syncnest-dev-salt";
  return createHmac("sha256", secret).update(`${purpose}:${input}`).digest("hex").slice(0, 32);
}

/** 공유 토큰 → 캘린더. 링크 테이블 우선, 없으면 legacy Calendar.shareToken. */
export async function resolveShareToken(token: string): Promise<ResolvedShare | null> {
  if (!token || token.length < 16) return null;
  const now = new Date();

  const link = await prisma.calendarShareLink.findFirst({
    where: {
      token,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
  if (link) {
    const cal = await prisma.calendar.findUnique({ where: { id: link.calendarId } });
    if (!cal) return null;
    return {
      calendar: cal,
      linkId: link.id,
      linkShareRole: link.shareRole,
      guestApprovalRequired: link.guestApprovalRequired,
    };
  }

  const cal = await prisma.calendar.findUnique({ where: { shareToken: token } });
  if (!cal) return null;
  return {
    calendar: cal,
    linkId: null,
    linkShareRole: cal.shareRole,
    guestApprovalRequired: false,
  };
}

/** 추가 로깅(승인 검증 이후 보조). PENDING/REVOKED 는 무시. */
export async function recordShareVisitorIfPresent(linkId: string | null, request: Request): Promise<void> {
  if (!linkId) return;
  const raw = request.headers.get("x-share-visitor")?.trim() ?? "";
  if (!isValidShareVisitorKey(raw)) return;

  const ip = getClientIp(request);
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 300);
  const lastIpHash = ip !== "unknown" ? privacyHash(ip, "ip") : null;
  const lastUaHash = ua ? privacyHash(ua, "ua") : null;

  try {
    const v = await prisma.shareLinkVisitor.findUnique({
      where: { linkId_visitorKey: { linkId, visitorKey: raw } },
    });
    if (!v || v.approvalStatus === "PENDING" || v.approvalStatus === "REVOKED") return;

    await prisma.shareLinkVisitor.update({
      where: { id: v.id },
      data: {
        lastSeenAt: new Date(),
        accessCount: { increment: 1 },
        lastIpHash,
        lastUaHash,
      },
    });
  } catch {
    /* ignore */
  }
}

export async function recordMultiShareVisitorIfPresent(multiShareId: string | null, request: Request): Promise<void> {
  if (!multiShareId) return;
  const raw = request.headers.get("x-share-visitor")?.trim() ?? "";
  if (!isValidShareVisitorKey(raw)) return;

  const ip = getClientIp(request);
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 300);
  const lastIpHash = ip !== "unknown" ? privacyHash(ip, "ip") : null;
  const lastUaHash = ua ? privacyHash(ua, "ua") : null;

  try {
    const v = await prisma.multiShareVisitor.findUnique({
      where: { multiShareId_visitorKey: { multiShareId, visitorKey: raw } },
    });
    if (!v || v.approvalStatus === "PENDING" || v.approvalStatus === "REVOKED") return;

    await prisma.multiShareVisitor.update({
      where: { id: v.id },
      data: {
        lastSeenAt: new Date(),
        accessCount: { increment: 1 },
        lastIpHash,
        lastUaHash,
      },
    });
  } catch {
    /* ignore */
  }
}

const RL_IP = 200;
const RL_TOKEN = 400;
const WINDOW_MS = 60_000;

/** 공용 API(비로그인)에 대한 기본 제한. true = 허용 */
export function allowShareRequest(request: Request, token: string): boolean {
  const ip = getClientIp(request);
  if (!checkRateLimit(`sh:ip:${ip}`, RL_IP, WINDOW_MS)) return false;
  if (!checkRateLimit(`sh:tok:${token.slice(0, 24)}`, RL_TOKEN, WINDOW_MS)) return false;
  return true;
}
