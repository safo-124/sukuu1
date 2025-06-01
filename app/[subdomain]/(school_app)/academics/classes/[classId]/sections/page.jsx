// app/[subdomain]/(school_app)/academics/classes/[classId]/sections/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../../../layout'; // Adjust path to your main school layout
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, Edit3, Trash2, Users as UsersIcon, ChevronLeft, AlertTriangle, UserCheck as ClassTeacherIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const initialSectionFormData = {
  name: '',
  classTeacherId: '', 
  maxCapacity: '',    
};

const PageContentSkeleton = ({ glassCardClasses }) => (
  <div className="space-y-8">
    <Skeleton className="h-8 w-48 bg-zinc-200 dark:bg-zinc-700 rounded-md" /> 
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <Skeleton className="h-9 w-72 bg-zinc-200 dark:bg-zinc-700 rounded-md" />
        <Skeleton className="h-5 w-96 mt-2 bg-zinc-200 dark:bg-zinc-700 rounded-md" />
      </div>
      <Skeleton className="h-10 w-40 bg-zinc-200 dark:bg-zinc-700 rounded-md" />
    </div>
    <div className={`${glassCardClasses} overflow-x-auto`}>
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
            <TableHead><Skeleton className="h-5 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableHead>
            <TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableHead>
            <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableHead>
            <TableHead><Skeleton className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableHead>
            <TableHead className="text-right"><Skeleton className="h-5 w-20 bg-zinc-200 dark:bg-zinc-700 rounded ml-auto" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 2 }).map((_, index) => (
            <TableRow key={`section-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
              <TableCell><Skeleton className="h-5 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableCell>
              <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableCell>
              <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableCell>
              <TableCell><Skeleton className="h-5 w-10 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  <Skeleton className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
);


export default function ManageClassSectionsPage() {
  const schoolData = useSchool();
  const { data: session, status: sessionStatus } = useSession();
  const params = useParams();
  const router = useRouter();

  const classId = params.classId; // Get classId from route params
  const schoolIdFromContext = schoolData?.id; // Memoize for dependency arrays

  const [parentClass, setParentClass] = useState(null);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [isLoadingPageData, setIsLoadingPageData] = useState(true); // Combined initial loading
  const [isRefetchingSections, setIsRefetchingSections] = useState(false); // For specific section list refresh
  
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialSectionFormData);
  const [editingSection, setEditingSection] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchPageInitialData = useCallback(async () => {
    if (!schoolIdFromContext || !classId || !session) {
      // If critical IDs are missing after session is resolved, stop loading.
      // Layout should handle auth/redirect.
      if(sessionStatus !== 'loading') setIsLoadingPageData(false);
      return;
    }

    setIsLoadingPageData(true);
    setPageError('');
    try {
      const [parentClassRes, sectionsRes, teachersRes] = await Promise.all([
        fetch(`/api/schools/${schoolIdFromContext}/academics/classes/${classId}`), // API for single class
        fetch(`/api/schools/${schoolIdFromContext}/academics/classes/${classId}/sections`),
        fetch(`/api/schools/${schoolIdFromContext}/staff?jobTitle=Teacher`) // API for teachers
      ]);

      if (!parentClassRes.ok) {
        const errData = await parentClassRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch parent class details.');
      }
      const parentClassData = await parentClassRes.json();
      setParentClass(parentClassData.class || { id: classId, name: `Class (ID: ${classId.substring(0,6)}...)` });

      if (!sectionsRes.ok) {
        const errData = await sectionsRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch sections.');
      }
      const sectionsData = await sectionsRes.json();
      setSections(sectionsData.sections || []);

      if (!teachersRes.ok) {
        const errData = await teachersRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch teachers list.');
      }
      const teachersData = await teachersRes.json();
      setTeachers(teachersData.staffMembers || []);

    } catch (err) {
      toast.error("Error loading page data", { description: err.message });
      setPageError(err.message);
    } finally {
      setIsLoadingPageData(false);
    }
  }, [schoolIdFromContext, classId, session, sessionStatus]); // Add sessionStatus

  useEffect(() => {
    if (schoolIdFromContext && classId && session) {
      fetchPageInitialData();
    }
  }, [schoolIdFromContext, classId, session, fetchPageInitialData]);


  const refreshSections = useCallback(async () => {
    if (!schoolIdFromContext || !classId) return;
    setIsRefetchingSections(true); // Use a different loading state for refresh
    try {
      const response = await fetch(`/api/schools/${schoolIdFromContext}/academics/classes/${classId}/sections`);
      if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to refresh sections.');
      }
      const data = await response.json();
      setSections(data.sections || []);
    } catch (err) {
      toast.error("Error refreshing sections", { description: err.message });
    } finally {
      setIsRefetchingSections(false);
    }
  }, [schoolIdFromContext, classId]);

  const handleFormChange = (e) => { /* ... same as ManageClassesPage ... */ const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: name === 'maxCapacity' ? (value === '' ? '' : Number(value)) : value })); };
  const handleSelectChange = (name, value) => { /* ... same as ManageClassesPage ... */ setFormData(prev => ({ ...prev, [name]: value === 'null' ? null : value })); };

  const openAddDialog = () => { /* ... same as ManageClassesPage ... */ setEditingSection(null); setFormData(initialSectionFormData); setFormError(''); setIsDialogOpen(true);};
  const openEditDialog = (section) => { /* ... same as ManageClassesPage ... */ setEditingSection(section); setFormData({ name: section.name || '', classTeacherId: section.classTeacher?.id || '', maxCapacity: section.maxCapacity || '', }); setFormError(''); setIsDialogOpen(true); };

  const handleSubmit = async (e) => { /* ... similar to ManageClassesPage, adjust URLs and success messages ... */
    e.preventDefault();
    if (!schoolIdFromContext || !classId) { setFormError("School or Class data is not available."); return; }
    setIsSubmitting(true); setFormError('');

    const url = editingSection
      ? `/api/schools/${schoolIdFromContext}/academics/sections/${editingSection.id}`
      : `/api/schools/${schoolIdFromContext}/academics/classes/${classId}/sections`;
    const method = editingSection ? 'PATCH' : 'POST';
    const actionVerb = editingSection ? 'updated' : 'created';
    const actionInProgress = editingSection ? (editingSection.name ? `Updating "${editingSection.name}"` : `Updating Section`) : 'Creating Section';

    const payload = { ...formData };
    if (payload.classTeacherId === '' || payload.classTeacherId === 'null') payload.classTeacherId = null;
    if (payload.maxCapacity === '' || isNaN(Number(payload.maxCapacity))) payload.maxCapacity = null;
    else payload.maxCapacity = Number(payload.maxCapacity);
    
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || `Failed to ${actionVerb.replace('ed', '')} section.`;
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Field'}: ${issue.message}`).join('; ');
        throw new Error(errorMessage);
      }
      toast.success(`Section "${result.section?.name}" ${actionVerb} successfully!`);
      setIsDialogOpen(false);
      refreshSections();
    } catch (err) {
      toast.error(`${actionInProgress.replace('ing','e')} Failed`, { description: err.message });
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sectionId, sectionName) => { /* ... similar to ManageClassesPage, adjust URL ... */
    if (!schoolIdFromContext) return;
    if (!window.confirm(`Are you sure you want to delete section "${sectionName}"? This might affect student enrollments.`)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/schools/${schoolIdFromContext}/academics/sections/${sectionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const result = await response.json().catch(()=> ({ error: `Server error: ${response.status}`}));
        throw new Error(result.error || `Failed to delete ${sectionName}`);
      }
      toast.success(`Section "${sectionName}" deleted successfully!`);
      refreshSections();
    } catch (err) {
      toast.error(`Failed to delete ${sectionName}`, { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const FormFields = ({ currentFormData, onFormChange, onSelectChange, teachersList, isLoadingDeps }) => (
    <>
      <div>
        <Label htmlFor="name" className={labelTextClasses}>Section Name <span className="text-red-500">*</span></Label>
        <Input id="name" name="name" value={currentFormData.name} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., Section A, Blue Group"/>
      </div>
      <div>
        <Label htmlFor="classTeacherId" className={labelTextClasses}>Class Teacher</Label>
        <Select name="classTeacherId" value={currentFormData.classTeacherId || ''} onValueChange={(value) => onSelectChange('classTeacherId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select Class Teacher (Optional)" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700">
            <SelectItem value="null">None (Unassign)</SelectItem>
            {isLoadingDeps && <SelectItem value="loading_teachers" disabled>Loading teachers...</SelectItem>}
            {!isLoadingDeps && teachersList.length === 0 && <SelectItem value="no_teachers" disabled>No teachers found.</SelectItem>}
            {teachersList.map(teacher => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.user?.firstName || ''} {teacher.user?.lastName || ''} ({teacher.user?.email || 'N/A'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="maxCapacity" className={labelTextClasses}>Max Capacity</Label>
        <Input id="maxCapacity" name="maxCapacity" type="number" min="0" value={currentFormData.maxCapacity} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., 30 (Optional)"/>
      </div>
    </>
  );

  // Guard for essential data before rendering the page content
  if (sessionStatus === 'loading' || !schoolData?.subdomain || !classId || isLoadingPageData) {
    return <PageContentSkeleton glassCardClasses={glassCardClasses} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="sm" onClick={() => router.push(`/${schoolData.subdomain}/academics/classes`)} className={`${outlineButtonClasses} mr-4`}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Classes
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <UsersIcon className="mr-3 h-8 w-8 opacity-80"/>
            Manage Sections: {parentClass?.name || `Class ID ${classId.substring(0,6)}...`}
          </h1>
          <p className={descriptionTextClasses}>Create and manage sections for class "{parentClass?.name || 'selected class'}" in {schoolData.name || 'your school'}.</p>
        </div>
        <Dialog 
            open={isDialogOpen} 
            onOpenChange={(isOpen) => {
                setIsDialogOpen(isOpen);
                if (!isOpen) {
                    setEditingSection(null);
                    setFormData(initialSectionFormData);
                    setFormError('');
                }
            }}
        >
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}>
              <FilePlus2 className="mr-2 h-4 w-4" /> Add New Section
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingSection ? 'Edit Section' : 'Add New Section'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingSection ? `Update details for section: ${editingSection.name}.` : 'Enter details for the new section.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4 grid grid-cols-1 gap-4">
              <FormFields 
                currentFormData={formData} 
                onFormChange={handleFormChange} 
                onSelectChange={handleSelectChange} 
                teachersList={teachers}
                isLoadingDeps={isLoadingFormDataDeps && !teachers.length} // Only disable if actively loading and no data yet
              />
              {formError && ( 
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50 md:col-span-full">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Form Error</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter className="md:col-span-full pt-4">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || (isLoadingFormDataDeps && !teachers.length)}>
                  {isSubmitting ? (editingSection ? 'Saving...' : 'Creating...') : (editingSection ? 'Save Changes' : 'Create Section')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {pageError && ( 
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> 
          <AlertTriangle className="h-4 w-4" /> 
          <AlertTitle>Page Error</AlertTitle> 
          <AlertDescription>{pageError}</AlertDescription> 
        </Alert> 
      )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Section Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Class Teacher</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Max Capacity</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Students Enrolled</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isRefetchingSections || isLoadingPageData ? ( // Show skeleton if initial load or refetching sections
              Array.from({ length: 2 }).map((_, index) => (
                <TableRow key={`section-row-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10 bg-zinc-200 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : sections.length > 0 ? sections.map((section) => (
              <TableRow key={section.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{section.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>
                  {section.classTeacher ? `${section.classTeacher.user?.firstName || ''} ${section.classTeacher.user?.lastName || ''}`.trim() || 'N/A' : 'Not Assigned'}
                </TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{section.maxCapacity || 'N/A'}</TableCell>
                <TableCell className={descriptionTextClasses}>
                  {section._count?.studentEnrollments || 0}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(section)} title="Edit Section"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(section.id, section.name)} title="Delete Section"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  {pageError ? `Failed to load sections: ${pageError}` : "No sections defined for this class yet. Add a new section to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}