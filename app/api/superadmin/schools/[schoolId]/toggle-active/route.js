// app/api/superadmin/schools/[schoolId]/toggle-active/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { schoolId } = await params;

  if (!schoolId) {
    return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: { isActive: !school.isActive }, // Toggle the current status
    });

    return NextResponse.json({ success: true, school: updatedSchool }, { status: 200 });

  } catch (error) {
    console.error(`Failed to toggle active status for school ${schoolId}:`, error);
    if (error.code === 'P2025') { // Record to update not found
        return NextResponse.json({ error: 'School not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update school status. An internal error occurred.' }, { status: 500 });
  }
}