"use client";

import type React from "react";
import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { use } from "react";
import { calDotParts, calPillParts, resolveCalendarColor } from "@/lib/calendar-colors";

/* ─── AutoTextarea ───────────────────────────────────────────────── */
function AutoTextarea({ value, onChange, placeholder, className, minRows = 1, onKeyDown, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, minRows * 24) + "px";
  }, [value, minRows]);
  return <textarea ref={ref} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder}
    className={`resize-none overflow-hidden leading-6 ${className ?? ""}`} rows={minRows} {...props}/>;
}

/* ─── Types ─────────────────────────────────────────────────────── */
type EventItem = {
  id: string; title: string; startAt: string; endAt?: string | null;
  allDay?: boolean; location?: string | null; description?: string | null;
  url?: string | null; createdBy?: { name: string };
  comments: { id: string; content: string; createdAt: string; author: { name: string } }[];
};
type CalInfo = { id: string; name: string; color: string; shareRole: string; memberCount: number };

/* ─── Helpers ────────────────────────────────────────────────────── */
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DAYS_KR = ["일","월","화","수","목","금","토"];
function pad(n: number) { return String(n).padStart(2,"0"); }
function fmtDate(iso: string) { const d=new Date(iso); return `${d.getFullYear()}년 ${MONTHS[d.getMonth()]} ${d.getDate()}일 (${DAYS_KR[d.getDay()]})`; }
function fmtTime(iso: string) { const d=new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function todayStr() { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function sameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function buildGrid(y: number, m: number) {
  const first=new Date(y,m,1).getDay(), last=new Date(y,m+1,0).getDate();
  const arr=Array.from({length:Math.ceil((first+last)/7)*7},(_,i)=>{const d=i-first+1;return d>=1&&d<=last?d:null;});
  const rows:(number|null)[][]=[];
  for(let i=0;i<arr.length;i+=7)rows.push(arr.slice(i,i+7));
  return rows;
}


declare global { interface Window { daum?: {Postcode:new(o:{q?:string;oncomplete:(d:{roadAddress:string;jibunAddress:string})=>void;width?:string|number;height?:string|number})=>{open:()=>void;embed:(el:HTMLElement,opts?:{autoClose?:boolean})=>void}}; } }

/* ─── AddressField (모달 방식) ──────────────────────────────────── */
function AddressField({ value, onChange, detail, onDetailChange }:{ value:string; onChange:(v:string)=>void; detail:string; onDetailChange:(v:string)=>void; }){
  const [modalOpen, setModalOpen] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);
  function mountEmbed(q?:string){
    const el=embedRef.current; if(!el)return; el.innerHTML="";
    const run=()=>new window.daum!.Postcode({q:q?.trim()||undefined,oncomplete(d){onChange(d.roadAddress||d.jibunAddress);setModalOpen(false);},width:"100%",height:"100%"}).embed(el,{autoClose:true});
    if(window.daum?.Postcode)run();
    else{const s=document.createElement("script");s.src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";s.onload=run;document.head.appendChild(s);}
  }
  useEffect(()=>{
    if(!modalOpen)return;
    setTimeout(()=>mountEmbed(value||undefined),80);
  },[modalOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  return(
    <>
      {!value?(
        <button type="button" onClick={()=>setModalOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-left text-sm text-gray-400 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-500 transition group">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base group-hover:bg-indigo-100">📍</span>
          <div><p className="text-sm font-medium group-hover:text-indigo-600">위치 추가</p><p className="text-[10px] text-gray-300">도로명·지역명·지하철역 검색</p></div>
        </button>
      ):(
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-base flex-shrink-0">📍</span>
            <div className="flex-1 min-w-0">
              <button type="button" onClick={()=>setModalOpen(true)} className="w-full text-left">
                <p className="text-sm font-semibold text-gray-800 leading-snug hover:text-indigo-600">{value}</p>
                {detail&&<p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
              </button>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <a href={`https://map.kakao.com/link/search/${encodeURIComponent(value)}`} target="_blank" rel="noreferrer"
                className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-50">🗺️ 지도</a>
              <button type="button" onClick={()=>setModalOpen(true)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50">변경</button>
              <button type="button" onClick={()=>{onChange("");onDetailChange("");}} className="rounded-lg p-1 text-gray-300 hover:text-red-400 hover:bg-red-50">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <input value={detail} onChange={e=>onDetailChange(e.target.value)} placeholder="상세 주소 (동/호수/층 등, 선택)"
            className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none placeholder:text-gray-300 focus:border-indigo-400"/>
        </div>
      )}
      {/* 주소 검색 모달 — Kakao embed 단일 입력창만 표시 */}
      {modalOpen&&(
        <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-end sm:justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setModalOpen(false)}/>
          <div className="relative z-10 flex w-full flex-col bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
            style={{height:"min(600px,88dvh)",borderRadius:"20px 20px 0 0"}} onClick={e=>e.stopPropagation()}>
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div><h3 className="text-sm font-bold text-gray-900">주소 검색</h3><p className="text-[10px] text-gray-400">도로명 · 지번 · 건물명 · 지하철역 가능</p></div>
              </div>
              <button type="button" onClick={()=>setModalOpen(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div ref={embedRef} className="flex-1 overflow-hidden"/>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── TOUR OVERLAY (클릭 차단 + 구멍 오버레이) ─────────────────── */
type TourStepDef = { selector: string; title: string; desc: string; click: boolean };
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
  const svgPath = `M 0 0 L ${winSize.w} 0 L ${winSize.w} ${winSize.h} L 0 ${winSize.h} Z M ${bx+10} ${by} Q ${bx} ${by} ${bx} ${by+10} L ${bx} ${by+bh-10} Q ${bx} ${by+bh} ${bx+10} ${by+bh} L ${bx+bw-10} ${by+bh} Q ${bx+bw} ${by+bh} ${bx+bw} ${by+bh-10} L ${bx+bw} ${by+10} Q ${bx+bw} ${by} ${bx+bw-10} ${by} Z`;
  const POP_W = 280;
  let popLeft = Math.min(rect.left, winSize.w - POP_W - 12); if (popLeft < 8) popLeft = 8;
  const spaceBelow = winSize.h - rect.bottom;
  const popTop = spaceBelow > 210 ? rect.bottom + 14 : rect.top - 200;
  return (
    <>
      {/* 어두운 배경 — pointer-events:none 이므로 클릭 통과 */}
      <svg className="fixed inset-0 z-[8999] pointer-events-none" width={winSize.w} height={winSize.h} style={{width:"100dvw",height:"100dvh"}}>
        <path d={svgPath} fill="rgba(0,0,0,0.55)" fillRule="evenodd"/>
      </svg>
      {/* 클릭 차단: spotlight 구멍을 제외한 4개 영역만 막음 */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:Math.max(0,by),zIndex:9000,pointerEvents:"all"}} onClick={e=>e.stopPropagation()}/>
      <div style={{position:"fixed",top:by+bh,left:0,right:0,bottom:0,zIndex:9000,pointerEvents:"all"}} onClick={e=>e.stopPropagation()}/>
      <div style={{position:"fixed",top:by,left:0,width:Math.max(0,bx),height:bh,zIndex:9000,pointerEvents:"all"}} onClick={e=>e.stopPropagation()}/>
      <div style={{position:"fixed",top:by,left:bx+bw,right:0,height:bh,zIndex:9000,pointerEvents:"all"}} onClick={e=>e.stopPropagation()}/>
      {/* spotlight 테두리 효과 */}
      <div className="fixed pointer-events-none animate-pulse" style={{top:by,left:bx,width:bw,height:bh,borderRadius:12,boxShadow:"0 0 0 3px #6366f1, 0 0 0 6px rgba(99,102,241,0.25)",zIndex:9001}}/>
      {/* 가이드 팝업 */}
      <div className="fixed z-[9002] w-[280px] rounded-2xl bg-white shadow-2xl border border-gray-100 p-4" style={{ top: Math.max(8, popTop), left: popLeft }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex gap-1">{Array.from({length:total}).map((_,i)=>(<div key={i} className={`h-1.5 rounded-full transition-all ${i===stepIdx?"w-6 bg-indigo-500":i<stepIdx?"w-4 bg-indigo-200":"w-4 bg-gray-200"}`}/>))}</div>
          <button onClick={onSkip} className="text-[10px] text-gray-400 hover:text-gray-600 underline">건너뛰기</button>
        </div>
        <h4 className="text-sm font-bold text-gray-900 mb-1">{step.title}</h4>
        <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line mb-3">{step.desc}</p>
        {step.click ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2">
            <span className="animate-bounce text-base">👆</span>
            <p className="text-[11px] font-semibold text-indigo-600">위 버튼을 직접 클릭하면 다음으로!</p>
          </div>
        ) : (
          <button onClick={onNext} className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700">다음 단계 →</button>
        )}
      </div>
    </>
  );
}

/* ─── SHARE TOUR STEPS ──────────────────────────────────────────── */
function buildShareTourSteps(canEdit: boolean): TourStepDef[] {
  return [
    { selector: "#share-header", title: "👋 공유 캘린더에 오신 걸 환영해요!", desc: `링크를 통해 이 캘린더를 보고 있어요.\n${canEdit?"✏️ 편집 권한으로 일정을 추가·수정할 수 있어요.":"👁️ 보기 권한으로 일정을 확인할 수 있어요."}`, click: false },
    { selector: "#share-view-toggle", title: "🗓 보기 방식 전환", desc: "월간 캘린더와 목록 형태를 전환해보세요.\n📱 모바일: 좌우 스와이프로 월 이동도 가능해요.", click: true },
    { selector: "#share-cal-grid", title: "📅 캘린더", desc: `날짜를 탭하면 그 날의 일정을 확인할 수 있어요.${canEdit?"\n일정 추가도 가능해요!":""}`, click: false },
    ...(canEdit ? [{ selector: "#share-add-fab", title: "➕ 일정 추가 버튼", desc: "이 버튼을 눌러 새 일정을 추가해보세요!\n제목, 날짜, 장소, 메모 등을 입력할 수 있어요.", click: true }] : []),
    { selector: "#share-ical-btn", title: "📥 캘린더 내보내기", desc: "이 캘린더를 .ics 파일로 다운로드해서\nGoogle Calendar, 아이폰 캘린더에 추가할 수 있어요!", click: false },
    { selector: "#share-join-cta", title: "🚀 내 캘린더도 만들어보세요", desc: "SyncNest에 가입하면 내 캘린더를 만들고\n원하는 사람에게만 공유할 수 있어요!", click: false },
  ];
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function SharePage({ params }:{ params: Promise<{token:string}> }) {
  const { token } = use(params);
  const touchX = useRef<number|null>(null);

  const [cal, setCal] = useState<CalInfo|null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  const [view, setView] = useState<"month"|"list">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [daySummaryDate, setDaySummaryDate] = useState<string|null>(null);
  const [search, setSearch] = useState(""); const [showSearch, setShowSearch] = useState(false);

  // Guest state
  const [guestName, setGuestName] = useState("");

  // Add/Edit event
  const [showAddForm, setShowAddForm] = useState(false);
  const [prefillDate, setPrefillDate] = useState("");
  const [evTitle, setEvTitle] = useState(""); const [evDate, setEvDate] = useState(todayStr());
  const [evTime, setEvTime] = useState("09:00"); const [evAllDay, setEvAllDay] = useState(false);
  const [evHasEnd, setEvHasEnd] = useState(false); const [evEndDate, setEvEndDate] = useState(todayStr()); const [evEndTime, setEvEndTime] = useState("10:00");
  const [evLoc, setEvLoc] = useState(""); const [evLocDetail, setEvLocDetail] = useState(""); const [evDesc, setEvDesc] = useState(""); const [evUrl, setEvUrl] = useState("");
  const [evSubmitting, setEvSubmitting] = useState(false);

  // Edit existing
  const [editId, setEditId] = useState<string|null>(null);
  const [editTitle, setEditTitle] = useState(""); const [editDate, setEditDate] = useState(""); const [editTime, setEditTime] = useState("");
  const [editAllDay, setEditAllDay] = useState(false); const [editHasEnd, setEditHasEnd] = useState(false);
  const [editEndDate, setEditEndDate] = useState(""); const [editEndTime, setEditEndTime] = useState("");
  const [editLoc, setEditLoc] = useState(""); const [editLocDetail, setEditLocDetail] = useState(""); const [editDesc, setEditDesc] = useState(""); const [editUrl, setEditUrl] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [confirmDelId, setConfirmDelId] = useState<string|null>(null);

  // Comment
  const [newComment, setNewComment] = useState(""); const [commentSubmitting, setCommentSubmitting] = useState(false);

  /* ── load ── */
  useEffect(()=>{
    const saved = typeof window!=="undefined" ? (localStorage.getItem("syncnest_guest_name")||"") : "";
    setGuestName(saved);
    void (async()=>{
      try{
        const res=await fetch(`/api/share/${token}`, { cache: "no-store" });
        if(!res.ok){const d=(await res.json()) as {error?:string};setError(d.error??"링크를 찾을 수 없습니다.");return;}
        const data=(await res.json()) as {calendar:CalInfo;events:EventItem[]};
        setCal(data.calendar);setEvents(data.events);
      }catch{setError("불러오기 실패");}
      finally{setLoading(false);}
    })();
  },[token]);

  // Product tour - first visit
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourSteps, setTourSteps] = useState<TourStepDef[]>([]);

  useEffect(()=>{
    if(!cal) return;
    const key=`syncnest_share_tour2_${token}`;
    if(typeof window!=="undefined"&&!localStorage.getItem(key)){
      setTimeout(()=>startTour(cal.shareRole==="EDITOR"), 900);
      localStorage.setItem(key,"1");
    }
  },[cal, token]); // eslint-disable-line react-hooks/exhaustive-deps

  function startTour(canEdit: boolean){
    const steps = buildShareTourSteps(canEdit);
    setTourSteps(steps); setTourStep(0); setTourActive(true);
  }
  function tourNext(){ if(tourStep<tourSteps.length-1) setTourStep(p=>p+1); else setTourActive(false); }
  function tourSkip(){ setTourActive(false); }

  /* ── derived ── */
  const filteredEvents = useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q) return events;
    return events.filter(e=>e.title.toLowerCase().includes(q)||e.location?.toLowerCase().includes(q)||e.description?.toLowerCase().includes(q));
  },[events,search]);

  const selected = selectedId ? filteredEvents.find(e=>e.id===selectedId)??null : null;
  const canEdit = cal?.shareRole==="EDITOR";
  const year=currentDate.getFullYear(), month=currentDate.getMonth(), today=new Date();

  /* ── actions ── */
  function saveGuestName(n:string){setGuestName(n);if(typeof window!=="undefined")localStorage.setItem("syncnest_guest_name",n);}

  function openAdd(date?:string){
    const d=date??todayStr();
    setPrefillDate(d);setEvDate(d);setEvEndDate(d);setEvTitle("");setEvLoc("");setEvLocDetail("");setEvDesc("");setEvUrl("");setEvAllDay(false);setEvHasEnd(false);setEvTime("09:00");setEvEndTime("10:00");
    setShowAddForm(true);
  }

  function openEdit(e:EventItem){
    setEditId(e.id);setEditTitle(e.title);
    const sd=new Date(e.startAt);
    setEditDate(`${sd.getFullYear()}-${pad(sd.getMonth()+1)}-${pad(sd.getDate())}`);
    setEditTime(`${pad(sd.getHours())}:${pad(sd.getMinutes())}`);
    setEditAllDay(e.allDay??false);
    const hasEnd=!!e.endAt&&!sameDay(new Date(e.startAt),new Date(e.endAt!));
    setEditHasEnd(hasEnd);
    if(hasEnd&&e.endAt){const ed=new Date(e.endAt);setEditEndDate(`${ed.getFullYear()}-${pad(ed.getMonth()+1)}-${pad(ed.getDate())}`);setEditEndTime(`${pad(ed.getHours())}:${pad(ed.getMinutes())}`);}
    setEditLoc(e.location??"");setEditLocDetail("");setEditDesc(e.description??"");setEditUrl(e.url??"");
  }

  async function submitAdd(){
    if(!evTitle.trim()||!evDate||!guestName.trim()) return;
    setEvSubmitting(true);
    const startAt=evAllDay?new Date(`${evDate}T00:00:00`).toISOString():new Date(`${evDate}T${evTime}:00`).toISOString();
    const endAt=evHasEnd?(evAllDay?new Date(`${evEndDate}T23:59:59`).toISOString():new Date(`${evEndDate}T${evEndTime}:00`).toISOString()):null;
    const finalLoc=[evLoc.trim(),evLocDetail.trim()].filter(Boolean).join(" ");
    const res=await fetch(`/api/share/${token}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:evTitle.trim(),startAt,endAt,allDay:evAllDay,location:finalLoc||undefined,description:evDesc.trim()||undefined,url:evUrl.trim()||undefined,guestName:guestName.trim()})});
    if(res.ok){const d=(await res.json()) as {event:EventItem};setEvents(p=>[...p,d.event]);setShowAddForm(false);}
    setEvSubmitting(false);
  }

  async function submitEdit(){
    if(!editId||!editTitle.trim()) return;
    setEditSubmitting(true);
    const startAt=editAllDay?new Date(`${editDate}T00:00:00`).toISOString():new Date(`${editDate}T${editTime}:00`).toISOString();
    const endAt=editHasEnd?(editAllDay?new Date(`${editEndDate}T23:59:59`).toISOString():new Date(`${editEndDate}T${editEndTime}:00`).toISOString()):null;
    const finalLoc=[editLoc.trim(),editLocDetail.trim()].filter(Boolean).join(" ");
    const res=await fetch(`/api/share/${token}/events/${editId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:editTitle.trim(),startAt,endAt,allDay:editAllDay,location:finalLoc||null,description:editDesc.trim()||null,url:editUrl.trim()||null,guestName:guestName.trim()})});
    if(res.ok){const d=(await res.json()) as {event:EventItem};setEvents(p=>p.map(e=>e.id===editId?{...e,...d.event}:e));setEditId(null);setSelectedId(d.event.id);}
    setEditSubmitting(false);
  }

  async function deleteEvent(id:string){
    setEvents(p=>p.filter(e=>e.id!==id));setSelectedId(null);setConfirmDelId(null);
    await fetch(`/api/share/${token}/events/${id}`,{method:"DELETE"});
  }

  async function addComment(){
    if(!selected||!newComment.trim()||!guestName.trim()) return;
    setCommentSubmitting(true);
    const res=await fetch(`/api/share/${token}/events/${selected.id}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:newComment.trim(),guestName:guestName.trim()})});
    if(res.ok){const d=(await res.json()) as {comment:EventItem["comments"][0]};setEvents(p=>p.map(e=>e.id===selected.id?{...e,comments:[...e.comments,d.comment]}:e));setNewComment("");}
    setCommentSubmitting(false);
  }

  /* ── loading/error ── */
  if(loading) return(
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"/><p className="mt-3 text-sm text-gray-400">불러오는 중...</p></div>
    </div>
  );
  if(error||!cal) return(
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center"><div className="text-5xl mb-4">🔗</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">링크를 찾을 수 없어요</h1>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <Link href="/" className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white">홈으로</Link>
      </div>
    </div>
  );

  const _calCol=resolveCalendarColor(cal.color);
  const _headDot=calDotParts(_calCol,"h-2 w-2 rounded-full flex-shrink-0");
  const _headPill=calPillParts(_calCol,"flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold truncate max-w-[120px] sm:max-w-none");
  const todayEvsCount=filteredEvents.filter(e=>sameDay(new Date(e.startAt),today)).length;

  return(
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50">

      {/* ─── 투어 오버레이 ─── */}
      {tourActive&&tourSteps[tourStep]&&(
        <TourOverlay step={tourSteps[tourStep]} stepIdx={tourStep} total={tourSteps.length} onNext={tourNext} onSkip={tourSkip}/>
      )}

      {/* ─── HEADER ─── */}
      <header id="share-header" className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 shadow-sm z-10">
        <Link href="/" className="text-sm font-extrabold text-indigo-600 flex-shrink-0">SyncNest</Link>
        <span className="text-gray-200">|</span>
        <span className={_headPill.className} style={_headPill.style}>
          <span className={_headDot.className} style={_headDot.style}/>{cal.name}
        </span>
        {canEdit&&<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 flex-shrink-0">편집 가능</span>}
        {todayEvsCount>0&&<span className="hidden sm:inline rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">오늘 {todayEvsCount}개</span>}

        <div className="ml-auto flex items-center gap-1.5">
          {showSearch?(
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 ring-2 ring-indigo-100">
              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Escape"&&(setShowSearch(false),setSearch(""))} placeholder="검색..." className="w-24 text-sm outline-none"/>
              <button onClick={()=>{setShowSearch(false);setSearch("");}}>
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ):(
            <button onClick={()=>setShowSearch(true)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          )}

          <a id="share-ical-btn" href={`/api/share/${token}/ical`} download className="hidden sm:flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            iCal
          </a>

          <button onClick={()=>startTour(canEdit)} className="hidden sm:flex items-center gap-1.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" title="사용법">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/></svg>
          </button>

          <Link href="/login" className="flex-shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
            로그인
          </Link>
        </div>
      </header>

      {/* ─── BODY ─── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Sub-header: view toggle + month nav */}
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 py-2">
            <button onClick={()=>setCurrentDate(new Date(year,month-1,1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={()=>setCurrentDate(new Date())} className="min-w-[80px] rounded-lg px-2 py-1 text-sm font-bold text-gray-800 hover:bg-gray-100">
              {year}년 {MONTHS[month]}
            </button>
            <button onClick={()=>setCurrentDate(new Date(year,month+1,1))} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            <button onClick={()=>setCurrentDate(new Date())} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">오늘</button>

            <div id="share-view-toggle" className="ml-auto flex items-center gap-0.5 rounded-lg border border-gray-200 p-0.5">
              {(["month","list"] as const).map(v=>(
                <button key={v} onClick={()=>setView(v)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view===v?"bg-indigo-600 text-white shadow-sm":"text-gray-500 hover:bg-gray-50"}`}>
                  {v==="month"?"월간":"목록"}
                </button>
              ))}
            </div>

            {canEdit&&(
              <button onClick={()=>openAdd()} className="hidden sm:flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                일정 추가
              </button>
            )}
          </div>

          {search&&(
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-xs text-amber-700 flex-shrink-0">
              <strong>"{search}"</strong> 검색 결과: {filteredEvents.length}개
              <button onClick={()=>setSearch("")} className="ml-2 underline">초기화</button>
            </div>
          )}

          {/* Main content */}
          <main id="share-cal-grid" className="flex flex-1 flex-col overflow-hidden"
            onTouchStart={e=>{touchX.current=e.touches[0].clientX;}}
            onTouchEnd={e=>{if(touchX.current===null)return;const d=e.changedTouches[0].clientX-touchX.current;if(Math.abs(d)>60)setCurrentDate(p=>new Date(p.getFullYear(),p.getMonth()+(d<0?1:-1),1));touchX.current=null;}}>
            {view==="month"
              ? <ShareMonthView year={year} month={month} today={today} events={filteredEvents} selectedId={selectedId} canEdit={canEdit} onDayClick={d=>{if(window.innerWidth<1024){setDaySummaryDate(d);}else if(canEdit){openAdd(d);}else{setDaySummaryDate(d);}}} onEventClick={id=>{setSelectedId(id);setEditId(null);}}/>
              : <ShareListView events={filteredEvents} selectedId={selectedId} onEventClick={id=>{setSelectedId(id);setEditId(null);}}/>
            }
          </main>
        </div>

        {/* Event detail panel - right on desktop, bottom sheet on mobile */}
        {selected&&!editId&&(
          <>
            <div className="fixed inset-0 z-30 lg:hidden" onClick={()=>setSelectedId(null)}/>
            <aside className="fixed bottom-0 inset-x-0 z-40 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl lg:relative lg:bottom-auto lg:inset-x-auto lg:z-auto lg:max-h-full lg:h-full lg:w-80 lg:flex-shrink-0 lg:rounded-none lg:border-l lg:border-gray-200 lg:shadow-none">
              <div className="flex justify-center pt-2.5 pb-1 lg:hidden"><div className="h-1 w-10 rounded-full bg-gray-300"/></div>
              <ShareEventPanel
                event={selected} canEdit={canEdit} guestName={guestName} onGuestNameChange={saveGuestName}
                newComment={newComment} commentSubmitting={commentSubmitting}
                onCommentChange={setNewComment} onAddComment={()=>void addComment()}
                onEdit={()=>openEdit(selected)} onDelete={()=>setConfirmDelId(selected.id)}
                onClose={()=>setSelectedId(null)}/>
            </aside>
          </>
        )}
      </div>

      {/* FAB - mobile EDITOR only */}
      {canEdit&&(
        <button id="share-add-fab" onClick={()=>openAdd()} className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-300 hover:bg-indigo-700 active:scale-95 transition lg:hidden">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
        </button>
      )}

      {/* ─── JOIN CTA BAR ─── */}
      <div id="share-join-cta" className="flex-shrink-0 border-t border-indigo-100 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-white/90">내 캘린더도 만들어보세요 🗓</p>
          <Link href="/register" className="flex-shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700">무료 가입</Link>
        </div>
      </div>

      {/* ─── Day Summary Sheet ─── */}
      {daySummaryDate&&(
        <DaySummarySheet dateStr={daySummaryDate} events={filteredEvents}
          canEdit={canEdit} guestName={guestName}
          onEventClick={id=>{setSelectedId(id);setDaySummaryDate(null);}}
          onNewEvent={()=>{openAdd(daySummaryDate);setDaySummaryDate(null);}}
          onClose={()=>setDaySummaryDate(null)}/>
      )}

      {/* ─── ADD EVENT MODAL ─── */}
      {showAddForm&&(
        <ShareModal title="일정 추가" onClose={()=>setShowAddForm(false)}>
          {/* Guest name */}
          {!guestName&&(
            <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">먼저 이름을 알려주세요</p>
              <input placeholder="홍길동" className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                onBlur={e=>saveGuestName(e.target.value)} defaultValue={guestName}/>
            </div>
          )}
          <div className="space-y-3">
            <input autoFocus value={evTitle} onChange={e=>setEvTitle(e.target.value)} placeholder="일정 제목 *"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={()=>setEvAllDay(v=>!v)} className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${evAllDay?"bg-indigo-600":"bg-gray-300"}`}><span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${evAllDay?"translate-x-4":"translate-x-0"}`}/></button>
                <span className="text-xs font-medium text-gray-600">하루 종일</span>
              </div>
              <div className="flex gap-2">
                <input type="date" value={evDate} onChange={e=>{setEvDate(e.target.value);if(evEndDate<e.target.value)setEvEndDate(e.target.value);}} className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
                {!evAllDay&&<input type="time" value={evTime} onChange={e=>setEvTime(e.target.value)} className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>}
              </div>
              <div>
                <button type="button" onClick={()=>setEvHasEnd(v=>!v)} className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{evHasEnd?"▾ 종료 시간":"▸ 종료 시간 추가"}</button>
                {evHasEnd&&<div className="flex gap-2 mt-1">
                  <input type="date" value={evEndDate} min={evDate} onChange={e=>setEvEndDate(e.target.value)} className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
                  {!evAllDay&&<input type="time" value={evEndTime} onChange={e=>setEvEndTime(e.target.value)} className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>}
                </div>}
              </div>
            </div>
            <AddressField value={evLoc} onChange={setEvLoc} detail={evLocDetail} onDetailChange={setEvLocDetail}/>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 focus-within:border-indigo-400">
              <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              <input value={evUrl} onChange={e=>setEvUrl(e.target.value)} placeholder="링크 URL (선택)" className="flex-1 text-sm outline-none placeholder:text-gray-300"/>
            </div>
            <textarea value={evDesc} onChange={e=>setEvDesc(e.target.value)} placeholder="메모 (선택)" rows={2} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none placeholder:text-gray-300 focus:border-indigo-400"/>
            {!guestName&&<p className="text-xs text-amber-600">⚠️ 이름을 입력해야 일정을 추가할 수 있습니다.</p>}
            <div className="flex gap-2">
              <button type="button" onClick={()=>setShowAddForm(false)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">취소</button>
              <button type="button" onClick={()=>void submitAdd()} disabled={!evTitle.trim()||!evDate||!guestName.trim()||evSubmitting}
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-40 active:scale-[0.99]">{evSubmitting?"추가 중...":"일정 추가"}</button>
            </div>
          </div>
        </ShareModal>
      )}

      {/* ─── EDIT EVENT MODAL ─── */}
      {editId&&(
        <ShareModal title="일정 수정" onClose={()=>setEditId(null)}>
          <div className="space-y-3">
            <input autoFocus value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={()=>setEditAllDay(v=>!v)} className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${editAllDay?"bg-indigo-600":"bg-gray-300"}`}><span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${editAllDay?"translate-x-4":"translate-x-0"}`}/></button>
                <span className="text-xs font-medium text-gray-600">하루 종일</span>
              </div>
              <div className="flex gap-2">
                <input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
                {!editAllDay&&<input type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>}
              </div>
              <div>
                <button type="button" onClick={()=>setEditHasEnd(v=>!v)} className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{editHasEnd?"▾ 종료 시간":"▸ 종료 시간 추가"}</button>
                {editHasEnd&&<div className="flex gap-2 mt-1">
                  <input type="date" value={editEndDate} min={editDate} onChange={e=>setEditEndDate(e.target.value)} className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
                  {!editAllDay&&<input type="time" value={editEndTime} onChange={e=>setEditEndTime(e.target.value)} className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"/>}
                </div>}
              </div>
            </div>
            <AddressField value={editLoc} onChange={setEditLoc} detail={editLocDetail} onDetailChange={setEditLocDetail}/>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 focus-within:border-indigo-400">
              <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              <input value={editUrl} onChange={e=>setEditUrl(e.target.value)} placeholder="링크 URL" className="flex-1 text-sm outline-none placeholder:text-gray-300"/>
            </div>
            <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} placeholder="메모" rows={2} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none placeholder:text-gray-300 focus:border-indigo-400"/>
            <div className="flex gap-2">
              <button type="button" onClick={()=>setEditId(null)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">취소</button>
              <button type="button" onClick={()=>void submitEdit()} disabled={!editTitle.trim()||editSubmitting}
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-40">{editSubmitting?"저장 중...":"저장"}</button>
            </div>
          </div>
        </ShareModal>
      )}

      {/* ─── DELETE CONFIRM ─── */}
      {confirmDelId&&(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100"><svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></div>
              <div><h3 className="font-bold text-gray-900">일정 삭제</h3><p className="text-xs text-gray-400">삭제 후 복구할 수 없습니다.</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setConfirmDelId(null)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700">취소</button>
              <button onClick={()=>void deleteEvent(confirmDelId)} className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function ShareModal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){
  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex justify-center flex-1 sm:hidden"><div className="h-1 w-10 rounded-full bg-gray-200 -mt-2 mb-2"/></div>
          <h2 className="text-base font-bold text-gray-900 sm:block">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ShareMonthView({year,month,today,events,selectedId,canEdit,onDayClick,onEventClick}:{
  year:number;month:number;today:Date;events:EventItem[];selectedId:string|null;canEdit:boolean;
  onDayClick:(d:string)=>void;onEventClick:(id:string)=>void;
}){
  const rows=buildGrid(year,month);
  const rowH=`calc((100dvh - 140px) / ${rows.length})`;
  function eventsOn(day:number){return events.filter(e=>{const d=new Date(e.startAt);return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()===day&&(!e.endAt||sameDay(new Date(e.startAt),new Date(e.endAt)));});}
  return(
    <div className="flex flex-1 flex-col overflow-auto select-none">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-white flex-shrink-0">
        {DAYS_KR.map((d,i)=><div key={d} className={`py-2 text-center text-xs font-semibold ${i===0?"text-red-400":i===6?"text-blue-400":"text-gray-400"}`}>{d}</div>)}
      </div>
      <div className="flex-1">
        {rows.map((row,ri)=>(
          <div key={ri} style={{height:rowH}} className="grid grid-cols-7">
            {row.map((day,ci)=>{
              const isToday=day!==null&&sameDay(new Date(year,month,day),today);
              const dateStr=day!==null?`${year}-${pad(month+1)}-${pad(day)}`:"";
              const dayEvs=day!==null?eventsOn(day):[];
              return(
                <div key={ci} onClick={()=>day!==null&&onDayClick(dateStr)}
                  className={`cursor-pointer border-b border-r border-gray-100 p-0.5 sm:p-1 overflow-hidden transition ${isToday?"bg-blue-50/40":"hover:bg-indigo-50/30 active:bg-indigo-50/60"} ${ci===0?"border-l":""}`}>
                  {day!==null&&(
                    <>
                      <div className="flex justify-center pt-0.5">
                        <span className={`inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs sm:text-sm font-semibold ${isToday?"bg-indigo-600 text-white font-bold":ci===0?"text-red-400":ci===6?"text-blue-400":"text-gray-700"}`}>{day}</span>
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvs.slice(0,2).map(e=>(
                          <button key={e.id} onClick={ev=>{ev.stopPropagation();onEventClick(e.id);}}
                            className={`w-full truncate rounded px-1 py-0.5 text-left text-[10px] sm:text-[11px] font-medium transition active:opacity-60 bg-indigo-100 text-indigo-700 ${selectedId===e.id?"ring-2 ring-indigo-400 ring-offset-1":""}`}>
                            {e.title}
                          </button>
                        ))}
                        {dayEvs.length>2&&<p className="pl-1 text-[9px] sm:text-[10px] text-gray-400">+{dayEvs.length-2}개</p>}
                        {canEdit&&dayEvs.length===0&&<div className="flex justify-center opacity-0 hover:opacity-100 group-hover:opacity-100 mt-0.5"><span className="text-[10px] text-indigo-300">+</span></div>}
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

function ShareListView({events,selectedId,onEventClick}:{events:EventItem[];selectedId:string|null;onEventClick:(id:string)=>void;}){
  const grouped=useMemo(()=>{
    const map=new Map<string,EventItem[]>();
    for(const e of events){const d=new Date(e.startAt),k=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;if(!map.has(k))map.set(k,[]);map.get(k)!.push(e);}
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  },[events]);
  if(!grouped.length)return(<div className="flex flex-1 items-center justify-center"><div className="text-center text-gray-400"><p className="text-4xl mb-2">📅</p><p className="text-sm">일정이 없습니다.</p></div></div>);
  return(
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {grouped.map(([key,dayEvs])=>{
          const d=new Date(key+"T00:00:00"),isToday=sameDay(d,new Date());
          return(
            <div key={key}>
              <div className="mb-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${isToday?"bg-indigo-600 text-white":"bg-gray-100 text-gray-600"}`}>{fmtDate(d.toISOString())}{isToday?" · 오늘":""}</span></div>
              <div className="space-y-2">
                {dayEvs.map(e=>(
                  <button key={e.id} onClick={()=>onEventClick(e.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] ${selectedId===e.id?"border-indigo-400 ring-2 ring-indigo-100":"border-gray-200 hover:border-indigo-200"}`}>
                    <span className="h-3 w-3 flex-shrink-0 rounded-full bg-indigo-500"/>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{e.title}</p>
                      <p className="mt-0.5 text-xs text-gray-400 flex flex-wrap gap-x-2">
                        {e.allDay?<span>하루 종일</span>:<span>{fmtTime(e.startAt)}</span>}
                        {e.location&&<span className="truncate max-w-[160px]">📍 {e.location}</span>}
                      </p>
                    </div>
                    {e.comments.length>0&&<span className="text-xs text-gray-400 flex-shrink-0">💬{e.comments.length}</span>}
                    {e.url&&<a href={e.url} target="_blank" rel="noopener noreferrer" onClick={ev=>ev.stopPropagation()} className="text-xs text-indigo-500 flex-shrink-0">🔗</a>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShareEventPanel({event,canEdit,guestName,onGuestNameChange,newComment,commentSubmitting,onCommentChange,onAddComment,onEdit,onDelete,onClose}:{
  event:EventItem;canEdit:boolean;guestName:string;onGuestNameChange:(n:string)=>void;
  newComment:string;commentSubmitting:boolean;onCommentChange:(v:string)=>void;onAddComment:()=>void;
  onEdit:()=>void;onDelete:()=>void;onClose:()=>void;
}){
  const isMulti=event.endAt&&!sameDay(new Date(event.startAt),new Date(event.endAt));
  return(
    <div>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-600">일정 상세</h2>
        <div className="flex items-center gap-1">
          {canEdit&&<button onClick={onEdit} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>}
          {canEdit&&<button onClick={onDelete} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>}
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 leading-snug">{event.title}</h3>
        <div className="mt-2.5 space-y-2">
          {event.allDay
            ? <p className="flex items-center gap-2 text-sm text-gray-600"><svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>{fmtDate(event.startAt)} · 하루 종일</p>
            : <p className="flex items-center gap-2 text-sm text-gray-600"><svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{fmtDate(event.startAt)} {fmtTime(event.startAt)}{event.endAt?<> ~{isMulti?` ${fmtDate(event.endAt)}`:""} {fmtTime(event.endAt)}</>:null}</p>
          }
          {event.location&&<p className="flex items-center gap-2 text-sm text-gray-600"><svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>{event.location}</p>}
          {event.url&&<a href={event.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"><svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg><span className="truncate">{event.url}</span></a>}
        </div>
        {event.description&&<div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5"><p className="text-xs leading-relaxed text-gray-500 whitespace-pre-wrap">{event.description}</p></div>}
        <p className="mt-2 text-[11px] text-gray-400">작성: {event.createdBy?.name??"알 수 없음"}</p>
        {/* Join CTA */}
        <div className="mt-3 rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-center">
          <p className="text-xs text-indigo-600 mb-2">내 캘린더를 만들고 싶으신가요?</p>
          <Link href="/register" className="text-xs font-bold text-indigo-700 underline">무료로 SyncNest 시작하기</Link>
        </div>
      </div>
      {/* Comments */}
      <div className="border-t border-gray-100 p-4">
        <p className="mb-3 text-xs font-semibold text-gray-500">댓글{event.comments.length>0?` (${event.comments.length})`:""}</p>
        {!guestName&&<div className="mb-3 rounded-xl bg-amber-50 border border-amber-100 p-2.5"><p className="text-xs text-amber-700 mb-1.5">댓글을 달려면 이름을 알려주세요</p><input placeholder="이름 입력" className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none" onBlur={e=>onGuestNameChange(e.target.value)}/></div>}
        {event.comments.length===0?<p className="text-xs text-gray-400 mb-3">첫 댓글을 남겨보세요.</p>:(
          <div className="space-y-2.5 mb-3">
            {event.comments.map(c=>(
              <div key={c.id} className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-500">{c.author.name}<span className="ml-1.5 font-normal text-gray-400">{new Date(c.createdAt).toLocaleString("ko-KR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false})}</span></p>
                <p className="mt-1 text-sm text-gray-700">{c.content}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <AutoTextarea value={newComment} onChange={e=>onCommentChange(e.target.value)}
            onKeyDown={(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();onAddComment();}}}
            placeholder="댓글 입력... (Shift+Enter 줄바꿈)" minRows={1}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 max-h-32"/>
          <button onClick={onAddComment} disabled={!newComment.trim()||commentSubmitting||!guestName} className="flex-shrink-0 rounded-xl bg-indigo-600 p-2.5 text-white disabled:opacity-40 mb-[1px]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function DaySummarySheet({dateStr,events,canEdit,guestName,onEventClick,onNewEvent,onClose}:{
  dateStr:string;events:EventItem[];canEdit:boolean;guestName:string;
  onEventClick:(id:string)=>void;onNewEvent:()=>void;onClose:()=>void;
}){
  const d=new Date(dateStr+"T00:00:00");
  const dayEvs=events.filter(e=>{const ed=new Date(e.startAt);return ed.getFullYear()===d.getFullYear()&&ed.getMonth()===d.getMonth()&&ed.getDate()===d.getDate();});
  return(
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}/>
      <div className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-white shadow-2xl">
        <div className="flex justify-center pt-3 pb-2"><div className="h-1 w-10 rounded-full bg-gray-300"/></div>
        <div className="flex items-center justify-between px-5 pb-3">
          <div><h3 className="text-base font-bold text-gray-900">{d.getFullYear()}년 {MONTHS[d.getMonth()]} {d.getDate()}일</h3><p className="text-xs text-gray-400">{DAYS_KR[d.getDay()]}요일{dayEvs.length>0?` · ${dayEvs.length}개`:""}</p></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div className="max-h-60 overflow-y-auto px-4 space-y-2 pb-2">
          {dayEvs.length===0?<p className="py-4 text-center text-sm text-gray-400">이 날 일정이 없습니다.</p>:dayEvs.map(e=>(
            <button key={e.id} onClick={()=>onEventClick(e.id)}
              className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-indigo-200 hover:bg-indigo-50 transition active:scale-[0.98]">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-indigo-500"/>
              <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 truncate">{e.title}</p><p className="text-xs text-gray-400">{e.allDay?"하루 종일":fmtTime(e.startAt)}{e.location?` · 📍${e.location}`:""}</p></div>
            </button>
          ))}
        </div>
        {canEdit&&(
          <div className="p-4 border-t border-gray-100">
            <button onClick={onNewEvent} className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white active:scale-[0.98] transition">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              이 날 일정 추가
            </button>
          </div>
        )}
      </div>
    </>
  );
}

