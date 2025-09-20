// app/api/schools/[schoolId]/resources/hostels/[hostelId]/stats/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, hostelIdSchema } from '@/validators/resources.validators';

export async function GET(request, { params }) {
  const { schoolId, hostelId } = params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','HOSTEL_WARDEN','TEACHER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);

    // Ensure hostel exists in school
    const hostel = await prisma.hostel.findFirst({ where: { id: hostelId, schoolId }, select: { id: true } });
    if (!hostel) return NextResponse.json({ error: 'Hostel not found' }, { status: 404 });

    const [roomAgg, totalRooms, genderGroup] = await prisma.$transaction([
      prisma.hostelRoom.aggregate({
        where: { schoolId, hostelId },
        _sum: { bedCapacity: true, currentOccupancy: true }
      }),
      prisma.hostelRoom.count({ where: { schoolId, hostelId } }),
      prisma.student.groupBy({
        by: ['gender'],
        where: { schoolId, hostelRoom: { hostelId } },
        _count: { _all: true }
      })
    ]);

    const capacity = roomAgg._sum.bedCapacity || 0;
    const occupancy = roomAgg._sum.currentOccupancy || 0;
    const vacancy = Math.max(capacity - occupancy, 0);
    const occupancyRate = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;

    const genderSplit = { MALE: 0, FEMALE: 0, OTHER: 0, PREFER_NOT_TO_SAY: 0, UNKNOWN: 0 };
    for (const g of genderGroup) {
      const key = g.gender || 'UNKNOWN';
      genderSplit[key] = g._count._all;
    }

    return NextResponse.json({
      totals: { rooms: totalRooms, capacity, occupancy, vacancy, occupancyRate },
      genderSplit
    }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: err.issues }, { status: 400 });
    }
    console.error('Hostel stats (single) error', err);
    return NextResponse.json({ error: 'Failed to fetch hostel stats' }, { status: 500 });
  }
}
