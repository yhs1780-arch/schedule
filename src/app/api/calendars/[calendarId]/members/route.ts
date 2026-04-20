import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ calendarId: string }> };

function unauth() { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
function forbidden() { return NextResponse.json({ error: "No permission" }, { status: 403 }); }

async function requireOwner(calendarId: string, userId: string, userRole: string) {
  if (userRole === "OWNER") return true;
  const m = await prisma.calendarMember.findFirst({ where: { calendarId, userId, role: "OWNER" } });
  return !!m;
}

/** 멤버 초대 */
export async function POST(request: Request, context: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauth();

  const { calendarId } = await context.params;
  const body = (await request.json()) as { email?: string; role?: string };
  const email = body.email?.trim().toLowerCase();
  const role = body.role === "EDITOR" ? "EDITOR" : "VIEWER";

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const isOwner = await requireOwner(calendarId, user.id, user.role);
  if (!isOwner) return forbidden();

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) {
    return NextResponse.json(
      { error: "이 이메일로 가입한 사용자가 없습니다. 먼저 SyncNest에 로그인하도록 안내해주세요." },
      { status: 404 },
    );
  }

  const existing = await prisma.calendarMember.findFirst({ where: { calendarId, userId: invitee.id } });
  if (existing) return NextResponse.json({ error: "이미 멤버로 등록된 사용자입니다." }, { status: 409 });

  const member = await prisma.calendarMember.create({
    data: { calendarId, userId: invitee.id, role },
    include: { user: { select: { id: true, name: true, email: true, slug: true, role: true } } },
  });

  return NextResponse.json({ ok: true, member });
}

/** 멤버 권한 변경 */
export async function PATCH(request: Request, context: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauth();

  const { calendarId } = await context.params;
  const body = (await request.json()) as { userId?: string; role?: string };
  if (!body.userId || !body.role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });

  const isOwner = await requireOwner(calendarId, user.id, user.role);
  if (!isOwner) return forbidden();

  const role = body.role === "EDITOR" ? "EDITOR" : "VIEWER";
  await prisma.calendarMember.updateMany({ where: { calendarId, userId: body.userId }, data: { role } });

  return NextResponse.json({ ok: true });
}

/** 멤버 제거 */
export async function DELETE(request: Request, context: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauth();

  const { calendarId } = await context.params;
  const body = (await request.json()) as { userId?: string };
  const targetId = body.userId;
  if (!targetId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // 본인 탈퇴 or 오너가 강제 제거
  const isOwner = await requireOwner(calendarId, user.id, user.role);
  if (targetId !== user.id && !isOwner) return forbidden();

  // 오너 자신은 제거 불가
  const targetMember = await prisma.calendarMember.findFirst({ where: { calendarId, userId: targetId } });
  if (targetMember?.role === "OWNER") {
    return NextResponse.json({ error: "캘린더 소유자는 제거할 수 없습니다." }, { status: 400 });
  }

  await prisma.calendarMember.deleteMany({ where: { calendarId, userId: targetId } });
  return NextResponse.json({ ok: true });
}
