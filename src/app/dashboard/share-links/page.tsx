"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { calDotParts, resolveCalendarColor as colOf } from "@/lib/calendar-colors";

type Visitor = {
  id: string;
  visitorKey: string;
  firstSeenAt: string;
  lastSeenAt: string;
  accessCount: number;
  ownerLabel: string | null;
  guestDisplayName?: string | null;
  approvalStatus?: string;
  guestRole?: string | null;
};

type CalLink = {
  id: string;
  token: string;
  shareRole: string;
  guestApprovalRequired?: boolean;
  label: string | null;
  expiresAt: string | null;
  createdAt: string;
  visitors: Visitor[];
};

type CalBlock = {
  calendarId: string;
  calendarName: string;
  color: string;
  links: CalLink[];
};

type MultiRow = {
  id: string;
  token: string;
  shareRole: string;
  guestApprovalRequired?: boolean;
  expiresAt: string | null;
  createdAt: string;
  calendarNames: string[];
  visitors: Visitor[];
};

function recentLabel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 120_000) return "방금 접속";
  if (diff < 3_600_000) return "1시간 내";
  return null;
}

export default function ShareLinksManagePage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{ calendars: CalBlock[]; multiShares: MultiRow[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/account/share-overview", { cache: "no-store" });
    if (!res.ok) {
      setErr("불러오지 못했어요.");
      return;
    }
    const d = (await res.json()) as { calendars: CalBlock[]; multiShares: MultiRow[] };
    setData(d);
    setErr(null);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") void load();
  }, [status, load]);

  async function patchVisitor(multiShareId: string, visitorId: string, ownerLabel: string) {
    await fetch(`/api/account/multi-shares/${multiShareId}/visitors/${visitorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerLabel }),
    });
    void load();
  }

  async function patchCalVisitor(calendarId: string, linkId: string, visitorId: string, ownerLabel: string) {
    await fetch(`/api/calendars/${calendarId}/share-links/${linkId}/visitors/${visitorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerLabel }),
    });
    void load();
  }

  async function patchCalVisitorMeta(
    calendarId: string,
    linkId: string,
    visitorId: string,
    body: { approvalStatus?: "APPROVED" | "REVOKED"; guestRole?: "VIEWER" | "EDITOR" | null },
  ) {
    await fetch(`/api/calendars/${calendarId}/share-links/${linkId}/visitors/${visitorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    void load();
  }

  async function patchLinkGuestFlag(calendarId: string, linkId: string, guestApprovalRequired: boolean) {
    await fetch(`/api/calendars/${calendarId}/share-links/${linkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestApprovalRequired }),
    });
    void load();
  }

  async function patchMsVisitorMeta(
    multiShareId: string,
    visitorId: string,
    body: { approvalStatus?: "APPROVED" | "REVOKED"; guestRole?: "VIEWER" | "EDITOR" | null },
  ) {
    await fetch(`/api/account/multi-shares/${multiShareId}/visitors/${visitorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    void load();
  }

  async function patchMsGuestFlag(multiShareId: string, guestApprovalRequired: boolean) {
    await fetch(`/api/account/multi-shares/${multiShareId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestApprovalRequired }),
    });
    void load();
  }

  if (status === "loading" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600">
            ← 대시보드
          </Link>
          <h1 className="text-base font-bold text-gray-900">공유 링크 관리</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {err && <p className="text-sm text-red-600">{err}</p>}

        <p className="text-sm text-gray-600">
          캘린더별 비회원 링크와 동시 공유 링크를 한곳에서 확인하세요. 접속이 찍힌 뒤 게스트 이름을 붙이면 구분하기 쉬워요.
        </p>

        {data.calendars.map(block => (
          <section key={block.calendarId} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              {(() => {
                const d = calDotParts(colOf(block.color), "h-3 w-3 rounded-full");
                return <span className={d.className} style={d.style} />;
              })()}
              <h2 className="text-sm font-bold text-gray-900">{block.calendarName}</h2>
              <Link href="/dashboard" className="ml-auto text-[11px] font-semibold text-indigo-600">
                대시보드에서 링크 만들기 →
              </Link>
            </div>
            {block.links.length === 0 ? (
              <p className="text-xs text-gray-400">활성 링크가 없어요. 대시보드 → 해당 캘린더 멤버 관리에서 새 링크를 만드세요.</p>
            ) : (
              <ul className="space-y-3">
                {block.links.map(link => (
                  <li key={link.id} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-xs">
                    <p className="font-semibold text-gray-800">{link.label || "이름 없는 링크"}</p>
                    <p className="mt-0.5 break-all text-gray-500">
                      {typeof window !== "undefined" ? window.location.origin : ""}/share/{link.token}
                    </p>
                    <p className="mt-0.5 text-indigo-600">
                      {link.shareRole === "EDITOR" ? "편집" : "보기"} ·{" "}
                      {link.expiresAt ? `${new Date(link.expiresAt).toLocaleDateString("ko-KR")} 만료` : "기한 없음"} ·{" "}
                      {link.guestApprovalRequired === true ? "승인 필요" : "바로 열람"}
                    </p>
                    <button
                      type="button"
                      onClick={() => void patchLinkGuestFlag(block.calendarId, link.id, link.guestApprovalRequired !== true)}
                      className="mt-1 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[10px] font-semibold text-indigo-700"
                    >
                      {link.guestApprovalRequired === true ? "바로 열람으로 전환" : "승인 필요로 전환"}
                    </button>
                    {link.visitors.length > 0 ? (
                      <div className="mt-2 border-t border-gray-200 pt-2">
                        <p className="mb-1 text-[10px] font-bold uppercase text-gray-400">접속</p>
                        {link.visitors.map(v => (
                          <div key={v.id} className="mb-2 rounded border border-gray-100 bg-white p-2">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <input
                              defaultValue={v.ownerLabel ?? ""}
                              onBlur={e => {
                                const t = e.target.value.trim();
                                if (t !== (v.ownerLabel ?? "")) void patchCalVisitor(block.calendarId, link.id, v.id, t);
                              }}
                              placeholder="게스트 이름"
                              className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px]"
                            />
                            <span className="text-[10px] text-gray-400">
                              첫 방문 {new Date(v.firstSeenAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}{" "}
                              · {v.accessCount}회
                            </span>
                            {recentLabel(v.lastSeenAt) && (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                {recentLabel(v.lastSeenAt)}
                              </span>
                            )}
                            </div>
                            {(v.guestDisplayName || v.approvalStatus) && (
                              <p className="mb-1 text-[10px] text-gray-500">
                                요청: {v.guestDisplayName ?? "—"} {v.approvalStatus && <>· {v.approvalStatus}</>}
                              </p>
                            )}
                            {link.guestApprovalRequired === true && (
                              <div className="flex flex-wrap gap-1">
                                {v.approvalStatus === "PENDING" && (
                                  <button type="button" className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white" onClick={() => void patchCalVisitorMeta(block.calendarId, link.id, v.id, { approvalStatus: "APPROVED" })}>승인</button>
                                )}
                                {v.approvalStatus !== "REVOKED" && (
                                  <button type="button" className="rounded border border-red-200 px-2 py-0.5 text-[10px] text-red-600" onClick={() => void patchCalVisitorMeta(block.calendarId, link.id, v.id, { approvalStatus: "REVOKED" })}>차단</button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[10px] text-gray-400">아직 접속 기록이 없어요. 링크를 열면 여기에 표시돼요.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {data.multiShares.length > 0 && (
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-indigo-900">동시 공유 링크</h2>
            <ul className="space-y-3">
              {data.multiShares.map(ms => (
                <li key={ms.id} className="rounded-xl border border-indigo-100 bg-white p-3 text-xs">
                  <p className="font-medium text-gray-800">{ms.calendarNames.join(", ") || "캘린더"}</p>
                  <p className="mt-0.5 break-all text-gray-500">
                    {typeof window !== "undefined" ? window.location.origin : ""}/multi-share/{ms.token}
                  </p>
                  <p className="mt-0.5 text-indigo-600">
                    {ms.shareRole === "EDITOR" ? "편집" : "보기"} · {ms.expiresAt ? `${new Date(ms.expiresAt).toLocaleDateString("ko-KR")} 만료` : "기한 없음"} ·{" "}
                    {ms.guestApprovalRequired === true ? "승인 필요" : "바로 열람"}
                  </p>
                  <button type="button" onClick={() => void patchMsGuestFlag(ms.id, ms.guestApprovalRequired !== true)} className="mt-1 rounded-lg border border-indigo-200 bg-indigo-50/50 px-2 py-1 text-[10px] font-semibold text-indigo-800">
                    {ms.guestApprovalRequired === true ? "바로 열람으로 전환" : "승인 필요로 전환"}
                  </button>
                  {ms.visitors.length > 0 ? (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      {ms.visitors.map(v => (
                        <div key={v.id} className="mb-2 rounded border border-gray-100 bg-gray-50/80 p-2">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <input
                            defaultValue={v.ownerLabel ?? ""}
                            onBlur={e => {
                              const t = e.target.value.trim();
                              if (t !== (v.ownerLabel ?? "")) void patchVisitor(ms.id, v.id, t);
                            }}
                            placeholder="게스트 이름"
                            className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-[11px]"
                          />
                          <span className="text-[10px] text-gray-400">
                            {v.accessCount}회 · 최근 {new Date(v.lastSeenAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {recentLabel(v.lastSeenAt) && (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                              {recentLabel(v.lastSeenAt)}
                            </span>
                          )}
                        </div>
                        {(v.guestDisplayName || v.approvalStatus) && (
                          <p className="mb-1 text-[10px] text-gray-500">요청: {v.guestDisplayName ?? "—"} {v.approvalStatus && <>· {v.approvalStatus}</>}</p>
                        )}
                        {ms.guestApprovalRequired === true && (
                          <div className="flex flex-wrap gap-1">
                            {v.approvalStatus === "PENDING" && (
                              <button type="button" className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white" onClick={() => void patchMsVisitorMeta(ms.id, v.id, { approvalStatus: "APPROVED" })}>승인</button>
                            )}
                            {v.approvalStatus !== "REVOKED" && (
                              <button type="button" className="rounded border border-red-200 bg-white px-2 py-0.5 text-[10px] text-red-600" onClick={() => void patchMsVisitorMeta(ms.id, v.id, { approvalStatus: "REVOKED" })}>차단</button>
                            )}
                          </div>
                        )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[10px] text-gray-400">접속 기록 없음</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
