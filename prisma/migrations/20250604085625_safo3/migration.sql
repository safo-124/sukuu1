/*
  Warnings:

  - You are about to drop the column `room` on the `ExamSchedule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ExamSchedule" DROP COLUMN "room",
ADD COLUMN     "roomId" TEXT;

-- CreateTable
CREATE TABLE "GradingWeightConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "schoolLevelId" TEXT,
    "classId" TEXT,
    "subjectId" TEXT,
    "examWeight" DOUBLE PRECISION NOT NULL,
    "classworkWeight" DOUBLE PRECISION NOT NULL,
    "assignmentWeight" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingWeightConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomType" TEXT,
    "capacity" INTEGER,
    "buildingId" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradingWeightConfig_schoolId_academicYearId_idx" ON "GradingWeightConfig"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "GradingWeightConfig_schoolLevelId_idx" ON "GradingWeightConfig"("schoolLevelId");

-- CreateIndex
CREATE INDEX "GradingWeightConfig_classId_idx" ON "GradingWeightConfig"("classId");

-- CreateIndex
CREATE INDEX "GradingWeightConfig_subjectId_idx" ON "GradingWeightConfig"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "GradingWeightConfig_schoolId_academicYearId_schoolLevelId_c_key" ON "GradingWeightConfig"("schoolId", "academicYearId", "schoolLevelId", "classId", "subjectId");

-- CreateIndex
CREATE INDEX "Building_schoolId_idx" ON "Building"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_schoolId_name_key" ON "Building"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Room_schoolId_idx" ON "Room"("schoolId");

-- CreateIndex
CREATE INDEX "Room_buildingId_idx" ON "Room"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_schoolId_name_key" ON "Room"("schoolId", "name");

-- AddForeignKey
ALTER TABLE "GradingWeightConfig" ADD CONSTRAINT "GradingWeightConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingWeightConfig" ADD CONSTRAINT "GradingWeightConfig_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingWeightConfig" ADD CONSTRAINT "GradingWeightConfig_schoolLevelId_fkey" FOREIGN KEY ("schoolLevelId") REFERENCES "SchoolLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingWeightConfig" ADD CONSTRAINT "GradingWeightConfig_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingWeightConfig" ADD CONSTRAINT "GradingWeightConfig_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSchedule" ADD CONSTRAINT "ExamSchedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
