import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

const sessionUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  slug: true,
  emailVerified: true,
} as const;

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  slug: string | null;
  emailVerified: Date | null;
};

/** 세션 기반 API용 — 불필요한 컬럼(비밀번호 해시 등) 제외로 DB·직렬화 부담 감소 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: sessionUserSelect,
  });
}

export async function canViewCalendar(userId: string, userRole: string, calendarId: string) {
  if (userRole === "OWNER") return true;
  const membership = await prisma.calendarMember.findFirst({
    where: { calendarId, userId },
    select: { id: true },
  });
  return !!membership;
}

export async function canEditEvent(userId: string, userRole: string, eventId: string) {
  if (userRole === "OWNER") return true;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, createdById: true, calendarId: true },
  });
  if (!event) return false;
  if (event.createdById === userId) return true;
  const membership = await prisma.calendarMember.findFirst({
    where: {
      calendarId: event.calendarId,
      userId,
      role: { in: ["OWNER", "EDITOR"] },
    },
    select: { id: true },
  });
  return !!membership;
}

