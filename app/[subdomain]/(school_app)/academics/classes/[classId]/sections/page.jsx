// app/[subdomain]/(school_app)/academics/classes/[classId]/sections/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../../../layout'; // Adjust path to SchoolAppLayout's context
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation'; // useParams to get classId
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, Edit3, Trash2, Building as BuildingIcon, Users, AlertTriangle, ArrowLeft, Loader2, UserCog } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const initialFormData = { name: '', classTeacherId: '', maxCapacity: '' };

// Helper component for form fields
const SectionFormFields = ({ formData, onFormChange, onSelectChange, teachersList, isLoadingDeps, isEdit = false }) => {
  const titleTextClasses = "text-black dark:text-white";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  if (!formData) return <div className="p-4"><Loader2 className="h-6 w-6 animate-spin text-sky-600" /></div>;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor={isEdit ? "editSectionName" : "sectionName"} className={labelTextClasses}>Section Name <span className="text-red-500">*</span></Label>
        <Input id={isEdit ? "editSectionName" : "sectionName"} name="name" value={formData.name} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., A, Blue, Morning"/>
      </div>
      <div>
        <Label htmlFor={isEdit ? "editClassTeacherId" : "classTeacherId"} className={labelTextClasses}>Class Teacher (Optional)</Label>
        <Select name="classTeacherId" value={formData.classTeacherId || 'none'} onValueChange={(value) => onSelectChange('classTeacherId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select Class Teacher" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900">
            <SelectItem value="none" className="text-zinc-500">None</SelectItem>
            {teachersList?.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.user?.firstName} {teacher.user?.lastName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor={isEdit ? "editMaxCapacity" : "maxCapacity"} className={labelTextClasses}>Max Capacity (Optional)</Label>
        <Input id={isEdit ? "editMaxCapacity" : "maxCapacity"} name="maxCapacity" type="number" value={formData.maxCapacity} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., 30"/>
      </div>
    </div>
  );
};


export default function ManageSectionsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const { classId, subdomain } = params; // classId from URL, subdomain for links

  const [className, setClassName] = useState(''); // To display parent class name
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]); // For Class Teacher dropdown
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true); // For dropdown data
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editingSection, setEditingSection] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchClassDetails = useCallback(async () => {
    if (!schoolData?.id || !classId) return;
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/classes/${classId}`);
      if (!response.ok) throw new Error('Failed to fetch class details.');
      const data = await response.json();
      setClassName(data.class?.name || 'Selected Class');
    } catch (err) {
      toast.error("Error fetching class name", { description: err.message });
      setClassName('Unknown Class');
    }
  }, [schoolData?.id, classId]);

  const fetchSections = useCallback(async () => {
    if (!schoolData?.id || !classId) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/classes/${classId}/sections`);
      if (!response.ok) throw new Error('Failed to fetch sections.');
      const data = await response.json();
      setSections(data.sections || []);
    } catch (err) {
      toast.error("Error fetching sections", { description: err.message }); setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id, classId]);

  const fetchTeachersForDropdown = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/staff/teachers`); // Assuming this lists all teachers
      if (!response.ok) throw new Error('Failed to fetch teachers for dropdown.');
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (err) {
      toast.error("Error fetching teachers", { description: err.message });
    } finally {
      setIsLoadingDeps(false);
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && classId && session) {
      fetchClassDetails();
      fetchSections();
      fetchTeachersForDropdown();
    }
  }, [schoolData, classId, session, fetchClassDetails, fetchSections, fetchTeachersForDropdown]);

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));

  const openAddDialog = () => { setEditingSection(null); setFormData(initialFormData); setFormError(''); setIsDialogOpen(true); };

  const openEditDialog = (section) => {
    setEditingSection(section);
    setFormData({
      name: section.name || '',
      classTeacherId: section.classTeacherId || '',
      maxCapacity: section.maxCapacity?.toString() || '',
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id || !classId) return;
    setIsSubmitting(true); setFormError('');

    const url = editingSection
      ? `/api/schools/${schoolData.id}/academics/sections/${editingSection.id}`
      : `/api/schools/${schoolData.id}/academics/classes/${classId}/sections`;
    const method = editingSection ? 'PUT' : 'POST';
    const actionText = editingSection ? 'update' : 'create';
    
    const payload = {
        ...formData,
        maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity, 10) : null,
        classTeacherId: formData.classTeacherId || null,
    };

    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} section.`;
        if(result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setFormError(err);
      } else {
        toast.success(`Section "${result.section?.name}" ${actionText}d successfully!`); setIsDialogOpen(false); fetchSections();
      }
    } catch (err) { toast.error('Unexpected error.'); setFormError('Unexpected error.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (sectionId, sectionName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE section "${sectionName}"? This action cannot be undone.`)) return;
    const toastId = `delete-section-${sectionId}`;
    toast.loading("Deleting section...", { id: toastId });
    try {
        const response = await fetch(`/api/schools/${schoolData.id}/academics/sections/${sectionId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Deletion failed.");
        toast.success(result.message || `Section "${sectionName}" deleted.`, { id: toastId }); fetchSections();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href={`/${subdomain}/academics/classes`} className={`inline-flex items-center text-sm hover:underline ${descriptionTextClasses} mb-2`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Classes
          </Link>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <BuildingIcon className="mr-3 h-7 w-7 opacity-80"/>Manage Sections for {className || 'Class'}
          </h1>
          <p className={descriptionTextClasses}>Define and organize sections within {className || 'this class'}.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button className={primaryButtonClasses} onClick={openAddDialog}><FilePlus2 className="mr-2 h-4 w-4" /> Add New Section</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader><DialogTitle className={titleTextClasses}>{editingSection ? 'Edit Section' : 'Add New Section'}</DialogTitle><DialogDescription className={descriptionTextClasses}>{editingSection ? `Update details for section ${editingSection.name}.` : 'Enter section details.'}</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
              <SectionFormFields formData={formData} onFormChange={handleFormChange} onSelectChange={handleSelectChange} teachersList={teachers} isLoadingDeps={isLoadingDeps} isEdit={!!editingSection}/>
              {formError && isDialogOpen && ( <p className="text-sm text-red-600 dark:text-red-400">{formError}</p> )}
              <DialogFooter className="pt-6"><DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose><Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingDeps}> {isSubmitting ? (editingSection ? 'Saving...' : 'Creating...') : (editingSection ? 'Save Changes' : 'Create Section')} </Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isDialogOpen && ( <Alert variant="destructive"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader><TableRow className="border-zinc-200/80 dark:border-zinc-700/80"><TableHead className={`${titleTextClasses} font-semibold`}>Section Name</TableHead><TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Class Teacher</TableHead><TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Capacity</TableHead><TableHead className={`${titleTextClasses} font-semibold`}>Students</TableHead><TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? ( Array.from({ length: 3 }).map((_, index) => ( <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50"><TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell><TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32 rounded" /></TableCell><TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12 rounded" /></TableCell><TableCell><Skeleton className="h-5 w-10 rounded" /></TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell></TableRow> ))
            ) : sections.length > 0 ? sections.map((section) => (
              <TableRow key={section.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{section.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{section.classTeacher ? `${section.classTeacher.user.firstName} ${section.classTeacher.user.lastName}` : <span className="italic text-zinc-500">N/A</span>}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{section.maxCapacity || 'N/A'}</TableCell>
                <TableCell className={descriptionTextClasses}>{section._count?.studentEnrollments || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(section)} title="Edit Section"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(section.id, section.name)} title="Delete Section"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : ( <TableRow className="border-zinc-200/50 dark:border-zinc-800/50"><TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>No sections defined for this class yet. Click "Add New Section" to get started.</TableCell></TableRow> )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}