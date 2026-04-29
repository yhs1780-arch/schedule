"use client";

import { useEffect, useRef, useState } from "react";

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
    if (!modalOpen || activeTab !== "postcode") return;
    const t = setTimeout(() => mountEmbed(value || undefined), 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, activeTab]);

  async function runPlaceSearch() {
    const q = placeQuery.trim();
    if (q.length < 2) return;
    setPlaceLoading(true);
    setPlaceHint(null);
    setPlaceResults([]);
    try {
      const res = await fetch(`/api/local-search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { configured?: boolean; documents?: PlaceDoc[] };
      if (data.configured === false) {
        setPlaceHint("no_key");
        return;
      }
      setPlaceResults(data.documents ?? []);
      if (!(data.documents?.length)) setPlaceHint("empty");
    } catch {
      setPlaceHint("error");
    } finally {
      setPlaceLoading(false);
    }
  }

  function pickPlace(doc: PlaceDoc) {
    const main = doc.road_address_name || doc.address_name || "";
    const name = doc.place_name?.trim() || "";
    const line = name && main ? `${name} — ${main}` : name || main;
    onChange(line.trim());
    setModalOpen(false);
    setPlaceResults([]);
    setPlaceQuery("");
  }

  return (
    <>
      {!value ? (
        <button
          type="button"
          onClick={() => {
            setActiveTab("postcode");
            setModalOpen(true);
          }}
          className="group flex w-full items-center gap-2.5 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-left text-sm text-gray-400 transition hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-500"
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base group-hover:bg-indigo-100">
            📍
          </span>
          <div>
            <p className="text-sm font-medium group-hover:text-indigo-600">위치 추가</p>
            <p className="text-[10px] text-gray-300">도로명·지번 / 장소·역 검색</p>
          </div>
        </button>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0 text-base">📍</span>
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => setModalOpen(true)} className="w-full text-left">
                <p className="text-sm font-semibold leading-snug text-gray-800 transition hover:text-indigo-600">{value}</p>
                {detail ? <p className="mt-0.5 text-xs text-gray-500">{detail}</p> : null}
              </button>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <a
                href={`https://map.kakao.com/link/search/${encodeURIComponent(value)}`}
                target="_blank"
                rel="noreferrer"
                title="카카오맵에서 보기"
                className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-1 text-[10px] font-bold text-amber-700 transition hover:bg-amber-50"
              >
                🗺️ 지도
              </a>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                title="주소 변경"
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-500 transition hover:bg-gray-50"
              >
                변경
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  onDetailChange("");
                }}
                className="rounded-lg p-1 text-gray-300 transition hover:bg-red-50 hover:text-red-400"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <input
            value={detail}
            onChange={e => onDetailChange(e.target.value)}
            placeholder="상세 주소 입력 (동/호수/층 등, 선택)"
            className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none placeholder:text-gray-300 focus:border-indigo-400"
          />
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-end sm:justify-center" style={{ padding: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div
            className="relative z-10 flex w-full flex-col bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
            style={{ height: "min(600px, 88dvh)", borderRadius: "20px 20px 0 0" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">위치 검색</h3>
                  <p className="text-[10px] text-gray-400">주소는 우편번호 · 장소는 키워드</p>
                </div>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-shrink-0 gap-1 border-b border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={() => setActiveTab("postcode")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold ${activeTab === "postcode" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                도로명·지번
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("place")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold ${activeTab === "place" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                장소·역
              </button>
            </div>

            {activeTab === "postcode" ? (
              <div ref={embedRef} className="min-h-0 flex-1 overflow-hidden" />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex flex-shrink-0 gap-2 border-b border-gray-50 p-3">
                  <input
                    value={placeQuery}
                    onChange={e => setPlaceQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && void runPlaceSearch()}
                    placeholder="예: 강남역 2호선, 스타벅스 ○○점"
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => void runPlaceSearch()}
                    disabled={placeLoading || placeQuery.trim().length < 2}
                    className="flex-shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                  >
                    {placeLoading ? "…" : "검색"}
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {placeHint === "no_key" && (
                    <p className="px-2 py-3 text-center text-xs leading-relaxed text-gray-500">
                      장소 검색을 쓰려면 서버에 <strong className="text-gray-700">KAKAO_REST_API_KEY</strong>를 설정하세요.
                      <br />
                      우편번호 탭으로 주소만 선택할 수 있어요.
                    </p>
                  )}
                  {placeHint === "empty" && <p className="px-2 py-4 text-center text-xs text-gray-400">검색 결과가 없어요.</p>}
                  {placeHint === "error" && <p className="px-2 py-4 text-center text-xs text-red-500">검색 중 오류가 났어요.</p>}
                  {placeResults.map((doc, i) => (
                    <button
                      key={`${doc.place_name}-${i}`}
                      type="button"
                      onClick={() => pickPlace(doc)}
                      className="mb-1.5 w-full rounded-xl border border-gray-100 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50"
                    >
                      <p className="text-sm font-semibold text-gray-900">{doc.place_name}</p>
                      <p className="text-[11px] text-gray-500">
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
