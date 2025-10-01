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
        departments: { include: { department: { select: { id: true, name: true } } } },
      }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Derive subjects per department and classes taught
    const staffIdStr = staffId;
    const depts = await prisma.staffDepartment.findMany({ where: { schoolId, staffId: staffIdStr }, include: { department: true } });
    // Subjects the teacher teaches via StaffSubjectLevel
    const ssl = await prisma.staffSubjectLevel.findMany({ where: { schoolId, staffId: staffIdStr }, include: { subject: { select: { id: true, name: true, departmentId: true } }, class: { select: { id: true, name: true } } } });
    const subjectsByDept = {};
    const classesBySubject = {};
    for (const row of ssl) {
      const deptId = row.subject?.departmentId || 'none';
      if (!subjectsByDept[deptId]) subjectsByDept[deptId] = new Map();
      if (row.subject) subjectsByDept[deptId].set(row.subject.id, row.subject);
      if (row.subject) {
        const key = row.subject.id;
        classesBySubject[key] = classesBySubject[key] || new Map();
        if (row.class) classesBySubject[key].set(row.class.id, row.class);
      }
    }
    const departments = depts.map(d => ({ id: d.department.id, name: d.department.name }));
    const departmentsWithSubjects = departments.map(d => ({
      id: d.id,
      name: d.name,
      subjects: Array.from(subjectsByDept[d.id]?.values() || []),
    }));
    const subjectClasses = Object.fromEntries(Object.entries(classesBySubject).map(([sid, m]) => [sid, Array.from(m.values())]));

    return NextResponse.json({ teacher, departments: departmentsWithSubjects, subjectClasses }, { status: 200 });
  } catch (error) {
    console.error('GET people/teachers/[staffId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch teacher.' }, { status: 500 });
  }
}
