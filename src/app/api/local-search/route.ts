import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RL = 30;
const WINDOW_MS = 60_000;

type KakaoDoc = {
  id?: string;
  place_name?: string;
  category_name?: string;
  road_address_name?: string;
  address_name?: string;
  x?: string;
  y?: string;
};

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`locsearch:${ip}`, RL, WINDOW_MS)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  const key = process.env.KAKAO_REST_API_KEY;
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ configured: Boolean(key), documents: [] });
  }
  if (!key) {
    return NextResponse.json({ configured: false, documents: [] });
  }

  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=15`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, next: { revalidate: 0 } });
  if (!res.ok) {
    return NextResponse.json({ configured: true, documents: [], error: "검색 실패" }, { status: 502 });
  }
  const data = (await res.json()) as { documents?: KakaoDoc[] };
  const documents = (data.documents ?? []).map(d => ({
    id: d.id,
    place_name: d.place_name,
    category_name: d.category_name,
    road_address_name: d.road_address_name,
    address_name: d.address_name,
    x: d.x,
    y: d.y,
  }));
  return NextResponse.json({ configured: true, documents });
}
