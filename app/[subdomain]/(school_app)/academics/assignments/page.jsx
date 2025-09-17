// app/[subdomain]/(school_app)/academics/assignments/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FilePlus2, Edit3, Trash2, CalendarDays, Loader2, AlertTriangle, BookOpen, Layers, Users, GraduationCap, CheckSquare, Paperclip, XCircle } from 'lucide-react'; // Added Paperclip, XCircle

const initialAssignmentFormData = {
  id: null,
  title: '',
  description: '',
  dueDate: '',
  subjectId: '',
  sectionId: '',
  classId: '',
  teacherId: '',
  maxMarks: '',
  attachments: [], // Array of URLs or file identifiers
};

// Reusable FormFields Component for Assignment
// Added `onFileChange` and `onRemoveAttachment` props
const AssignmentFormFields = ({ formData, onFormChange, onSelectChange, onFileChange, onRemoveAttachment, sectionsList, subjectsList, teachersList, isLoadingDeps, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";

  const classesList = Array.from(new Set(sectionsList.map(s => JSON.stringify({ id: s.class.id, name: s.class.name }))))
                          .map(str => JSON.parse(str));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor="title" className={labelTextClasses}>Assignment Title <span className="text-red-500">*</span></Label>
        <Input id="title" name="title" value={formData.title || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="subjectId" className={labelTextClasses}>Subject <span className="text-red-500">*</span></Label>
        <Select name="subjectId" value={formData.subjectId || ''} onValueChange={(value) => onSelectChange('subjectId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select subject" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isLoadingDeps && subjectsList?.length === 0 && <SelectItem value="no-subjects" disabled>No subjects available</SelectItem>}
            {subjectsList?.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="dueDate" className={labelTextClasses}>Due Date <span className="text-red-500">*</span></Label>
        <Input id="dueDate" name="dueDate" type="date" value={formData.dueDate || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="classId" className={labelTextClasses}>Target Class (Optional)</Label>
        <Select name="classId" value={formData.classId || ''} onValueChange={(value) => onSelectChange('classId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select class" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">All Classes</SelectItem>
            {!isLoadingDeps && classesList?.length === 0 && <SelectItem value="no-classes" disabled>No classes available</SelectItem>}
            {classesList?.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="sectionId" className={labelTextClasses}>Target Section (Optional)</Label>
        <Select name="sectionId" value={formData.sectionId || ''} onValueChange={(value) => onSelectChange('sectionId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select section" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">All Sections</SelectItem>
            {!isLoadingDeps && sectionsList?.length === 0 && <SelectItem value="no-sections" disabled>No sections available</SelectItem>}
            {sectionsList
              .filter(s => !formData.classId || s.classId === formData.classId)
              .map(section => <SelectItem key={section.id} value={section.id}>{`${section.class.name} - ${section.name}`}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="maxMarks" className={labelTextClasses}>Maximum Marks (Optional)</Label>
        <Input id="maxMarks" name="maxMarks" type="number" step="0.1" min="0" value={formData.maxMarks || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., 100" />
      </div>
      {teachersList && formData.teacherId && (
        <div>
          <Label htmlFor="teacherName" className={labelTextClasses}>Assigned Teacher</Label>
          <Input
            id="teacherName"
            value={teachersList.find(t => t.id === formData.teacherId)?.user?.firstName + ' ' + teachersList.find(t => t.id === formData.teacherId)?.user?.lastName || 'Loading...'}
            disabled
            className={`${inputTextClasses} mt-1`}
          />
        </div>
      )}
      <div className="sm:col-span-2">
        <Label htmlFor="description" className={labelTextClasses}>Description (Optional)</Label>
        <Textarea id="description" name="description" value={formData.description || ''} onChange={onFormChange} rows={3} className={`${inputTextClasses} mt-1`} />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="file-attachments" className={labelTextClasses}>Attachments (Optional)</Label>
        <Input id="file-attachments" type="file" multiple onChange={onFileChange} className={`${inputTextClasses} mt-1`} />
        {formData.attachments && formData.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Attachments:</p>
            {formData.attachments.map((fileUrl, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline dark:text-sky-400 flex items-center text-sm truncate">
                  <Paperclip className="h-4 w-4 mr-2 shrink-0" />
                  {fileUrl.substring(fileUrl.lastIndexOf('/') + 1)} {/* Display just the file name */}
                </a>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" onClick={() => onRemoveAttachment(index)} title="Remove attachment">
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <p className={`text-xs mt-1 ${descriptionTextClasses}`}>Upload files. Each file will be stored and linked here.</p>
      </div>
    </div>
  );
};


export default function ManageAssignmentsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [taughtSubjects, setTaughtSubjects] = useState([]); // Teacher-specific subjects
  const [classTeacherSections, setClassTeacherSections] = useState([]); // Sections where teacher is class teacher
  const [activeSubjectFilter, setActiveSubjectFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true);
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...initialAssignmentFormData });
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // New state for files to upload

  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchAssignments = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      // If the logged-in user is a teacher, we fetch only their assignments by default
      const mine = session?.user?.role === 'TEACHER' ? '1' : '0';
      const subjectParam = activeSubjectFilter ? `&subjectId=${encodeURIComponent(activeSubjectFilter)}` : '';
      const response = await fetch(`/api/schools/${schoolData.id}/academics/assignments?mine=${mine}${subjectParam}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch assignments.'); }
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (err) { toast.error("Error fetching assignments", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id, session?.user?.role, activeSubjectFilter]);

  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    try {
      const mine = session?.user?.role === 'TEACHER' ? '1' : '0';
      // Always fetch subjects/sections; fetch teachers differently based on role to avoid 401s for teachers
      const [subjectsRes, sectionsRes] = await Promise.all([
        fetch(`/api/schools/${schoolData.id}/academics/subjects?mine=${mine}`),
        fetch(`/api/schools/${schoolData.id}/academics/sections`),
      ]);

      if (!subjectsRes.ok) throw new Error('Failed to fetch subjects.');
      const subjectsData = await subjectsRes.json();
      setSubjects(subjectsData.subjects || []);

      if (!sectionsRes.ok) {
        const errData = await sectionsRes.json().catch(() => ({}));
        console.error("Sections fetch error:", errData);
        throw new Error(errData.error || 'Failed to fetch sections.');
      }
      const sectionsData = await sectionsRes.json();
      setSections(sectionsData.sections || []);

      // Populate teachers list based on role:
      // - For SCHOOL_ADMIN: fetch full teachers list
      // - For TEACHER: use current staff profile for display and form prefill
      if (session?.user?.role === 'SCHOOL_ADMIN') {
        const teachersRes = await fetch(`/api/schools/${schoolData.id}/staff/teachers`);
        if (!teachersRes.ok) throw new Error('Failed to fetch teachers.');
        const teachersData = await teachersRes.json();
        setTeachers(teachersData.teachers?.filter(t => t.user) || []);
      } else if (session?.user?.role === 'TEACHER') {
        try {
          const meRes = await fetch(`/api/schools/${schoolData.id}/staff/me`);
          if (meRes.ok) {
            const meData = await meRes.json();
            // Shape matches Staff include user from teachers endpoint
            setTeachers(meData.staff ? [meData.staff] : []);
          } else {
            setTeachers([]);
          }
        } catch {
          setTeachers([]);
        }
      } else {
        setTeachers([]);
      }

    } catch (err) {
      toast.error("Error fetching form dependencies", { description: err.message });
      console.error("Dependency fetch error:", err);
    } finally {
      setIsLoadingDeps(false);
    }
  }, [schoolData?.id, session?.user?.role]);

  // Fetch teacher profile context (taught subjects and class teacher sections)
  const fetchTeacherContext = useCallback(async () => {
    if (!schoolData?.id || session?.user?.role !== 'TEACHER') return;
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/staff/me`);
      if (!res.ok) return; // Non-fatal
      const data = await res.json();
      setTaughtSubjects(data.taughtSubjects || []);
      setClassTeacherSections(data.classTeacherSections || []);
    } catch (e) {
      console.warn('Failed to load teacher context', e);
    }
  }, [schoolData?.id, session?.user?.role]);

  useEffect(() => {
    if (schoolData?.id && session) {
      fetchAssignments();
      fetchDropdownDependencies();
      fetchTeacherContext();
    }
  }, [schoolData, session, fetchAssignments, fetchDropdownDependencies, fetchTeacherContext]);

  const onClickSubjectChip = (subjectId) => {
    setActiveSubjectFilter(prev => (prev === subjectId ? '' : subjectId));
  };

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));

  // New handler for file input change
  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  // New handler to remove an already attached file (by URL)
  const handleRemoveAttachment = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, index) => index !== indexToRemove)
    }));
  };

  const openAddDialog = () => {
    setEditingAssignment(null);
    setFormData({
      ...initialAssignmentFormData,
      teacherId: session?.user?.staffProfileId || '', // Pre-fill teacher if available from session
    });
    setSelectedFiles([]); // Clear selected files
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      id: assignment.id,
      title: assignment.title || '',
      description: assignment.description || '',
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
      subjectId: assignment.subjectId || '',
      sectionId: assignment.sectionId || '',
      classId: assignment.classId || '',
      teacherId: assignment.teacherId || '',
      maxMarks: assignment.maxMarks?.toString() || '',
      attachments: assignment.attachments || [], // Existing attachments
    });
    setSelectedFiles([]); // Clear selected files for edit; new uploads are handled separately
    setFormError('');
    setIsDialogOpen(true);
  };

  // New function to handle file uploads to a separate API endpoint
  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      return []; // No files to upload
    }

    const uploadToastId = toast.loading("Uploading files...", { description: "Please wait, this may take a moment." });
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`/api/upload-files`, { // Dedicated upload endpoint
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error("File Upload Failed", { description: result.error || "An error occurred during file upload.", id: uploadToastId });
        throw new Error(result.error || "File upload failed.");
      }
      toast.success("Files uploaded successfully!", { id: uploadToastId });
      return result.fileUrls || []; // Expecting an array of URLs
    } catch (uploadError) {
      console.error('Upload Error:', uploadError);
      // The toast is already shown by the catch block, no need to show again
      throw uploadError; // Re-throw to stop the assignment submission
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true); setFormError('');

    try {
      // 1. Upload new files if any are selected
      let uploadedFileUrls = [];
      if (selectedFiles.length > 0) {
        uploadedFileUrls = await uploadFiles();
      }

      const isEditing = !!editingAssignment;

      // Combine existing attachments with newly uploaded ones
      const finalAttachments = [
        ...(formData.attachments || []), // Existing attachments
        ...uploadedFileUrls // Newly uploaded attachments
      ];

      const payload = {
        title: formData.title,
        description: formData.description || null,
        dueDate: new Date(formData.dueDate).toISOString(),
        subjectId: formData.subjectId,
        sectionId: formData.sectionId || null,
        classId: formData.classId || null,
        teacherId: formData.teacherId,
        maxMarks: formData.maxMarks ? parseFloat(formData.maxMarks) : null,
        attachments: finalAttachments.length > 0 ? finalAttachments : null, // Send null if no attachments
        schoolId: schoolData.id,
      };

      const url = isEditing
        ? `/api/schools/${schoolData.id}/academics/assignments/${editingAssignment.id}`
        : `/api/schools/${schoolData.id}/academics/assignments`;
      const method = isEditing ? 'PUT' : 'POST';
      const actionText = isEditing ? 'update' : 'create';

      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} assignment.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setFormError(err);
      } else {
        toast.success(`Assignment "${result.assignment?.title}" ${actionText}d successfully!`);
        setIsDialogOpen(false);
        setSelectedFiles([]); // Clear selected files after successful submission
        fetchAssignments();
      }
    } catch (submissionError) {
      // This catch block handles errors from uploadFiles or the assignment submission itself
      console.error('Submission Error:', submissionError);
      if (!formError) { // Only set generic error if a specific error wasn't already set by uploadFiles
          setFormError('An unexpected error occurred during submission.');
          toast.error('Submission Failed', { description: 'An unexpected error occurred.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (assignmentId, assignmentTitle) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE assignment "${assignmentTitle}"? This action cannot be undone.`)) return;
    const toastId = `delete-assignment-${assignmentId}`;
    toast.loading("Deleting assignment...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/assignments/${assignmentId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Assignment "${assignmentTitle}" deleted.`, { id: toastId });
      fetchAssignments();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // Helper functions for displaying names
  const getSubjectName = useCallback((id) => {
    const subject = subjects.find(s => s.id === id);
    return subject ? subject.name : 'N/A';
  }, [subjects]);

  const getSectionClassDisplayName = useCallback((sectionId, classId) => {
    if (sectionId) {
      const section = sections.find(s => s.id === sectionId);
      return section ? `${section.class?.name || 'N/A'} - ${section.name}` : 'N/A';
    }
    if (classId) {
      const classObj = sections.find(s => s.classId === classId)?.class;
      return classObj ? classObj.name : 'N/A (All Sections)';
    }
    return 'All Classes & Sections';
  }, [sections]);

  const getTeacherName = useCallback((id) => {
    const teacher = teachers.find(t => t.id === id);
    return teacher ? `${teacher.user?.firstName || ''} ${teacher.user?.lastName || ''}`.trim() : 'N/A';
  }, [teachers]);

  const formatDueDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <CheckSquare className="mr-3 h-8 w-8 opacity-80"/>Manage Assignments
          </h1>
          <p className={descriptionTextClasses}>Create, view, and manage academic assignments for students.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(''); }}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}> <FilePlus2 className="mr-2 h-4 w-4" /> Add New Assignment </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingAssignment ? 'Update the details for this assignment.' : 'Fill in the details for a new assignment.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
              <AssignmentFormFields
                formData={formData}
                onFormChange={handleFormChange}
                onSelectChange={handleSelectChange}
                onFileChange={handleFileChange} 
                onRemoveAttachment={handleRemoveAttachment} 
                sectionsList={sections}
                subjectsList={subjects}
                teachersList={teachers}
                isLoadingDeps={isLoadingDeps}
                isEdit={!!editingAssignment}
              />
              {formError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingDeps}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingAssignment ? 'Saving...' : 'Creating...'}</> : editingAssignment ? 'Save Changes' : 'Create Assignment'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {session?.user?.role === 'TEACHER' && (
        <div className={`${glassCardClasses} space-y-4`}>
          <div>
            <p className={`text-sm font-semibold ${titleTextClasses} mb-2 flex items-center`}>
              <BookOpen className="h-4 w-4 mr-2"/> My Subjects
            </p>
            <div className="flex flex-wrap gap-2">
              {(subjects?.length ? subjects : taughtSubjects)?.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onClickSubjectChip(s.id)}
                  className={`px-3 py-1 rounded-full border text-sm transition-colors ${activeSubjectFilter === s.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white/60 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-white/80 dark:hover:bg-zinc-700/60'}`}
                  title="Filter assignments by this subject"
                >
                  {s.name}
                </button>
              ))}
              {((subjects || []).length === 0 && (taughtSubjects || []).length === 0) && (
                <span className={`text-sm ${descriptionTextClasses}`}>No subjects assigned.</span>
              )}
            </div>
          </div>
          <div>
            <p className={`text-sm font-semibold ${titleTextClasses} mb-2 flex items-center`}>
              <Users className="h-4 w-4 mr-2"/> Class Teacher Sections
            </p>
            <div className="flex flex-wrap gap-2">
              {classTeacherSections?.map(sec => (
                <span key={sec.id} className="px-3 py-1 rounded-full bg-white/60 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-200">
                  {sec.class?.name || 'Class'} - {sec.name}
                </span>
              ))}
              {(classTeacherSections || []).length === 0 && (
                <span className={`text-sm ${descriptionTextClasses}`}>Not a class teacher for any section.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Title</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Subject</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Due Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Target</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden lg:table-cell`}>Teacher</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28 rounded" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : assignments.length > 0 ? assignments.map((assignment) => (
              <TableRow key={assignment.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{assignment.title}</TableCell>
                <TableCell className={`${descriptionTextClasses}`}>
                  <button onClick={() => onClickSubjectChip(assignment.subjectId)} className="underline-offset-2 hover:underline">
                    {getSubjectName(assignment.subjectId)}
                  </button>
                </TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{formatDueDate(assignment.dueDate)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{getSectionClassDisplayName(assignment.sectionId, assignment.classId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden lg:table-cell`}>{getTeacherName(assignment.teacherId)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(assignment)} title="Edit Assignment"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(assignment.id, assignment.title)} title="Delete Assignment"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="6" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No assignments created yet. Click "Add New Assignment" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}