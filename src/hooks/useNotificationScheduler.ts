"use client";
import { useEffect, useRef } from "react";
import { playSound, type SoundType } from "@/lib/notification-sound";

type EventLike = {
  id: string;
  title: string;
  startAt: string;
  allDay?: boolean;
  location?: string | null;
  reminderMinutes?: string | null;
};

const NOTIFIED_KEY = "syncnest_notified_v2";

function getNotifiedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? "[]") as string[]); }
  catch { return new Set(); }
}
function addNotified(key: string) {
  const set = getNotifiedSet();
  set.add(key);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(set).slice(-300)));
}

/** Service Worker에 알림 스케줄 전송 */
async function scheduleViaSW(id: string, title: string, body: string, delayMs: number) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "SCHEDULE_NOTIFICATION", payload: { id, title, body, delayMs } });
  } catch {}
}
async function cancelViaSW(id: string) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "CANCEL_NOTIFICATION", payload: { id } });
  } catch {}
}

export function useNotificationScheduler(
  events: EventLike[],
  soundType: SoundType,
  volume: number,
  enabled: boolean,
) {
  const soundRef = useRef(soundType);
  const volRef = useRef(volume);
  soundRef.current = soundType;
  volRef.current = volume;

  // 스케줄된 타이머 ID 추적 (foreground용)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const now = Date.now();
    const notified = getNotifiedSet();
    const newTimers = new Map<string, ReturnType<typeof setTimeout>>();

    // 이전 타이머 제거
    timersRef.current.forEach(t => clearTimeout(t));

    for (const e of events) {
      if (!e.reminderMinutes || e.allDay) continue;
      const mins = e.reminderMinutes.split(",").map(Number).filter(Boolean);
      const eventTime = new Date(e.startAt).getTime();

      for (const m of mins) {
        const notifyAt = eventTime - m * 60 * 1000;
        const key = `${e.id}:${m}`;
        if (notified.has(key)) continue;
        const delayMs = notifyAt - now;
        if (delayMs < -60_000) continue; // 1분 이상 지난 건 스킵

        const timeLabel = m >= 1440 ? `${m / 1440}일` : m >= 60 ? `${m / 60}시간` : `${m}분`;
        const body = [`⏰ ${timeLabel} 후 시작`, e.location ? `📍 ${e.location}` : null].filter(Boolean).join(" · ");

        if (delayMs <= 0) {
          // 즉시 발송
          addNotified(key);
          void triggerNotification(e.title, body, soundRef.current, volRef.current);
        } else {
          // Service Worker에 스케줄 (백그라운드 지원)
          void scheduleViaSW(key, `⏰ ${e.title}`, body, delayMs);

          // foreground fallback timer
          const tid = setTimeout(() => {
            if (!getNotifiedSet().has(key)) {
              addNotified(key);
              void triggerNotification(e.title, body, soundRef.current, volRef.current);
            }
            newTimers.delete(key);
          }, delayMs);
          newTimers.set(key, tid);
        }
      }
    }

    timersRef.current = newTimers;

    return () => {
      newTimers.forEach(t => clearTimeout(t));
    };
  }, [events, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

async function triggerNotification(title: string, body: string, sound: SoundType, volume: number) {
  // 브라우저 Notification API
  if ("Notification" in window) {
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(`⏰ ${title}`, { body, icon: "/favicon.ico" });
      } catch {
        const n = new Notification(`⏰ ${title}`, { body, icon: "/favicon.ico" });
        setTimeout(() => n.close(), 8000);
      }
    }
  }
  // 소리
  playSound(sound, volume);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const p = await Notification.requestPermission();
  return p === "granted";
}
