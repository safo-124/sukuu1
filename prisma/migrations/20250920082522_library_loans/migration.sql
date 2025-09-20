-- CreateEnum
CREATE TYPE "TimetableRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- AlterTable
ALTER TABLE "TimetableEntry" ADD COLUMN     "generatedByRunId" TEXT;

-- CreateTable
CREATE TABLE "SectionSubjectRequirement" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "periodsPerWeek" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "minGapMins" INTEGER NOT NULL DEFAULT 0,
    "allowDouble" BOOLEAN NOT NULL DEFAULT false,
    "preferredRoomType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionSubjectRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUnavailability" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomUnavailability" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PinnedTimetableSlot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "staffId" TEXT,
    "roomId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PinnedTimetableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableRun" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT,
    "status" "TimetableRunStatus" NOT NULL DEFAULT 'PENDING',
    "optionsJson" JSONB,
    "metricsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetablePlacement" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "roomId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "violations" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimetablePlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectionSubjectRequirement_schoolId_idx" ON "SectionSubjectRequirement"("schoolId");

-- CreateIndex
CREATE INDEX "SectionSubjectRequirement_sectionId_idx" ON "SectionSubjectRequirement"("sectionId");

-- CreateIndex
CREATE INDEX "SectionSubjectRequirement_subjectId_idx" ON "SectionSubjectRequirement"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionSubjectRequirement_schoolId_sectionId_subjectId_key" ON "SectionSubjectRequirement"("schoolId", "sectionId", "subjectId");

-- CreateIndex
CREATE INDEX "StaffUnavailability_schoolId_idx" ON "StaffUnavailability"("schoolId");

-- CreateIndex
CREATE INDEX "StaffUnavailability_staffId_dayOfWeek_idx" ON "StaffUnavailability"("staffId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "RoomUnavailability_schoolId_idx" ON "RoomUnavailability"("schoolId");

-- CreateIndex
CREATE INDEX "RoomUnavailability_roomId_dayOfWeek_idx" ON "RoomUnavailability"("roomId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "PinnedTimetableSlot_schoolId_idx" ON "PinnedTimetableSlot"("schoolId");

-- CreateIndex
CREATE INDEX "PinnedTimetableSlot_sectionId_dayOfWeek_startTime_idx" ON "PinnedTimetableSlot"("sectionId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "TimetableRun_schoolId_idx" ON "TimetableRun"("schoolId");

-- CreateIndex
CREATE INDEX "TimetablePlacement_runId_idx" ON "TimetablePlacement"("runId");

-- CreateIndex
CREATE INDEX "TimetablePlacement_schoolId_idx" ON "TimetablePlacement"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetablePlacement_runId_sectionId_dayOfWeek_startTime_key" ON "TimetablePlacement"("runId", "sectionId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "TimetableEntry_generatedByRunId_idx" ON "TimetableEntry"("generatedByRunId");

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_generatedByRunId_fkey" FOREIGN KEY ("generatedByRunId") REFERENCES "TimetableRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSubjectRequirement" ADD CONSTRAINT "SectionSubjectRequirement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSubjectRequirement" ADD CONSTRAINT "SectionSubjectRequirement_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSubjectRequirement" ADD CONSTRAINT "SectionSubjectRequirement_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffUnavailability" ADD CONSTRAINT "StaffUnavailability_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffUnavailability" ADD CONSTRAINT "StaffUnavailability_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomUnavailability" ADD CONSTRAINT "RoomUnavailability_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomUnavailability" ADD CONSTRAINT "RoomUnavailability_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedTimetableSlot" ADD CONSTRAINT "PinnedTimetableSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedTimetableSlot" ADD CONSTRAINT "PinnedTimetableSlot_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedTimetableSlot" ADD CONSTRAINT "PinnedTimetableSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedTimetableSlot" ADD CONSTRAINT "PinnedTimetableSlot_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedTimetableSlot" ADD CONSTRAINT "PinnedTimetableSlot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableRun" ADD CONSTRAINT "TimetableRun_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePlacement" ADD CONSTRAINT "TimetablePlacement_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TimetableRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
