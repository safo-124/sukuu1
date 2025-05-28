// app/api/superadmin/stats/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path as needed

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const totalSchools = await prisma.school.count();
    const activeSchools = await prisma.school.count({
      where: { isActive: true },
    });
    const inactiveSchools = await prisma.school.count({
      where: { isActive: false },
    });
    const totalSchoolAdmins = await prisma.user.count({
      where: { role: 'SCHOOL_ADMIN' },
    });

    // You could add more stats here, e.g., total students, teachers across all schools
    // but be mindful of query performance if data grows very large.
    // For now, these are good starting stats.

    const stats = {
      totalSchools,
      activeSchools,
      inactiveSchools,
      totalSchoolAdmins,
    };

    return NextResponse.json(stats, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch super admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics. An internal error occurred.' }, { status: 500 });
  }
}