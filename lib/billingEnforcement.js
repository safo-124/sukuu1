// lib/billingEnforcement.js
// Centralized hard enforcement logic to prevent actions when a school exceeds free tier and is unpaid.
import prisma from '@/lib/prisma';

// Error type so route handlers can distinguish
export class BillingEnforcementError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'BillingEnforcementError';
    this.details = details;
    this.status = 402; // Payment Required semantics
  }
}

export async function assertCanAddStudent(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      freeTierStudentLimit: true,
      upgradeRequired: true,
      paidThrough: true,
      trialEndsAt: true,
    }
  });
  if (!school) return; // no-op if not found; upstream auth will fail anyway

  const now = new Date();
  const paid = school.paidThrough && school.paidThrough > now;
  const trialActive = school.trialEndsAt && school.trialEndsAt > now;

  // Only need to count if not clearly paid or in trial.
  if (!(paid || trialActive)) {
    // Use stored upgradeRequired flag (kept fresh by usage snapshot) to avoid counting every time.
    if (school.upgradeRequired) {
      throw new BillingEnforcementError('Student limit exceeded. Please upgrade to add more students.', {
        code: 'FREE_TIER_LIMIT_REACHED',
        freeTierLimit: school.freeTierStudentLimit,
        paidThrough: school.paidThrough,
        trialEndsAt: school.trialEndsAt,
      });
    }
  }
}
