// app/api/schools/[schoolId]/students/me/attendance/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: return attendance for the logged-in student (read-only)
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PRESENT | ABSENT | LATE | EXCUSED
    const from = searchParams.get('from'); // YYYY-MM-DD
    const to = searchParams.get('to'); // YYYY-MM-DD
    const currentOnly = (searchParams.get('currentOnly') ?? '1') !== '0';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const skip = (page - 1) * limit;

    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      // include entire end day
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const where = {
      schoolId,
      ...(status ? { status } : {}),
      ...(from || to ? { date: dateFilter } : {}),
      studentEnrollment: {
        is: {
          ...(currentOnly ? { isCurrent: true } : {}),
          student: { is: { userId: session.user.id } },
        },
      },
    };

    const [records, total] = await prisma.$transaction([
      prisma.attendance.findMany({
        where,
        include: {
          section: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
          studentEnrollment: { select: { id: true, academicYear: { select: { id: true, name: true } } } },
        },
        orderBy: [{ date: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    return NextResponse.json({
      attendance: records.map((r) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        remarks: r.remarks,
        section: r.section ? { id: r.section.id, name: r.section.name, class: r.section.class } : null,
        academicYear: r.studentEnrollment?.academicYear || null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error('Student self attendance error', e);
    return NextResponse.json({ error: 'Failed to fetch attendance', details: e?.message || null }, { status: 500 });
  }
}
