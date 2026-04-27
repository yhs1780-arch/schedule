import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://shared-schedule-lab.vercel.app";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`);
  }

  const verification = await prisma.emailVerification.findUnique({ where: { token } });
  if (!verification) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`);
  }
  if (verification.expiresAt < new Date()) {
    await prisma.emailVerification.delete({ where: { token } });
    return NextResponse.redirect(`${baseUrl}/login?error=token_expired`);
  }

  await prisma.user.update({
    where: { email: verification.email },
    data: { emailVerified: new Date() },
  });
  await prisma.emailVerification.delete({ where: { token } });

  return NextResponse.redirect(`${baseUrl}/login?verified=1`);
}
