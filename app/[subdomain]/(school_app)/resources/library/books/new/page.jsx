// app/[subdomain]/(school_app)/resources/library/books/new/page.jsx
'use client';

import { useState } from 'react';
import { useSchool } from '../../../../layout';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, BookPlus } from 'lucide-react';

export default function NewBookPage() {
  const schoolData = useSchool();
  const router = useRouter();
  const { data: session } = useSession();

  const [form, setForm] = useState({ title: '', author: '', isbn: '', publicationYear: '', genre: '', copiesAvailable: 1 });
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault(); if (!schoolData?.id) return;
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        author: form.author,
        isbn: form.isbn || null,
        publicationYear: form.publicationYear ? parseInt(form.publicationYear, 10) : null,
        genre: form.genre || null,
        copiesAvailable: form.copiesAvailable ? parseInt(form.copiesAvailable, 10) : 1,
      };
      const res = await fetch(`/api/schools/${schoolData.id}/resources/books`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create book');
      toast.success(`Book "${data.book?.title}" created`);
      router.push(`/${schoolData.subdomain}/resources/library`);
    } catch (err) { toast.error('Create failed', { description: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      <h1 className='text-2xl font-bold flex items-center'><BookPlus className='h-6 w-6 mr-2'/>Add New Book</h1>
      <form onSubmit={onSubmit} className='space-y-4'>
        <div>
          <Label>Title</Label>
          <Input name='title' value={form.title} onChange={onChange} required />
        </div>
        <div>
          <Label>Author</Label>
          <Input name='author' value={form.author} onChange={onChange} required />
        </div>
        <div>
          <Label>ISBN</Label>
          <Input name='isbn' value={form.isbn} onChange={onChange} />
        </div>
        <div>
          <Label>Publication Year</Label>
          <Input name='publicationYear' type='number' value={form.publicationYear} onChange={onChange} />
        </div>
        <div>
          <Label>Genre</Label>
          <Input name='genre' value={form.genre} onChange={onChange} />
        </div>
        <div>
          <Label>Copies Available</Label>
          <Input name='copiesAvailable' type='number' min={1} value={form.copiesAvailable} onChange={onChange} />
        </div>
        <div className='flex gap-2'>
          <Button type='button' variant='outline' onClick={() => router.back()}>Cancel</Button>
          <Button type='submit' disabled={loading}>{loading ? (<><Loader2 className='h-4 w-4 mr-2 animate-spin'/>Saving...</>) : 'Create Book'}</Button>
        </div>
      </form>
    </div>
  );
}
