/**
 * 이메일 발송 유틸 - Resend를 사용합니다.
 * 환경변수 RESEND_API_KEY 가 필요합니다.
 */

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://shared-schedule-lab.vercel.app";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; }
  .card { background: #fff; border-radius: 16px; padding: 40px; max-width: 480px; margin: 0 auto; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  .logo { font-size: 22px; font-weight: 800; color: #4f46e5; margin-bottom: 24px; }
  h1 { font-size: 20px; font-weight: 700; color: #1e1b4b; margin: 0 0 12px; }
  p { font-size: 14px; color: #6b7280; line-height: 1.7; margin: 0 0 24px; }
  .btn { display: inline-block; background: #4f46e5; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 700; }
  .note { font-size: 12px; color: #9ca3af; margin-top: 24px; }
  a.small { color: #6b7280; font-size: 12px; word-break: break-all; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">SyncNest</div>
    <h1>이메일 인증을 완료해주세요 ✉️</h1>
    <p>안녕하세요, <strong>${name}</strong>님!<br>
    아래 버튼을 눌러 이메일 인증을 완료하면 SyncNest를 바로 시작할 수 있어요.</p>
    <a class="btn" href="${verifyUrl}">이메일 인증하기</a>
    <p class="note">이 링크는 24시간 후 만료됩니다. 본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
    <p><a class="small" href="${verifyUrl}">${verifyUrl}</a></p>
  </div>
</body>
</html>`;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — email not sent. Verify URL:", verifyUrl);
    return { ok: false, reason: "no_api_key", verifyUrl };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: "SyncNest <onboarding@resend.dev>",
      to,
      subject: "[SyncNest] 이메일 인증 링크입니다",
      html,
    });
    return { ok: true, result };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, reason: "send_failed" };
  }
}
