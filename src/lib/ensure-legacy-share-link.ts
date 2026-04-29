import { prisma } from "@/lib/prisma";

/** 이전 `Calendar.shareToken`만 쓰던 캘린더를 링크 관리 UI에 뜨게 동기화 */
export async function ensureLegacyShareLinkMigrated(calendarId: string): Promise<void> {
  const cal = await prisma.calendar.findUnique({ where: { id: calendarId } });
  if (!cal?.shareToken) return;
  const existing = await prisma.calendarShareLink.findFirst({
    where: { token: cal.shareToken, calendarId },
  });
  if (existing) return;
  try {
    await prisma.calendarShareLink.create({
      data: {
        calendarId,
        token: cal.shareToken,
        shareRole: cal.shareRole,
        guestApprovalRequired: false,
        label: "기존 공유 링크(자동)",
      },
    });
  } catch {
    /* unique token race */
  }
}
