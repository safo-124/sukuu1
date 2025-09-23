// lib/analytics/grades.js
// Helpers for grade analytics: aggregations, charts data, and simple predictions
import prisma from '@/lib/prisma';

// Compute grade letter from a grading scale (array of {minPercentage,maxPercentage,grade})
export function mapMarksToLetter(marks, gradeDetails) {
  if (marks == null || !Array.isArray(gradeDetails)) return null;
  // Prefer matching by descending minPercentage
  const sorted = [...gradeDetails].sort((a, b) => (b.minPercentage ?? 0) - (a.minPercentage ?? 0));
  const m = Number(marks);
  for (const g of sorted) {
    const min = Number(g.minPercentage ?? 0);
    const max = g.maxPercentage == null ? 100 : Number(g.maxPercentage);
    if (m >= min && m <= max) return g.grade || null;
  }
  return null;
}

// Simple linear regression y = a + b x over an array of points [{x, y}] (x as index if not provided)
export function linearRegression(points) {
  if (!points || points.length < 2) return { a: 0, b: 0, predict: (x) => (points?.[points.length - 1]?.y ?? 0) };
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    const x = Number(p.x);
    const y = Number(p.y);
    sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
  }
  const denom = (n * sumXX - sumX * sumX);
  const b = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return { a, b, predict: (x) => a + b * x };
}

// Moving average prediction (last k window)
export function movingAveragePredict(points, k = 3) {
  if (!points || points.length === 0) return null;
  const slice = points.slice(-k);
  const avg = slice.reduce((s, p) => s + Number(p.y), 0) / slice.length;
  return avg;
}

// Fetch school default pass threshold from grading scale if available; else fallback 50
export async function getPassThresholdForContext({ schoolId, academicYearId, classId, subjectId }) {
  // Try a weighting config to locate the gradingScale
  const cfg = await prisma.gradingWeightConfig.findFirst({
    where: { schoolId, academicYearId, OR: [ { classId }, { classId: null } ], OR: [ { subjectId }, { subjectId: null } ] },
    include: { gradingScale: { include: { gradeDetails: true } } },
  });
  const details = cfg?.gradingScale?.gradeDetails || [];
  // Use the lowest passing minPercentage if a grade like 'D' or similar is defined; fallback 50
  if (details.length) {
    // Heuristic: consider any band whose grade starts with A/B/C/P as pass; else use mid threshold
    const passCandidates = details.filter(d => {
      const g = (d.grade || '').toUpperCase();
      return g.startsWith('A') || g.startsWith('B') || g.startsWith('C') || g.startsWith('P');
    });
    if (passCandidates.length) {
      const minPass = Math.min(...passCandidates.map(d => Number(d.minPercentage ?? 0)));
      return minPass;
    }
    // Otherwise choose 50 as default
  }
  return 50;
}

// Aggregate grade distributions for a cohort/filter
export function aggregateDistributions(grades) {
  const dist = new Map(); // letter -> count
  let total = 0; let sum = 0; const bySubject = new Map();
  for (const g of grades) {
    const letter = g.gradeLetter || null;
    if (letter) dist.set(letter, (dist.get(letter) || 0) + 1);
    const m = g.marksObtained;
    if (m != null) { total++; sum += Number(m); }
    if (g.subjectId) {
      if (!bySubject.has(g.subjectId)) bySubject.set(g.subjectId, { subjectId: g.subjectId, subjectName: g.subject?.name || 'Subject', total: 0, count: 0 });
      const s = bySubject.get(g.subjectId); if (m != null) { s.total += Number(m); s.count++; }
    }
  }
  const average = total ? (sum / total) : null;
  const letterDist = Array.from(dist.entries()).map(([grade, count]) => ({ grade, count })).sort((a, b) => b.count - a.count);
  const subjects = Array.from(bySubject.values()).map(s => ({ ...s, average: s.count ? s.total / s.count : null }));
  return { average, letterDist, subjects };
}

// Build timeseries per subject ordered by date
export function buildSubjectSeries(grades) {
  const bySubj = new Map();
  for (const g of grades) {
    const sid = g.subjectId; if (!sid) continue;
    if (!bySubj.has(sid)) bySubj.set(sid, { subjectId: sid, subjectName: g.subject?.name || 'Subject', points: [] });
    const date = g.createdAt ? new Date(g.createdAt).getTime() : 0;
    const y = g.marksObtained == null ? null : Number(g.marksObtained);
    bySubj.get(sid).points.push({ x: date, y });
  }
  // sort each series by x and normalize x to index for regression
  for (const s of bySubj.values()) {
    s.points = s.points.filter(p => p.y != null).sort((a, b) => a.x - b.x).map((p, i) => ({ x: i + 1, y: p.y }));
  }
  return Array.from(bySubj.values());
}

// Compute predictions per subject using both LR and MA
export function computePredictionsPerSubject(series) {
  return series.map(s => {
    const lr = linearRegression(s.points);
    const nextX = (s.points?.[s.points.length - 1]?.x || 0) + 1;
    const lrPred = lr.predict(nextX);
    const maPred = movingAveragePredict(s.points, 3);
    const pred = (Number.isFinite(lrPred) ? lrPred : null) ?? maPred ?? null;
    return { subjectId: s.subjectId, subjectName: s.subjectName, predictedNextMark: pred };
  });
}

// Convenience to fetch student grades and prepare analytics
export async function getStudentAnalytics({ schoolId, studentId }) {
  const grades = await prisma.grade.findMany({
    where: { schoolId, studentId, isPublished: true },
    select: {
      marksObtained: true,
      gradeLetter: true,
      subjectId: true,
      subject: { select: { id: true, name: true } },
      termId: true,
      term: { select: { id: true, name: true } },
      academicYearId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  const dist = aggregateDistributions(grades);
  const series = buildSubjectSeries(grades);
  const predictions = computePredictionsPerSubject(series);
  return { grades, ...dist, series, predictions };
}

// Compute rankings for a given section + term + academic year. Returns array of { studentId, total, average, totalSubjects, position }
export async function computeSectionRankings({ schoolId, sectionId, termId, academicYearId }) {
  // Fetch all published grades for the section+term+year
  const grades = await prisma.grade.findMany({
    where: { schoolId, sectionId, termId, academicYearId, isPublished: true },
    select: { studentId: true, marksObtained: true },
  });
  const byStudent = new Map();
  for (const g of grades) {
    const m = g.marksObtained;
    if (m == null) continue;
    const s = byStudent.get(g.studentId) || { studentId: g.studentId, total: 0, count: 0 };
    s.total += Number(m);
    s.count += 1;
    byStudent.set(g.studentId, s);
  }
  const arr = Array.from(byStudent.values()).map(s => ({ studentId: s.studentId, total: s.total, totalSubjects: s.count, average: s.count ? (s.total / s.count) : 0 }));
  // Sort by total desc, then average desc, then studentId asc for stability
  arr.sort((a, b) => (b.total - a.total) || (b.average - a.average) || a.studentId.localeCompare(b.studentId));
  let pos = 0; let lastKey = null; let tiePos = 0;
  for (let i = 0; i < arr.length; i++) {
    const key = `${arr[i].total}|${arr[i].average}`;
    if (key !== lastKey) {
      pos = i + 1; tiePos = pos; lastKey = key;
    }
    arr[i].position = tiePos;
  }
  return arr;
}

// Upsert RankingSnapshot rows for a section+term+year and optionally publish
export async function upsertSectionRankings({ schoolId, sectionId, termId, academicYearId, publish = false }) {
  const rankings = await computeSectionRankings({ schoolId, sectionId, termId, academicYearId });
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const r of rankings) {
      await tx.rankingSnapshot.upsert({
        where: { sectionId_termId_studentId: { sectionId, termId, studentId: r.studentId } },
        create: {
          schoolId, sectionId, termId, academicYearId,
          studentId: r.studentId, totalScore: r.total, average: r.average, totalSubjects: r.totalSubjects,
          position: r.position, computedAt: now, published: !!publish,
        },
        update: { totalScore: r.total, average: r.average, totalSubjects: r.totalSubjects, position: r.position, computedAt: now, ...(publish ? { published: true } : {}) },
      });
    }
  });
  return rankings.length;
}

const gradesAnalytics = {
  mapMarksToLetter,
  linearRegression,
  movingAveragePredict,
  getPassThresholdForContext,
  aggregateDistributions,
  buildSubjectSeries,
  computePredictionsPerSubject,
  getStudentAnalytics,
  computeSectionRankings,
  upsertSectionRankings,
};

export default gradesAnalytics;
