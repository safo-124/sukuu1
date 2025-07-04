// app/[subdomain]/(school_app)/academics/examinations/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Lucide React Icons
import {
  FilePlus2, Edit3, Trash2, GraduationCap, Loader2, AlertTriangle, PlusCircle, CalendarDays, BookOpen, Clock, Home, CheckSquare
} from 'lucide-react';

// --- Form Data Initial States ---
const initialExamFormData = {
  id: null,
  name: '',
  termId: '',
  academicYearId: '', // Helper state for cascading dropdown
};

const initialExamScheduleFormData = {
  id: null,
  examId: '',
  subjectId: '',
  classId: '',
  date: '',
  startTime: '',
  endTime: '',
  room: '',
  maxMarks: '',
};

// --- Reusable Form Components ---
const ExamFormFields = ({ formData, onFormChange, onSelectChange, academicYears, isLoadingDeps }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const filteredTerms = useMemo(() => {
    if (!formData.academicYearId || !Array.isArray(academicYears)) return [];
    const selectedYear = academicYears.find(year => year.id === formData.academicYearId);
    return selectedYear && Array.isArray(selectedYear.terms) ? selectedYear.terms : [];
  }, [formData.academicYearId, academicYears]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-1">
      <div className="sm:col-span-2">
        <Label htmlFor="examName" className={labelTextClasses}>Exam Name <span className="text-red-500">*</span></Label>
        <Input id="examName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="academicYearId" className={labelTextClasses}>Academic Year <span className="text-red-500">*</span></Label>
        <Select name="academicYearId" value={formData.academicYearId || ''} onValueChange={(value) => onSelectChange('academicYearId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select academic year" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {isLoadingDeps ? <SelectItem value="loading" disabled>Loading...</SelectItem> : academicYears.length === 0 ? <SelectItem value="no-years" disabled>No academic years found</SelectItem> : academicYears.map(year => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="termId" className={labelTextClasses}>Term <span className="text-red-500">*</span></Label>
        <Select name="termId" value={formData.termId || ''} onValueChange={(value) => onSelectChange('termId', value)} disabled={isLoadingDeps || !formData.academicYearId}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select term" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!formData.academicYearId && <SelectItem value="select-year-first" disabled>Select Academic Year First</SelectItem>}
            {formData.academicYearId && filteredTerms.length === 0 && <SelectItem value="no-terms" disabled>No terms for this year</SelectItem>}
            {filteredTerms.map(term => <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const ExamScheduleFormFields = ({ formData, onFormChange, onSelectChange, examsList, subjectsList, classesList, isLoadingDeps }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  
  const filteredSubjects = useMemo(() => {
    if (!formData.classId || !Array.isArray(subjectsList)) return subjectsList || [];
    return subjectsList.filter(subject => subject.classes?.some(c => c.id === formData.classId));
  }, [formData.classId, subjectsList]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor="examId" className={labelTextClasses}>Exam <span className="text-red-500">*</span></Label>
        <Select name="examId" value={formData.examId || ''} onValueChange={(value) => onSelectChange('examId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select exam" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {isLoadingDeps ? <SelectItem value="loading" disabled>Loading...</SelectItem> : examsList.length === 0 ? <SelectItem value="no-exams" disabled>No exams available</SelectItem> : examsList.map(exam => <SelectItem key={exam.id} value={exam.id}>{`${exam.name} (${exam.term?.academicYear?.name})`}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="classId" className={labelTextClasses}>Class <span className="text-red-500">*</span></Label>
        <Select name="classId" value={formData.classId || ''} onValueChange={(value) => onSelectChange('classId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {isLoadingDeps ? <SelectItem value="loading" disabled>Loading...</SelectItem> : classesList.length === 0 ? <SelectItem value="no-classes" disabled>No classes available</SelectItem> : classesList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="subjectId" className={labelTextClasses}>Subject <span className="text-red-500">*</span></Label>
        <Select name="subjectId" value={formData.subjectId || ''} onValueChange={(value) => onSelectChange('subjectId', value)} disabled={isLoadingDeps || !formData.classId}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select subject" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!formData.classId && <SelectItem value="select-class-first" disabled>Select Class First</SelectItem>}
            {formData.classId && filteredSubjects.length === 0 && <SelectItem value="no-subjects" disabled>No subjects for this class</SelectItem>}
            {filteredSubjects.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="date" className={labelTextClasses}>Date <span className="text-red-500">*</span></Label>
        <Input id="date" name="date" type="date" value={formData.date || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="startTime" className={labelTextClasses}>Start Time <span className="text-red-500">*</span></Label>
        <Input id="startTime" name="startTime" type="time" value={formData.startTime || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="endTime" className={labelTextClasses}>End Time <span className="text-red-500">*</span></Label>
        <Input id="endTime" name="endTime" type="time" value={formData.endTime || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="maxMarks" className={labelTextClasses}>Max Marks <span className="text-red-500">*</span></Label>
        <Input id="maxMarks" name="maxMarks" type="number" step="0.1" min="0" value={formData.maxMarks || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="room" className={labelTextClasses}>Room (Optional)</Label>
        <Input id="room" name="room" value={formData.room || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., Hall A, Room 102" />
      </div>
    </div>
  );
};

export default function ManageExaminationsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const { subdomain } = params;

  const [exams, setExams] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]); // ✨ Declared state for rooms

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true);
  const [error, setError] = useState('');

  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  const [examFormData, setExamFormData] = useState({ ...initialExamFormData });
  const [examScheduleFormData, setExamScheduleFormData] = useState({ ...initialExamScheduleFormData });

  const [editingExam, setEditingExam] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  const [examFormError, setExamFormError] = useState('');
  const [scheduleFormError, setScheduleFormError] = useState('');

  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchAllData = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setIsLoadingDeps(true); setError('');
    try {
      const [examsRes, schedulesRes, yearsRes, subjectsRes, classesRes, /* roomsRes */] = await Promise.all([
        fetch(`/api/schools/${schoolData.id}/academics/exams`),
        fetch(`/api/schools/${schoolData.id}/academics/exam-schedules`),
        fetch(`/api/schools/${schoolData.id}/academic-years?includeTerms=true`), // API needs to support this
        fetch(`/api/schools/${schoolData.id}/academics/subjects?includeClasses=true`), // API needs to support this
        fetch(`/api/schools/${schoolData.id}/academics/classes`),
        // fetch(`/api/schools/${schoolData.id}/resources/rooms`), // This API needs to be created
      ]);

      const results = await Promise.all([examsRes, schedulesRes, yearsRes, subjectsRes, classesRes].map(r => {
        if (!r.ok) {
            return r.json().then(e => Promise.reject(e.error || `A fetch operation failed with status ${r.status}`));
        }
        return r.json();
      }));
      
      setExams(results[0]?.exams || []);
      setExamSchedules(results[1]?.examSchedules || []);
      setAcademicYears(results[2]?.academicYears || []);
      setSubjects(results[3]?.subjects || []);
      setClasses(results[4]?.classes || []);
      setRooms([]); // Set to empty array since API is not ready

    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : (err.error || err.message || 'Failed to fetch page data.');
      toast.error("Error Loading Data", { description: errorMsg }); setError(errorMsg);
      console.error("Data fetch error caught:", err);
    } finally {
      setIsLoading(false); setIsLoadingDeps(false);
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) { fetchAllData(); }
  }, [schoolData, session, fetchAllData]);

  const handleExamFormChange = (e) => setExamFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleExamSelectChange = (name, value) => {
    const newFormData = { ...examFormData, [name]: value };
    if (name === 'academicYearId') newFormData.termId = '';
    setExamFormData(newFormData);
  };
  const openAddExamDialog = () => { setEditingExam(null); setExamFormData({ ...initialExamFormData }); setExamFormError(''); setIsExamDialogOpen(true); };
  const openEditExamDialog = (exam) => {
    const term = academicYears.flatMap(ay => ay.terms).find(t => t.id === exam.termId);
    setEditingExam(exam);
    setExamFormData({ id: exam.id, name: exam.name, termId: exam.termId, academicYearId: term?.academicYearId || '' });
    setExamFormError(''); setIsExamDialogOpen(true);
  };
  const handleExamSubmit = async (e) => {
    e.preventDefault(); if (!schoolData?.id) return;
    setIsSubmittingExam(true); setExamFormError('');
    const isEditing = !!editingExam;
    const { academicYearId, ...payload } = examFormData;
    const url = isEditing ? `/api/schools/${schoolData.id}/academics/exams/${editingExam.id}` : `/api/schools/${schoolData.id}/academics/exams`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) { let err = result.error || `Failed to ${actionText} exam.`; if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; '); toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setExamFormError(err);
      } else { toast.success(`Exam "${result.exam?.name}" ${actionText}d successfully!`); setIsExamDialogOpen(false); fetchAllData(); }
    } catch (err) { toast.error('An unexpected error occurred.'); setExamFormError('An unexpected error occurred.');
    } finally { setIsSubmittingExam(false); }
  };
  const handleDeleteExam = async (examId, examName) => {
    if (!schoolData?.id || !window.confirm(`Are you sure you want to DELETE exam "${examName}"?`)) return;
    const toastId = `delete-exam-${examId}`;
    toast.loading("Deleting exam...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/exams/${examId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Exam "${examName}" deleted.`, { id: toastId });
      fetchAllData();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };
  
  const handleScheduleFormChange = (e) => setExamScheduleFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleScheduleSelectChange = (name, value) => {
      const newFormData = {...examScheduleFormData, [name]: value};
      if (name === 'classId') newFormData.subjectId = '';
      setExamScheduleFormData(newFormData);
  };
  const openAddScheduleDialog = (examId = '') => { setEditingSchedule(null); setExamScheduleFormData({ ...initialExamScheduleFormData, examId: examId }); setScheduleFormError(''); setIsScheduleDialogOpen(true); };
  const openEditScheduleDialog = (schedule) => {
    setEditingSchedule(schedule);
    setExamScheduleFormData({ id: schedule.id, examId: schedule.examId, subjectId: schedule.subjectId, classId: schedule.classId, date: schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '', startTime: schedule.startTime, endTime: schedule.endTime, room: schedule.room || '', maxMarks: schedule.maxMarks?.toString() || '' });
    setScheduleFormError(''); setIsScheduleDialogOpen(true);
  };
  const handleScheduleSubmit = async (e) => {
    e.preventDefault(); if (!schoolData?.id) return;
    setIsSubmittingSchedule(true); setScheduleFormError('');
    const isEditing = !!editingSchedule;
    const { id, ...payload } = examScheduleFormData;
    const url = isEditing ? `/api/schools/${schoolData.id}/academics/exam-schedules/${editingSchedule.id}` : `/api/schools/${schoolData.id}/academics/exam-schedules`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) { let err = result.error || `Failed to ${actionText} exam schedule.`; if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; '); toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setScheduleFormError(err);
      } else { toast.success(`Exam schedule ${actionText}d successfully!`); setIsScheduleDialogOpen(false); fetchExamSchedules(); }
    } catch (err) { toast.error('An unexpected error occurred.'); setScheduleFormError('An unexpected error occurred.');
    } finally { setIsSubmittingSchedule(false); }
  };
  const handleDeleteSchedule = async (scheduleId) => {
    if (!schoolData?.id || !window.confirm(`Are you sure you want to DELETE this exam schedule?`)) return;
    const toastId = `delete-schedule-${scheduleId}`;
    toast.loading("Deleting schedule...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/exam-schedules/${scheduleId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Exam schedule deleted.`, { id: toastId });
      fetchExamSchedules();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  const getExamNameAndContext = useCallback((id) => {
    const exam = exams.find(e => e.id === id);
    if (!exam) return 'N/A';
    return `${exam.name} (${exam.term?.academicYear?.name})`;
  }, [exams]);
  const getSubjectName = useCallback((id) => subjects.find(s => s.id === id)?.name || 'N/A', [subjects]);
  const getClassName = useCallback((id) => classes.find(c => c.id === id)?.name || 'N/A', [classes]);
  const getRoomName = useCallback((id) => rooms.find(r => r.id === id)?.name || 'N/A', [rooms]); // Correctly uses declared rooms state
  const formatScheduleDate = (dateString) => { if (!dateString) return 'N/A'; return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}> <GraduationCap className="mr-3 h-8 w-8 opacity-80"/>Manage Examinations </h1>
          <p className={descriptionTextClasses}>Define exams, schedule subjects, and manage exam details.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isExamDialogOpen} onOpenChange={(open) => { setIsExamDialogOpen(open); if (!open) setExamFormError(''); }}>
            <DialogTrigger asChild><Button className={primaryButtonClasses} onClick={openAddExamDialog}> <FilePlus2 className="mr-2 h-4 w-4" /> Add Exam </Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader><DialogTitle className={titleTextClasses}>{editingExam ? 'Edit Exam' : 'Add New Exam'}</DialogTitle><DialogDescription className={descriptionTextClasses}>{editingExam ? 'Update exam details.' : 'Create a new examination event.'}</DialogDescription></DialogHeader>
              <form onSubmit={handleExamSubmit} className="space-y-6 py-1">
                <ExamFormFields formData={examFormData} onFormChange={handleExamFormChange} onSelectChange={handleExamSelectChange} academicYears={academicYears} isLoadingDeps={isLoadingDeps}/>
                {examFormError && ( <p className="text-sm text-red-600 dark:text-red-400">{examFormError}</p> )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingExam || isLoadingDeps}>{isSubmittingExam ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingExam ? 'Saving...' : 'Creating...'}</> : editingExam ? 'Save Changes' : 'Create Exam'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isScheduleDialogOpen} onOpenChange={(open) => { setIsScheduleDialogOpen(open); if (!open) setScheduleFormError(''); }}>
            <DialogTrigger asChild><Button className={outlineButtonClasses} onClick={() => openAddScheduleDialog()}> <PlusCircle className="mr-2 h-4 w-4" /> Add Schedule </Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader><DialogTitle className={titleTextClasses}>{editingSchedule ? 'Edit Exam Schedule' : 'Add New Exam Schedule'}</DialogTitle><DialogDescription className={descriptionTextClasses}>{editingSchedule ? 'Update schedule details.' : 'Define a specific subject exam slot.'}</DialogDescription></DialogHeader>
              <form onSubmit={handleScheduleSubmit} className="space-y-6 py-1">
                <ExamScheduleFormFields formData={examScheduleFormData} onFormChange={handleScheduleFormChange} onSelectChange={handleScheduleSelectChange} examsList={exams} subjectsList={subjects} classesList={classes} roomsList={rooms} isLoadingDeps={isLoadingDeps}/>
                {scheduleFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{scheduleFormError}</p> )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingSchedule || isLoadingDeps}>{isSubmittingSchedule ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingSchedule ? 'Saving...' : 'Creating...'}</> : 'Create Schedule'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}
      
      <div className={`${glassCardClasses} overflow-x-auto mb-8`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}> <CalendarDays className="mr-2 h-6 w-6 opacity-80"/>Defined Exams </h2>
        <Table>
          <TableHeader><TableRow className="border-zinc-200/80 dark:border-zinc-700/80"><TableHead>Exam Name</TableHead><TableHead className="hidden sm:table-cell">Term</TableHead><TableHead className="hidden md:table-cell">Academic Year</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? ( Array.from({ length: 3 }).map((_, index) => ( <TableRow key={`exam-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50"><TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell><TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell><TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell></TableRow> ))
            ) : exams.length > 0 ? exams.map((exam) => (
              <TableRow key={exam.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{exam.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{exam.term?.name || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{exam.term?.academicYear?.name || 'N/A'}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1 md:gap-2"><Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditExamDialog(exam)} title="Edit Exam"> <Edit3 className="h-4 w-4" /> </Button><Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openAddScheduleDialog(exam.id)} title="Add Schedule for this Exam"> <PlusCircle className="h-4 w-4" /> </Button><Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteExam(exam.id, exam.name)} title="Delete Exam"> <Trash2 className="h-4 w-4" /> </Button></div></TableCell>
              </TableRow>
            )) : ( <TableRow className="border-zinc-200/50 dark:border-zinc-800/50"><TableCell colSpan="4" className={`text-center py-10 ${descriptionTextClasses}`}>No exams defined yet.</TableCell></TableRow> )}
          </TableBody>
        </Table>
      </div>

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}> <Clock className="mr-2 h-6 w-6 opacity-80"/>Exam Schedules </h2>
        <Table>
          <TableHeader><TableRow className="border-zinc-200/80 dark:border-zinc-700/80"><TableHead>Exam</TableHead><TableHead>Subject</TableHead><TableHead className="hidden sm:table-cell">Class</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead className="hidden md:table-cell">Time</TableHead><TableHead className="text-right">Max Marks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoadingDeps ? ( Array.from({ length: 3 }).map((_, index) => ( <TableRow key={`schedule-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50"><TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell><TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell><TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell><TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell><TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-10 rounded" /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell></TableRow> ))
            ) : examSchedules.length > 0 ? examSchedules.map((schedule) => (
              <TableRow key={schedule.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{getExamNameAndContext(schedule.examId)}</TableCell>
                <TableCell className={`${descriptionTextClasses}`}>{getSubjectName(schedule.subjectId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{getClassName(schedule.classId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{formatScheduleDate(schedule.date)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{`${schedule.startTime} - ${schedule.endTime}`}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-right`}>{schedule.maxMarks}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditScheduleDialog(schedule)} title="Edit Schedule"> <Edit3 className="h-4 w-4" /> </Button>
                    {/* ✨ ACTIVATED AND CORRECTED LINK BUTTON ✨ */}
                    <Link href={`/${subdomain}/academics/examinations/schedules/${schedule.id}/grades`} passHref>
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="Enter Grades"> 
                        <CheckSquare className="h-4 w-4" /> 
                      </Button>
                    </Link>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteSchedule(schedule.id)} title="Delete Schedule"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : ( <TableRow className="border-zinc-200/50 dark:border-zinc-800/50"><TableCell colSpan="7" className={`text-center py-10 ${descriptionTextClasses}`}>No exam schedules defined yet.</TableCell></TableRow> )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
