"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────────── */
type AuthUser = { id: string; slug: string; name: string; email?: string; image?: string; role: string };
type CalendarMember = { role: string; user: { id: string; slug: string; name: string; role: string; email?: string } };
type EventComment = { id: string; content: string; createdAt: string; author: { id: string; name: string } };
type EventActivity = { id: string; action: string; createdAt: string; actor: { id: string; name: string } };
type EventItem = {
  id: string; title: string; startAt: string; endAt?: string | null;
  allDay?: boolean; location?: string | null; description?: string | null;
  calendarId: string; createdById: string; createdBy?: { id: string; name: string };
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
function colOf(dbColor: string) { return CAL_COLORS.find(c => c.db === dbColor) ?? CAL_COLORS[0]; }

/* ─── KST 날짜/시간 헬퍼 ─────────────────────────────────────────── */
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function pad(n: number) { return String(n).padStart(2, "0"); }

// 브라우저 로컬타임(KST)으로 date/time 입력 → UTC ISO
function toUTCIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}
function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function nowTimeStr() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return `${pad(d.getHours())}:00`;
}
// UTC ISO → 브라우저 로컬(KST) 날짜 문자열
function isoToLocalDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function isoToLocalTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${MONTHS[d.getMonth()]} ${d.getDate()}일 (${DAYS[d.getDay()]})`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function buildGrid(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const last = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((first + last) / 7) * 7;
  const arr = Array.from({ length: total }, (_, i) => { const d = i - first + 1; return d >= 1 && d <= last ? d : null; });
  const rows: (number | null)[][] = [];
  for (let i = 0; i < arr.length; i += 7) rows.push(arr.slice(i, i + 7));
  return rows;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ─── Multi-day bars ─────────────────────────────────────────────── */
type MultiDayBar = { id: string; eventId: string; title: string; calColor: string; startCol: number; endCol: number; isContinued: boolean };
function buildMultiDayBars(row: (number | null)[], year: number, month: number, events: FlatEvent[]): MultiDayBar[] {
  const validDays = row.filter((d): d is number => d !== null);
  if (!validDays.length) return [];
  const rowStart = new Date(year, month, validDays[0], 0, 0, 0);
  const rowEnd = new Date(year, month, validDays[validDays.length - 1], 23, 59, 59);
  const bars: MultiDayBar[] = [];
  for (const e of events) {
    if (!e.endAt) continue;
    const eStart = new Date(e.startAt); eStart.setHours(0, 0, 0);
    const eEnd = new Date(e.endAt); eEnd.setHours(23, 59, 59);
    if (sameDay(eStart, eEnd)) continue;
    if (eStart > rowEnd || eEnd < rowStart) continue;
    const clippedStart = eStart < rowStart ? rowStart : eStart;
    const clippedEnd = eEnd > rowEnd ? rowEnd : eEnd;
    let startCol = -1, endCol = -1;
    row.forEach((day, ci) => {
      if (day === null) return;
      const cell = new Date(year, month, day);
      if (sameDay(cell, clippedStart)) startCol = ci;
      if (sameDay(cell, clippedEnd)) endCol = ci;
    });
    if (startCol === -1) startCol = row.findIndex(d => d !== null);
    if (endCol === -1) endCol = row.map((d, i) => d !== null ? i : -1).filter(i => i !== -1).at(-1) ?? 6;
    if (startCol === -1 || endCol === -1) continue;
    bars.push({ id: `${e.id}-r${startCol}`, eventId: e.id, title: e.title, calColor: e.calendarColor, startCol, endCol, isContinued: eStart < rowStart });
  }
  return bars.slice(0, 3);
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "list">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  /* ── new event ── */
  const [showEventModal, setShowEventModal] = useState(false);
  const [evTitle, setEvTitle] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evDescription, setEvDescription] = useState("");
  const [evAllDay, setEvAllDay] = useState(false);
  const [evStartDate, setEvStartDate] = useState(todayDateStr());
  const [evStartTime, setEvStartTime] = useState(nowTimeStr());
  const [evHasEnd, setEvHasEnd] = useState(false);
  const [evEndDate, setEvEndDate] = useState(todayDateStr());
  const [evEndTime, setEvEndTime] = useState(() => { const h = parseInt(nowTimeStr()) + 1; return `${pad(h < 24 ? h : 23)}:00`; });
  const [evCalId, setEvCalId] = useState("");

  /* ── new calendar ── */
  const [showCalModal, setShowCalModal] = useState(false);
  const [calName, setCalName] = useState("");
  const [calColor, setCalColor] = useState(CAL_COLORS[1].db);

  /* ── share modal ── */
  const [shareCalId, setShareCalId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  /* ── event detail ── */
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAllDay, setEditAllDay] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [importingGoogle, setImportingGoogle] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.replace("/login"); }, [status, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) return;
      const data = (await res.json()) as { user?: AuthUser; calendars?: Calendar[] };
      setViewer(data.user ?? null);
      const cals = data.calendars ?? [];
      setCalendars(cals);
      if (!evCalId && cals[0]) setEvCalId(cals[0].id);
    } finally { setLoading(false); }
  }, [evCalId]);

  useEffect(() => { if (status === "authenticated") void load(); }, [status, load]);

  /* ── derived ── */
  const visibleEvents = useMemo<FlatEvent[]>(() =>
    calendars.filter(c => !hiddenIds.has(c.id))
      .flatMap(c => c.events.map(e => ({ ...e, calendarId: c.id, calendarName: c.name, calendarColor: c.color })))
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [calendars, hiddenIds]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleEvents;
    return visibleEvents.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    );
  }, [visibleEvents, searchQuery]);

  const selected = useMemo(() => selectedId ? visibleEvents.find(e => e.id === selectedId) ?? null : null, [visibleEvents, selectedId]);
  const selectedCal = selected ? calendars.find(c => c.id === selected.calendarId) ?? null : null;
  const canEdit: boolean = !!viewer && !!selected && (
    viewer.role === "OWNER" || selected.createdById === viewer.id ||
    (selectedCal?.members.some(m => m.user.id === viewer.id && (m.role === "OWNER" || m.role === "EDITOR")) ?? false)
  );
  const shareCal = shareCalId ? calendars.find(c => c.id === shareCalId) ?? null : null;
  const recentEvents = useMemo(() => {
    const seen = new Set<string>();
    return visibleEvents.filter(e => { if (seen.has(e.title)) return false; seen.add(e.title); return true; })
      .filter(e => e.createdById === viewer?.id).slice(-5).reverse();
  }, [visibleEvents, viewer]);

  const todayCount = useMemo(() => {
    const today = new Date();
    return filteredEvents.filter(e => sameDay(new Date(e.startAt), today)).length;
  }, [filteredEvents]);

  /* ── actions ── */
  function resetEventForm() {
    setEvTitle(""); setEvLocation(""); setEvDescription("");
    setEvAllDay(false); setEvHasEnd(false);
    setEvStartDate(todayDateStr()); setEvStartTime(nowTimeStr());
    setEvEndDate(todayDateStr());
    const h = parseInt(nowTimeStr()) + 1;
    setEvEndTime(`${pad(h < 24 ? h : 23)}:00`);
  }

  async function createEvent() {
    const title = evTitle.trim();
    const calId = evCalId || calendars[0]?.id;
    if (!title || !calId) return;

    // ── KST 입력 → UTC ISO 변환 ──
    const startAt = evAllDay
      ? new Date(`${evStartDate}T00:00:00`).toISOString()
      : toUTCIso(evStartDate, evStartTime);
    const endAt = evHasEnd
      ? (evAllDay ? new Date(`${evEndDate}T23:59:59`).toISOString() : toUTCIso(evEndDate, evEndTime))
      : null;

    const tempId = `_tmp_${Date.now()}`;
    const tempEvent: EventItem = {
      id: tempId, title, startAt, endAt, allDay: evAllDay,
      location: evLocation.trim() || null, description: evDescription.trim() || null,
      calendarId: calId, createdById: viewer?.id ?? "", externalGoogleEventId: null,
      comments: [], activities: [],
    };
    setShowEventModal(false);
    resetEventForm();
    setCalendars(prev => prev.map(c => c.id === calId ? { ...c, events: [...c.events, tempEvent] } : c));

    try {
      await fetch("/api/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: calId, title, startAt, endAt, allDay: evAllDay, location: evLocation.trim() || undefined, description: evDescription.trim() || undefined }),
      });
    } catch {
      setCalendars(prev => prev.map(c => ({ ...c, events: c.events.filter(e => e.id !== tempId) })));
    }
    void load();
  }

  async function createCalendar() {
    if (!calName.trim()) return;
    const name = calName.trim(); const color = calColor;
    const tempId = `_tmp_cal_${Date.now()}`;
    const tempCal: Calendar = { id: tempId, key: tempId, name, color, members: [{ role: "OWNER", user: { id: viewer?.id ?? "", slug: "", name: viewer?.name ?? "", role: "MEMBER" } }], events: [] };
    setShowCalModal(false); setCalName("");
    setCalendars(prev => [...prev, tempCal]);
    setEvCalId(tempId);
    await fetch("/api/calendars", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color }) });
    void load();
  }

  async function inviteMember() {
    if (!shareCalId || !inviteEmail.trim()) return;
    setInviting(true); setInviteMsg(null);
    const res = await fetch(`/api/calendars/${shareCalId}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; member?: CalendarMember };
    if (res.ok && data.ok) {
      setInviteMsg({ ok: true, text: `${inviteEmail} 님이 추가되었습니다.` });
      setInviteEmail("");
      setCalendars(prev => prev.map(c => c.id === shareCalId && data.member ? { ...c, members: [...c.members, data.member] } : c));
    } else {
      setInviteMsg({ ok: false, text: data.error ?? "초대에 실패했습니다." });
    }
    setInviting(false);
  }

  async function removeMember(calId: string, userId: string) {
    await fetch(`/api/calendars/${calId}/members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    setCalendars(prev => prev.map(c => c.id === calId ? { ...c, members: c.members.filter(m => m.user.id !== userId) } : c));
    void load();
  }

  async function saveEdit() {
    if (!selected) return;
    setSubmitting(true);
    const startAt = editAllDay ? new Date(`${editStartDate}T00:00:00`).toISOString() : toUTCIso(editStartDate, editStartTime);
    const endAt = editEndDate ? (editAllDay ? new Date(`${editEndDate}T23:59:59`).toISOString() : toUTCIso(editEndDate, editEndTime)) : null;
    await fetch(`/api/events/${selected.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim() || undefined, startAt, endAt, allDay: editAllDay, location: editLocation.trim() || null, description: editDescription.trim() || null }),
    });
    setEditMode(false);
    await load();
    setSubmitting(false);
  }

  async function deleteEvent() {
    if (!selected || !confirm(`"${selected.title}" 일정을 삭제할까요?`)) return;
    setCalendars(prev => prev.map(c => ({ ...c, events: c.events.filter(e => e.id !== selected.id) })));
    setSelectedId(null);
    fetch(`/api/events/${selected.id}`, { method: "DELETE" });
    void load();
  }

  async function addComment() {
    if (!selected || !comment.trim()) return;
    setSubmitting(true);
    await fetch(`/api/events/${selected.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment.trim() }) });
    setComment("");
    await load();
    setSubmitting(false);
  }

  async function importGoogleEvents() {
    setImportingGoogle(true);
    setShowUserMenu(false);
    try {
      const res = await fetch("/api/google/import", { method: "POST" });
      const data = (await res.json()) as { imported?: number; error?: string };
      if (res.ok) {
        alert(`Google Calendar에서 ${data.imported ?? 0}개의 일정을 가져왔습니다.`);
        void load();
      } else {
        alert(data.error ?? "Google Calendar 연동에 실패했습니다.\nGoogle 계정으로 로그인 후 다시 시도해주세요.");
      }
    } finally { setImportingGoogle(false); }
  }

  function openNewEvent(dateStr?: string) {
    const date = dateStr ?? todayDateStr();
    setEvStartDate(date); setEvEndDate(date);
    setEvTitle(""); setEvLocation(""); setEvDescription("");
    setEvAllDay(false); setEvHasEnd(false);
    if (calendars[0] && !evCalId) setEvCalId(calendars[0].id);
    setShowEventModal(true);
  }

  function openEvent(id: string) { setSelectedId(id); setEditMode(false); setComment(""); }

  function startEdit(e: FlatEvent) {
    setEditMode(true); setEditTitle(e.title); setEditAllDay(e.allDay ?? false);
    setEditStartDate(isoToLocalDate(e.startAt)); setEditStartTime(isoToLocalTime(e.startAt));
    setEditEndDate(e.endAt ? isoToLocalDate(e.endAt) : ""); setEditEndTime(e.endAt ? isoToLocalTime(e.endAt) : "");
    setEditLocation(e.location ?? ""); setEditDescription(e.description ?? "");
  }

  /* ── render ── */
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

      {/* ─── HEADER ─── */}
      <header className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 shadow-sm">
        <button onClick={() => setSidebarOpen(v => !v)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <Link href="/" className="mr-1 text-base font-extrabold text-indigo-600 tracking-tight">SyncNest</Link>

        {/* month nav */}
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="min-w-[96px] text-center text-sm font-semibold text-gray-800">{year}년 {MONTHS[month]}</span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="ml-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">오늘</button>
          {todayCount > 0 && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">오늘 {todayCount}개</span>}
        </div>

        {/* search */}
        <div className="ml-auto flex items-center gap-1">
          {showSearch ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 ring-2 ring-indigo-100">
              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Escape" && (setShowSearch(false), setSearchQuery(""))}
                placeholder="일정 검색..."
                className="w-40 text-sm outline-none" />
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-gray-400 hover:text-gray-600">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ) : (
            <button onClick={() => setShowSearch(true)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          )}
        </div>

        {/* view toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 p-0.5">
          {(["month", "list"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === v ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
              {v === "month" ? "월간" : "목록"}
            </button>
          ))}
        </div>

        <button onClick={() => openNewEvent()}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          일정 만들기
        </button>

        {/* user menu */}
        <div className="relative">
          <button onClick={() => setShowUserMenu(v => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 hover:bg-indigo-200">
            {viewer?.name?.charAt(0) ?? "U"}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              <div className="border-b border-gray-100 px-4 py-2.5">
                <p className="truncate text-sm font-semibold text-gray-800">{viewer?.name}</p>
                <p className="truncate text-xs text-gray-400">{viewer?.email ?? viewer?.slug}</p>
              </div>
              <button onClick={() => void importGoogleEvents()} disabled={importingGoogle}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {importingGoogle ? "가져오는 중..." : "Google 일정 가져오기"}
              </button>
              <button onClick={() => { setShowUserMenu(false); void signOut({ callbackUrl: "/" }); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─── BODY ─── */}
      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR */}
        {sidebarOpen && (
          <aside className="flex w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
            <div className="flex-1 overflow-y-auto p-3">
              <button onClick={() => openNewEvent()}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 py-2.5 text-sm font-medium text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                새 일정
              </button>

              <div className="mb-1 px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">내 캘린더</span>
              </div>

              {calendars.length === 0 ? (
                <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-600">캘린더가 없습니다.</p>
              ) : (
                <div className="space-y-0.5">
                  {calendars.map(c => {
                    const col = colOf(c.color);
                    const hidden = hiddenIds.has(c.id);
                    const isOwner = c.members.some(m => m.user.id === viewer?.id && m.role === "OWNER");
                    return (
                      <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition ${hidden ? "opacity-40" : "hover:bg-gray-50"}`}>
                        <button onClick={() => setHiddenIds(prev => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                          className="flex flex-1 items-center gap-2 min-w-0">
                          <span className={`h-3 w-3 flex-shrink-0 rounded-full ${hidden ? "bg-gray-300" : col.dot}`} />
                          <span className="flex-1 truncate text-sm text-gray-700">{c.name}</span>
                          <span className="text-[10px] text-gray-400">{c.events.length}</span>
                        </button>
                        {isOwner && (
                          <button onClick={() => { setShareCalId(c.id); setInviteEmail(""); setInviteMsg(null); }}
                            title="멤버 관리"
                            className="flex-shrink-0 rounded p-0.5 text-gray-300 hover:bg-indigo-50 hover:text-indigo-500 transition opacity-0 group-hover:opacity-100">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button onClick={() => setShowCalModal(true)}
                className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                새 캘린더 만들기
              </button>
            </div>
          </aside>
        )}

        {/* MAIN */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {searchQuery && (
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
              <span className="font-semibold">"{searchQuery}"</span> 검색 결과: {filteredEvents.length}개
              <button onClick={() => setSearchQuery("")} className="ml-2 underline hover:no-underline">초기화</button>
            </div>
          )}
          {view === "month" ? (
            <MonthView year={year} month={month} today={today} events={filteredEvents}
              selectedId={selectedId} onDayClick={d => openNewEvent(d)} onEventClick={openEvent} />
          ) : (
            <ListView events={filteredEvents} selectedId={selectedId} onEventClick={openEvent} />
          )}
        </main>

        {/* DETAIL PANEL */}
        {selected && (
          <EventPanel
            event={selected} calendar={selectedCal} viewer={viewer} canEdit={canEdit}
            editMode={editMode} editTitle={editTitle} editAllDay={editAllDay}
            editStartDate={editStartDate} editStartTime={editStartTime}
            editEndDate={editEndDate} editEndTime={editEndTime}
            editLocation={editLocation} editDescription={editDescription}
            comment={comment} submitting={submitting}
            onEditStart={() => startEdit(selected)}
            onEditCancel={() => setEditMode(false)}
            onFieldChange={{ title: setEditTitle, allDay: setEditAllDay, startDate: setEditStartDate, startTime: setEditStartTime, endDate: setEditEndDate, endTime: setEditEndTime, location: setEditLocation, description: setEditDescription }}
            onSave={() => void saveEdit()}
            onCommentChange={setComment}
            onAddComment={() => void addComment()}
            onDelete={() => void deleteEvent()}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* ─── NEW EVENT MODAL ─── */}
      {showEventModal && (
        <Modal onClose={() => setShowEventModal(false)}>
          <h2 className="mb-5 text-lg font-bold text-gray-900">새 일정 만들기</h2>
          <div className="space-y-4">
            <input autoFocus value={evTitle} onChange={e => setEvTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && void createEvent()}
              placeholder="일정 제목 *"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base font-medium outline-none placeholder:text-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />

            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-100">
              <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <input value={evLocation} onChange={e => setEvLocation(e.target.value)} placeholder="장소 (선택)"
                className="flex-1 text-sm outline-none placeholder:text-gray-300" />
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setEvAllDay(v => !v)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${evAllDay ? "bg-indigo-600" : "bg-gray-300"}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${evAllDay ? "translate-x-4" : "translate-x-0"}`} />
                </button>
                <span className="text-sm font-medium text-gray-700">하루 종일</span>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">시작</p>
                <div className="flex gap-2">
                  <input type="date" value={evStartDate}
                    onChange={e => { setEvStartDate(e.target.value); if (evEndDate < e.target.value) setEvEndDate(e.target.value); }}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                  {!evAllDay && (
                    <input type="time" value={evStartTime} onChange={e => setEvStartTime(e.target.value)}
                      className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                  )}
                </div>
              </div>
              <div>
                <button onClick={() => setEvHasEnd(v => !v)}
                  className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-700">
                  {evHasEnd ? "▾ 종료 시간" : "▸ 종료 시간 추가 (연속 일정)"}
                </button>
                {evHasEnd && (
                  <div className="flex gap-2">
                    <input type="date" value={evEndDate} min={evStartDate}
                      onChange={e => setEvEndDate(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                    {!evAllDay && (
                      <input type="time" value={evEndTime} onChange={e => setEvEndTime(e.target.value)}
                        className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {calendars.length > 1 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-400">캘린더 선택</p>
                <div className="flex flex-wrap gap-1.5">
                  {calendars.map(c => {
                    const col = colOf(c.color);
                    return (
                      <button key={c.id} onClick={() => setEvCalId(c.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${evCalId === c.id ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                        {c.name}
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

            <textarea value={evDescription} onChange={e => setEvDescription(e.target.value)}
              placeholder="메모 (선택)" rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none placeholder:text-gray-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100" />

            {recentEvents.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">최근 일정으로 빠르게 추가</p>
                <div className="flex flex-wrap gap-1.5">
                  {recentEvents.map(e => (
                    <button key={e.id}
                      onClick={() => { setEvTitle(e.title); if (e.location) setEvLocation(e.location); if (e.description) setEvDescription(e.description); }}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      {e.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowEventModal(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
            <button onClick={() => void createEvent()} disabled={!evTitle.trim() || calendars.length === 0}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
              일정 만들기
            </button>
          </div>
        </Modal>
      )}

      {/* ─── NEW CALENDAR MODAL ─── */}
      {showCalModal && (
        <Modal onClose={() => setShowCalModal(false)}>
          <h2 className="mb-4 text-lg font-bold text-gray-900">새 캘린더 만들기</h2>
          <div className="space-y-4">
            <input autoFocus value={calName} onChange={e => setCalName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && void createCalendar()}
              placeholder="캘린더 이름 (예: 팀 업무, 알바 근무, 개인)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">색상 선택</p>
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
            <p className="rounded-lg bg-indigo-50 p-2.5 text-xs text-indigo-600">
              💡 캘린더 생성 후 멤버를 초대할 수 있습니다. 초대받은 사람은 먼저 SyncNest에 로그인해야 합니다.
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setShowCalModal(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
            <button onClick={() => void createCalendar()} disabled={!calName.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
              캘린더 만들기
            </button>
          </div>
        </Modal>
      )}

      {/* ─── SHARE / MEMBER MODAL ─── */}
      {shareCalId && shareCal && (
        <Modal onClose={() => setShareCalId(null)}>
          <div className="mb-4 flex items-center gap-3">
            <span className={`h-4 w-4 rounded-full ${colOf(shareCal.color).dot}`} />
            <h2 className="text-lg font-bold text-gray-900">{shareCal.name} — 멤버 관리</h2>
          </div>

          {/* Current members */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">현재 멤버 ({shareCal.members.length}명)</p>
            <div className="space-y-2">
              {shareCal.members.map(m => (
                <div key={m.user.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {m.user.name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {m.user.name}
                      {m.user.id === viewer?.id && <span className="ml-1.5 text-[10px] text-indigo-500 font-normal">나</span>}
                    </p>
                    <p className="text-xs text-gray-400">{m.role === "OWNER" ? "소유자" : m.role === "EDITOR" ? "편집 가능" : "보기 전용"}</p>
                  </div>
                  {m.role !== "OWNER" && (
                    <button onClick={() => void removeMember(shareCalId, m.user.id)}
                      className="flex-shrink-0 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600 transition">
                      제거
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invite form */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">멤버 초대</p>
            <div className="space-y-2">
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && void inviteMember()}
                placeholder="초대할 사람의 이메일 주소"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                  <span className="text-xs text-gray-500">권한:</span>
                  {(["EDITOR", "VIEWER"] as const).map(r => (
                    <button key={r} onClick={() => setInviteRole(r)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${inviteRole === r ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                      {r === "EDITOR" ? "편집 가능" : "보기 전용"}
                    </button>
                  ))}
                </div>
                <button onClick={() => void inviteMember()} disabled={!inviteEmail.trim() || inviting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
                  {inviting ? "..." : "초대"}
                </button>
              </div>
              {inviteMsg && (
                <p className={`rounded-lg p-2.5 text-xs ${inviteMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                  {inviteMsg.text}
                </p>
              )}
              <p className="text-[11px] text-gray-400">💡 초대받은 사람은 먼저 SyncNest에 Google/네이버/카카오로 로그인해야 합니다.</p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button onClick={() => setShareCalId(null)} className="rounded-xl bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">닫기</button>
          </div>
        </Modal>
      )}

      {showUserMenu && <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />}
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────── */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <button onClick={onClose} className="absolute -right-1 -top-1 rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
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
  const rows = buildGrid(year, month);
  function eventsOn(day: number) {
    return events.filter(e => {
      const d = new Date(e.startAt);
      if (e.endAt && !sameDay(new Date(e.startAt), new Date(e.endAt))) return false; // multi-day: shown in bars
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }
  const rowH = `calc((100vh - 136px) / ${rows.length})`;
  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-white">
        {DAYS.map((d, i) => (
          <div key={d} className={`py-2 text-center text-xs font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>{d}</div>
        ))}
      </div>
      <div className="flex-1">
        {rows.map((row, ri) => {
          const bars = buildMultiDayBars(row, year, month, events);
          return (
            <div key={ri} style={{ height: rowH }} className="flex flex-col">
              {bars.length > 0 && (
                <div className="grid grid-cols-7 flex-shrink-0 px-0.5 gap-y-0.5 pt-0.5">
                  {bars.map(bar => {
                    const col = colOf(bar.calColor);
                    return (
                      <div key={bar.id} style={{ gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}` }}
                        onClick={() => onEventClick(bar.eventId)}
                        className={`cursor-pointer truncate rounded px-1.5 py-0.5 text-[10px] font-medium mx-0.5 hover:opacity-80 ${col.pill}`}>
                        {bar.isContinued ? `↩ ${bar.title}` : bar.title}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-7 flex-1">
                {row.map((day, ci) => {
                  const isToday = day !== null && sameDay(new Date(year, month, day), today);
                  const dayEvs = day !== null ? eventsOn(day) : [];
                  const dateStr = day !== null ? `${year}-${pad(month+1)}-${pad(day)}` : "";
                  return (
                    <div key={ci} onClick={() => day !== null && onDayClick(dateStr)}
                      className={`group cursor-pointer border-b border-r border-gray-100 p-1 transition hover:bg-indigo-50/20 overflow-hidden ${isToday ? "bg-blue-50/30" : ""} ${ci === 0 ? "border-l border-gray-100" : ""}`}>
                      {day !== null && (
                        <>
                          <div className="flex justify-center pt-0.5">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-indigo-600 text-white" : ci === 0 ? "text-red-400" : ci === 6 ? "text-blue-400" : "text-gray-700 group-hover:text-indigo-600"}`}>
                              {day}
                            </span>
                          </div>
                          <div className="mt-0.5 space-y-0.5">
                            {dayEvs.slice(0, 2).map(e => {
                              const col = colOf(e.calendarColor);
                              return (
                                <button key={e.id}
                                  onClick={ev => { ev.stopPropagation(); onEventClick(e.id); }}
                                  className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:opacity-80 ${col.pill} ${selectedId === e.id ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}>
                                  {e.allDay ? "● " : ""}{e.title}
                                </button>
                              );
                            })}
                            {dayEvs.length > 2 && <p className="pl-1.5 text-[10px] text-gray-400">+{dayEvs.length - 2}개</p>}
                          </div>
                        </>
                      )}
                    </div>
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

/* ─── List View ──────────────────────────────────────────────────── */
function ListView({ events, selectedId, onEventClick }: { events: FlatEvent[]; selectedId: string | null; onEventClick: (id: string) => void }) {
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
                  {fmtDate(d.toISOString())}{isToday ? " · 오늘" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {dayEvs.map(e => {
                  const col = colOf(e.calendarColor);
                  const isMulti = e.endAt && !sameDay(new Date(e.startAt), new Date(e.endAt));
                  return (
                    <button key={e.id} onClick={() => onEventClick(e.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border bg-white p-3.5 text-left shadow-sm transition hover:shadow-md ${selectedId === e.id ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-200 hover:border-indigo-200"}`}>
                      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${col.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-gray-900">{e.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                          {e.allDay ? <span>하루 종일</span> : <span>{fmtTime(e.startAt)}{e.endAt && !isMulti ? ` ~ ${fmtTime(e.endAt)}` : ""}</span>}
                          {isMulti && e.endAt && <span className="text-indigo-500">~ {fmtDate(e.endAt)}</span>}
                          <span className={`rounded px-1.5 py-0.5 ${col.pill}`}>{e.calendarName}</span>
                          {e.location && <span className="truncate max-w-[140px]">📍 {e.location}</span>}
                        </p>
                      </div>
                      {e.comments.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
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

/* ─── Event Panel ────────────────────────────────────────────────── */
type FieldChange = { title:(v:string)=>void; allDay:(v:boolean)=>void; startDate:(v:string)=>void; startTime:(v:string)=>void; endDate:(v:string)=>void; endTime:(v:string)=>void; location:(v:string)=>void; description:(v:string)=>void };
function EventPanel({ event, calendar, viewer, canEdit, editMode, editTitle, editAllDay, editStartDate, editStartTime, editEndDate, editEndTime, editLocation, editDescription, comment, submitting, onEditStart, onEditCancel, onFieldChange, onSave, onCommentChange, onAddComment, onDelete, onClose }: {
  event: FlatEvent; calendar: Calendar | null; viewer: AuthUser | null; canEdit: boolean;
  editMode: boolean; editTitle: string; editAllDay: boolean; editStartDate: string; editStartTime: string; editEndDate: string; editEndTime: string; editLocation: string; editDescription: string;
  comment: string; submitting: boolean; onEditStart: ()=>void; onEditCancel: ()=>void; onFieldChange: FieldChange;
  onSave: ()=>void; onCommentChange: (v:string)=>void; onAddComment: ()=>void; onDelete: ()=>void; onClose: ()=>void;
}) {
  const col = colOf(event.calendarColor);
  const isMulti = event.endAt && !sameDay(new Date(event.startAt), new Date(event.endAt));

  return (
    <aside className="flex w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white shadow-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-600">일정 상세</h2>
        <div className="flex items-center gap-1">
          {canEdit && !editMode && (
            <button onClick={onEditStart} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
          )}
          {canEdit && !editMode && (
            <button onClick={onDelete} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {editMode ? (
            <div className="space-y-3">
              <input autoFocus value={editTitle} onChange={e => onFieldChange.title(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => onFieldChange.allDay(!editAllDay)}
                    className={`relative inline-flex h-4 w-8 rounded-full border-2 border-transparent transition-colors ${editAllDay ? "bg-indigo-600" : "bg-gray-300"}`}>
                    <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${editAllDay ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                  <span className="text-xs text-gray-600">하루 종일</span>
                </div>
                <div className="flex gap-2">
                  <input type="date" value={editStartDate} onChange={e => onFieldChange.startDate(e.target.value)} className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                  {!editAllDay && <input type="time" value={editStartTime} onChange={e => onFieldChange.startTime(e.target.value)} className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />}
                </div>
                <div className="flex gap-2">
                  <input type="date" value={editEndDate} onChange={e => onFieldChange.endDate(e.target.value)} placeholder="종료 날짜" className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                  {!editAllDay && <input type="time" value={editEndTime} onChange={e => onFieldChange.endTime(e.target.value)} className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <input value={editLocation} onChange={e => onFieldChange.location(e.target.value)} placeholder="장소" className="flex-1 text-xs outline-none placeholder:text-gray-300" />
              </div>
              <textarea value={editDescription} onChange={e => onFieldChange.description(e.target.value)} placeholder="메모" rows={2}
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none placeholder:text-gray-300 focus:border-indigo-400" />
              <div className="flex gap-2">
                <button onClick={onEditCancel} className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
                <button onClick={onSave} disabled={!editTitle.trim() || submitting} className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">
                  {submitting ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold leading-snug text-gray-900">{event.title}</h3>
              <div className="mt-2 space-y-1.5">
                {event.allDay ? (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {fmtDate(event.startAt)}{isMulti && event.endAt ? ` ~ ${fmtDate(event.endAt)}` : ""} · 하루 종일
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {fmtDate(event.startAt)} {fmtTime(event.startAt)}
                    {event.endAt && <> ~ {isMulti ? fmtDate(event.endAt) + " " : ""}{fmtTime(event.endAt)}</>}
                  </p>
                )}
                {event.location && (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {event.location}
                  </p>
                )}
              </div>
              {event.description && (
                <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5">
                  <p className="text-xs leading-relaxed text-gray-500 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
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
                        {m.user.name}{m.role === "OWNER" && <span className="ml-1 text-indigo-500">★</span>}
                        {m.user.id === viewer?.id && <span className="ml-0.5 text-gray-400">(나)</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-2 text-[11px] text-gray-400">작성: {event.createdBy?.name ?? "알 수 없음"}</p>
            </>
          )}
        </div>

        {/* Comments */}
        <div className="border-t border-gray-100 p-4">
          <p className="mb-3 text-xs font-semibold text-gray-500">댓글{event.comments.length > 0 ? ` (${event.comments.length})` : ""}</p>
          {event.comments.length === 0 ? (
            <p className="text-xs text-gray-400">첫 댓글을 남겨보세요.</p>
          ) : (
            <div className="space-y-2.5">
              {event.comments.map(c => (
                <div key={c.id} className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-semibold text-gray-500">
                    {c.author.name}
                    <span className="ml-1.5 font-normal text-gray-400">{new Date(c.createdAt).toLocaleString("ko-KR", { hour12: false, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
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
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100" />
            <button onClick={onAddComment} disabled={!comment.trim() || submitting}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-40">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>

        {/* Activity log */}
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
                    <p className="text-[10px] text-gray-300">{new Date(a.createdAt).toLocaleString("ko-KR", { hour12: false })}</p>
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
