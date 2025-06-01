// app/[subdomain]/(school_app)/academics/school-levels/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout'; // Adjust path to your SchoolAppLayout's context
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, Edit3, Trash2, Layers, AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const initialFormData = { name: '', description: '' };

export default function ManageSchoolLevelsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession(); // For auth checks if needed, though API handles it

  const [schoolLevels, setSchoolLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editingLevel, setEditingLevel] = useState(null); // null for Add, object for Edit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;


  const fetchSchoolLevels = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/school-levels`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch school levels.');
      }
      const data = await response.json();
      setSchoolLevels(data.schoolLevels || []);
    } catch (err) {
      console.error("Error fetching school levels:", err)
      toast.error("Error Fetching Data", { description: err.message });
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id]);

  useEffect(() => {
    // Ensure schoolData is loaded from context and session is valid before fetching
    if (schoolData?.id && session) {
      fetchSchoolLevels();
    }
  }, [schoolData, session, fetchSchoolLevels]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddDialog = () => {
    setEditingLevel(null);
    setFormData(initialFormData);
    setError(''); // Clear previous form errors
    setIsDialogOpen(true);
  };

  const openEditDialog = (level) => {
    setEditingLevel(level);
    setFormData({ name: level.name, description: level.description || '' });
    setError(''); // Clear previous form errors
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true);
    setError('');

    const url = editingLevel
      ? `/api/schools/${schoolData.id}/academics/school-levels/${editingLevel.id}`
      : `/api/schools/${schoolData.id}/academics/school-levels`;
    const method = editingLevel ? 'PUT' : 'POST';
    const actionText = editingLevel ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || `Failed to ${actionText} school level.`;
        if (result.issues) { // Zod issues
          errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Field'}: ${issue.message}`).join('; ');
        }
        toast.error(`${editingLevel ? 'Update' : 'Creation'} Failed`, { description: errorMessage });
        setError(errorMessage); // Set form-level error if needed for display in dialog
      } else {
        toast.success(`School Level "${result.schoolLevel?.name}" ${actionText}d successfully!`);
        setIsDialogOpen(false);
        fetchSchoolLevels(); // Refresh list
      }
    } catch (err) {
      console.error(`Error submitting form for ${actionText} school level:`, err);
      toast.error('An unexpected error occurred.');
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (levelId, levelName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to delete the school level "${levelName}"? This action might not be reversible if classes are not linked.`)) return;
    
    const toastId = `delete-level-${levelId}`; // Unique ID for the toast
    toast.loading("Deleting school level...", { id: toastId });
    try {
        const response = await fetch(`/api/schools/${schoolData.id}/academics/school-levels/${levelId}`, { method: 'DELETE' });
        const result = await response.json();
        if(!response.ok) {
            throw new Error(result.error || "Failed to delete.");
        }
        toast.success(`School level "${levelName}" deleted successfully.`, { id: toastId });
        fetchSchoolLevels(); // Refresh list
    } catch (err) {
        console.error(`Error deleting school level ${levelId}:`, err);
        toast.error(`Deletion Failed: ${err.message}`, { id: toastId });
    }
  };

  // Main page title and description (using titleTextClasses)
  const pageContextTitle = schoolData?.name ? `for ${schoolData.name}` : 'for your school';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Layers className="mr-3 h-8 w-8 opacity-80"/>Manage School Levels
          </h1>
          <p className={descriptionTextClasses}>Define academic levels {pageContextTitle} (e.g., Primary, Middle School).</p>
        </div>
        <Button className={primaryButtonClasses} onClick={openAddDialog}>
          <FilePlus2 className="mr-2 h-4 w-4" /> Add New Level
        </Button>
      </div>

      {/* Display general page error if any, not related to form submission */}
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
              <TableHead className={`${titleTextClasses} font-semibold`}>Level Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Description</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-full max-w-md bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : schoolLevels.length > 0 ? schoolLevels.map((level) => (
              <TableRow key={level.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{level.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell truncate max-w-xs md:max-w-md lg:max-w-lg`}>{level.description || <span className="italic text-zinc-400 dark:text-zinc-600">No description</span>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(level)} title="Edit Level"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(level.id, level.name)} title="Delete Level"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="3" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No school levels defined yet. Click "Add New Level" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit School Level Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingLevel ? 'Edit School Level' : 'Add New School Level'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingLevel ? `Update the details for '${editingLevel.name}'.` : 'Define a new academic level for your school.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div>
                <Label htmlFor="levelName" className={labelTextClasses}>Level Name <span className="text-red-500">*</span></Label>
                <Input id="levelName" name="name" value={formData.name} onChange={handleFormChange} required className={`${inputTextClasses} mt-1`} />
              </div>
              <div>
                <Label htmlFor="levelDescription" className={labelTextClasses}>Description (Optional)</Label>
                <Textarea id="levelDescription" name="description" value={formData.description} onChange={handleFormChange} rows={3} className={`${inputTextClasses} mt-1`} />
              </div>
              {/* Display form-specific error from API if any, not cleared by toast */}
              {error && isDialogOpen && ( 
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => setIsDialogOpen(false)}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting}>
                  {isSubmitting ? (editingLevel ? 'Saving...' : 'Creating...') : (editingLevel ? 'Save Changes' : 'Create Level')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}