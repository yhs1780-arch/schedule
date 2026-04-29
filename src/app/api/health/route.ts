import { NextResponse } from "next/server";

export async function GET() {
  const demoLoginEnabled =
    (process.env.AUTH_ENABLE_DEMO_LOGIN ?? "").trim().toLowerCase() === "true" ||
    process.env.NODE_ENV !== "production";

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    env: {
      hasAuthSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      hasGoogleOAuth: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
      hasNaverOAuth: Boolean(process.env.AUTH_NAVER_ID && process.env.AUTH_NAVER_SECRET),
      hasKakaoOAuth: Boolean(process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET),
      demoLoginEnabled,
    },
  });
}

