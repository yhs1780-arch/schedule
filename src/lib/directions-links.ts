/** 한국에서 많이 쓰는 지도/내비 길찾기 (주소·장소명 검색) */

export function navigationSearchQuery(main: string, detail?: string | null): string {
  return [main?.trim(), detail?.trim()].filter(Boolean).join(" ").trim();
}

export function naverMapSearchUrl(query: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(query.trim())}`;
}

/** Tmap 앱 딥링크 (앱 설치 시 열림) */
export function tmapAppSearchUrl(query: string): string {
  return `tmap://search?name=${encodeURIComponent(query.trim())}`;
}

/**
 * Tmap 모바일 웹 (앱 없을 때 대체). SK 공개 검색 경로.
 * @see https://tmapapi.sktelecom.com
 */
export function tmapWebSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim());
  return `https://tmap.co.kr/tmap3/web/research?searchKeyword=${q}`;
}

/** 네이버 지도 웹 길찾기(대중교통) — 목적지 검색어 */
export function naverMapDirectionsUrl(placeQuery: string): string {
  const q = encodeURIComponent(navigationSearchQuery(placeQuery, null));
  return `https://map.naver.com/v5/directions/-/-/-/transit?goal=${q}`;
}

/** T맵 앱 길찾기(목적지명) */
export function tmapNavigationRouteUrl(placeName: string): string {
  const q = encodeURIComponent(placeName.trim());
  return `tmap://route?goalname=${q}&rGoName=${q}`;
}
