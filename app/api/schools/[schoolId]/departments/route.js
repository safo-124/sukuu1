// app/api/schools/[schoolId]/departments/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { schoolId } = params;

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' /* && other authorized roles */)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const departments = await prisma.department.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      }
    });
    return NextResponse.json({ departments }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch departments for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch departments.' }, { status: 500 });
  }
}