// app/api/superadmin/stats/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path as needed
import { computeQuarterBounds } from '@/lib/usageBilling';

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
    const totalUsers = await prisma.user.count();

    // You could add more stats here, e.g., total students, teachers across all schools
    // but be mindful of query performance if data grows very large.
    // For now, these are good starting stats.

    // ---------- Billing (Monthly) ----------
    // We store quarterly snapshots; convert latest quarter usage into a monthly figure
    // Strategy: for each school, take its snapshot for the current quarter (if any),
    // compute invoice amount (students * studentFee + parents * parentFee), divide by 3.
    // Fees are in PlatformSetting or default 10 (student) / 5 (parent).
  let monthlyRevenue = 0;
  let perSchoolMonthly = [];
    try {
      const settingsRows = await prisma.platformSetting.findMany({
        where: { key: { in: ['studentQuarterFee', 'parentQuarterFee'] } }
      });
      const getSetting = (k) => settingsRows.find(r => r.key === k)?.value;
      const studentFee = Number(getSetting('studentQuarterFee') ?? 10);
      const parentFee = Number(getSetting('parentQuarterFee') ?? 5);
      const { periodStart, periodEnd } = computeQuarterBounds(new Date());
      if (prisma.usageSnapshot) {
        const snapshots = await prisma.usageSnapshot.findMany({
          where: { periodStart, periodEnd },
          include: { school: { select: { id: true, name: true, freeTierStudentLimit: true, upgradeRequired: true } } }
        });
        perSchoolMonthly = snapshots.map(s => {
          const quarterAmount = (s.studentCount * studentFee) + (s.parentCount * parentFee);
          const monthlyAmount = quarterAmount / 3;
          const overFreeTier = s.studentCount > (s.school?.freeTierStudentLimit ?? 50);
          return {
            schoolId: s.schoolId,
            schoolName: s.school?.name || 'School',
            studentCount: s.studentCount,
            parentCount: s.parentCount,
            quarterAmount,
            monthlyAmount,
            overFreeTier,
            freeTierLimit: s.school?.freeTierStudentLimit ?? 50,
            upgradeRequired: s.school?.upgradeRequired ?? false
          };
        });
        monthlyRevenue = perSchoolMonthly.reduce((sum, r) => sum + r.monthlyAmount, 0);
        // Add percentage contribution now that we know total
        if (monthlyRevenue > 0) {
          perSchoolMonthly = perSchoolMonthly.map(r => ({
            ...r,
            monthlyPercent: Number(((r.monthlyAmount / monthlyRevenue) * 100).toFixed(2))
          }));
        }
      }
    } catch (e) {
      console.warn('Billing monthly revenue calc failed (non-fatal)', e);
    }

    const stats = {
      totalSchools,
      activeSchools,
      inactiveSchools,
      totalSchoolAdmins,
      totalUsers,
      monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
      perSchoolMonthly
    };

    return NextResponse.json(stats, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch super admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics. An internal error occurred.' }, { status: 500 });
  }
}