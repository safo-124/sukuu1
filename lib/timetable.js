// lib/timetable.js
// Simple CSP/heuristic scheduler (greedy with backtracking) to place SectionSubjectRequirements into slots
import prisma from '@/lib/prisma';

const timeToMinutes = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
const minutesToTime = (x) => `${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`;

export async function generateTimetable({ schoolId, options = {} }) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { timetableStartTime: true, timetableEndTime: true } });
  if (!school) throw new Error('School not found');
  const dayStart = timeToMinutes(options.preferredStartTime || school.timetableStartTime);
  const dayEnd = timeToMinutes(options.preferredEndTime || school.timetableEndTime);
  const step = 30; // 30-min granularity

  // Load explicit requirements
  const dbRequirements = await prisma.sectionSubjectRequirement.findMany({
    where: {
      schoolId,
      ...(Array.isArray(options.targetSectionIds) && options.targetSectionIds.length
        ? { sectionId: { in: options.targetSectionIds } } : {}),
    },
    include: { section: { select: { id: true, classId: true, name: true } }, subject: { select: { id: true, name: true, departmentId: true } } },
  });
  // Auto-infer requirements from Class→Subjects if enabled (default true)
  let requirements = dbRequirements;
  try {
    const shouldInfer = options.autoInferRequirements !== false;
    if (shouldInfer) {
      const existingKeys = new Set(dbRequirements.map(r => `${r.sectionId}:${r.subjectId}`));
      // Prefetch subject-level links for fallback when classes don't have explicit subjects assigned
      const levelSubjectLinks = await prisma.subjectSchoolLevel.findMany({
        where: { schoolId },
        select: { subjectId: true, schoolLevelId: true, subject: { select: { id: true, name: true, weeklyHours: true, departmentId: true } } },
      });
      const levelToSubjects = new Map(); // schoolLevelId -> Subject[]
      for (const l of levelSubjectLinks) {
        if (!levelToSubjects.has(l.schoolLevelId)) levelToSubjects.set(l.schoolLevelId, []);
        levelToSubjects.get(l.schoolLevelId).push(l.subject);
      }
      const sectionsWithSubjects = await prisma.section.findMany({
        where: { schoolId, ...(Array.isArray(options.targetSectionIds) && options.targetSectionIds.length ? { id: { in: options.targetSectionIds } } : {}) },
        select: {
          id: true,
          name: true,
          classId: true,
          class: { select: { id: true, schoolLevelId: true, subjects: { select: { id: true, name: true, weeklyHours: true, departmentId: true } } } },
        },
      });
      const inferred = [];
      for (const sec of sectionsWithSubjects) {
        let classSubjects = sec.class?.subjects || [];
        if (!classSubjects.length) {
          const lvlId = sec.class?.schoolLevelId;
          if (lvlId && levelToSubjects.has(lvlId)) {
            classSubjects = levelToSubjects.get(lvlId);
          }
        }
        for (const subj of classSubjects) {
          const key = `${sec.id}:${subj.id}`;
          if (existingKeys.has(key)) continue;
          const durationMinutes = 60;
          const wh = typeof subj.weeklyHours === 'number' && !Number.isNaN(subj.weeklyHours) ? subj.weeklyHours : 2; // default 2 hours/week
          const periodsPerWeek = Math.max(1, Math.round(wh * (60 / durationMinutes)));
          inferred.push({
            id: `inferred-${sec.id}-${subj.id}`,
            schoolId,
            sectionId: sec.id,
            section: { id: sec.id, classId: sec.classId, name: sec.name },
            subjectId: subj.id,
            subject: { id: subj.id, name: subj.name, departmentId: subj.departmentId },
            periodsPerWeek,
            durationMinutes,
            minGapMins: 0,
            allowDouble: false,
            preferredRoomType: null,
          });
        }
      }
      if (inferred.length) {
        requirements = [...dbRequirements, ...inferred];
      }
    }
  } catch (e) {
    // If inference fails, proceed with dbRequirements only
  }
  const pinned = options.includePinned !== false ? await prisma.pinnedTimetableSlot.findMany({ where: { schoolId } }) : [];
  const staffUnavail = options.honorUnavailability !== false ? await prisma.staffUnavailability.findMany({ where: { schoolId } }) : [];
  const roomUnavail = await prisma.roomUnavailability.findMany({ where: { schoolId } });
  const allRooms = await prisma.room.findMany({ where: { schoolId } });

  // Build occupancy maps per day
  const occ = { sections: new Map(), staff: new Map(), rooms: new Map() };
  // Track only teaching intervals for load calculations
  const teachOcc = { staff: new Map(), sections: new Map() };
  const addInterval = (map, key, d, s, e) => {
    const k = `${key}-${d}`; if (!map.has(k)) map.set(k, []); map.get(k).push([s,e]);
  };
  const overlaps = (a,b) => !(a[1] <= b[0] || b[1] <= a[0]);
  const isFree = (map, key, d, s, e) => {
    const k = `${key}-${d}`; const arr = map.get(k) || []; return arr.every(iv => !overlaps(iv, [s,e]));
  };
  const sumDurations = (arr) => arr.reduce((acc, [s,e]) => acc + (e-s), 0);
  const staffWeeklyLoadMins = (staffId) => {
    // Sum teaching minutes across week from teachOcc
    let total = 0;
    for (let d=1; d<=7; d++) {
      const key = `${staffId}-${d}`;
      const iv = teachOcc.staff.get(key) || [];
      total += sumDurations(iv);
    }
    return total;
  };
  const nearestSectionGapMins = (sectionId, dow, start, end) => {
    const k = `${sectionId}-${dow}`;
    const arr = teachOcc.sections.get(k) || [];
    if (!arr.length) return 0; // neutral if no existing sessions that day
    let minGap = Infinity;
    for (const [s,e] of arr) {
      if (end <= s) {
        minGap = Math.min(minGap, s - end);
      } else if (e <= start) {
        minGap = Math.min(minGap, start - e);
      } else {
        // overlaps; gap is 0 (shouldn't happen when we call with free slot)
        return 0;
      }
    }
    return isFinite(minGap) ? minGap : 0;
  };

  // Seed with existing entries and pinned as hard constraints
  const existing = await prisma.timetableEntry.findMany({ where: { schoolId } });
  existing.forEach(e => { const s = timeToMinutes(e.startTime), en = timeToMinutes(e.endTime); addInterval(occ.sections, e.sectionId, e.dayOfWeek, s, en); addInterval(occ.staff, e.staffId, e.dayOfWeek, s, en); if (e.roomId) addInterval(occ.rooms, e.roomId, e.dayOfWeek, s, en); addInterval(teachOcc.staff, e.staffId, e.dayOfWeek, s, en); addInterval(teachOcc.sections, e.sectionId, e.dayOfWeek, s, en); });
  pinned.forEach(p => { const s = timeToMinutes(p.startTime), en = timeToMinutes(p.endTime); addInterval(occ.sections, p.sectionId, p.dayOfWeek, s, en); if (p.staffId) { addInterval(occ.staff, p.staffId, p.dayOfWeek, s, en); addInterval(teachOcc.staff, p.staffId, p.dayOfWeek, s, en); } if (p.roomId) addInterval(occ.rooms, p.roomId, p.dayOfWeek, s, en); addInterval(teachOcc.sections, p.sectionId, p.dayOfWeek, s, en); });
  staffUnavail.forEach(u => { const s = timeToMinutes(u.startTime), en = timeToMinutes(u.endTime); addInterval(occ.staff, u.staffId, u.dayOfWeek, s, en); });
  roomUnavail.forEach(u => { const s = timeToMinutes(u.startTime), en = timeToMinutes(u.endTime); addInterval(occ.rooms, u.roomId, u.dayOfWeek, s, en); });

  // Collect candidate staff per section+subject via StaffSubjectLevel
  const ssl = await prisma.staffSubjectLevel.findMany({ where: { schoolId }, select: { staffId: true, subjectId: true, classId: true, schoolLevelId: true } });
  const subjectToStaff = new Map();
  ssl.forEach(l => { const key = `${l.subjectId}:${l.classId || '*'}`; if (!subjectToStaff.has(key)) subjectToStaff.set(key, new Set()); subjectToStaff.get(key).add(l.staffId); });

  // Prefetch department memberships and teacher pool for fallback assignments
  const staffDepartments = await prisma.staffDepartment.findMany({ where: { schoolId }, select: { staffId: true, departmentId: true } });
  const deptToStaff = new Map();
  staffDepartments.forEach(sd => { if (!deptToStaff.has(sd.departmentId)) deptToStaff.set(sd.departmentId, new Set()); deptToStaff.get(sd.departmentId).add(sd.staffId); });
  // Include legacy single departmentId on Staff
  const staffWithDept = await prisma.staff.findMany({ where: { schoolId, departmentId: { not: null } }, select: { id: true, departmentId: true } });
  staffWithDept.forEach(s => { if (!deptToStaff.has(s.departmentId)) deptToStaff.set(s.departmentId, new Set()); deptToStaff.get(s.departmentId).add(s.id); });
  // Teacher pool (all staff whose user role is TEACHER)
  const teacherPool = await prisma.staff.findMany({ where: { schoolId, user: { role: 'TEACHER' } }, select: { id: true, maxWeeklyTeachingHours: true } });
  const teacherMap = new Map(teacherPool.map(t => [t.id, t]));

  // Track distribution of subject sessions per section per day (existing + new placements)
  const sectionSubjectDayCount = new Map(); // key: `${sectionId}:${subjectId}:${dow}` => count
  const bumpSSD = (sectionId, subjectId, dow) => {
    const key = `${sectionId}:${subjectId}:${dow}`;
    sectionSubjectDayCount.set(key, (sectionSubjectDayCount.get(key) || 0) + 1);
  };
  existing.forEach(e => bumpSSD(e.sectionId, e.subjectId, e.dayOfWeek));

  // Create a run
  const run = await prisma.timetableRun.create({ data: { schoolId, status: 'RUNNING', optionsJson: options } });

  const placements = [];
  for (const req of requirements) {
    const count = Math.max(1, req.periodsPerWeek);
    const duration = req.durationMinutes || 60;
    const classKey = `${req.subjectId}:${req.section.classId || '*'}`;
    const altKey = `${req.subjectId}:*`;
  const staffSet = subjectToStaff.get(classKey) || subjectToStaff.get(altKey) || new Set();
    const staffList = Array.from(staffSet);

    outer: for (let n=0; n<count; n++) {
      let placed = false;
      for (let dow=1; dow<=5 && !placed; dow++) {
        for (let start = dayStart; start + duration <= dayEnd && !placed; start += step) {
          const end = start + duration;
          for (const staffId of staffList) {
            if (!isFree(occ.sections, req.sectionId, dow, start, end)) continue;
            if (!isFree(occ.staff, staffId, dow, start, end)) continue;
            // Room optional: pick any free room or none
            let roomId = null;
            if (req.preferredRoomType) {
              const candidate = allRooms.find(r => (!r.roomType || r.roomType===req.preferredRoomType) && isFree(occ.rooms, r.id, dow, start, end));
              if (candidate) roomId = candidate.id; else continue;
            }
            // Accept
            addInterval(occ.sections, req.sectionId, dow, start, end);
            addInterval(occ.staff, staffId, dow, start, end);
            if (roomId) addInterval(occ.rooms, roomId, dow, start, end);
            addInterval(teachOcc.staff, staffId, dow, start, end);
            addInterval(teachOcc.sections, req.sectionId, dow, start, end);
            bumpSSD(req.sectionId, req.subjectId, dow);
            placements.push({ runId: run.id, schoolId, sectionId: req.sectionId, subjectId: req.subjectId, staffId, roomId, dayOfWeek: dow, startTime: minutesToTime(start), endTime: minutesToTime(end), score: 1.0, violations: 0 });
            placed = true; break;
          }
        }
      }
      if (!placed) {
        // ML-like fallback: expand teacher candidates and evaluate scored placements
        const baseCandidates = staffList;
        let extendedCandidates = baseCandidates;
        if (!extendedCandidates.length) {
          // Try department teachers if subject has a department
          const deptId = req.subject.departmentId;
          const deptSet = deptId ? (deptToStaff.get(deptId) || new Set()) : new Set();
          extendedCandidates = Array.from(deptSet);
          // If still empty, use teacher pool
          if (!extendedCandidates.length) {
            extendedCandidates = teacherPool.map(t => t.id);
          }
        }
        // Rank candidate teachers by current weekly load (lighter first)
        const candidateWithLoad = extendedCandidates.map(id => ({ id, load: staffWeeklyLoadMins(id) }));
        candidateWithLoad.sort((a,b) => a.load - b.load);
        const topCandidates = candidateWithLoad.slice(0, Math.max(3, Math.ceil(candidateWithLoad.length * 0.3)));

        let best = null; // {staffId, dow, start, end, roomId, score}
        for (let dow=1; dow<=5; dow++) {
          for (let start = dayStart; start + duration <= dayEnd; start += step) {
            const end = start + duration;
            if (!isFree(occ.sections, req.sectionId, dow, start, end)) continue;
            let candidateRoomId = null;
            if (req.preferredRoomType) {
              const r = allRooms.find(rm => (!rm.roomType || rm.roomType===req.preferredRoomType) && isFree(occ.rooms, rm.id, dow, start, end));
              if (!r) continue; candidateRoomId = r.id;
            }
            for (const c of topCandidates) {
              const staffId = c.id;
              if (!isFree(occ.staff, staffId, dow, start, end)) continue;
              // Score components
              const load = staffWeeklyLoadMins(staffId) + duration; // projected
              const maxHrs = (teacherMap.get(staffId)?.maxWeeklyTeachingHours || 0) * 60;
              const loadRatio = maxHrs > 0 ? Math.min(1, load / maxHrs) : Math.min(1, load / (5 * (dayEnd - dayStart)));
              const teacherLoadScore = 1 - loadRatio; // prefer lower load
              const gap = nearestSectionGapMins(req.sectionId, dow, start, end);
              const gapScore = gap === 0 ? 0.8 : Math.max(0.2, 1 - Math.min(gap, 180) / 180); // prefer closer to other sessions, but not too close
              const mid = (dayStart + dayEnd) / 2;
              const timeOfDayScore = 1 - Math.abs(((start + end)/2) - mid) / ((dayEnd - dayStart)/2); // prefer mid-day
              const dayDistKey = `${req.sectionId}:${req.subjectId}:${dow}`;
              const alreadyToday = sectionSubjectDayCount.get(dayDistKey) || 0;
              const spreadScore = 1 - Math.min(alreadyToday, 2) * 0.3; // penalize multiple same-day sessions
              const roomScore = req.preferredRoomType ? 1.0 : 0.8; // neutral-ish boost
              const score = 0.35*teacherLoadScore + 0.2*gapScore + 0.25*timeOfDayScore + 0.15*spreadScore + 0.05*roomScore;
              if (!best || score > best.score) {
                best = { staffId, dow, start, end, roomId: candidateRoomId, score };
              }
            }
          }
        }
        if (best) {
          // Apply best placement
          addInterval(occ.sections, req.sectionId, best.dow, best.start, best.end);
          addInterval(occ.staff, best.staffId, best.dow, best.start, best.end);
          if (best.roomId) addInterval(occ.rooms, best.roomId, best.dow, best.start, best.end);
          addInterval(teachOcc.staff, best.staffId, best.dow, best.start, best.end);
          addInterval(teachOcc.sections, req.sectionId, best.dow, best.start, best.end);
          bumpSSD(req.sectionId, req.subjectId, best.dow);
          placements.push({ runId: run.id, schoolId, sectionId: req.sectionId, subjectId: req.subjectId, staffId: best.staffId, roomId: best.roomId, dayOfWeek: best.dow, startTime: minutesToTime(best.start), endTime: minutesToTime(best.end), score: best.score, violations: 0 });
          placed = true;
        }
      }
    }
  }

  if (placements.length) {
    await prisma.timetablePlacement.createMany({ data: placements });
  }

  // Optionally publish results to TimetableEntry now (could keep as draft until approved)
  const entries = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const p of placements) {
      const e = await tx.timetableEntry.create({ data: { sectionId: p.sectionId, subjectId: p.subjectId, staffId: p.staffId, dayOfWeek: p.dayOfWeek, startTime: p.startTime, endTime: p.endTime, roomId: p.roomId, schoolId: p.schoolId, generatedByRunId: run.id } });
      created.push(e);
    }
    return created;
  });

  await prisma.timetableRun.update({ where: { id: run.id }, data: { status: 'SUCCEEDED', metricsJson: { placed: placements.length } } });
  return { runId: run.id, placed: placements.length, entries };
}
