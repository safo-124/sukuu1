'use client';

import { useEffect, useState } from 'react';
import { useSchool } from '../../../../layout';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ReviewSubmissionsPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const assignmentId = params?.assignmentId;

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [grading, setGrading] = useState({}); // submissionId -> { marksObtained, feedback }

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!school?.id || !assignmentId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/schools/${school.id}/academics/assignments/${assignmentId}/submissions`);
        const d = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(d.error || 'Failed to load submissions');
        if (!ignore) {
          setAssignment(d.assignment || null);
          setSubmissions(d.submissions || []);
        }
      } catch (e) {
        toast.error(e.message || 'Failed to load');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [school?.id, assignmentId]);

  const onChange = (id, field, value) => setGrading(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const saveGrade = async (s) => {
    try {
      const g = grading[s.id] || {};
      const payload = {
        marksObtained: g.marksObtained !== undefined && g.marksObtained !== '' ? Number(g.marksObtained) : null,
        feedback: g.feedback ?? null,
      };
      const res = await fetch(`/api/schools/${school.id}/academics/assignments/${assignmentId}/submissions/${s.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const d = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(d.error || 'Failed to save');
      toast.success('Saved');
      // refresh list
      setSubmissions(prev => prev.map(x => x.id === s.id ? d.submission : x));
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  if (loading) return <div className='p-4 text-sm text-muted-foreground'>Loading…</div>;
  if (!assignment) return <div className='p-4 text-sm text-muted-foreground'>Assignment not found.</div>;

  return (
    <div className='space-y-4 p-2'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='text-lg font-semibold'>{assignment.title}</div>
          <div className='text-xs text-muted-foreground'>Subject: {assignment.subject?.name || '—'} | Type: {assignment.type} | Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '—'}</div>
        </div>
        <Button variant='outline' onClick={() => router.back()}>Back</Button>
      </div>
      {submissions.length === 0 ? (
        <div className='text-sm text-muted-foreground'>No submissions yet.</div>
      ) : (
        <div className='space-y-3'>
          {submissions.map(s => (
            <div key={s.id} className='border rounded-md p-3 space-y-2'>
              <div className='text-sm font-medium'>{s.student?.lastName}, {s.student?.firstName}</div>
              <div className='text-xs text-muted-foreground'>Submitted: {new Date(s.submittedAt).toLocaleString()}</div>
              {s.attachments && Array.isArray(s.attachments) && s.attachments.length > 0 && (
                <div className='text-xs'>Attachments: {s.attachments.map((u, i) => <a key={i} href={u} className='underline mr-2' target='_blank' rel='noreferrer'>file{i+1}</a>)}</div>
              )}
              {s.content && (
                <details className='text-xs'>
                  <summary className='cursor-pointer select-none'>View content</summary>
                  <pre className='whitespace-pre-wrap text-xs mt-1'>{s.content}</pre>
                </details>
              )}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-2 items-start'>
                <div>
                  <label className='text-xs block mb-1'>Marks</label>
                  <Input type='number' value={(grading[s.id]?.marksObtained ?? s.marksObtained ?? '')}
                         onChange={e => onChange(s.id, 'marksObtained', e.target.value)} placeholder='e.g. 10'/>
                </div>
                <div className='md:col-span-2'>
                  <label className='text-xs block mb-1'>Feedback</label>
                  <Textarea rows={3} value={(grading[s.id]?.feedback ?? s.feedback ?? '')}
                            onChange={e => onChange(s.id, 'feedback', e.target.value)} placeholder='Optional feedback to student'/>
                </div>
              </div>
              <div className='flex justify-end'>
                <Button size='sm' onClick={() => saveGrade(s)}>Save</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
