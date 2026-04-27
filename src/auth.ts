import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Windows 환경에서 파이프로 설정 시 \r\n이 붙는 문제를 trim으로 처리
const googleId = (process.env.AUTH_GOOGLE_ID ?? "").trim();
const googleSecret = (process.env.AUTH_GOOGLE_SECRET ?? "").trim();
const naverId = (process.env.AUTH_NAVER_ID ?? "").trim();
const naverSecret = (process.env.AUTH_NAVER_SECRET ?? "").trim();
const kakaoId = (process.env.AUTH_KAKAO_ID ?? "").trim();
const kakaoSecret = (process.env.AUTH_KAKAO_SECRET ?? "").trim();

const providers = [];

if (googleId && googleSecret) {
  providers.push(
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
    }),
  );
}

if (naverId && naverSecret) {
  providers.push(
    Naver({
      clientId: naverId,
      clientSecret: naverSecret,
    }),
  );
}

if (kakaoId && kakaoSecret) {
  providers.push(
    Kakao({
      clientId: kakaoId,
      clientSecret: kakaoSecret,
    }),
  );
}

// 이메일/비밀번호 Credentials 프로바이더
providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "이메일",
    credentials: {
      email: { label: "이메일", type: "email" },
      password: { label: "비밀번호", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const email = credentials.email.trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password) return null;
      if (!user.emailVerified) {
        throw new Error("email_not_verified");
      }
      const ok = await bcrypt.compare(credentials.password, user.password);
      if (!ok) return null;
      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" as const },
  pages: { signIn: "/login", error: "/login" },
  providers,
  callbacks: {
    async signIn({ user }) {
      const userId = user.id;
      if (!userId) return false;

      try {
        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        // DB에서 찾지 못해도 로그인은 허용 (어댑터가 이미 생성함)
        if (!dbUser) return true;

        const base = toSlug(dbUser.email ?? dbUser.name ?? dbUser.id);
        let slug = base || `user-${dbUser.id.slice(0, 8)}`;
        const slugOwner = await prisma.user.findUnique({ where: { slug } });
        if (slugOwner && slugOwner.id !== dbUser.id) {
          slug = `${slug}-${dbUser.id.slice(0, 6)}`;
        }

        await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            slug,
            role: dbUser.role || "MEMBER",
          },
        });

        // 첫 로그인 시 개인 캘린더 자동 생성
        const personalKey = `personal-${slug}`;
        const hasPersonal = await prisma.calendar.findUnique({ where: { key: personalKey } });
        if (!hasPersonal) {
          const personal = await prisma.calendar.create({
            data: {
              key: personalKey,
              name: `${dbUser.name ?? "사용자"} 개인 일정`,
              color: "bg-emerald-500/20 text-emerald-300",
            },
          });
          await prisma.calendarMember.create({
            data: {
              calendarId: personal.id,
              userId: dbUser.id,
              role: "OWNER",
            },
          });
        }
      } catch (err) {
        // DB 작업 오류가 로그인 자체를 막지 않도록 처리
        console.error("[signIn] callback error (login still allowed):", err);
      }

      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true, slug: true },
        });
        (session.user as typeof session.user & { id: string; role: string; slug: string }).id = user.id;
        (session.user as typeof session.user & { id: string; role: string; slug: string }).role =
          dbUser?.role ?? "MEMBER";
        (session.user as typeof session.user & { id: string; role: string; slug: string }).slug =
          dbUser?.slug ?? user.id;
      }
      return session;
    },
  },
};
