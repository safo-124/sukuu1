// app/api/schools/[schoolId]/students/me/assignments/[assignmentId]/submission/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: fetch my submission for a specific assignment
export async function GET(request, { params }) {
  try {
    const { schoolId, assignmentId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve the current student and enrollment for visibility checks
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { student: { userId: session.user.id }, schoolId, isCurrent: true },
      include: { section: { select: { id: true, classId: true } } },
    });
    if (!enrollment) return NextResponse.json({ error: 'No active enrollment found.' }, { status: 400 });

    const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, schoolId } });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    const visible = (
      (assignment.sectionId && assignment.sectionId === enrollment.sectionId) ||
      (assignment.classId && assignment.classId === enrollment.section.classId) ||
      (!assignment.sectionId && !assignment.classId)
    );
    if (!visible) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const submission = await prisma.submittedAssignment.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: enrollment.studentId } },
    });

    let contentJson = null;
    if (submission?.content) {
      try { contentJson = JSON.parse(submission.content); } catch {}
    }
    // Only return minimal assignment info for the student, including objectives for objective type
    const assignmentOut = {
      id: assignment.id,
      title: assignment.title,
      type: assignment.type,
      objectives: Array.isArray(assignment.objectives) ? assignment.objectives : null,
      dueDate: assignment.dueDate,
      subjectId: assignment.subjectId,
    };
    return NextResponse.json({ submission, contentJson, assignment: assignmentOut });
  } catch (e) {
    console.error('GET my assignment submission error', e);
    return NextResponse.json({ error: 'Failed to load submission' }, { status: 500 });
  }
}

// POST: create/update my submission for a specific assignment
// Body: { content?: string, attachments?: string[], answers?: [{ question, answer }] }
export async function POST(request, { params }) {
  try {
    const { schoolId, assignmentId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user?.schoolId !== schoolId || session.user?.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { content, attachments, answers } = body || {};

    // Resolve student and current enrollment for visibility checks
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { student: { userId: session.user.id }, schoolId, isCurrent: true },
      include: { section: { select: { id: true, classId: true } } },
    });
    if (!enrollment) return NextResponse.json({ error: 'No active enrollment found.' }, { status: 400 });

    // Load assignment and visibility
    const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, schoolId } });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });

    // Visibility: assignment is for my section OR my class OR general
    const visible = (
      (assignment.sectionId && assignment.sectionId === enrollment.sectionId) ||
      (assignment.classId && assignment.classId === enrollment.section.classId) ||
      (!assignment.sectionId && !assignment.classId)
    );
    if (!visible) return NextResponse.json({ error: 'You cannot submit for this assignment.' }, { status: 403 });

    // Prevent late submissions if due date passed (soft block)
    const now = new Date();
    if (assignment.dueDate && new Date(assignment.dueDate) < now) {
      // Allow but warn; you can change to hard block by returning 400
      console.warn('Submitting after due date');
    }

    // Build submission payload
    const data = {
      schoolId,
      assignmentId,
      studentId: enrollment.studentId,
      submittedAt: new Date(),
      attachments: Array.isArray(attachments) ? attachments : undefined,
    };

    let result = null;
    let contentToStore = content ?? null;

    if (assignment.type === 'OBJECTIVE' && Array.isArray(assignment.objectives)) {
      // Auto-mark objective answers
      const ans = Array.isArray(answers) ? answers : [];
      let total = 0;
      const detail = [];
      for (const obj of assignment.objectives) {
        const given = ans.find(a => a.question === obj.question)?.answer;
        const correct = obj.correctAnswer;
        const awarded = (given && correct && given.trim().toLowerCase() === String(correct).trim().toLowerCase())
          ? (Number(obj.marks) || 1) : 0;
        detail.push({ question: obj.question, given, correct, awarded, max: Number(obj.marks) || 1 });
        total += awarded;
      }
      data.marksObtained = total;
      data.gradedAt = new Date();
      data.feedback = 'Auto-marked';
      // Store answers + detail in content as JSON
      contentToStore = JSON.stringify({ answers: ans, autoMarkDetail: detail });
      result = { total, detail };
    } else {
      // Subjective: store content only, marks remain null until teacher grades
      data.marksObtained = undefined;
    }

    if (contentToStore !== undefined) data.content = contentToStore;

    // Upsert by unique (assignmentId, studentId)
    const saved = await prisma.submittedAssignment.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: enrollment.studentId } },
      create: data,
      update: data,
    });

    return NextResponse.json({ submission: saved, result, message: 'Submission saved.' }, { status: 200 });
  } catch (e) {
    console.error('POST my assignment submission error', e);
    return NextResponse.json({ error: 'Failed to submit assignment.' }, { status: 500 });
  }
}
