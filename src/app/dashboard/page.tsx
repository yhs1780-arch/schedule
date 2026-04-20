"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────────── */
type AuthUser = { id: string; slug: string; name: string; email?: string; image?: string; role: string };
type CalendarMember = { role: string; user: { id: string; slug: string; name: string; role: string } };
type EventComment = { id: string; content: string; createdAt: string; author: { id: string; name: string } };
type EventActivity = { id: string; action: string; createdAt: string; actor: { id: string; name: string } };
type EventItem = {
  id: string;
  title: string;
  startAt: string;
  calendarId: string;
  createdById: string;
  createdBy?: { id: string; name: string };
  externalGoogleEventId?: string | null;
  comments: EventComment[];
  activities: EventActivity[];
};
type Calendar = {
  id: string;
  key: string;
  name: string;
  color: string;
  members: CalendarMember[];
  events: EventItem[];
};
type FlatEvent = EventItem & { calendarName: string; calendarColor: string };

/* ─── Color helpers ──────────────────────────────────────────────── */
const COLOR_MAP: Record<string, { pill: string; dot: string }> = {
  "bg-sky-500/20 text-sky-300": { pill: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  "bg-violet-500/20 text-violet-300": { pill: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  "bg-emerald-500/20 text-emerald-300": { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  "bg-amber-500/20 text-amber-300": { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  "bg-rose-500/20 text-rose-300": { pill: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  "bg-blue-500/20 text-blue-300": { pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  "bg-indigo-500/20 text-indigo-300": { pill: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
};
function getColor(dbColor: string) {
  return COLOR_MAP[dbColor] ?? { pill: "bg-gray-100 text-gray-700", dot: "bg-gray-400" };
}
function getDotColor(dbColor: string) {
  return getColor(dbColor).dot;
}

/* ─── Date helpers ───────────────────────────────────────────────── */
const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KO = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDay + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${MONTHS_KO[d.getMonth()]} ${d.getDate()}일 (${DAYS_KO[d.getDay()]}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toLocalDatetimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ─── Main Dashboard ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  // Data
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View
  const [view, setView] = useState<"month" | "list">("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Selection
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<Set<string>>(new Set());

  // New event modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(toLocalDatetimeInput(new Date()));
  const [newCalendarId, setNewCalendarId] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // User menu
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ── Redirect if not auth ──
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events");
      const data = (await res.json()) as { user?: AuthUser; calendars?: Calendar[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "데이터를 불러오지 못했습니다.");
        return;
      }
      setViewer(data.user ?? null);
      setCalendars(data.calendars ?? []);
      if (!newCalendarId && data.calendars?.[0]) {
        setNewCalendarId(data.calendars[0].id);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [newCalendarId]);

  useEffect(() => {
    if (status === "authenticated") void loadData();
  }, [status, loadData]);

  // ── Derived data ──
  const allEvents = useMemo<FlatEvent[]>(() => {
    return calendars
      .filter((c) => !hiddenCalendarIds.has(c.id))
      .flatMap((c) =>
        c.events.map((e) => ({
          ...e,
          calendarId: c.id,
          calendarName: c.name,
          calendarColor: c.color,
        })),
      )
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [calendars, hiddenCalendarIds]);

  const selectedEvent = useMemo(
    () => (selectedEventId ? allEvents.find((e) => e.id === selectedEventId) ?? null : null),
    [allEvents, selectedEventId],
  );

  const selectedCalendar = selectedEvent
    ? calendars.find((c) => c.id === selectedEvent.calendarId) ?? null
    : null;

  const canEdit =
    !!viewer &&
    !!selectedEvent &&
    (viewer.role === "OWNER" ||
      selectedEvent.createdById === viewer.id ||
      selectedCalendar?.members.some(
        (m) => m.user.id === viewer.id && (m.role === "OWNER" || m.role === "EDITOR"),
      ) === true);

  // ── Actions ──
  async function createEvent() {
    if (!newTitle.trim() || !newCalendarId || !newDate) return;
    setSaving(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarId: newCalendarId, title: newTitle.trim(), startAt: newDate }),
    });
    setShowNewModal(false);
    setNewTitle("");
    await loadData();
    setSaving(false);
  }

  async function saveEdit() {
    if (!selectedEvent || !editTitle.trim()) return;
    setSubmitting(true);
    await fetch(`/api/events/${selectedEvent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), startAt: editDate || undefined }),
    });
    setEditMode(false);
    await loadData();
    setSubmitting(false);
  }

  async function deleteEvent() {
    if (!selectedEvent || !confirm(`"${selectedEvent.title}" 일정을 삭제할까요?`)) return;
    await fetch(`/api/events/${selectedEvent.id}`, { method: "DELETE" });
    setSelectedEventId(null);
    await loadData();
  }

  async function addComment() {
    if (!selectedEvent || !newComment.trim()) return;
    setSubmitting(true);
    await fetch(`/api/events/${selectedEvent.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment.trim() }),
    });
    setNewComment("");
    await loadData();
    setSubmitting(false);
  }

  async function importGoogle() {
    await fetch("/api/google/import", { method: "POST" });
    await loadData();
  }

  function openNewEvent(dateStr?: string) {
    setNewDate(dateStr ?? toLocalDatetimeInput(new Date()));
    setShowNewModal(true);
  }

  function openEvent(id: string) {
    setSelectedEventId(id);
    setEditMode(false);
    setEditTitle("");
    setEditDate("");
    setNewComment("");
  }

  function toggleCalendar(id: string) {
    setHiddenCalendarIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Render states ──
  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* ── Header ── */}
      <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 shadow-sm">
        {/* Logo + sidebar toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="text-lg font-extrabold text-indigo-600 tracking-tight">
            SyncNest
          </Link>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[100px] text-center text-sm font-semibold text-gray-800">
            {year}년 {MONTHS_KO[month]}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="ml-1 rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            오늘
          </button>
        </div>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => setView("month")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              view === "month" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            월간
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              view === "list" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            목록
          </button>
        </div>

        {/* New event button */}
        <button
          onClick={() => openNewEvent()}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          일정 만들기
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 hover:bg-indigo-200 transition"
          >
            {viewer?.name?.charAt(0) ?? "U"}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="text-sm font-semibold text-gray-800 truncate">{viewer?.name}</p>
                <p className="text-xs text-gray-400 truncate">{viewer?.email ?? viewer?.slug}</p>
              </div>
              <button
                onClick={() => void importGoogle()}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Google 일정 가져오기
              </button>
              <button
                onClick={() => { setShowUserMenu(false); void signOut({ callbackUrl: "/" }); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
            <div className="flex-1 overflow-y-auto p-4">
              <button
                onClick={() => openNewEvent()}
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 py-2.5 text-sm font-medium text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                새 일정
              </button>

              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                내 캘린더
              </p>
              <div className="space-y-0.5">
                {calendars.map((c) => {
                  const { dot } = getColor(c.color);
                  const hidden = hiddenCalendarIds.has(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCalendar(c.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition ${
                        hidden ? "opacity-40" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className={`h-3 w-3 flex-shrink-0 rounded-full ${hidden ? "bg-gray-300" : dot}`} />
                      <span className="truncate text-gray-700">{c.name}</span>
                      <span className="ml-auto text-[10px] text-gray-400">{c.events.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="m-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600">{error}</div>
            )}
          </aside>
        )}

        {/* ── Main Content ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {view === "month" ? (
            <MonthView
              year={year}
              month={month}
              today={today}
              events={allEvents}
              onDayClick={(dateStr) => openNewEvent(dateStr + "T10:00")}
              onEventClick={openEvent}
              selectedEventId={selectedEventId}
            />
          ) : (
            <ListView
              events={allEvents}
              onEventClick={openEvent}
              selectedEventId={selectedEventId}
            />
          )}
        </main>

        {/* ── Event Detail Panel ── */}
        {selectedEvent && (
          <EventDetailPanel
            event={selectedEvent}
            calendar={selectedCalendar}
            viewer={viewer}
            canEdit={canEdit}
            editMode={editMode}
            editTitle={editTitle}
            editDate={editDate}
            newComment={newComment}
            submitting={submitting}
            onEditStart={() => { setEditMode(true); setEditTitle(selectedEvent.title); setEditDate(toLocalDatetimeInput(new Date(selectedEvent.startAt))); }}
            onEditCancel={() => setEditMode(false)}
            onEditTitleChange={setEditTitle}
            onEditDateChange={setEditDate}
            onSaveEdit={() => void saveEdit()}
            onCommentChange={setNewComment}
            onAddComment={() => void addComment()}
            onDelete={() => void deleteEvent()}
            onClose={() => setSelectedEventId(null)}
          />
        )}
      </div>

      {/* ── New Event Modal ── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">새 일정 만들기</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">일정 제목 *</label>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void createEvent()}
                  placeholder="어떤 일정인가요?"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">날짜 & 시간 *</label>
                <input
                  type="datetime-local"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">캘린더 *</label>
                <select
                  value={newCalendarId}
                  onChange={(e) => setNewCalendarId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => void createEvent()}
                disabled={!newTitle.trim() || saving}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition"
              >
                {saving ? "저장 중..." : "일정 만들기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-outside to close user menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
    </div>
  );
}

/* ─── Month View ─────────────────────────────────────────────────── */
function MonthView({
  year, month, today, events, onDayClick, onEventClick, selectedEventId,
}: {
  year: number;
  month: number;
  today: Date;
  events: FlatEvent[];
  onDayClick: (dateStr: string) => void;
  onEventClick: (id: string) => void;
  selectedEventId: string | null;
}) {
  const grid = buildMonthGrid(year, month);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));

  const getEventsForDay = (day: number): FlatEvent[] => {
    return events.filter((e) => {
      const d = new Date(e.startAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-white">
        {DAYS_KO.map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center text-xs font-semibold ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar rows */}
      <div className="flex-1">
        {rows.map((row, ri) => (
          <div key={ri} className="grid h-full grid-cols-7" style={{ minHeight: "calc((100vh - 160px) / " + rows.length + ")" }}>
            {row.map((day, ci) => {
              const isToday = day !== null && isSameDay(new Date(year, month, day), today);
              const dayEvents = day !== null ? getEventsForDay(day) : [];
              const dateStr = day !== null ? `${year}-${pad(month + 1)}-${pad(day)}` : "";

              return (
                <div
                  key={ci}
                  onClick={() => day !== null && onDayClick(dateStr)}
                  className={`group cursor-pointer border-b border-r border-gray-100 p-1 transition hover:bg-indigo-50/30 ${
                    ci === 0 ? "border-l border-gray-100" : ""
                  } ${isToday ? "bg-indigo-50/20" : ""}`}
                >
                  {day !== null && (
                    <>
                      <div className="flex justify-center pt-0.5">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            isToday
                              ? "bg-indigo-600 text-white font-bold"
                              : ci === 0
                              ? "text-red-400"
                              : ci === 6
                              ? "text-blue-400"
                              : "text-gray-700 group-hover:text-indigo-700"
                          }`}
                        >
                          {day}
                        </span>
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 3).map((e) => {
                          const { pill } = getColor(e.calendarColor);
                          return (
                            <button
                              key={e.id}
                              onClick={(ev) => { ev.stopPropagation(); onEventClick(e.id); }}
                              className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:opacity-80 ${pill} ${
                                selectedEventId === e.id ? "ring-2 ring-indigo-400 ring-offset-1" : ""
                              }`}
                            >
                              {e.title}
                            </button>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <p className="pl-1.5 text-[10px] text-gray-400">+{dayEvents.length - 3}개 더</p>
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
function ListView({
  events, onEventClick, selectedEventId,
}: {
  events: FlatEvent[];
  onEventClick: (id: string) => void;
  selectedEventId: string | null;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, FlatEvent[]>();
    for (const e of events) {
      const d = new Date(e.startAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-4xl">📅</p>
          <p className="mt-3 text-sm">표시할 일정이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {grouped.map(([dateKey, dayEvents]) => {
          const d = new Date(dateKey + "T00:00:00");
          const today = new Date();
          const isToday = isSameDay(d, today);
          return (
            <div key={dateKey}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isToday
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {d.getFullYear()}년 {MONTHS_KO[d.getMonth()]} {d.getDate()}일 ({DAYS_KO[d.getDay()]})
                  {isToday && " · 오늘"}
                </span>
              </div>
              <div className="space-y-2">
                {dayEvents.map((e) => {
                  const { pill, dot } = getColor(e.calendarColor);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onEventClick(e.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border bg-white p-3.5 text-left shadow-sm transition hover:shadow-md ${
                        selectedEventId === e.id
                          ? "border-indigo-400 ring-2 ring-indigo-100"
                          : "border-gray-200 hover:border-indigo-200"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-gray-900">{e.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(e.startAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                          {" · "}
                          <span className={`inline rounded px-1.5 py-0.5 ${pill}`}>{e.calendarName}</span>
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
function EventDetailPanel({
  event, calendar, viewer, canEdit,
  editMode, editTitle, editDate, newComment, submitting,
  onEditStart, onEditCancel, onEditTitleChange, onEditDateChange,
  onSaveEdit, onCommentChange, onAddComment, onDelete, onClose,
}: {
  event: FlatEvent;
  calendar: Calendar | null;
  viewer: AuthUser | null;
  canEdit: boolean;
  editMode: boolean;
  editTitle: string;
  editDate: string;
  newComment: string;
  submitting: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditTitleChange: (v: string) => void;
  onEditDateChange: (v: string) => void;
  onSaveEdit: () => void;
  onCommentChange: (v: string) => void;
  onAddComment: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { pill, dot } = getColor(event.calendarColor);

  return (
    <aside className="flex w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700">일정 상세</h2>
        <div className="flex items-center gap-1">
          {canEdit && !editMode && (
            <button
              onClick={onEditStart}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="수정"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {canEdit && (
            <button
              onClick={onDelete}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="삭제"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Event info */}
        <div className="p-4">
          {editMode ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">제목</label>
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => onEditTitleChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">날짜 & 시간</label>
                <input
                  type="datetime-local"
                  value={editDate}
                  onChange={(e) => onEditDateChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onEditCancel}
                  className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={onSaveEdit}
                  disabled={!editTitle.trim() || submitting}
                  className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  {submitting ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold leading-snug text-gray-900">{event.title}</h3>
              <p className="mt-2 text-xs text-gray-500">{fmtDate(event.startAt)}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${pill}`}>
                  {event.calendarName}
                </span>
              </div>
              {calendar && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">참여자</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {calendar.members.map((m) => (
                      <span key={m.user.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">
                        {m.user.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {event.externalGoogleEventId && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-400">
                  <svg className="h-3.5 w-3.5 text-blue-400" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google Calendar 연동됨
                </div>
              )}
            </>
          )}
        </div>

        {/* Comments */}
        <div className="border-t border-gray-100 p-4">
          <p className="mb-3 text-xs font-semibold text-gray-500">
            댓글 {event.comments.length > 0 ? `(${event.comments.length})` : ""}
          </p>
          {event.comments.length === 0 ? (
            <p className="text-xs text-gray-400">첫 댓글을 남겨보세요.</p>
          ) : (
            <div className="space-y-2.5">
              {event.comments.map((c) => (
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
            <input
              value={newComment}
              onChange={(e) => onCommentChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onAddComment()}
              placeholder="댓글 입력..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={onAddComment}
              disabled={!newComment.trim() || submitting}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Activity Log */}
        {event.activities.length > 0 && (
          <div className="border-t border-gray-100 p-4">
            <p className="mb-3 text-xs font-semibold text-gray-500">활동 로그</p>
            <div className="space-y-2">
              {[...event.activities].reverse().map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300" />
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
