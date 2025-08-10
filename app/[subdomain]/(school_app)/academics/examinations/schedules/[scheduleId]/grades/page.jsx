// app/[subdomain]/(school_app)/academics/examinations/schedules/[scheduleId]/grades/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../../../../layout';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, BookCheck, Save, AlertTriangle, Loader2 } from 'lucide-react';

export default function GradeEntryPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const { scheduleId, subdomain } = params;

  const [examSchedule, setExamSchedule] = useState(null);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({}); // { studentId: marks }
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500";
  
  const fetchGradeEntryData = useCallback(async () => {
    if (!schoolData?.id || !scheduleId) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/exam-schedules/${scheduleId}/grade-entry-data`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch data for grade entry.');
      }
      const data = await response.json();
      setExamSchedule(data.examSchedule);
      setStudents(data.students || []);
      const initialGrades = (data.students || []).reduce((acc, student) => {
        acc[student.id] = student.marksObtained !== null ? student.marksObtained : '';
        return acc;
      }, {});
      setGrades(initialGrades);
    } catch (err) {
      toast.error("Error Fetching Data", { description: err.message });
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id, scheduleId]);

  useEffect(() => {
    if (schoolData?.id && session) {
      fetchGradeEntryData();
    }
  }, [schoolData, session, fetchGradeEntryData]);

  const handleMarksChange = (studentId, marks) => {
    setGrades(prev => ({ ...prev, [studentId]: marks }));
  };

  const handleBatchSubmit = async () => {
    if (!schoolData?.id || !examSchedule) {
      toast.error("Cannot save grades. Missing required information.");
      return;
    }
    setIsSubmitting(true);

    const gradesToSubmit = Object.entries(grades).map(([studentId, marks]) => ({
        studentId,
        marksObtained: marks === '' ? null : parseFloat(marks),
      })).filter(g => !isNaN(g.marksObtained)); // Filter out any that resulted in NaN

    const payload = {
        examScheduleId: examSchedule.id,
        termId: examSchedule.exam.termId,
        academicYearId: examSchedule.class.academicYearId,
        subjectId: examSchedule.subject.id,
        sectionId: examSchedule.sectionId,
        grades: gradesToSubmit,
    };

    const toastId = 'batch-grade-submit';
    toast.loading("Saving grades...", { id: toastId });
    try {
        const response = await fetch(`/api/schools/${schoolData.id}/academics/grades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) {
            let err = result.error || 'Failed to save grades.';
            if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
            throw new Error(err);
        }
        toast.success(result.message || "Grades saved successfully!", { id: toastId });
    } catch (err) {
        toast.error("Submission Failed", { id: toastId, description: err.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
        <div className="space-y-8 p-4 md:p-6 lg:p-8">
            <Skeleton className="h-6 w-1/4 rounded-md" />
            <Skeleton className="h-9 w-3/4 rounded-md" />
            <Skeleton className="h-6 w-1/2 rounded-md" />
            <div className="mt-8"><Skeleton className="h-12 w-full rounded-t-lg" />{Array.from({ length: 10 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full border-t-0 rounded-none" />)) }</div>
            <div className="flex justify-end mt-6"><Skeleton className="h-10 w-32 rounded-md" /></div>
        </div>
    );
  }

  if (error) {
    return (
       <div className="p-4 md:p-6 lg:p-8 w-full">
         <div className="mb-6"><Link href={`/${subdomain}/academics/examinations`} className={`inline-flex items-center text-sm hover:underline ${descriptionTextClasses}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Examinations</Link></div>
         <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Loading Data</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> 
       </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href={`/${subdomain}/academics/examinations`} className={`inline-flex items-center text-sm hover:underline ${descriptionTextClasses} mb-2`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Examinations
          </Link>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <BookCheck className="mr-3 h-8 w-8 opacity-80"/> Grade Entry
          </h1>
          <p className={descriptionTextClasses}>
            {examSchedule?.subject?.name} - {examSchedule?.exam?.name} ({examSchedule?.class?.name} - {examSchedule?.section?.name})
          </p>
        </div>
        <Button className={primaryButtonClasses} onClick={handleBatchSubmit} disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : <><Save className="mr-2 h-4 w-4" />Save All Grades</>}
        </Button>
      </div>

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80 hover:bg-transparent">
              <TableHead className={`${titleTextClasses} font-semibold`}>Adm. No.</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Student Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Section</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold w-[150px]`}>Marks (Max: {examSchedule?.maxMarks || 'N/A'})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? students.map((student) => (
              <TableRow key={student.id} className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell className={`${descriptionTextClasses} font-mono text-xs`}>{student.studentIdNumber}</TableCell>
                <TableCell className={`${descriptionTextClasses} font-medium`}>{student.firstName} {student.lastName}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{student.sectionName}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={grades[student.id] || ''}
                    onChange={(e) => handleMarksChange(student.id, e.target.value)}
                    placeholder="-"
                    className={`${inputTextClasses} max-w-[120px] text-center`}
                    max={examSchedule?.maxMarks}
                    min="0"
                  />
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="4" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No students found in this class/section for grading.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <div className="flex justify-end">
        <Button className={primaryButtonClasses} onClick={handleBatchSubmit} disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : <><Save className="mr-2 h-4 w-4" />Save All Grades</>}
        </Button>
      </div>
    </div>
  );
}
