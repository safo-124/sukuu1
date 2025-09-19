"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, BookOpen, GraduationCap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { subdomain, studentId } = params || {};
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [grades, setGrades] = useState([]);

  useEffect(() => {
    if (!studentId || !subdomain) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        // Correct path is /api/schools/by-subdomain/{subdomain}
        let schoolId = null;
        const schoolRes = await fetch(`/api/schools/by-subdomain/${encodeURIComponent(subdomain)}`);
        if (schoolRes.ok) {
          const schoolJson = await schoolRes.json();
            schoolId = schoolJson?.school?.id || null;
        }
        // Fallback: use session if mapping failed
        if (!schoolId) {
          const sessionRes = await fetch('/api/auth/session');
          if (sessionRes.ok) {
            const sessionJson = await sessionRes.json();
            schoolId = sessionJson?.user?.schoolId || null;
          }
        }
        if (!schoolId) throw new Error('Unable to resolve school (subdomain mapping & session fallback failed).');

  const stuRes = await fetch(`/api/schools/${schoolId}/students/${studentId}?includeGrades=true&gradeLimit=10`);
        let stuJson = null;
        try { stuJson = await stuRes.json(); } catch { /* HTML error page fallback */ }
        if (stuRes.status === 404) {
          throw new Error('Student not found. It may have been removed or you lack permission.');
        }
        if (!stuRes.ok) throw new Error((stuJson && stuJson.error) || 'Failed to load student');

        if (!cancelled) { setStudent(stuJson.student); setGrades(stuJson.student?.grades || []); }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          toast.error('Student Profile Error', { description: e.message });
        }
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [studentId, subdomain]);

  const goBack = () => router.back();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={goBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold flex items-center gap-2"><User className="h-6 w-6" /> Student Profile</h1>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!loading && error && (
        <Card className="p-6 border-red-400/40 bg-red-500/5 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-red-600 dark:text-red-400">Failed to load student</p>
            <p className="text-red-500/80 dark:text-red-400/80">{error}</p>
          </div>
        </Card>
      )}

      {!loading && student && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 space-y-3 col-span-1">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Name</p>
              <p className="font-medium">{student.firstName} {student.lastName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Admission No.</p>
              <p className="font-mono text-sm">{student.studentIdNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Current Class / Section</p>
              <p className="text-sm">{student.currentClassDisplay || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Guardian</p>
              <p className="text-sm">{student.guardianName || 'N/A'} ({student.guardianRelation || 'Guardian'})</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4 col-span-2">
            <h2 className="font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Recent Grades</h2>
            {grades.length === 0 && <p className="text-sm text-zinc-500">No recent grades.</p>}
            {grades.length > 0 && (
              <div className="space-y-2">
                {grades.map(g => (
                  <div key={g.id} className="flex justify-between text-sm border-b border-zinc-200 dark:border-zinc-800 py-1">
                    <span className="truncate max-w-[60%]" title={g.assessmentType || 'Grade'}>
                      {g.subjectName || 'Subject'} – {g.assessmentType || 'Assessment'}
                    </span>
                    <span className="font-mono">
                      {g.marksObtained != null ? g.marksObtained : '—'} {g.gradeLetter ? `(${g.gradeLetter})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {!loading && student && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Academic Summary (Planned)</h2>
          <p className="text-sm text-zinc-500">Future: performance analytics, attendance stats, fee status.</p>
        </Card>
      )}
    </div>
  );
}
