// app/[subdomain]/(school_app)/resources/library/loans/new/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useSchool } from '../../../../layout';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ClipboardList, BookOpen } from 'lucide-react';

export default function NewLoanPage() {
  const schoolData = useSchool();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const effectiveSubdomain = schoolData?.subdomain || params?.subdomain;

  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ studentId: '', bookId: '', quantity: 1, days: 14 });

  useEffect(() => {
    const load = async () => {
      if (!schoolData?.id) return;
      setLoading(true);
      try {
        const [sRes, bRes] = await Promise.all([
          fetch(`/api/schools/${schoolData.id}/people/students?limit=1000`),
          fetch(`/api/schools/${schoolData.id}/resources/books?limit=1000`)
        ]);
        const [sData, bData] = await Promise.all([sRes.json(), bRes.json()]);
        if (!sRes.ok) throw new Error(sData.error || 'Failed to load students');
        if (!bRes.ok) throw new Error(bData.error || 'Failed to load books');
        setStudents(sData.students || []);
        setBooks(bData.books || []);
        // Prefill student if provided in query
        const preId = searchParams?.get('studentId');
        if (preId) {
          setForm(prev => ({ ...prev, studentId: preId }));
        }
      } catch (err) { toast.error('Load failed', { description: err.message }); }
      finally { setLoading(false); }
    };
    load();
  }, [schoolData?.id, searchParams]);

  const onSubmit = async (e) => {
    e.preventDefault(); if (!schoolData?.id) return;
    if (!form.studentId || !form.bookId) { toast.error('Please select student and book'); return; }
    setSubmitting(true);
    try {
      const payload = { studentId: form.studentId, bookId: form.bookId, quantity: Number(form.quantity) || 1, days: Number(form.days) || 14 };
      const res = await fetch(`/api/schools/${schoolData.id}/resources/loans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create loan');
  toast.success('Loan created');
  router.push(`/${effectiveSubdomain}/resources/library/loans`);
    } catch (err) { toast.error('Create failed', { description: err.message }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      <h1 className='text-2xl font-bold flex items-center'><ClipboardList className='h-6 w-6 mr-2'/>New Loan</h1>
      {loading ? (
        <div className='flex items-center text-zinc-600 dark:text-zinc-400'><Loader2 className='h-4 w-4 mr-2 animate-spin'/>Loading...</div>
      ) : (
        <form onSubmit={onSubmit} className='space-y-4'>
          <div>
            <Label>Student</Label>
            <Select value={form.studentId} onValueChange={(v) => setForm(prev => ({ ...prev, studentId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder='Select student' />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentIdNumber})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Book</Label>
            <Select value={form.bookId} onValueChange={(v) => setForm(prev => ({ ...prev, bookId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder='Select book' />
              </SelectTrigger>
              <SelectContent>
                {books.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.title} — {b.author} {b.isbn ? `(ISBN ${b.isbn})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>Quantity</Label>
              <Input type='number' min={1} value={form.quantity} onChange={(e) => setForm(prev => ({ ...prev, quantity: e.target.value }))} />
            </div>
            <div>
              <Label>Days</Label>
              <Input type='number' min={1} max={365} value={form.days} onChange={(e) => setForm(prev => ({ ...prev, days: e.target.value }))} />
            </div>
          </div>
          <div className='flex gap-2'>
            <Button type='button' variant='outline' onClick={() => router.back()}>Cancel</Button>
            <Button type='submit' disabled={submitting}>{submitting ? (<><Loader2 className='h-4 w-4 mr-2 animate-spin'/>Saving...</>) : 'Create Loan'}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
