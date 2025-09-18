// app/[subdomain]/(school_app)/finance/fee-structures/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { format } from 'date-fns'; // For displaying dates if needed

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FilePlus2, Edit3, Trash2, DollarSign, Loader2, AlertTriangle, PlusCircle, CalendarDays, BookOpen, Layers, Briefcase, FileText, Filter
} from 'lucide-react'; // Added Filter icon
import { Switch } from '@/components/ui/switch';
import { Select as MiniSelect, SelectContent as MiniSelectContent, SelectItem as MiniSelectItem, SelectTrigger as MiniSelectTrigger, SelectValue as MiniSelectValue } from '@/components/ui/select';

// Initial form data for Fee Structure
const initialFeeStructureFormData = {
  id: null,
  name: '',
  description: '',
  amount: '',
  frequency: '', // ONE_TIME, MONTHLY, TERMLY, ANNUALLY
  academicYearId: '',
  classId: '', // Optional
  schoolLevelId: '', // NEW: Optional, but needs to be added
};

// Reusable FormFields Component for Fee Structure
// Added schoolLevelsList prop
const FeeStructureFormFields = ({ formData, onFormChange, onSelectChange, academicYearsList, classesList, schoolLevelsList, isLoadingDeps }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const feeFrequencyOptions = [
    { value: 'ONE_TIME', label: 'One Time' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'TERMLY', label: 'Termly' },
    { value: 'ANNUALLY', label: 'Annually' },
  ];

  // Filter classes by academic year if relevant, for better UX
  const filteredClasses = useMemo(() => {
    if (formData.academicYearId && Array.isArray(classesList)) {
      return classesList.filter(cls => cls.academicYearId === formData.academicYearId);
    }
    return classesList;
  }, [formData.academicYearId, classesList]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor="feeName" className={labelTextClasses}>Fee Name <span className="text-red-500">*</span></Label>
        <Input id="feeName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="amount" className={labelTextClasses}>Amount <span className="text-red-500">*</span></Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0" value={formData.amount || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., 500.00" />
      </div>
      <div>
        <Label htmlFor="frequency" className={labelTextClasses}>Frequency <span className="text-red-500">*</span></Label>
        <Select name="frequency" value={formData.frequency || ''} onValueChange={(value) => onSelectChange('frequency', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select frequency" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {feeFrequencyOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="academicYearId" className={labelTextClasses}>Academic Year <span className="text-red-500">*</span></Label>
        <Select name="academicYearId" value={formData.academicYearId || ''} onValueChange={(value) => onSelectChange('academicYearId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select academic year" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isLoadingDeps && (!Array.isArray(academicYearsList) || academicYearsList.length === 0) && <SelectItem value="no-years" disabled>No academic years available</SelectItem>}
            {Array.isArray(academicYearsList) && academicYearsList.map(year => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* NEW: School Level Selector */}
      <div>
        <Label htmlFor="schoolLevelId" className={labelTextClasses}>School Level (Optional)</Label>
        <Select name="schoolLevelId" value={formData.schoolLevelId || 'none'} onValueChange={(value) => onSelectChange('schoolLevelId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select school level" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">All School Levels</SelectItem>
            {!isLoadingDeps && (!Array.isArray(schoolLevelsList) || schoolLevelsList.length === 0) && <SelectItem value="no-levels" disabled>No school levels available</SelectItem>}
            {Array.isArray(schoolLevelsList) && schoolLevelsList.map(level => <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* Existing Class Selector - now considering schoolLevelId if needed for filtering */}
      <div>
        <Label htmlFor="classId" className={labelTextClasses}>Class (Optional)</Label>
        <Select name="classId" value={formData.classId || 'none'} onValueChange={(value) => onSelectChange('classId', value === 'none' ? '' : value)} disabled={isLoadingDeps || !formData.academicYearId}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select class" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">All Classes</SelectItem>
            {!formData.academicYearId && <SelectItem value="select-year-first" disabled>Select Academic Year First</SelectItem>}
            {!isLoadingDeps && (!Array.isArray(filteredClasses) || filteredClasses.length === 0) && formData.academicYearId && <SelectItem value="no-classes" disabled>No classes for this year</SelectItem>}
            {Array.isArray(filteredClasses) && filteredClasses.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="description" className={labelTextClasses}>Description (Optional)</Label>
        <Textarea id="description" name="description" value={formData.description || ''} onChange={onFormChange} rows={2} className={`${inputTextClasses} mt-1`} />
      </div>
    </div>
  );
};


export default function ManageFeeStructuresPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [feeStructures, setFeeStructures] = useState([]);
  const [academicYears, setAcademicYears] = useState([]); // For dropdowns
  const [classes, setClasses] = useState([]); // For dropdowns
  const [schoolLevels, setSchoolLevels] = useState([]); // NEW: For dropdowns

  const [isLoading, setIsLoading] = useState(true); // For main table
  const [isLoadingDeps, setIsLoadingDeps] = useState(true); // For dropdowns
  const [error, setError] = useState('');

  // Filters for the table display
  const [filterAcademicYearId, setFilterAcademicYearId] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSchoolLevelId, setFilterSchoolLevelId] = useState(''); // NEW filter

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...initialFeeStructureFormData });
  const [editingFeeStructure, setEditingFeeStructure] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // NEW STATES: For component inclusion toggle and frequency filter
  const [includeComponents, setIncludeComponents] = useState(false);
  const [frequencyFilter, setFrequencyFilter] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const filterInputClasses = 'bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500';


  // --- Fetching Data ---
  const fetchFeeStructures = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const queryParams = new URLSearchParams();
      if (filterAcademicYearId) queryParams.append('academicYearId', filterAcademicYearId);
      if (filterClassId) queryParams.append('classId', filterClassId);
      if (filterSchoolLevelId) queryParams.append('schoolLevelId', filterSchoolLevelId);
      if (frequencyFilter) queryParams.append('frequency', frequencyFilter);
      if (includeComponents) queryParams.append('includeComponents','1');
      const response = await fetch(`/api/schools/${schoolData.id}/finance/fee-structures?${queryParams.toString()}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch fee structures.'); }
      const data = await response.json();
      setFeeStructures(data.feeStructures || []);
    } catch (err) { toast.error("Error fetching fee structures", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id, filterAcademicYearId, filterClassId, filterSchoolLevelId, includeComponents, frequencyFilter]);


  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;

    try {
      const [academicYearsRes, classesRes, schoolLevelsRes] = await Promise.allSettled([ // NEW: Fetch schoolLevels
        fetch(`/api/schools/${schoolData.id}/academic-years`),
        fetch(`/api/schools/${schoolData.id}/academics/classes`),
        fetch(`/api/schools/${schoolData.id}/academics/school-levels`),
      ]);

      // Process Academic Years
      if (academicYearsRes.status === 'fulfilled' && academicYearsRes.value.ok) {
        const academicYearsData = await academicYearsRes.value.json();
        setAcademicYears(Array.isArray(academicYearsData.academicYears) ? academicYearsData.academicYears : []);
      } else {
        const errorData = academicYearsRes.status === 'rejected' ? academicYearsRes.reason : await academicYearsRes.value.json().catch(() => ({}));
        console.error("Academic Years fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch academic years.');
      }

      // Process Classes
      if (classesRes.status === 'fulfilled' && classesRes.value.ok) {
        const classesData = await classesRes.value.json();
        setClasses(Array.isArray(classesData.classes) ? classesData.classes : []);
      } else {
        const errorData = classesRes.status === 'rejected' ? classesRes.reason : await classesRes.value.json().catch(() => ({}));
        console.error("Classes fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch classes.');
      }

      // NEW: Process School Levels
      if (schoolLevelsRes.status === 'fulfilled' && schoolLevelsRes.value.ok) {
        const schoolLevelsData = await schoolLevelsRes.value.json();
        setSchoolLevels(Array.isArray(schoolLevelsData.schoolLevels) ? schoolLevelsData.schoolLevels : []);
      } else {
        const errorData = schoolLevelsRes.status === 'rejected' ? schoolLevelsRes.reason : await schoolLevelsRes.value.json().catch(() => ({}));
        console.error("School Levels fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch school levels.');
      }

      if (overallError) {
        throw overallError;
      }

    } catch (err) {
      toast.error("Error fetching dropdown dependencies", { description: err.message });
      setError(err.message);
      console.error("Dependency fetch error caught:", err);
    } finally {
      setIsLoadingDeps(false);
    }
  }, [schoolData?.id]);


  useEffect(() => {
    if (schoolData?.id && session) {
      fetchFeeStructures();
      fetchDropdownDependencies();
    }
  }, [schoolData, session, fetchFeeStructures, fetchDropdownDependencies]);

  // --- Form Handlers ---
  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const openAddDialog = () => {
    setEditingFeeStructure(null);
    setFormData({ ...initialFeeStructureFormData });
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (feeStructure) => {
    setEditingFeeStructure(feeStructure);
    setFormData({
      id: feeStructure.id,
      name: feeStructure.name || '',
      description: feeStructure.description || '',
      amount: feeStructure.amount?.toString() || '',
      frequency: feeStructure.frequency || '',
      academicYearId: feeStructure.academicYearId || '',
      classId: feeStructure.classId || '',
      schoolLevelId: feeStructure.schoolLevelId || '', // NEW: Populate from existing data
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true); setFormError('');

    const isEditing = !!editingFeeStructure;
    const payload = {
      name: formData.name,
      description: formData.description || null,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      academicYearId: formData.academicYearId,
      classId: formData.classId || null,
      schoolLevelId: formData.schoolLevelId || null, // NEW: Include in payload
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/finance/fee-structures/${editingFeeStructure.id}`
      : `/api/schools/${schoolData.id}/finance/fee-structures`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} fee structure.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setFormError(err);
      } else {
        toast.success(`Fee Structure "${result.feeStructure?.name}" ${actionText}d successfully!`);
        setIsDialogOpen(false);
        fetchFeeStructures(); // Re-fetch fee structures
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setFormError('An unexpected error occurred.');
    } finally { setIsLoading(false); }
  };

  const handleDelete = async (feeStructureId, feeStructureName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE fee structure "${feeStructureName}"? This may affect existing invoices.`)) return;
    const toastId = `delete-fee-structure-${feeStructureId}`;
    toast.loading("Deleting fee structure...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/fee-structures/${feeStructureId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Fee structure "${feeStructureName}" deleted.`, { id: toastId });
      fetchFeeStructures();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Helper Functions for Display ---
  const getAcademicYearName = useCallback((id) => {
    const year = academicYears.find(y => y.id === id);
    return year ? year.name : 'N/A';
  }, [academicYears]);

  const getClassName = useCallback((id) => {
    const cls = classes.find(c => c.id === id);
    return cls ? cls.name : 'N/A';
  }, [classes]);

  // NEW: Helper for School Level Name
  const getSchoolLevelName = useCallback((id) => {
    const level = schoolLevels.find(s => s.id === id);
    return level ? level.name : 'N/A';
  }, [schoolLevels]);


  return (
    <div className="space-y-8">
      {/* Controls Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-6 w-full">
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Frequency</label>
            <MiniSelect value={frequencyFilter || 'ALL'} onValueChange={(val)=> setFrequencyFilter(val === 'ALL' ? '' : val)}>
              <MiniSelectTrigger className="h-9 w-44 bg-white/50 dark:bg-zinc-800/50">
                <MiniSelectValue placeholder="All" />
              </MiniSelectTrigger>
              <MiniSelectContent className="bg-white dark:bg-zinc-900">
                <MiniSelectItem value="ALL">All</MiniSelectItem>
                <MiniSelectItem value="ONE_TIME">One Time</MiniSelectItem>
                <MiniSelectItem value="MONTHLY">Monthly</MiniSelectItem>
                <MiniSelectItem value="TERMLY">Termly</MiniSelectItem>
                <MiniSelectItem value="ANNUALLY">Annually</MiniSelectItem>
              </MiniSelectContent>
            </MiniSelect>
          </div>
          <div className="flex items-center gap-3 mt-2 md:mt-0">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Components</span>
              <div className="flex items-center gap-2">
                <Switch checked={includeComponents} onCheckedChange={setIncludeComponents} />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Include</span>
              </div>
            </div>
          </div>
          {feeStructures?.length > 0 && (
            <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">{feeStructures.length} structure{feeStructures.length!==1 && 's'} loaded</div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <FileText className="mr-3 h-8 w-8 opacity-80"/>Manage Fee Structures
          </h1>
          <p className={descriptionTextClasses}>Define tuition fees and other charges for academic years, school levels, and classes.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(''); }}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}> <PlusCircle className="mr-2 h-4 w-4" /> Add New Fee Structure </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingFeeStructure ? 'Edit Fee Structure' : 'Add New Fee Structure'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingFeeStructure ? 'Update fee structure details.' : 'Create a new fee structure for the school.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
              <FeeStructureFormFields
                formData={formData}
                onFormChange={handleFormChange}
                onSelectChange={handleSelectChange}
                academicYearsList={academicYears}
                classesList={classes}
                schoolLevelsList={schoolLevels} // NEW: Pass schoolLevelsList
                isLoadingDeps={isLoadingDeps}
              />
              {formError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingDeps}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingFeeStructure ? 'Saving...' : 'Creating...'}</> : editingFeeStructure ? 'Save Changes' : 'Create Fee Structure'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      {/* Fee Structure Filters */}
      <div className={`${glassCardClasses} flex flex-wrap items-center gap-4`}>
        <h3 className={`text-md font-semibold ${titleTextClasses} mr-2`}>Filters:</h3>
        <Select value={filterAcademicYearId} onValueChange={(value) => setFilterAcademicYearId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Year" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Academic Years</SelectItem>
            {Array.isArray(academicYears) && academicYears.map(year => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterSchoolLevelId} onValueChange={(value) => setFilterSchoolLevelId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Level" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All School Levels</SelectItem>
            {Array.isArray(schoolLevels) && schoolLevels.map(level => <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterClassId} onValueChange={(value) => setFilterClassId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Class" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Classes</SelectItem>
            {Array.isArray(classes) && classes.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button onClick={() => { setFilterAcademicYearId(''); setFilterClassId(''); setFilterSchoolLevelId(''); }} variant="outline" className={outlineButtonClasses}>
          Reset Filters
        </Button>
      </div>

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Fee Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Amount</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Frequency</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Academic Year</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>School Level</TableHead> {/* NEW TableHead */}
              <TableHead className={`${titleTextClasses} font-semibold hidden lg:table-cell`}>Class</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell> {/* Skeleton for new column */}
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-12 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : feeStructures.length > 0 ? feeStructures.map((fee) => (
              <TableRow key={fee.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{fee.name}</TableCell>
                <TableCell className={`${descriptionTextClasses}`}>${fee.amount.toFixed(2)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{fee.frequency}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{getAcademicYearName(fee.academicYearId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{fee.schoolLevelId ? getSchoolLevelName(fee.schoolLevelId) : 'All'}</TableCell> {/* NEW TableCell */}
                <TableCell className={`${descriptionTextClasses} hidden lg:table-cell`}>{fee.classId ? getClassName(fee.classId) : 'All'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(fee)} title="Edit Fee Structure"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(fee.id, fee.name)} title="Delete Fee Structure"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="7" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No fee structures defined yet. Click "Add New Fee Structure" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
