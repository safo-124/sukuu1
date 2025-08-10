// app/api/schools/[schoolId]/academics/exam-schedules/[scheduleId]/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateExamScheduleSchema } from '@/validators/exams.validators';

// GET handler to fetch a single schedule
export async function GET(request, { params }) {
    const { schoolId, scheduleId } = params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const schedule = await prisma.examSchedule.findUnique({ where: { id: scheduleId, schoolId } });
        if (!schedule) return NextResponse.json({ error: 'Exam schedule not found.' }, { status: 404 });
        return NextResponse.json({ schedule }, { status: 200 });
    } catch (error) {
        console.error(`API (GET ExamSchedule/${scheduleId}) Error:`, error);
        return NextResponse.json({ error: 'Failed to fetch schedule.' }, { status: 500 });
    }
}

// PUT handler to update a schedule
export async function PUT(request, { params }) {
    const { schoolId, scheduleId } = params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const validation = updateExamScheduleSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
        }
        const updatedSchedule = await prisma.examSchedule.update({
            where: { id: scheduleId, schoolId },
            data: validation.data,
        });
        return NextResponse.json({ success: true, examSchedule: updatedSchedule }, { status: 200 });
    } catch (error) {
        console.error(`API (PUT ExamSchedule/${scheduleId}) Error:`, error);
        if (error.code === 'P2025') return NextResponse.json({ error: 'Schedule not found.' }, { status: 404 });
        return NextResponse.json({ error: 'Failed to update schedule.' }, { status: 500 });
    }
}

// DELETE handler to delete a schedule
export async function DELETE(request, { params }) {
    const { schoolId, scheduleId } = params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'SCHOOL_ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const gradeCount = await prisma.grade.count({ where: { examScheduleId: scheduleId } });
        if (gradeCount > 0) {
            return NextResponse.json({ error: `Cannot delete schedule. It is linked to ${gradeCount} grade record(s).` }, { status: 409 });
        }
        await prisma.examSchedule.delete({ where: { id: scheduleId, schoolId } });
        return NextResponse.json({ success: true, message: 'Exam schedule deleted successfully.' }, { status: 200 });
    } catch (error) {
        console.error(`API (DELETE ExamSchedule/${scheduleId}) Error:`, error);
        if (error.code === 'P2025') return NextResponse.json({ error: 'Schedule not found.' }, { status: 404 });
        return NextResponse.json({ error: 'Failed to delete schedule.' }, { status: 500 });
    }
}
