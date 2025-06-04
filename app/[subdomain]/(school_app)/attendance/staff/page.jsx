// app/[subdomain]/(school_app)/attendance/staff/page.jsx
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FilePlus2, Edit3, Trash2, ClipboardList, Loader2, AlertTriangle, PlusCircle, UserCog, CalendarDays
} from 'lucide-react';

// Initial form data for Staff Attendance
const initialStaffAttendanceFormData = {
  id: null,
  staffId: '',
  date: '',
  status: '', // PRESENT, ABSENT, LATE, EXCUSED
  remarks: '',
};

// Reusable FormFields Component for Staff Attendance
const StaffAttendanceFormFields = ({ formData, onFormChange, onSelectChange, staffList, isLoadingDeps }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const attendanceStatusOptions = [
    { value: 'PRESENT', label: 'Present' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'LATE', label: 'Late' },
    { value: 'EXCUSED', label: 'Excused' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div>
        <Label htmlFor="staffId" className={labelTextClasses}>Staff Member <span className="text-red-500">*</span></Label>
        <Select name="staffId" value={formData.staffId || ''} onValueChange={(value) => onSelectChange('staffId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select staff member" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isLoadingDeps && (!Array.isArray(staffList) || staffList.length === 0) && <SelectItem value="no-staff" disabled>No staff available</SelectItem>}
            {Array.isArray(staffList) && staffList.map(staff => (
              <SelectItem key={staff.id} value={staff.id}>
                {`${staff.user?.firstName || ''} ${staff.user?.lastName || ''} (${staff.jobTitle || 'Staff'})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="date" className={labelTextClasses}>Date <span className="text-red-500">*</span></Label>
        <Input id="date" name="date" type="date" value={formData.date || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="status" className={labelTextClasses}>Attendance Status <span className="text-red-500">*</span></Label>
        <Select name="status" value={formData.status || ''} onValueChange={(value) => onSelectChange('status', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select status" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {attendanceStatusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="remarks" className={labelTextClasses}>Remarks (Optional)</Label>
        <Textarea id="remarks" name="remarks" value={formData.remarks || ''} onChange={onFormChange} rows={2} className={`${inputTextClasses} mt-1`} />
      </div>
    </div>
  );
};


export default function ManageStaffAttendancePage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [staffAttendances, setStaffAttendances] = useState([]);
  const [staffList, setStaffList] = useState([]); // List of staff for dropdowns
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true);
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...initialStaffAttendanceFormData });
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  // --- Fetching Data ---
  const fetchStaffAttendances = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/attendance/staff`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch staff attendance records.'); }
      const data = await response.json();
      setStaffAttendances(data.staffAttendances || []);
    } catch (err) { toast.error("Error fetching attendance", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;

    try {
      const [staffRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/staff/teachers`), // Fetch all staff (or just teachers if preferred)
      ]);

      // Process Staff List
      if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
        const staffData = await staffRes.value.json();
        setStaffList(Array.isArray(staffData.teachers) ? staffData.teachers : []); // Ensure it's an array
      } else {
        const errorData = staffRes.status === 'rejected' ? staffRes.reason : await staffRes.value.json().catch(() => ({}));
        console.error("Staff list fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch staff list.');
      }

      if (overallError) {
        throw overallError;
      }

    } catch (err) {
      toast.error("Error fetching form dependencies", { description: err.message });
      setError(err.message);
      console.error("Dependency fetch error caught:", err);
    } finally {
      setIsLoadingDeps(false);
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) {
      fetchStaffAttendances();
      fetchDropdownDependencies();
    }
  }, [schoolData, session, fetchStaffAttendances, fetchDropdownDependencies]);

  // --- Form Handlers ---
  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const openAddDialog = () => {
    setEditingAttendance(null);
    setFormData({ ...initialStaffAttendanceFormData, date: format(new Date(), 'yyyy-MM-dd') }); // Pre-fill with current date
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (attendance) => {
    setEditingAttendance(attendance);
    setFormData({
      id: attendance.id,
      staffId: attendance.staffId,
      date: attendance.date ? format(new Date(attendance.date), 'yyyy-MM-dd') : '',
      status: attendance.status,
      remarks: attendance.remarks || '',
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true); setFormError('');

    const isEditing = !!editingAttendance;
    const payload = {
      staffId: formData.staffId,
      date: formData.date ? new Date(formData.date).toISOString() : null, // Ensure ISO string
      status: formData.status,
      remarks: formData.remarks || null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/attendance/staff/${editingAttendance.id}`
      : `/api/schools/${schoolData.id}/attendance/staff`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} attendance record.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setFormError(err);
      } else {
        toast.success(`Attendance record ${actionText}d successfully!`);
        setIsDialogOpen(false);
        fetchStaffAttendances(); // Re-fetch records
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setFormError('An unexpected error occurred.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (attendanceId) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE this attendance record?`)) return;
    const toastId = `delete-attendance-${attendanceId}`;
    toast.loading("Deleting record...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/attendance/staff/${attendanceId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Attendance record deleted.`, { id: toastId });
      fetchStaffAttendances();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Helper Functions for Display ---
  const getStaffName = useCallback((id) => {
    const staff = staffList.find(s => s.id === id);
    return staff ? `${staff.user?.firstName || ''} ${staff.user?.lastName || ''}`.trim() : 'N/A';
  }, [staffList]);

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <ClipboardList className="mr-3 h-8 w-8 opacity-80"/>Manage Staff Attendance
          </h1>
          <p className={descriptionTextClasses}>Record and view daily attendance for staff members.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(''); }}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}> <FilePlus2 className="mr-2 h-4 w-4" /> Record New Attendance </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingAttendance ? 'Edit Attendance Record' : 'Record New Attendance'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingAttendance ? 'Update details for this attendance entry.' : 'Fill in the attendance details for a staff member.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
              <StaffAttendanceFormFields
                formData={formData}
                onFormChange={handleFormChange}
                onSelectChange={handleSelectChange}
                staffList={staffList}
                isLoadingDeps={isLoadingDeps}
              />
              {formError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingDeps}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingAttendance ? 'Saving...' : 'Recording...'}</> : editingAttendance ? 'Save Changes' : 'Record Attendance'}
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
              <TableHead className={`${titleTextClasses} font-semibold`}>Staff Member</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Job Title</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center`}>Status</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Remarks</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-48 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : staffAttendances.length > 0 ? staffAttendances.map((attendance) => (
              <TableRow key={attendance.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{getStaffName(attendance.staffId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{attendance.staff?.jobTitle || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses}`}>{formatDisplayDate(attendance.date)}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-center`}>{attendance.status}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{attendance.remarks || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(attendance)} title="Edit Attendance"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(attendance.id)} title="Delete Attendance"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="6" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No staff attendance records found. Click "Record New Attendance" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
