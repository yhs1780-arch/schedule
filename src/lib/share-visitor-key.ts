/** 공유·멀티공유 API의 X-Share-Visitor 값 검증 (추측·주입 완화) */

export const SHARE_VISITOR_STORAGE_KEY = "syncnest_share_visitor";
export const VISITOR_KEY_MAX = 64;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGACY_RE = /^v_\d+_[a-z0-9]{6,32}$/i;

export function isValidShareVisitorKey(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const s = raw.trim();
  if (s.length < 8 || s.length > VISITOR_KEY_MAX) return false;
  return UUID_RE.test(s) || LEGACY_RE.test(s);
}

export function newShareVisitorKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}
