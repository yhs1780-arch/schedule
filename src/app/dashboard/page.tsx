"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────────── */
type AuthUser = { id: string; slug: string; name: string; email?: string; image?: string; role: string };
type CalendarMember = { role: string; user: { id: string; slug: string; name: string; role: string } };
type EventComment = { id: string; content: string; createdAt: string; author: { id: string; name: string } };
type EventActivity = { id: string; action: string; createdAt: string; actor: { id: string; name: string } };
type EventItem = {
  id: string; title: string; startAt: string; calendarId: string;
  createdById: string; createdBy?: { id: string; name: string };
  externalGoogleEventId?: string | null;
  comments: EventComment[]; activities: EventActivity[];
};
type Calendar = {
  id: string; key: string; name: string; color: string;
  members: CalendarMember[]; events: EventItem[];
};
type FlatEvent = EventItem & { calendarName: string; calendarColor: string };

/* ─── Color system ───────────────────────────────────────────────── */
const CAL_COLORS = [
  { db: "bg-emerald-500/20 text-emerald-300", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", label: "초록" },
  { db: "bg-sky-500/20 text-sky-300",         pill: "bg-sky-100 text-sky-700",         dot: "bg-sky-500",     label: "하늘" },
  { db: "bg-violet-500/20 text-violet-300",   pill: "bg-violet-100 text-violet-700",   dot: "bg-violet-500",  label: "보라" },
  { db: "bg-rose-500/20 text-rose-300",       pill: "bg-rose-100 text-rose-700",       dot: "bg-rose-500",    label: "빨강" },
  { db: "bg-amber-500/20 text-amber-300",     pill: "bg-amber-100 text-amber-700",     dot: "bg-amber-500",   label: "주황" },
  { db: "bg-indigo-500/20 text-indigo-300",   pill: "bg-indigo-100 text-indigo-700",   dot: "bg-indigo-500",  label: "남색" },
  { db: "bg-pink-500/20 text-pink-300",       pill: "bg-pink-100 text-pink-700",       dot: "bg-pink-500",    label: "분홍" },
];
function colOf(dbColor: string) {
  return CAL_COLORS.find(c => c.db === dbColor) ?? CAL_COLORS[0];
}

/* ─── Date helpers ───────────────────────────────────────────────── */
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function buildGrid(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const last = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((first + last) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = i - first + 1;
    return d >= 1 && d <= last ? d : null;
  });
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function pad(n: number) { return String(n).padStart(2, "0"); }
function toInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${MONTHS[d.getMonth()]} ${d.getDate()}일 (${DAYS[d.getDay()]}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function nextHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toInput(d);
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  /* data */
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);

  /* view */
  const [view, setView] = useState<"month" | "list">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  /* selection */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* new event modal */
  const [showEventModal, setShowEventModal] = useState(false);
  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState(nextHour());
  const [evCalId, setEvCalId] = useState("");
  const [evSaving, setEvSaving] = useState(false);

  /* new calendar modal */
  const [showCalModal, setShowCalModal] = useState(false);
  const [calName, setCalName] = useState("");
  const [calColor, setCalColor] = useState(CAL_COLORS[1].db);
  const [calSaving, setCalSaving] = useState(false);

  /* event detail */
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* menus */
  const [showUserMenu, setShowUserMenu] = useState(false);

  /* auth redirect */
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  /* load data */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events");
      if (!res.ok) return;
      const data = (await res.json()) as { user?: AuthUser; calendars?: Calendar[] };
      setViewer(data.user ?? null);
      const cals = data.calendars ?? [];
      setCalendars(cals);
      if (!evCalId && cals[0]) setEvCalId(cals[0].id);
    } finally {
      setLoading(false);
    }
  }, [evCalId]);

  useEffect(() => {
    if (status === "authenticated") void load();
  }, [status, load]);

  /* derived */
  const visibleEvents = useMemo<FlatEvent[]>(() =>
    calendars
      .filter(c => !hiddenIds.has(c.id))
      .flatMap(c => c.events.map(e => ({ ...e, calendarId: c.id, calendarName: c.name, calendarColor: c.color })))
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [calendars, hiddenIds]);

  const selected = useMemo(() =>
    selectedId ? visibleEvents.find(e => e.id === selectedId) ?? null : null,
    [visibleEvents, selectedId]);

  const selectedCal = selected ? calendars.find(c => c.id === selected.calendarId) ?? null : null;

  const canEdit: boolean = !!viewer && !!selected && (
    viewer.role === "OWNER" || selected.createdById === viewer.id ||
    (selectedCal?.members.some(m => m.user.id === viewer.id && (m.role === "OWNER" || m.role === "EDITOR")) ?? false)
  );

  /* actions */
  async function createEvent() {
    if (!evTitle.trim()) return;
    const calId = evCalId || calendars[0]?.id;
    if (!calId) return;
    setEvSaving(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarId: calId, title: evTitle.trim(), startAt: evDate }),
    });
    setShowEventModal(false);
    setEvTitle("");
    setEvDate(nextHour());
    await load();
    setEvSaving(false);
  }

  async function createCalendar() {
    if (!calName.trim()) return;
    setCalSaving(true);
    await fetch("/api/calendars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: calName.trim(), color: calColor }),
    });
    setShowCalModal(false);
    setCalName("");
    await load();
    setCalSaving(false);
  }

  async function saveEdit() {
    if (!selected) return;
    setSubmitting(true);
    await fetch(`/api/events/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim() || undefined, startAt: editDate || undefined }),
    });
    setEditMode(false);
    await load();
    setSubmitting(false);
  }

  async function deleteEvent() {
    if (!selected || !confirm(`"${selected.title}" 일정을 삭제할까요?`)) return;
    await fetch(`/api/events/${selected.id}`, { method: "DELETE" });
    setSelectedId(null);
    await load();
  }

  async function addComment() {
    if (!selected || !comment.trim()) return;
    setSubmitting(true);
    await fetch(`/api/events/${selected.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment.trim() }),
    });
    setComment("");
    await load();
    setSubmitting(false);
  }

  function openNewEvent(dateStr?: string) {
    setEvDate(dateStr ?? nextHour());
    setEvTitle("");
    if (calendars[0] && !evCalId) setEvCalId(calendars[0].id);
    setShowEventModal(true);
  }

  function openEvent(id: string) {
    setSelectedId(id);
    setEditMode(false);
    setComment("");
  }

  /* loading / unauth */
  if (status === "loading" || (status === "authenticated" && loading && calendars.length === 0)) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-400">불러오는 중...</p>
        </div>
      </div>
    );
  }
  if (status === "unauthenticated") return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">

      {/* ── HEADER ── */}
      <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3 shadow-sm">
        <button onClick={() => setSidebarOpen(v => !v)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href="/" className="mr-2 text-base font-extrabold text-indigo-600 tracking-tight">SyncNest</Link>

        {/* month nav */}
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[96px] text-center text-sm font-semibold text-gray-800">
            {year}년 {MONTHS[month]}
          </span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="ml-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
            오늘
          </button>
        </div>

        {/* view toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
          {(["month", "list"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === v ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
              {v === "month" ? "월간" : "목록"}
            </button>
          ))}
        </div>

        {/* create event */}
        <button onClick={() => openNewEvent()}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          일정 만들기
        </button>

        {/* user menu */}
        <div className="relative">
          <button onClick={() => setShowUserMenu(v => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 hover:bg-indigo-200">
            {viewer?.name?.charAt(0) ?? "U"}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              <div className="border-b border-gray-100 px-4 py-2.5">
                <p className="truncate text-sm font-semibold text-gray-800">{viewer?.name}</p>
                <p className="truncate text-xs text-gray-400">{viewer?.email ?? viewer?.slug}</p>
              </div>
              <button onClick={() => { setShowUserMenu(false); void signOut({ callbackUrl: "/" }); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
            <div className="flex-1 overflow-y-auto p-3">

              {/* 새 일정 */}
              <button onClick={() => openNewEvent()}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 py-2.5 text-sm font-medium text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                새 일정
              </button>

              {/* 캘린더 목록 */}
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">내 캘린더</span>
              </div>

              {calendars.length === 0 ? (
                <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-600">
                  캘린더가 없습니다. 아래에서 만들어보세요.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {calendars.map(c => {
                    const col = colOf(c.color);
                    const hidden = hiddenIds.has(c.id);
                    return (
                      <button key={c.id}
                        onClick={() => setHiddenIds(prev => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                        className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition ${hidden ? "opacity-40" : "hover:bg-gray-50"}`}>
                        <span className={`h-3 w-3 flex-shrink-0 rounded-full transition ${hidden ? "bg-gray-300" : col.dot}`} />
                        <span className="flex-1 truncate text-gray-700">{c.name}</span>
                        <span className="text-[10px] text-gray-400">{c.events.length}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 새 캘린더 추가 */}
              <button onClick={() => setShowCalModal(true)}
                className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                새 캘린더 만들기
              </button>
            </div>
          </aside>
        )}

        {/* ── MAIN ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {view === "month" ? (
            <MonthView
              year={year} month={month} today={today}
              events={visibleEvents}
              selectedId={selectedId}
              onDayClick={d => openNewEvent(d + "T10:00")}
              onEventClick={openEvent}
            />
          ) : (
            <ListView
              events={visibleEvents}
              selectedId={selectedId}
              onEventClick={openEvent}
            />
          )}
        </main>

        {/* ── EVENT DETAIL PANEL ── */}
        {selected && (
          <EventPanel
            event={selected} calendar={selectedCal} viewer={viewer} canEdit={canEdit}
            editMode={editMode} editTitle={editTitle} editDate={editDate}
            comment={comment} submitting={submitting}
            onEditStart={() => { setEditMode(true); setEditTitle(selected.title); setEditDate(toInput(new Date(selected.startAt))); }}
            onEditCancel={() => setEditMode(false)}
            onEditTitleChange={setEditTitle}
            onEditDateChange={setEditDate}
            onSave={() => void saveEdit()}
            onCommentChange={setComment}
            onAddComment={() => void addComment()}
            onDelete={() => void deleteEvent()}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* ── NEW EVENT MODAL ── */}
      {showEventModal && (
        <Modal onClose={() => setShowEventModal(false)}>
          <h2 className="mb-4 text-lg font-bold text-gray-900">새 일정 만들기</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">일정 제목 *</label>
              <input autoFocus value={evTitle}
                onChange={e => setEvTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && void createEvent()}
                placeholder="어떤 일정인가요?"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">날짜 & 시간</label>
              <input type="datetime-local" value={evDate} onChange={e => setEvDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            {calendars.length > 1 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">캘린더</label>
                <div className="space-y-1.5">
                  {calendars.map(c => {
                    const col = colOf(c.color);
                    return (
                      <button key={c.id} onClick={() => setEvCalId(c.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition ${evCalId === c.id ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <span className={`h-3 w-3 rounded-full ${col.dot}`} />
                        <span className="font-medium text-gray-800">{c.name}</span>
                        {evCalId === c.id && (
                          <svg className="ml-auto h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {calendars.length === 1 && (
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className={`h-2.5 w-2.5 rounded-full ${colOf(calendars[0].color).dot}`} />
                <span className="text-sm text-gray-600">{calendars[0].name}</span>
              </div>
            )}
            {calendars.length === 0 && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                먼저 캘린더를 만들어 주세요. 사이드바의 "새 캘린더 만들기"를 눌러보세요.
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowEventModal(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button onClick={() => void createEvent()}
              disabled={!evTitle.trim() || evSaving || calendars.length === 0}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition">
              {evSaving ? "저장 중..." : "일정 만들기"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── NEW CALENDAR MODAL ── */}
      {showCalModal && (
        <Modal onClose={() => setShowCalModal(false)}>
          <h2 className="mb-4 text-lg font-bold text-gray-900">새 캘린더 만들기</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">캘린더 이름 *</label>
              <input autoFocus value={calName} onChange={e => setCalName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && void createCalendar()}
                placeholder="예: 벨로컴퍼니 업무, 알바 근무, 친구 모임"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-500">색상 선택</label>
              <div className="flex flex-wrap gap-2.5">
                {CAL_COLORS.map(c => (
                  <button key={c.db} onClick={() => setCalColor(c.db)}
                    className={`flex flex-col items-center gap-1 rounded-xl p-2 transition ${calColor === c.db ? "bg-gray-100 ring-2 ring-offset-1 ring-indigo-400" : "hover:bg-gray-50"}`}>
                    <span className={`h-7 w-7 rounded-full ${c.dot}`} />
                    <span className="text-[10px] text-gray-500">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowCalModal(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button onClick={() => void createCalendar()}
              disabled={!calName.trim() || calSaving}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition">
              {calSaving ? "만드는 중..." : "캘린더 만들기"}
            </button>
          </div>
        </Modal>
      )}

      {showUserMenu && <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />}
    </div>
  );
}

/* ─── Modal wrapper ──────────────────────────────────────────────── */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="relative">
          <button onClick={onClose}
            className="absolute -right-1 -top-1 rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Month View ─────────────────────────────────────────────────── */
function MonthView({ year, month, today, events, selectedId, onDayClick, onEventClick }: {
  year: number; month: number; today: Date; events: FlatEvent[];
  selectedId: string | null; onDayClick: (d: string) => void; onEventClick: (id: string) => void;
}) {
  const grid = buildGrid(year, month);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));

  function eventsOn(day: number) {
    return events.filter(e => {
      const d = new Date(e.startAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const rowH = `calc((100vh - 136px) / ${rows.length})`;

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-white">
        {DAYS.map((d, i) => (
          <div key={d} className={`py-2 text-center text-xs font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>
            {d}
          </div>
        ))}
      </div>
      {/* rows */}
      <div className="flex-1">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7" style={{ height: rowH }}>
            {row.map((day, ci) => {
              const isToday = day !== null && sameDay(new Date(year, month, day), today);
              const dayEvs = day !== null ? eventsOn(day) : [];
              const dateStr = day !== null ? `${year}-${pad(month+1)}-${pad(day)}` : "";
              return (
                <div key={ci} onClick={() => day !== null && onDayClick(dateStr)}
                  className={`group cursor-pointer border-b border-r border-gray-100 p-1 transition hover:bg-indigo-50/20 ${isToday ? "bg-blue-50/30" : ""} ${ci === 0 ? "border-l border-gray-100" : ""}`}>
                  {day !== null && (
                    <>
                      <div className="flex justify-center pt-0.5">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-indigo-600 font-bold text-white" : ci === 0 ? "text-red-400" : ci === 6 ? "text-blue-400" : "text-gray-700 group-hover:text-indigo-600"}`}>
                          {day}
                        </span>
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvs.slice(0, 3).map(e => {
                          const col = colOf(e.calendarColor);
                          return (
                            <button key={e.id}
                              onClick={ev => { ev.stopPropagation(); onEventClick(e.id); }}
                              className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:opacity-80 ${col.pill} ${selectedId === e.id ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}>
                              {e.title}
                            </button>
                          );
                        })}
                        {dayEvs.length > 3 && (
                          <p className="pl-1.5 text-[10px] text-gray-400">+{dayEvs.length - 3}개 더</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── List View ──────────────────────────────────────────────────── */
function ListView({ events, selectedId, onEventClick }: {
  events: FlatEvent[]; selectedId: string | null; onEventClick: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, FlatEvent[]>();
    for (const e of events) {
      const d = new Date(e.startAt);
      const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-5xl">📅</p>
          <p className="mt-3 text-sm">일정이 없습니다.</p>
          <p className="mt-1 text-xs">위의 "일정 만들기" 버튼을 눌러 추가해보세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {grouped.map(([key, dayEvs]) => {
          const d = new Date(key + "T00:00:00");
          const isToday = sameDay(d, new Date());
          return (
            <div key={key}>
              <div className="mb-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isToday ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {d.getFullYear()}년 {MONTHS[d.getMonth()]} {d.getDate()}일 ({DAYS[d.getDay()]}){isToday ? " · 오늘" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {dayEvs.map(e => {
                  const col = colOf(e.calendarColor);
                  return (
                    <button key={e.id} onClick={() => onEventClick(e.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border bg-white p-3.5 text-left shadow-sm transition hover:shadow-md ${selectedId === e.id ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-200 hover:border-indigo-200"}`}>
                      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${col.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-gray-900">{e.title}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {new Date(e.startAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                          {" · "}
                          <span className={`rounded px-1.5 py-0.5 ${col.pill}`}>{e.calendarName}</span>
                        </p>
                      </div>
                      {e.comments.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {e.comments.length}
                        </span>
                      )}
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

/* ─── Event Detail Panel ─────────────────────────────────────────── */
function EventPanel({
  event, calendar, viewer, canEdit,
  editMode, editTitle, editDate, comment, submitting,
  onEditStart, onEditCancel, onEditTitleChange, onEditDateChange,
  onSave, onCommentChange, onAddComment, onDelete, onClose,
}: {
  event: FlatEvent; calendar: Calendar | null; viewer: AuthUser | null; canEdit: boolean;
  editMode: boolean; editTitle: string; editDate: string; comment: string; submitting: boolean;
  onEditStart: () => void; onEditCancel: () => void;
  onEditTitleChange: (v: string) => void; onEditDateChange: (v: string) => void;
  onSave: () => void; onCommentChange: (v: string) => void;
  onAddComment: () => void; onDelete: () => void; onClose: () => void;
}) {
  const col = colOf(event.calendarColor);

  return (
    <aside className="flex w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* panel header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-600">일정 상세</h2>
        <div className="flex items-center gap-1">
          {canEdit && !editMode && (
            <button onClick={onEditStart} title="수정"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {canEdit && (
            <button onClick={onDelete} title="삭제"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* event info */}
        <div className="p-4">
          {editMode ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">제목</label>
                <input autoFocus value={editTitle} onChange={e => onEditTitleChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">날짜 & 시간</label>
                <input type="datetime-local" value={editDate} onChange={e => onEditDateChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div className="flex gap-2">
                <button onClick={onEditCancel}
                  className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  취소
                </button>
                <button onClick={onSave} disabled={!editTitle.trim() || submitting}
                  className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
                  {submitting ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold leading-snug text-gray-900">{event.title}</h3>
              <p className="mt-1.5 text-xs text-gray-500">{fmtDateTime(event.startAt)}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${col.pill}`}>{event.calendarName}</span>
              </div>
              {calendar && calendar.members.length > 1 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">공유 멤버</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {calendar.members.map(m => (
                      <span key={m.user.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">
                        {m.user.name}
                        {m.role === "OWNER" && <span className="ml-1 text-indigo-500">★</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-2 text-[11px] text-gray-400">
                작성: {event.createdBy?.name ?? "알 수 없음"}
              </p>
            </>
          )}
        </div>

        {/* comments */}
        <div className="border-t border-gray-100 p-4">
          <p className="mb-3 text-xs font-semibold text-gray-500">댓글 {event.comments.length > 0 ? `(${event.comments.length})` : ""}</p>
          {event.comments.length === 0 ? (
            <p className="text-xs text-gray-400">첫 댓글을 남겨보세요.</p>
          ) : (
            <div className="space-y-2.5">
              {event.comments.map(c => (
                <div key={c.id} className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-semibold text-gray-500">
                    {c.author.name}
                    <span className="ml-1.5 font-normal text-gray-400">
                      {new Date(c.createdAt).toLocaleString("ko-KR", { hour12: false, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-gray-700">{c.content}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <input value={comment} onChange={e => onCommentChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && onAddComment()}
              placeholder="댓글 입력..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            <button onClick={onAddComment} disabled={!comment.trim() || submitting}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>

        {/* activity log */}
        {event.activities.length > 0 && (
          <div className="border-t border-gray-100 p-4">
            <p className="mb-3 text-xs font-semibold text-gray-500">활동 로그</p>
            <div className="space-y-2">
              {[...event.activities].reverse().map(a => (
                <div key={a.id} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300" />
                  <div>
                    <span className="text-[11px] font-semibold text-gray-600">{a.actor.name}</span>
                    <span className="text-[11px] text-gray-400"> · {a.action}</span>
                    <p className="text-[10px] text-gray-300">
                      {new Date(a.createdAt).toLocaleString("ko-KR", { hour12: false })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
