import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ calendarId: string; linkId: string; visitorId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { calendarId, linkId, visitorId } = await ctx.params;

  const member = await prisma.calendarMember.findFirst({
    where: { calendarId, userId: user.id, role: "OWNER" },
  });
  if (!member) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const v = await prisma.shareLinkVisitor.findFirst({
    where: { id: visitorId, linkId },
  });
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const link = await prisma.calendarShareLink.findFirst({ where: { id: linkId, calendarId } });
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as {
    ownerLabel?: string;
    approvalStatus?: "APPROVED" | "REVOKED" | "PENDING" | "AUTO";
    guestRole?: "VIEWER" | "EDITOR" | null;
  };

  const data: Record<string, unknown> = {};

  if (body.ownerLabel !== undefined) {
    data.ownerLabel = (body.ownerLabel ?? "").trim().slice(0, 64) || null;
  }

  if (body.approvalStatus === "APPROVED" || body.approvalStatus === "REVOKED" || body.approvalStatus === "PENDING") {
    data.approvalStatus = body.approvalStatus;
  } else if (body.approvalStatus === "AUTO" && !link.guestApprovalRequired) {
    data.approvalStatus = "AUTO";
  }

  if (body.guestRole === "VIEWER" || body.guestRole === "EDITOR") {
    data.guestRole = body.guestRole;
  } else if (body.guestRole === null) {
    data.guestRole = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없어요." }, { status: 400 });
  }

  const updated = await prisma.shareLinkVisitor.update({
    where: { id: visitorId },
    data: data as {
      ownerLabel?: string | null;
      approvalStatus?: string;
      guestRole?: string | null;
    },
  });

  return NextResponse.json({ ok: true, visitor: updated });
}
