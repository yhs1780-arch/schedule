"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Content() {
  const params = useSearchParams();
  const error = params.get("error");
  if (error === "invalid_token") {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">유효하지 않은 링크입니다</h1>
        <p className="text-sm text-gray-500 mb-6">링크가 만료되었거나 이미 사용된 링크입니다.</p>
        <Link href="/login" className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white">로그인</Link>
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="text-5xl mb-4">⏳</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">인증 처리 중...</h1>
      <p className="text-sm text-gray-500">잠시만 기다려주세요.</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-white p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-extrabold text-indigo-600">SyncNest</Link>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-gray-400">로딩 중...</div>}>
          <Content/>
        </Suspense>
      </div>
    </div>
  );
}
