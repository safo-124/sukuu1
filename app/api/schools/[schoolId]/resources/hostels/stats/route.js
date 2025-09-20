// app/api/schools/[schoolId]/resources/hostels/stats/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','HOSTEL_WARDEN','SECRETARY'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [hostels, roomsAgg, occupiedAgg] = await Promise.all([
      prisma.hostel.count({ where: { schoolId } }),
      prisma.hostelRoom.aggregate({ _sum: { bedCapacity: true }, where: { schoolId } }),
      prisma.hostelRoom.aggregate({ _sum: { currentOccupancy: true }, where: { schoolId } }),
    ]);

    const rooms = await prisma.hostelRoom.count({ where: { schoolId } });

    return NextResponse.json({
      hostels,
      rooms,
      totalBeds: roomsAgg?._sum?.bedCapacity ?? 0,
      occupiedBeds: occupiedAgg?._sum?.currentOccupancy ?? 0,
    }, { status: 200 });
  } catch (err) {
    console.error('Hostel stats error', err);
    return NextResponse.json({ error: 'Failed to load hostel stats' }, { status: 500 });
  }
}
