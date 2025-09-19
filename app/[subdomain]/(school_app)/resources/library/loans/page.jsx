// app/[subdomain]/(school_app)/resources/library/loans/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClipboardList, Loader2, AlertTriangle, PlusCircle, CheckCircle2, Book, Users } from 'lucide-react';

export default function ManageLoansPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: 'BORROWED', search: '' });

  const titleTextClasses = 'text-black dark:text-white';
  const descriptionTextClasses = 'text-zinc-600 dark:text-zinc-400';
  const outlineButtonClasses = 'border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800';
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchLoans = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
      // Search can be implemented via server, but for now client-filter title/student
      const res = await fetch(`/api/schools/${schoolData.id}/resources/loans?${params.toString()}`);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to fetch loans'); }
      const data = await res.json();
      setLoans(data.loans || []);
    } catch (err) { toast.error('Error fetching loans', { description: err.message }); setError(err.message); }
    finally { setIsLoading(false); }
  }, [schoolData?.id, filters.status]);

  useEffect(() => { if (schoolData?.id && session) fetchLoans(); }, [schoolData, session, fetchLoans]);

  const handleReturn = async (loanId) => {
    if (!schoolData?.id) return;
    const toastId = `return-loan-${loanId}`;
    toast.loading('Returning loan...', { id: toastId });
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/resources/loans/${loanId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to return loan');
      toast.success('Loan returned', { id: toastId });
      fetchLoans();
    } catch (err) { toast.error('Return failed', { description: err.message, id: toastId }); }
  };

  const filtered = loans.filter(l => {
    const q = filters.search.toLowerCase();
    if (!q) return true;
    const studentName = `${l.student?.firstName || ''} ${l.student?.lastName || ''}`.toLowerCase();
    const bookTitle = (l.book?.title || '').toLowerCase();
    return studentName.includes(q) || bookTitle.includes(q) || (l.book?.isbn || '').toLowerCase().includes(q);
  });

  return (
    <div className='space-y-8'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <ClipboardList className='mr-3 h-8 w-8 opacity-80'/>Manage Loans
          </h1>
          <p className={descriptionTextClasses}>Track borrowed books and mark returns.</p>
        </div>
        <div className='flex gap-2 items-center'>
          <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>All</SelectItem>
              <SelectItem value='BORROWED'>Borrowed</SelectItem>
              <SelectItem value='RETURNED'>Returned</SelectItem>
              <SelectItem value='OVERDUE'>Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder='Search by student or book...' value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} className='w-[260px]' />
        </div>
      </div>

      {error && (<Alert variant='destructive' className='bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50'>
        <AlertTriangle className='h-4 w-4' /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription>
      </Alert>)}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <Book className='mr-2 h-6 w-6 opacity-80'/>Active Loans
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Book</TableHead>
              <TableHead className='hidden sm:table-cell'>Student</TableHead>
              <TableHead className='hidden md:table-cell'>Qty</TableHead>
              <TableHead className='hidden md:table-cell'>Borrowed</TableHead>
              <TableHead className='hidden lg:table-cell'>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`loan-skel-${i}`}>
                  <TableCell><Skeleton className='h-5 w-40'/></TableCell>
                  <TableCell className='hidden sm:table-cell'><Skeleton className='h-5 w-32'/></TableCell>
                  <TableCell className='hidden md:table-cell'><Skeleton className='h-5 w-6'/></TableCell>
                  <TableCell className='hidden md:table-cell'><Skeleton className='h-5 w-24'/></TableCell>
                  <TableCell className='hidden lg:table-cell'><Skeleton className='h-5 w-24'/></TableCell>
                  <TableCell><Skeleton className='h-5 w-20'/></TableCell>
                  <TableCell className='text-right'><Skeleton className='h-8 w-20 ml-auto'/></TableCell>
                </TableRow>
              ))
            ) : filtered.length > 0 ? filtered.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell>
                  <div className='font-medium'>{loan.book?.title}</div>
                  <div className='text-xs text-zinc-600 dark:text-zinc-400'>ISBN: {loan.book?.isbn || '—'}</div>
                </TableCell>
                <TableCell className='hidden sm:table-cell'>
                  <div className='font-medium'>{loan.student?.firstName} {loan.student?.lastName}</div>
                  <div className='text-xs text-zinc-600 dark:text-zinc-400'>#{loan.student?.studentIdNumber}</div>
                </TableCell>
                <TableCell className='hidden md:table-cell'>{loan.quantity}</TableCell>
                <TableCell className='hidden md:table-cell'>{new Date(loan.borrowedAt).toLocaleDateString()}</TableCell>
                <TableCell className='hidden lg:table-cell'>{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '—'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${loan.status === 'BORROWED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : loan.status === 'RETURNED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{loan.status}</span>
                </TableCell>
                <TableCell className='text-right'>
                  {loan.status === 'BORROWED' ? (
                    <Button size='sm' onClick={() => handleReturn(loan.id)} className='inline-flex items-center'>
                      <CheckCircle2 className='h-4 w-4 mr-2'/> Return
                    </Button>
                  ) : (
                    <span className='text-zinc-500 dark:text-zinc-400'>—</span>
                  )}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={7} className='text-center py-10 text-zinc-600 dark:text-zinc-400'>No loans found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
