import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ calendarId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { calendarId } = await ctx.params;
  const member = await prisma.calendarMember.findFirst({
    where: { calendarId, userId: user.id, role: "OWNER" },
  });
  if (!member) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const cal = await prisma.calendar.findUnique({ where: { id: calendarId } });
  if (!cal || !cal.shareToken) return NextResponse.json({ error: "먼저 공유 링크를 생성해주세요." }, { status: 400 });

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "유효한 이메일 주소를 입력해주세요." }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://shared-schedule-lab.vercel.app";
  const shareUrl = `${baseUrl}/share/${cal.shareToken}`;
  const roleLabel = cal.shareRole === "EDITOR" ? "편집 가능" : "보기 전용";

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: 'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif; background:#f8fafc; margin:0; padding:24px; }
  .card { background:#fff; border-radius:16px; padding:40px; max-width:480px; margin:0 auto; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .logo { font-size:22px; font-weight:800; color:#4f46e5; margin-bottom:24px; }
  h1 { font-size:20px; font-weight:700; color:#1e1b4b; margin:0 0 12px; }
  p { font-size:14px; color:#6b7280; line-height:1.7; margin:0 0 16px; }
  .cal-box { background:#eef2ff; border-radius:12px; padding:16px; margin:16px 0; }
  .cal-name { font-size:16px; font-weight:700; color:#4f46e5; }
  .role-badge { display:inline-block; background:${cal.shareRole==="EDITOR"?"#dcfce7":"#dbeafe"}; color:${cal.shareRole==="EDITOR"?"#16a34a":"#2563eb"}; border-radius:20px; padding:3px 10px; font-size:12px; font-weight:600; margin-top:4px; }
  .btn { display:inline-block; background:#4f46e5; color:#fff; padding:14px 32px; border-radius:12px; text-decoration:none; font-size:15px; font-weight:700; }
  .note { font-size:12px; color:#9ca3af; margin-top:24px; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">SyncNest</div>
    <h1>📅 캘린더 초대가 도착했어요!</h1>
    <p><strong>${user.name ?? "누군가"}</strong>님이 SyncNest 캘린더를 공유했습니다.</p>
    <div class="cal-box">
      <div class="cal-name">${cal.name}</div>
      <div class="role-badge">${roleLabel}</div>
    </div>
    <p>${cal.shareRole === "EDITOR" ? "이 링크로 접속하면 일정을 보고 <strong>수정·추가</strong>할 수 있습니다." : "이 링크로 접속하면 일정을 <strong>볼 수</strong> 있습니다."}</p>
    <a class="btn" href="${shareUrl}">캘린더 보러 가기</a>
    <p class="note">SyncNest에 가입하면 내 캘린더도 만들고 공유할 수 있어요.<br/>이 메일은 ${user.name ?? "사용자"}님의 요청으로 발송되었습니다.</p>
  </div>
</body>
</html>`;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "이메일 서비스가 설정되지 않았습니다." }, { status: 503 });

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "SyncNest <onboarding@resend.dev>",
      to: email,
      subject: `[SyncNest] ${user.name ?? "누군가"}님이 "${cal.name}" 캘린더를 공유했습니다`,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[share-invite]", err);
    return NextResponse.json({ error: "메일 발송에 실패했습니다." }, { status: 500 });
  }
}
