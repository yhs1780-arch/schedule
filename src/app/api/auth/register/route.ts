import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string; email?: string; password?: string;
      birthdate?: string; gender?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const birthdate = body.birthdate;
    const gender = body.gender?.trim();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "이름, 이메일, 비밀번호는 필수입니다." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "유효한 이메일 주소를 입력해주세요." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        birthdate: birthdate ? new Date(birthdate) : undefined,
        gender: gender || undefined,
        slug: `user-${Date.now()}`,
      },
    });

    // 인증 토큰 생성 (24시간 유효)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const verification = await prisma.emailVerification.create({
      data: { email, expiresAt: expires },
    });

    const emailResult = await sendVerificationEmail(email, name, verification.token);

    // 개발 환경이거나 API 키 없을 때 토큰 반환 (편의용)
    return NextResponse.json({
      ok: true,
      userId: user.id,
      emailSent: emailResult.ok,
      // API 키 없을 때만 verifyUrl 노출
      ...(!emailResult.ok && { verifyUrl: (emailResult as {verifyUrl?:string}).verifyUrl }),
    });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
