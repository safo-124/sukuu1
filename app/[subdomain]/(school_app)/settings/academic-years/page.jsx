// app/[subdomain]/(school_app)/settings/academic-years/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FilePlus2, Edit3, Trash2, CalendarDays, Loader2, AlertTriangle, PlusCircle, BookOpen, Layers,
  ChevronDown, ChevronUp, CheckCircle, XCircle
} from 'lucide-react';

// Initial form data for Academic Year
const initialAcademicYearFormData = {
  id: null,
  name: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
};

// Initial form data for Term
const initialTermFormData = {
  id: null,
  name: '',
  startDate: '',
  endDate: '',
  academicYearId: '', // Will be pre-filled from parent Academic Year
};

// Reusable FormFields Component for Academic Year
const AcademicYearFormFields = ({ formData, onFormChange, onCheckboxChange, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      <div className="sm:col-span-2">
        <Label htmlFor="yearName" className={labelTextClasses}>Academic Year Name <span className="text-red-500">*</span></Label>
        <Input id="yearName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="startDate" className={labelTextClasses}>Start Date <span className="text-red-500">*</span></Label>
        <Input id="startDate" name="startDate" type="date" value={formData.startDate || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="endDate" className={labelTextClasses}>End Date <span className="text-red-500">*</span></Label>
        <Input id="endDate" name="endDate" type="date" value={formData.endDate || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2 flex items-center space-x-2">
        <Checkbox
          id="isCurrent"
          name="isCurrent"
          checked={formData.isCurrent || false}
          onCheckedChange={(checked) => onCheckboxChange('isCurrent', checked)}
        />
        <Label htmlFor="isCurrent" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Set as Current Academic Year</Label>
      </div>
    </div>
  );
};

// Reusable FormFields Component for Term
const TermFormFields = ({ formData, onFormChange, academicYearName, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      <div className="sm:col-span-2">
        <Label htmlFor="termName" className={labelTextClasses}>Term Name <span className="text-red-500">*</span></Label>
        <Input id="termName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2">
        <Label className={labelTextClasses}>Academic Year</Label>
        <Input value={academicYearName} disabled className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="termStartDate" className={labelTextClasses}>Start Date <span className="text-red-500">*</span></Label>
        <Input id="termStartDate" name="startDate" type="date" value={formData.startDate || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="termEndDate" className={labelTextClasses}>End Date <span className="text-red-500">*</span></Label>
        <Input id="termEndDate" name="endDate" type="date" value={formData.endDate || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
    </div>
  );
};


export default function ManageAcademicYearsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [academicYears, setAcademicYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isYearDialogOpen, setIsYearDialogOpen] = useState(false);
  const [isTermDialogOpen, setIsTermDialogOpen] = useState(false);

  const [academicYearFormData, setAcademicYearFormData] = useState({ ...initialAcademicYearFormData });
  const [termFormData, setTermFormData] = useState({ ...initialTermFormData });

  const [editingAcademicYear, setEditingAcademicYear] = useState(null);
  const [editingTerm, setEditingTerm] = useState(null);
  const [parentAcademicYearForTerm, setParentAcademicYearForTerm] = useState(null); // For adding terms

  const [isSubmittingYear, setIsSubmittingYear] = useState(false);
  const [isSubmittingTerm, setIsSubmittingTerm] = useState(false);

  const [yearFormError, setYearFormError] = useState('');
  const [termFormError, setTermFormError] = useState('');

  const [expandedYears, setExpandedYears] = useState({}); // State to manage expanded rows

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  // --- Fetching Data ---
  const fetchAcademicYears = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academic-years`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch academic years.'); }
      const data = await response.json();
      setAcademicYears(data.academicYears || []);
    } catch (err) { toast.error("Error fetching academic years", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) {
      fetchAcademicYears();
    }
  }, [schoolData, session, fetchAcademicYears]);

  // --- Academic Year Form Handlers ---
  const handleAcademicYearFormChange = (e) => setAcademicYearFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleAcademicYearCheckboxChange = (name, checked) => setAcademicYearFormData(prev => ({ ...prev, [name]: checked }));

  const openAddAcademicYearDialog = () => {
    setEditingAcademicYear(null);
    setAcademicYearFormData({ ...initialAcademicYearFormData });
    setYearFormError('');
    setIsYearDialogOpen(true);
  };

  const openEditAcademicYearDialog = (year) => {
    setEditingAcademicYear(year);
    setAcademicYearFormData({
      id: year.id,
      name: year.name,
      startDate: year.startDate ? format(new Date(year.startDate), 'yyyy-MM-dd') : '',
      endDate: year.endDate ? format(new Date(year.endDate), 'yyyy-MM-dd') : '',
      isCurrent: year.isCurrent,
    });
    setYearFormError('');
    setIsYearDialogOpen(true);
  };

  const handleAcademicYearSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingYear(true); setYearFormError('');

    const isEditing = !!editingAcademicYear;
    const payload = {
      name: academicYearFormData.name,
      startDate: academicYearFormData.startDate ? new Date(academicYearFormData.startDate).toISOString() : null,
      endDate: academicYearFormData.endDate ? new Date(academicYearFormData.endDate).toISOString() : null,
      isCurrent: academicYearFormData.isCurrent,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/academic-years/${editingAcademicYear.id}`
      : `/api/schools/${schoolData.id}/academic-years`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} academic year.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setYearFormError(err);
      } else {
        toast.success(`Academic Year "${result.academicYear?.name}" ${actionText}d successfully!`);
        setIsYearDialogOpen(false);
        fetchAcademicYears(); // Re-fetch academic years
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setYearFormError('An unexpected error occurred.');
    } finally { setIsSubmittingYear(false); }
  };

  const handleDeleteAcademicYear = async (yearId, yearName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE academic year "${yearName}"? This will also delete all associated terms, classes, enrollments, and grades.`)) return;
    const toastId = `delete-year-${yearId}`;
    toast.loading("Deleting academic year...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academic-years/${yearId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Academic Year "${yearName}" deleted.`, { id: toastId });
      fetchAcademicYears();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Term Form Handlers ---
  const handleTermFormChange = (e) => setTermFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const openAddTermDialog = (academicYear) => {
    setEditingTerm(null);
    setParentAcademicYearForTerm(academicYear);
    setTermFormData({ ...initialTermFormData, academicYearId: academicYear.id });
    setTermFormError('');
    setIsTermDialogOpen(true);
  };

  const openEditTermDialog = (term, academicYear) => {
    setEditingTerm(term);
    setParentAcademicYearForTerm(academicYear);
    setTermFormData({
      id: term.id,
      name: term.name,
      startDate: term.startDate ? format(new Date(term.startDate), 'yyyy-MM-dd') : '',
      endDate: term.endDate ? format(new Date(term.endDate), 'yyyy-MM-dd') : '',
      academicYearId: term.academicYearId,
    });
    setTermFormError('');
    setIsTermDialogOpen(true);
  };

  const handleTermSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id || !parentAcademicYearForTerm) return;
    setIsSubmittingTerm(true); setTermFormError('');

    const isEditing = !!editingTerm;
    const payload = {
      name: termFormData.name,
      startDate: termFormData.startDate ? new Date(termFormData.startDate).toISOString() : null,
      endDate: termFormData.endDate ? new Date(termFormData.endDate).toISOString() : null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/academic-years/${parentAcademicYearForTerm.id}/terms/${editingTerm.id}`
      : `/api/schools/${schoolData.id}/academic-years/${parentAcademicYearForTerm.id}/terms`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} term.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setTermFormError(err);
      } else {
        toast.success(`Term "${result.term?.name}" ${actionText}d successfully!`);
        setIsTermDialogOpen(false);
        fetchAcademicYears(); // Re-fetch academic years to update terms list
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setTermFormError('An unexpected error occurred.');
    } finally { setIsSubmittingTerm(false); }
  };

  const handleDeleteTerm = async (termId, termName, academicYearId) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE term "${termName}"? This may affect associated grades and exams.`)) return;
    const toastId = `delete-term-${termId}`;
    toast.loading("Deleting term...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academic-years/${academicYearId}/terms/${termId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Term "${termName}" deleted.`, { id: toastId });
      fetchAcademicYears(); // Re-fetch academic years to update terms list
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  const toggleYearExpansion = (yearId) => {
    setExpandedYears(prev => ({
      ...prev,
      [yearId]: !prev[yearId],
    }));
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <CalendarDays className="mr-3 h-8 w-8 opacity-80"/>Manage Academic Years & Terms
          </h1>
          <p className={descriptionTextClasses}>Define and manage academic years and their associated terms/semesters.</p>
        </div>
        <Dialog open={isYearDialogOpen} onOpenChange={(open) => { setIsYearDialogOpen(open); if (!open) setYearFormError(''); }}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddAcademicYearDialog}> <FilePlus2 className="mr-2 h-4 w-4" /> Add New Academic Year </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingAcademicYear ? 'Edit Academic Year' : 'Add New Academic Year'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingAcademicYear ? 'Update academic year details.' : 'Create a new academic year for the school.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAcademicYearSubmit} className="space-y-6 py-1">
              <AcademicYearFormFields
                formData={academicYearFormData}
                onFormChange={handleAcademicYearFormChange}
                onCheckboxChange={handleAcademicYearCheckboxChange}
                isEdit={!!editingAcademicYear}
              />
              {yearFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{yearFormError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingYear}>
                  {isSubmittingYear ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingAcademicYear ? 'Saving...' : 'Creating...'}</> : editingAcademicYear ? 'Save Changes' : 'Create Academic Year'}
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
              <TableHead className={`${titleTextClasses} font-semibold w-12`}></TableHead> {/* For expand/collapse */}
              <TableHead className={`${titleTextClasses} font-semibold`}>Academic Year</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Start Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>End Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center hidden md:table-cell`}>Current</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-year-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-5 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="text-center hidden md:table-cell"><Skeleton className="h-5 w-10 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : academicYears.length > 0 ? academicYears.map((year) => (
              <>
                <TableRow key={year.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => toggleYearExpansion(year.id)} className="h-6 w-6">
                      {expandedYears[year.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell className={`${descriptionTextClasses} font-medium`}>{year.name}</TableCell>
                  <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{formatDisplayDate(year.startDate)}</TableCell>
                  <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{formatDisplayDate(year.endDate)}</TableCell>
                  <TableCell className={`text-center hidden md:table-cell`}>
                    {year.isCurrent ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-red-500 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 md:gap-2">
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditAcademicYearDialog(year)} title="Edit Academic Year"> <Edit3 className="h-4 w-4" /> </Button>
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openAddTermDialog(year)} title="Add Term to this Year"> <PlusCircle className="h-4 w-4" /> </Button>
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteAcademicYear(year.id, year.name)} title="Delete Academic Year"> <Trash2 className="h-4 w-4" /> </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedYears[year.id] && (
                  <TableRow key={`${year.id}-terms`} className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <TableCell colSpan="6" className="p-0">
                      <div className="p-4 pl-8">
                        <h4 className={`text-lg font-semibold ${titleTextClasses} mb-3`}>Terms for {year.name}</h4>
                        {year.terms && year.terms.length > 0 ? (
                          <Table className="w-full">
                            <TableHeader>
                              <TableRow className="bg-zinc-100 dark:bg-zinc-800">
                                <TableHead className={`${titleTextClasses} font-semibold`}>Term Name</TableHead>
                                <TableHead className={`${titleTextClasses} font-semibold`}>Start Date</TableHead>
                                <TableHead className={`${titleTextClasses} font-semibold`}>End Date</TableHead>
                                <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {year.terms.map(term => (
                                <TableRow key={term.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
                                  <TableCell className={descriptionTextClasses}>{term.name}</TableCell>
                                  <TableCell className={descriptionTextClasses}>{formatDisplayDate(term.startDate)}</TableCell>
                                  <TableCell className={descriptionTextClasses}>{formatDisplayDate(term.endDate)}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1 md:gap-2">
                                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditTermDialog(term, year)} title="Edit Term"> <Edit3 className="h-4 w-4" /> </Button>
                                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteTerm(term.id, term.name, year.id)} title="Delete Term"> <Trash2 className="h-4 w-4" /> </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className={`${descriptionTextClasses} italic`}>No terms defined for this academic year.</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="6" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No academic years defined yet. Click "Add New Academic Year" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Term Dialog (for Add/Edit Term) */}
      <Dialog open={isTermDialogOpen} onOpenChange={(open) => { setIsTermDialogOpen(open); if (!open) setTermFormError(''); }}>
        <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>{editingTerm ? 'Edit Term' : 'Add New Term'}</DialogTitle>
            <DialogDescription className={descriptionTextClasses}>
              {editingTerm ? 'Update term details.' : `Define a new term for ${parentAcademicYearForTerm?.name || 'the selected academic year'}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTermSubmit} className="space-y-6 py-1">
            <TermFormFields
              formData={termFormData}
              onFormChange={handleTermFormChange}
              academicYearName={parentAcademicYearForTerm?.name || ''}
              isEdit={!!editingTerm}
            />
            {termFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{termFormError}</p> )}
            <DialogFooter className="pt-6">
              <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
              <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingTerm}>
                {isSubmittingTerm ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingTerm ? 'Saving...' : 'Creating...'}</> : editingTerm ? 'Save Changes' : 'Create Term'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
