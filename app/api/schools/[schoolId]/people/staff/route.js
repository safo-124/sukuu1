import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { schoolIdSchema } from '@/validators/academics.validators';

// GET /api/schools/[schoolId]/people/staff
// Returns a unified list of staff user objects (User records) across roles.
// Query params:
//  - roles: comma-separated list of roles to include. Defaults to common staff roles.
//  - search: filter by first/last name (case-insensitive contains)
//  - page, limit: pagination
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (
    session.user?.role !== 'SCHOOL_ADMIN' &&
    session.user?.role !== 'ACCOUNTANT' &&
    session.user?.role !== 'PROCUREMENT_OFFICER' &&
    session.user?.role !== 'SECRETARY' &&
    session.user?.role !== 'HR_MANAGER' &&
    session.user?.role !== 'TEACHER'
  )) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);

    const { searchParams } = new URL(request.url);
    const rolesParam = searchParams.get('roles');
    const searchTerm = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 1000);
    const skip = (page - 1) * limit;

    const defaultRoles = ['TEACHER', 'ACCOUNTANT', 'PROCUREMENT_OFFICER', 'HR_MANAGER', 'SECRETARY'];
    const roles = (rolesParam ? rolesParam.split(',') : defaultRoles).map(r => r.trim()).filter(Boolean);

    // Fetch staff-based users by roles
    const whereStaff = {
      schoolId,
      user: {
        role: { in: roles.filter(r => r !== 'SCHOOL_ADMIN') },
        ...(searchTerm ? {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName:  { contains: searchTerm, mode: 'insensitive' } },
          ]
        } : {}),
      },
    };

    const [staffRows, totalStaff] = await prisma.$transaction([
      prisma.staff.findMany({
        where: whereStaff,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, profilePictureUrl: true, role: true } } },
        orderBy: [
          { user: { lastName: 'asc' } },
          { user: { firstName: 'asc' } },
        ],
        skip,
        take: limit,
      }),
      prisma.staff.count({ where: whereStaff })
    ]);

    let users = staffRows.map(s => s.user);

    // Optionally include SCHOOL_ADMIN users directly from User table if requested
    if (roles.includes('SCHOOL_ADMIN')) {
      const adminUsers = await prisma.user.findMany({
        where: {
          schoolId,
          role: 'SCHOOL_ADMIN',
          ...(searchTerm ? {
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName:  { contains: searchTerm, mode: 'insensitive' } },
            ]
          } : {}),
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
        take: limit,
      });
      const existingIds = new Set(users.map(u => u.id));
      for (const u of adminUsers) {
        if (!existingIds.has(u.id)) users.push(u);
      }
    }

    return NextResponse.json({
      users,
      pagination: {
        currentPage: page,
        total: totalStaff, // Not exact if including admins, acceptable for our usage
        limit,
      }
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Staff Users) - Detailed error for school ${schoolId}:`, {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      clientVersion: error?.clientVersion,
      meta: error?.meta,
      stack: error?.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve staff users.', details: error?.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
