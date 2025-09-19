// app/[subdomain]/(school_app)/academics/examinations/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import RequireRole from '@/components/auth/RequireRole';

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Lucide React Icons
import { FilePlus2, Edit3, Trash2, GraduationCap, Loader2, AlertTriangle, PlusCircle, CalendarDays, Clock, CheckSquare } from 'lucide-react';

// --- Form Data Initial States ---
const initialExamFormData = { id: null, name: '', termId: '', academicYearId: '' };
const initialExamScheduleFormData = { id: null, examId: '', subjectId: '', classId: '', date: '', startTime: '09:00', endTime: '10:00', roomId: '', maxMarks: '100' };

// --- Reusable Form Components ---
const ExamFormFields = ({ formData, onFormChange, onSelectChange, academicYears, isLoadingDeps }) => {
  const labelTextClasses = "text-zinc-800 dark:text-zinc-200 block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:ring-sky-500";
  const filteredTerms = useMemo(() => {
    if (!formData.academicYearId || !Array.isArray(academicYears)) return [];
    const selectedYear = academicYears.find(year => year.id === formData.academicYearId);
    return selectedYear?.terms || [];
  }, [formData.academicYearId, academicYears]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-1">
      <div className="sm:col-span-2"><Label htmlFor="examName" className={labelTextClasses}>Exam Name <span className="text-red-500">*</span></Label><Input id="examName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
      <div><Label htmlFor="academicYearId" className={labelTextClasses}>Academic Year <span className="text-red-500">*</span></Label><Select name="academicYearId" value={formData.academicYearId || ''} onValueChange={(value) => onSelectChange('academicYearId', value)} disabled={isLoadingDeps}><SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select academic year" /></SelectTrigger><SelectContent>{isLoadingDeps ? <SelectItem value="loading" disabled>Loading...</SelectItem> : academicYears.length === 0 ? <SelectItem value="no-years" disabled>No academic years found</SelectItem> : academicYears.map(year => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="termId" className={labelTextClasses}>Term <span className="text-red-500">*</span></Label><Select name="termId" value={formData.termId || ''} onValueChange={(value) => onSelectChange('termId', value)} disabled={isLoadingDeps || !formData.academicYearId}><SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select term" /></SelectTrigger><SelectContent>{!formData.academicYearId && <SelectItem value="select-year-first" disabled>Select Academic Year First</SelectItem>}{formData.academicYearId && filteredTerms.length === 0 && <SelectItem value="no-terms" disabled>No terms for this year</SelectItem>}{filteredTerms.map(term => <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>)}</SelectContent></Select></div>
    </div>
  );
};

const ExamScheduleFormFields = ({ formData, onFormChange, onSelectChange, examsList, subjectsList, classesList, roomsList, isLoadingDeps }) => {
  const labelTextClasses = "text-zinc-800 dark:text-zinc-200 block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:ring-sky-500";
  const filteredSubjects = useMemo(() => {
    if (!formData.classId || !Array.isArray(subjectsList)) return [];
    // Prefer filtering subjects by the selected class's school level,
    // since subjects are linked to SchoolLevels via SubjectSchoolLevel.
    const selectedClass = Array.isArray(classesList)
      ? classesList.find((c) => c.id === formData.classId)
      : null;
    const levelId = selectedClass?.schoolLevelId;

    if (levelId) {
      return subjectsList.filter((subject) =>
        Array.isArray(subject.schoolLevelLinks) &&
        subject.schoolLevelLinks.some((link) => link?.schoolLevel?.id === levelId)
      );
    }

    // Fallback: if class doesn't have schoolLevelId exposed, try the direct Subject.classes relation if available
    return subjectsList.filter((subject) =>
      Array.isArray(subject.classes) && subject.classes.some((c) => c.id === formData.classId)
    );
  }, [formData.classId, subjectsList, classesList]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2"><Label htmlFor="examId" className={labelTextClasses}>Exam <span className="text-red-500">*</span></Label><Select name="examId" value={formData.examId || ''} onValueChange={(value) => onSelectChange('examId', value)} disabled={isLoadingDeps}><SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select exam" /></SelectTrigger><SelectContent>{isLoadingDeps ? <SelectItem value="loading" disabled>Loading...</SelectItem> : examsList.length === 0 ? <SelectItem value="no-exams" disabled>No exams available</SelectItem> : examsList.map(exam => <SelectItem key={exam.id} value={exam.id}>{`${exam.name} (${exam.term?.academicYear?.name})`}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="classId" className={labelTextClasses}>Class <span className="text-red-500">*</span></Label><Select name="classId" value={formData.classId || ''} onValueChange={(value) => onSelectChange('classId', value)} disabled={isLoadingDeps}><SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{isLoadingDeps ? <SelectItem value="loading" disabled>Loading...</SelectItem> : classesList.length === 0 ? <SelectItem value="no-classes" disabled>No classes available</SelectItem> : classesList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="subjectId" className={labelTextClasses}>Subject <span className="text-red-500">*</span></Label><Select name="subjectId" value={formData.subjectId || ''} onValueChange={(value) => onSelectChange('subjectId', value)} disabled={isLoadingDeps || !formData.classId}><SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{!formData.classId && <SelectItem value="select-class-first" disabled>Select Class First</SelectItem>}{formData.classId && filteredSubjects.length === 0 && <SelectItem value="no-subjects" disabled>No subjects for this class</SelectItem>}{filteredSubjects.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="date" className={labelTextClasses}>Date <span className="text-red-500">*</span></Label><Input id="date" name="date" type="date" value={formData.date || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
      <div><Label htmlFor="startTime" className={labelTextClasses}>Start Time <span className="text-red-500">*</span></Label><Input id="startTime" name="startTime" type="time" value={formData.startTime || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
      <div><Label htmlFor="endTime" className={labelTextClasses}>End Time <span className="text-red-500">*</span></Label><Input id="endTime" name="endTime" type="time" value={formData.endTime || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
      <div><Label htmlFor="maxMarks" className={labelTextClasses}>Max Marks <span className="text-red-500">*</span></Label><Input id="maxMarks" name="maxMarks" type="number" step="0.1" min="0" value={formData.maxMarks || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
      <div className="sm:col-span-2"><Label htmlFor="roomId" className={labelTextClasses}>Room (Optional)</Label><Select name="roomId" value={formData.roomId || ''} onValueChange={(value) => onSelectChange('roomId', value === 'none' ? '' : value)} disabled={isLoadingDeps}><SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select room" /></SelectTrigger><SelectContent><SelectItem value="none">No specific room</SelectItem>{isLoadingDeps ? <SelectItem value="loading-rooms" disabled>Loading...</SelectItem> : roomsList.length === 0 ? <SelectItem value="no-rooms" disabled>No rooms available</SelectItem> : roomsList.map(room => <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>)}</SelectContent></Select></div>
    </div>
  );
};

function AdminExaminationsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const params = useParams();
  const { subdomain } = params;

  const [exams, setExams] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]); // ✨ State variable is now declared ✨
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true);
  const [error, setError] = useState('');
  const [selectedExamId, setSelectedExamId] = useState(null);

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

  const fetchAllData = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setIsLoadingDeps(true); setError('');
    try {
      const [examsRes, schedulesRes, yearsRes, subjectsRes, classesRes, roomsRes] = await Promise.all([
        fetch(`/api/schools/${schoolData.id}/academics/exams`),
        fetch(`/api/schools/${schoolData.id}/academics/exam-schedules`),
        fetch(`/api/schools/${schoolData.id}/academic-years?includeTerms=true`),
        fetch(`/api/schools/${schoolData.id}/academics/subjects`),
        fetch(`/api/schools/${schoolData.id}/academics/classes`),
        fetch(`/api/schools/${schoolData.id}/resources/rooms`),
      ]);
      const results = await Promise.all([examsRes, schedulesRes, yearsRes, subjectsRes, classesRes, roomsRes].map(r => {
        if (!r.ok) return r.json().then(e => Promise.reject(e.error || `A fetch operation failed with status ${r.status}`));
        return r.json();
      }));
      const fetchedExams = results[0]?.exams || [];
      setExams(fetchedExams);
      setExamSchedules(results[1]?.examSchedules || []);
      setAcademicYears(results[2]?.academicYears || []);
      setSubjects(results[3]?.subjects || []);
      setClasses(results[4]?.classes || []);
      setRooms(results[5]?.rooms || []);
      if (fetchedExams.length > 0 && !selectedExamId) {
        setSelectedExamId(fetchedExams[0].id);
      }
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : (err.error || err.message || 'Failed to fetch page data.');
      toast.error("Error Loading Data", { description: errorMsg }); setError(errorMsg);
    } finally {
      setIsLoading(false); setIsLoadingDeps(false);
    }
  }, [schoolData?.id, selectedExamId]);

  useEffect(() => {
    if (schoolData?.id && session) { fetchAllData(); }
  }, [schoolData, session, fetchAllData]);
  
  const handleExamFormChange = (e) => setExamFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleExamSelectChange = (name, value) => { const newFormData = { ...examFormData, [name]: value }; if (name === 'academicYearId') newFormData.termId = ''; setExamFormData(newFormData); };
  const openAddExamDialog = () => { setEditingExam(null); setExamFormData({ ...initialExamFormData }); setExamFormError(''); setIsExamDialogOpen(true); };
  const openEditExamDialog = (exam) => { const allTerms = academicYears.flatMap(ay => ay.terms || []); const term = allTerms.find(t => t.id === exam.termId); setEditingExam(exam); setExamFormData({ id: exam.id, name: exam.name, termId: exam.termId, academicYearId: term?.academicYearId || '' }); setExamFormError(''); setIsExamDialogOpen(true); };
  const handleExamSubmit = async (e) => { e.preventDefault(); if (!schoolData?.id) return; setIsSubmittingExam(true); setExamFormError(''); const isEditing = !!editingExam; const { id, academicYearId, ...payload } = examFormData; const url = isEditing ? `/api/schools/${schoolData.id}/academics/exams/${editingExam.id}` : `/api/schools/${schoolData.id}/academics/exams`; const method = isEditing ? 'PUT' : 'POST'; const actionText = isEditing ? 'update' : 'create'; try { const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) { let err = result.error || `Failed to ${actionText} exam.`; if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; '); toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setExamFormError(err); } else { toast.success(`Exam "${result.exam?.name}" ${actionText}d successfully!`); setIsExamDialogOpen(false); fetchAllData(); } } catch (err) { toast.error('An unexpected error occurred.'); setExamFormError('An unexpected error occurred.'); } finally { setIsSubmittingExam(false); } };
  const handleDeleteExam = async (examId, examName) => { if (!schoolData?.id || !window.confirm(`Are you sure you want to DELETE exam "${examName}"?`)) return; const toastId = `delete-exam-${examId}`; toast.loading("Deleting exam...", { id: toastId }); try { const response = await fetch(`/api/schools/${schoolData.id}/academics/exams/${examId}`, { method: 'DELETE' }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Deletion failed."); toast.success(result.message || `Exam "${examName}" deleted.`, { id: toastId }); fetchAllData(); } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); } };
  
  const handleScheduleFormChange = (e) => setExamScheduleFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleScheduleSelectChange = (name, value) => { const newFormData = {...examScheduleFormData, [name]: value}; if (name === 'classId') newFormData.subjectId = ''; setExamScheduleFormData(newFormData); };
  const openAddScheduleDialog = () => { setEditingSchedule(null); setExamScheduleFormData({ ...initialExamScheduleFormData, examId: selectedExamId }); setScheduleFormError(''); setIsScheduleDialogOpen(true); };
  const openEditScheduleDialog = (schedule) => {
    setEditingSchedule(schedule);
    const matchedRoomId = rooms.find((r) => r.name === schedule.room)?.id || '';
    setExamScheduleFormData({
      id: schedule.id,
      examId: schedule.examId,
      subjectId: schedule.subjectId,
      classId: schedule.classId,
      date: schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '',
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      roomId: matchedRoomId,
      maxMarks: schedule.maxMarks?.toString() || ''
    });
    setScheduleFormError('');
    setIsScheduleDialogOpen(true);
  };
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingSchedule(true);
    setScheduleFormError('');
    const isEditing = !!editingSchedule;
    const { id, ...payload } = examScheduleFormData;
    // Map selected roomId to a plain room name string expected by the API
    const roomName = payload.roomId ? (rooms.find((r) => r.id === payload.roomId)?.name || null) : null;
    const payloadToSend = { ...payload, room: roomName };
    delete payloadToSend.roomId;
    const url = isEditing
      ? `/api/schools/${schoolData.id}/academics/exam-schedules/${editingSchedule.id}`
      : `/api/schools/${schoolData.id}/academics/exam-schedules`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSend)
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} exam schedule.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err });
        setScheduleFormError(err);
      } else {
        toast.success(`Exam schedule ${actionText}d successfully!`);
        setIsScheduleDialogOpen(false);
        fetchAllData();
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
      setScheduleFormError('An unexpected error occurred.');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };
  const handleDeleteSchedule = async (scheduleId) => { if (!schoolData?.id || !window.confirm(`Are you sure you want to DELETE this exam schedule?`)) return; const toastId = `delete-schedule-${scheduleId}`; toast.loading("Deleting schedule...", { id: toastId }); try { const response = await fetch(`/api/schools/${schoolData.id}/academics/exam-schedules/${scheduleId}`, { method: 'DELETE' }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Deletion failed."); toast.success(result.message || `Exam schedule deleted.`, { id: toastId }); fetchAllData(); } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); } };

  const filteredSchedules = useMemo(() => { if (!selectedExamId) return []; return examSchedules.filter(s => s.examId === selectedExamId); }, [selectedExamId, examSchedules]);
  const getSubjectName = useCallback((id) => subjects.find(s => s.id === id)?.name || 'N/A', [subjects]);
  const getClassName = useCallback((id) => classes.find(c => c.id === id)?.name || 'N/A', [classes]);
  const getRoomName = useCallback((id) => rooms.find(r => r.id === id)?.name || 'N/A', [rooms]);
  const formatScheduleDate = (dateString) => { if (!dateString) return 'N/A'; return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}><GraduationCap className="mr-3 h-8 w-8 opacity-80"/>Manage Examinations</h1><p className={descriptionTextClasses}>Define exams, schedule subjects, and manage exam details.</p></div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isExamDialogOpen} onOpenChange={(open) => { setIsExamDialogOpen(open); if (!open) setExamFormError(''); }}><DialogTrigger asChild><Button className={outlineButtonClasses}><FilePlus2 className="mr-2 h-4 w-4" /> Add Exam</Button></DialogTrigger><DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"><DialogHeader><DialogTitle>{editingExam ? 'Edit Exam' : 'Add New Exam'}</DialogTitle><DialogDescription>{editingExam ? 'Update exam details.' : 'Create a new examination event.'}</DialogDescription></DialogHeader><form onSubmit={handleExamSubmit} className="space-y-6 py-1"><ExamFormFields formData={examFormData} onFormChange={handleExamFormChange} onSelectChange={handleExamSelectChange} academicYears={academicYears} isLoadingDeps={isLoadingDeps}/><DialogFooter className="pt-6"><DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose><Button type="submit" className={primaryButtonClasses} disabled={isSubmittingExam || isLoadingDeps}>{isSubmittingExam ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingExam ? 'Saving...' : 'Creating...'}</> : editingExam ? 'Save Changes' : 'Create Exam'}</Button></DialogFooter></form></DialogContent></Dialog>
          <Dialog open={isScheduleDialogOpen} onOpenChange={(open) => { setIsScheduleDialogOpen(open); if (!open) setScheduleFormError(''); }}><DialogTrigger asChild><Button className={primaryButtonClasses} disabled={!selectedExamId}><PlusCircle className="mr-2 h-4 w-4" /> Add Schedule</Button></DialogTrigger><DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"><DialogHeader><DialogTitle>{editingSchedule ? 'Edit Exam Schedule' : 'Add New Exam Schedule'}</DialogTitle><DialogDescription>{editingSchedule ? 'Update schedule details.' : 'Define a specific subject exam slot.'}</DialogDescription></DialogHeader><form onSubmit={handleScheduleSubmit} className="space-y-6 py-1"><ExamScheduleFormFields formData={examScheduleFormData} onFormChange={handleScheduleFormChange} onSelectChange={handleScheduleSelectChange} examsList={exams} subjectsList={subjects} classesList={classes} roomsList={rooms} isLoadingDeps={isLoadingDeps}/>{scheduleFormError && ( <p className="text-sm text-red-600 dark:text-red-400">{scheduleFormError}</p> )}<DialogFooter className="pt-6"><DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose><Button type="submit" className={primaryButtonClasses} disabled={isSubmittingSchedule || isLoadingDeps}>{isSubmittingSchedule ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingSchedule ? 'Saving...' : 'Creating...'}</> : 'Create Schedule'}</Button></DialogFooter></form></DialogContent></Dialog>
        </div>
      </div>
      
      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-white/60 dark:bg-zinc-900/60 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl">
          <CardHeader><CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5"/> Defined Exams</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? ( <div className="space-y-2">{Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> ) : 
            exams.length > 0 ? (
              <div className="space-y-2">
                {exams.map(exam => (
                  <Button key={exam.id} variant={selectedExamId === exam.id ? "secondary" : "ghost"} className="w-full justify-start text-left h-auto py-2" onClick={() => setSelectedExamId(exam.id)}>
                    <div>
                      <p className="font-semibold">{exam.name}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{exam.term?.academicYear?.name} - {exam.term?.name}</p>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (<p className={descriptionTextClasses}>No exams found. Click "Add Exam" to create one.</p>)}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white/60 dark:bg-zinc-900/60 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5"/> Exam Schedules for "{exams.find(e => e.id === selectedExamId)?.name || '...'}"</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Class</TableHead><TableHead>Date & Time</TableHead><TableHead>Marks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? ( Array.from({ length: 3 }).map((_, index) => ( <TableRow key={`s-skel-${index}`}><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-32" /></TableCell><TableCell><Skeleton className="h-5 w-10" /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8" /></div></TableCell></TableRow> ))
                ) : filteredSchedules.length > 0 ? filteredSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{getSubjectName(schedule.subjectId)}</TableCell>
                    <TableCell>{getClassName(schedule.classId)}</TableCell>
                    <TableCell>{formatScheduleDate(schedule.date)} <span className="text-zinc-500 text-xs">({schedule.startTime} - {schedule.endTime})</span></TableCell>
                    <TableCell>{schedule.maxMarks}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditScheduleDialog(schedule)} title="Edit Schedule"><Edit3 className="h-4 w-4" /></Button>
                        <Link href={`/${subdomain}/academics/examinations/schedules/${schedule.id}/grades`} passHref>
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Enter Grades"><span className="cursor-pointer flex items-center justify-center"><CheckSquare className="h-4 w-4" /></span></Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDeleteSchedule(schedule.id)} title="Delete Schedule"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : ( <TableRow><TableCell colSpan="5" className="text-center py-10 text-zinc-500">No schedules found for this exam. Click "Add Schedule" to create one.</TableCell></TableRow> )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StudentExamsPlaceholder() {
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  return (
    <RequireRole role="STUDENT">
      <div className="space-y-4">
        <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
          <GraduationCap className="mr-3 h-8 w-8 opacity-80"/>My Exams
        </h1>
        <div className="p-6 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-700/50">
          <p className={descriptionTextClasses}>
            Your exams schedule and results page is coming soon. For now, please check your grades and assignments.
          </p>
        </div>
      </div>
    </RequireRole>
  );
}

export default function ExaminationsPage() {
  const { data: session, status } = useSession();
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (session?.user?.role === 'STUDENT') {
    return <StudentExamsPlaceholder/>;
  }
  return <AdminExaminationsPage/>;
}
