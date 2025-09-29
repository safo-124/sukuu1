/*
  Warnings:

  - You are about to drop the column `publishAt` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `publishAt` on the `ExamSchedule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "publishAt";

-- AlterTable
ALTER TABLE "ExamSchedule" DROP COLUMN "publishAt";
