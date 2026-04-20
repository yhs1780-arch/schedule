"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

type ProviderInfo = {
  id: string;
  name: string;
};

export default function LoginPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [providersLoaded, setProvidersLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data: Record<string, { id: string; name: string }>) => {
        setProviders(Object.values(data));
        setProvidersLoaded(true);
      })
      .catch(() => setProvidersLoaded(true));
  }, []);

  async function handleSignIn(providerId: string) {
    setLoadingProvider(providerId);
    setAuthMessage(null);
    try {
      const result = await signIn(providerId, {
        redirect: false,
        callbackUrl: "/dashboard",
      });
      if (!result || result.error) {
        setAuthMessage("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      if (result.url) window.location.href = result.url;
    } catch {
      setAuthMessage("로그인 처리 중 문제가 발생했습니다.");
    } finally {
      setLoadingProvider(null);
    }
  }

  const googleProvider = providers.find((p) => p.id === "google");
  const naverProvider = providers.find((p) => p.id === "naver");
  const kakaoProvider = providers.find((p) => p.id === "kakao");

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-gray-100 bg-white px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-indigo-600">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          SyncNest
        </Link>
      </div>

      {/* Main */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold text-gray-900">로그인</h1>
            <p className="mt-2 text-sm text-gray-500">
              소셜 계정으로 간편하게 시작하세요
            </p>
          </div>

          {/* Login Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {!providersLoaded ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : providers.length === 0 ? (
              /* 아직 OAuth 미설정 */
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                  <svg className="h-6 w-6 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">로그인 준비 중</p>
                <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                  Google, 네이버, 카카오 로그인 설정이<br />완료되는 즉시 이용하실 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Google */}
                {googleProvider && (
                  <button
                    onClick={() => void handleSignIn("google")}
                    disabled={!!loadingProvider}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {loadingProvider === "google" ? "로그인 중..." : "Google로 계속하기"}
                  </button>
                )}

                {/* Naver */}
                {naverProvider && (
                  <button
                    onClick={() => void handleSignIn("naver")}
                    disabled={!!loadingProvider}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#02b350] disabled:opacity-50"
                  >
                    <span className="text-base font-black leading-none">N</span>
                    {loadingProvider === "naver" ? "로그인 중..." : "네이버로 계속하기"}
                  </button>
                )}

                {/* Kakao */}
                {kakaoProvider && (
                  <button
                    onClick={() => void handleSignIn("kakao")}
                    disabled={!!loadingProvider}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#191919] shadow-sm transition hover:bg-[#fdd800] disabled:opacity-50"
                  >
                    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.76 1.58 5.2 4 6.76V21l3.5-2.2c.83.12 1.66.2 2.5.2 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
                    </svg>
                    {loadingProvider === "kakao" ? "로그인 중..." : "카카오로 계속하기"}
                  </button>
                )}
              </div>
            )}

            {authMessage && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-600">{authMessage}</p>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            로그인하면{" "}
            <span className="text-gray-500">서비스 이용약관</span>
            {" "}및{" "}
            <span className="text-gray-500">개인정보처리방침</span>
            에 동의하는 것으로 간주됩니다.
          </p>

          <div className="mt-4 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition">
              ← 홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
