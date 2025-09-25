// app/api/superadmin/analytics/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { computeQuarterBounds } from '@/lib/usageBilling';

// Utility: get last N months boundaries (UTC month starts/ends)
function lastNMonths(n = 6) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0,0,0));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0, 23,59,59));
    out.push({ key: `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`, start, end });
  }
  return out.reverse();
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const months = Math.min(Math.max(parseInt(searchParams.get('months') || '6', 10), 1), 12);
  const top = Math.min(Math.max(parseInt(searchParams.get('top') || '5', 10), 1), 25);

  try {
    const monthWindows = lastNMonths(months);

    // Growth metrics
    const totalSchools = await prisma.school.count();
    const totalUsers = await prisma.user.count();
    const totalStudents = await prisma.student.count();
    const totalParents = await prisma.parent.count();

    // Monthly new schools & users
    const schoolsByMonth = await Promise.all(
      monthWindows.map(async (w) => ({
        key: w.key,
        newSchools: await prisma.school.count({ where: { createdAt: { gte: w.start, lte: w.end }}}),
        newUsers: await prisma.user.count({ where: { createdAt: { gte: w.start, lte: w.end }}})
      }))
    );

    // Usage snapshots -> monthly prorated revenue (same logic as stats endpoint but across months/quarters)
    const settingsRows = await prisma.platformSetting.findMany({ where: { key: { in: ['studentQuarterFee','parentQuarterFee'] }}});
    const getSetting = (k) => settingsRows.find(r => r.key === k)?.value;
    const studentFee = Number(getSetting('studentQuarterFee') ?? 10);
    const parentFee = Number(getSetting('parentQuarterFee') ?? 5);

    // For each month, find snapshots whose quarter contains that month and prorate
    const revenueSeries = [];
    for (const w of monthWindows) {
      // Quarter bounds for any date inside month (use middle of month to avoid boundary issues)
      const mid = new Date(w.start.getTime()); mid.setUTCDate(15);
      const { periodStart, periodEnd } = computeQuarterBounds(mid);
      let monthlyRevenue = 0;
      if (prisma.usageSnapshot) {
        const snaps = await prisma.usageSnapshot.findMany({ where: { periodStart, periodEnd }});
        for (const s of snaps) {
          const quarterAmount = (s.studentCount * studentFee) + (s.parentCount * parentFee);
          monthlyRevenue += (quarterAmount / 3);
        }
      }
      revenueSeries.push({ key: w.key, monthlyRevenue: Number(monthlyRevenue.toFixed(2)) });
    }

    // Top schools by current snapshot monthly amount
    const { periodStart, periodEnd } = computeQuarterBounds(new Date());
    let topSchools = [];
    if (prisma.usageSnapshot) {
      const snaps = await prisma.usageSnapshot.findMany({
        where: { periodStart, periodEnd },
        include: { school: { select: { id: true, name: true } } }
      });
      topSchools = snaps.map(s => ({
        schoolId: s.schoolId,
        schoolName: s.school?.name || 'School',
        students: s.studentCount,
        parents: s.parentCount,
        monthlyAmount: ((s.studentCount * studentFee)+(s.parentCount * parentFee))/3
      }))
      .sort((a,b)=> b.monthlyAmount - a.monthlyAmount)
      .slice(0, top)
      .map((r,i)=> ({ ...r, rank: i+1, monthlyAmount: Number(r.monthlyAmount.toFixed(2)) }));
    }

    // Active vs inactive usage segmentation (simple distribution of active flag & over free tier)
    const activeCounts = await prisma.school.groupBy({ by:['isActive'], _count: { _all: true }}).catch(()=>[]);
    let overFreeCount = 0;
    if (prisma.usageSnapshot) {
      const snaps = await prisma.usageSnapshot.findMany({ where: { periodStart, periodEnd }, include: { school: { select: { freeTierStudentLimit: true } } } });
      overFreeCount = snaps.filter(s => s.studentCount > (s.school?.freeTierStudentLimit ?? 50)).length;
    }

    const analytics = {
      totals: { totalSchools, totalUsers, totalStudents, totalParents },
      growth: schoolsByMonth,
      revenue: revenueSeries,
      topSchools,
      distribution: {
        active: activeCounts.find(a=> a.isActive === true)?._count?._all || 0,
        inactive: activeCounts.find(a=> a.isActive === false)?._count?._all || 0,
        overFreeTier: overFreeCount
      }
    };

    return NextResponse.json(analytics, { status: 200 });
  } catch (error) {
    console.error('Superadmin analytics error', error);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
