-- AlterTable
ALTER TABLE "SchoolRequest" ADD COLUMN     "requestedModules" TEXT[] DEFAULT ARRAY[]::TEXT[];
