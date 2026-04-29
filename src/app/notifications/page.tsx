"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Notif = {
  id: string;
  type: string;
  actorName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  calendarId?: string | null;
  eventId?: string | null;
  snapshot?: string | null;
};

function typeIcon(type: string) {
  if (type === "event_created") return "📅";
  if (type === "event_edited") return "✏️";
  if (type === "event_deleted") return "🗑️";
  if (type === "comment_added") return "💬";
  return "🔔";
}

function relTime(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const d = (await res.json()) as { notifications?: Notif[] };
      setNotifs(d.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status === "authenticated") void load();
  }, [status, load, router]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "DELETE" });
    setNotifs(p => p.map(n => ({ ...n, isRead: true })));
  }

  async function rollback(id: string) {
    setRolling(id);
    try {
      const res = await fetch(`/api/notifications/${id}/rollback`, { method: "POST" });
      const d = (await res.json()) as { ok?: boolean; type?: string; error?: string };
      if (res.ok && d.ok) {
        alert(d.type === "restored" ? "✅ 삭제된 일정이 복원됐어요." : "✅ 이전 상태로 롤백됐어요.");
        void load();
      } else {
        alert(d.error ?? "롤백에 실패했어요.");
      }
    } finally { setRolling(null); }
  }

  async function deleteEventFromNotif(id: string) {
    if (!confirm("이 일정을 완전히 삭제할까요?\n수정 전 내용으로 되돌리려면 '이전으로 되돌리기'를 먼저 고려해 주세요.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/notifications/${id}/delete-event`, { method: "POST" });
      const d = (await res.json()) as { ok?: boolean; error?: string; alreadyDeleted?: boolean };
      if (res.ok && d.ok) {
        alert(d.alreadyDeleted ? "이미 삭제된 일정이에요." : "✅ 일정을 삭제했어요.");
        void load();
      } else {
        alert(d.error ?? "삭제에 실패했어요.");
      }
    } catch {
      alert("오류가 발생했어요.");
    } finally {
      setDeletingId(null);
    }
  }

  const unread = notifs.filter(n => !n.isRead).length;

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3.5 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/dashboard" className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">알림</h1>
            {unread > 0 && <p className="text-[11px] text-indigo-500 font-medium">읽지 않은 알림 {unread}개</p>}
          </div>
          {unread > 0 && (
            <button onClick={() => void markAllRead()}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition">
              모두 읽음
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 space-y-2">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-5xl">🔕</div>
            <p className="text-base font-semibold text-gray-600">알림이 없어요</p>
            <p className="mt-1 text-sm text-gray-400">공유 캘린더에서 활동이 생기면 여기에 표시돼요.</p>
          </div>
        ) : (
          notifs.map(n => {
            let wasDeleted: boolean | undefined;
            if (n.snapshot) {
              try { wasDeleted = (JSON.parse(n.snapshot) as { _deleted?: boolean })._deleted; } catch { wasDeleted = undefined; }
            }
            return (
            <div key={n.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition ${n.isRead ? "border-gray-100 opacity-70" : "border-indigo-100 bg-indigo-50/30"}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-lg ${n.isRead ? "bg-gray-100" : "bg-indigo-100"}`}>
                  {typeIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed">{n.message}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-indigo-500">{n.actorName}</span>
                    <span className="text-[10px] text-gray-400">{relTime(n.createdAt)}</span>
                    {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"/>}
                  </div>
                  {n.snapshot && (n.type === "event_edited" || n.type === "event_deleted") && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" onClick={() => void rollback(n.id)} disabled={rolling === n.id || deletingId === n.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition">
                          {rolling === n.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-amber-500 border-t-transparent"/>
                          ) : "↩️"}
                          {rolling === n.id ? "처리 중…" : wasDeleted ? "삭제된 일정 복원" : "이전으로 되돌리기"}
                        </button>
                        {n.type === "event_edited" && (
                          <button type="button" onClick={() => void deleteEventFromNotif(n.id)} disabled={rolling === n.id || deletingId === n.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition">
                            {deletingId === n.id ? (
                              <span className="h-3 w-3 animate-spin rounded-full border border-red-500 border-t-transparent"/>
                            ) : "🗑️"}
                            {deletingId === n.id ? "삭제 중…" : "일정 삭제"}
                          </button>
                        )}
                      </div>
                  )}
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
