// app/[subdomain]/(school_app)/academics/subjects/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout'; // Adjust path
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, Edit3, Trash2, BookOpen, AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialFormData = {
  name: '',
  subjectCode: '',
  description: '',
  departmentId: '',
};

export default function ManageSubjectsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]); // For dropdown
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tailwind class constants (reuse from previous components or define new ones)
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;


  const fetchSubjects = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/subjects`);
      if (!response.ok) throw new Error('Failed to fetch subjects.');
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      toast.error("Error fetching subjects", { description: err.message });
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id]);

  const fetchDepartments = useCallback(async () => {
    if (!schoolData?.id) return;
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/departments`);
      if (!response.ok) throw new Error('Failed to fetch departments.');
      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (err) {
      toast.error("Error fetching departments", { description: err.message });
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) {
      fetchSubjects();
      fetchDepartments();
    }
  }, [schoolData, session, fetchSubjects, fetchDepartments]);

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true);
    const dataToSubmit = {
      ...formData,
      departmentId: formData.departmentId || null, // Ensure null if empty
      subjectCode: formData.subjectCode || null,
    };

    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || 'Failed to create subject.';
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Error'}: ${issue.message}`).join('\n');
        toast.error("Creation Failed", { description: errorMessage });
      } else {
        toast.success(`Subject "${result.subject?.name}" created successfully!`);
        setFormData(initialFormData);
        setIsAddDialogOpen(false);
        fetchSubjects(); // Refresh list
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Placeholder for Edit/Delete - to be implemented next
  const openEditDialog = (subject) => toast.info(`Editing ${subject.name} (WIP)`);
  const handleDelete = (subjectId, subjectName) => {
    if(!window.confirm(`Are you sure you want to delete subject "${subjectName}"?`)) return;
    toast.info(`Deleting ${subjectName} (WIP)`);
  };

  const FormFields = ({ currentFormData, onFormChange, onSelectChange, departmentsList }) => (
    <>
      <div>
        <Label htmlFor="name" className={labelTextClasses}>Subject Name <span className="text-red-500">*</span></Label>
        <Input id="name" name="name" value={currentFormData.name} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="subjectCode" className={labelTextClasses}>Subject Code (Optional)</Label>
        <Input id="subjectCode" name="subjectCode" value={currentFormData.subjectCode} onChange={onFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="description" className={labelTextClasses}>Description (Optional)</Label>
        <Textarea id="description" name="description" value={currentFormData.description} onChange={onFormChange} rows={3} className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="departmentId" className={labelTextClasses}>Department (Optional)</Label>
        <Select name="departmentId" value={currentFormData.departmentId || 'none'} onValueChange={(value) => onSelectChange('departmentId', value)}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select department" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400">No Department</SelectItem>
            {departmentsList.map(dept => <SelectItem key={dept.id} value={dept.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">{dept.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses}`}>Manage Subjects</h1>
          <p className={descriptionTextClasses}>Define and organize subjects offered at {schoolData?.name || 'your school'}.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses}>
              <FilePlus2 className="mr-2 h-4 w-4" /> Add New Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>Create New Subject</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>Enter the details for the new subject.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormFields currentFormData={formData} onFormChange={handleFormChange} onSelectChange={handleSelectChange} departmentsList={departments} />
              <DialogFooter className="md:col-span-2 pt-4">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Subject'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Subject Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Code</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Department</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : subjects.length > 0 ? subjects.map((subject) => (
              <TableRow key={subject.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{subject.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{subject.subjectCode || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{subject.department?.name || <span className="italic text-zinc-500">N/A</span>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(subject)} title="Edit"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(subject.id, subject.name)} title="Delete"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="4" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No subjects defined yet. Click "Add New Subject" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* TODO: Add Edit Subject Dialog here, similar to Add Dialog */}
    </div>
  );
}