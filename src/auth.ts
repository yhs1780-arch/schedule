import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  );
}

if (process.env.AUTH_NAVER_ID && process.env.AUTH_NAVER_SECRET) {
  providers.push(
    Naver({
      clientId: process.env.AUTH_NAVER_ID,
      clientSecret: process.env.AUTH_NAVER_SECRET,
    }),
  );
}

if (process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET) {
  providers.push(
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" as const },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user }) {
      const userId = user.id;
      if (!userId) return false;
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!dbUser) return false;

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
