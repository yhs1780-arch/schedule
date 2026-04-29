-- CalendarShareLink: 게스트 승인 필요 여부
ALTER TABLE "CalendarShareLink" ADD COLUMN IF NOT EXISTS "guestApprovalRequired" BOOLEAN NOT NULL DEFAULT false;

-- ShareLinkVisitor: 승인 워크플로
ALTER TABLE "ShareLinkVisitor" ADD COLUMN IF NOT EXISTS "guestDisplayName" TEXT;
ALTER TABLE "ShareLinkVisitor" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'AUTO';
ALTER TABLE "ShareLinkVisitor" ADD COLUMN IF NOT EXISTS "guestRole" TEXT;

CREATE INDEX IF NOT EXISTS "ShareLinkVisitor_linkId_approvalStatus_idx" ON "ShareLinkVisitor"("linkId", "approvalStatus");

-- MultiShare
ALTER TABLE "MultiShare" ADD COLUMN IF NOT EXISTS "guestApprovalRequired" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MultiShareVisitor" ADD COLUMN IF NOT EXISTS "guestDisplayName" TEXT;
ALTER TABLE "MultiShareVisitor" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'AUTO';
ALTER TABLE "MultiShareVisitor" ADD COLUMN IF NOT EXISTS "guestRole" TEXT;

CREATE INDEX IF NOT EXISTS "MultiShareVisitor_multiShareId_approvalStatus_idx" ON "MultiShareVisitor"("multiShareId", "approvalStatus");
