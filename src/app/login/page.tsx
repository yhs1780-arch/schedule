"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type ProviderInfo = { id: string; name: string };

function LoginContent() {
  const params = useSearchParams();
  const verified = params.get("verified");
  const errorParam = params.get("error");

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Email/password
  const [emailTab, setEmailTab] = useState(false);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPw, setShowPw] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (errorParam === "email_not_verified") setAuthMessage("이메일 인증이 필요합니다. 가입 시 받은 메일의 링크를 클릭해주세요.");
    else if (errorParam) setAuthMessage("로그인 오류가 발생했습니다. 다시 시도해주세요.");
  }, [errorParam]);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then(r => r.json())
      .then((data: Record<string, {id:string;name:string}>) => {
        setProviders(Object.values(data).filter(p => p.id !== "credentials"));
        setProvidersLoaded(true);
      })
      .catch(() => setProvidersLoaded(true));
  }, []);

  async function handleSocialSignIn(id: string) {
    setLoadingProvider(id); setAuthMessage(null);
    try {
      const r = await signIn(id, { redirect: false, callbackUrl: "/dashboard" });
      if (!r || r.error) { setAuthMessage("로그인 중 오류가 발생했습니다."); return; }
      if (r.url) window.location.href = r.url;
    } catch { setAuthMessage("로그인 처리 중 문제가 발생했습니다."); }
    finally { setLoadingProvider(null); }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault(); setEmailLoading(true); setAuthMessage(null);
    try {
      const r = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
      if (!r) { setAuthMessage("로그인 실패"); return; }
      if (r.error === "email_not_verified") { setAuthMessage("이메일 인증이 필요합니다. 가입 시 받은 메일을 확인해주세요."); return; }
      if (r.error) { setAuthMessage("이메일 또는 비밀번호가 올바르지 않습니다."); return; }
      if (r.url) window.location.href = r.url;
    } catch { setAuthMessage("로그인 처리 중 문제가 발생했습니다."); }
    finally { setEmailLoading(false); }
  }

  const googleProvider = providers.find(p => p.id === "google");
  const naverProvider = providers.find(p => p.id === "naver");
  const kakaoProvider = providers.find(p => p.id === "kakao");
  const hasSocial = !!(googleProvider || naverProvider || kakaoProvider);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <div className="flex h-14 items-center border-b border-gray-100 bg-white/80 px-6 backdrop-blur-sm">
        <Link href="/" className="text-base font-extrabold text-indigo-600">SyncNest</Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold text-gray-900">로그인</h1>
            <p className="mt-1 text-sm text-gray-500">일정을 함께 관리해보세요</p>
          </div>

          {verified === "1" && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center text-sm text-emerald-700 font-medium">
              ✅ 이메일 인증이 완료됐습니다! 로그인해주세요.
            </div>
          )}

          <div className="rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
            {/* 탭 */}
            <div className="flex gap-1 mb-5 rounded-xl bg-gray-100 p-1">
              <button onClick={()=>setEmailTab(false)} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${!emailTab?"bg-white shadow text-gray-900":"text-gray-500 hover:text-gray-700"}`}>소셜 로그인</button>
              <button onClick={()=>setEmailTab(true)} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${emailTab?"bg-white shadow text-gray-900":"text-gray-500 hover:text-gray-700"}`}>이메일 로그인</button>
            </div>

            {!emailTab ? (
              /* 소셜 로그인 탭 */
              <>
                {!providersLoaded ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"/>
                  </div>
                ) : !hasSocial ? (
                  <div className="py-4 text-center">
                    <p className="text-sm font-medium text-gray-600 mb-1">소셜 로그인 미설정</p>
                    <p className="text-xs text-gray-400">이메일 로그인을 이용해주세요.</p>
                    <button onClick={()=>setEmailTab(true)} className="mt-3 text-xs text-indigo-600 underline">이메일 로그인으로 전환</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {googleProvider && (
                      <button onClick={()=>void handleSocialSignIn("google")} disabled={!!loadingProvider}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition active:scale-[0.99]">
                        <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        {loadingProvider==="google"?"로그인 중...":"Google로 계속하기"}
                      </button>
                    )}
                    {naverProvider && (
                      <button onClick={()=>void handleSocialSignIn("naver")} disabled={!!loadingProvider}
                        className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#02b350] disabled:opacity-50 transition active:scale-[0.99]">
                        <span className="text-base font-black leading-none">N</span>
                        {loadingProvider==="naver"?"로그인 중...":"네이버로 계속하기"}
                      </button>
                    )}
                    {kakaoProvider && (
                      <button onClick={()=>void handleSocialSignIn("kakao")} disabled={!!loadingProvider}
                        className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#191919] shadow-sm hover:bg-[#fdd800] disabled:opacity-50 transition active:scale-[0.99]">
                        <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.48 3 2 6.58 2 11c0 2.76 1.58 5.2 4 6.76V21l3.5-2.2c.83.12 1.66.2 2.5.2 5.52 0 10-3.58 10-8S17.52 3 12 3z"/></svg>
                        {loadingProvider==="kakao"?"로그인 중...":"카카오로 계속하기"}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* 이메일 로그인 탭 */
              <form onSubmit={e=>void handleEmailSignIn(e)} className="space-y-3">
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일" required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
                <div className="relative">
                  <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" required
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
                  <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw
                      ? <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                      : <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    }
                  </button>
                </div>
                <button type="submit" disabled={emailLoading||!email||!password}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 transition active:scale-[0.99]">
                  {emailLoading?"로그인 중...":"이메일로 로그인"}
                </button>
                <div className="text-center">
                  <Link href="/register" className="text-xs text-indigo-600 hover:underline">계정이 없으신가요? 회원가입</Link>
                </div>
              </form>
            )}

            {authMessage && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-600">{authMessage}</p>
              </div>
            )}
          </div>

          {/* 회원가입 링크 */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200"/>
            <span className="text-xs text-gray-400">처음이신가요?</span>
            <div className="flex-1 h-px bg-gray-200"/>
          </div>
          <Link href="/register" className="mt-3 flex items-center justify-center rounded-xl border border-indigo-200 bg-white py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition shadow-sm">
            무료로 계정 만들기
          </Link>

          <p className="mt-4 text-center text-xs text-gray-400">
            로그인·가입 시 <span className="text-gray-500">서비스 이용약관</span> 및 <span className="text-gray-500">개인정보처리방침</span>에 동의합니다.
          </p>
          <div className="mt-3 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← 홈으로</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"/></div>}>
      <LoginContent/>
    </Suspense>
  );
}
