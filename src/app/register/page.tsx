"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "sent">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== passwordConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (password.length < 8) { setError("비밀번호는 8자 이상이어야 합니다."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, birthdate: birthdate || undefined, gender: gender || undefined }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; verifyUrl?: string };
      if (!res.ok) { setError(data.error ?? "회원가입에 실패했습니다."); return; }
      if (data.verifyUrl) setDevVerifyUrl(data.verifyUrl); // 개발 환경용
      setStep("sent");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl text-center">
          <div className="text-6xl mb-4">✉️</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">인증 메일을 보냈어요!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            <strong className="text-indigo-600">{email}</strong>로 인증 링크를 발송했습니다.<br/>
            메일함을 확인하고 링크를 눌러 인증을 완료해주세요.<br/>
            <span className="text-xs text-gray-400">(스팸함도 확인해보세요)</span>
          </p>
          {devVerifyUrl && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-left">
              <p className="text-xs font-bold text-amber-700 mb-1">⚠️ 개발 환경 (이메일 서버 미설정)</p>
              <p className="text-xs text-amber-600 mb-2">아래 링크를 직접 클릭해서 인증하세요:</p>
              <a href={devVerifyUrl} className="text-xs text-indigo-600 underline break-all">{devVerifyUrl}</a>
            </div>
          )}
          <Link href="/login" className="block w-full rounded-xl bg-indigo-600 py-3.5 text-center text-sm font-bold text-white hover:bg-indigo-700">
            로그인 페이지로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-extrabold text-indigo-600">SyncNest</Link>
          <p className="mt-1 text-sm text-gray-500">일정 공유 플랫폼에 오신 걸 환영합니다</p>
        </div>
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <h1 className="text-xl font-bold text-gray-900 mb-6">회원가입</h1>
          <form onSubmit={e => void submit(e)} className="space-y-4">
            {/* 이름 */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">이름 *</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="홍길동" required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
            </div>
            {/* 이메일 */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">이메일 *</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
            </div>
            {/* 비밀번호 */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">비밀번호 * (8자 이상)</label>
              <div className="relative">
                <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="8자 이상" required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
                <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw?<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>:<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">비밀번호 확인 *</label>
              <input type={showPw?"text":"password"} value={passwordConfirm} onChange={e=>setPasswordConfirm(e.target.value)} placeholder="비밀번호 재입력" required
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 ${passwordConfirm&&password!==passwordConfirm?"border-red-300 focus:ring-red-100":"border-gray-200 focus:border-indigo-400 focus:ring-indigo-100"}`}/>
              {passwordConfirm && password !== passwordConfirm && <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>}
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100 pt-2">
              <p className="text-[10px] text-gray-400 mb-3 font-semibold uppercase tracking-wider">추가 정보 (선택)</p>
            </div>

            {/* 생년월일 */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">생년월일</label>
              <input type="date" value={birthdate} onChange={e=>setBirthdate(e.target.value)} max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
            </div>
            {/* 성별 */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-500">성별</label>
              <div className="grid grid-cols-4 gap-2">
                {[{v:"male",l:"남성"},{v:"female",l:"여성"},{v:"other",l:"기타"},{v:"prefer_not",l:"비공개"}].map(g=>(
                  <button key={g.v} type="button" onClick={()=>setGender(gender===g.v?"":g.v)}
                    className={`rounded-xl border py-2.5 text-xs font-medium transition ${gender===g.v?"border-indigo-400 bg-indigo-50 text-indigo-700":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    {g.l}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>}

            <button type="submit" disabled={loading||!name||!email||!password||password!==passwordConfirm}
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 transition active:scale-[0.99] mt-2">
              {loading ? "가입 중..." : "회원가입 하기"}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100"/>
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-100"/>
          </div>
          <Link href="/login" className="mt-3 block text-center text-sm text-indigo-600 hover:underline">
            이미 계정이 있으신가요? 로그인
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          회원가입 시 <span className="underline cursor-pointer">서비스 이용약관</span> 및 <span className="underline cursor-pointer">개인정보처리방침</span>에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
