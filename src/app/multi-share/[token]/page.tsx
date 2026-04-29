"use client";

import { use, useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { calDotParts, calPillParts, resolveCalendarColor } from "@/lib/calendar-colors";
import { naverMapDirectionsUrl, tmapNavigationRouteUrl, navigationSearchQuery } from "@/lib/directions-links";
import { useOverlayHistoryStack } from "@/hooks/useOverlayHistoryStack";
import { shareApiFetch } from "@/lib/share-visitor-client";

const MULTI_VIEW_KEY = "syncnest_multishare_view";

function readInitialView(): "list" | "month" | "week" {
  if (typeof window === "undefined") return "month";
  const v = localStorage.getItem(MULTI_VIEW_KEY);
  if (v === "list" || v === "week" || v === "month") return v;
  return "month";
}

type EventItem = {
  id: string; title: string; startAt: string; endAt?: string | null;
  allDay?: boolean; location?: string | null; description?: string | null;
  guestName?: string | null; isTask?: boolean; isDone?: boolean;
  createdBy?: { id: string; name: string } | null;
};
type CalInfo = { id: string; name: string; color: string; events: EventItem[] };
type EvRow = EventItem & { calName: string; calColor: string };

const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${d.getDate()} (${DAYS_KR[d.getDay()]})`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function buildGrid(y: number, m: number) {
  const first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate();
  const arr = Array.from({ length: Math.ceil((first + last) / 7) * 7 }, (_, i) => {
    const d = i - first + 1;
    return d >= 1 && d <= last ? d : null;
  });
  const rows: (number | null)[][] = [];
  for (let i = 0; i < arr.length; i += 7) rows.push(arr.slice(i, i + 7));
  return rows;
}
function startOfWeekSunday(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}

export default function MultiSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const touchX = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessGate, setAccessGate] = useState<null | "name" | "pending">(null);
  const [pendingGuestName, setPendingGuestName] = useState("");
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [gateNameDraft, setGateNameDraft] = useState("");
  const [calendars, setCalendars] = useState<CalInfo[]>([]);
  const [shareRole, setShareRole] = useState("VIEWER");
  const [selectedCals, setSelectedCals] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setViewRaw] = useState<"list" | "month" | "week">("month");
  const setView = useCallback((v: "list" | "month" | "week") => {
    setViewRaw(v);
    if (typeof window !== "undefined") localStorage.setItem(MULTI_VIEW_KEY, v);
  }, []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daySheet, setDaySheet] = useState<string | null>(null);

  useEffect(() => {
    const v = readInitialView();
    if (v !== "month") setViewRaw(v);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!window.history.state?.snMultiShare) {
        window.history.replaceState({ ...window.history.state, snMultiShare: 1 }, "", window.location.href);
      }
    } catch { /* ignore */ }
  }, [token]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await shareApiFetch(`/api/multi-share/${encodeURIComponent(token)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.ok) {
        const d = data as { shareRole: string; calendars: CalInfo[] };
        setShareRole(d.shareRole);
        setCalendars(d.calendars);
        setSelectedCals(new Set(d.calendars.map(c => c.id)));
        setAccessGate(null);
      } else if (res.status === 403) {
        const code = data.code as string | undefined;
        if (code === "GUEST_ACCESS_NEEDED") {
          setCalendars([]);
          setAccessGate("name");
        } else if (code === "GUEST_PENDING") {
          setCalendars([]);
          setAccessGate("pending");
          setPendingGuestName(String((data as { guestDisplayName?: string }).guestDisplayName ?? ""));
        } else if (code === "GUEST_REVOKED") {
          setCalendars([]);
          setAccessGate(null);
          setError(String((data as { message?: string }).message ?? "접근이 차단되었습니다."));
        } else {
          setCalendars([]);
          setAccessGate(null);
          setError(String((data as { error?: string }).error ?? "접근할 수 없습니다."));
        }
      } else {
        setCalendars([]);
        setAccessGate(null);
        setError(String((data as { error?: string }).error ?? "링크를 찾을 수 없습니다."));
      }
    } catch {
      setAccessGate(null);
      setError("불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (accessGate !== "pending") return;
    const id = setInterval(() => void loadData(), 8000);
    return () => clearInterval(id);
  }, [accessGate, loadData]);

  async function submitGuestAccess() {
    const name = gateNameDraft.trim();
    if (name.length < 2) return;
    setGateSubmitting(true);
    try {
      await shareApiFetch(`/api/multi-share/${encodeURIComponent(token)}/guest-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      await loadData();
    } finally {
      setGateSubmitting(false);
    }
  }

  const allEvents = useMemo(() => {
    return calendars
      .filter(c => selectedCals.has(c.id))
      .flatMap(c => c.events.map(e => ({ ...e, calName: c.name, calColor: c.color })))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [calendars, selectedCals]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof allEvents>();
    for (const e of allEvents) {
      const d = e.startAt.slice(0, 10);
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(e);
    }
    return Array.from(m.entries()).sort();
  }, [allEvents]);

  const selected = allEvents.find(e => e.id === selectedId);
  const today = new Date();
  const y = currentDate.getFullYear(), m = currentDate.getMonth();
  const rows = buildGrid(y, m);

  const multiSnap = useRef({ selectedId: null as string | null, daySheet: null as string | null });
  multiSnap.current = { selectedId, daySheet };
  const popMultiOverlay = useCallback(() => {
    const s = multiSnap.current;
    if (s.selectedId) { setSelectedId(null); return; }
    if (s.daySheet) { setDaySheet(null); }
  }, []);
  const multiOverlayDepth = (selectedId ? 1 : 0) + (daySheet ? 1 : 0);
  useOverlayHistoryStack(multiOverlayDepth, popMultiOverlay);

  if (accessGate === "name") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 text-center text-4xl">👤</div>
          <h1 className="mb-1 text-center text-lg font-bold text-gray-900">이름을 알려주세요</h1>
          <p className="mb-4 text-center text-sm leading-relaxed text-gray-500">동시 공유 링크 소유자가 승인하면 여러 캘린더를 볼 수 있어요.</p>
          <input
            autoFocus
            value={gateNameDraft}
            onChange={e => setGateNameDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void submitGuestAccess(); }}
            placeholder="예: 홍길동"
            className="mb-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => void submitGuestAccess()}
            disabled={gateNameDraft.trim().length < 2 || gateSubmitting}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-40 active:scale-[0.99]"
          >
            {gateSubmitting ? "전송 중..." : "확인"}
          </button>
        </div>
        <Link href="/" className="mt-6 text-sm text-gray-400 underline">홈으로</Link>
      </div>
    );
  }

  if (accessGate === "pending") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-sm rounded-2xl border border-amber-100 bg-amber-50/80 p-6 text-center shadow-sm">
          <div className="mb-3 text-4xl">⏳</div>
          <h1 className="mb-2 text-lg font-bold text-gray-900">승인 대기 중</h1>
          <p className="text-sm leading-relaxed text-gray-600">
            <strong className="text-gray-900">{pendingGuestName || "요청"}</strong> 님이 승인을 기다리고 있어요.
          </p>
          <button type="button" onClick={() => void loadData()} className="mt-5 w-full rounded-xl border border-amber-200 bg-white py-2.5 text-sm font-semibold text-amber-900 active:scale-[0.99]">지금 다시 확인</button>
        </div>
        <Link href="/" className="mt-6 text-sm text-gray-400 underline">홈으로</Link>
      </div>
    );
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"/>
    </div>
  );
  if (error) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 pb-[max(1rem,env(safe-area-inset-bottom))] text-center">
      <div className="text-5xl">🔗</div>
      <h1 className="text-xl font-bold text-gray-800">이 링크로는 열 수 없어요</h1>
      <p className="text-sm text-gray-500 max-w-xs">{error}</p>
      <Link href="/" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">홈으로</Link>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">SN</div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-gray-900">{calendars.length}개 캘린더 · 동시 보기</h1>
            <p className="text-[11px] text-gray-400">{shareRole === "EDITOR" ? "✏️ 편집 가능" : "👁️ 보기 전용"}</p>
          </div>
          <Link href="/register" replace className="flex-shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100">
            가입하기
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-3 py-3 sm:px-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setSelectedCals(new Set(calendars.map(c => c.id)))}
            className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50">전체</button>
          {calendars.map(c => {
            const active = selectedCals.has(c.id);
            const ccol = resolveCalendarColor(c.color);
            const pp = calPillParts(ccol, "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition");
            const d = calDotParts(ccol, "h-2 w-2 flex-shrink-0 rounded-full");
            return (
              <button type="button" key={c.id} onClick={() => setSelectedCals(prev => {
                const next = new Set(prev);
                if (active) next.delete(c.id); else next.add(c.id);
                return next;
              })} className={active ? `${pp.className} border-transparent` : "flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-400 transition"} style={active ? pp.style : undefined}>
                {active ? <span className={d.className} style={d.style}/> : <span className="h-2 w-2 flex-shrink-0 rounded-full bg-gray-300" />}
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-gray-100 bg-white/80 pb-2">
          <div className="flex flex-1 items-center gap-0.5 sm:gap-1 min-w-0">
            <button type="button" onClick={() => setCurrentDate(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="이전 달">◀</button>
            <button type="button" onClick={() => setCurrentDate(new Date())} className="min-w-0 truncate text-sm font-bold text-gray-800 sm:text-base">
              {y}년 {MONTHS[m]}
            </button>
            <button type="button" onClick={() => setCurrentDate(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="다음 달">▶</button>
            <button type="button" onClick={() => setCurrentDate(new Date())} className="rounded-lg border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600 sm:text-xs">오늘</button>
          </div>
          <div className="ml-auto flex rounded-lg border border-gray-200 p-0.5">
            {(["month", "week", "list"] as const).map(v => (
              <button key={v} type="button" onClick={() => setView(v)} className={`rounded-md px-2 py-1 text-[10px] font-medium sm:px-2.5 sm:text-xs ${view === v ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                {v === "month" ? "월간" : v === "week" ? "주간" : "목록"}
              </button>
            ))}
          </div>
        </div>

        {allEvents.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">선택한 캘린더에 일정이 없어요.</div>
        ) : view === "list" ? (
          <div className="space-y-4 pb-8">
            {grouped.map(([date, evs]) => (
              <div key={date}>
                <p className="mb-2 text-[11px] font-bold text-gray-400 uppercase">{fmtDate(date + "T00:00:00")}</p>
                <div className="space-y-2">
                  {evs.map(e => {
                    const col = resolveCalendarColor(e.calColor);
                    const d = calDotParts(col, "mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full");
                    return (
                    <button type="button" key={e.id} onClick={() => setSelectedId(selectedId === e.id ? null : e.id)}
                      className={`w-full rounded-xl border bg-white p-3 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] ${selectedId === e.id ? "border-indigo-300 shadow-indigo-100" : "border-gray-100"}`}>
                      <div className="flex items-start gap-2.5">
                        <span className={d.className} style={d.style}/>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${e.isDone ? "line-through text-gray-400" : "text-gray-800"}`}>{e.title}</p>
                          <p className="text-[11px] text-gray-400">{e.allDay ? "하루 종일" : fmtTime(e.startAt)}{e.endAt ? ` ~ ${fmtTime(e.endAt)}` : ""} · {e.calName}</p>
                          {e.location && <p className="truncate text-[11px] text-gray-400">📍 {e.location}</p>}
                        </div>
                      </div>
                    </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : view === "month" ? (
          <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white"
            onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              if (touchX.current === null) return;
              const d = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(d) > 50) setCurrentDate(p => new Date(p.getFullYear(), p.getMonth() + (d < 0 ? 1 : -1), 1));
              touchX.current = null;
            }}>
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS_KR.map((d, i) => <div key={d} className={`py-1.5 text-center text-[10px] font-semibold sm:text-xs ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>{d}</div>)}
            </div>
            {rows.map((row, ri) => (
              <div key={ri} className="grid min-h-0 flex-1 grid-cols-7" style={{ minHeight: "72px" }}>
                {row.map((day, ci) => {
                  if (day === null) return <div key={ci} className="border-b border-r border-gray-100 bg-gray-50/30 last:border-r-0"/>;
                  const dateStr = `${y}-${pad(m + 1)}-${pad(day)}`;
                  const isT = sameDay(new Date(y, m, day), today);
                  const dayEvs = allEvents.filter(e => e.startAt.startsWith(dateStr));
                  return (
                    <button type="button" key={dateStr} onClick={() => { setDaySheet(dateStr); }}
                      className={`border-b border-r border-gray-100 p-0.5 text-left last:border-r-0 ${isT ? "bg-indigo-50/50" : "hover:bg-gray-50"}`}>
                      <div className="flex justify-center">
                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] sm:text-xs ${isT ? "bg-indigo-600 font-bold text-white" : "text-gray-700"}`}>{day}</span>
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvs.slice(0, 2).map(e => {
                          const c = resolveCalendarColor(e.calColor);
                          const dot = calDotParts(c, "h-1 w-1 flex-shrink-0 rounded-full");
                          return (
                            <div key={e.id} onClick={ev => { ev.stopPropagation(); setSelectedId(e.id); }} className="flex cursor-pointer items-center gap-0.5 truncate rounded bg-indigo-50/80 px-0.5 text-[7px] sm:text-[8px] font-medium text-indigo-900">
                              <span className={dot.className} style={dot.style}/><span className="truncate">{e.title}</span>
                            </div>
                          );
                        })}
                        {dayEvs.length > 2 && <p className="pl-0.5 text-[6px] text-gray-400">+{dayEvs.length - 2}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <MultiWeekBlock anchor={currentDate} today={today} events={allEvents} onPickDay={s => setDaySheet(s)} onPickEvent={id => setSelectedId(id)} onPrevWeek={() => setCurrentDate(p => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; })} onNextWeek={() => setCurrentDate(p => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; })} onToday={() => setCurrentDate(new Date())}/>
        )}

        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-center">
          <p className="text-sm font-bold text-indigo-800">내 캘린더도 만들어보세요</p>
          <p className="mt-1 text-xs text-indigo-500">SyncNest에 가입하면 캘린더를 직접 만들고 원하는 사람에게만 공유할 수 있어요.</p>
          <Link href="/register" replace className="mt-3 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">무료로 시작하기 →</Link>
        </div>
      </div>

      {daySheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setDaySheet(null)}>
          <div className="max-h-[70dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-gray-900">{daySheet.replace(/-/g, ". ")}</p>
            <div className="mt-2 space-y-1">
              {allEvents.filter(e => e.startAt.slice(0, 10) === daySheet).map(e => {
                const col = resolveCalendarColor(e.calColor);
                const dot = calDotParts(col, "h-2 w-2 flex-shrink-0 rounded-full");
                return (
                  <button type="button" key={e.id} onClick={() => { setSelectedId(e.id); setDaySheet(null); }}
                    className="flex w-full items-center gap-2 rounded-xl border border-gray-100 px-3 py-2.5 text-left hover:border-indigo-200">
                    <span className={dot.className} style={dot.style}/>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800">{e.title}</p>
                      <p className="text-[10px] text-gray-400">{e.calName}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setDaySheet(null)} className="mt-3 w-full rounded-xl border py-2 text-sm text-gray-600">닫기</button>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setSelectedId(null)}>
          <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-lg font-bold ${selected.isDone ? "line-through text-gray-400" : "text-gray-900"}`}>{selected.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">{selected.calName}</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100">✕</button>
            </div>
            {selected.location && (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={naverMapDirectionsUrl(navigationSearchQuery(selected.location, null))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-[120px] flex-1 items-center justify-center rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-800 active:scale-[0.99]"
                >
                  네이버 길찾기
                </a>
                <a
                  href={tmapNavigationRouteUrl(selected.location)}
                  className="inline-flex min-w-[120px] flex-1 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 active:scale-[0.99]"
                >
                  T맵 네비
                </a>
              </div>
            )}
            <div className="mt-3 space-y-1.5 text-sm text-gray-600">
              <p>🗓 {fmtDate(selected.startAt)}{!selected.allDay ? ` ${fmtTime(selected.startAt)}` : ""}</p>
              {selected.location && <p>📍 {selected.location}</p>}
              {selected.description && <p className="text-xs text-gray-500 whitespace-pre-wrap">{selected.description}</p>}
            </div>
            <p className="mt-2 text-[10px] text-gray-400">작성: {selected.guestName ?? selected.createdBy?.name ?? "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MultiWeekBlock({ anchor, today, events, onPickDay, onPickEvent, onPrevWeek, onNextWeek, onToday }: {
  anchor: Date; today: Date; events: EvRow[];
  onPickDay: (d: string) => void; onPickEvent: (id: string) => void;
  onPrevWeek: () => void; onNextWeek: () => void; onToday: () => void;
}) {
  const start = startOfWeekSunday(anchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const rangeLabel = `${days[0].getFullYear()}.${pad(days[0].getMonth() + 1)}.${pad(days[0].getDate())} ~ ${pad(days[6].getMonth() + 1)}.${pad(days[6].getDate())}`;
  return (
    <div className="flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-2 py-1.5">
        <button type="button" onClick={onPrevWeek} className="text-[10px] font-medium text-indigo-600 sm:text-xs">← 이전 주</button>
        <span className="text-[10px] font-semibold text-gray-600 sm:text-xs">{rangeLabel}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onToday} className="text-[9px] text-gray-500 sm:text-[10px]">이번 주</button>
          <button type="button" onClick={onNextWeek} className="text-[10px] font-medium text-indigo-600 sm:text-xs">다음 주 →</button>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-7 border-b border-gray-200" style={{ minHeight: 200 }}>
        {days.map((d) => {
          const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          const isT = sameDay(d, today);
          const dayEvs = events.filter((e) => e.startAt.slice(0, 10) === dateStr);
          return (
            <div key={dateStr} className={`min-h-0 border-r border-gray-100 p-0.5 last:border-r-0 ${isT ? "bg-indigo-50/40" : ""}`}>
              <button type="button" onClick={() => onPickDay(dateStr)} className="w-full text-center">
                <span className={`text-[8px] font-semibold sm:text-[9px] ${isT ? "text-indigo-600" : "text-gray-500"}`}>{DAYS_KR[d.getDay()]}</span>
                <div className={`text-xs font-bold sm:text-sm ${isT ? "text-indigo-600" : "text-gray-800"}`}>{d.getDate()}</div>
              </button>
              <div className="mt-0.5 space-y-0.5">
                {dayEvs.map((e) => {
                  const col = resolveCalendarColor(e.calColor);
                  const dot = calDotParts(col, "h-1 w-1 flex-shrink-0 rounded-full");
                  return (
                    <button type="button" key={e.id} onClick={() => onPickEvent(e.id)} className="flex w-full items-center gap-0.5 truncate rounded bg-indigo-50/90 px-0.5 text-left text-[7px] font-medium text-indigo-900 sm:text-[8px]">
                      <span className={dot.className} style={dot.style}/><span className="truncate">{e.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
