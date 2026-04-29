-- CreateTable
CREATE TABLE "MultiShareVisitor" (
    "id" TEXT NOT NULL,
    "multiShareId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 1,
    "ownerLabel" TEXT,
    "lastIpHash" TEXT,
    "lastUaHash" TEXT,

    CONSTRAINT "MultiShareVisitor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MultiShareVisitor_multiShareId_lastSeenAt_idx" ON "MultiShareVisitor"("multiShareId", "lastSeenAt");

CREATE UNIQUE INDEX "MultiShareVisitor_multiShareId_visitorKey_key" ON "MultiShareVisitor"("multiShareId", "visitorKey");

ALTER TABLE "MultiShareVisitor" ADD CONSTRAINT "MultiShareVisitor_multiShareId_fkey" FOREIGN KEY ("multiShareId") REFERENCES "MultiShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
