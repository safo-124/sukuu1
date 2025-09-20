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

  const requirements = await prisma.sectionSubjectRequirement.findMany({
    where: {
      schoolId,
      ...(Array.isArray(options.targetSectionIds) && options.targetSectionIds.length
        ? { sectionId: { in: options.targetSectionIds } } : {}),
    },
    include: { section: { select: { id: true, classId: true, name: true } }, subject: { select: { id: true, name: true } } },
  });
  const pinned = options.includePinned !== false ? await prisma.pinnedTimetableSlot.findMany({ where: { schoolId } }) : [];
  const staffUnavail = options.honorUnavailability !== false ? await prisma.staffUnavailability.findMany({ where: { schoolId } }) : [];
  const roomUnavail = await prisma.roomUnavailability.findMany({ where: { schoolId } });

  // Build occupancy maps per day
  const occ = { sections: new Map(), staff: new Map(), rooms: new Map() };
  const addInterval = (map, key, d, s, e) => {
    const k = `${key}-${d}`; if (!map.has(k)) map.set(k, []); map.get(k).push([s,e]);
  };
  const overlaps = (a,b) => !(a[1] <= b[0] || b[1] <= a[0]);
  const isFree = (map, key, d, s, e) => {
    const k = `${key}-${d}`; const arr = map.get(k) || []; return arr.every(iv => !overlaps(iv, [s,e]));
  };

  // Seed with existing entries and pinned as hard constraints
  const existing = await prisma.timetableEntry.findMany({ where: { schoolId } });
  existing.forEach(e => { const s = timeToMinutes(e.startTime), en = timeToMinutes(e.endTime); addInterval(occ.sections, e.sectionId, e.dayOfWeek, s, en); addInterval(occ.staff, e.staffId, e.dayOfWeek, s, en); if (e.roomId) addInterval(occ.rooms, e.roomId, e.dayOfWeek, s, en); });
  pinned.forEach(p => { const s = timeToMinutes(p.startTime), en = timeToMinutes(p.endTime); addInterval(occ.sections, p.sectionId, p.dayOfWeek, s, en); if (p.staffId) addInterval(occ.staff, p.staffId, p.dayOfWeek, s, en); if (p.roomId) addInterval(occ.rooms, p.roomId, p.dayOfWeek, s, en); });
  staffUnavail.forEach(u => { const s = timeToMinutes(u.startTime), en = timeToMinutes(u.endTime); addInterval(occ.staff, u.staffId, u.dayOfWeek, s, en); });
  roomUnavail.forEach(u => { const s = timeToMinutes(u.startTime), en = timeToMinutes(u.endTime); addInterval(occ.rooms, u.roomId, u.dayOfWeek, s, en); });

  // Collect candidate staff per section+subject via StaffSubjectLevel
  const ssl = await prisma.staffSubjectLevel.findMany({ where: { schoolId }, select: { staffId: true, subjectId: true, classId: true, schoolLevelId: true } });
  const subjectToStaff = new Map();
  ssl.forEach(l => { const key = `${l.subjectId}:${l.classId || '*'}`; if (!subjectToStaff.has(key)) subjectToStaff.set(key, new Set()); subjectToStaff.get(key).add(l.staffId); });

  // Create a run
  const run = await prisma.timetableRun.create({ data: { schoolId, status: 'RUNNING', optionsJson: options } });

  const placements = [];
  for (const req of requirements) {
    const count = Math.max(1, req.periodsPerWeek);
    const duration = req.durationMinutes || 60;
    const classKey = `${req.subjectId}:${req.section.classId || '*'}`;
    const altKey = `${req.subjectId}:*`;
    const staffSet = subjectToStaff.get(classKey) || subjectToStaff.get(altKey) || new Set();
    if (staffSet.size === 0) continue; // no teacher assigned
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
              const rooms = await prisma.room.findMany({ where: { schoolId } });
              const candidate = rooms.find(r => (!r.roomType || r.roomType===req.preferredRoomType) && isFree(occ.rooms, r.id, dow, start, end));
              if (candidate) roomId = candidate.id; else continue;
            }
            // Accept
            addInterval(occ.sections, req.sectionId, dow, start, end);
            addInterval(occ.staff, staffId, dow, start, end);
            if (roomId) addInterval(occ.rooms, roomId, dow, start, end);
            placements.push({ runId: run.id, schoolId, sectionId: req.sectionId, subjectId: req.subjectId, staffId, roomId, dayOfWeek: dow, startTime: minutesToTime(start), endTime: minutesToTime(end), score: 1.0, violations: 0 });
            placed = true; break;
          }
        }
      }
      if (!placed) {
        // leave unplaced; continue to next req occurrence
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
