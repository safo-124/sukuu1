// app/[subdomain]/(school_app)/academics/classes/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout'; // Adjust path
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link'; // Import Link
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, Edit3, Trash2, Building as BuildingIcon, Users, AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const initialFormData = {
  name: '',
  schoolLevelId: '',
  academicYearId: '',
};

export default function ManageClassesPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [classes, setClasses] = useState([]);
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFormData, setIsLoadingFormData] = useState(true); // For dropdown data
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editingClass, setEditingClass] = useState(null); // null for Add, object for Edit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchClasses = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      // TODO: Add filters for academic year / school level if desired for the main list
      const response = await fetch(`/api/schools/${schoolData.id}/academics/classes`);
      if (!response.ok) throw new Error('Failed to fetch classes.');
      const data = await response.json();
      setClasses(data.classes || []);
    } catch (err) {
      toast.error("Error fetching classes", { description: err.message }); setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id]);

  const fetchFormDataDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingFormData(true);
    try {
      const [levelsRes, yearsRes] = await Promise.all([
        fetch(`/api/schools/${schoolData.id}/academics/school-levels`),
        fetch(`/api/schools/${schoolData.id}/academic-years`)
      ]);

      if (!levelsRes.ok) throw new Error('Failed to fetch school levels.');
      const levelsData = await levelsRes.json();
      setSchoolLevels(levelsData.schoolLevels || []);

      if (!yearsRes.ok) throw new Error('Failed to fetch academic years.');
      const yearsData = await yearsRes.json();
      setAcademicYears(yearsData.academicYears || []);

    } catch (err) {
      toast.error("Error fetching data for form", { description: err.message });
    } finally {
      setIsLoadingFormData(false);
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) {
      fetchClasses();
      fetchFormDataDependencies();
    }
  }, [schoolData, session, fetchClasses, fetchFormDataDependencies]);

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddDialog = () => {
    setEditingClass(null);
    setFormData(initialFormData);
    setError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true); setError('');

    // For now, we only implement POST (create). Edit will be separate.
    const url = `/api/schools/${schoolData.id}/academics/classes`;
    const method = 'POST'; // For adding
    const actionText = 'create';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || `Failed to ${actionText} class.`;
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Field'}: ${issue.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: errorMessage });
        setError(errorMessage);
      } else {
        toast.success(`Class "${result.class?.name}" ${actionText}d successfully!`);
        setIsDialogOpen(false);
        fetchClasses(); // Refresh list
      }
    } catch (err) {
      toast.error('An unexpected error occurred.'); setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Placeholders for Edit/Delete - To be implemented
  const openEditDialog = (cls) => toast.info(`Editing ${cls.name} (WIP). ID: ${cls.id}`);
  const handleDelete = (classId, className) => {
    if(!window.confirm(`Are you sure you want to delete class "${className}"? Make sure all sections are removed first.`)) return;
    toast.info(`Deleting ${className} (WIP)`);
  };

  const FormFields = ({ currentFormData, onFormChange, onSelectChange, schoolLevelsList, academicYearsList, isLoadingDeps }) => (
    <>
      <div>
        <Label htmlFor="name" className={labelTextClasses}>Class Name <span className="text-red-500">*</span></Label>
        <Input id="name" name="name" value={currentFormData.name} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., Grade 10, Form 3"/>
      </div>
      <div>
        <Label htmlFor="academicYearId" className={labelTextClasses}>Academic Year <span className="text-red-500">*</span></Label>
        <Select name="academicYearId" value={currentFormData.academicYearId} onValueChange={(value) => onSelectChange('academicYearId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select Academic Year" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900">
            {academicYearsList.map(ay => <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="schoolLevelId" className={labelTextClasses}>School Level <span className="text-red-500">*</span></Label>
        <Select name="schoolLevelId" value={currentFormData.schoolLevelId} onValueChange={(value) => onSelectChange('schoolLevelId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select School Level" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900">
            {schoolLevelsList.map(sl => <SelectItem key={sl.id} value={sl.id}>{sl.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* Add other fields like Class Teacher dropdown later */}
    </>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <BuildingIcon className="mr-3 h-8 w-8 opacity-80"/>Manage Classes
          </h1>
          <p className={descriptionTextClasses}>Define classes within academic years and school levels for {schoolData?.name || 'your school'}.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}>
              <FilePlus2 className="mr-2 h-4 w-4" /> Add New Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingClass ? 'Edit Class' : 'Add New Class'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingClass ? `Update details for ${editingClass.name}.` : 'Enter class details.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4 grid grid-cols-1 gap-4">
              <FormFields 
                currentFormData={formData} 
                onFormChange={handleFormChange} 
                onSelectChange={handleSelectChange} 
                schoolLevelsList={schoolLevels}
                academicYearsList={academicYears}
                isLoadingDeps={isLoadingFormData}
              />
              {error && isDialogOpen && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{error}</p> )}
              <DialogFooter className="md:col-span-full pt-4">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => setIsDialogOpen(false)}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingFormData}>
                  {isSubmitting ? (editingClass ? 'Saving...' : 'Creating...') : (editingClass ? 'Save Changes' : 'Create Class')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* General Page Error (not form specific) */}
      {error && !isDialogOpen && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Class Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>School Level</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Academic Year</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Sections</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : classes.length > 0 ? classes.map((cls) => (
              <TableRow key={cls.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{cls.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{cls.schoolLevel?.name || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{cls.academicYear?.name || 'N/A'}</TableCell>
                <TableCell className={descriptionTextClasses}>
                  <Link href={`/${schoolData.subdomain}/academics/classes/${cls.id}/sections`} className="hover:underline text-sky-600 dark:text-sky-500">
                    {cls._count?.sections || 0} section(s)
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(cls)} title="Edit Class"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(cls.id, cls.name)} title="Delete Class"> <Trash2 className="h-4 w-4" /> </Button>
                    <Link href={`/${schoolData.subdomain}/academics/classes/${cls.id}/sections`} passHref>
                        <Button variant="outline" size="sm" className={`${outlineButtonClasses} h-8 px-2`}>
                            <Users className="mr-1 h-3 w-3"/> Sections
                        </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No classes defined yet. Ensure Academic Years and School Levels are set up, then add a new class.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* TODO: Add Edit Class Dialog (similar to Add Dialog) */}
    </div>
  );
}