// app/[subdomain]/(school_app)/academics/subjects/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout'; // Adjust path if your layout export is different
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, Edit3, Trash2, BookOpen, AlertTriangle, UserCog, Loader2, Layers } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const initialFormData = {
  name: '',
  subjectCode: '',
  description: '',
  departmentId: '',
  teacherId: '',
  schoolLevelIds: [],
};

// Reusable FormFields Component
const SubjectFormFields = ({ formData, onFormChange, onSelectChange, onMultiSelectChange, departmentsList, teachersList, schoolLevelsList, isLoadingDeps, isEdit = false }) => {
  const titleTextClasses = "text-black dark:text-white";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";

  if (!formData) {
    return (
        <div className="p-4 flex justify-center items-center h-full min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
    );
  }

  const handleSchoolLevelCheckboxChange = (levelId, checked) => {
    const currentLevelIds = formData.schoolLevelIds || [];
    let newLevelIds;
    if (checked) {
      newLevelIds = [...currentLevelIds, levelId];
    } else {
      newLevelIds = currentLevelIds.filter(id => id !== levelId);
    }
    onMultiSelectChange('schoolLevelIds', newLevelIds);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor={isEdit ? "editSubjectName" : "subjectName"} className={labelTextClasses}>Subject Name <span className="text-red-500">*</span></Label>
        <Input id={isEdit ? "editSubjectName" : "subjectName"} name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor={isEdit ? "editSubjectCode" : "subjectCode"} className={labelTextClasses}>Subject Code (Optional)</Label>
        <Input id={isEdit ? "editSubjectCode" : "subjectCode"} name="subjectCode" value={formData.subjectCode || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor={isEdit ? "editDepartmentId" : "departmentId"} className={labelTextClasses}>Department (Optional)</Label>
        <Select name="departmentId" value={formData.departmentId || 'none'} onValueChange={(value) => onSelectChange('departmentId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select department" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none" className="text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">No Department</SelectItem>
            {departmentsList?.map(dept => <SelectItem key={dept.id} value={dept.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">{dept.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
       <div className="sm:col-span-2">
        <Label htmlFor={isEdit ? "editDescription" : "description"} className={labelTextClasses}>Description (Optional)</Label>
        <Textarea id={isEdit ? "editDescription" : "description"} name="description" value={formData.description || ''} onChange={onFormChange} rows={2} className={`${inputTextClasses} mt-1`} />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor={isEdit ? "editTeacherId" : "teacherId"} className={labelTextClasses}>Assign Initial Teacher <span className="text-red-500">*</span></Label>
        <Select name="teacherId" value={formData.teacherId || ''} onValueChange={(value) => onSelectChange('teacherId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select a teacher" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isLoadingDeps && teachersList?.length === 0 && <SelectItem value="no-teachers" disabled className="text-zinc-500 dark:text-zinc-400">No teachers available</SelectItem>}
            {isLoadingDeps && <SelectItem value="loading-teachers" disabled className="text-zinc-500 dark:text-zinc-400">Loading teachers...</SelectItem>}
            {teachersList?.map(teacher => (
              <SelectItem key={teacher.id} value={teacher.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
                {teacher.user?.firstName} {teacher.user?.lastName} ({teacher.jobTitle || 'Teacher'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="sm:col-span-2">
        <Label className={labelTextClasses}>Assign to School Levels <span className="text-red-500">*</span></Label>
        {isLoadingDeps ? (
            <Skeleton className="h-32 w-full mt-1 bg-zinc-300 dark:bg-zinc-700 rounded-md" />
        ) : schoolLevelsList?.length > 0 ? (
          <ScrollArea className="mt-1 h-32 w-full rounded-md border dark:border-zinc-700 p-3 bg-white/30 dark:bg-zinc-800/30">
            <div className="space-y-2">
            {schoolLevelsList.map(level => (
              <div key={level.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`level-${level.id}-${isEdit ? 'edit' : 'add'}`}
                  checked={(formData.schoolLevelIds || []).includes(level.id)}
                  onCheckedChange={(checked) => handleSchoolLevelCheckboxChange(level.id, Boolean(checked))}
                />
                <Label htmlFor={`level-${level.id}-${isEdit ? 'edit' : 'add'}`} className={`text-sm font-normal ${descriptionTextClasses} cursor-pointer`}>{level.name}</Label>
              </div>
            ))}
            </div>
          </ScrollArea>
        ) : (
          <p className={`text-sm mt-1 ${descriptionTextClasses}`}>No school levels found. Please add school levels first in Academic Setup.</p>
        )}
      </div>
    </div>
  );
};


export default function ManageSubjectsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true);
  const [error, setError] = useState('');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({...initialFormData});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [editingSubject, setEditingSubject] = useState(null);
  // ✨ Declare isEditDialogOpen and its setter ✨
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); 

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchSubjects = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/subjects`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch subjects.'); }
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (err) { toast.error("Error fetching subjects", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    try {
      const [deptRes, teacherRes, levelRes] = await Promise.all([
        fetch(`/api/schools/${schoolData.id}/departments`),
        fetch(`/api/schools/${schoolData.id}/staff/teachers`),
        fetch(`/api/schools/${schoolData.id}/academics/school-levels`)
      ]);
      if (!deptRes.ok) { const d = await deptRes.json().catch(() => ({})); throw new Error(d.error || 'Failed to fetch departments.');}
      const deptData = await deptRes.json(); setDepartments(deptData.departments || []);
      if (!teacherRes.ok) { const d = await teacherRes.json().catch(() => ({})); throw new Error(d.error || 'Failed to fetch teachers.');}
      const teacherData = await teacherRes.json(); setTeachers(teacherData.teachers || []);
      if (!levelRes.ok) { const d = await levelRes.json().catch(() => ({})); throw new Error(d.error || 'Failed to fetch school levels.');}
      const levelData = await levelRes.json(); setSchoolLevels(levelData.schoolLevels || []);
    } catch (err) { toast.error("Error fetching form dependencies", { description: err.message });
    } finally { setIsLoadingDeps(false); }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) { fetchSubjects(); fetchDropdownDependencies(); }
  }, [schoolData, session, fetchSubjects, fetchDropdownDependencies]);

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));
  const handleMultiSelectChange = (name, newArrayValue) => setFormData(prev => ({ ...prev, [name]: newArrayValue }));

  const openAddDialog = () => { 
    setEditingSubject(null);
    setFormData({...initialFormData}); 
    setFormError(''); 
    setIsAddDialogOpen(true); 
  };

  const openEditDialog = (subject) => {
    setEditingSubject(subject);
    setFormData({
        name: subject.name || '',
        subjectCode: subject.subjectCode || '',
        description: subject.description || '',
        departmentId: subject.departmentId || '',
        teacherId: subject.staffSubjectLevels?.[0]?.staff?.id || '', 
        schoolLevelIds: subject.schoolLevelLinks?.map(link => link.schoolLevel.id) || [],
    });
    setFormError('');
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;

    const isEditing = !!editingSubject;
    setIsSubmitting(true); 
    setFormError('');

    if (!formData.teacherId) { toast.error("Validation Error", { description: "A teacher must be selected." }); setFormError("A teacher must be selected."); setIsSubmitting(false); return; }
    if (!formData.schoolLevelIds || formData.schoolLevelIds.length === 0) { toast.error("Validation Error", { description: "At least one school level must be selected." }); setFormError("At least one school level must be selected."); setIsSubmitting(false); return; }
    
    const dataToSubmit = { 
        ...formData, 
        departmentId: formData.departmentId || null, 
        subjectCode: formData.subjectCode || null 
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/academics/subjects/${editingSubject.id}`
      : `/api/schools/${schoolData.id}/academics/subjects`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSubmit),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} subject.`;
        if(result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setFormError(err);
      } else {
        toast.success(`Subject "${result.subject?.name}" ${actionText}d successfully!`);
        if (isEditing) setIsEditDialogOpen(false); else setIsAddDialogOpen(false);
        fetchSubjects();
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setFormError('An unexpected error occurred.');
    } finally { setIsSubmitting(false); }
  };
  
  const handleDelete = async (subjectId, subjectName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE subject "${subjectName}"? This may affect related records.`)) return;
    const toastId = `delete-subject-${subjectId}`;
    toast.loading("Deleting subject...", { id: toastId });
    try {
        // TODO: Replace with actual API call for DELETE
        // const response = await fetch(`/api/schools/${schoolData.id}/academics/subjects/${subjectId}`, { method: 'DELETE' });
        // const result = await response.json();
        // if (!response.ok) throw new Error(result.error || "Deletion failed.");
        // toast.success(result.message || `Subject "${subjectName}" deleted.`, { id: toastId }); 
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        toast.success(`Subject "${subjectName}" deletion simulated.`, { id: toastId });
        fetchSubjects();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <BookOpen className="mr-3 h-8 w-8 opacity-80"/>Manage Subjects
          </h1>
          <p className={descriptionTextClasses}>Define subjects, assign them to school levels, and link an initial teacher.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}> <FilePlus2 className="mr-2 h-4 w-4" /> Add New Subject </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader> <DialogTitle className={titleTextClasses}>Add New Subject</DialogTitle> <DialogDescription className={descriptionTextClasses}>Enter details and assign to levels & a teacher.</DialogDescription> </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
              <SubjectFormFields 
                formData={formData} 
                onFormChange={handleFormChange} 
                onSelectChange={handleSelectChange} 
                onMultiSelectChange={handleMultiSelectChange}
                departmentsList={departments} 
                teachersList={teachers} 
                schoolLevelsList={schoolLevels}
                isLoadingDeps={isLoadingDeps} 
                isEdit={false}
              />
              {formError && isAddDialogOpen && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => setIsAddDialogOpen(false)}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingDeps}> {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating...</> : 'Create Subject'} </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isAddDialogOpen && !isEditDialogOpen && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Subject Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Code</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Department</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden lg:table-cell`}>School Levels</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden xl:table-cell`}>Teacher(s) @ Level</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : subjects.length > 0 ? subjects.map((subject) => (
              <TableRow key={subject.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{subject.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{subject.subjectCode || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{subject.department?.name || <span className="italic text-zinc-500">N/A</span>}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden lg:table-cell text-xs`}>
                  {subject.schoolLevelLinks?.map(link => link.schoolLevel.name).join(', ') || <span className="italic text-zinc-500">N/A</span>}
                </TableCell>
                <TableCell className={`${descriptionTextClasses} hidden xl:table-cell text-xs`}>
                  {subject.staffSubjectLevels?.map(link => `${link.staff.user.firstName} ${link.staff.user.lastName} (${link.schoolLevel.name})`).join('; ') || <span className="italic text-zinc-500">N/A</span>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(subject)} title="Edit Subject"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(subject.id, subject.name)} title="Delete Subject"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="6" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No subjects defined yet. Ensure Departments, Teachers, and School Levels are set up first.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Edit Subject Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>Edit Subject: {editingSubject?.name || 'Subject'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                Update subject details.
              </DialogDescription>
            </DialogHeader>
            {/* Conditional rendering for edit form loading state */}
            {isSubmitting && editingSubject && !formData.name ? ( 
                <div className="py-10 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6 py-1">
                    <SubjectFormFields 
                        formData={formData} 
                        onFormChange={handleFormChange} 
                        onSelectChange={handleSelectChange} 
                        onMultiSelectChange={handleMultiSelectChange}
                        departmentsList={departments} 
                        teachersList={teachers} 
                        schoolLevelsList={schoolLevels}
                        isLoadingDeps={isLoadingDeps}
                        isEdit={true}
                    />
                    {formError && isEditDialogOpen && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
                    <DialogFooter className="pt-6">
                        <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => setIsEditDialogOpen(false)}>Cancel</Button></DialogClose>
                        <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingDeps}> 
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Changes'} 
                        </Button>
                    </DialogFooter>
                </form>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}