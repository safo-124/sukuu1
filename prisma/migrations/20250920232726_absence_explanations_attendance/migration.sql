-- CreateEnum
CREATE TYPE "AbsenceExplanationStatus" AS ENUM ('NONE', 'REQUESTED', 'ANSWERED', 'CLOSED');

-- CreateTable
CREATE TABLE "AbsenceExplanation" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "AbsenceExplanationStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestNote" TEXT,
    "requestedById" TEXT,
    "responseText" TEXT,
    "respondedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbsenceExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbsenceExplanation_attendanceId_idx" ON "AbsenceExplanation"("attendanceId");

-- CreateIndex
CREATE INDEX "AbsenceExplanation_schoolId_idx" ON "AbsenceExplanation"("schoolId");

-- AddForeignKey
ALTER TABLE "AbsenceExplanation" ADD CONSTRAINT "AbsenceExplanation_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceExplanation" ADD CONSTRAINT "AbsenceExplanation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceExplanation" ADD CONSTRAINT "AbsenceExplanation_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceExplanation" ADD CONSTRAINT "AbsenceExplanation_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
