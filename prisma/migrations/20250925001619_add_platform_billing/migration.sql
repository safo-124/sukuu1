-- CreateEnum
CREATE TYPE "BillingInvoiceStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'PAID', 'VOID');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "billingPlan" TEXT DEFAULT 'USAGE',
ADD COLUMN     "freeTierStudentLimit" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "lastUsageSnapshotAt" TIMESTAMP(3),
ADD COLUMN     "paidThrough" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "upgradeRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UsageSnapshot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "studentCount" INTEGER NOT NULL,
    "parentCount" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "UsageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "usageSnapshotId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BillingInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoiceLine" (
    "id" TEXT NOT NULL,
    "billingInvoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRunLog" (
    "id" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "schoolsProcessed" INTEGER NOT NULL,
    "invoicesCreated" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageSnapshot_schoolId_capturedAt_idx" ON "UsageSnapshot"("schoolId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsageSnapshot_schoolId_periodStart_periodEnd_key" ON "UsageSnapshot"("schoolId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_usageSnapshotId_key" ON "BillingInvoice"("usageSnapshotId");

-- CreateIndex
CREATE INDEX "BillingInvoice_schoolId_periodStart_periodEnd_idx" ON "BillingInvoice"("schoolId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "BillingInvoice_status_idx" ON "BillingInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_schoolId_periodStart_periodEnd_key" ON "BillingInvoice"("schoolId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "BillingInvoiceLine_billingInvoiceId_idx" ON "BillingInvoiceLine"("billingInvoiceId");

-- CreateIndex
CREATE INDEX "BillingRunLog_ranAt_idx" ON "BillingRunLog"("ranAt");

-- CreateIndex
CREATE INDEX "BillingRunLog_periodStart_periodEnd_idx" ON "BillingRunLog"("periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "UsageSnapshot" ADD CONSTRAINT "UsageSnapshot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_usageSnapshotId_fkey" FOREIGN KEY ("usageSnapshotId") REFERENCES "UsageSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoiceLine" ADD CONSTRAINT "BillingInvoiceLine_billingInvoiceId_fkey" FOREIGN KEY ("billingInvoiceId") REFERENCES "BillingInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
