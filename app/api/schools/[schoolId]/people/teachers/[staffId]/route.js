import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/schools/[schoolId]/people/teachers/[staffId]
// Read-only: returns a single teacher's safe details for allowed roles including TEACHER
export async function GET(request, { params }) {
  const { schoolId, staffId } = await params;
  const session = await getServerSession(authOptions);

  // Allow various school roles to view teacher safe info, including TEACHER
  const allowedRoles = new Set(['SCHOOL_ADMIN', 'HR_MANAGER', 'TEACHER', 'HOSTEL_WARDEN', 'ACCOUNTANT', 'SECRETARY', 'PROCUREMENT_OFFICER']);
  if (!session || session.user?.schoolId !== schoolId || !allowedRoles.has(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const teacher = await prisma.staff.findFirst({
      where: { id: staffId, schoolId, user: { role: 'TEACHER' } },
      include: {
        user: {
          select: {
            id: true, email: true, firstName: true, lastName: true,
            phoneNumber: true, profilePictureUrl: true, role: true, isActive: true
          }
        },
        department: { select: { id: true, name: true } },
      }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json({ teacher }, { status: 200 });
  } catch (error) {
    console.error('GET people/teachers/[staffId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch teacher.' }, { status: 500 });
  }
}
