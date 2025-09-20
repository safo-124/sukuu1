'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSchool } from '../../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function TeacherExamGradesPage() {
	const school = useSchool();
	const { data: session } = useSession();
	const isTeacher = session?.user?.role === 'TEACHER';

	const [subjects, setSubjects] = useState([]);
	const [sections, setSections] = useState([]);
	const [students, setStudents] = useState([]);
	const [examSchedules, setExamSchedules] = useState([]);
	const [selected, setSelected] = useState({ subjectId: '', sectionId: '', examScheduleId: '' });
	const [termYear, setTermYear] = useState({ termId: '', academicYearId: '' });
	const [me, setMe] = useState(null);
	const [allowedSubjectsForSection, setAllowedSubjectsForSection] = useState(null);
	const [marks, setMarks] = useState({});
	const [remarks, setRemarks] = useState({});

	const inputRefs = useRef({});
	const dirtyIdsRef = useRef(new Set());
	const autosaveTimer = useRef(null);
	const [saving, setSaving] = useState('idle');
	const [saveMessage, setSaveMessage] = useState('');

	const loadContext = useCallback(async () => {
		if (!school?.id || !session) return;
		try {
			const mine = isTeacher ? '1' : '0';
			const [meRes, subjectsRes, sectionsRes, examsRes, yearsRes] = await Promise.all([
				fetch(`/api/schools/${school.id}/staff/me`),
				fetch(`/api/schools/${school.id}/academics/subjects?mine=${mine}`),
				fetch(`/api/schools/${school.id}/academics/sections`),
				fetch(`/api/schools/${school.id}/academics/exam-schedules`),
				fetch(`/api/schools/${school.id}/academic-years`),
			]);
			let meData = null;
			if (meRes.ok) { meData = await meRes.json(); setMe(meData); }
			if (subjectsRes.ok) { const d = await subjectsRes.json(); setSubjects((isTeacher && meData?.taughtSubjects?.length) ? meData.taughtSubjects : (d.subjects || [])); }
			if (sectionsRes.ok) { const d = await sectionsRes.json(); setSections((isTeacher && meData?.classTeacherSections?.length) ? meData.classTeacherSections : (d.sections || [])); }
			if (examsRes.ok) { const d = await examsRes.json();
				const flat = (d.examSchedules || []).map(es => ({ id: es.id, label: `${es.exam?.term?.academicYear?.name || ''} ${es.exam?.name || ''} - ${es.subject?.name || ''} (${es.class?.name || ''})`, subjectId: es.subjectId, classId: es.classId, termId: es.exam?.termId, academicYearId: es.exam?.term?.academicYear?.id }));
				setExamSchedules(flat);
			}
			if (yearsRes.ok) { const d = await yearsRes.json(); const current = (d.academicYears || []).find(y => y.isCurrent) || d.academicYears?.[0]; if (current) setTermYear({ termId: current.terms?.[0]?.id || '', academicYearId: current.id }); }
		} catch (e) {
			console.error(e); toast.error('Failed to load exam grading context');
		}
	}, [school?.id, session, isTeacher]);

	useEffect(() => { loadContext(); }, [loadContext]);

	const availableSubjects = useMemo(() => Array.isArray(allowedSubjectsForSection) ? allowedSubjectsForSection : subjects, [allowedSubjectsForSection, subjects]);

	// Restrict subjects by timetable when not class teacher of section
	useEffect(() => {
		const run = async () => {
			if (!isTeacher || !school?.id || !selected.sectionId || !me?.staff?.id) { setAllowedSubjectsForSection(null); return; }
			const isClassTeacherForSelected = (me?.classTeacherSections || []).some(sec => sec.id === selected.sectionId);
			if (isClassTeacherForSelected) { setAllowedSubjectsForSection(null); return; }
			try {
				const res = await fetch(`/api/schools/${school.id}/academics/timetable?sectionId=${selected.sectionId}&staffId=${me.staff.id}`);
				if (!res.ok) { setAllowedSubjectsForSection([]); return; }
				const d = await res.json();
				const map = new Map(); (d.timetableEntries || []).forEach(e => { if (e.subject) map.set(e.subject.id, e.subject); });
				setAllowedSubjectsForSection(Array.from(map.values()));
			} catch { setAllowedSubjectsForSection([]); }
		};
		run();
	}, [isTeacher, school?.id, selected.sectionId, me?.staff?.id]);

	const loadStudents = useCallback(async () => {
		if (!school?.id || !selected.sectionId) return;
		if (isTeacher) {
			const isClassTeacherForSelected = (me?.classTeacherSections || []).some(sec => sec.id === selected.sectionId);
			if (!isClassTeacherForSelected && !selected.subjectId) return;
		}
		try {
			const url = `/api/schools/${school.id}/academics/grades/students?sectionId=${selected.sectionId}${selected.subjectId ? `&subjectId=${selected.subjectId}` : ''}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error('Failed to load students');
			const d = await res.json(); setStudents(d.students || []); setMarks({}); setRemarks({});
		} catch (e) { toast.error(e.message); }
	}, [school?.id, selected.sectionId, selected.subjectId, isTeacher, me?.classTeacherSections]);

	useEffect(() => { loadStudents(); }, [loadStudents]);

	// Prefill marks and remarks from existing grades for the chosen exam schedule
	useEffect(() => {
		const run = async () => {
			if (!school?.id || !selected.examScheduleId || !selected.sectionId) return;
			try {
				const res = await fetch(`/api/schools/${school.id}/academics/exam-schedules/${selected.examScheduleId}/grade-entry-data`);
				if (!res.ok) return; // ignore silently
				const d = await res.json();
				const nextMarks = {};
				const nextRemarks = {};
				(d.students || []).forEach(st => {
					if (st.marksObtained !== null && st.marksObtained !== undefined) nextMarks[st.id] = st.marksObtained;
					if (st.comments) nextRemarks[st.id] = st.comments;
				});
				setMarks(nextMarks);
				setRemarks(nextRemarks);
			} catch (e) {
				// best-effort prefill; no toast to avoid noise
			}
		};
		run();
	}, [school?.id, selected.examScheduleId, selected.sectionId]);

	// Filter exam schedules to subject/section class match
	const filteredExamSchedules = useMemo(() => {
		if (!selected.subjectId && !selected.sectionId) return examSchedules;
		const classId = sections.find(s => s.id === selected.sectionId)?.classId;
		return examSchedules.filter(es => (!selected.subjectId || es.subjectId === selected.subjectId) && (!classId || es.classId === classId));
	}, [examSchedules, selected.subjectId, selected.sectionId, sections]);

	const onChangeMark = (studentId, value) => {
		setMarks(prev => ({ ...prev, [studentId]: value }));
		dirtyIdsRef.current.add(studentId);
		setSaving('idle');
	};

	const onChangeRemark = (studentId, value) => {
		setRemarks(prev => ({ ...prev, [studentId]: value }));
		dirtyIdsRef.current.add(studentId);
		setSaving('idle');
	};

	const handleKeyDown = (e, idx) => {
		if (e.key === 'ArrowDown') { e.preventDefault(); const n = students[idx + 1]; if (n && inputRefs.current[n.id]) inputRefs.current[n.id].focus(); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); const p = students[idx - 1]; if (p && inputRefs.current[p.id]) inputRefs.current[p.id].focus(); }
	};

	const toNum = (v) => { if (v === '' || v === null || v === undefined) return null; const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

	const buildPayload = () => {
		const dirtyIds = Array.from(dirtyIdsRef.current); if (!dirtyIds.length) return null;
		const gradesArr = dirtyIds.map(id => ({ studentId: id, marksObtained: toNum(marks[id]), comments: (remarks[id] ?? '')?.toString().trim() || null }));
		const es = examSchedules.find(e => e.id === selected.examScheduleId);
		if (!es || !selected.sectionId) return null;
		return {
			url: `/api/schools/${school.id}/academics/grades/exams`,
			payload: {
				examScheduleId: selected.examScheduleId,
				termId: es.termId || termYear.termId,
				academicYearId: es.academicYearId || termYear.academicYearId,
				subjectId: es.subjectId || selected.subjectId,
				sectionId: selected.sectionId,
				grades: gradesArr,
			}
		};
	};

	useEffect(() => {
		if (!selected.examScheduleId || !selected.sectionId) return; // only autosave when target chosen
		if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
		autosaveTimer.current = setTimeout(async () => {
			const job = buildPayload(); if (!job) return;
			setSaving('saving'); setSaveMessage('Saving changes...');
			try {
				const res = await fetch(job.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(job.payload) });
				if (!res.ok) throw new Error('Failed to save');
				const savedIds = new Set(job.payload.grades.map(g => g.studentId));
				dirtyIdsRef.current.forEach(id => { if (savedIds.has(id)) dirtyIdsRef.current.delete(id); });
				setSaving('saved'); setSaveMessage('All changes saved');
			} catch (err) {
				setSaving('error'); setSaveMessage('Failed to save');
			}
		}, 800);
		return () => clearTimeout(autosaveTimer.current);
	}, [marks, selected.examScheduleId, selected.sectionId, termYear.termId, termYear.academicYearId]);

	const submitExamGrades = async () => {
		const job = buildPayload(); if (!job) return;
		const res = await fetch(job.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(job.payload) });
		const data = await res.json(); if (!res.ok) return toast.error(data.error || 'Failed to save exam grades');
		toast.success('Exam grades saved');
	};

	const availableSections = useMemo(() => sections, [sections]);

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-semibold">Enter Exam Grades</h1>
			{selected.sectionId && isTeacher && !(me?.classTeacherSections || []).some(sec => sec.id === selected.sectionId) && !selected.subjectId ? (
				<p className="text-sm text-muted-foreground">Select a subject to load students for this section.</p>
			) : null}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label className="block text-sm mb-1">Subject</label>
					<Select value={selected.subjectId} onValueChange={(v) => setSelected(s => ({ ...s, subjectId: v }))}>
						<SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
						<SelectContent>
							{availableSubjects.map(s => (<SelectItem value={s.id} key={s.id}>{s.name}</SelectItem>))}
						</SelectContent>
					</Select>
				</div>
				<div>
					<label className="block text-sm mb-1">Section</label>
					<Select value={selected.sectionId} onValueChange={(v) => setSelected(s => ({ ...s, sectionId: v }))}>
						<SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
						<SelectContent>
							{availableSections.map(sec => (<SelectItem value={sec.id} key={sec.id}>{sec.class?.name} - {sec.name}</SelectItem>))}
						</SelectContent>
					</Select>
				</div>
				<div>
					<label className="block text-sm mb-1">Exam Schedule</label>
					<Select value={selected.examScheduleId} onValueChange={(v) => setSelected(s => ({ ...s, examScheduleId: v }))}>
						<SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
						<SelectContent>
							{filteredExamSchedules.map(es => (<SelectItem value={es.id} key={es.id}>{es.label}</SelectItem>))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="overflow-x-auto">
				<div className="flex items-center justify-between mb-2">
					<div className="text-xs text-muted-foreground">{saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'All changes saved' : saving === 'error' ? saveMessage : 'Autosave ready'}</div>
				</div>
				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left border-b">
							<th className="py-2 pr-4">Student</th>
							<th className="py-2">Marks</th>
							<th className="py-2 pl-4">Remarks</th>
						</tr>
					</thead>
					<tbody>
						{students.map((st, idx) => (
							<tr key={st.id} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-900">
								<td className="py-2 pr-4">{st.lastName}, {st.firstName}</td>
								<td className="py-2">
									<Input
										ref={(el) => { if (el) inputRefs.current[st.id] = el; }}
										type="number"
										value={marks[st.id] ?? ''}
										onChange={(e) => onChangeMark(st.id, e.target.value)}
										onKeyDown={(e) => handleKeyDown(e, idx)}
										placeholder="e.g., 78"
									/>
								</td>
								<td className="py-2 pl-4">
									<Input
										value={remarks[st.id] ?? ''}
										onChange={(e) => onChangeRemark(st.id, e.target.value)}
										placeholder="Optional notes"
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="flex gap-2">
				<Button onClick={submitExamGrades} disabled={!selected.examScheduleId || !selected.sectionId}>Save Exam Grades</Button>
			</div>
		</div>
	);
}

