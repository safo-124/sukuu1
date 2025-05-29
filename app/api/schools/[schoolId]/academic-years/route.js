// app/api/schools/[schoolId]/academic-years/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path as needed

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId: schoolId },
      orderBy: { startDate: 'desc' }, // Show most recent first
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
      }
    });
    return NextResponse.json({ academicYears }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch academic years for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch academic years.' }, { status: 500 });
  }
}