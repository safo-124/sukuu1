-- CreateEnum
CREATE TYPE "SchoolRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'APPROVED', 'REJECTED', 'CONTACTED');

-- CreateTable
CREATE TABLE "SchoolRequest" (
    "id" TEXT NOT NULL,
    "status" "SchoolRequestStatus" NOT NULL DEFAULT 'NEW',
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterPhone" TEXT,
    "schoolName" TEXT NOT NULL,
    "subdomain" TEXT,
    "message" TEXT,
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolRequest_status_createdAt_idx" ON "SchoolRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolRequest_schoolId_idx" ON "SchoolRequest"("schoolId");

-- CreateIndex
CREATE INDEX "RequestLog_requestId_createdAt_idx" ON "RequestLog"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestLog_actorUserId_idx" ON "RequestLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "SchoolRequest" ADD CONSTRAINT "SchoolRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestLog" ADD CONSTRAINT "RequestLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SchoolRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestLog" ADD CONSTRAINT "RequestLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
