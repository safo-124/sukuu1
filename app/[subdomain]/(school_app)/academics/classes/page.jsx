// app/[subdomain]/(school_app)/academics/classes/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout'; // Adjust path
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

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
import { ScrollArea } from '@/components/ui/scroll-area';

// Lucide React Icons
import { 
    FilePlus2, Edit3, Trash2, Building as BuildingIcon, Users, AlertTriangle, 
    Search, Loader2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, PlusCircle, XCircle
} from 'lucide-react';

const initialAddFormData = { 
  name: '', 
  schoolLevelId: '', 
  academicYearId: '',
  sections: [{ name: '' }]
};
const initialEditFormData = { 
  id: '', 
  name: '', 
  schoolLevelId: '', 
  academicYearId: '',
};

// Reusable FormFields Component for Add/Edit Class
// ✨ Added outlineButtonClasses as a prop ✨
const ClassFormFields = ({ formData, onFormChange, onSelectChange, onSectionChange, addSectionField, removeSectionField, schoolLevelsList, academicYearsList, isLoadingDeps, isEdit = false, outlineButtonClasses }) => {
  const titleTextClasses = "text-black dark:text-white";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";

  if (!formData) return <div className="p-4 flex justify-center items-center h-full min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor={isEdit ? "editClassName" : "className"} className={labelTextClasses}>Class Name <span className="text-red-500">*</span></Label>
        <Input id={isEdit ? "editClassName" : "className"} name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., Grade 10, Form 3"/>
      </div>
      <div>
        <Label htmlFor={isEdit ? "editAcademicYearId" : "academicYearId"} className={labelTextClasses}>Academic Year <span className="text-red-500">*</span></Label>
        <Select name="academicYearId" value={formData.academicYearId || ''} onValueChange={(value) => onSelectChange('academicYearId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select Academic Year" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {isLoadingDeps && <SelectItem value="loading" disabled>Loading...</SelectItem>}
            {academicYearsList?.map(ay => <SelectItem key={ay.id} value={ay.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">{ay.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor={isEdit ? "editSchoolLevelId" : "schoolLevelId"} className={labelTextClasses}>School Level <span className="text-red-500">*</span></Label>
        <Select name="schoolLevelId" value={formData.schoolLevelId || ''} onValueChange={(value) => onSelectChange('schoolLevelId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select School Level" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {isLoadingDeps && <SelectItem value="loading" disabled>Loading...</SelectItem>}
            {schoolLevelsList?.map(sl => <SelectItem key={sl.id} value={sl.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">{sl.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!isEdit && (
        <div className="sm:col-span-2 mt-4">
          <Label className={labelTextClasses}>Initial Sections (Optional)</Label>
          <p className={`text-xs mb-2 ${descriptionTextClasses}`}>Add names for sections to be created with this class (e.g., A, B, Blue, Gold).</p>
          <ScrollArea className="h-32 w-full rounded-md border dark:border-zinc-700 p-3 bg-white/20 dark:bg-zinc-800/20">
            {formData.sections?.map((section, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <Input
                  type="text"
                  name={`section-${index}`}
                  value={section.name}
                  onChange={(e) => onSectionChange(index, e.target.value)}
                  placeholder={`Section ${index + 1} Name`}
                  className={`${inputTextClasses} flex-grow`}
                />
                {formData.sections.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSectionField(index)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 shrink-0">
                    <XCircle className="h-5 w-5" />
                  </Button>
                )}
              </div>
            ))}
          </ScrollArea>
          {/* ✨ Using the passed outlineButtonClasses prop ✨ */}
          <Button type="button" variant="outline" size="sm" onClick={addSectionField} className={`${outlineButtonClasses} mt-2 text-xs`}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Another Section
          </Button>
        </div>
      )}
    </div>
  );
};


export default function ManageClassesPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [classes, setClasses] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalClasses: 0, limit: 10 });
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({...initialAddFormData});
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addFormError, setAddFormError] = useState('');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({...initialEditFormData});
  const [currentEditingClassId, setCurrentEditingClassId] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800"; // This is defined
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";


  const fetchClasses = useCallback(async (page = 1, currentSearchTerm = debouncedSearchTerm) => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const queryParams = new URLSearchParams({ page: page.toString(), limit: pagination.limit.toString(), search: currentSearchTerm });
      const response = await fetch(`/api/schools/${schoolData.id}/academics/classes?${queryParams.toString()}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch classes.'); }
      const data = await response.json();
      setClasses(data.classes || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalClasses: 0, limit: 10 });
    } catch (err) { toast.error("Error fetching classes", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id, debouncedSearchTerm, pagination.limit]);

  const fetchFormDataDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDropdowns(true);
    try {
      const [levelsRes, yearsRes] = await Promise.all([
        fetch(`/api/schools/${schoolData.id}/academics/school-levels`),
        fetch(`/api/schools/${schoolData.id}/academic-years`)
      ]);
      if (!levelsRes.ok) { const d = await levelsRes.json().catch(() => ({})); throw new Error(d.error || 'Failed to fetch school levels.');}
      const levelsData = await levelsRes.json(); setSchoolLevels(levelsData.schoolLevels || []);
      if (!yearsRes.ok) { const d = await yearsRes.json().catch(() => ({})); throw new Error(d.error || 'Failed to fetch academic years.');}
      const yearsData = await yearsRes.json(); setAcademicYears(yearsData.academicYears || []);
    } catch (err) { toast.error("Error fetching form dependencies", { description: err.message });
    } finally { setIsLoadingDropdowns(false); }
  }, [schoolData?.id]);

  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
        const params = new URLSearchParams(searchParams.toString());
        if (searchTerm) params.set('search', searchTerm); else params.delete('search');
        params.set('page', '1'); 
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, searchParams, pathname, router]);
  
  useEffect(() => {
    if (schoolData?.id && session) {
      const currentPage = parseInt(searchParams.get('page') || '1', 10);
      const currentSearch = searchParams.get('search') || '';
      fetchClasses(currentPage, currentSearch);
      fetchFormDataDependencies();
    }
  }, [schoolData, session, fetchClasses, fetchFormDataDependencies, searchParams]);

  const handleAddFormChange = (e) => setAddFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleAddSelectChange = (name, value) => setAddFormData(prev => ({ ...prev, [name]: value }));
  const handleAddSectionChange = (index, value) => {
    const newSections = [...addFormData.sections];
    newSections[index].name = value;
    setAddFormData(prev => ({ ...prev, sections: newSections }));
  };
  const addSectionField = () => setAddFormData(prev => ({ ...prev, sections: [...prev.sections, { name: '' }] }));
  const removeSectionField = (index) => {
    if (addFormData.sections.length <= 1) return; // Keep at least one section input
    const newSections = addFormData.sections.filter((_, i) => i !== index);
    setAddFormData(prev => ({ ...prev, sections: newSections }));
  };

  const handleEditFormChange = (e) => setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleEditSelectChange = (name, value) => setEditFormData(prev => ({ ...prev, [name]: value }));

  const openAddDialog = () => { setAddFormData({...initialAddFormData, sections: [{name: ''}]}); setAddFormError(''); setIsAddDialogOpen(true); };

  const handleAddSubmit = async (e) => {
    e.preventDefault(); if (!schoolData?.id) return;
    setIsSubmittingAdd(true); setAddFormError('');
    
    const sectionsToSubmit = addFormData.sections.filter(s => s.name.trim() !== '').map(s => ({ name: s.name.trim() }));
    const payload = { ...addFormData, sections: sectionsToSubmit };
    delete payload.id;

    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/classes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || 'Failed to add class.';
        if(result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error("Creation Failed", { description: err }); setAddFormError(err);
      } else {
        toast.success(`Class "${result.class?.name}" created successfully!`); setIsAddDialogOpen(false); fetchClasses();
      }
    } catch (err) { toast.error('Unexpected error.'); setAddFormError('Unexpected error.');
    } finally { setIsSubmittingAdd(false); }
  };
  
  const openEditDialog = async (classRecord) => {
    if (!schoolData?.id || !classRecord?.id) return;
    setCurrentEditingClassId(classRecord.id);
    setEditFormError('');
    setIsEditDialogOpen(true);
    setIsSubmittingEdit(true); 
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/classes/${classRecord.id}`);
      if (!response.ok) { const errData = await response.json().catch(()=>{}); throw new Error(errData.error || "Failed to fetch class details."); }
      const data = await response.json();
      if (data.class) {
        setEditFormData({
          id: data.class.id,
          name: data.class.name || '',
          schoolLevelId: data.class.schoolLevelId || '',
          academicYearId: data.class.academicYearId || '',
        });
      } else {
        toast.error("Class details not found."); setIsEditDialogOpen(false);
      }
    } catch (err) {
      toast.error("Error fetching class details", { description: err.message }); setIsEditDialogOpen(false);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault(); if (!schoolData?.id || !currentEditingClassId) return;
    setIsSubmittingEdit(true); setEditFormError('');
    const { id, ...dataToUpdate } = editFormData; 
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/classes/${currentEditingClassId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToUpdate) });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || 'Failed to update class.';
        if(result.issues) err = result.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        toast.error("Update Failed", { description: err }); setEditFormError(err);
      } else {
        toast.success(`Class "${result.class?.name}" updated!`); setIsEditDialogOpen(false); fetchClasses();
      }
    } catch (err) { toast.error('Unexpected error.'); setEditFormError('Unexpected error.');
    } finally { setIsSubmittingEdit(false); }
  };

  const handleDelete = async (classId, className) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE class "${className}"? This will also delete all its sections and cannot be undone.`)) return;
    const toastId = `delete-class-${classId}`;
    toast.loading("Deleting class...", { id: toastId });
    try {
        const response = await fetch(`/api/schools/${schoolData.id}/academics/classes/${classId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Deletion failed.");
        toast.success(result.message || `Class "${className}" deleted.`, { id: toastId }); fetchClasses();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}> <BuildingIcon className="mr-3 h-8 w-8 opacity-80"/>Manage Classes </h1>
          <p className={descriptionTextClasses}>Define classes within academic years and school levels for {schoolData?.name || 'your school'}.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild><Button className={primaryButtonClasses} onClick={openAddDialog}><FilePlus2 className="mr-2 h-4 w-4" /> Add New Class</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader><DialogTitle className={titleTextClasses}>Add New Class</DialogTitle><DialogDescription className={descriptionTextClasses}>Enter class details and optionally add initial sections.</DialogDescription></DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-6 py-1">
              <ClassFormFields 
                formData={addFormData} 
                onFormChange={handleAddFormChange} 
                onSelectChange={handleAddSelectChange} 
                onSectionChange={handleAddSectionChange} 
                addSectionField={addSectionField} 
                removeSectionField={removeSectionField} 
                schoolLevelsList={schoolLevels} 
                academicYearsList={academicYears} 
                isLoadingDeps={isLoadingDropdowns} 
                isEdit={false}
                outlineButtonClasses={outlineButtonClasses} // ✨ Pass the prop here ✨
              />
              {addFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{addFormError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingAdd || isLoadingDropdowns}> {isSubmittingAdd ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating...</> : 'Create Class'} </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6"> <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" /> <Input type="search" placeholder="Search classes by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`pl-10 w-full md:w-1/2 lg:w-1/3 ${inputTextClasses}`} /> </div> </div>
      {error && !isAddDialogOpen && !isEditDialogOpen && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader><TableRow className="border-zinc-200/80 dark:border-zinc-700/80"><TableHead className={`${titleTextClasses} font-semibold`}>Class Name</TableHead><TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>School Level</TableHead><TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Academic Year</TableHead><TableHead className={`${titleTextClasses} font-semibold`}>Sections</TableHead><TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? ( Array.from({ length: pagination.limit }).map((_, index) => ( <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50"><TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell><TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32 rounded" /></TableCell><TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32 rounded" /></TableCell><TableCell><Skeleton className="h-5 w-10 rounded" /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell></TableRow> ))
            ) : classes.length > 0 ? classes.map((cls) => (
              <TableRow key={cls.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{cls.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{cls.schoolLevel?.name || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{cls.academicYear?.name || 'N/A'}</TableCell>
                <TableCell className={descriptionTextClasses}>
                  <Link href={`/${schoolData.subdomain}/academics/classes/${cls.id}/sections`} className="hover:underline text-sky-600 dark:text-sky-500"> {cls._count?.sections || 0} section(s) </Link>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(cls)} title="Edit Class"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(cls.id, cls.name)} title="Delete Class"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : ( <TableRow className="border-zinc-200/50 dark:border-zinc-800/50"><TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}> No classes found {searchTerm && `for your search "${searchTerm}"`}. {(!searchTerm && academicYears.length > 0 && schoolLevels.length > 0) ? 'Add a new class to get started.' : (!searchTerm ? 'Ensure Academic Years and School Levels are set up first.' : '')} </TableCell></TableRow> )}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader><DialogTitle className={titleTextClasses}>Edit Class: {editFormData.name}</DialogTitle><DialogDescription className={descriptionTextClasses}>Update class details. Managing sections is done separately.</DialogDescription></DialogHeader>
            {isSubmittingEdit && !editFormData.name ? ( <div className="py-10 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
            ) : (
                <form onSubmit={handleEditSubmit} className="space-y-6 py-1">
                    <ClassFormFields 
                        formData={editFormData} 
                        onFormChange={handleEditFormChange} 
                        onSelectChange={handleEditSelectChange} 
                        // Sections are not edited here, so these props are not needed for edit form
                        // onSectionChange={() => {}} 
                        // addSectionField={() => {}} 
                        // removeSectionField={() => {}} 
                        schoolLevelsList={schoolLevels} 
                        academicYearsList={academicYears} 
                        isLoadingDeps={isLoadingDropdowns} 
                        isEdit={true}
                        outlineButtonClasses={outlineButtonClasses} // ✨ Pass the prop here ✨
                    />
                    {editFormError && ( <p className="text-sm text-red-600 dark:text-red-400">{editFormError}</p> )}
                    <DialogFooter className="pt-6">
                        <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                        <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingEdit || isLoadingDropdowns}> {isSubmittingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Changes'} </Button>
                    </DialogFooter>
                </form>
            )}
          </DialogContent>
        </Dialog>

      {!isLoading && pagination.totalPages > 1 && (
        <div className={`flex items-center justify-between pt-4 flex-wrap gap-2 ${descriptionTextClasses}`}>
          <p className="text-sm"> Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalClasses} total classes) </p>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={pagination.currentPage === 1} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronsLeft className="h-4 w-4" /> </Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronLeft className="h-4 w-4" /> </Button>
            <span className="px-2 text-sm"> {pagination.currentPage} </span>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronRight className="h-4 w-4" /> </Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.totalPages)} disabled={pagination.currentPage === pagination.totalPages} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronsRight className="h-4 w-4" /> </Button>
          </div>
        </div>
      )}
    </div>
  );
}
