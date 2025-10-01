import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const staffId = session.user.staffProfileId;
  try {
    const depts = await prisma.staffDepartment.findMany({ where: { schoolId, staffId }, include: { department: true } });
    const ssl = await prisma.staffSubjectLevel.findMany({ where: { schoolId, staffId }, include: { subject: { select: { id: true, name: true, departmentId: true } }, class: { select: { id: true, name: true } } } });
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
    const departmentsWithSubjects = departments.map(d => ({ id: d.id, name: d.name, subjects: Array.from(subjectsByDept[d.id]?.values() || []) }));
    const subjectClasses = Object.fromEntries(Object.entries(classesBySubject).map(([sid, m]) => [sid, Array.from(m.values())]));
    return NextResponse.json({ departments: departmentsWithSubjects, subjectClasses }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load teacher summary' }, { status: 500 });
  }
}
