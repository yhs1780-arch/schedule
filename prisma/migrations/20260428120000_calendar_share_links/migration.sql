-- CreateTable
CREATE TABLE "CalendarShareLink" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "shareRole" TEXT NOT NULL DEFAULT 'VIEWER',
    "label" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLinkVisitor" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 1,
    "ownerLabel" TEXT,
    "lastIpHash" TEXT,
    "lastUaHash" TEXT,

    CONSTRAINT "ShareLinkVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarShareLink_token_key" ON "CalendarShareLink"("token");

-- CreateIndex
CREATE INDEX "CalendarShareLink_calendarId_createdAt_idx" ON "CalendarShareLink"("calendarId", "createdAt");

-- CreateIndex
CREATE INDEX "CalendarShareLink_token_revokedAt_idx" ON "CalendarShareLink"("token", "revokedAt");

-- CreateIndex
CREATE INDEX "ShareLinkVisitor_linkId_lastSeenAt_idx" ON "ShareLinkVisitor"("linkId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLinkVisitor_linkId_visitorKey_key" ON "ShareLinkVisitor"("linkId", "visitorKey");

-- AddForeignKey
ALTER TABLE "CalendarShareLink" ADD CONSTRAINT "CalendarShareLink_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLinkVisitor" ADD CONSTRAINT "ShareLinkVisitor_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "CalendarShareLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MultiShare optional columns
ALTER TABLE "MultiShare" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "MultiShare" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
