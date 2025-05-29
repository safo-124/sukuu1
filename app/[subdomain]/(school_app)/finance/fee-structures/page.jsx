// app/[subdomain]/(school_app)/finance/fee-structures/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout';  // Adjust path
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, Edit3, Trash2, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Assuming FeeFrequencyEnumValues is defined here or imported from validators
const FeeFrequencyEnumValues = ["ONE_TIME", "MONTHLY", "TERMLY", "ANNUALLY"];


const initialFormData = {
  name: '',
  description: '',
  amount: '',
  frequency: FeeFrequencyEnumValues[0],
  academicYearId: '', // Will store ID, can be empty string for 'None'
};

export default function FeeStructuresPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [feeStructures, setFeeStructures] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] = useState(initialFormData);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(initialFormData);
  const [currentEditingId, setCurrentEditingId] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchFeeStructures = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); // Set loading for the table
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/fee-structures`);
      if (!response.ok) throw new Error('Failed to fetch fee structures.');
      const data = await response.json();
      setFeeStructures(data.feeStructures || []);
    } catch (err) {
      toast.error("Error fetching fee structures", { description: err.message });
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id]);

  const fetchAcademicYears = useCallback(async () => {
    if (!schoolData?.id) return;
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academic-years`);
      if (!response.ok) throw new Error('Failed to fetch academic years.');
      const data = await response.json();
      setAcademicYears(data.academicYears || []);
    } catch (err) {
      toast.error("Error fetching academic years", { description: err.message });
      setAcademicYears([]); // Set to empty on error
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) { // Ensure session is also present
      fetchFeeStructures();
      fetchAcademicYears();
    }
  }, [schoolData, session, fetchFeeStructures, fetchAcademicYears]);

  const handleAddFormChange = (e) => {
    setAddFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleAddSelectChange = (name, value) => {
    setAddFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditFormChange = (e) => {
    setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleEditSelectChange = (name, value) => {
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault(); if (!schoolData?.id) return;
    setIsSubmittingAdd(true);
    const dataToSubmit = { ...addFormData, amount: parseFloat(addFormData.amount), academicYearId: addFormData.academicYearId === '' ? null : addFormData.academicYearId };
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/fee-structures`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSubmit),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || 'Failed to create fee structure.';
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Error'}: ${issue.message}`).join('\n');
        toast.error("Creation Failed", { description: errorMessage });
      } else {
        toast.success(`Fee Structure "${result.feeStructure?.name}" created successfully!`);
        setAddFormData(initialFormData); setIsAddDialogOpen(false); fetchFeeStructures();
      }
    } catch (err) { toast.error('An unexpected error occurred.');
    } finally { setIsSubmittingAdd(false); }
  };
  
  const openEditDialog = (fs) => {
    setCurrentEditingId(fs.id);
    setEditFormData({
        name: fs.name || '',
        description: fs.description || '',
        amount: fs.amount?.toString() || '', // Convert number to string for input
        frequency: fs.frequency || FeeFrequencyEnumValues[0],
        academicYearId: fs.academicYearId || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id || !currentEditingId) return;
    setIsSubmittingEdit(true);
    const dataToSubmit = { ...editFormData, amount: parseFloat(editFormData.amount), academicYearId: editFormData.academicYearId === '' ? null : editFormData.academicYearId };

    try {
      const response = await fetch(`/api/schools/${schoolData.id}/fee-structures/${currentEditingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSubmit),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || 'Failed to update fee structure.';
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Error'}: ${issue.message}`).join('\n');
        toast.error("Update Failed", { description: errorMessage });
      } else {
        toast.success(`Fee Structure "${result.feeStructure?.name}" updated successfully!`);
        setIsEditDialogOpen(false); fetchFeeStructures();
      }
    } catch (err) { toast.error('An unexpected error occurred during update.');
    } finally { setIsSubmittingEdit(false); }
  };

  const handleDelete = async (feeStructureId, feeStructureName) => {
    if(!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to delete the fee structure "${feeStructureName}"? This action cannot be undone.`)) return;
    
    const toastId = `delete-${feeStructureId}`;
    toast.loading("Deleting fee structure...", { id: toastId });
    try {
        const response = await fetch(`/api/schools/${schoolData.id}/fee-structures/${feeStructureId}`, { method: 'DELETE' });
        const result = await response.json();
        if(!response.ok) {
            throw new Error(result.error || "Failed to delete.");
        }
        toast.success(`Fee structure "${feeStructureName}" deleted successfully.`, { id: toastId });
        fetchFeeStructures();
    } catch (err) {
        toast.error(`Deletion Failed: ${err.message}`, { id: toastId });
    }
  };

  const FormFields = ({ formData, handleFormChange, handleSelectChange, academicYears }) => (
    <>
      <div>
        <Label htmlFor="name" className={labelTextClasses}>Fee Name <span className="text-red-500">*</span></Label>
        <Input id="name" name="name" value={formData.name} onChange={handleFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., Tuition Fee - Grade 10 - Term 1"/>
      </div>
      <div>
        <Label htmlFor="description" className={labelTextClasses}>Description (Optional)</Label>
        <Textarea id="description" name="description" value={formData.description} onChange={handleFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount" className={labelTextClasses}>Amount <span className="text-red-500">*</span></Label>
          <Input id="amount" name="amount" type="number" step="0.01" value={formData.amount} onChange={handleFormChange} required className={`${inputTextClasses} mt-1`} />
        </div>
        <div>
          <Label htmlFor="frequency" className={labelTextClasses}>Frequency <span className="text-red-500">*</span></Label>
          <Select name="frequency" value={formData.frequency} onValueChange={(value) => handleSelectChange('frequency', value)}>
            <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select frequency" /> </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              {FeeFrequencyEnumValues.map(freq => <SelectItem key={freq} value={freq} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">{freq.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="academicYearId" className={labelTextClasses}>Academic Year (Optional)</Label>
          <Select name="academicYearId" value={formData.academicYearId || ''} onValueChange={(value) => handleSelectChange('academicYearId', value === 'none' ? '' : value)}>
            <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select academic year (if applicable)" /> </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                <SelectItem value="none" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400">None (General Fee)</SelectItem>
                {academicYears.map(ay => <SelectItem key={ay.id} value={ay.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">{ay.name}</SelectItem>)}
            </SelectContent>
          </Select>
      </div>
    </>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses}`}>Fee Structures</h1>
          <p className={descriptionTextClasses}>Define and manage fee categories for {schoolData?.name || 'your school'}.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses}> <FilePlus2 className="mr-2 h-4 w-4" /> Add Fee Structure </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader> <DialogTitle className={titleTextClasses}>Create New Fee Structure</DialogTitle> <DialogDescription className={descriptionTextClasses}>Define a new fee category.</DialogDescription> </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
                <FormFields formData={addFormData} handleFormChange={handleAddFormChange} handleSelectChange={handleAddSelectChange} academicYears={academicYears} />
                <DialogFooter className="pt-4"> <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose> <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingAdd}> {isSubmittingAdd ? 'Creating...' : 'Create Fee Structure'} </Button> </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Amount</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Frequency</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Academic Year</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => ( /* Skeleton rows */ <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50"> <TableCell><Skeleton className="h-5 w-40 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell> <TableCell><Skeleton className="h-5 w-20 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell> <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell> <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell> <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /></div></TableCell> </TableRow> ))
            ) : feeStructures.length > 0 ? feeStructures.map((fs) => (
              <TableRow key={fs.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{fs.name}</TableCell>
                <TableCell className={descriptionTextClasses}>{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(fs.amount)}</TableCell> {/* TODO: School's currency */}
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{fs.frequency.replace('_', ' ')}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{fs.academicYear?.name || <span className="italic text-zinc-500">N/A</span>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(fs)} title="Edit"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(fs.id, fs.name)} title="Delete"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50"> <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}> No fee structures defined yet. Click "Add New" to get started. </TableCell> </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Fee Structure Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader> <DialogTitle className={titleTextClasses}>Edit Fee Structure</DialogTitle> <DialogDescription className={descriptionTextClasses}>Update the details for this fee category.</DialogDescription> </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
                <FormFields formData={editFormData} handleFormChange={handleEditFormChange} handleSelectChange={handleEditSelectChange} academicYears={academicYears} />
                <DialogFooter className="pt-4"> <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose> <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingEdit}> {isSubmittingEdit ? 'Saving...' : 'Save Changes'} </Button> </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}