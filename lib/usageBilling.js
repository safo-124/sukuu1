// lib/usageBilling.js
// Core logic for usage-based billing snapshots & invoice generation
import prisma from '@/lib/prisma';
import { getAllPlatformSettings } from './platformSettings';

// Determine the current quarter (3-month window) a date falls into
export function computeQuarterBounds(date = new Date()) {
  const d = new Date(date);
  const month = d.getUTCMonth(); // 0-11
  const quarterIndex = Math.floor(month / 3); // 0..3
  const startMonth = quarterIndex * 3; // 0,3,6,9
  const periodStart = new Date(Date.UTC(d.getUTCFullYear(), startMonth, 1, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(d.getUTCFullYear(), startMonth + 3, 0, 23, 59, 59)); // last day of 3rd month
  return { periodStart, periodEnd };
}

// Count billable entities for a school
async function countBillableForSchool(schoolId) {
  const [studentCount, parentCount] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.parent.count({ where: { schoolId } })
  ]);
  return { studentCount, parentCount };
}

// Capture usage snapshot; if schoolId omitted, capture for all active schools
export async function captureUsageSnapshot({ schoolId, now = new Date() } = {}) {
  const settings = await getAllPlatformSettings();
  const studentFee = Number(settings.studentQuarterFee || 10);
  const parentFee = Number(settings.parentQuarterFee || 5);
  const { periodStart, periodEnd } = computeQuarterBounds(now);

  const schoolFilter = schoolId ? { id: schoolId, isActive: true } : { isActive: true };
  const schools = await prisma.school.findMany({ where: schoolFilter, select: { id: true, freeTierStudentLimit: true, upgradeRequired: true } }).catch(async () => {
    // Fallback: fields might not exist yet if migration not applied at runtime
    const raw = await prisma.school.findMany({ where: schoolFilter, select: { id: true } });
    return raw.map(r => ({ ...r, freeTierStudentLimit: 50, upgradeRequired: false }));
  });

  const snapshots = [];
  for (const s of schools) {
    const { studentCount, parentCount } = await countBillableForSchool(s.id);
    // Free tier check
    const overFreeTier = studentCount > (s.freeTierStudentLimit || 50);
    const totalAmount = (studentCount * studentFee) + (parentCount * parentFee);

    if (!prisma.usageSnapshot) {
      // Skip if model not ready; continue loop
      snapshots.push({ snapshot: null, totalAmount, studentCount, parentCount, overFreeTier });
      continue;
    }
    const snapshot = await prisma.usageSnapshot.upsert({
      where: { schoolId_periodStart_periodEnd: { schoolId: s.id, periodStart, periodEnd } },
      update: { studentCount, parentCount },
      create: { schoolId: s.id, periodStart, periodEnd, studentCount, parentCount }
    });

    // Update upgradeRequired flag if necessary (soft enforcement)
    if (overFreeTier !== s.upgradeRequired) {
      await prisma.school.update({ where: { id: s.id }, data: { upgradeRequired: overFreeTier } });
    }
    snapshots.push({ snapshot, totalAmount, studentCount, parentCount, overFreeTier });
  }

  return { periodStart, periodEnd, count: snapshots.length, snapshots };
}

// Generate billing invoices for any snapshots (DRAFT) not yet invoiced
export async function generateBillingInvoices({ periodStart, periodEnd }) {
  const settings = await getAllPlatformSettings();
  const studentFee = Number(settings.studentQuarterFee || 10);
  const parentFee = Number(settings.parentQuarterFee || 5);

  if (!prisma.usageSnapshot || !prisma.billingInvoice) {
    return { createdCount: 0, invoices: [] };
  }
  const snapshots = await prisma.usageSnapshot.findMany({
    where: { periodStart, periodEnd },
    include: { billingInvoice: true }
  });

  const created = [];
  for (const snap of snapshots) {
    if (snap.billingInvoice) continue; // already invoiced
    const totalAmount = (snap.studentCount * studentFee) + (snap.parentCount * parentFee);
    const dueDate = new Date(periodEnd);
    dueDate.setUTCDate(dueDate.getUTCDate() + 14);
    const invoice = await prisma.billingInvoice.create({
      data: {
        schoolId: snap.schoolId,
        usageSnapshotId: snap.id,
        periodStart,
        periodEnd,
        dueDate,
        totalAmount,
        status: 'GENERATED',
        lines: {
          create: [
            {
              description: `Students (${snap.studentCount}) @ ${studentFee} GHS / quarter`,
              quantity: snap.studentCount,
              unitPrice: studentFee,
              lineTotal: snap.studentCount * studentFee
            },
            {
              description: `Parents (${snap.parentCount}) @ ${parentFee} GHS / quarter`,
              quantity: snap.parentCount,
              unitPrice: parentFee,
              lineTotal: snap.parentCount * parentFee
            }
          ]
        }
      },
      include: { lines: true }
    });
    created.push(invoice);
  }
  return { createdCount: created.length, invoices: created };
}

// High-level quarterly run (capture + invoice)
export async function runQuarterlyBilling({ now = new Date() } = {}) {
  const { periodStart, periodEnd } = computeQuarterBounds(now);
  const snapshotResult = await captureUsageSnapshot({ now });
  const invoiceResult = await generateBillingInvoices({ periodStart, periodEnd });
  if (prisma.billingRunLog) {
    await prisma.billingRunLog.create({
    data: {
      periodStart,
      periodEnd,
      schoolsProcessed: snapshotResult.count,
      invoicesCreated: invoiceResult.createdCount,
      notes: 'Automated quarterly billing run'
    }
    });
  }
  return { periodStart, periodEnd, snapshotResult, invoiceResult };
}
