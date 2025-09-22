-- CreateEnum
CREATE TYPE "AccountRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'APPROVED', 'REJECTED', 'CONTACTED');

-- CreateTable
CREATE TABLE "AccountRequest" (
    "id" TEXT NOT NULL,
    "status" "AccountRequestStatus" NOT NULL DEFAULT 'NEW',
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterPhone" TEXT,
    "organization" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRequestLog" (
    "id" TEXT NOT NULL,
    "accountRequestId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountRequest_status_createdAt_idx" ON "AccountRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AccountRequestLog_accountRequestId_createdAt_idx" ON "AccountRequestLog"("accountRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "AccountRequestLog_actorUserId_idx" ON "AccountRequestLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "AccountRequestLog" ADD CONSTRAINT "AccountRequestLog_accountRequestId_fkey" FOREIGN KEY ("accountRequestId") REFERENCES "AccountRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRequestLog" ADD CONSTRAINT "AccountRequestLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
