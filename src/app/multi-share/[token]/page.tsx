"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { calDotParts, calPillParts, resolveCalendarColor } from "@/lib/calendar-colors";

type EventItem = {
  id: string; title: string; startAt: string; endAt?: string | null;
  allDay?: boolean; location?: string | null; description?: string | null;
  guestName?: string | null; isTask?: boolean; isDone?: boolean;
  createdBy?: { id: string; name: string } | null;
};
type CalInfo = { id: string; name: string; color: string; events: EventItem[] };

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} (${["일","월","화","수","목","금","토"][d.getDay()]})`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MultiSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<CalInfo[]>([]);
  const [shareRole, setShareRole] = useState("VIEWER");
  const [selectedCals, setSelectedCals] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/multi-share/${token}`, { cache: "no-store" });
        if (!res.ok) { const d = await res.json() as {error?:string}; setError(d.error ?? "링크를 찾을 수 없습니다."); return; }
        const d = await res.json() as { shareRole: string; calendars: CalInfo[] };
        setShareRole(d.shareRole); setCalendars(d.calendars);
        setSelectedCals(new Set(d.calendars.map(c => c.id)));
      } catch { setError("불러오기 실패"); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const allEvents = useMemo(() => {
    return calendars
      .filter(c => selectedCals.has(c.id))
      .flatMap(c => c.events.map(e => ({ ...e, calName: c.name, calColor: c.color })))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [calendars, selectedCals]);

  const selected = allEvents.find(e => e.id === selectedId);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"/>
    </div>
  );
  if (error) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
      <div className="text-5xl">🔗</div>
      <h1 className="text-xl font-bold text-gray-800">링크를 찾을 수 없어요</h1>
      <p className="text-sm text-gray-500">{error}</p>
      <Link href="/" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">홈으로</Link>
    </div>
  );

  // 날짜별 그룹
  const grouped = useMemo(() => {
    const m = new Map<string, typeof allEvents>();
    for (const e of allEvents) {
      const d = e.startAt.slice(0, 10);
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(e);
    }
    return Array.from(m.entries()).sort();
  }, [allEvents]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm">SN</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900">{calendars.length}개 캘린더 공유</h1>
            <p className="text-[11px] text-gray-400">{shareRole === "EDITOR" ? "✏️ 편집 가능" : "👁️ 보기 전용"}</p>
          </div>
          <Link href="/register" className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100">
            가입하기
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4">
        {/* 캘린더 필터 */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setSelectedCals(new Set(calendars.map(c => c.id)))}
            className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50">
            전체
          </button>
          {calendars.map(c => {
            const active = selectedCals.has(c.id);
            const ccol = resolveCalendarColor(c.color);
            const pp = calPillParts(ccol, "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition");
            const d = calDotParts(ccol, "h-2 w-2 flex-shrink-0 rounded-full");
            return (
              <button key={c.id} onClick={() => setSelectedCals(prev => {
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

        {allEvents.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">일정이 없어요.</div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([date, evs]) => (
              <div key={date}>
                <p className="mb-2 text-[11px] font-bold text-gray-400 uppercase">{fmtDate(date + "T00:00:00")}</p>
                <div className="space-y-2">
                  {evs.map(e => {
                    const col = resolveCalendarColor(e.calColor);
                    const d = calDotParts(col, "mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full");
                    return (
                    <button key={e.id} onClick={() => setSelectedId(selectedId === e.id ? null : e.id)}
                      className={`w-full rounded-xl border bg-white p-3 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] ${selectedId === e.id ? "border-indigo-300 shadow-indigo-100" : "border-gray-100"}`}>
                      <div className="flex items-start gap-2.5">
                        <span className={d.className} style={d.style}/>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${e.isDone ? "line-through text-gray-400" : "text-gray-800"}`}>{e.title}</p>
                          <p className="text-[11px] text-gray-400">{e.allDay ? "하루 종일" : fmtTime(e.startAt)}{e.endAt ? ` ~ ${fmtTime(e.endAt)}` : ""} · {e.calName}</p>
                          {e.location && <p className="text-[11px] text-gray-400 truncate">📍 {e.location}</p>}
                        </div>
                      </div>
                      {selectedId === e.id && (
                        <div className="mt-2.5 border-t border-gray-100 pt-2.5 space-y-1">
                          {e.description && <p className="text-xs text-gray-500 whitespace-pre-wrap">{e.description}</p>}
                          <p className="text-[10px] text-gray-400">작성: {e.guestName ?? e.createdBy?.name ?? "알 수 없음"}</p>
                        </div>
                      )}
                    </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 가입 CTA */}
        <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-center">
          <p className="text-sm font-bold text-indigo-800">내 캘린더도 만들어보세요</p>
          <p className="mt-1 text-xs text-indigo-500">SyncNest에 가입하면 캘린더를 직접 만들고 원하는 사람에게만 공유할 수 있어요.</p>
          <Link href="/register" className="mt-3 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
            무료로 시작하기 →
          </Link>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setSelectedId(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-lg font-bold ${selected.isDone ? "line-through text-gray-400" : "text-gray-900"}`}>{selected.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{selected.calName}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100">✕</button>
            </div>
            <div className="mt-3 space-y-1.5 text-sm text-gray-600">
              <p>🗓 {fmtDate(selected.startAt)}{!selected.allDay ? ` ${fmtTime(selected.startAt)}` : ""}</p>
              {selected.location && <p>📍 {selected.location}</p>}
              {selected.description && <p className="text-xs text-gray-500 whitespace-pre-wrap">{selected.description}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
