// app/api/schools/[schoolId]/parents/me/children/library/loans/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getApiSession } from '@/lib/apiAuth';

// GET: List library book loans for all children linked to the parent
// Optional query: ?status=BORROWED|RETURNED|OVERDUE
// Response shape:
// { children: [ { studentId, name, loans: [ { id, book: { id, title, author, isbn }, quantity, borrowedAt, dueDate, returnedAt, status } ] } ] }
export async function GET(request, { params }) {
    try {
        const session = await getApiSession(request);
        const schoolId = params?.schoolId?.toString();

        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (session.user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        if (!schoolId || session.user.schoolId !== schoolId) return NextResponse.json({ error: 'Wrong school' }, { status: 403 });

        const { searchParams } = new URL(request.url || '');
        const status = searchParams.get('status'); // BORROWED, RETURNED, OVERDUE

        // Locate parent
        const parent = await prisma.parent.findFirst({
            where: { userId: session.user.id, schoolId },
            select: { id: true },
        });
        if (!parent) return NextResponse.json({ children: [] });

        // Linked students
        const links = await prisma.parentStudent.findMany({
            where: { parentId: parent.id },
            select: { studentId: true },
        });
        const studentIds = links.map((l) => l.studentId);
        if (studentIds.length === 0) return NextResponse.json({ children: [] });

        // Students for names
        const students = await prisma.student.findMany({
            where: { id: { in: studentIds }, schoolId },
            select: { id: true, firstName: true, lastName: true },
        });

        const where = { schoolId, studentId: { in: studentIds } };
        if (status && ['BORROWED', 'RETURNED', 'OVERDUE'].includes(status)) {
            where.status = status;
        }

        const loans = await prisma.bookLoan.findMany({
            where,
            include: {
                book: { select: { id: true, title: true, author: true, isbn: true } },
            },
            orderBy: [{ borrowedAt: 'desc' }],
        });

        const byStudent = new Map();
        for (const s of students) {
            byStudent.set(s.id, {
                studentId: s.id,
                name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
                loans: [],
            });
        }
        for (const l of loans) {
            const entry = byStudent.get(l.studentId);
            if (entry) {
                entry.loans.push({
                    id: l.id,
                    book: l.book,
                    quantity: l.quantity,
                    borrowedAt: l.borrowedAt,
                    dueDate: l.dueDate,
                    returnedAt: l.returnedAt,
                    status: l.status,
                });
            }
        }

        return NextResponse.json({ children: Array.from(byStudent.values()) });
    } catch (e) {
        console.error('parents/me/children/library/loans error', e);
        return NextResponse.json({ error: 'Failed to load library loans' }, { status: 500 });
    }
}