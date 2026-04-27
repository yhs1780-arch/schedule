"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotificationScheduler, requestNotificationPermission } from "@/hooks/useNotificationScheduler";
import { playSound, SOUND_LABELS, type SoundType } from "@/lib/notification-sound";
import { parseNL, summarizeParsed, type ParsedEvent } from "@/lib/nlp";

/* ─── AutoTextarea ───────────────────────────────────────────────── */
function AutoTextarea({ value, onChange, placeholder, className, minRows = 1, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, minRows * 24) + "px";
  }, [value, minRows]);
  return (
    <textarea ref={ref} value={value} onChange={onChange} placeholder={placeholder}
      className={`resize-none overflow-hidden leading-6 ${className ?? ""}`}
      rows={minRows} {...props}/>
  );
}

/* ─── AddressField: 인라인 카카오 주소 검색 ─────────────────────── */
declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: {
        q?: string;
        oncomplete: (d: { roadAddress: string; jibunAddress: string }) => void;
        width?: string | number; height?: string | number;
      }) => { open(): void; embed(el: HTMLElement, opts?: { autoClose?: boolean }): void };
    };
  }
}

function AddressField({ value, onChange, detail, onDetailChange }: {
  value: string; onChange: (v: string) => void;
  detail: string; onDetailChange: (v: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);

  function mountEmbed(q?: string) {
    const el = embedRef.current;
    if (!el) return;
    el.innerHTML = "";
    const run = () => {
      new window.daum!.Postcode({
        q: q?.trim() || undefined,
        oncomplete(data) {
          onChange(data.roadAddress || data.jibunAddress);
          setModalOpen(false);
        },
        width: "100%",
        height: "100%",
      }).embed(el, { autoClose: true });
    };
    if (window.daum?.Postcode) run();
    else {
      const s = document.createElement("script");
      s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      s.onload = run;
      document.head.appendChild(s);
    }
  }

  useEffect(() => {
    if (!modalOpen) return;
    // 모달 열리면 Kakao embed 마운트 (현재 값으로 자동 검색 키워드 설정)
    setTimeout(() => mountEmbed(value || undefined), 80);
  }, [modalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ─── 메인 필드: 주소 선택 전 ─── */}
      {!value ? (
        <button type="button" onClick={() => setModalOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-left text-sm text-gray-400 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-500 transition group">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base group-hover:bg-indigo-100">📍</span>
          <div>
            <p className="text-sm font-medium group-hover:text-indigo-600">위치 추가</p>
            <p className="text-[10px] text-gray-300">도로명·지역명·지하철역 검색</p>
          </div>
        </button>
      ) : (
        /* ─── 주소 선택 후 ─── */
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-base flex-shrink-0">📍</span>
            <div className="flex-1 min-w-0">
              <button type="button" onClick={() => setModalOpen(true)} className="w-full text-left">
                <p className="text-sm font-semibold text-gray-800 leading-snug hover:text-indigo-600 transition">{value}</p>
                {detail && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
              </button>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <a href={`https://map.kakao.com/link/search/${encodeURIComponent(value)}`} target="_blank" rel="noreferrer"
                title="카카오맵에서 보기"
                className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-50 transition">
                🗺️ 지도
              </a>
              <button type="button" onClick={() => setModalOpen(true)} title="주소 변경"
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition">
                변경
              </button>
              <button type="button" onClick={() => { onChange(""); onDetailChange(""); }}
                className="rounded-lg p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 transition">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          {/* 상세 주소 */}
          <input value={detail} onChange={e => onDetailChange(e.target.value)}
            placeholder="상세 주소 입력 (동/호수/층 등, 선택)"
            className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none placeholder:text-gray-300 focus:border-indigo-400"/>
        </div>
      )}

      {/* ─── 주소 검색 모달 (Kakao embed 전용 — 입력창 1개) ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-end sm:justify-center" style={{padding:"0"}}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}/>
          <div className="relative z-10 flex w-full flex-col bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
            style={{ height: "min(600px, 88dvh)", borderRadius: "20px 20px 0 0" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">주소 검색</h3>
                  <p className="text-[10px] text-gray-400">도로명 · 지번 · 건물명 · 지하철역 검색 가능</p>
                </div>
              </div>
              <button type="button" onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            {/* Kakao Postcode Embed — 입력창은 Kakao 위젯 자체의 것만 사용 */}
            <div ref={embedRef} className="flex-1 overflow-hidden"/>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── TourOverlay ───────────────────────────────────────────────── */
type TourStepDef = { selector: string; title: string; desc: string; click: boolean; side: string };
function TourOverlay({ step, stepIdx, total, onNext, onSkip }: { step: TourStepDef; stepIdx: number; total: number; onNext: () => void; onSkip: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [winSize, setWinSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      const el = document.querySelector(step.selector);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const el2 = document.querySelector(step.selector);
        if (el2) setRect(el2.getBoundingClientRect());
        setWinSize({ w: window.innerWidth, h: window.innerHeight });
      }, 280);
    };
    update();
    window.addEventListener("resize", update);
    if (step.click) {
      const el = document.querySelector(step.selector);
      if (el) {
        const handler = () => setTimeout(onNext, 300);
        el.addEventListener("click", handler, { once: true });
        return () => { el.removeEventListener("click", handler); window.removeEventListener("resize", update); };
      }
    }
    return () => window.removeEventListener("resize", update);
  }, [step, onNext]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rect) return null;

  const PAD = 8;
  const bx = rect.left - PAD, by = rect.top - PAD, bw = rect.width + PAD * 2, bh = rect.height + PAD * 2;

  // SVG clip-path로 구멍 뚫린 오버레이 (구멍 밖은 클릭 차단)
  const svgPath = `M 0 0 L ${winSize.w} 0 L ${winSize.w} ${winSize.h} L 0 ${winSize.h} Z M ${bx+10} ${by} Q ${bx} ${by} ${bx} ${by+10} L ${bx} ${by+bh-10} Q ${bx} ${by+bh} ${bx+10} ${by+bh} L ${bx+bw-10} ${by+bh} Q ${bx+bw} ${by+bh} ${bx+bw} ${by+bh-10} L ${bx+bw} ${by+10} Q ${bx+bw} ${by} ${bx+bw-10} ${by} Z`;

  const POP_W = 280;
  let popLeft = Math.min(rect.left, winSize.w - POP_W - 12);
  if (popLeft < 8) popLeft = 8;
  const spaceBelow = winSize.h - rect.bottom;
  const popTop = spaceBelow > 210 ? rect.bottom + 14 : rect.top - 200;

  return (
    <>
      {/* SVG 구멍 뚫린 오버레이 - 구멍 밖만 클릭 차단 */}
      <svg className="fixed inset-0 z-[8999] pointer-events-none" width={winSize.w} height={winSize.h} style={{width:"100dvw",height:"100dvh"}}>
        <path d={svgPath} fill="rgba(0,0,0,0.55)" fillRule="evenodd"/>
      </svg>
      {/* 구멍 밖 클릭을 물리적으로 차단하는 투명 4개 직사각형 */}
      <div className="fixed inset-0 z-[9000]" style={{pointerEvents:"all"}}>
        {/* 위 */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:Math.max(0,by)}} onClick={e=>e.stopPropagation()}/>
        {/* 아래 */}
        <div style={{position:"absolute",top:by+bh,left:0,right:0,bottom:0}} onClick={e=>e.stopPropagation()}/>
        {/* 왼쪽 */}
        <div style={{position:"absolute",top:by,left:0,width:Math.max(0,bx),height:bh}} onClick={e=>e.stopPropagation()}/>
        {/* 오른쪽 */}
        <div style={{position:"absolute",top:by,left:bx+bw,right:0,height:bh}} onClick={e=>e.stopPropagation()}/>
        {/* 구멍 영역은 클릭 허용 (pointer-events:none) */}
        <div style={{position:"absolute",top:by,left:bx,width:bw,height:bh,pointerEvents:"none"}}/>
      </div>
      {/* 하이라이트 테두리 */}
      <div className="fixed z-[9001] pointer-events-none animate-pulse" style={{
        top:by,left:bx,width:bw,height:bh,borderRadius:12,
        boxShadow:"0 0 0 3px #6366f1, 0 0 0 6px rgba(99,102,241,0.25)",
      }}/>
      {/* 팝오버 */}
      <div className="fixed z-[9002] w-[280px] rounded-2xl bg-white shadow-2xl border border-gray-100 p-4"
        style={{ top: Math.max(8, popTop), left: popLeft }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIdx ? "w-6 bg-indigo-500" : i < stepIdx ? "w-4 bg-indigo-200" : "w-4 bg-gray-200"}`}/>
            ))}
          </div>
          <button onClick={onSkip} className="text-[10px] text-gray-400 hover:text-gray-600 underline">건너뛰기</button>
        </div>
        <h4 className="text-sm font-bold text-gray-900 mb-1">{step.title}</h4>
        <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line mb-3">{step.desc}</p>
        {step.click ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2">
            <span className="animate-bounce text-base">👆</span>
            <p className="text-[11px] font-semibold text-indigo-600">위 버튼을 직접 클릭하면 다음으로 넘어가요</p>
          </div>
        ) : (
          <button onClick={onNext} className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition">
            다음 단계 →
          </button>
        )}
      </div>
    </>
  );
}

/* ─── Types ─────────────────────────────────────────────────────── */
type AuthUser = { id: string; slug: string; name: string; email?: string; image?: string; role: string };
type SyncNotification = { id: string; calendarId?: string|null; eventId?: string|null; actorName: string; type: string; message: string; isRead: boolean; snapshot?: string|null; createdAt: string };
type EvSuggestion = { id: string; title: string; calendarId: string; location?: string|null; locationDetail?: string|null; description?: string|null; url?: string|null; startAt?: string; fromCalendar?: boolean; calendarName?: string };
type CalendarMember = { role: string; user: { id: string; slug: string; name: string; role: string; email?: string } };
type EventComment = { id: string; content: string; createdAt: string; author: { id: string; name: string } };
type EventActivity = { id: string; action: string; createdAt: string; actor: { id: string; name: string } };
type EventReaction = { id: string; emoji: string; authorName: string };
type EventItem = {
  id: string; title: string; startAt: string; endAt?: string | null;
  allDay?: boolean; location?: string | null; locationDetail?: string | null;
  description?: string | null; url?: string | null; reminderMinutes?: string | null;
  calendarId: string; createdById: string; createdBy?: { id: string; name: string };
  externalGoogleEventId?: string | null; guestName?: string | null;
  isTask?: boolean; isDone?: boolean;
  comments: EventComment[]; activities: EventActivity[];
  reactions?: EventReaction[];
};
type Calendar = { id: string; key: string; name: string; color: string; members: CalendarMember[]; events: EventItem[] };
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
function colOf(db: string) { return CAL_COLORS.find(c => c.db === db) ?? CAL_COLORS[0]; }

/* ─── KST 시간 헬퍼 ──────────────────────────────────────────────── */
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
function pad(n: number) { return String(n).padStart(2, "0"); }
function toUTCIso(date: string, time: string) { return new Date(`${date}T${time}:00`).toISOString(); }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function nowTime() { const d = new Date(); d.setMinutes(0,0,0); d.setHours(d.getHours()+1); return `${pad(d.getHours())}:00`; }
function isoToDate(iso: string) { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function isoToTime(iso: string) { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtDate(iso: string) { const d = new Date(iso); return `${d.getFullYear()}년 ${MONTHS[d.getMonth()]} ${d.getDate()}일 (${DAYS[d.getDay()]})`; }
function fmtTime(iso: string) { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function sameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function buildGrid(year: number, month: number) {
  const first = new Date(year, month, 1).getDay(), last = new Date(year, month+1, 0).getDate();
  const rows: (number|null)[][] = [];
  const arr = Array.from({length: Math.ceil((first+last)/7)*7}, (_,i) => { const d=i-first+1; return d>=1&&d<=last?d:null; });
  for (let i=0;i<arr.length;i+=7) rows.push(arr.slice(i,i+7));
  return rows;
}

/* ─── Multi-day bars ─────────────────────────────────────────────── */
type MBar = { id: string; eventId: string; title: string; calColor: string; startCol: number; endCol: number; cont: boolean };
function buildBars(row: (number|null)[], year: number, month: number, events: FlatEvent[]): MBar[] {
  const valid = row.filter((d): d is number => d!==null);
  if (!valid.length) return [];
  const rS = new Date(year,month,valid[0],0,0,0), rE = new Date(year,month,valid[valid.length-1],23,59,59);
  return events.filter(e => {
    if (!e.endAt) return false;
    const s=new Date(e.startAt); s.setHours(0,0,0); const en=new Date(e.endAt); en.setHours(23,59,59);
    return !sameDay(s,en) && s<=rE && en>=rS;
  }).slice(0,2).map(e => {
    const s=new Date(e.startAt); s.setHours(0,0,0); const en=new Date(e.endAt!); en.setHours(23,59,59);
    const cS=s<rS?rS:s, cE=en>rE?rE:en;
    let sc=-1, ec=-1;
    row.forEach((d,i)=>{ if(!d)return; const c=new Date(year,month,d); if(sameDay(c,cS))sc=i; if(sameDay(c,cE))ec=i; });
    if(sc===-1) sc=row.findIndex(d=>d!==null);
    if(ec===-1) ec=row.map((d,i)=>d!==null?i:-1).filter(i=>i!==-1).at(-1)??6;
    return {id:`${e.id}-r${sc}`,eventId:e.id,title:e.title,calColor:e.calendarColor,startCol:sc,endCol:ec,cont:s<rS};
  });
}

/* ─── 카카오 주소 검색 ──────────────────────────────────────────── */
function openKakaoPostcode(onSelect: (addr: string) => void, initialQuery?: string) {
  const run = () => {
    new window.daum!.Postcode({
      q: initialQuery?.trim() || undefined,
      oncomplete(data) { onSelect(data.roadAddress || data.jibunAddress); },
    }).open();
  };
  if (window.daum?.Postcode) { run(); return; }
  const script = document.createElement("script");
  script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
  script.onload = run;
  document.head.appendChild(script);
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const touchX = useRef<number | null>(null);

  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month"|"week"|"list">("month");
  const [weather, setWeather] = useState<{date:string;code:number;high:number;low:number}[]>([]);
  const [swRegistered, setSwRegistered] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false); // closed by default on mobile
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  /* ── new event ── */
  const [showEventModal, setShowEventModal] = useState(false);
  const [evTitle, setEvTitle] = useState(""); const [evLocation, setEvLocation] = useState(""); const [evLocDetail, setEvLocDetail] = useState(""); const [evUrl, setEvUrl] = useState("");
  const [evDesc, setEvDesc] = useState(""); const [evAllDay, setEvAllDay] = useState(false);
  const [evStartDate, setEvStartDate] = useState(todayStr()); const [evStartTime, setEvStartTime] = useState(nowTime());
  const [evHasEnd, setEvHasEnd] = useState(false); const [evEndDate, setEvEndDate] = useState(todayStr());
  const [evEndTime, setEvEndTime] = useState(() => { const h=parseInt(nowTime())+1; return `${pad(h<24?h:23)}:00`; });
  const [evCalId, setEvCalId] = useState("");
  const [evReminders, setEvReminders] = useState<number[]>([]);
  const [evIsTask, setEvIsTask] = useState(false);
  /* 자연어 / 음성 입력 */
  const [nlInput, setNlInput] = useState("");
  const [nlParsed, setNlParsed] = useState<ParsedEvent | null>(null);
  const [nlMode, setNlMode] = useState(false);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  /* title autocomplete */
  const [titleSuggestions, setTitleSuggestions] = useState<EvSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  /* bulk delete */
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  /* notification settings */
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifSound, setNotifSound] = useState<SoundType>("bell");
  const [notifVolume, setNotifVolume] = useState(0.6);
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  /* ── new calendar ── */
  const [showCalModal, setShowCalModal] = useState(false);
  const [calName, setCalName] = useState(""); const [calColor, setCalColor] = useState(CAL_COLORS[1].db);
  /* ── edit calendar ── */
  const [editingCal, setEditingCal] = useState<Calendar|null>(null);
  const [editCalName, setEditCalName] = useState(""); const [editCalColor, setEditCalColor] = useState("");
  const [confirmDeleteCal, setConfirmDeleteCal] = useState(false);
  /* ── drag-and-drop ── */
  const [draggedEventId, setDraggedEventId] = useState<string|null>(null);
  const [dndConfirm, setDndConfirm] = useState<{ev:FlatEvent;targetDate:string}|null>(null);

  /* ── share ── */
  const [shareCalId, setShareCalId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState(""); const [inviteRole, setInviteRole] = useState<"EDITOR"|"VIEWER">("EDITOR");
  const [inviting, setInviting] = useState(false); const [inviteMsg, setInviteMsg] = useState<{ok:boolean;text:string}|null>(null);
  const [shareLink, setShareLink] = useState<{token:string;role:string}|null>(null);
  const [shareLinkRole, setShareLinkRole] = useState<"VIEWER"|"EDITOR">("VIEWER");
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [inviteByEmail, setInviteByEmail] = useState(""); const [inviteByEmailSending, setInviteByEmailSending] = useState(false); const [inviteByEmailMsg, setInviteByEmailMsg] = useState<{ok:boolean;text:string}|null>(null);

  /* ── event edit ── */
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(""); const [editAllDay, setEditAllDay] = useState(false);
  const [editSD, setEditSD] = useState(""); const [editST, setEditST] = useState("");
  const [editED, setEditED] = useState(""); const [editET, setEditET] = useState("");
  const [editLoc, setEditLoc] = useState(""); const [editLocDetail, setEditLocDetail] = useState(""); const [editDesc, setEditDesc] = useState(""); const [editUrl, setEditUrl] = useState("");
  const [editCalId, setEditCalId] = useState("");
  const [editReminders, setEditReminders] = useState<number[]>([]);
  const [comment, setComment] = useState(""); const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* ── misc ── */
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [importingGoogle, setImportingGoogle] = useState(false);
  const [daySummaryDate, setDaySummaryDate] = useState<string|null>(null);
  /* ── interactive tour ── */
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  /* ── sync notifications ── */
  const [syncNotifs, setSyncNotifs] = useState<SyncNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [rollingBack, setRollingBack] = useState<string|null>(null);

  /* ── init ── */
  useEffect(() => { if (status==="unauthenticated") router.replace("/login"); }, [status, router]);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("syncnest_v2")) {
      // 데이터 로딩 후 투어 시작 (사이드바 열리는 시간 포함)
      setTimeout(() => void startProductTour(true), 1000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Open sidebar on desktop by default
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) setSidebarOpen(true);
  }, []);

  const CACHE_KEY = "syncnest_cal_cache";

  // sessionStorage에서 캐시된 데이터 즉시 표시
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { user: u, calendars: cals } = JSON.parse(cached) as { user: AuthUser; calendars: Calendar[] };
        setViewer(u); setCalendars(cals);
        if (cals[0]) setEvCalId(p => p || cals[0].id);
        setLoading(false); // 캐시 있으면 즉시 로딩 해제
      }
    } catch { void 0; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (silent = false) => {
    try {
      const res = await fetch("/api/events"); if (!res.ok) return;
      const data = (await res.json()) as {user?:AuthUser;calendars?:Calendar[]};
      const u = data.user ?? null; const cals = data.calendars ?? [];
      setViewer(u); setCalendars(cals);
      if (cals[0]) setEvCalId(p => p || cals[0].id);
      // 캐시 업데이트
      if (typeof window !== "undefined" && u) {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ user: u, calendars: cals }));
      }
    } finally { if (!silent) setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (status === "authenticated") void load(); }, [status, load]);

  // Service Worker 등록 (모바일 백그라운드 알림)
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator && !swRegistered) {
      navigator.serviceWorker.register("/sw.js").then(reg => {
        setSwRegistered(true);
        console.log("[SW] registered", reg.scope);
      }).catch(() => {});
    }
  }, [swRegistered]);

  // 날씨 로드 (Open-Meteo 무료 API - 서울 기준, 위치 권한 있으면 실제 위치)
  useEffect(() => {
    async function fetchWeather() {
      try {
        let lat = 37.5665, lon = 126.9780;
        if (navigator.geolocation) {
          await new Promise<void>(res => navigator.geolocation.getCurrentPosition(
            p => { lat = p.coords.latitude; lon = p.coords.longitude; res(); },
            () => res(), { timeout: 3000 }
          ));
        }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=7`;
        const r = await fetch(url);
        const d = await r.json() as { daily?: { time: string[]; weathercode: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] } };
        if (d.daily) {
          setWeather(d.daily.time.map((date, i) => ({
            date, code: d.daily!.weathercode[i], high: Math.round(d.daily!.temperature_2m_max[i]), low: Math.round(d.daily!.temperature_2m_min[i])
          })));
        }
      } catch {}
    }
    void fetchWeather();
  }, []);

  // 알림 폴링 (60초마다)
  const loadNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const d = (await res.json()) as { notifications: SyncNotification[] };
      setSyncNotifs(d.notifications ?? []);
    } catch { void 0; }
  }, []);
  useEffect(() => {
    if (status !== "authenticated") return;
    void loadNotifs();
    const id = setInterval(() => void loadNotifs(), 60_000);
    return () => clearInterval(id);
  }, [status, loadNotifs]);

  /* ── derived ── */
  const visibleEvents = useMemo<FlatEvent[]>(() =>
    calendars.filter(c=>!hiddenIds.has(c.id))
      .flatMap(c=>c.events.map(e=>({...e,calendarId:c.id,calendarName:c.name,calendarColor:c.color})))
      .sort((a,b)=>a.startAt.localeCompare(b.startAt)),
    [calendars, hiddenIds]);

  const filteredEvents = useMemo(() => {
    const q=searchQuery.trim().toLowerCase(); if(!q) return visibleEvents;
    return visibleEvents.filter(e=>e.title.toLowerCase().includes(q)||e.location?.toLowerCase().includes(q)||e.description?.toLowerCase().includes(q));
  }, [visibleEvents, searchQuery]);

  const selected = useMemo(()=>selectedId?visibleEvents.find(e=>e.id===selectedId)??null:null,[visibleEvents,selectedId]);
  const selectedCal = selected?calendars.find(c=>c.id===selected.calendarId)??null:null;
  const canEdit:boolean = !!viewer&&!!selected&&(viewer.role==="OWNER"||selected.createdById===viewer.id||(selectedCal?.members.some(m=>m.user.id===viewer.id&&(m.role==="OWNER"||m.role==="EDITOR"))??false));
  const shareCal = shareCalId?calendars.find(c=>c.id===shareCalId)??null:null;

  /* ── recent events: localStorage 기반 최근 10개 ── */
  type RecentEvent = {id:string;title:string;calendarId:string;location?:string|null;startAt:string};
  const RECENT_KEY = "syncnest_recent_events";
  function getRecentEvents():RecentEvent[]{try{return JSON.parse(localStorage.getItem(RECENT_KEY)??"[]") as RecentEvent[];}catch{return [];}}
  function saveRecentEvent(e:RecentEvent){
    const list=getRecentEvents().filter(r=>r.title!==e.title);
    list.unshift(e);
    localStorage.setItem(RECENT_KEY,JSON.stringify(list.slice(0,10)));
  }
  function removeRecentEvent(title:string){
    const list=getRecentEvents().filter(r=>r.title!==title);
    localStorage.setItem(RECENT_KEY,JSON.stringify(list));
  }
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  useEffect(()=>{setRecentEvents(getRecentEvents());},[]);// eslint-disable-line react-hooks/exhaustive-deps

  /* 알림 설정 복원 */
  useEffect(()=>{
    if(typeof window==="undefined") return;
    const saved=localStorage.getItem("syncnest_notif_settings");
    if(saved){try{const p=JSON.parse(saved) as {enabled:boolean;sound:SoundType;volume:number};setNotifEnabled(p.enabled);setNotifSound(p.sound);setNotifVolume(p.volume);}catch{void 0;}}
  },[]);
  function saveNotifSettings(enabled:boolean,sound:SoundType,volume:number){
    setNotifEnabled(enabled);setNotifSound(sound);setNotifVolume(volume);
    localStorage.setItem("syncnest_notif_settings",JSON.stringify({enabled,sound,volume}));
  }

  /* 알림 스케줄러 실행 */
  useNotificationScheduler(visibleEvents,notifSound,notifVolume,notifEnabled);

  const todayCount = useMemo(()=>filteredEvents.filter(e=>sameDay(new Date(e.startAt),new Date())).length,[filteredEvents]);

  /* ── actions ── */
  function resetForm() {
    setEvTitle("");setEvLocation("");setEvLocDetail("");setEvDesc("");setEvUrl("");setEvAllDay(false);setEvHasEnd(false);
    setEvReminders([]);setShowSuggestions(false);setTitleSuggestions([]);setEvIsTask(false);
    setNlInput("");setNlParsed(null);setNlMode(false);
    setEvStartDate(todayStr());setEvStartTime(nowTime());setEvEndDate(todayStr());
    const h=parseInt(nowTime())+1;setEvEndTime(`${pad(h<24?h:23)}:00`);
  }

  /* 자연어 파싱 후 폼 채우기 */
  function applyNLParsed(p: ParsedEvent) {
    setEvTitle(p.title);
    setEvStartDate(p.date);
    if (p.time) { setEvStartTime(p.time); setEvAllDay(false); }
    else { setEvAllDay(true); }
    if (p.endTime) { setEvHasEnd(true); setEvEndDate(p.endDate || p.date); setEvEndTime(p.endTime); }
    if (p.location) setEvLocation(p.location);
    setNlParsed(p);
    setNlMode(false);
  }

  /* 음성 인식 시작/중지 */
  function toggleVoice() {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SRClass = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SRClass) { alert("이 브라우저는 음성 인식을 지원하지 않아요.\nChrome 또는 Edge를 사용해주세요."); return; }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sr = new SRClass() as any;
    sr.lang = "ko-KR";
    sr.continuous = false;
    sr.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sr.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string;
      setNlInput(transcript);
      const parsed = parseNL(transcript);
      setNlParsed(parsed);
      setListening(false);
    };
    sr.onerror = () => setListening(false);
    sr.onend = () => setListening(false);
    recognitionRef.current = sr;
    sr.start();
    setListening(true);
    setNlMode(true);
    setShowEventModal(true);
  }

  async function createEvent() {
    const title=evTitle.trim(), calId=evCalId||calendars[0]?.id;
    if(!title||!calId) return;
    const startAt=evAllDay?new Date(`${evStartDate}T00:00:00`).toISOString():toUTCIso(evStartDate,evStartTime);
    const endAt=evHasEnd?(evAllDay?new Date(`${evEndDate}T23:59:59`).toISOString():toUTCIso(evEndDate,evEndTime)):null;
    const tempId=`_t_${Date.now()}`;
    const locMain = evLocation.trim() || null;
    const locDetail = evLocDetail.trim() || null;
    const tmp:EventItem={id:tempId,title,startAt,endAt,allDay:evAllDay,location:locMain,locationDetail:locDetail,description:evDesc.trim()||null,url:evUrl.trim()||null,reminderMinutes:evReminders.join(",")||null,calendarId:calId,createdById:viewer?.id??"",externalGoogleEventId:null,isTask:evIsTask,isDone:false,comments:[],activities:[]};
    setShowEventModal(false); resetForm();
    setCalendars(p=>p.map(c=>c.id===calId?{...c,events:[...c.events,tmp]}:c));
    // 최근 일정 저장
    saveRecentEvent({id:tempId,title,calendarId:calId,location:locMain,startAt});
    setRecentEvents(getRecentEvents());
    try{
      const res=await fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({calendarId:calId,title,startAt,endAt,allDay:evAllDay,location:locMain??undefined,locationDetail:locDetail??undefined,description:evDesc.trim()||undefined,url:evUrl.trim()||undefined,reminderMinutes:evReminders.join(",")||undefined,isTask:evIsTask})});
      if(res.ok){const d=(await res.json()) as {event?:EventItem};if(d.event){setCalendars(p=>p.map(c=>({...c,events:c.events.map(e=>e.id===tempId?{...e,...d.event,calendarId:calId}:e)})));}}
    }catch{setCalendars(p=>p.map(c=>({...c,events:c.events.filter(e=>e.id!==tempId)})));}
  }

  async function createCalendar() {
    if(!calName.trim()) return;
    const name=calName.trim(),color=calColor,tempId=`_tc_${Date.now()}`;
    const tmp:Calendar={id:tempId,key:tempId,name,color,members:[{role:"OWNER",user:{id:viewer?.id??"",slug:"",name:viewer?.name??"",role:"MEMBER"}}],events:[]};
    setShowCalModal(false);setCalName("");setCalendars(p=>[...p,tmp]);setEvCalId(tempId);
    await fetch("/api/calendars",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,color})});
    void load();
  }

  /* ── 캘린더 수정 / 삭제 ── */
  function openEditCal(c: Calendar) {
    setEditingCal(c); setEditCalName(c.name); setEditCalColor(c.color); setConfirmDeleteCal(false);
  }
  async function saveEditCal() {
    if (!editingCal || !editCalName.trim()) return;
    setCalendars(p => p.map(c => c.id === editingCal.id ? { ...c, name: editCalName.trim(), color: editCalColor } : c));
    setEditingCal(null);
    await fetch(`/api/calendars/${editingCal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editCalName.trim(), color: editCalColor }) });
  }
  async function deleteCalendar(calId: string) {
    setCalendars(p => p.filter(c => c.id !== calId));
    setEditingCal(null);
    if (selectedId) {
      const ev = calendars.find(c => c.id === calId)?.events.find(e => e.id === selectedId);
      if (ev) setSelectedId(null);
    }
    await fetch(`/api/calendars/${calId}`, { method: "DELETE" });
  }
  /* ── 드래그앤드롭 날짜 이동 확인 ── */
  async function confirmDndMove() {
    if (!dndConfirm) return;
    const { ev, targetDate } = dndConfirm;
    setDndConfirm(null);
    const origStart = new Date(ev.startAt);
    const newStart = new Date(targetDate + "T" + `${String(origStart.getHours()).padStart(2,"0")}:${String(origStart.getMinutes()).padStart(2,"0")}`);
    const diff = newStart.getTime() - origStart.getTime();
    const newStartIso = newStart.toISOString();
    const newEndIso = ev.endAt ? new Date(new Date(ev.endAt).getTime() + diff).toISOString() : null;
    setCalendars(p => p.map(c => ({ ...c, events: c.events.map(e => e.id === ev.id ? { ...e, startAt: newStartIso, endAt: newEndIso ?? e.endAt } : e) })));
    await fetch(`/api/events/${ev.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startAt: newStartIso, endAt: newEndIso }) });
    void load(true);
  }

  async function inviteMember() {
    if(!shareCalId||!inviteEmail.trim()) return;
    setInviting(true);setInviteMsg(null);
    const res=await fetch(`/api/calendars/${shareCalId}/members`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:inviteEmail.trim(),role:inviteRole})});
    const data=(await res.json()) as {ok?:boolean;error?:string;member?:CalendarMember};
    if(res.ok&&data.ok){setInviteMsg({ok:true,text:`${inviteEmail} 님이 추가됐습니다.`});setInviteEmail("");setCalendars(p=>p.map(c=>c.id===shareCalId&&data.member?{...c,members:[...c.members,data.member]}:c));}
    else setInviteMsg({ok:false,text:data.error??"초대에 실패했습니다."});
    setInviting(false);
  }

  async function removeMember(calId:string,userId:string){
    setCalendars(p=>p.map(c=>c.id===calId?{...c,members:c.members.filter(m=>m.user.id!==userId)}:c));
    await fetch(`/api/calendars/${calId}/members`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});
  }

  async function saveEdit(){
    if(!selected) return; setSubmitting(true);
    const startAt=editAllDay?new Date(`${editSD}T00:00:00`).toISOString():toUTCIso(editSD,editST);
    const endAt=editED?(editAllDay?new Date(`${editED}T23:59:59`).toISOString():toUTCIso(editED,editET)):null;
    const locMain = editLoc.trim() || null;
    const locDetail = editLocDetail.trim() || null;
    const newCalId=editCalId&&editCalId!==selected.calendarId?editCalId:selected.calendarId;
    const updated={...selected,title:editTitle.trim()||selected.title,startAt,endAt,allDay:editAllDay,location:locMain,locationDetail:locDetail,description:editDesc.trim()||null,url:editUrl.trim()||null,reminderMinutes:editReminders.join(",")||null,calendarId:newCalId};
    // 낙관적 업데이트 즉시 적용
    setCalendars(p=>p.map(c=>({...c,events:c.events.map(e=>e.id===selected.id?{...e,...updated}:e)})));
    setEditMode(false); setSubmitting(false);
    // 다른 캘린더로 이동시 해당 캘린더에서도 추가
    if(newCalId!==selected.calendarId){
      setCalendars(p=>p.map(c=>{
        if(c.id===selected.calendarId) return {...c,events:c.events.filter(e=>e.id!==selected.id)};
        if(c.id===newCalId) return {...c,events:[...c.events,{...updated,calendarId:newCalId}]};
        return c;
      }));
    }
    fetch(`/api/events/${selected.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      title:editTitle.trim()||undefined,startAt,endAt,allDay:editAllDay,
      location:locMain,locationDetail:locDetail,description:editDesc.trim()||null,url:editUrl.trim()||null,reminderMinutes:editReminders.join(",")||null,
      calendarId:newCalId!==selected.calendarId?newCalId:undefined,
    })}).catch(()=>void load());
  }

  async function deleteEvent(){
    if(!selected) return;
    setCalendars(p=>p.map(c=>({...c,events:c.events.filter(e=>e.id!==selected.id)})));
    setSelectedId(null); setConfirmDelete(false);
    try { await fetch(`/api/events/${selected.id}`,{method:"DELETE"}); } catch{ void load(); }
  }

  async function generateShareLink(calId: string) {
    setShareLinkLoading(true);
    const res = await fetch(`/api/calendars/${calId}/share-link`, {
      method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({shareRole: shareLinkRole}),
    });
    const d = (await res.json()) as {token?:string;shareRole?:string};
    if (d.token) setShareLink({token:d.token,role:d.shareRole??"VIEWER"});
    setShareLinkLoading(false);
  }

  async function revokeShareLink(calId: string) {
    setShareLinkLoading(true);
    await fetch(`/api/calendars/${calId}/share-link`, {
      method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({revoke: true}),
    });
    setShareLink(null);
    setShareLinkLoading(false);
  }

  async function sendLinkByEmail(calId: string) {
    if (!inviteByEmail.trim() || !shareLink) return;
    setInviteByEmailSending(true); setInviteByEmailMsg(null);
    const res = await fetch(`/api/calendars/${calId}/share-invite`, {
      method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({email: inviteByEmail.trim()}),
    });
    const d = (await res.json()) as {ok?:boolean;error?:string};
    if (res.ok) { setInviteByEmailMsg({ok:true,text:`${inviteByEmail} 님에게 초대 메일을 발송했습니다.`}); setInviteByEmail(""); }
    else setInviteByEmailMsg({ok:false,text:d.error??"메일 발송 실패"});
    setInviteByEmailSending(false);
  }

  async function addComment(){
    if(!selected||!comment.trim()||!viewer) return;
    setSubmitting(true);
    const eventId = selected.id; // 클로저에 고정
    const content = comment.trim();
    const tmpId = `_c_${Date.now()}`;
    const tmpComment: EventComment = { id: tmpId, content, createdAt: new Date().toISOString(), author: { id: viewer.id, name: viewer.name } };
    // 낙관적 추가
    setCalendars(p => p.map(c => ({ ...c, events: c.events.map(e => e.id === eventId ? { ...e, comments: [...e.comments, tmpComment] } : e) })));
    setComment("");
    setSubmitting(false);
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const d = (await res.json()) as { comment?: EventComment };
        if (d.comment) {
          // 임시 댓글 → 서버 댓글로 교체
          setCalendars(p => p.map(c => ({ ...c, events: c.events.map(e => e.id === eventId
            ? { ...e, comments: e.comments.map(c2 => c2.id === tmpId ? d.comment! : c2) }
            : e) })));
        }
      } else {
        // 실패 시 임시 댓글 제거
        setCalendars(p => p.map(c => ({ ...c, events: c.events.map(e => e.id === eventId
          ? { ...e, comments: e.comments.filter(c2 => c2.id !== tmpId) }
          : e) })));
      }
    } catch {
      setCalendars(p => p.map(c => ({ ...c, events: c.events.map(e => e.id === eventId
        ? { ...e, comments: e.comments.filter(c2 => c2.id !== tmpId) }
        : e) })));
    }
  }

  async function importGoogle(){
    setImportingGoogle(true);setShowUserMenu(false);
    try{const res=await fetch("/api/google/import",{method:"POST"});const d=(await res.json()) as {imported?:number;error?:string};
      if(res.ok)alert(`Google Calendar에서 ${d.imported??0}개 일정을 가져왔습니다.`); else alert(d.error??"Google 연동에 실패했습니다.");}
    catch{alert("오류가 발생했습니다.");}finally{setImportingGoogle(false);void load(true);}
  }

  async function duplicateEvent(ev: FlatEvent) {
    const tempId = `_t_${Date.now()}`;
    const nextStart = new Date(new Date(ev.startAt).getTime() + 24*60*60*1000).toISOString();
    const nextEnd = ev.endAt ? new Date(new Date(ev.endAt).getTime() + 24*60*60*1000).toISOString() : null;
    const tmp: EventItem = { ...ev, id: tempId, startAt: nextStart, endAt: nextEnd, comments: [], activities: [] };
    setCalendars(p => p.map(c => c.id === ev.calendarId ? { ...c, events: [...c.events, tmp] } : c));
    try {
      const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: ev.calendarId, title: ev.title, startAt: nextStart, endAt: nextEnd, allDay: ev.allDay, location: ev.location, locationDetail: ev.locationDetail, description: ev.description, url: ev.url }) });
      if (res.ok) {
        const d = (await res.json()) as { event?: EventItem };
        if (d.event) setCalendars(p => p.map(c => ({ ...c, events: c.events.map(e => e.id === tempId ? { ...e, ...d.event, calendarId: ev.calendarId } : e) })));
      } else setCalendars(p => p.map(c => ({ ...c, events: c.events.filter(e => e.id !== tempId) })));
    } catch { setCalendars(p => p.map(c => ({ ...c, events: c.events.filter(e => e.id !== tempId) }))); }
  }

  async function rollbackNotif(notifId: string) {
    setRollingBack(notifId);
    try {
      const res = await fetch(`/api/notifications/${notifId}/rollback`, { method: "POST" });
      const d = (await res.json()) as { ok?: boolean; error?: string; type?: string };
      if (res.ok) {
        setSyncNotifs(p => p.filter(n => n.id !== notifId));
        void load(true); // 롤백 후 데이터 갱신
      } else {
        alert(d.error ?? "롤백에 실패했습니다.");
      }
    } catch { alert("오류가 발생했습니다."); }
    finally { setRollingBack(null); }
  }

  async function markAllNotifRead() {
    await fetch("/api/notifications", { method: "DELETE" });
    setSyncNotifs(p => p.map(n => ({ ...n, isRead: true })));
  }

  function onEvTitleChange(val:string){
    setEvTitle(val);
    const q=val.trim().toLowerCase();
    if(q.length<1){setTitleSuggestions([]);setShowSuggestions(false);return;}
    // 최근 일정(localStorage)에서 검색
    const recentMatches:EvSuggestion[]=getRecentEvents()
      .filter(r=>r.title.toLowerCase().includes(q))
      .map(r=>({id:`r_${r.title}`,title:r.title,calendarId:r.calendarId,location:r.location,fromCalendar:false}));
    // 현재 캘린더 이벤트에서 검색 (중복 제거)
    const recentTitles=new Set(recentMatches.map(r=>r.title.toLowerCase()));
    const calMatches:EvSuggestion[]=visibleEvents
      .filter(e=>e.title.toLowerCase().includes(q)&&!recentTitles.has(e.title.toLowerCase()))
      .slice(0,5)
      .map(e=>({id:e.id,title:e.title,calendarId:e.calendarId,location:e.location,locationDetail:e.locationDetail,description:e.description,url:e.url,startAt:e.startAt,fromCalendar:true,calendarName:(calendars.find(c=>c.id===e.calendarId)?.name??"")}));
    const all=[...recentMatches,...calMatches].slice(0,8);
    setTitleSuggestions(all);setShowSuggestions(all.length>0);
  }
  function selectSuggestion(r:EvSuggestion, copyAll=false){
    setEvTitle(r.title);
    if(r.calendarId) setEvCalId(r.calendarId);
    if(copyAll){
      if(r.location) setEvLocation(r.location); else setEvLocation("");
      if(r.locationDetail) setEvLocDetail(r.locationDetail); else setEvLocDetail("");
      if(r.description) setEvDesc(r.description); else setEvDesc("");
      if(r.url) setEvUrl(r.url); else setEvUrl("");
    }
    setShowSuggestions(false);
  }

  /* ── Bulk delete ── */
  function toggleBulkSelect(id:string){
    setBulkSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  }
  function exitBulkMode(){setBulkMode(false);setBulkSelected(new Set());}
  async function deleteSelected(){
    if(!bulkSelected.size) return;
    const ids=Array.from(bulkSelected);
    // 낙관적 삭제
    setCalendars(p=>p.map(c=>({...c,events:c.events.filter(e=>!ids.includes(e.id))})));
    if(selectedId&&ids.includes(selectedId)) setSelectedId(null);
    exitBulkMode();
    try{
      await fetch("/api/events/bulk-delete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
    }catch{ void load(true); }
  }

  function toggleReminder(m:number){
    setEvReminders(p=>p.includes(m)?p.filter(x=>x!==m):[...p,m].sort((a,b)=>a-b));
  }
  function toggleEditReminder(m:number){
    setEditReminders(p=>p.includes(m)?p.filter(x=>x!==m):[...p,m].sort((a,b)=>a-b));
  }

  function openNewEvent(date?:string){
    const d=date??todayStr();setEvStartDate(d);setEvEndDate(d);setEvTitle("");setEvLocation("");setEvLocDetail("");setEvDesc("");setEvAllDay(false);setEvHasEnd(false);setEvReminders([]);
    if(calendars[0]&&!evCalId) setEvCalId(calendars[0].id);
    setShowEventModal(true);
  }
  function openEvent(id:string){setSelectedId(id);setEditMode(false);setComment("");setDaySummaryDate(null);}
  function startEdit(e:FlatEvent){setEditMode(true);setEditTitle(e.title);setEditAllDay(e.allDay??false);setEditSD(isoToDate(e.startAt));setEditST(isoToTime(e.startAt));setEditED(e.endAt?isoToDate(e.endAt):"");setEditET(e.endAt?isoToTime(e.endAt):"");setEditLoc(e.location??"");setEditLocDetail(e.locationDetail??"");setEditDesc(e.description??"");setEditUrl(e.url??"");setEditReminders(e.reminderMinutes?e.reminderMinutes.split(",").map(Number).filter(Boolean):[]);setEditCalId(e.calendarId);setConfirmDelete(false);}

  function handleDayClick(dateStr:string){
    const isMobile = typeof window!=="undefined"&&window.innerWidth<1024;
    if(isMobile) setDaySummaryDate(dateStr); else openNewEvent(dateStr);
  }

  function startProductTour(isFirst = false) {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    if (isMobile) setSidebarOpen(true);
    if (isFirst) localStorage.setItem("syncnest_v2", "1");
    setTourStep(0);
    setTourActive(true);
  }

  /* ── loading ── */
  if(status==="loading"||(status==="authenticated"&&loading&&calendars.length===0)){
    return(<div className="flex h-screen items-center justify-center"><div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"/><p className="mt-3 text-sm text-gray-400">불러오는 중...</p></div></div>);
  }
  if(status==="unauthenticated") return null;

  const year=currentDate.getFullYear(), month=currentDate.getMonth(), today=new Date();

  /* ── 인터랙티브 투어 단계 정의 ── */
  const isMobile = typeof window!=="undefined"&&window.innerWidth<1024;
  const TOUR_STEPS = [
    { selector: "#tour-create-calendar", title: "📅 1단계: 캘린더 만들기", desc: '먼저 "+ 새 캘린더" 버튼을 직접 클릭해보세요!\n목적별로 캘린더를 만들어 일정을 구분할 수 있어요.', click: true, side: "right" },
    { selector: "#tour-calendar-list", title: "🎨 2단계: 캘린더 목록", desc: "만든 캘린더가 여기에 나타나요.\n• 색깔로 쉽게 구분\n• 탭하면 켜고 끄기\n• 팀원 초대 가능", click: false, side: "right" },
    { selector: isMobile?"#tour-fab":"#tour-create-event-btn", title: "✍️ 3단계: 일정 만들기", desc: "이 버튼을 직접 클릭해서 일정을 등록해보세요!\n날짜, 시간, 장소, 메모 등 다양하게 입력 가능해요.", click: true, side: isMobile?"top":"bottom" },
    { selector: "#tour-calendar-grid", title: "📆 4단계: 캘린더 보기", desc: "날짜를 클릭하면 해당 날의 일정 목록이 열려요!\n좌우 버튼 또는 스와이프로 월을 이동할 수 있어요.", click: false, side: "top" },
  ];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50">

      {/* ─── 인터랙티브 투어 오버레이 ─── */}
      {tourActive&&tourStep<TOUR_STEPS.length&&(
        <TourOverlay
          step={TOUR_STEPS[tourStep]}
          stepIdx={tourStep}
          total={TOUR_STEPS.length}
          onNext={()=>setTourStep(p=>p+1)}
          onSkip={()=>{setTourActive(false);const isMob=window.innerWidth<1024;if(isMob)setSidebarOpen(false);}}
        />
      )}
      {tourActive&&tourStep>=TOUR_STEPS.length&&(
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50">
          <div className="mx-4 rounded-2xl bg-white p-8 text-center shadow-2xl max-w-xs w-full">
            <p className="text-4xl mb-3">🎉</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">가이드 완료!</h3>
            <p className="text-sm text-gray-500 mb-5">이제 SyncNest를 자유롭게 사용해보세요!<br/>상단 메뉴에서 언제든 가이드를 다시 볼 수 있어요.</p>
            <button onClick={()=>{setTourActive(false);const isMob=window.innerWidth<1024;if(isMob)setSidebarOpen(false);}}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700">
              시작하기!
            </button>
          </div>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <header className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 shadow-sm z-10">
        <button onClick={()=>setSidebarOpen(v=>!v)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 active:bg-gray-200">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <Link href="/" className="text-base font-extrabold text-indigo-600 tracking-tight">SyncNest</Link>

        {/* Month nav - hidden on small mobile */}
        <div className="hidden sm:flex items-center gap-1 ml-1">
          <button onClick={()=>setCurrentDate(new Date(year,month-1,1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button onClick={()=>setCurrentDate(new Date())} className="min-w-[88px] rounded-lg px-2 py-1 text-center text-sm font-semibold text-gray-800 hover:bg-gray-100">
            {year}년 {MONTHS[month]}
          </button>
          <button onClick={()=>setCurrentDate(new Date(year,month+1,1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
          <button onClick={()=>setCurrentDate(new Date())} className="ml-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">오늘</button>
          {todayCount>0&&<span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">오늘 {todayCount}개</span>}
        </div>

        {/* Mobile month display */}
        <div className="sm:hidden flex items-center gap-1 ml-1">
          <button onClick={()=>setCurrentDate(new Date(year,month-1,1))} className="p-1.5 text-gray-400"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg></button>
          <span className="text-sm font-bold text-gray-800">{year}.{pad(month+1)}</span>
          <button onClick={()=>setCurrentDate(new Date(year,month+1,1))} className="p-1.5 text-gray-400"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg></button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* search */}
          {showSearch?(
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 ring-2 ring-indigo-100">
              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==="Escape"&&(setShowSearch(false),setSearchQuery(""))} placeholder="검색..." className="w-32 text-sm outline-none"/>
              <button onClick={()=>{setShowSearch(false);setSearchQuery("");}}>
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ):(
            <button onClick={()=>setShowSearch(true)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          )}

          {/* view toggle - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 p-0.5">
              {(["month","week","list"] as const).map(v=>(
                <button key={v} onClick={()=>{setView(v);exitBulkMode();}} className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${view===v?"bg-indigo-600 text-white shadow-sm":"text-gray-500 hover:bg-gray-50"}`}>
                  {v==="month"?"월간":v==="week"?"주간":"목록"}
                </button>
              ))}
            </div>
            {/* 선택 삭제 토글 (목록 뷰에서만) */}
            {view==="list"&&(
              <button onClick={()=>{setBulkMode(v=>!v);setBulkSelected(new Set());}}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${bulkMode?"border-red-300 bg-red-50 text-red-600":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                {bulkMode?"선택 취소":"선택 삭제"}
              </button>
            )}
          </div>

          {/* create button - hidden on mobile (use FAB) */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button onClick={()=>{openNewEvent();setTimeout(()=>{setNlMode(true);setListening(false);},100);}}
              title="음성/자연어로 일정 입력"
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-2 text-sm font-semibold transition ${listening?"border-red-300 bg-red-50 text-red-600 animate-pulse":"border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100"}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
              <span className="hidden lg:inline">자연어</span>
            </button>
            <button id="tour-create-event-btn" onClick={()=>openNewEvent()} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              <span className="hidden md:inline">일정 만들기</span>
              <span className="md:hidden">추가</span>
            </button>
          </div>

          {/* 알림 벨 */}
          <div className="relative">
            <button onClick={()=>{setShowNotifPanel(v=>!v);if(!showNotifPanel)void markAllNotifRead();}}
              className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              {syncNotifs.filter(n=>!n.isRead).length>0&&(
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {syncNotifs.filter(n=>!n.isRead).length>9?"9+":syncNotifs.filter(n=>!n.isRead).length}
                </span>
              )}
            </button>
            {showNotifPanel&&(
              <>
                <div className="fixed inset-0 z-40" onClick={()=>setShowNotifPanel(false)}/>
                <div className="absolute right-0 top-11 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-bold text-gray-900">🔔 공유 캘린더 알림</h3>
                    <button onClick={()=>void markAllNotifRead()} className="text-[10px] text-indigo-500 hover:underline">모두 읽음</button>
                  </div>
                  {syncNotifs.length===0?(
                    <div className="p-6 text-center text-xs text-gray-400">새 알림이 없습니다.</div>
                  ):(
                    <div className="divide-y divide-gray-50">
                      {syncNotifs.map(n=>{
                        const snap = n.snapshot ? (() => { try { return JSON.parse(n.snapshot!) as {_deleted?:boolean}; } catch { return null; } })() : null;
                        return(
                          <div key={n.id} className={`px-4 py-3 ${!n.isRead?"bg-indigo-50/40":""}`}>
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 flex-shrink-0 text-base">{n.type==="event_deleted"?"🗑️":n.type==="event_edited"?"✏️":n.type==="comment_added"?"💬":"📅"}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 leading-relaxed">{n.message}</p>
                                <p className="mt-0.5 text-[10px] text-gray-400">{new Date(n.createdAt).toLocaleString("ko-KR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false})}</p>
                                {n.snapshot&&(n.type==="event_edited"||n.type==="event_deleted")&&(
                                  <button onClick={()=>void rollbackNotif(n.id)} disabled={rollingBack===n.id}
                                    className="mt-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition">
                                    {rollingBack===n.id?"롤백 중...":snap?._deleted?"🔄 일정 복원":"↩️ 변경 롤백"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* user avatar */}
          <div className="relative">
            <button onClick={()=>setShowUserMenu(v=>!v)} className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {viewer?.name?.charAt(0)??"U"}
            </button>
            {showUserMenu&&(
              <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                <div className="border-b border-gray-100 px-4 py-2.5">
                  <p className="truncate text-sm font-semibold text-gray-800">{viewer?.name}</p>
                  <p className="truncate text-xs text-gray-400">{viewer?.email??viewer?.slug}</p>
                </div>
                <button onClick={()=>{setShowUserMenu(false);void startProductTour();}} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  <span>📖</span> 사용 가이드 보기
                </button>
                <button onClick={()=>void importGoogle()} disabled={importingGoogle} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  {importingGoogle?"가져오는 중...":"Google 일정 가져오기"}
                </button>
                {/* mobile view toggle */}
                <div className="sm:hidden border-t border-gray-100 px-4 py-2.5 flex gap-2">
                  {(["month","list"] as const).map(v=>(
                    <button key={v} onClick={()=>{setView(v);exitBulkMode();setShowUserMenu(false);}} className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${view===v?"bg-indigo-600 text-white":"border border-gray-200 text-gray-600"}`}>
                      {v==="month"?"월간":"목록"}
                    </button>
                  ))}
                </div>
                {view==="list"&&(
                  <div className="sm:hidden border-t border-gray-100 px-4 py-2.5">
                    <button onClick={()=>{setBulkMode(v=>!v);setBulkSelected(new Set());setShowUserMenu(false);}}
                      className={`w-full rounded-lg py-1.5 text-xs font-medium ${bulkMode?"bg-red-50 text-red-600 border border-red-200":"border border-gray-200 text-gray-600"}`}>
                      {bulkMode?"✕ 선택 취소":"☑️ 선택 삭제 모드"}
                    </button>
                  </div>
                )}
                <button onClick={()=>{setShowUserMenu(false);setShowNotifSettings(true);}} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-100">
                  <span>🔔</span> 알림 설정
                </button>
                <button onClick={()=>{setShowUserMenu(false);void signOut({callbackUrl:"/"});}} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-t border-gray-100">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── BODY ─── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* Mobile sidebar backdrop */}
        {sidebarOpen&&<div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={()=>setSidebarOpen(false)}/>}

        {/* SIDEBAR - fixed drawer on mobile, inline on desktop */}
        <aside id="tour-sidebar" className={[
          "fixed top-14 left-0 bottom-0 z-30 w-72 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-300 ease-out",
          "lg:relative lg:top-auto lg:bottom-auto lg:z-auto lg:transition-none lg:flex-shrink-0",
          sidebarOpen?"translate-x-0 lg:w-60 shadow-xl lg:shadow-none":"-translate-x-full lg:-translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0",
        ].join(" ")}>
          <div className="p-3">
            <button onClick={()=>{openNewEvent();setSidebarOpen(false);}}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 py-3 text-sm font-medium text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition active:scale-95">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              새 일정 만들기
            </button>
            <div className="mb-1 px-1"><span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">내 캘린더</span></div>
            {calendars.length===0?(
              <p id="tour-calendar-list" className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-600">아직 캘린더가 없습니다.<br/>아래에서 만들어보세요!</p>
            ):(
              <div id="tour-calendar-list" className="space-y-0.5">
                {calendars.map((c,ci)=>{
                  const col=colOf(c.color),hidden=hiddenIds.has(c.id),isOwner=c.members.some(m=>m.user.id===viewer?.id&&m.role==="OWNER");
                  return(
                    <div key={c.id} id={ci===0?"tour-invite-hint":undefined} className={`group flex items-center gap-1 rounded-xl px-2 py-2.5 transition ${hidden?"opacity-40":"hover:bg-gray-50"}`}>
                      <button onClick={()=>setHiddenIds(p=>{const n=new Set(p);if(n.has(c.id))n.delete(c.id);else n.add(c.id);return n;})}
                        className="flex flex-1 items-center gap-2.5 min-w-0">
                        <span className={`h-3 w-3 flex-shrink-0 rounded-full ${hidden?"bg-gray-300":col.dot}`}/>
                        <span className="flex-1 truncate text-sm font-medium text-gray-700">{c.name}</span>
                        <span className="text-[10px] text-gray-400">{c.events.length}</span>
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 lg:opacity-100 transition">
                        {/* 수정 버튼 */}
                        <button onClick={()=>openEditCal(c)} title="캘린더 수정"
                          className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-amber-50 hover:text-amber-500 transition">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        {/* 멤버 초대 버튼 */}
                        {isOwner&&(
                          <button onClick={()=>{setShareCalId(c.id);setInviteEmail("");setInviteMsg(null);}} title="멤버 관리"
                            className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-indigo-50 hover:text-indigo-500 transition">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button id="tour-create-calendar" onClick={()=>setShowCalModal(true)} className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              새 캘린더 만들기
            </button>
            <button onClick={()=>void startProductTour()} className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-gray-400 hover:bg-gray-50 hover:text-indigo-500 transition">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/></svg>
              사용 가이드
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main id="tour-calendar-grid" className="flex flex-1 flex-col overflow-hidden"
          onTouchStart={e=>{touchX.current=e.touches[0].clientX;}}
          onTouchEnd={e=>{if(touchX.current===null)return;const d=e.changedTouches[0].clientX-touchX.current;if(Math.abs(d)>60)setCurrentDate(p=>new Date(p.getFullYear(),p.getMonth()+(d<0?1:-1),1));touchX.current=null;}}
        >
          {searchQuery&&(
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
              <span className="font-semibold">"{searchQuery}"</span> 검색 결과: {filteredEvents.length}개
              <button onClick={()=>setSearchQuery("")} className="ml-2 underline">초기화</button>
            </div>
          )}
          {/* 날씨 헤더 */}
          {weather.length>0&&view==="month"&&(
            <div className="flex-shrink-0 overflow-x-auto border-b border-gray-100 bg-white">
              <div className="flex gap-0 min-w-max">
                {weather.slice(0,7).map(w=>{
                  const icon=weatherIcon(w.code);
                  const d=new Date(w.date+"T00:00:00");
                  const isToday=sameDay(d,today);
                  return(
                    <div key={w.date} className={`flex flex-col items-center px-3 py-1.5 text-center min-w-[46px] ${isToday?"bg-indigo-50":""}`}>
                      <span className="text-[10px] text-gray-400">{DAYS[d.getDay()]}</span>
                      <span className="text-base">{icon}</span>
                      <span className="text-[9px] font-semibold text-red-500">{w.high}°</span>
                      <span className="text-[9px] text-blue-400">{w.low}°</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {view==="month"?(
            <MonthView year={year} month={month} today={today} events={filteredEvents} selectedId={selectedId} onDayClick={handleDayClick} onEventClick={openEvent}
              onDragStart={id=>setDraggedEventId(id)} onDrop={(id,date)=>{const ev=visibleEvents.find(e=>e.id===id);if(ev&&date!==`${new Date(ev.startAt).getFullYear()}-${pad(new Date(ev.startAt).getMonth()+1)}-${pad(new Date(ev.startAt).getDate())}`)setDndConfirm({ev,targetDate:date});setDraggedEventId(null);}} draggedId={draggedEventId??undefined}/>
          ):view==="week"?(
            <WeekView currentDate={currentDate} events={filteredEvents} selectedId={selectedId} today={today} onEventClick={openEvent} onDayClick={handleDayClick}/>
          ):(
            <ListView events={filteredEvents} selectedId={selectedId} onEventClick={openEvent}
              bulkMode={bulkMode} bulkSelected={bulkSelected} onToggleSelect={toggleBulkSelect}/>
          )}
        </main>

        {/* ─── 일괄 삭제 플로팅 액션 바 ─── */}
        {bulkMode&&(
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-gray-900 px-5 py-3 shadow-2xl text-white">
            <span className="text-sm font-medium">{bulkSelected.size > 0 ? `${bulkSelected.size}개 선택됨` : "일정을 클릭해서 선택"}</span>
            {bulkSelected.size > 0 && (
              <button onClick={()=>void deleteSelected()}
                className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-1.5 text-sm font-bold hover:bg-red-400 active:scale-95 transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                삭제 ({bulkSelected.size}개)
              </button>
            )}
            <button onClick={exitBulkMode} className="rounded-xl border border-gray-600 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition">
              취소
            </button>
          </div>
        )}

        {/* EVENT DETAIL PANEL - bottom sheet on mobile, right panel on desktop */}
        {selected&&(
          <>
            <div className="fixed inset-0 z-30 lg:hidden" onClick={()=>setSelectedId(null)}/>
            <aside className={[
              "fixed bottom-0 inset-x-0 z-40 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl",
              "lg:relative lg:bottom-auto lg:inset-x-auto lg:z-auto lg:max-h-full lg:h-full",
              "lg:flex-shrink-0 lg:w-80 lg:rounded-none lg:border-l lg:border-gray-200 lg:shadow-none",
            ].join(" ")}>
              <div className="flex justify-center pt-2.5 pb-1 lg:hidden">
                <div className="h-1 w-10 rounded-full bg-gray-300"/>
              </div>
              <EventPanel event={selected} calendar={selectedCal} viewer={viewer} canEdit={canEdit}
                editMode={editMode} editTitle={editTitle} editAllDay={editAllDay} editSD={editSD} editST={editST} editED={editED} editET={editET} editLoc={editLoc} editLocDetail={editLocDetail} editDesc={editDesc} editUrl={editUrl} editReminders={editReminders}
                comment={comment} submitting={submitting}
                onEditStart={()=>startEdit(selected)} onEditCancel={()=>setEditMode(false)}
                onFieldChange={{title:setEditTitle,allDay:setEditAllDay,sd:setEditSD,st:setEditST,ed:setEditED,et:setEditET,loc:setEditLoc,locDetail:setEditLocDetail,desc:setEditDesc,url:setEditUrl,reminders:setEditReminders}}
                onSave={()=>void saveEdit()} onCommentChange={setComment} onAddComment={()=>void addComment()}
                onDelete={()=>setConfirmDelete(true)} onClose={()=>setSelectedId(null)}
                onDuplicate={()=>void duplicateEvent(selected)}
                calendars={calendars} editCalId={editCalId} onEditCalChange={setEditCalId}/>
            </aside>
          </>
        )}
      </div>

      {/* FAB - mobile only */}
      <button id="tour-fab" onClick={()=>openNewEvent()} className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-300 hover:bg-indigo-700 active:scale-95 transition lg:hidden">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
      </button>
      {/* 음성 입력 FAB - mobile */}
      <button onClick={()=>{openNewEvent();setTimeout(()=>{setNlMode(true);toggleVoice();},200);}}
        title="음성으로 일정 입력"
        className={`fixed bottom-24 right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition active:scale-95 lg:hidden ${listening?"bg-red-500 animate-pulse shadow-red-300":"bg-purple-600 shadow-purple-300 hover:bg-purple-700"}`}>
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
        </svg>
      </button>

      {/* DAY SUMMARY SHEET */}
      {daySummaryDate&&(
        <DaySummarySheet dateStr={daySummaryDate} events={filteredEvents} onEventClick={openEvent} onNewEvent={()=>openNewEvent(daySummaryDate)} onClose={()=>setDaySummaryDate(null)}/>
      )}

      {/* ── NEW EVENT MODAL ── */}
      {showEventModal&&(
        <Modal onClose={()=>{setShowEventModal(false);setShowSuggestions(false);}}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">새 일정 만들기</h2>
            <div className="flex items-center gap-1.5">
              {/* 음성 인식 버튼 */}
              <button onClick={toggleVoice} title="음성으로 일정 입력"
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${listening?"border-red-300 bg-red-50 text-red-600 animate-pulse":"border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}>
                <svg className="h-3.5 w-3.5" fill={listening?"currentColor":"none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                </svg>
                {listening ? "듣는 중…" : "음성 입력"}
              </button>
              {/* 자연어 입력 토글 */}
              <button onClick={()=>{setNlMode(v=>!v);setNlInput("");setNlParsed(null);}}
                className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${nlMode?"border-purple-300 bg-purple-50 text-purple-700":"border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                ✨ 자연어
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {/* 자연어 입력 박스 */}
            {nlMode&&(
              <div className="rounded-xl border-2 border-purple-200 bg-purple-50/60 p-3 space-y-2">
                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">✨ 자연어로 일정 입력</p>
                <input autoFocus value={nlInput}
                  onChange={e=>{
                    setNlInput(e.target.value);
                    if(e.target.value.trim()) setNlParsed(parseNL(e.target.value));
                    else setNlParsed(null);
                  }}
                  onKeyDown={e=>{if(e.key==="Enter"&&nlParsed){e.preventDefault();applyNLParsed(nlParsed);}}}
                  placeholder="예) 내일 오후 3시 팀 회의 @카페"
                  className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"/>
                {nlParsed&&(
                  <div className="rounded-lg bg-white border border-purple-100 px-3 py-2">
                    <p className="text-[11px] text-purple-500 font-semibold mb-1">인식 결과</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{nlParsed.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{summarizeParsed(nlParsed)}</p>
                    <div className="mt-2 flex gap-1.5">
                      <button onClick={()=>applyNLParsed(nlParsed!)}
                        className="flex-1 rounded-lg bg-purple-600 py-1.5 text-xs font-bold text-white hover:bg-purple-700 active:scale-95 transition">
                        이대로 적용 →
                      </button>
                      <button onClick={()=>{setNlInput("");setNlParsed(null);}}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-50">
                        지우기
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {["내일 오후 2시 점심 약속","다음주 월요일 오전 10시 회의","오늘 저녁 7시 운동 @헬스장","모레 생일 파티"].map(ex=>(
                    <button key={ex} onClick={()=>{setNlInput(ex);setNlParsed(parseNL(ex));}}
                      className="rounded-full border border-purple-200 bg-white px-2 py-0.5 text-[10px] text-purple-600 hover:bg-purple-50 transition">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* 제목 + 자동완성 드롭다운 */}
            <div className="relative">
              <input autoFocus={!nlMode} value={evTitle} onChange={e=>onEvTitleChange(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!showSuggestions)void createEvent();if(e.key==="Escape")setShowSuggestions(false);}}
                onFocus={()=>{if(titleSuggestions.length>0)setShowSuggestions(true);}}
                placeholder="일정 제목 *"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base font-medium outline-none placeholder:text-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
              {showSuggestions&&titleSuggestions.length>0&&(
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                  <div className="px-3 py-1.5 border-b border-gray-50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">유사 일정 — 제목 또는 전체 복사</p>
                  </div>
                  {titleSuggestions.map((s,i)=>(
                    <div key={i} className="flex items-center gap-1 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <button onMouseDown={e=>{e.preventDefault();selectSuggestion(s,false);}}
                        className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left">
                        <span className="flex-shrink-0 text-sm">{s.fromCalendar?"📅":"🕐"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {s.calendarName&&<span className="mr-2">🗂 {s.calendarName}</span>}
                            {s.location&&<span>📍{s.location}</span>}
                          </p>
                        </div>
                      </button>
                      <button onMouseDown={e=>{e.preventDefault();selectSuggestion(s,true);}}
                        title="제목+장소+메모 전체 복사"
                        className="mr-2 flex-shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 whitespace-nowrap">
                        전체 복사
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 최근 일정 재사용 (10개, 삭제 가능) */}
            {!evTitle&&recentEvents.length>0&&(
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">최근 일정 재사용</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {recentEvents.map((e,i)=>{
                    const sug:EvSuggestion={id:`r_${i}`,title:e.title,calendarId:e.calendarId,location:e.location};
                    return(
                      <div key={i} className="flex items-center gap-1.5">
                        <button onClick={()=>selectSuggestion(sug,false)}
                          className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left hover:border-indigo-300 hover:bg-indigo-50 transition">
                          <span className="text-xs font-medium text-gray-700 flex-1 truncate">＋ {e.title}</span>
                          {e.location&&<span className="text-[10px] text-gray-400 truncate max-w-[70px]">📍{e.location}</span>}
                        </button>
                        <button onClick={()=>selectSuggestion(sug,true)} title="장소 포함 전체 복사"
                          className="flex-shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100">
                          복사
                        </button>
                        <button onClick={()=>{removeRecentEvent(e.title);setRecentEvents(getRecentEvents());}} className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 장소 검색 + 상세주소 */}
            <AddressField value={evLocation} onChange={setEvLocation} detail={evLocDetail} onDetailChange={setEvLocDetail}/>

            {/* 날짜/시간 */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2.5">
              <div className="flex items-center gap-3">
                <button onClick={()=>setEvAllDay(v=>!v)} className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${evAllDay?"bg-indigo-600":"bg-gray-300"}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${evAllDay?"translate-x-4":"translate-x-0"}`}/>
                </button>
                <span className="text-sm font-medium text-gray-700">하루 종일</span>
              </div>
              {/* 빠른 날짜 선택 */}
              <div className="flex gap-1.5">
                {[["오늘", 0],["내일", 1],["모레", 2]].map(([label, days]) => {
                  const d = new Date(); d.setDate(d.getDate() + (days as number));
                  const ds = d.toISOString().split("T")[0];
                  return <button key={label as string} type="button" onClick={() => { setEvStartDate(ds); if(evEndDate < ds) setEvEndDate(ds); }}
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition ${evStartDate===ds?"border-indigo-400 bg-indigo-100 text-indigo-700":"border-gray-200 text-gray-500 hover:border-indigo-300"}`}>
                    {label as string}
                  </button>;
                })}
              </div>
              <div className="flex gap-2">
                <input type="date" value={evStartDate} onChange={e=>{setEvStartDate(e.target.value);if(evEndDate<e.target.value)setEvEndDate(e.target.value);}}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
                {!evAllDay&&<input type="time" value={evStartTime} onChange={e=>setEvStartTime(e.target.value)} className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>}
              </div>
              <div>
                <button onClick={()=>setEvHasEnd(v=>!v)} className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                  {evHasEnd?"▾ 종료 시간":"▸ 종료 시간 추가 (연속 일정)"}
                </button>
                {evHasEnd&&(
                  <div className="flex gap-2 mt-1.5">
                    <input type="date" value={evEndDate} min={evStartDate} onChange={e=>setEvEndDate(e.target.value)} className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
                    {!evAllDay&&<input type="time" value={evEndTime} onChange={e=>setEvEndTime(e.target.value)} className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>}
                  </div>
                )}
              </div>
            </div>

            {/* 캘린더 선택 */}
            {calendars.length>1&&(
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-400">캘린더 선택</p>
                <div className="flex flex-wrap gap-1.5">
                  {calendars.map(c=>{const col=colOf(c.color);return(
                    <button key={c.id} onClick={()=>setEvCalId(c.id)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${evCalId===c.id?"border-indigo-400 bg-indigo-50 text-indigo-700":"border-gray-200 text-gray-600"}`}>
                      <span className={`h-2 w-2 rounded-full ${col.dot}`}/>{c.name}
                    </button>
                  );})}
                </div>
              </div>
            )}
            {calendars.length===1&&(
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className={`h-2.5 w-2.5 rounded-full ${colOf(calendars[0].color).dot}`}/>
                <span className="text-sm text-gray-600">{calendars[0].name}</span>
              </div>
            )}

            {/* URL + 메모 */}
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 focus-within:border-indigo-300">
              <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              <input value={evUrl} onChange={e=>setEvUrl(e.target.value)} placeholder="링크 URL (선택)" className="flex-1 text-sm outline-none placeholder:text-gray-300"/>
            </div>
            <AutoTextarea value={evDesc} onChange={e=>setEvDesc(e.target.value)} placeholder="메모 (선택)" minRows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none placeholder:text-gray-300 focus:border-indigo-400"/>

            {/* 알림 설정 */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">⏰ 알림 (선택)</p>
              <div className="flex flex-wrap gap-1.5">
                {[5,10,15,30,60,120,1440].map(m=>{
                  const label=m>=1440?`${m/1440}일 전`:m>=60?`${m/60}시간 전`:`${m}분 전`;
                  return(
                    <button key={m} onClick={()=>toggleReminder(m)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${evReminders.includes(m)?"border-indigo-400 bg-indigo-100 text-indigo-700":"border-gray-200 text-gray-500 hover:border-indigo-200 hover:bg-indigo-50"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
              {evReminders.length>0&&<p className="mt-1.5 text-[10px] text-indigo-500">앱이 열려있을 때 + Service Worker 백그라운드 알림 지원</p>}
            </div>
            {/* 할일 모드 */}
            <button type="button" onClick={()=>setEvIsTask(v=>!v)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${evIsTask?"border-indigo-300 bg-indigo-50 text-indigo-700":"border-gray-200 text-gray-500"}`}>
              <span className="text-base">{evIsTask?"☑":"☐"}</span>
              <span>할일(Task) 모드</span>
              {evIsTask&&<span className="ml-auto text-[10px] text-indigo-400">완료 체크 가능</span>}
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={()=>{setShowEventModal(false);setShowSuggestions(false);}} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">취소</button>
            <button onClick={()=>void createEvent()} disabled={!evTitle.trim()||calendars.length===0} className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 active:scale-95 ${evIsTask?"bg-purple-600 hover:bg-purple-700":"bg-indigo-600 hover:bg-indigo-700"}`}>
              {evIsTask?"할일 만들기":"일정 만들기"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── NOTIFICATION SETTINGS MODAL ── */}
      {showNotifSettings&&(
        <Modal onClose={()=>setShowNotifSettings(false)}>
          <h2 className="mb-4 text-lg font-bold text-gray-900">🔔 알림 설정</h2>
          <div className="space-y-5">
            {/* 알림 활성화 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">브라우저 알림</p>
                <p className="text-xs text-gray-400">앱을 열어두면 일정 시작 전 알림을 받아요</p>
              </div>
              <button onClick={async()=>{
                if(!notifEnabled){const ok=await requestNotificationPermission();if(ok)saveNotifSettings(true,notifSound,notifVolume);else alert("브라우저에서 알림 권한을 허용해 주세요.");}
                else saveNotifSettings(false,notifSound,notifVolume);
              }} className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors ${notifEnabled?"bg-indigo-600":"bg-gray-300"}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${notifEnabled?"translate-x-5":"translate-x-0"}`}/>
              </button>
            </div>

            {/* 알림 소리 */}
            {notifEnabled&&(
              <>
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-800">알림 소리</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(Object.keys(SOUND_LABELS) as SoundType[]).map(s=>(
                      <button key={s} onClick={()=>{saveNotifSettings(notifEnabled,s,notifVolume);playSound(s,notifVolume);}}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${notifSound===s?"border-indigo-400 bg-indigo-50 text-indigo-700":"border-gray-200 text-gray-600 hover:border-indigo-200"}`}>
                        <span>{s==="none"?"🔇":s==="bell"?"🔔":s==="chime"?"🎵":s==="ding"?"✨":"📍"}</span>
                        <span>{SOUND_LABELS[s]}</span>
                        {notifSound===s&&<span className="ml-auto text-indigo-500">▶</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 볼륨 */}
                {notifSound!=="none"&&(
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-800">볼륨 <span className="font-normal text-gray-400">{Math.round(notifVolume*100)}%</span></p>
                    <input type="range" min="10" max="100" value={Math.round(notifVolume*100)}
                      onChange={e=>{const v=parseInt(e.target.value)/100;saveNotifSettings(notifEnabled,notifSound,v);}}
                      onMouseUp={()=>playSound(notifSound,notifVolume)}
                      className="w-full accent-indigo-600"/>
                  </div>
                )}

                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                  <p className="text-xs text-amber-700 font-semibold mb-1">📱 알림이 작동하려면</p>
                  <ul className="text-xs text-amber-600 space-y-0.5 list-disc list-inside">
                    <li>SyncNest 탭이 브라우저에 열려 있어야 해요</li>
                    <li>일정 생성/수정 시 알림 시간을 설정하세요</li>
                    <li>게스트·비회원에게는 이메일 알림을 이용하세요</li>
                  </ul>
                </div>
              </>
            )}

            <button onClick={()=>setShowNotifSettings(false)} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white">확인</button>
          </div>
        </Modal>
      )}

      {/* ── NEW CALENDAR MODAL ── */}
      {showCalModal&&(
        <Modal onClose={()=>setShowCalModal(false)}>
          <h2 className="mb-4 text-lg font-bold text-gray-900">새 캘린더 만들기</h2>
          <div className="space-y-4">
            <input autoFocus value={calName} onChange={e=>setCalName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void createCalendar()} placeholder="캘린더 이름 (예: 팀 업무, 알바, 개인)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">색상</p>
              <div className="flex flex-wrap gap-2.5">
                {CAL_COLORS.map(c=>(
                  <button key={c.db} onClick={()=>setCalColor(c.db)} className={`flex flex-col items-center gap-1 rounded-xl p-2 transition ${calColor===c.db?"bg-gray-100 ring-2 ring-offset-1 ring-indigo-400":"hover:bg-gray-50"}`}>
                    <span className={`h-7 w-7 rounded-full ${c.dot}`}/><span className="text-[10px] text-gray-500">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="rounded-lg bg-indigo-50 p-2.5 text-xs text-indigo-600">💡 만들고 나서 멤버를 이메일로 초대할 수 있어요.</p>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={()=>setShowCalModal(false)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">취소</button>
            <button onClick={()=>void createCalendar()} disabled={!calName.trim()} className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-40 active:scale-95">만들기</button>
          </div>
        </Modal>
      )}

      {/* ── 캘린더 수정 모달 ── */}
      {editingCal&&(
        <Modal onClose={()=>setEditingCal(null)}>
          <h2 className="mb-4 text-lg font-bold text-gray-900">캘린더 수정</h2>
          <div className="space-y-4">
            <input autoFocus value={editCalName} onChange={e=>setEditCalName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&void saveEditCal()}
              placeholder="캘린더 이름" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">색상</p>
              <div className="flex flex-wrap gap-2.5">
                {CAL_COLORS.map(c=>(
                  <button key={c.db} onClick={()=>setEditCalColor(c.db)} className={`flex flex-col items-center gap-1 rounded-xl p-2 transition ${editCalColor===c.db?"bg-gray-100 ring-2 ring-offset-1 ring-indigo-400":"hover:bg-gray-50"}`}>
                    <span className={`h-7 w-7 rounded-full ${c.dot}`}/><span className="text-[10px] text-gray-500">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* 삭제 확인 */}
            {!confirmDeleteCal?(
              <button onClick={()=>setConfirmDeleteCal(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                캘린더 삭제
              </button>
            ):(
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-sm font-semibold text-red-700">⚠️ 정말 삭제할까요?</p>
                <p className="text-xs text-red-500">이 캘린더의 모든 일정이 함께 삭제됩니다. 되돌릴 수 없어요.</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={()=>setConfirmDeleteCal(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600">취소</button>
                  <button onClick={()=>void deleteCalendar(editingCal.id)} className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-bold text-white hover:bg-red-600">삭제</button>
                </div>
              </div>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={()=>setEditingCal(null)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">취소</button>
            <button onClick={()=>void saveEditCal()} disabled={!editCalName.trim()} className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-40 active:scale-95">저장</button>
          </div>
        </Modal>
      )}

      {/* ── 드래그앤드롭 확인 모달 ── */}
      {dndConfirm&&(
        <Modal onClose={()=>setDndConfirm(null)}>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-2xl">📅</div>
            <h2 className="mb-1 text-base font-bold text-gray-900">일정 이동</h2>
            <p className="mb-1 text-sm font-semibold text-indigo-600">{dndConfirm.ev.title}</p>
            <p className="text-sm text-gray-500">
              {new Date(dndConfirm.targetDate+"T00:00:00").toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})}로 이동할까요?
            </p>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={()=>setDndConfirm(null)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">취소</button>
            <button onClick={()=>void confirmDndMove()} className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white active:scale-95">이동</button>
          </div>
        </Modal>
      )}

      {/* ── SHARE MODAL ── */}
      {shareCalId&&shareCal&&(
        <Modal onClose={()=>setShareCalId(null)}>
          <div className="mb-4 flex items-center gap-3">
            <span className={`h-4 w-4 rounded-full ${colOf(shareCal.color).dot}`}/>
            <h2 className="text-lg font-bold text-gray-900">{shareCal.name} 멤버 관리</h2>
          </div>
          <div className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">현재 멤버 ({shareCal.members.length})</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {shareCal.members.map(m=>(
                <div key={m.user.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{m.user.name?.charAt(0)??"?"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{m.user.name}{m.user.id===viewer?.id&&<span className="ml-1.5 text-xs text-indigo-500 font-normal">나</span>}</p>
                    <p className="text-xs text-gray-400">{m.role==="OWNER"?"소유자":m.role==="EDITOR"?"편집 가능":"보기 전용"}</p>
                  </div>
                  {m.role!=="OWNER"&&<button onClick={()=>void removeMember(shareCalId,m.user.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">제거</button>}
                </div>
              ))}
            </div>
          </div>
          {/* ── 링크로 공유 ── */}
          <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="mb-2 text-xs font-bold text-indigo-700">🔗 링크로 공유 (비회원 포함)</p>
            <div className="flex gap-2 mb-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-2 py-1.5">
                <span className="text-xs text-gray-500 flex-shrink-0">권한:</span>
                {(["VIEWER","EDITOR"] as const).map(r=>(
                  <button key={r} onClick={()=>setShareLinkRole(r)} className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${shareLinkRole===r?"bg-indigo-600 text-white":"text-gray-500 hover:bg-gray-100"}`}>
                    {r==="EDITOR"?"편집":"보기"}
                  </button>
                ))}
              </div>
              <button onClick={()=>void generateShareLink(shareCalId)} disabled={shareLinkLoading}
                className="flex-shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">
                {shareLinkLoading?"...":(shareLink?"재생성":"링크 생성")}
              </button>
            </div>
            {shareLink&&(
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white p-2">
                  <span className="flex-1 truncate text-xs text-gray-600">{`${typeof window!=="undefined"?window.location.origin:""}/share/${shareLink.token}`}</span>
                  <button onClick={()=>void navigator.clipboard.writeText(`${window.location.origin}/share/${shareLink.token}`)}
                    className="flex-shrink-0 rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200">복사</button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-indigo-600">{shareLink.role==="EDITOR"?"편집 가능":"보기 전용"} 링크</span>
                  <button onClick={()=>void revokeShareLink(shareCalId)} className="text-[10px] text-red-400 hover:text-red-600">링크 삭제</button>
                </div>
                {/* 이메일로 링크 직접 발송 */}
                <div className="border-t border-indigo-100 pt-2">
                  <p className="text-[10px] font-semibold text-indigo-600 mb-1.5">📧 이메일로 바로 전송</p>
                  <div className="flex gap-1.5">
                    <input value={inviteByEmail} onChange={e=>setInviteByEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void sendLinkByEmail(shareCalId)} placeholder="이메일 주소" className="flex-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"/>
                    <button onClick={()=>void sendLinkByEmail(shareCalId)} disabled={!inviteByEmail.trim()||inviteByEmailSending} className="flex-shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40">{inviteByEmailSending?"...":"전송"}</button>
                  </div>
                  {inviteByEmailMsg&&<p className={`mt-1 text-[10px] ${inviteByEmailMsg.ok?"text-emerald-600":"text-red-500"}`}>{inviteByEmailMsg.text}</p>}
                </div>
                {/* iCal 다운로드 */}
                <a href={`/api/share/${shareLink.token}/ical`} download className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  iCal 다운로드 (.ics)
                </a>
              </div>
            )}
            {!shareLink&&<p className="text-[10px] text-indigo-500">링크를 생성하면 계정 없이도 일정을 볼 수 있어요.</p>}
          </div>

          {/* ── 이메일로 초대 ── */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">이메일로 초대 (회원만)</p>
            <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void inviteMember()} placeholder="초대할 사람의 이메일"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 mb-2"/>
            <div className="flex gap-2 mb-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                <span className="text-xs text-gray-500">권한:</span>
                {(["EDITOR","VIEWER"] as const).map(r=>(
                  <button key={r} onClick={()=>setInviteRole(r)} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition active:scale-95 ${inviteRole===r?"bg-indigo-600 text-white":"text-gray-500 hover:bg-gray-100"}`}>
                    {r==="EDITOR"?"편집":"보기"}
                  </button>
                ))}
              </div>
              <button onClick={()=>void inviteMember()} disabled={!inviteEmail.trim()||inviting} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 active:scale-95">
                {inviting?"...":"초대"}
              </button>
            </div>
            {inviteMsg&&<p className={`rounded-lg p-2.5 text-xs ${inviteMsg.ok?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-600"}`}>{inviteMsg.text}</p>}
            <p className="mt-2 text-[11px] text-gray-400">💡 상대방이 먼저 SyncNest에 가입해야 합니다.</p>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={()=>setShareCalId(null)} className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700">닫기</button>
          </div>
        </Modal>
      )}

      {/* ── CONFIRM DELETE DIALOG ── */}
      {confirmDelete&&selected&&(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100"><svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></div>
              <div>
                <h3 className="font-bold text-gray-900">일정 삭제</h3>
                <p className="text-xs text-gray-400">삭제 후 복구할 수 없습니다.</p>
              </div>
            </div>
            <p className="mb-5 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
              <strong className="text-gray-900">"{selected.title}"</strong> 일정을 삭제할까요?
            </p>
            <div className="flex gap-2">
              <button onClick={()=>setConfirmDelete(false)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
              <button onClick={()=>void deleteEvent()} className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 active:scale-[0.98]">삭제</button>
            </div>
          </div>
        </div>
      )}

      {showUserMenu&&<div className="fixed inset-0 z-40" onClick={()=>setShowUserMenu(false)}/>}
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────── */
function Modal({children,onClose}:{children:React.ReactNode;onClose:()=>void}){
  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="relative">
          <button onClick={onClose} className="absolute -right-1 -top-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 active:bg-gray-200">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          {/* drag handle for mobile */}
          <div className="flex justify-center mb-4 -mt-2 sm:hidden"><div className="h-1 w-10 rounded-full bg-gray-200"/></div>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Day Summary Sheet ──────────────────────────────────────────── */
function DaySummarySheet({dateStr,events,onEventClick,onNewEvent,onClose}:{
  dateStr:string;events:FlatEvent[];onEventClick:(id:string)=>void;onNewEvent:()=>void;onClose:()=>void;
}){
  const d=new Date(dateStr+"T00:00:00");
  const dayEvs=events.filter(e=>{const ed=new Date(e.startAt);return ed.getFullYear()===d.getFullYear()&&ed.getMonth()===d.getMonth()&&ed.getDate()===d.getDate();});
  return(
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}/>
      <div className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-white shadow-2xl">
        <div className="flex justify-center pt-3 pb-2"><div className="h-1 w-10 rounded-full bg-gray-300"/></div>
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">{d.getFullYear()}년 {MONTHS[d.getMonth()]} {d.getDate()}일</h3>
            <p className="text-xs text-gray-400">{DAYS[d.getDay()]}요일{dayEvs.length>0?` · ${dayEvs.length}개 일정`:""}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div className="max-h-60 overflow-y-auto px-4 space-y-2 pb-2">
          {dayEvs.length===0?<p className="py-4 text-center text-sm text-gray-400">이 날 일정이 없습니다.</p>:dayEvs.map(e=>{
            const col=colOf(e.calendarColor);
            return(
              <button key={e.id} onClick={()=>onEventClick(e.id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition active:scale-[0.98] border-gray-200 hover:border-indigo-200 hover:bg-indigo-50`}>
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${col.dot}`}/>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{e.title}</p>
                  <p className="text-xs text-gray-400">{e.allDay?"하루 종일":fmtTime(e.startAt)}{e.location?` · 📍${e.location}`:""}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${col.pill}`}>{e.calendarName}</span>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onNewEvent} className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white active:scale-[0.98] transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            이 날 일정 추가하기
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Month View ─────────────────────────────────────────────────── */
function MonthView({year,month,today,events,selectedId,onDayClick,onEventClick,onDragStart,onDrop,draggedId}:{
  year:number;month:number;today:Date;events:FlatEvent[];selectedId:string|null;
  onDayClick:(d:string)=>void;onEventClick:(id:string)=>void;
  onDragStart?:(id:string)=>void;onDrop?:(id:string,date:string)=>void;draggedId?:string;
}){
  const [dragOver,setDragOver]=useState<string|null>(null);
  const rows=buildGrid(year,month);
  function eventsOn(day:number){return events.filter(e=>{const d=new Date(e.startAt);if(e.endAt&&!sameDay(new Date(e.startAt),new Date(e.endAt)))return false;return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()===day;});}
  const rowH=`calc((100dvh - 112px) / ${rows.length})`;
  return(
    <div className="flex flex-1 flex-col overflow-auto select-none">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-white flex-shrink-0">
        {DAYS.map((d,i)=><div key={d} className={`py-2 text-center text-xs font-semibold ${i===0?"text-red-400":i===6?"text-blue-400":"text-gray-400"}`}>{d}</div>)}
      </div>
      <div className="flex-1">
        {rows.map((row,ri)=>{
          const bars=buildBars(row,year,month,events);
          return(
            <div key={ri} style={{height:rowH}} className="flex flex-col">
              {bars.length>0&&(
                <div className="grid grid-cols-7 flex-shrink-0 pt-0.5 gap-y-0.5">
                  {bars.map(bar=>{const col=colOf(bar.calColor);return(
                    <div key={bar.id} style={{gridColumn:`${bar.startCol+1}/${bar.endCol+2}`}} onClick={()=>onEventClick(bar.eventId)}
                      draggable onDragStart={e=>{e.stopPropagation();onDragStart?.(bar.eventId);}}
                      className={`cursor-grab truncate rounded px-1.5 py-0.5 text-[10px] font-medium mx-0.5 hover:opacity-80 active:opacity-60 ${col.pill} ${draggedId===bar.eventId?"opacity-40":""}`}>
                      {bar.cont?`↩ ${bar.title}`:bar.title}
                    </div>
                  );})}
                </div>
              )}
              <div className="grid grid-cols-7 flex-1">
                {row.map((day,ci)=>{
                  const isToday=day!==null&&sameDay(new Date(year,month,day),today);
                  const dayEvs=day!==null?eventsOn(day):[];
                  const dateStr=day!==null?`${year}-${pad(month+1)}-${pad(day)}`:"";
                  const isDragOver=dragOver===dateStr&&dateStr!=="";
                  return(
                    <div key={ci} onClick={()=>day!==null&&onDayClick(dateStr)}
                      onDragOver={e=>{if(draggedId&&day!==null){e.preventDefault();setDragOver(dateStr);}}}
                      onDragLeave={()=>setDragOver(null)}
                      onDrop={e=>{e.preventDefault();if(draggedId&&day!==null){onDrop?.(draggedId,dateStr);}setDragOver(null);}}
                      className={`cursor-pointer border-b border-r border-gray-100 p-0.5 sm:p-1 transition overflow-hidden
                        ${isToday?"bg-blue-50/40":""}
                        ${isDragOver?"bg-indigo-100/70 ring-2 ring-inset ring-indigo-400":"hover:bg-indigo-50/20 active:bg-indigo-50/40"}
                        ${ci===0?"border-l border-gray-100":""}`}>
                      {day!==null&&(
                        <>
                          <div className="flex justify-center pt-0.5">
                            <span className={`inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs sm:text-sm font-semibold ${isToday?"bg-indigo-600 text-white font-bold":ci===0?"text-red-400":ci===6?"text-blue-400":"text-gray-700"}`}>{day}</span>
                          </div>
                          <div className="mt-0.5 space-y-0.5">
                            {dayEvs.slice(0,2).map(e=>{const col=colOf(e.calendarColor);return(
                              <button key={e.id}
                                draggable
                                onDragStart={ev=>{ev.stopPropagation();onDragStart?.(e.id);}}
                                onClick={ev=>{ev.stopPropagation();onEventClick(e.id);}}
                                className={`w-full truncate rounded px-1 sm:px-1.5 py-0.5 text-left text-[10px] sm:text-[11px] font-medium transition hover:opacity-80 active:opacity-60 cursor-grab ${col.pill} ${selectedId===e.id?"ring-2 ring-indigo-400 ring-offset-1":""} ${draggedId===e.id?"opacity-30":""}`}>
                                {e.title}
                              </button>
                            );})}
                            {dayEvs.length>2&&<p className="pl-1 text-[9px] sm:text-[10px] text-gray-400">+{dayEvs.length-2}개</p>}
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
function ListView({events,selectedId,onEventClick,bulkMode,bulkSelected,onToggleSelect}:{
  events:FlatEvent[];selectedId:string|null;onEventClick:(id:string)=>void;
  bulkMode?:boolean;bulkSelected?:Set<string>;onToggleSelect?:(id:string)=>void;
}){
  const grouped=useMemo(()=>{
    const map=new Map<string,FlatEvent[]>();
    for(const e of events){const d=new Date(e.startAt),k=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;if(!map.has(k))map.set(k,[]);map.get(k)!.push(e);}
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  },[events]);
  if(!grouped.length)return(<div className="flex flex-1 items-center justify-center"><div className="text-center text-gray-400"><p className="text-5xl">📅</p><p className="mt-3 text-sm">일정이 없습니다.</p></div></div>);
  return(
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-5">
        {grouped.map(([key,dayEvs])=>{
          const d=new Date(key+"T00:00:00"),isToday=sameDay(d,new Date());
          return(
            <div key={key}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isToday?"bg-indigo-600 text-white":"bg-gray-100 text-gray-600"}`}>
                  {d.getFullYear()}년 {MONTHS[d.getMonth()]} {d.getDate()}일 ({DAYS[d.getDay()]}){isToday?" · 오늘":""}
                </span>
                {bulkMode&&(
                  <button onClick={()=>dayEvs.forEach(e=>onToggleSelect?.(e.id))}
                    className="text-[10px] text-indigo-500 hover:underline">
                    이 날 전체 선택
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {dayEvs.map(e=>{
                  const col=colOf(e.calendarColor),isMulti=e.endAt&&!sameDay(new Date(e.startAt),new Date(e.endAt));
                  const isSelected=bulkSelected?.has(e.id)??false;
                  const handleClick=()=>{
                    if(bulkMode)onToggleSelect?.(e.id);
                    else onEventClick(e.id);
                  };
                  return(
                    <div key={e.id} className={`flex items-center gap-2 rounded-xl border bg-white shadow-sm transition
                      ${bulkMode&&isSelected?"border-red-400 ring-2 ring-red-100 bg-red-50/30":""}
                      ${!bulkMode&&selectedId===e.id?"border-indigo-400 ring-2 ring-indigo-100":""}
                      ${!bulkMode&&selectedId!==e.id?"border-gray-200 hover:border-indigo-200":""}`}>
                      {bulkMode&&(
                        <button onClick={()=>onToggleSelect?.(e.id)} className="flex-shrink-0 pl-3">
                          <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition
                            ${isSelected?"border-red-500 bg-red-500":"border-gray-300 hover:border-red-400"}`}>
                            {isSelected&&<svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                          </div>
                        </button>
                      )}
                      <button onClick={handleClick}
                        className="flex flex-1 items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition rounded-xl active:scale-[0.99]">
                        <span className={`h-3 w-3 flex-shrink-0 rounded-full ${col.dot}`}/>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{e.title}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                            {e.allDay?<span>하루 종일</span>:<span>{fmtTime(e.startAt)}{e.endAt&&!isMulti?` ~ ${fmtTime(e.endAt)}`:""}</span>}
                            {isMulti&&e.endAt&&<span className="text-indigo-500">~ {fmtDate(e.endAt)}</span>}
                            <span className={`rounded px-1.5 py-0.5 ${col.pill}`}>{e.calendarName}</span>
                            {e.location&&<span className="truncate max-w-[140px]">📍 {e.location}</span>}
                          </p>
                        </div>
                        {e.comments.length>0&&<span className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>{e.comments.length}</span>}
                      </button>
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

/* ─── Reaction Bar ───────────────────────────────────────────────── */
const REACTION_EMOJIS = ["❤️","👍","🎉","😂","😮","👏","🔥","🙏"];
function ReactionBar({ eventId, reactions, viewerName }: { eventId: string; reactions: EventReaction[]; viewerName: string }) {
  const [localReactions, setLocalReactions] = useState<EventReaction[]>(reactions);
  useEffect(() => setLocalReactions(reactions), [reactions]);

  const grouped = useMemo(() => {
    const m = new Map<string, { emoji: string; count: number; names: string[] }>();
    for (const r of localReactions) {
      if (!m.has(r.emoji)) m.set(r.emoji, { emoji: r.emoji, count: 0, names: [] });
      const g = m.get(r.emoji)!; g.count++; g.names.push(r.authorName);
    }
    return Array.from(m.values());
  }, [localReactions]);

  async function toggleReaction(emoji: string) {
    const existing = localReactions.find(r => r.emoji === emoji && r.authorName === viewerName);
    if (existing) {
      setLocalReactions(p => p.filter(r => !(r.emoji === emoji && r.authorName === viewerName)));
    } else {
      const tmpId = `_tmp_${Date.now()}`;
      setLocalReactions(p => [...p, { id: tmpId, emoji, authorName: viewerName }]);
    }
    await fetch(`/api/events/${eventId}/reactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji, authorName: viewerName }) });
  }

  const [showPicker, setShowPicker] = useState(false);
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {grouped.map(g => {
          const mine = g.names.includes(viewerName);
          return (
            <button key={g.emoji} onClick={() => void toggleReaction(g.emoji)}
              title={g.names.join(", ")}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition ${mine ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
              <span>{g.emoji}</span>
              <span className="text-xs font-semibold text-gray-600">{g.count}</span>
            </button>
          );
        })}
        <div className="relative">
          <button onClick={() => setShowPicker(v => !v)}
            className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-sm text-gray-400 hover:border-gray-400 transition">
            +😊
          </button>
          {showPicker && (
            <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg z-10">
              {REACTION_EMOJIS.map(e => (
                <button key={e} onClick={() => { void toggleReaction(e); setShowPicker(false); }}
                  className="rounded-lg p-1 text-lg hover:bg-gray-100 transition active:scale-90">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Weather Icon Helper ────────────────────────────────────────── */
function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 49) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}

/* ─── Week View ──────────────────────────────────────────────────── */
function WeekView({currentDate,events,selectedId,today,onEventClick,onDayClick}:{
  currentDate:Date;events:FlatEvent[];selectedId:string|null;today:Date;
  onEventClick:(id:string)=>void;onDayClick:(d:string)=>void;
}){
  // 이번 주 월~일 계산
  const weekStart=useMemo(()=>{
    const d=new Date(currentDate);
    const day=d.getDay(); // 0=일
    d.setDate(d.getDate()-(day===0?6:day-1)); // 월요일 기준
    d.setHours(0,0,0,0);
    return d;
  },[currentDate]);

  const days=useMemo(()=>Array.from({length:7},(_,i)=>{
    const d=new Date(weekStart); d.setDate(d.getDate()+i); return d;
  }),[weekStart]);

  function eventsOnDay(d:Date){
    return events.filter(e=>{
      const es=new Date(e.startAt);
      return es.getFullYear()===d.getFullYear()&&es.getMonth()===d.getMonth()&&es.getDate()===d.getDate();
    }).sort((a,b)=>new Date(a.startAt).getTime()-new Date(b.startAt).getTime());
  }

  const DAY_NAMES=["월","화","수","목","금","토","일"];
  return(
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 날짜 헤더 */}
      <div className="grid grid-cols-7 flex-shrink-0 border-b border-gray-200 bg-white">
        {days.map((d,i)=>{
          const isToday=sameDay(d,today);
          const dateStr=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
          return(
            <button key={i} onClick={()=>onDayClick(dateStr)}
              className={`flex flex-col items-center py-2 transition hover:bg-gray-50 ${i===5?"text-blue-500":i===6?"text-red-500":""}`}>
              <span className="text-[10px] font-medium text-gray-400">{DAY_NAMES[i]}</span>
              <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${isToday?"bg-indigo-600 text-white":"text-gray-700"}`}>{d.getDate()}</span>
              <span className="mt-0.5 text-[9px] text-gray-300">{eventsOnDay(d).length>0?`${eventsOnDay(d).length}건`:""}</span>
            </button>
          );
        })}
      </div>
      {/* 이벤트 그리드 */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full divide-x divide-gray-100">
          {days.map((d,i)=>{
            const isToday=sameDay(d,today);
            const dayEvs=eventsOnDay(d);
            return(
              <div key={i} className={`p-1.5 space-y-1 min-h-[120px] ${isToday?"bg-indigo-50/30":""}`}>
                {dayEvs.map(e=>{
                  const col=colOf(e.calendarColor);
                  return(
                    <button key={e.id} onClick={()=>onEventClick(e.id)}
                      className={`w-full rounded-lg px-1.5 py-1 text-left text-[10px] font-medium leading-snug transition hover:opacity-80 active:scale-95 ${col.pill} ${selectedId===e.id?"ring-2 ring-indigo-400 ring-offset-1":""} ${e.isTask?"border border-dashed":""}`}>
                      <p className="truncate">{e.isTask?"☑ ":""}{e.title}</p>
                      {!e.allDay&&<p className="text-[9px] opacity-70">{fmtTime(e.startAt)}</p>}
                    </button>
                  );
                })}
                {dayEvs.length===0&&<p className="text-center text-[10px] text-gray-200 mt-4">-</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Event Panel ────────────────────────────────────────────────── */
type FC={title:(v:string)=>void;allDay:(v:boolean)=>void;sd:(v:string)=>void;st:(v:string)=>void;ed:(v:string)=>void;et:(v:string)=>void;loc:(v:string)=>void;locDetail:(v:string)=>void;desc:(v:string)=>void;url:(v:string)=>void;reminders:(v:number[])=>void};
function EventPanel({event,calendar,viewer,canEdit,editMode,editTitle,editAllDay,editSD,editST,editED,editET,editLoc,editLocDetail,editDesc,editUrl,editReminders,comment,submitting,onEditStart,onEditCancel,onFieldChange,onSave,onCommentChange,onAddComment,onDelete,onClose,onDuplicate,calendars,editCalId,onEditCalChange}:{
  event:FlatEvent;calendar:Calendar|null;viewer:AuthUser|null;canEdit:boolean;
  editMode:boolean;editTitle:string;editAllDay:boolean;editSD:string;editST:string;editED:string;editET:string;editLoc:string;editLocDetail:string;editDesc:string;editUrl:string;editReminders:number[];
  comment:string;submitting:boolean;onEditStart:()=>void;onEditCancel:()=>void;onFieldChange:FC;
  onSave:()=>void;onCommentChange:(v:string)=>void;onAddComment:()=>void;onDelete:()=>void;onClose:()=>void;onDuplicate:()=>void;
  calendars:Calendar[];editCalId:string;onEditCalChange:(id:string)=>void;
}){
  const col=colOf(event.calendarColor),isMulti=event.endAt&&!sameDay(new Date(event.startAt),new Date(event.endAt));
  return(
    <div>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-600">일정 상세</h2>
        <div className="flex items-center gap-1">
          {canEdit&&!editMode&&<button onClick={onDuplicate} title="일정 복사 (다음날)" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 active:bg-gray-200"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>}
          {canEdit&&!editMode&&<button onClick={onEditStart} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 active:bg-gray-200"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>}
          {canEdit&&!editMode&&<button onClick={onDelete} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>}
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 active:bg-gray-200"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
      </div>
      <div className="p-4">
        {editMode?(
          <div className="space-y-3">
            <input autoFocus value={editTitle} onChange={e=>onFieldChange.title(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"/>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={()=>onFieldChange.allDay(!editAllDay)} className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${editAllDay?"bg-indigo-600":"bg-gray-300"}`}><span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${editAllDay?"translate-x-4":"translate-x-0"}`}/></button>
                <span className="text-xs text-gray-600">하루 종일</span>
              </div>
              <div className="flex gap-2">
                <input type="date" value={editSD} onChange={e=>onFieldChange.sd(e.target.value)} className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-indigo-400"/>
                {!editAllDay&&<input type="time" value={editST} onChange={e=>onFieldChange.st(e.target.value)} className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-indigo-400"/>}
              </div>
              <div className="flex gap-2">
                <input type="date" value={editED} onChange={e=>onFieldChange.ed(e.target.value)} placeholder="종료 날짜" className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-indigo-400"/>
                {!editAllDay&&<input type="time" value={editET} onChange={e=>onFieldChange.et(e.target.value)} className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-indigo-400"/>}
              </div>
            </div>
            {/* 캘린더 변경 */}
            {calendars.length>1&&(
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">캘린더 이동</p>
                <div className="flex flex-wrap gap-1.5">
                  {calendars.map(c=>{const col=colOf(c.color);return(
                    <button key={c.id} type="button" onClick={()=>onEditCalChange(c.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${(editCalId||event.calendarId)===c.id?"border-indigo-400 bg-indigo-50 text-indigo-700":"border-gray-200 text-gray-500"}`}>
                      <span className={`h-2 w-2 rounded-full ${col.dot}`}/>{c.name}
                    </button>
                  );})}
                </div>
              </div>
            )}
            {/* 장소 */}
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">장소</p>
              <AddressField value={editLoc} onChange={onFieldChange.loc} detail={editLocDetail} onDetailChange={onFieldChange.locDetail}/>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 focus-within:border-indigo-400">
              <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              <input value={editUrl} onChange={e=>onFieldChange.url(e.target.value)} placeholder="링크 URL (선택)" className="flex-1 text-sm outline-none placeholder:text-gray-300"/>
            </div>
            <AutoTextarea value={editDesc} onChange={e=>onFieldChange.desc(e.target.value)} placeholder="메모" minRows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none placeholder:text-gray-300 focus:border-indigo-400"/>
            {/* 알림 */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">⏰ 알림</p>
              <div className="flex flex-wrap gap-1.5">
                {[5,10,15,30,60,120,1440].map(m=>{
                  const label=m>=1440?`${m/1440}일 전`:m>=60?`${m/60}시간 전`:`${m}분 전`;
                  return(
                    <button key={m} type="button" onClick={()=>onFieldChange.reminders(editReminders.includes(m)?editReminders.filter(x=>x!==m):[...editReminders,m].sort((a,b)=>a-b))}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${editReminders.includes(m)?"border-indigo-400 bg-indigo-100 text-indigo-700":"border-gray-200 text-gray-500"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onEditCancel} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">취소</button>
              <button onClick={onSave} disabled={!editTitle.trim()||submitting} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{submitting?"저장 중...":"저장"}</button>
            </div>
          </div>
        ):(
          <>
            <div className="flex items-start gap-2">
              {event.isTask&&(
                <button onClick={()=>void fetch(`/api/events/${event.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isDone:!event.isDone})}).then(()=>void (window.location.reload()))}
                  className={`mt-0.5 flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition ${event.isDone?"border-green-500 bg-green-500 text-white":"border-gray-300 hover:border-green-400"}`}>
                  {event.isDone&&<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                </button>
              )}
              <h3 className={`text-lg font-bold leading-snug ${event.isDone?"line-through text-gray-400":"text-gray-900"}`}>{event.title}</h3>
            </div>
            {event.isTask&&<p className="mt-0.5 text-[11px] font-medium text-purple-500">☑ 할일</p>}
            <div className="mt-2.5 space-y-2">
              {event.allDay?(
                <p className="flex items-center gap-2 text-sm text-gray-600"><svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  {fmtDate(event.startAt)}{isMulti&&event.endAt?` ~ ${fmtDate(event.endAt)}`:""} · 하루 종일</p>
              ):(
                <p className="flex items-center gap-2 text-sm text-gray-600"><svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {fmtDate(event.startAt)} {fmtTime(event.startAt)}{event.endAt?<> ~ {isMulti?`${fmtDate(event.endAt)} `:""}  {fmtTime(event.endAt)}</>:null}</p>
              )}
              {event.location&&<p className="flex items-start gap-2 text-sm text-gray-600"><svg className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>{event.location}{event.locationDetail?` ${event.locationDetail}`:""}</span></p>}
              {event.url&&<a href={event.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"><svg className="h-4 w-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg><span className="truncate">{event.url}</span></a>}
            </div>
            {event.description&&<div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5"><p className="text-xs leading-relaxed text-gray-500 whitespace-pre-wrap">{event.description}</p></div>}
            <div className="mt-3 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`}/>
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${col.pill}`}>{event.calendarName}</span>
            </div>
            {calendar&&calendar.members.length>1&&(
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">공유 멤버</p>
                <div className="flex flex-wrap gap-1.5">
                  {calendar.members.map(m=><span key={m.user.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">{m.user.name}{m.role==="OWNER"&&<span className="ml-1 text-indigo-500">★</span>}{m.user.id===viewer?.id&&<span className="ml-0.5 text-gray-400">(나)</span>}</span>)}
                </div>
              </div>
            )}
            {/* 게스트 작성 구분 배지 */}
            {event.guestName&&(
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                <span className="text-sm">👤</span>
                <p className="text-xs font-medium text-amber-700">게스트 <strong>{event.guestName}</strong>이(가) 추가한 일정</p>
              </div>
            )}
            <p className="mt-2 text-[11px] text-gray-400">작성: {event.guestName??event.createdBy?.name??"알 수 없음"}</p>
            {/* 이모지 반응 */}
            <ReactionBar eventId={event.id} reactions={event.reactions??[]} viewerName={viewer?.name??"나"}/>
            {/* 공유 버튼 */}
            <div className="mt-3 flex gap-1.5">
              <button onClick={()=>{
                const text=`📅 ${event.title}\n🗓 ${fmtDate(event.startAt)}${!event.allDay?` ${fmtTime(event.startAt)}`:""}\n${event.location?`📍 ${event.location}\n`:""}SyncNest 일정`;
                if(navigator.share){void navigator.share({title:event.title,text,url:window.location.href});}
                else{void navigator.clipboard.writeText(text);alert("클립보드에 복사됐어요!");}
              }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                공유
              </button>
              <a href={`https://open.kakao.com/o/share?url=${encodeURIComponent(typeof window!=="undefined"?window.location.href:"")}&text=${encodeURIComponent(`📅 ${event.title} - ${fmtDate(event.startAt)}`)}`}
                target="_blank" rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-yellow-300 bg-yellow-50 py-2 text-xs font-bold text-yellow-700 hover:bg-yellow-100 transition">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 5.806 2 10.5c0 2.877 1.597 5.423 4.07 7.054L5 21l4.485-2.235C10.273 19.244 11.12 19.4 12 19.4c5.523 0 10-3.806 10-8.5S17.523 2 12 2z"/></svg>
                카카오톡
              </a>
            </div>
          </>
        )}
      </div>
      {/* Comments */}
      <div className="border-t border-gray-100 p-4">
        <p className="mb-3 text-xs font-semibold text-gray-500">댓글{event.comments.length>0?` (${event.comments.length})`:""}</p>
        {event.comments.length===0?<p className="text-xs text-gray-400 mb-3">첫 댓글을 남겨보세요.</p>:(
          <div className="space-y-2.5 mb-3">
            {event.comments.map(c=>(
              <div key={c.id} className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-500">{c.author.name}<span className="ml-1.5 font-normal text-gray-400">{new Date(c.createdAt).toLocaleString("ko-KR",{hour12:false,month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span></p>
                <p className="mt-1 text-sm text-gray-700">{c.content}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <AutoTextarea value={comment} onChange={e=>onCommentChange(e.target.value)}
            onKeyDown={(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();onAddComment();}}}
            placeholder="댓글 입력... (Shift+Enter 줄바꿈)" minRows={1}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 max-h-32"/>
          <button onClick={onAddComment} disabled={!comment.trim()||submitting} className="flex-shrink-0 rounded-xl bg-indigo-600 p-2.5 text-white hover:bg-indigo-700 disabled:opacity-40 active:scale-95 mb-[1px]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          </button>
        </div>
      </div>
      {event.activities.length>0&&(
        <div className="border-t border-gray-100 p-4">
          <p className="mb-3 text-xs font-semibold text-gray-500">활동 로그</p>
          <div className="space-y-2">
            {[...event.activities].reverse().map(a=>(
              <div key={a.id} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300"/>
                <div><span className="text-[11px] font-semibold text-gray-600">{a.actor.name}</span><span className="text-[11px] text-gray-400"> · {a.action}</span><p className="text-[10px] text-gray-300">{new Date(a.createdAt).toLocaleString("ko-KR",{hour12:false})}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
