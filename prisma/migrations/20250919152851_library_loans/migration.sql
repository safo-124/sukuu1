-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('IN', 'OUT', 'ADJUST');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('BORROWED', 'RETURNED', 'OVERDUE');

-- AlterTable
ALTER TABLE "Grade" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedById" TEXT;

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "resultingQuantity" INTEGER NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "vendorId" TEXT,
    "purchaseOrderId" TEXT,
    "performedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookLoan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'BORROWED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryTransaction_schoolId_itemId_idx" ON "InventoryTransaction"("schoolId", "itemId");

-- CreateIndex
CREATE INDEX "BookLoan_schoolId_idx" ON "BookLoan"("schoolId");

-- CreateIndex
CREATE INDEX "BookLoan_bookId_idx" ON "BookLoan"("bookId");

-- CreateIndex
CREATE INDEX "BookLoan_studentId_idx" ON "BookLoan"("studentId");

-- CreateIndex
CREATE INDEX "BookLoan_status_idx" ON "BookLoan"("status");

-- CreateIndex
CREATE INDEX "Grade_isPublished_idx" ON "Grade"("isPublished");

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookLoan" ADD CONSTRAINT "BookLoan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookLoan" ADD CONSTRAINT "BookLoan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookLoan" ADD CONSTRAINT "BookLoan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
