import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" as const },
  pages: { signIn: "/login" },
  providers: [
    ...(((process.env.AUTH_ENABLE_DEMO_LOGIN ?? "").trim().toLowerCase() === "true" ||
      process.env.NODE_ENV !== "production")
      ? [
          Credentials({
            id: "demo-login",
            name: "Demo Login",
            credentials: {
              slug: { label: "Slug", type: "text" },
            },
            async authorize(credentials) {
              const slug = String(credentials?.slug ?? "").trim();
              if (!slug) return null;
              const user = await prisma.user.findUnique({ where: { slug } });
              if (!user) return null;
              return { id: user.id, name: user.name, email: user.email };
            },
          }),
        ]
      : []),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
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
        ]
      : []),
    ...(process.env.AUTH_NAVER_ID && process.env.AUTH_NAVER_SECRET
      ? [
          Naver({
            clientId: process.env.AUTH_NAVER_ID,
            clientSecret: process.env.AUTH_NAVER_SECRET,
          }),
        ]
      : []),
    ...(process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET
      ? [
          Kakao({
            clientId: process.env.AUTH_KAKAO_ID,
            clientSecret: process.env.AUTH_KAKAO_SECRET,
          }),
        ]
      : []),
  ],
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

