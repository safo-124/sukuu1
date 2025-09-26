-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('OBJECTIVE', 'SUBJECT');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "objectives" JSONB,
ADD COLUMN     "type" "AssignmentType" NOT NULL DEFAULT 'SUBJECT';
