// prisma/seed.js (CLEAN REWRITE)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const prisma = new PrismaClient();

const rolesToSeed = [
  { role: 'SUPER_ADMIN', envEmail: 'SEED_SUPERADMIN_EMAIL', envPass: 'SEED_SUPERADMIN_PASSWORD', defaultEmail: 'superadmin@example.com', firstName: 'Super', lastName: 'Admin', jobTitle: 'System Owner' },
  { role: 'ACCOUNTANT', envEmail: 'SEED_ACCOUNTANT_EMAIL', envPass: 'SEED_ACCOUNTANT_PASSWORD', defaultEmail: 'accountant@example.com', firstName: 'Alice', lastName: 'Accounts', jobTitle: 'Accountant' },
  { role: 'TEACHER', envEmail: 'SEED_TEACHER_EMAIL', envPass: 'SEED_TEACHER_PASSWORD', defaultEmail: 'teacher@example.com', firstName: 'Thomas', lastName: 'Teacher', jobTitle: 'Teacher' },
];

async function ensureUserAndStaff(entry, schoolId) {
  const email = process.env[entry.envEmail] || entry.defaultEmail;
  const passwordSourceEnv = !!process.env[entry.envPass];
  const plainPassword = process.env[entry.envPass] || 'ChangeMe123!';
  const forceReset = process.env.FORCE_RESET_SEED_PASSWORDS === 'true';

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        role: entry.role,
        firstName: entry.firstName,
        lastName: entry.lastName,
        isActive: true,
        schoolId: entry.role === 'SUPER_ADMIN' ? null : schoolId,
      },
    });
    console.log(`Created user ${email} (${entry.role}) passwordSource=${passwordSourceEnv ? 'ENV' : 'DEFAULT'} length=${plainPassword.length}`);
  } else if (forceReset) {
    // Optionally force reset seed user passwords to the current plainPassword
    let needsReset = true;
    try {
      needsReset = !(await bcrypt.compare(plainPassword, user.hashedPassword));
    } catch (_) {}
    if (needsReset) {
      const newHash = await bcrypt.hash(plainPassword, 10);
      await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: newHash } });
      console.log(`Reset password for existing seed user ${email} (${entry.role}) passwordSource=${passwordSourceEnv ? 'ENV' : 'DEFAULT'}`);
    } else {
      console.log(`Password already up-to-date for ${email} (${entry.role})`);
    }
  }

  if (entry.role !== 'SUPER_ADMIN') {
    let staff = await prisma.staff.findFirst({ where: { userId: user.id } });
    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          userId: user.id,
          staffIdNumber: `${entry.role.substring(0,3)}-${Date.now().toString().slice(-5)}`,
          jobTitle: entry.jobTitle,
          schoolId: schoolId,
        },
      });
      console.log(`Created staff profile for ${email}`);
    }
  }
  return user;
}

async function ensureSchool() {
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'Demo International School',
        subdomain: 'demo',
        customDomain: null,
        address: '123 Demo Street, Accra, Ghana',
        contactInfo: 'info@demo.school | +2330000000',
        hasFinanceModule: true,
        isActive: true,
      },
    });
    console.log('Created demo school');
  }
  return school;
}

async function ensureAcademicYear(school) {
  let academicYear = await prisma.academicYear.findFirst({ where: { schoolId: school.id, isCurrent: true } });
  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        name: '2025/2026',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-07-31'),
        isCurrent: true,
        schoolId: school.id,
      },
    });
    console.log('Created academic year');
  }
  return academicYear;
}

async function ensureLevel(school) {
  let level = await prisma.schoolLevel.findFirst({ where: { schoolId: school.id } });
  if (!level) {
    level = await prisma.schoolLevel.create({
      data: {
        name: 'JHS 1',
        description: 'Junior High School 1',
        schoolId: school.id,
      },
    });
    console.log('Created level');
  }
  return level;
}

async function ensureClass(school, academicYear, level) {
  let klass = await prisma.class.findFirst({ where: { schoolId: school.id, academicYearId: academicYear.id } });
  if (!klass) {
    klass = await prisma.class.create({
      data: {
        name: 'JHS 1 A',
        schoolId: school.id,
        schoolLevelId: level.id,
        academicYearId: academicYear.id,
      },
    });
    console.log('Created class');
  }
  return klass;
}

async function ensureSection(klass, school) {
  let section = await prisma.section.findFirst({ where: { classId: klass.id } });
  if (!section) {
    section = await prisma.section.create({
      data: {
        name: 'A',
        classId: klass.id,
        schoolId: school.id,
        classTeacherId: null,
      },
    });
    console.log('Created section');
  }
  return section;
}

async function ensureStudents(school, count = 5) {
  const students = [];
  for (let i = 1; i <= count; i++) {
    const idNum = `STU${i.toString().padStart(3,'0')}`;
    let student = await prisma.student.findFirst({ where: { schoolId: school.id, studentIdNumber: idNum } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          firstName: 'Student',
          lastName: `Demo${i}`,
          studentIdNumber: idNum,
          gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
          schoolId: school.id,
        },
      });
      console.log(`Created student ${idNum}`);
    }
    students.push(student);
  }
  return students;
}

async function ensureEnrollments(students, academicYear, section, school) {
  for (const s of students) {
    const enrollment = await prisma.studentEnrollment.findFirst({ where: { studentId: s.id, academicYearId: academicYear.id } });
    if (!enrollment) {
      await prisma.studentEnrollment.create({
        data: {
          studentId: s.id,
          academicYearId: academicYear.id,
          sectionId: section.id,
          schoolId: school.id,
        },
      });
      console.log(`Enrolled ${s.studentIdNumber}`);
    }
  }
}

async function ensureFeeStructures(academicYear, klass, level, school) {
  // Always include components when fetching
  let classFee = await prisma.feeStructure.findFirst({
    where: { schoolId: school.id, academicYearId: academicYear.id, classId: klass.id },
    include: { components: true },
  });
  if (!classFee) {
    classFee = await prisma.feeStructure.create({
      data: {
        name: 'Tuition - Term 1',
        description: 'Base tuition for first term',
        amount: 1500,
        frequency: 'TERMLY',
        academicYearId: academicYear.id,
        classId: klass.id,
        schoolId: school.id,
        components: { create: [
          { name: 'Base Tuition', amount: 1200, order: 1, schoolId: school.id },
          { name: 'PTA Levy', amount: 300, order: 2, schoolId: school.id },
        ]},
      },
      include: { components: true },
    });
    console.log('Created class fee structure');
  }

  let levelFee = await prisma.feeStructure.findFirst({
    where: { schoolId: school.id, academicYearId: academicYear.id, schoolLevelId: level.id, classId: null },
    include: { components: true },
  });
  if (!levelFee) {
    levelFee = await prisma.feeStructure.create({
      data: {
        name: 'Development Levy',
        description: 'Infrastructure development support',
        amount: 400,
        frequency: 'TERMLY',
        academicYearId: academicYear.id,
        schoolLevelId: level.id,
        schoolId: school.id,
        components: { create: [
          { name: 'Building Fund', amount: 250, order: 1, schoolId: school.id },
          { name: 'ICT Upgrade', amount: 150, order: 2, schoolId: school.id },
        ]},
      },
      include: { components: true },
    });
    console.log('Created level fee structure');
  }
  return { classFee, levelFee };
}

async function ensureAssignments(students, feeStructure, academicYear, klass, level, school) {
  let created = 0; let existing = 0;
  for (const s of students) {
    const found = await prisma.studentFeeAssignment.findFirst({ where: { studentId: s.id, feeStructureId: feeStructure.id, academicYearId: academicYear.id } });
    if (found) { existing++; continue; }
    await prisma.studentFeeAssignment.create({
      data: {
        studentId: s.id,
        feeStructureId: feeStructure.id,
        academicYearId: academicYear.id,
        classId: feeStructure.classId ? klass.id : null,
        schoolLevelId: feeStructure.schoolLevelId ? level.id : null,
        schoolId: school.id,
        isActive: true,
      },
    });
    created++;
  }
  return { created, existing };
}

async function generateInvoicesForFeeStructure(students, feeStructure, school) {
  let created = 0; let skipped = 0; let totalAmount = 0; const invoiceIds = [];
  const components = Array.isArray(feeStructure.components) ? feeStructure.components : [];
  const componentIds = components.map(c => c.id);
  for (const s of students) {
    const existingItem = await prisma.invoiceItem.findFirst({
      where: {
        schoolId: school.id,
        invoice: { studentId: s.id },
        OR: [
          { feeStructureId: feeStructure.id },
          ...(componentIds.length ? [{ feeStructureComponentId: { in: componentIds } }] : []),
        ],
      },
    });
    if (existingItem) { skipped++; continue; }

    const items = components.length ? components.map(c => ({
      description: c.name,
      quantity: 1,
      unitPrice: c.amount,
      totalPrice: c.amount,
      feeStructureId: feeStructure.id,
      feeStructureComponentId: c.id,
      schoolId: school.id,
    })) : [{
      description: feeStructure.name,
      quantity: 1,
      unitPrice: feeStructure.amount,
      totalPrice: feeStructure.amount,
      feeStructureId: feeStructure.id,
      schoolId: school.id,
    }];
    const invoiceTotal = items.reduce((a,b)=>a+b.totalPrice,0);
    totalAmount += invoiceTotal;
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const createdInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        studentId: s.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14*24*60*60*1000),
        totalAmount: invoiceTotal,
        paidAmount: 0,
        status: 'DRAFT',
        schoolId: school.id,
        items: { create: items },
      },
      select: { id: true },
    });
    invoiceIds.push(createdInvoice.id);
    created++;
  }
  return { created, skipped, totalAmount, invoiceIds };
}

// --- New Seed Helpers (Finance Enhancements) ---
async function ensureVendors(school) {
  const base = [
    { name: 'Stationery World', contactPerson: 'Ama K.', email: 'stationery@example.com' },
    { name: 'ICT Solutions Ltd', contactPerson: 'Kwesi T.', email: 'ict@example.com' },
  ];
  const vendors = [];
  for (const v of base) {
    let existing = await prisma.vendor.findFirst({ where: { schoolId: school.id, name: v.name } });
    if (!existing) {
      existing = await prisma.vendor.create({ data: { ...v, phone: null, address: null, schoolId: school.id } });
      console.log(`Created vendor ${v.name}`);
    }
    vendors.push(existing);
  }
  return vendors;
}

async function ensureExpenseCategories(school) {
  const names = [
    { name: 'Office Supplies', description: 'Stationery & consumables' },
    { name: 'Utilities', description: 'Electricity / Water / Internet' },
    { name: 'Maintenance', description: 'Repairs & upkeep' },
  ];
  const cats = [];
  for (const c of names) {
    let existing = await prisma.expenseCategory.findFirst({ where: { schoolId: school.id, name: c.name } });
    if (!existing) {
      existing = await prisma.expenseCategory.create({ data: { ...c, schoolId: school.id } });
      console.log(`Created expense category ${c.name}`);
    }
    cats.push(existing);
  }
  return cats;
}

async function createSampleExpenses(school, categories, vendors, processedByUser) {
  const existingCount = await prisma.expense.count({ where: { schoolId: school.id } });
  if (existingCount > 0) return { created: 0, skipped: existingCount };

  const now = new Date();
  const sample = [
    { description: 'Printer Paper Ream', amount: 150, category: 'Office Supplies', vendor: 'Stationery World', daysAgo: 2 },
    { description: 'Whiteboard Markers', amount: 80, category: 'Office Supplies', vendor: 'Stationery World', daysAgo: 5 },
    { description: 'Network Upgrade Parts', amount: 600, category: 'Maintenance', vendor: 'ICT Solutions Ltd', daysAgo: 10 },
    { description: 'Electricity Bill', amount: 900, category: 'Utilities', vendor: null, daysAgo: 20 },
  ];
  let created = 0;
  for (const e of sample) {
    const category = categories.find(c => c.name === e.category);
    const vendor = e.vendor ? vendors.find(v => v.name === e.vendor) : null;
    const date = new Date(now.getTime() - e.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.expense.create({
      data: {
        description: e.description,
        amount: e.amount,
        date,
        categoryId: category.id,
        vendorId: vendor ? vendor.id : null,
        paidById: processedByUser.id,
        schoolId: school.id,
      },
    });
    created++;
  }
  console.log(`Created ${created} sample expenses`);
  return { created, skipped: existingCount };
}

async function markSomeInvoicesSentAndOverdue(school) {
  const invoices = await prisma.invoice.findMany({ where: { schoolId: school.id }, orderBy: { issueDate: 'asc' } });
  let sent = 0; let overdue = 0;
  const now = new Date();
  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    // Set first half as SENT (current due dates), second half overdue by moving dueDate to past
    if (i % 2 === 0) {
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'SENT' } });
      sent++;
    } else {
      const pastDue = new Date(now.getTime() - (7 + i) * 24 * 60 * 60 * 1000);
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'OVERDUE', dueDate: pastDue } });
      overdue++;
    }
  }
  console.log(`Updated invoices -> SENT: ${sent}, OVERDUE: ${overdue}`);
  return { sent, overdue };
}

async function allocatePaymentForStudent(studentId, amount, school, processedByUser) {
  const invoices = await prisma.invoice.findMany({
    where: {
      schoolId: school.id,
      studentId,
      status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'DRAFT'] },
    },
    orderBy: [{ dueDate: 'asc' }, { issueDate: 'asc' }],
  });
  if (!invoices.length) {
    console.log('No invoices to allocate payment to for student', studentId);
    return { allocations: 0 };
  }
  let remaining = amount;
  const payment = await prisma.payment.create({
    data: {
      invoiceId: null,
      amount,
      paymentDate: new Date(),
      paymentMethod: 'CASH',
      referenceId: 'SEED-PMT-' + Math.random().toString(36).slice(2,7).toUpperCase(),
      processedById: processedByUser.id,
      schoolId: school.id,
    },
  });
  let allocations = 0;
  for (const inv of invoices) {
    if (remaining <= 0) break;
    const outstanding = inv.totalAmount - inv.paidAmount;
    if (outstanding <= 0) continue;
    const apply = Math.min(outstanding, remaining);
    remaining -= apply;
    await prisma.paymentAllocation.create({ data: { paymentId: payment.id, invoiceId: inv.id, amount: apply, schoolId: school.id } });
    const newPaid = inv.paidAmount + apply;
    let newStatus;
    if (newPaid >= inv.totalAmount - 0.0001) newStatus = 'PAID';
    else if (newPaid > 0) newStatus = 'PARTIALLY_PAID';
    else newStatus = inv.status;
    // Overdue check
    if (newStatus !== 'PAID') {
      try {
        const due = new Date(inv.dueDate);
        if (!isNaN(due.getTime()) && due < new Date()) newStatus = 'OVERDUE';
      } catch (_) {}
    }
    await prisma.invoice.update({ where: { id: inv.id }, data: { paidAmount: newPaid, status: newStatus } });
    allocations++;
  }
  console.log(`Allocated payment ${payment.id} across ${allocations} invoices (amount ${amount})`);
  if (remaining > 0) console.log(`Unapplied remainder (not stored): ${remaining.toFixed(2)}`);
  return { allocations, paymentId: payment.id };
}

async function main() {
  console.log('--- Seeding Start ---');
  const school = await ensureSchool();
  const academicYear = await ensureAcademicYear(school);
  const level = await ensureLevel(school);
  const klass = await ensureClass(school, academicYear, level);
  const section = await ensureSection(klass, school);

  for (const entry of rolesToSeed) {
    await ensureUserAndStaff(entry, school.id);
  }

  const students = await ensureStudents(school, 5);
  await ensureEnrollments(students, academicYear, section, school);
  const { classFee, levelFee } = await ensureFeeStructures(academicYear, klass, level, school);

  const classAssignStats = await ensureAssignments(students, classFee, academicYear, klass, level, school);
  const levelAssignStats = await ensureAssignments(students, levelFee, academicYear, klass, level, school);

  const classInvStats = await generateInvoicesForFeeStructure(students, classFee, school);
  const levelInvStats = await generateInvoicesForFeeStructure(students, levelFee, school);

  // Finance enhancements
  const accountantUser = await prisma.user.findFirst({ where: { role: 'ACCOUNTANT' } });
  const vendors = await ensureVendors(school);
  const categories = await ensureExpenseCategories(school);
  const expenseStats = await createSampleExpenses(school, categories, vendors, accountantUser || students[0]);
  const invoiceStatusAdjust = await markSomeInvoicesSentAndOverdue(school);
  // Allocate a payment for first student to demonstrate partial/complete payments
  const paymentAllocStats = await allocatePaymentForStudent(students[0].id, 1000, school, accountantUser || students[0]);

  console.log('--- Seeding Summary ---');
  const summary = {
    users: await prisma.user.count(),
    staff: await prisma.staff.count(),
    students: await prisma.student.count({ where: { schoolId: school.id } }),
    feeStructures: await prisma.feeStructure.count({ where: { schoolId: school.id } }),
    assignments: await prisma.studentFeeAssignment.count({ where: { schoolId: school.id } }),
    invoices: await prisma.invoice.count({ where: { schoolId: school.id } }),
    classAssignment: classAssignStats,
    levelAssignment: levelAssignStats,
    classInvoices: { created: classInvStats.created, skipped: classInvStats.skipped, totalAmount: classInvStats.totalAmount },
    levelInvoices: { created: levelInvStats.created, skipped: levelInvStats.skipped, totalAmount: levelInvStats.totalAmount },
    invoicesStatusAdjust: invoiceStatusAdjust,
    expenses: expenseStats,
    paymentAllocation: paymentAllocStats,
    payments: await prisma.payment.count({ where: { schoolId: school.id } }),
    allocations: await prisma.paymentAllocation.count({ where: { schoolId: school.id } }),
    overdueInvoices: await prisma.invoice.count({ where: { schoolId: school.id, status: 'OVERDUE' } }),
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log('--- Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Error in seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
