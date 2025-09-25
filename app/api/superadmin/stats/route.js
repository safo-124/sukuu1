// app/api/superadmin/stats/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Adjust path as needed
import { computeQuarterBounds } from '@/lib/usageBilling';

// -------------------------------------------------
// Lightweight in-memory cache (2 min TTL)
// -------------------------------------------------
let statsCache = null; // { data, ts }
const CACHE_TTL_MS = 120000; // 2 minutes
const getCache = () => statsCache && (Date.now() - statsCache.ts < CACHE_TTL_MS) ? statsCache.data : null;
const setCache = (data) => { statsCache = { data, ts: Date.now() }; };

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Serve cached value if fresh
    const cached = getCache();
    if (cached) return NextResponse.json({ ...cached, _cached: true }, { status: 200 });
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

    // ---------- Billing (Monthly + Trend + Series) ----------
    let monthlyRevenue = 0;
    let perSchoolMonthly = [];
    let monthlyRevenueTrendPct = null; // % vs previous quarter monthly average
    let mrrSeries = []; // [{ month: 'YYYY-MM', value }]
    let arpuSeries = []; // Average revenue per user per month
    try {
      const settingsRows = await prisma.platformSetting.findMany({ where: { key: { in: ['studentQuarterFee', 'parentQuarterFee'] } } });
      const getSetting = (k) => settingsRows.find(r => r.key === k)?.value;
      const studentFee = Number(getSetting('studentQuarterFee') ?? 10);
      const parentFee = Number(getSetting('parentQuarterFee') ?? 5);

      const now = new Date();
      const { periodStart, periodEnd } = computeQuarterBounds(now);
      const prevAnchor = new Date(periodStart); prevAnchor.setUTCDate(prevAnchor.getUTCDate() - 1);
      const { periodStart: prevStart, periodEnd: prevEnd } = computeQuarterBounds(prevAnchor);

      if (prisma.usageSnapshot) {
        const [currentSnaps, prevSnaps] = await Promise.all([
          prisma.usageSnapshot.findMany({ where: { periodStart, periodEnd }, include: { school: { select: { id: true, name: true, freeTierStudentLimit: true } } } }),
          prisma.usageSnapshot.findMany({ where: { periodStart: prevStart, periodEnd: prevEnd }, include: { school: { select: { id: true, name: true, freeTierStudentLimit: true } } } })
        ]);

        perSchoolMonthly = currentSnaps.map(s => {
          const quarterAmount = (s.studentCount * studentFee) + (s.parentCount * parentFee);
          const monthlyAmount = quarterAmount / 3;
          const freeTierLimit = s.school?.freeTierStudentLimit ?? 50;
          const overFreeTier = s.studentCount > freeTierLimit;
          return {
            schoolId: s.schoolId,
            schoolName: s.school?.name || 'School',
            studentCount: s.studentCount,
            parentCount: s.parentCount,
            quarterAmount,
            monthlyAmount,
            freeTierLimit,
            overFreeTier
          };
        });
        monthlyRevenue = perSchoolMonthly.reduce((sum, r) => sum + r.monthlyAmount, 0);
        const prevMonthly = prevSnaps.reduce((sum, s) => sum + ((s.studentCount * studentFee) + (s.parentCount * parentFee)), 0) / 3;
        if (prevMonthly > 0) {
          monthlyRevenueTrendPct = ((monthlyRevenue - prevMonthly) / prevMonthly) * 100;
        }

        // Build series for last 4 quarters (approx monthly by spreading evenly across months)
        const quarters = [];
        let cursor = new Date(periodStart);
        for (let i = 0; i < 4; i++) {
          const { periodStart: qStart, periodEnd: qEnd } = computeQuarterBounds(cursor);
          quarters.unshift({ qStart, qEnd });
          cursor = new Date(qStart); cursor.setUTCDate(cursor.getUTCDate() - 1); // move back 1 day into previous quarter
        }
        for (const q of quarters) {
          const snaps = await prisma.usageSnapshot.findMany({ where: { periodStart: q.qStart, periodEnd: q.qEnd } });
          if (snaps.length === 0) continue;
          const quarterRevenue = snaps.reduce((sum, s) => sum + ((s.studentCount * studentFee) + (s.parentCount * parentFee)), 0);
          const totalUsers = snaps.reduce((sum, s) => sum + s.studentCount + s.parentCount, 0);
          const arpuQuarter = totalUsers > 0 ? quarterRevenue / totalUsers : 0;
          const startMonth = q.qStart.getUTCMonth();
          for (let m = 0; m < 3; m++) {
            const monthDate = new Date(Date.UTC(q.qStart.getUTCFullYear(), startMonth + m, 1));
            const label = monthDate.toISOString().slice(0,7);
            mrrSeries.push({ month: label, value: Number((quarterRevenue / 3).toFixed(2)) });
            arpuSeries.push({ month: label, value: Number(arpuQuarter.toFixed(2)) });
          }
        }
      }
    } catch (billingErr) {
      console.warn('Billing monthly revenue calc failed (non-fatal)', billingErr);
    }

    const stats = {
      totalSchools,
      activeSchools,
      inactiveSchools,
      totalSchoolAdmins,
      totalUsers,
      monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
      perSchoolMonthly,
      monthlyRevenueTrendPct: monthlyRevenueTrendPct !== null ? Number(monthlyRevenueTrendPct.toFixed(2)) : null,
      mrrSeries,
      arpuSeries
    };

    setCache(stats);

  return NextResponse.json(stats, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch super admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics. An internal error occurred.' }, { status: 500 });
  }
}