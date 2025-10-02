// app/api/schools/[schoolId]/teachers/me/students/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Utility: safely parse integer with defaults
function toInt(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; }

// GET /api/schools/:schoolId/teachers/me/students
// Query params: search, classId, levelId, sectionId, subjectId, page, limit, include
export async function GET(request, { params }) {
  const { schoolId } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const staffId = session.user.staffProfileId;
  if (!staffId) return NextResponse.json({ students: [], pagination: { page:1, limit:20, total:0, totalPages:0 } });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';
  const classIdFilter = searchParams.get('classId') || null;
  const levelIdFilter = searchParams.get('levelId') || null;
  const sectionIdFilter = searchParams.get('sectionId') || null;
  const subjectIdFilter = searchParams.get('subjectId') || null;
  const includeRaw = (searchParams.get('include') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const debug = searchParams.get('debug') === '1' || searchParams.get('debug') === 'true';
  const includeSubjects = includeRaw.includes('subjects');
  const includeSections = includeRaw.includes('sections');
  const includeMeta = includeRaw.includes('meta');
  const page = toInt(searchParams.get('page'), 1);
  const limit = Math.min(toInt(searchParams.get('limit'), 20), 100);

  try {
    // 1. Current academic year (fallback latest)
    const currentYear = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, orderBy: { startDate: 'desc' } })
      || await prisma.academicYear.findFirst({ where: { schoolId }, orderBy: { startDate: 'desc' } });
    if (!currentYear) {
      return NextResponse.json({ students: [], pagination: { page:1, limit, total:0, totalPages:0 } }, { status: 200 });
    }
    const academicYearId = currentYear.id;

    // 2. Collect section IDs where teacher has relationship
    // Class teacher sections (only include when not scoping to a specific subject)
    const classTeacherSections = await prisma.section.findMany({ where: { schoolId, classTeacherId: staffId }, select: { id: true, classId: true } });
    let classTeacherSectionIds = classTeacherSections.map(s => s.id);
    if (subjectIdFilter) {
      // If filtering by a subject, don't include pure class-teacher sections by default
      classTeacherSectionIds = [];
    }

    // Sections via timetable entries
    const timetableSectionRows = await prisma.timetableEntry.findMany({
      where: {
        schoolId,
        staffId,
        ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
        // TimetableEntry has no academicYearId column; constrain through Section -> Class -> academicYearId
        section: {
          class: { academicYearId }
        }
      },
      distinct: ['sectionId'],
      select: { sectionId: true }
    });
    const timetableSectionIds = timetableSectionRows.map(r => r.sectionId).filter(Boolean);

    // Sections via StaffSubjectLevel (derive sections through classes matching level or class assignment)
    // We load classes for levels the teacher teaches, then their sections.
    const ssl = await prisma.staffSubjectLevel.findMany({
      where: { schoolId, staffId, ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}) },
      select: { schoolLevelId: true, classId: true, subjectId: true }
    });

    let classIdsFromSSL = ssl.filter(r => r.classId).map(r => r.classId);
    const levelIdsFromSSL = ssl.map(r => r.schoolLevelId).filter(Boolean);

    // Classes for levels (if not explicitly restricted by classId or level filter)
    if (levelIdsFromSSL.length) {
      const classesFromLevels = await prisma.class.findMany({
        where: {
          schoolId,
          schoolLevelId: { in: levelIdsFromSSL },
          academicYearId,
          ...(classIdFilter ? { id: classIdFilter } : {})
        },
        select: { id: true }
      });
      classIdsFromSSL = [...classIdsFromSSL, ...classesFromLevels.map(c => c.id)];
    }
    classIdsFromSSL = Array.from(new Set(classIdsFromSSL));

    let sectionsFromSSL = [];
    if (classIdsFromSSL.length) {
      sectionsFromSSL = await prisma.section.findMany({
        where: { schoolId, classId: { in: classIdsFromSSL }, ...(sectionIdFilter ? { id: sectionIdFilter } : {}) },
        select: { id: true, class: { select: { academicYearId: true } } }
      });
    }
    // Ensure sections belong to current academic year (through class relation)
    const sectionsFromSSLIds = sectionsFromSSL.filter(s => s.class?.academicYearId === academicYearId).map(s => s.id);

    // Sections inferred via Assignments created by this teacher (acts as a proxy for teaching a subject)
    //  - Direct section assignments: include those sections if they belong to current academic year
    //  - Class-wide assignments: include all sections of those classes in current academic year
    const assignmentSections = await prisma.assignment.findMany({
      where: {
        schoolId,
        teacherId: staffId,
        ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
        section: { class: { academicYearId } }
      },
      select: { sectionId: true }
    });
    const assignmentClasses = await prisma.assignment.findMany({
      where: {
        schoolId,
        teacherId: staffId,
        ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
        class: { academicYearId }
      },
      select: { classId: true }
    });
    const assignmentSectionIdsDirect = assignmentSections.map(a => a.sectionId).filter(Boolean);
    let assignmentSectionIdsViaClass = [];
    if (assignmentClasses.length) {
      const classIds = Array.from(new Set(assignmentClasses.map(a => a.classId).filter(Boolean)));
      if (classIds.length) {
        const secs = await prisma.section.findMany({ where: { classId: { in: classIds } }, select: { id: true } });
        assignmentSectionIdsViaClass = secs.map(s => s.id);
      }
    }

    // Aggregate all candidate section IDs
    let candidateSectionIds = Array.from(new Set([
      ...classTeacherSectionIds,
      ...timetableSectionIds,
      ...sectionsFromSSLIds,
      ...assignmentSectionIdsDirect,
      ...assignmentSectionIdsViaClass
    ])).filter(Boolean);

    // Apply direct filters (level, class, section)
    if (sectionIdFilter) {
      candidateSectionIds = candidateSectionIds.filter(id => id === sectionIdFilter);
    }
    if (!candidateSectionIds.length) {
      const base = { students: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      return NextResponse.json(debug ? { ...base, debug: { reason: 'no-candidate-sections', classTeacherSectionIds, timetableSectionIds, sslCount: ssl.length } } : base, { status: 200 });
    }

    // Filter sections by class/level if provided
    if (classIdFilter || levelIdFilter) {
      const filteredSections = await prisma.section.findMany({
        where: {
          id: { in: candidateSectionIds },
          ...(classIdFilter ? { classId: classIdFilter } : {}),
          ...(levelIdFilter ? { class: { schoolLevelId: levelIdFilter } } : {})
        },
        select: { id: true }
      });
      const allowed = new Set(filteredSections.map(s => s.id));
      candidateSectionIds = candidateSectionIds.filter(id => allowed.has(id));
      if (!candidateSectionIds.length) {
        const base = { students: [], pagination: { page, limit, total: 0, totalPages: 0 } };
        return NextResponse.json(debug ? { ...base, debug: { reason: 'filtered-out-by-class-or-level' } } : base, { status: 200 });
      }
    }

    // 3. Student enrollments (current year + candidate sections)
    const whereEnrollment = {
      schoolId,
      academicYearId,
      sectionId: { in: candidateSectionIds },
      isCurrent: true,
      ...(search ? {
        student: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { studentIdNumber: { contains: search, mode: 'insensitive' } }
          ]
        }
      } : {})
    };

  const total = await prisma.studentEnrollment.count({ where: whereEnrollment });
    const totalPages = Math.ceil(total / limit) || 0;
    const skip = (page - 1) * limit;

    const enrollments = await prisma.studentEnrollment.findMany({
      where: whereEnrollment,
      include: {
        student: true,
        section: { include: { class: { include: { schoolLevel: true } } } }
      },
      orderBy: [ { student: { lastName: 'asc' } }, { student: { firstName: 'asc' } } ],
      skip,
      take: limit
    });

    // Preload subjects taught per section if needed
    let subjectsBySection = {};
    if (includeSubjects) {
      // Subjects via timetable
      const timetableSubjects = await prisma.timetableEntry.findMany({
        where: {
          schoolId,
          staffId,
          sectionId: { in: candidateSectionIds },
          ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
          section: { class: { academicYearId } }
        },
        select: { sectionId: true, subject: { select: { id: true, name: true } } }
      });
      for (const row of timetableSubjects) {
        if (!row.sectionId || !row.subject) continue;
        subjectsBySection[row.sectionId] = subjectsBySection[row.sectionId] || new Map();
        subjectsBySection[row.sectionId].set(row.subject.id, row.subject);
      }
      // Subjects via StaffSubjectLevel (match classes or levels)
      const classesOfEnrollments = Array.from(new Set(enrollments.map(e => e.section.classId)));
      const classMapLevel = new Map(enrollments.map(e => [e.section.classId, e.section.class.schoolLevelId]));
      const sslSubjects = await prisma.staffSubjectLevel.findMany({
        where: { schoolId, staffId, ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}) },
        select: { subject: { select: { id: true, name: true } }, classId: true, schoolLevelId: true }
      });
      for (const row of sslSubjects) {
        for (const e of enrollments) {
          if (!e.section) continue;
          const classId = e.section.classId;
          const levelId = e.section.class.schoolLevelId;
          const matchesClass = row.classId && row.classId === classId;
          const matchesLevel = !row.classId && row.schoolLevelId === levelId; // level-scoped assignment
          if (matchesClass || matchesLevel) {
            if (row.subject) {
              subjectsBySection[e.sectionId] = subjectsBySection[e.sectionId] || new Map();
              subjectsBySection[e.sectionId].set(row.subject.id, row.subject);
            }
          }
        }
      }
      // Subjects via Assignments (section-scoped and class-scoped)
      const assignmentSubjectsBySection = await prisma.assignment.findMany({
        where: {
          schoolId,
          teacherId: staffId,
          sectionId: { in: candidateSectionIds },
          ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {}),
          section: { class: { academicYearId } }
        },
        select: { sectionId: true, subject: { select: { id: true, name: true } } }
      });
      for (const row of assignmentSubjectsBySection) {
        if (!row.sectionId || !row.subject) continue;
        subjectsBySection[row.sectionId] = subjectsBySection[row.sectionId] || new Map();
        subjectsBySection[row.sectionId].set(row.subject.id, row.subject);
      }
      // Class-scoped assignments: expand to all sections of that class in current year
      const classScopedAssignments = await prisma.assignment.findMany({
        where: {
          schoolId,
          teacherId: staffId,
          class: { academicYearId },
          ...(subjectIdFilter ? { subjectId: subjectIdFilter } : {})
        },
        select: { classId: true, subject: { select: { id: true, name: true } } }
      });
      if (classScopedAssignments.length) {
        const classIds = Array.from(new Set(classScopedAssignments.map(a => a.classId).filter(Boolean)));
        if (classIds.length) {
          const classSections = await prisma.section.findMany({ where: { classId: { in: classIds } }, select: { id: true, classId: true } });
          const sectionsByClass = new Map();
          for (const s of classSections) {
            if (!sectionsByClass.has(s.classId)) sectionsByClass.set(s.classId, []);
            sectionsByClass.get(s.classId).push(s.id);
          }
          for (const a of classScopedAssignments) {
            if (!a.classId || !a.subject) continue;
            const secIds = sectionsByClass.get(a.classId) || [];
            for (const sid of secIds) {
              if (!candidateSectionIds.includes(sid)) continue; // only annotate within candidate set
              subjectsBySection[sid] = subjectsBySection[sid] || new Map();
              subjectsBySection[sid].set(a.subject.id, a.subject);
            }
          }
        }
      }
    }

    const students = enrollments.map(en => {
      const s = en.student;
      const section = en.section;
      const isClassTeacher = section.classTeacherId === staffId;
      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        studentIdNumber: s.studentIdNumber,
        ...(includeSections ? {
          section: {
            id: section.id,
            name: section.name,
            classId: section.classId,
            className: section.class.name,
            levelId: section.class.schoolLevelId,
            levelName: section.class.schoolLevel.name,
            isClassTeacher,
          }
        } : {}),
        ...(includeSubjects ? { subjectsTaught: Array.from(subjectsBySection[en.sectionId]?.values() || []) } : {})
      };
    });

    const response = {
      students,
      pagination: { page, limit, total, totalPages }
    };
    if (includeMeta) {
      const uniqueSections = new Set(students.map(st => st.section?.id).filter(Boolean)).size;
      const uniqueSubjects = includeSubjects ? new Set(students.flatMap(st => (st.subjectsTaught || []).map(sub => sub.id))).size : 0;
      response.aggregates = { uniqueSections, uniqueSubjects, totalStudents: total };
    }

    if (debug) {
      response.debug = {
        academicYearId,
        classTeacherSectionIds,
        timetableSectionIds,
        sslSample: ssl.slice(0, 10),
        candidateSectionIdsCount: candidateSectionIds.length,
        returnedEnrollments: enrollments.length,
        subjectIdFilter: subjectIdFilter || null,
        filters: { classIdFilter, levelIdFilter, sectionIdFilter, search }
      };
    }

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error('Teacher students API error', err);
    if (debug) {
      return NextResponse.json({ error: 'Failed to load students.', debug: { message: err.message, stack: err.stack } }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to load students.' }, { status: 500 });
  }
}
