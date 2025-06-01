/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,name,academicYearId,classId]` on the table `FeeStructure` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `StudentEnrollment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX IF EXISTS "FeeStructure_schoolId_name_academicYearId_key";

-- DropIndex
DROP INDEX IF EXISTS "Section_classTeacherId_key"; -- This was for a @unique constraint, now an index

-- DropIndex
DROP INDEX IF EXISTS "StudentEnrollment_studentId_sectionId_academicYearId_key";

-- AlterTable
ALTER TABLE "Class" 
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3); -- Step 1: Add as nullable

-- Step 2: Backfill updatedAt for existing rows in "Class"
UPDATE "Class" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL; 
-- Or use NOW(): UPDATE "Class" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- Step 3: Alter column to be NOT NULL for "Class"
ALTER TABLE "Class" ALTER COLUMN "updatedAt" SET NOT NULL;


-- AlterTable
ALTER TABLE "Section" 
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3); -- Step 1: Add as nullable

-- Step 2: Backfill updatedAt for existing rows in "Section"
UPDATE "Section" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
-- Or use NOW(): UPDATE "Section" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- Step 3: Alter column to be NOT NULL for "Section"
ALTER TABLE "Section" ALTER COLUMN "updatedAt" SET NOT NULL;


-- AlterTable
ALTER TABLE "StudentEnrollment" 
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "rollNumber" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3); -- Step 1: Add as nullable

-- Step 2: Backfill updatedAt for existing rows in "StudentEnrollment"
UPDATE "StudentEnrollment" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
-- Or use NOW(): UPDATE "StudentEnrollment" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- Step 3: Alter column to be NOT NULL for "StudentEnrollment"
ALTER TABLE "StudentEnrollment" ALTER COLUMN "updatedAt" SET NOT NULL;


-- CreateIndex
CREATE INDEX "Assignment_sectionId_idx" ON "Assignment"("sectionId");

-- CreateIndex
CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");

-- CreateIndex
-- This will fail if duplicate data exists for the combination of these columns.
-- You must clean your data BEFORE running this migration if duplicates exist.
CREATE UNIQUE INDEX "FeeStructure_schoolId_name_academicYearId_classId_key" ON "FeeStructure"("schoolId", "name", "academicYearId", "classId");

-- CreateIndex
-- If Section.classTeacherId is no longer @unique in your Prisma schema, this should not be a UNIQUE index.
-- A regular index is fine if it's not unique. Prisma should generate the correct type (unique or non-unique) based on your schema.
-- The original error "DROP INDEX "Section_classTeacherId_key"" implies it was previously unique.
-- If it's no longer unique in Prisma Schema, the new CREATE INDEX should not be UNIQUE.
-- Assuming it's no longer unique as per our previous discussion:
CREATE INDEX "Section_classTeacherId_idx" ON "Section"("classTeacherId");
-- If it *IS* still supposed to be unique in your Prisma schema, then this should be:
-- CREATE UNIQUE INDEX "Section_classTeacherId_key" ON "Section"("classTeacherId"); 
-- And you'd need to handle potential duplicate classTeacherId values in your data.

-- CreateIndex
CREATE INDEX "StudentEnrollment_academicYearId_idx" ON "StudentEnrollment"("academicYearId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_studentId_idx" ON "StudentEnrollment"("studentId");

-- RenameIndex
ALTER INDEX IF EXISTS "Class_schoolId_name_academicYearId_schoolLevelId_key" RENAME TO "UQ_Class_School_Name_Year_Level";

-- RenameIndex
ALTER INDEX IF EXISTS "Section_classId_name_key" RENAME TO "UQ_Section_Class_Name";

-- RenameIndex
ALTER INDEX IF EXISTS "StudentEnrollment_studentId_academicYearId_key" RENAME TO "UQ_Student_AcademicYear_Enrollment";