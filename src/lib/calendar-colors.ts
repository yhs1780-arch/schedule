/**
 * 캘린더 색: (1) 프리셋 Tailwind 토큰 (2) 사용자 지정 #RRGGBB
 * DB `color` 필드에 그대로 저장됩니다.
 */
import type { CSSProperties } from "react";

export type CalColorEntry = { db: string; pill: string; dot: string; label: string };

export const CAL_COLORS: CalColorEntry[] = [
  { db: "bg-emerald-500/20 text-emerald-300", pill: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", label: "에메랄드" },
  { db: "bg-teal-500/20 text-teal-300", pill: "bg-teal-100 text-teal-800", dot: "bg-teal-500", label: "틸" },
  { db: "bg-cyan-500/20 text-cyan-300", pill: "bg-cyan-100 text-cyan-800", dot: "bg-cyan-500", label: "시안" },
  { db: "bg-sky-500/20 text-sky-300", pill: "bg-sky-100 text-sky-800", dot: "bg-sky-500", label: "하늘" },
  { db: "bg-blue-500/20 text-blue-300", pill: "bg-blue-100 text-blue-800", dot: "bg-blue-500", label: "블루" },
  { db: "bg-indigo-500/20 text-indigo-300", pill: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500", label: "인디고" },
  { db: "bg-violet-500/20 text-violet-300", pill: "bg-violet-100 text-violet-800", dot: "bg-violet-500", label: "바이올렛" },
  { db: "bg-purple-500/20 text-purple-300", pill: "bg-purple-100 text-purple-800", dot: "bg-purple-500", label: "퍼플" },
  { db: "bg-fuchsia-500/20 text-fuchsia-300", pill: "bg-fuchsia-100 text-fuchsia-800", dot: "bg-fuchsia-500", label: "푸시아" },
  { db: "bg-pink-500/20 text-pink-300", pill: "bg-pink-100 text-pink-800", dot: "bg-pink-500", label: "핑크" },
  { db: "bg-rose-500/20 text-rose-300", pill: "bg-rose-100 text-rose-800", dot: "bg-rose-500", label: "로즈" },
  { db: "bg-red-500/20 text-red-300", pill: "bg-red-100 text-red-800", dot: "bg-red-500", label: "레드" },
  { db: "bg-orange-500/20 text-orange-300", pill: "bg-orange-100 text-orange-800", dot: "bg-orange-500", label: "오렌지" },
  { db: "bg-amber-500/20 text-amber-300", pill: "bg-amber-100 text-amber-800", dot: "bg-amber-500", label: "앰버" },
  { db: "bg-yellow-500/20 text-yellow-300", pill: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500", label: "옐로" },
  { db: "bg-lime-500/20 text-lime-300", pill: "bg-lime-100 text-lime-800", dot: "bg-lime-500", label: "라임" },
  { db: "bg-green-500/20 text-green-300", pill: "bg-green-100 text-green-800", dot: "bg-green-500", label: "그린" },
  { db: "bg-slate-500/20 text-slate-300", pill: "bg-slate-100 text-slate-800", dot: "bg-slate-500", label: "슬레이트" },
  { db: "bg-zinc-500/20 text-zinc-300", pill: "bg-zinc-100 text-zinc-800", dot: "bg-zinc-500", label: "징크" },
  { db: "bg-stone-500/20 text-stone-300", pill: "bg-stone-100 text-stone-800", dot: "bg-stone-500", label: "스톤" },
  { db: "bg-neutral-500/20 text-neutral-300", pill: "bg-neutral-100 text-neutral-800", dot: "bg-neutral-500", label: "그레이" },
  { db: "bg-amber-600/20 text-amber-200", pill: "bg-amber-200 text-amber-900", dot: "bg-amber-600", label: "딥앰버" },
  { db: "bg-blue-600/20 text-blue-200", pill: "bg-blue-200 text-blue-900", dot: "bg-blue-600", label: "딥블루" },
  { db: "bg-emerald-600/20 text-emerald-200", pill: "bg-emerald-200 text-emerald-900", dot: "bg-emerald-600", label: "딥그린" },
  { db: "bg-red-600/20 text-red-200", pill: "bg-red-200 text-red-900", dot: "bg-red-600", label: "딥레드" },
  { db: "bg-orange-600/20 text-orange-200", pill: "bg-orange-200 text-orange-900", dot: "bg-orange-600", label: "딥오렌지" },
  { db: "bg-rose-600/20 text-rose-200", pill: "bg-rose-200 text-rose-900", dot: "bg-rose-600", label: "딥로즈" },
  { db: "bg-violet-600/20 text-violet-200", pill: "bg-violet-200 text-violet-900", dot: "bg-violet-600", label: "딥바이올렛" },
  { db: "bg-cyan-600/20 text-cyan-200", pill: "bg-cyan-200 text-cyan-900", dot: "bg-cyan-600", label: "딥시안" },
  { db: "bg-teal-600/20 text-teal-200", pill: "bg-teal-200 text-teal-900", dot: "bg-teal-600", label: "딥틸" },
  { db: "bg-sky-600/20 text-sky-200", pill: "bg-sky-200 text-sky-900", dot: "bg-sky-600", label: "딥하늘" },
  { db: "bg-indigo-600/20 text-indigo-200", pill: "bg-indigo-200 text-indigo-900", dot: "bg-indigo-600", label: "딥인디고" },
  { db: "bg-fuchsia-600/20 text-fuchsia-200", pill: "bg-fuchsia-200 text-fuchsia-900", dot: "bg-fuchsia-600", label: "딥푸시아" },
  { db: "bg-lime-600/20 text-lime-200", pill: "bg-lime-200 text-lime-900", dot: "bg-lime-600", label: "딥라임" },
  { db: "bg-green-600/20 text-green-200", pill: "bg-green-200 text-green-900", dot: "bg-green-600", label: "딥포레스트" },
  { db: "bg-yellow-600/20 text-yellow-200", pill: "bg-yellow-200 text-yellow-900", dot: "bg-yellow-600", label: "딥골드" },
  { db: "bg-purple-600/20 text-purple-200", pill: "bg-purple-200 text-purple-900", dot: "bg-purple-600", label: "딥퍼플" },
  { db: "bg-pink-600/20 text-pink-200", pill: "bg-pink-200 text-pink-900", dot: "bg-pink-600", label: "딥핑크" },
];

const DB_SET = new Set(CAL_COLORS.map(c => c.db));

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(v => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** #RRGGBB (uppercase) 또는 null */
export function parseHexColor(input: string | null | undefined): string | null {
  if (input == null) return null;
  let t = input.trim();
  if (!t) return null;
  if (!t.startsWith("#")) t = `#${t}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1]!, g = t[2]!, b = t[3]!;
    t = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (!/^#[0-9A-Fa-f]{6}$/i.test(t)) return null;
  return `#${t.slice(1).toUpperCase()}`;
}

/** 프리셋 키 또는 정규 HEX */
export function normalizeCalendarColor(input: string | null | undefined): string | null {
  const s = input?.trim() ?? "";
  if (!s) return null;
  if (DB_SET.has(s)) return s;
  return parseHexColor(s);
}

export function isStoredHexColor(s: string | null | undefined): boolean {
  return parseHexColor(s ?? "") !== null;
}

export function isValidCalendarColor(input: string | null | undefined): boolean {
  return normalizeCalendarColor(input) !== null;
}

/** @deprecated use isValidCalendarColor */
export const isValidCalendarColorDb = isValidCalendarColor;

export type ResolvedCalendarColor = {
  label: string;
  isHex: boolean;
  pill: string;
  dot: string;
  pillStyle?: CSSProperties;
  dotStyle?: CSSProperties;
};

function hexRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function resolveCalendarColor(raw: string | null | undefined): ResolvedCalendarColor {
  const s = raw?.trim() ?? "";
  const hex = parseHexColor(s);
  if (hex) {
    const { r, g, b } = hexRgb(hex);
    const L = relativeLuminance(r, g, b);
    const fg = L > 0.55 ? "#0f172a" : "#f8fafc";
    return {
      label: "사용자 색",
      isHex: true,
      pill: "",
      dot: "",
      pillStyle: { backgroundColor: `rgba(${r},${g},${b},0.24)`, color: fg },
      dotStyle: { backgroundColor: `rgb(${r},${g},${b})` },
    };
  }
  if (s && DB_SET.has(s)) {
    const c = CAL_COLORS.find(x => x.db === s)!;
    return { label: c.label, isHex: false, pill: c.pill, dot: c.dot };
  }
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  const c = CAL_COLORS[h % CAL_COLORS.length]!;
  return { label: c.label, isHex: false, pill: c.pill, dot: c.dot };
}

export function calDotParts(col: ResolvedCalendarColor, sizeClass: string): { className: string; style?: CSSProperties } {
  return {
    className: `${sizeClass} ${col.isHex ? "" : col.dot}`.trim(),
    style: col.dotStyle,
  };
}

export function calPillParts(col: ResolvedCalendarColor, extraClass: string): { className: string; style?: CSSProperties } {
  return {
    className: `${extraClass} ${col.isHex ? "" : col.pill}`.trim(),
    style: col.pillStyle,
  };
}
