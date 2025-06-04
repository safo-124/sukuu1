// app/[subdomain]/(school_app)/academics/departments/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation'; // In case you need navigation

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FilePlus2, Edit3, Trash2, Briefcase, Loader2, AlertTriangle } from 'lucide-react';

// Initial form data for Department
const initialDepartmentFormData = {
  id: null, // For editing
  name: '',
  description: '',
};

// Reusable FormFields Component for Department
const DepartmentFormFields = ({ formData, onFormChange, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  return (
    <div className="grid grid-cols-1 gap-y-4">
      <div>
        <Label htmlFor="departmentName" className={labelTextClasses}>Department Name <span className="text-red-500">*</span></Label>
        <Input id="departmentName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="description" className={labelTextClasses}>Description (Optional)</Label>
        <Textarea id="description" name="description" value={formData.description || ''} onChange={onFormChange} rows={3} className={`${inputTextClasses} mt-1`} />
      </div>
    </div>
  );
};


export default function ManageDepartmentsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  // const router = useRouter(); // Uncomment if needed for navigation

  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false); // For add/edit dialog
  const [formData, setFormData] = useState({ ...initialDepartmentFormData });
  const [editingDepartment, setEditingDepartment] = useState(null); // null for Add, object for Edit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  // --- Fetching Data ---
  const fetchDepartments = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/departments`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch departments.'); }
      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (err) { toast.error("Error fetching departments", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) {
      fetchDepartments();
    }
  }, [schoolData, session, fetchDepartments]);

  // --- Form Handlers ---
  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const openAddDialog = () => {
    setEditingDepartment(null);
    setFormData({ ...initialDepartmentFormData });
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (department) => {
    setEditingDepartment(department);
    setFormData({
      id: department.id,
      name: department.name || '',
      description: department.description || '',
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true); setFormError('');

    const isEditing = !!editingDepartment;
    const payload = {
      name: formData.name,
      description: formData.description || null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/academics/departments/${editingDepartment.id}`
      : `/api/schools/${schoolData.id}/academics/departments`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} department.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setFormError(err);
      } else {
        toast.success(`Department "${result.department?.name}" ${actionText}d successfully!`);
        setIsDialogOpen(false);
        fetchDepartments(); // Re-fetch departments
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setFormError('An unexpected error occurred.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (departmentId, departmentName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE department "${departmentName}"? This will affect associated subjects and staff members.`)) return;
    const toastId = `delete-department-${departmentId}`;
    toast.loading("Deleting department...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/departments/${departmentId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Department "${departmentName}" deleted.`, { id: toastId });
      fetchDepartments();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Briefcase className="mr-3 h-8 w-8 opacity-80"/>Manage Departments
          </h1>
          <p className={descriptionTextClasses}>Define and manage academic and administrative departments within the school.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(''); }}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}> <FilePlus2 className="mr-2 h-4 w-4" /> Add New Department </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingDepartment ? 'Edit Department' : 'Add New Department'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingDepartment ? 'Update department details.' : 'Create a new department for the school.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
              <DepartmentFormFields
                formData={formData}
                onFormChange={handleFormChange}
                isEdit={!!editingDepartment}
              />
              {formError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingDepartment ? 'Saving...' : 'Creating...'}</> : editingDepartment ? 'Save Changes' : 'Create Department'}
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
              <TableHead className={`${titleTextClasses} font-semibold`}>Department Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Description</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-48 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : departments.length > 0 ? departments.map((department) => (
              <TableRow key={department.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{department.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{department.description || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(department)} title="Edit Department"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(department.id, department.name)} title="Delete Department"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="3" className={`text-center py-10 ${descriptionTextClasses}`}>
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
