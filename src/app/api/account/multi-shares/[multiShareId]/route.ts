import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ multiShareId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { multiShareId } = await ctx.params;

  const ms = await prisma.multiShare.findFirst({
    where: { id: multiShareId, ownerId: user.id, revokedAt: null },
  });
  if (!ms) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as { guestApprovalRequired?: boolean };
  if (typeof body.guestApprovalRequired !== "boolean") {
    return NextResponse.json({ error: "guestApprovalRequired 가 필요해요." }, { status: 400 });
  }

  const updated = await prisma.multiShare.update({
    where: { id: multiShareId },
    data: { guestApprovalRequired: body.guestApprovalRequired },
  });

  return NextResponse.json({ ok: true, multiShare: updated });
}
