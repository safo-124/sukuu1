// app/[subdomain]/(school_app)/settings/academic-years/page.jsx
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
import { FilePlus2, Edit3, Trash2, CalendarDays, AlertTriangle, CheckCircle, Badge } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // For isCurrent toggle
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Helper to format date to YYYY-MM-DD for input type="date"
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch (e) { return ''; }
};

const initialFormData = { name: '', startDate: '', endDate: '', isCurrent: false };

export default function ManageAcademicYearsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [academicYears, setAcademicYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editingYear, setEditingYear] = useState(null); // null for Add, object for Edit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchAcademicYears = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academic-years`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch academic years.');
      }
      const data = await response.json();
      setAcademicYears(data.academicYears || []);
    } catch (err) {
      toast.error("Error fetching data", { description: err.message }); setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) {
      fetchAcademicYears();
    }
  }, [schoolData, session, fetchAcademicYears]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  
  const handleSwitchChange = (name, checked) => {
     setFormData(prev => ({ ...prev, [name]: checked }));
  };


  const openAddDialog = () => {
    setEditingYear(null);
    setFormData(initialFormData);
    setError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (year) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      startDate: formatDateForInput(year.startDate),
      endDate: formatDateForInput(year.endDate),
      isCurrent: year.isCurrent,
    });
    setError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true); setError('');

    const url = editingYear
      ? `/api/schools/${schoolData.id}/academic-years/${editingYear.id}`
      : `/api/schools/${schoolData.id}/academic-years`;
    const method = editingYear ? 'PUT' : 'POST';
    const actionText = editingYear ? 'update' : 'create';

    const payload = { ...formData };
    // Dates are already Date objects from Zod transform or will be converted by new Date() in API

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || `Failed to ${actionText} academic year.`;
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Field'}: ${issue.message}`).join('; ');
        toast.error(`${editingYear ? 'Update' : 'Creation'} Failed`, { description: errorMessage });
        setError(errorMessage); // Show error in dialog
      } else {
        toast.success(`Academic Year "${result.academicYear?.name}" ${actionText}d successfully!`);
        setIsDialogOpen(false);
        fetchAcademicYears(); // Refresh list
      }
    } catch (err) {
      toast.error('An unexpected error occurred.'); setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (yearId, yearName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to delete academic year "${yearName}"? This action cannot be undone.`)) return;
    
    const toastId = `delete-ay-${yearId}`;
    toast.loading("Deleting academic year...", { id: toastId });
    try {
        const response = await fetch(`/api/schools/${schoolData.id}/academic-years/${yearId}`, { method: 'DELETE' });
        const result = await response.json();
        if(!response.ok) {
            throw new Error(result.error || "Failed to delete.");
        }
        toast.success(`Academic year "${yearName}" deleted successfully.`, { id: toastId });
        fetchAcademicYears();
    } catch (err) {
        toast.error(`Deletion Failed: ${err.message}`, { id: toastId });
    }
  };

  const handleSetCurrent = async (yearId, yearName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Set "${yearName}" as the current academic year? This will unset any other current year.`)) return;

    const toastId = `set-current-${yearId}`;
    toast.loading(`Setting "${yearName}" as current...`, {id: toastId});
    try {
        const response = await fetch(`/api/schools/${schoolData.id}/academic-years/${yearId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isCurrent: true }) // Only send the isCurrent flag
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to set as current.");
        }
        toast.success(`"${yearName}" is now the current academic year.`, {id: toastId});
        fetchAcademicYears();
    } catch (err) {
        toast.error(`Operation Failed: ${err.message}`, {id: toastId});
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <CalendarDays className="mr-3 h-8 w-8 opacity-80"/>Manage Academic Years
          </h1>
          <p className={descriptionTextClasses}>Define and organize academic sessions for {schoolData?.name || 'your school'}.</p>
        </div>
        <Button className={primaryButtonClasses} onClick={openAddDialog}>
          <FilePlus2 className="mr-2 h-4 w-4" /> Add Academic Year
        </Button>
      </div>

      {error && !isDialogOpen && ( /* Show general page errors if dialog is not open */
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> 
            <AlertTriangle className="h-4 w-4" /> 
            <AlertTitle>Error</AlertTitle> 
            <AlertDescription>{error}</AlertDescription> 
        </Alert> 
      )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Start Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>End Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Status</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 bg-zinc-300 dark:bg-zinc-700 rounded-full" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : academicYears.length > 0 ? academicYears.map((ay) => (
              <TableRow key={ay.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{ay.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{new Date(ay.startDate).toLocaleDateString()}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{new Date(ay.endDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  {ay.isCurrent ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200 border border-green-300 dark:border-green-700">Current</Badge>
                  ) : (
                    <Button variant="outline" size="xs" className={`${outlineButtonClasses} text-xs h-7`} onClick={() => handleSetCurrent(ay.id, ay.name)}>Set Current</Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(ay)} title="Edit"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(ay.id, ay.name)} title="Delete"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No academic years defined yet. Click "Add New" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingYear ? 'Edit Academic Year' : 'Add New Academic Year'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingYear ? `Update details for ${editingYear.name}.` : 'Define a new academic session for your school.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div>
                <Label htmlFor="name" className={labelTextClasses}>Name (e.g., 2024-2025) <span className="text-red-500">*</span></Label>
                <Input id="name" name="name" value={formData.name} onChange={handleFormChange} required className={`${inputTextClasses} mt-1`} />
              </div>
              <div>
                <Label htmlFor="startDate" className={labelTextClasses}>Start Date <span className="text-red-500">*</span></Label>
                <Input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleFormChange} required className={`${inputTextClasses} mt-1`} />
              </div>
              <div>
                <Label htmlFor="endDate" className={labelTextClasses}>End Date <span className="text-red-500">*</span></Label>
                <Input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleFormChange} required className={`${inputTextClasses} mt-1`} />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="isCurrent" name="isCurrent" checked={formData.isCurrent} onCheckedChange={(checked) => handleSwitchChange('isCurrent', checked)} />
                <Label htmlFor="isCurrent" className={`text-sm font-medium ${titleTextClasses}`}>Set as Current Academic Year</Label>
              </div>
              {error && isDialogOpen && ( <p className="text-sm text-red-600 dark:text-red-400">{error}</p> )}
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => setIsDialogOpen(false)}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting}>
                  {isSubmitting ? (editingYear ? 'Saving...' : 'Creating...') : (editingYear ? 'Save Changes' : 'Create Year')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}