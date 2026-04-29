import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ multiShareId: string; visitorId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { multiShareId, visitorId } = await ctx.params;

  const ms = await prisma.multiShare.findFirst({ where: { id: multiShareId, ownerId: user.id } });
  if (!ms) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const v = await prisma.multiShareVisitor.findFirst({ where: { id: visitorId, multiShareId } });
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  } else if (body.approvalStatus === "AUTO" && !ms.guestApprovalRequired) {
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

  const updated = await prisma.multiShareVisitor.update({
    where: { id: visitorId },
    data: data as {
      ownerLabel?: string | null;
      approvalStatus?: string;
      guestRole?: string | null;
    },
  });

  return NextResponse.json({ ok: true, visitor: updated });
}
