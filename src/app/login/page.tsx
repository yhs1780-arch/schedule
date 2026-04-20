"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

const demoUsers = [
  { slug: "me", label: "나(운영자)", desc: "모든 캘린더 접근 가능" },
  { slug: "bello-a", label: "벨로컴퍼니 민지", desc: "벨로 캘린더 + 개인 캘린더" },
  { slug: "bello-b", label: "벨로컴퍼니 태현", desc: "벨로 캘린더 + 개인 캘린더" },
  { slug: "part-a", label: "알바팀 수연", desc: "알바 캘린더 + 개인 캘린더" },
  { slug: "friend-a", label: "친구 지훈", desc: "개인 캘린더" },
];

export default function LoginPage() {
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const googleEnabled =
    (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN ?? "").trim().toLowerCase() === "true";
  const naverEnabled =
    (process.env.NEXT_PUBLIC_ENABLE_NAVER_LOGIN ?? "").trim().toLowerCase() === "true";
  const kakaoEnabled =
    (process.env.NEXT_PUBLIC_ENABLE_KAKAO_LOGIN ?? "").trim().toLowerCase() === "true";
  const demoEnabled =
    (process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN ?? "").trim().toLowerCase() === "true";

  const anySocialEnabled = googleEnabled || naverEnabled || kakaoEnabled;

  async function handleSignIn(provider: string, options?: Record<string, string>) {
    setLoadingProvider(provider);
    setAuthMessage(null);
    try {
      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: "/dashboard",
        ...options,
      });
      if (!result || result.error) {
        setAuthMessage(
          provider === "demo-login"
            ? "데모 로그인 처리 중 문제가 발생했습니다."
            : "로그인 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.",
        );
        return;
      }
      if (result.url) window.location.href = result.url;
    } catch {
      setAuthMessage("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoadingProvider(null);
    }
  }

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
            <h1 className="text-2xl font-extrabold text-gray-900">시작하기</h1>
            <p className="mt-2 text-sm text-gray-500">
              로그인하면 개인 캘린더가 자동으로 생성됩니다
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {/* Google */}
            <button
              onClick={() => void handleSignIn("google")}
              disabled={!googleEnabled || !!loadingProvider}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loadingProvider === "google" ? "로그인 중..." : "Google로 계속하기"}
            </button>

            {/* Naver */}
            <button
              onClick={() => void handleSignIn("naver")}
              disabled={!naverEnabled || !!loadingProvider}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-transparent bg-[#03C75A] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#02b350] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="text-base font-black leading-none">N</span>
              {loadingProvider === "naver" ? "로그인 중..." : "네이버로 계속하기"}
            </button>

            {/* Kakao */}
            <button
              onClick={() => void handleSignIn("kakao")}
              disabled={!kakaoEnabled || !!loadingProvider}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-transparent bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#191919] shadow-sm transition hover:bg-[#fdd800] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.76 1.58 5.2 4 6.76V21l3.5-2.2c.83.12 1.66.2 2.5.2 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
              </svg>
              {loadingProvider === "kakao" ? "로그인 중..." : "카카오로 계속하기"}
            </button>

            {/* Notice if not configured */}
            {!anySocialEnabled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-700 font-medium">소셜 로그인 설정 중</p>
                <p className="mt-1 text-xs text-amber-600">
                  현재 소셜 로그인은 준비 중입니다. 아래 데모 로그인을 이용해 주세요.
                </p>
              </div>
            )}

            {/* Error Message */}
            {authMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-600">{authMessage}</p>
              </div>
            )}
          </div>

          {/* Demo Login */}
          {demoEnabled && (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                  데모 모드
                </span>
                <p className="text-xs text-gray-500">OAuth 설정 전 체험용</p>
              </div>
              <div className="space-y-2">
                {demoUsers.map((u) => (
                  <button
                    key={u.slug}
                    onClick={() => void handleSignIn("demo-login", { slug: u.slug })}
                    disabled={!!loadingProvider}
                    className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-left transition hover:bg-indigo-50 hover:border-indigo-200 disabled:opacity-40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{u.label}</p>
                      <p className="text-xs text-gray-400">{u.desc}</p>
                    </div>
                    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-gray-400">
            로그인하면{" "}
            <span className="text-gray-500">서비스 이용약관</span>
            {" "}및{" "}
            <span className="text-gray-500">개인정보처리방침</span>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
