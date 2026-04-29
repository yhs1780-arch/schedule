"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: {
        q?: string;
        oncomplete: (d: { roadAddress: string; jibunAddress: string }) => void;
        width?: string | number;
        height?: string | number;
      }) => { open(): void; embed(el: HTMLElement, opts?: { autoClose?: boolean }): void };
    };
  }
}

type PlaceDoc = {
  place_name?: string;
  road_address_name?: string;
  address_name?: string;
  category_name?: string;
};

function useVisualViewportOffset(active: boolean) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setOffset(inset);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return offset;
}

export function AddressField({
  value,
  onChange,
  detail,
  onDetailChange,
}: {
  value: string;
  onChange: (v: string) => void;
  detail: string;
  onDetailChange: (v: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"postcode" | "place">("postcode");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeResults, setPlaceResults] = useState<PlaceDoc[]>([]);
  const [placeHint, setPlaceHint] = useState<string | null>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const placeQueryRef = useRef(placeQuery);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeSearchEpoch = useRef(0);
  const placeInputRef = useRef<HTMLInputElement>(null);
  const keyboardInset = useVisualViewportOffset(modalOpen);

  useEffect(() => {
    placeQueryRef.current = placeQuery;
  }, [placeQuery]);

  const runPlaceSearch = useCallback(async () => {
    const q = placeQueryRef.current.trim();
    if (q.length < 2) return;
    const epoch = ++placeSearchEpoch.current;
    setPlaceLoading(true);
    setPlaceHint(null);
    setPlaceResults([]);
    try {
      const res = await fetch(`/api/local-search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { configured?: boolean; documents?: PlaceDoc[] };
      if (epoch !== placeSearchEpoch.current) return;
      if (data.configured === false) {
        setPlaceHint("no_key");
        return;
      }
      setPlaceResults(data.documents ?? []);
      if (!(data.documents?.length)) setPlaceHint("empty");
    } catch {
      if (epoch === placeSearchEpoch.current) setPlaceHint("error");
    } finally {
      if (epoch === placeSearchEpoch.current) setPlaceLoading(false);
    }
  }, []);

  function clearDebounce() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }

  function searchPlaceNow() {
    clearDebounce();
    void runPlaceSearch();
  }

  function onPlaceQueryInput(next: string) {
    setPlaceQuery(next);
    if (next.trim().length < 2) {
      clearDebounce();
      setPlaceResults([]);
      setPlaceHint(null);
      setPlaceLoading(false);
    }
  }

  function closeModal() {
    clearDebounce();
    setPlaceQuery("");
    setPlaceResults([]);
    setPlaceHint(null);
    setPlaceLoading(false);
    setModalOpen(false);
  }

  useEffect(() => {
    if (!modalOpen || activeTab !== "place") {
      clearDebounce();
      return;
    }
    const q = placeQuery.trim();
    if (q.length < 2) return;
    clearDebounce();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runPlaceSearch();
    }, 420);
    return () => clearDebounce();
  }, [placeQuery, modalOpen, activeTab, runPlaceSearch]);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen || activeTab !== "place") return;
    const t = window.setTimeout(() => {
      const el = placeInputRef.current;
      if (!el) return;
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }, 200);
    return () => clearTimeout(t);
  }, [modalOpen, activeTab]);

  function mountEmbed(q?: string) {
    const el = embedRef.current;
    if (!el) return;
    el.innerHTML = "";
    const run = () => {
      new window.daum!.Postcode({
        q: q?.trim() || undefined,
        oncomplete(data) {
          onChange(data.roadAddress || data.jibunAddress);
          closeModal();
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
    if (!modalOpen || activeTab !== "postcode") return;
    const t = setTimeout(() => mountEmbed(value || undefined), 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, activeTab]);

  function pickPlace(doc: PlaceDoc) {
    const main = doc.road_address_name || doc.address_name || "";
    const name = doc.place_name?.trim() || "";
    const line = name && main ? `${name} — ${main}` : name || main;
    onChange(line.trim());
    closeModal();
  }

  function openModal(tab: "postcode" | "place" = "postcode") {
    setActiveTab(tab);
    setModalOpen(true);
  }

  const safeBottom = "max(0.75rem, env(safe-area-inset-bottom, 0px))";

  return (
    <>
      {!value ? (
        <button
          type="button"
          onClick={() => openModal("postcode")}
          className="group flex min-h-12 w-full touch-manipulation items-center gap-2.5 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-left text-sm text-gray-400 transition active:bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-500 sm:min-h-0"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base group-hover:bg-indigo-100">
            📍
          </span>
          <div>
            <p className="text-sm font-medium group-hover:text-indigo-600">위치 추가</p>
            <p className="text-[10px] text-gray-300 sm:text-[10px]">도로명·지번 / 장소·역 검색</p>
          </div>
        </button>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 text-base">📍</span>
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => openModal("postcode")} className="w-full touch-manipulation text-left">
                <p className="text-sm font-semibold leading-snug text-gray-800 transition hover:text-indigo-600">{value}</p>
                {detail ? <p className="mt-0.5 text-xs text-gray-500">{detail}</p> : null}
              </button>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1.5">
              <a
                href={`https://map.kakao.com/link/search/${encodeURIComponent(value)}`}
                target="_blank"
                rel="noreferrer"
                title="카카오맵에서 보기"
                className="flex min-h-9 min-w-[2.75rem] touch-manipulation items-center justify-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-700 transition active:scale-[0.98] hover:bg-amber-50"
              >
                🗺️ 지도
              </a>
              <button
                type="button"
                onClick={() => openModal("postcode")}
                title="주소 변경"
                className="min-h-9 touch-manipulation rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-500 transition active:bg-gray-100 hover:bg-gray-50"
              >
                변경
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  onDetailChange("");
                }}
                className="min-h-9 min-w-9 touch-manipulation rounded-lg p-2 text-gray-300 transition hover:bg-red-50 hover:text-red-400"
                aria-label="위치 삭제"
              >
                <svg className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <input
            value={detail}
            onChange={e => onDetailChange(e.target.value)}
            placeholder="상세 주소 입력 (동/호수/층·선택)"
            className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base outline-none placeholder:text-gray-300 focus:border-indigo-400 sm:min-h-0 sm:text-xs"
          />
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[3000] flex flex-col items-stretch justify-end sm:items-center sm:justify-center"
          style={{ padding: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-field-title"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => closeModal()} />
          <div
            className="relative z-10 flex w-full max-h-[100dvh] flex-col bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
            style={{
              borderRadius: "1.25rem 1.25rem 0 0",
              marginBottom: keyboardInset ? 0 : undefined,
              transform: keyboardInset ? `translateY(-${keyboardInset}px)` : undefined,
              transition: "transform 0.15s ease-out",
              paddingBottom: keyboardInset > 0 ? undefined : safeBottom,
              maxHeight: keyboardInset > 0 ? `min(92dvh, calc(100dvh - ${keyboardInset}px))` : "min(640px, 92dvh)",
              touchAction: "manipulation",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <h3 id="address-field-title" className="text-base font-bold text-gray-900 sm:text-sm">
                    위치 검색
                  </h3>
                  <p className="text-[11px] text-gray-400 sm:text-[10px]">주소는 우편번호 · 장소는 키워드</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => closeModal()}
                className="min-h-11 min-w-11 touch-manipulation rounded-xl p-2 text-gray-400 hover:bg-gray-100"
                aria-label="닫기"
              >
                <svg className="mx-auto h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-shrink-0 gap-1.5 border-b border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={() => setActiveTab("postcode")}
                className={`min-h-12 flex-1 touch-manipulation rounded-xl py-2.5 text-sm font-semibold sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-xs ${activeTab === "postcode" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                도로명·지번
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("place")}
                className={`min-h-12 flex-1 touch-manipulation rounded-xl py-2.5 text-sm font-semibold sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-xs ${activeTab === "place" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                장소·역
              </button>
            </div>

            {activeTab === "postcode" ? (
              <div ref={embedRef} className="min-h-0 flex-1 overflow-hidden overscroll-contain" style={{ minHeight: "min(55dvh, 420px)" }} />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="sticky top-0 z-20 flex-shrink-0 border-b border-gray-100 bg-white px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                  <div className="flex gap-2">
                    <input
                      ref={placeInputRef}
                      value={placeQuery}
                      onChange={e => onPlaceQueryInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          searchPlaceNow();
                        }
                      }}
                      placeholder="예: 강남역 2호선, 스타벅스 ○○점"
                      inputMode="search"
                      enterKeyHint="search"
                      autoComplete="off"
                      autoCorrect="off"
                      className="min-h-12 min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-base outline-none focus:border-indigo-400 sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => searchPlaceNow()}
                      disabled={placeLoading || placeQuery.trim().length < 2}
                      className="min-h-12 flex-shrink-0 touch-manipulation rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40 sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs"
                    >
                      {placeLoading ? "…" : "검색"}
                    </button>
                  </div>
                  <p className="mt-1.5 px-0.5 text-[11px] text-gray-400">입력하면 자동 검색 · 엔터로 바로 검색</p>
                </div>
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {placeHint === "no_key" && (
                    <p className="px-2 py-3 text-center text-sm leading-relaxed text-gray-500 sm:text-xs">
                      장소 검색을 쓰려면 서버에 <strong className="text-gray-700">KAKAO_REST_API_KEY</strong>를 설정하세요.
                      <br />
                      우편번호 탭으로 주소만 선택할 수 있어요.
                    </p>
                  )}
                  {placeHint === "empty" && <p className="px-2 py-4 text-center text-sm text-gray-400 sm:text-xs">검색 결과가 없어요.</p>}
                  {placeHint === "error" && <p className="px-2 py-4 text-center text-sm text-red-500 sm:text-xs">검색 중 오류가 났어요.</p>}
                  {placeLoading && placeResults.length === 0 && !placeHint && (
                    <p className="px-2 py-6 text-center text-sm text-gray-400 sm:text-xs">검색 중…</p>
                  )}
                  {placeResults.map((doc, i) => (
                    <button
                      key={`${doc.place_name}-${i}`}
                      type="button"
                      onClick={() => pickPlace(doc)}
                      className="mb-2 w-full touch-manipulation rounded-xl border border-gray-100 bg-white p-3.5 text-left transition last:mb-1 active:scale-[0.99] active:bg-indigo-50 sm:mb-1.5 sm:p-3 sm:active:scale-100"
                    >
                      <p className="text-base font-semibold text-gray-900 sm:text-sm">{doc.place_name}</p>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500 sm:text-[11px]">
                        {[doc.category_name, doc.road_address_name || doc.address_name].filter(Boolean).join(" · ")}
                      </p>
                    </button>
                  ))}
                </div>
             </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
