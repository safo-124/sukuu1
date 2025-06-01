// app/[subdomain]/(school_app)/academics/departments/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../../layout'; // Adjust path if your layout export is different
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, Edit3, Trash2, Briefcase as BriefcaseIcon, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const initialFormData = { name: '', description: '' };

export default function ManageDepartmentsPage() {
  const schoolData = useSchool(); // From SchoolAppLayout context
  const { data: session } = useSession(); // For auth checks if needed

  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(''); // For general page errors

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editingDepartment, setEditingDepartment] = useState(null); // null for Add, object for Edit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(''); // For errors within the dialog form

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchDepartments = useCallback(async () => {
    if (!schoolData?.id) {
      // console.log("ManageDepartmentsPage: schoolData or schoolData.id is not available yet for fetching departments.");
      return;
    }
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/departments`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({})); // Try to parse error, fallback if not JSON
        throw new Error(errData.error || 'Failed to fetch departments.');
      }
      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
      toast.error("Error Fetching Departments", { description: err.message });
      setError(err.message); // Set page-level error
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) { // Ensure session is also loaded if API relies on it
      fetchDepartments();
    }
  }, [schoolData, session, fetchDepartments]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddDialog = () => {
    setEditingDepartment(null);
    setFormData(initialFormData);
    setFormError(''); // Clear previous form errors
    setIsDialogOpen(true);
  };

  const openEditDialog = (dept) => {
    setEditingDepartment(dept);
    setFormData({ name: dept.name, description: dept.description || '' });
    setFormError(''); // Clear previous form errors
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true); setFormError('');

    const url = editingDepartment
      ? `/api/schools/${schoolData.id}/academics/departments/${editingDepartment.id}`
      : `/api/schools/${schoolData.id}/academics/departments`;
    const method = editingDepartment ? 'PUT' : 'POST';
    const actionText = editingDepartment ? 'update' : 'create';
    
    const payload = { ...formData, description: formData.description || null };

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || `Failed to ${actionText} department.`;
        if (result.issues) { // Zod issues
          errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Field'}: ${issue.message}`).join('; ');
        }
        toast.error(`${editingDepartment ? 'Update' : 'Creation'} Failed`, { description: errorMessage });
        setFormError(errorMessage); // Set form-level error to display in dialog
      } else {
        toast.success(`Department "${result.department?.name}" ${actionText}d successfully!`);
        setIsDialogOpen(false);
        fetchDepartments(); // Refresh list
      }
    } catch (err) {
      console.error(`Error submitting form for ${actionText} department:`, err);
      toast.error('An unexpected error occurred.');
      setFormError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (departmentId, departmentName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE department "${departmentName}"? This action cannot be undone.`)) return;
    
    const toastId = `delete-dept-${departmentId}`;
    toast.loading("Deleting department...", { id: toastId });
    try {
        const response = await fetch(`/api/schools/${schoolData.id}/academics/departments/${departmentId}`, { method: 'DELETE' });
        const result = await response.json();
        if(!response.ok) {
            throw new Error(result.error || "Deletion failed.");
        }
        toast.success(result.message || `Department "${departmentName}" deleted.`, { id: toastId });
        fetchDepartments(); // Refresh list
    } catch (err) {
        console.error(`Error deleting department ${departmentId}:`, err);
        toast.error(`Deletion Failed: ${err.message}`, { id: toastId });
    }
  };

  const pageContextTitle = schoolData?.name ? `for ${schoolData.name}` : 'for your school';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <BriefcaseIcon className="mr-3 h-8 w-8 opacity-80"/>Manage Departments
          </h1>
          <p className={descriptionTextClasses}>Organize subjects and staff into academic departments {pageContextTitle}.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}>
              <FilePlus2 className="mr-2 h-4 w-4" /> Add New Department
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingDepartment ? 'Edit Department' : 'Add New Department'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingDepartment ? `Update the details for '${editingDepartment.name}'.` : 'Define a new academic department for your school.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div>
                <Label htmlFor="deptName" className={labelTextClasses}>Department Name <span className="text-red-500">*</span></Label>
                <Input id="deptName" name="name" value={formData.name} onChange={handleFormChange} required className={`${inputTextClasses} mt-1`} />
              </div>
              <div>
                <Label htmlFor="deptDescription" className={labelTextClasses}>Description (Optional)</Label>
                <Textarea id="deptDescription" name="description" value={formData.description} onChange={handleFormChange} rows={3} className={`${inputTextClasses} mt-1`} />
              </div>
              {formError && isDialogOpen && ( 
                <p className="text-sm text-red-600 dark:text-red-400">{formError}</p> 
              )}
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                </DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting}>
                  {isSubmitting ? (editingDepartment ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating...</>) : (editingDepartment ? 'Save Changes' : 'Create Department')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isDialogOpen && ( 
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> 
            <AlertTriangle className="h-4 w-4" /> 
            <AlertTitle>Error</AlertTitle> 
            <AlertDescription>{error}</AlertDescription> 
        </Alert> 
      )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80 hover:bg-transparent dark:hover:bg-transparent">
              <TableHead className={`${titleTextClasses} font-semibold`}>Department Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Description</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Subjects</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Staff</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-full max-w-md bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : departments.length > 0 ? departments.map((dept) => (
              <TableRow key={dept.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{dept.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell truncate max-w-xs md:max-w-md lg:max-w-lg`}>{dept.description || <span className="italic text-zinc-400 dark:text-zinc-600">No description</span>}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{dept._count?.subjects || 0}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{dept._count?.staff || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(dept)} title="Edit Department"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(dept.id, dept.name)} title="Delete Department"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No departments defined yet. Click "Add New Department" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}