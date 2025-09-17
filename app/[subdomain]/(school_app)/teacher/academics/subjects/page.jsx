// app/[subdomain]/(school_app)/teacher/academics/subjects/page.jsx
// Teacher-focused subjects list (read-only)
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
// NOTE: This page is 3 levels deep (teacher/academics/subjects) so layout is ../../../layout
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherSubjectsPage() {
	const school = useSchool();
	const { data: session } = useSession();
	const [subjects, setSubjects] = useState([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState('');

	const loadSubjects = useCallback(async () => {
		if (!school?.id || !session) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/schools/${school.id}/academics/subjects?mine=1`);
			if (!res.ok) {
				const d = await res.json().catch(() => ({}));
				throw new Error(d.error || 'Failed to load subjects');
			}
			const data = await res.json();
			setSubjects(data.subjects || []);
		} catch (e) {
			console.error(e);
			toast.error(e.message);
		} finally {
			setLoading(false);
		}
	}, [school?.id, session]);

	useEffect(() => { loadSubjects(); }, [loadSubjects]);

	const filtered = useMemo(() => {
		if (!query.trim()) return subjects;
		const q = query.toLowerCase();
		return subjects.filter(s => (s.name && s.name.toLowerCase().includes(q)) || (s.subjectCode && s.subjectCode.toLowerCase().includes(q)) || (s.schoolLevels || []).some(l => l.name.toLowerCase().includes(q)));
	}, [subjects, query]);

	return (
		<div className="space-y-6">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">My Subjects</h1>
					<p className="text-sm text-muted-foreground">Subjects you are assigned to teach, including codes, weekly hours, and levels.</p>
				</div>
				<div className="w-full md:w-64">
					<Input placeholder="Search subjects..." value={query} onChange={e => setQuery(e.target.value)} />
				</div>
			</div>
			<div className="overflow-x-auto border rounded-lg">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead className="hidden sm:table-cell">Code</TableHead>
							<TableHead className="hidden md:table-cell">Weekly Hours</TableHead>
							<TableHead>Levels</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell><Skeleton className="h-5 w-40" /></TableCell>
									<TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
									<TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12" /></TableCell>
									<TableCell><Skeleton className="h-5 w-48" /></TableCell>
								</TableRow>
							))
						) : filtered.length ? (
							filtered.map(s => (
								<TableRow key={s.id}>
									<TableCell className="font-medium">{s.name}</TableCell>
									<TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{s.subjectCode || '—'}</TableCell>
									<TableCell className="hidden md:table-cell text-sm text-muted-foreground">{s.weeklyHours ?? '—'}</TableCell>
									<TableCell className="text-xs text-muted-foreground">{(s.schoolLevels || []).map(l => l.name).join(', ') || '—'}</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={4} className="text-center py-10 text-sm text-muted-foreground">No subjects found.</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

