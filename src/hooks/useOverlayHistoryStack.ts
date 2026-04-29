import { useEffect, useRef } from "react";

/**
 * 모바일 시스템 뒤로가기 시 이전 URL(로그인 등)로 빠지지 않도록, 열린 오버레이마다 history 스택을 쌓고
 * popstate 한 번당 한 레이어만 닫습니다. UI로 닫을 때 스택을 맞추기 위해 history.back을 호출합니다.
 */
export function useOverlayHistoryStack(depth: number, popTopLayer: () => void) {
  const depthRef = useRef(0);
  const ignorePops = useRef(0);
  const fromUserBack = useRef(false);
  const lastPopRef = useRef(0);
  const popFn = useRef(popTopLayer);
  popFn.current = popTopLayer;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const now = Date.now();
      if (now - lastPopRef.current < 80) return;
      lastPopRef.current = now;
      if (ignorePops.current > 0) {
        ignorePops.current -= 1;
        return;
      }
      fromUserBack.current = true;
      popFn.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = depthRef.current;

    if (depth > prev) {
      for (let i = prev; i < depth; i++) {
        window.history.pushState({ syncnestOverlay: true }, "", window.location.href);
      }
    } else if (depth < prev) {
      if (fromUserBack.current) {
        fromUserBack.current = false;
        depthRef.current = depth;
        return;
      }
      const diff = prev - depth;
      ignorePops.current += diff;
      for (let i = 0; i < diff; i++) {
        window.history.back();
      }
    }
    depthRef.current = depth;
  }, [depth]);
}
