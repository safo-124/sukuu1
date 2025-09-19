// lib/performance.js
// Utilities to compute student performance trends
import prisma from '@/lib/prisma';

/**
 * Compute average marks per subject and per term for a student (published grades only).
 * Returns { subjects: [{subjectId,name,average,count}], terms: [{termId,name,average,count}], overallAverage }
 */
export async function computeStudentPerformance({ schoolId, studentUserId }) {
  // Find studentId from user
  const student = await prisma.student.findFirst({ where: { schoolId, userId: studentUserId }, select: { id: true } });
  if (!student) return { subjects: [], terms: [], overallAverage: null };
  const grades = await prisma.grade.findMany({
    where: { schoolId, studentId: student.id, isPublished: true, marksObtained: { not: null } },
    select: { marksObtained: true, subjectId: true, termId: true, subject: { select: { name: true } }, term: { select: { name: true } } }
  });
  if (!grades.length) return { subjects: [], terms: [], overallAverage: null };
  const subjAgg = new Map();
  const termAgg = new Map();
  let sum = 0; let count = 0;
  for (const g of grades) {
    const m = g.marksObtained ?? 0; sum += m; count++;
    if (!subjAgg.has(g.subjectId)) subjAgg.set(g.subjectId, { subjectId: g.subjectId, name: g.subject?.name || 'Subject', total: 0, count: 0 });
    const sa = subjAgg.get(g.subjectId); sa.total += m; sa.count++;
    if (!termAgg.has(g.termId)) termAgg.set(g.termId, { termId: g.termId, name: g.term?.name || 'Term', total: 0, count: 0 });
    const ta = termAgg.get(g.termId); ta.total += m; ta.count++;
  }
  const subjects = Array.from(subjAgg.values()).map(s => ({ ...s, average: s.total / s.count }));
  const terms = Array.from(termAgg.values()).map(t => ({ ...t, average: t.total / t.count }));
  return { subjects, terms, overallAverage: sum / count };
}
