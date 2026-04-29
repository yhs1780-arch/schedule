"use client";

import { isValidShareVisitorKey, newShareVisitorKey, SHARE_VISITOR_STORAGE_KEY } from "@/lib/share-visitor-key";

/** 브라우저별 익명 방문자 ID (공유/멀티공유 API 헤더용) */
export function getOrCreateShareVisitorId(): string {
  if (typeof window === "undefined") return "";
  let v = localStorage.getItem(SHARE_VISITOR_STORAGE_KEY);
  if (!isValidShareVisitorKey(v)) {
    v = newShareVisitorKey();
    localStorage.setItem(SHARE_VISITOR_STORAGE_KEY, v);
  }
  return v!;
}

export function shareApiFetch(path: string, init?: RequestInit) {
  const id = getOrCreateShareVisitorId();
  const headers = new Headers(init?.headers);
  if (id) headers.set("X-Share-Visitor", id);
  return fetch(path, { ...init, headers });
}
