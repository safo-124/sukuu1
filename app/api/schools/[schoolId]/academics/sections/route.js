// app/api/schools/[schoolId]/academics/sections/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER')) {
    // Return a structured JSON error response for unauthorized access
    console.warn(`Unauthorized access attempt to /api/schools/${schoolId}/academics/sections by user: ${session?.user?.id}, role: ${session?.user?.role}, schoolId: ${session?.user?.schoolId}`);
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    const sections = await prisma.section.findMany({
      where: { schoolId: schoolId },
      include: {
        class: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ sections }, { status: 200 });
  } catch (error) {
    // Log the full error object on the server for debugging
    console.error(`Failed to fetch sections for school ${schoolId}:`, error);

    // Return a structured JSON error response for server errors
    return NextResponse.json({ error: 'Failed to fetch sections.', details: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}