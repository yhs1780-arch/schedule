import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { ids?: string[] };
  const ids = body.ids ?? [];
  if (!ids.length) return NextResponse.json({ error: "ids required" }, { status: 400 });

  // 권한 확인: 각 이벤트의 캘린더에 OWNER 또는 EDITOR로 멤버인지 확인
  const events = await prisma.event.findMany({
    where: { id: { in: ids } },
    include: {
      calendar: {
        include: { members: { where: { userId: user.id } } },
      },
    },
  });

  const allowedIds = events
    .filter(e => {
      if (user.role === "OWNER") return true;
      const m = e.calendar.members[0];
      return m && (m.role === "OWNER" || m.role === "EDITOR");
    })
    .map(e => e.id);

  if (!allowedIds.length) return NextResponse.json({ error: "No permission" }, { status: 403 });

  await prisma.event.deleteMany({ where: { id: { in: allowedIds } } });

  return NextResponse.json({ ok: true, deleted: allowedIds.length });
}
