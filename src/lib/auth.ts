import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
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

