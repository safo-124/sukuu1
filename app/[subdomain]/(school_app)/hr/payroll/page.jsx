// app/[subdomain]/(school_app)/hr/payroll/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns'; // For date formatting and validation

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
import { Textarea } from "@/components/ui/textarea"; // For notes
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // For isPaid
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FilePlus2, Edit3, Trash2, DollarSign, Loader2, AlertTriangle, PlusCircle, User, Briefcase, CalendarDays, Printer, Receipt, CheckCircle, XCircle
} from 'lucide-react'; // Added CheckCircle, XCircle icons

// Initial form data for Payroll Record
const initialPayrollFormData = {
  id: null,
  staffId: '',
  payPeriodStart: '',
  payPeriodEnd: '',
  basicSalary: '',
  allowances: '',
  deductions: '',
  paymentDate: '',
  isPaid: false,
};

// Reusable FormFields Component for Payroll Record
const PayrollFormFields = ({ formData, onFormChange, onSelectChange, onCheckboxChange, staffList, isLoadingDeps }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const getStaffFullName = useCallback((id) => {
    const staff = staffList.find(s => s.id === id);
    return staff ? `${staff.user?.firstName || ''} ${staff.user?.lastName || ''} (${staff.jobTitle})` : 'N/A';
  }, [staffList]);

  // Calculate Net Salary dynamically in the form
  const netSalary = useMemo(() => {
    const basic = parseFloat(formData.basicSalary) || 0;
    const allow = parseFloat(formData.allowances) || 0;
    const ded = parseFloat(formData.deductions) || 0;
    return (basic + allow - ded).toFixed(2);
  }, [formData.basicSalary, formData.allowances, formData.deductions]);


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div>
        <Label htmlFor="staffId" className={labelTextClasses}>Staff Member <span className="text-red-500">*</span></Label>
        {formData.id ? ( // If editing, staffId is usually not editable
          <Input value={getStaffFullName(formData.staffId)} disabled className={`${inputTextClasses} mt-1`} />
        ) : (
          <Select name="staffId" value={formData.staffId || ''} onValueChange={(value) => onSelectChange('staffId', value)} disabled={isLoadingDeps}>
            <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select staff member" /> </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              {!isLoadingDeps && (!Array.isArray(staffList) || staffList.length === 0) && <SelectItem value="no-staff" disabled>No staff available</SelectItem>}
              {Array.isArray(staffList) && staffList.map(staff => (
                <SelectItem key={staff.id} value={staff.id}>
                  {getStaffFullName(staff.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div>
        <Label htmlFor="payPeriodStart" className={labelTextClasses}>Pay Period Start Date <span className="text-red-500">*</span></Label>
        <Input id="payPeriodStart" name="payPeriodStart" type="date" value={formData.payPeriodStart || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="payPeriodEnd" className={labelTextClasses}>Pay Period End Date <span className="text-red-500">*</span></Label>
        <Input id="payPeriodEnd" name="payPeriodEnd" type="date" value={formData.payPeriodEnd || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2 border-t pt-4 mt-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Financial Details</div>
      <div>
        <Label htmlFor="basicSalary" className={labelTextClasses}>Basic Salary <span className="text-red-500">*</span></Label>
        <Input id="basicSalary" name="basicSalary" type="number" step="0.01" min="0" value={formData.basicSalary || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="allowances" className={labelTextClasses}>Allowances (Optional)</Label>
        <Input id="allowances" name="allowances" type="number" step="0.01" min="0" value={formData.allowances || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="deductions" className={labelTextClasses}>Deductions (Optional)</Label>
        <Input id="deductions" name="deductions" type="number" step="0.01" min="0" value={formData.deductions || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="netSalaryDisplay" className={labelTextClasses}>Net Salary</Label>
        <Input id="netSalaryDisplay" value={`$${netSalary}`} disabled className={`${inputTextClasses} mt-1 font-bold`} />
      </div>
      <div>
        <Label htmlFor="paymentDate" className={labelTextClasses}>Payment Date (Optional)</Label>
        <Input id="paymentDate" name="paymentDate" type="date" value={formData.paymentDate || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2 flex items-center space-x-2">
        <Checkbox
          id="isPaid"
          name="isPaid"
          checked={formData.isPaid || false}
          onCheckedChange={(checked) => onCheckboxChange('isPaid', checked)}
        />
        <Label htmlFor="isPaid" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mark as Paid</Label>
      </div>
    </div>
  );
};


export default function ManagePayrollPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [payrollRecords, setPayrollRecords] = useState([]);
  const [staffList, setStaffList] = useState([]); // For staff dropdown in form

  const [isLoading, setIsLoading] = useState(true); // For main table
  const [isLoadingDeps, setIsLoadingDeps] = useState(true); // For dropdowns
  const [error, setError] = useState('');

  // Filters
  const [filterStaffId, setFilterStaffId] = useState('');
  const [filterPayPeriodStartFrom, setFilterPayPeriodStartFrom] = useState('');
  const [filterPayPeriodEndTo, setFilterPayPeriodEndTo] = useState('');
  const [filterIsPaid, setFilterIsPaid] = useState('all'); // 'all', 'true', 'false'

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false); // For payslip dialog
  const [selectedRecordForPayslip, setSelectedRecordForPayslip] = useState(null); // Data for payslip

  const [formData, setFormData] = useState({ ...initialPayrollFormData });
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const filterInputClasses = 'bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500'; // FIX: Defined here

  // --- Fetching Data ---
  const fetchPayrollRecords = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const queryParams = new URLSearchParams();
      if (filterStaffId) queryParams.append('staffId', filterStaffId);
      if (filterPayPeriodStartFrom) queryParams.append('payPeriodStartFrom', filterPayPeriodStartFrom);
      if (filterPayPeriodEndTo) queryParams.append('payPeriodEndTo', filterPayPeriodEndTo);
      if (filterIsPaid !== 'all') queryParams.append('isPaid', filterIsPaid);

      const response = await fetch(`/api/schools/${schoolData.id}/hr/payroll?${queryParams.toString()}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch payroll records.'); }
      const data = await response.json();
      setPayrollRecords(data.payrollRecords || []);
    } catch (err) { toast.error("Error fetching payroll records", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id, filterStaffId, filterPayPeriodStartFrom, filterPayPeriodEndTo, filterIsPaid]);


  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;

    try {
      const [staffRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/people/teachers`), // Fetch all staff (teachers) for dropdown
      ]);

      // Process Staff List
      if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
        const staffData = await staffRes.value.json();
        // Assuming your teachers API returns staff members with user data
        setStaffList(Array.isArray(staffData.teachers) ? staffData.teachers : []);
      } else {
        const errorData = staffRes.status === 'rejected' ? staffRes.reason : await staffRes.value.json().catch(() => ({}));
        console.error("Staff list fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch staff list for dropdown.');
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
      fetchPayrollRecords();
      fetchDropdownDependencies();
    }
  }, [schoolData, session, fetchPayrollRecords, fetchDropdownDependencies]);


  // --- Payroll Form Handlers ---
  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));
  const handleCheckboxChange = (name, checked) => setFormData(prev => ({ ...prev, [name]: checked }));

  const openAddDialog = () => {
    setEditingRecord(null);
    setFormData({ ...initialPayrollFormData });
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setFormData({
      id: record.id,
      staffId: record.staffId,
      payPeriodStart: record.payPeriodStart ? format(new Date(record.payPeriodStart), 'yyyy-MM-dd') : '',
      payPeriodEnd: record.payPeriodEnd ? format(new Date(record.payPeriodEnd), 'yyyy-MM-dd') : '',
      basicSalary: record.basicSalary?.toString() || '',
      allowances: record.allowances?.toString() || '',
      deductions: record.deductions?.toString() || '',
      paymentDate: record.paymentDate ? format(new Date(record.paymentDate), 'yyyy-MM-dd') : '',
      isPaid: record.isPaid,
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true); setFormError('');

    const isEditing = !!editingRecord;
    const payload = {
      staffId: formData.staffId,
      payPeriodStart: new Date(formData.payPeriodStart).toISOString(),
      payPeriodEnd: new Date(formData.payPeriodEnd).toISOString(),
      basicSalary: parseFloat(formData.basicSalary),
      allowances: formData.allowances ? parseFloat(formData.allowances) : null,
      deductions: formData.deductions ? parseFloat(formData.deductions) : null,
      paymentDate: formData.paymentDate ? new Date(formData.paymentDate).toISOString() : null,
      isPaid: formData.isPaid,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/hr/payroll/${editingRecord.id}`
      : `/api/schools/${schoolData.id}/hr/payroll`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} payroll record.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setFormError(err);
      } else {
        toast.success(`Payroll record ${actionText}d successfully!`);
        setIsDialogOpen(false);
        fetchPayrollRecords(); // Re-fetch records
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setFormError('An unexpected error occurred.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (recordId) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE this payroll record?`)) return;
    const toastId = `delete-payroll-record-${recordId}`;
    toast.loading("Deleting record...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/hr/payroll/${recordId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Payroll record deleted.`, { id: toastId });
      fetchPayrollRecords(); // Re-fetch records
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Payslip Generation Logic ---
  const handleGeneratePayslip = (record) => {
    setSelectedRecordForPayslip(record);
    setIsPayslipDialogOpen(true);
    // The dialog itself will contain the print functionality
  };

  const PayslipContent = ({ record, schoolData }) => {
    if (!record || !schoolData) return <p className="text-zinc-500">No payroll record data available.</p>;

    const staff = record.staff;
    const user = staff?.user;

    return (
      <div className="p-6 border rounded-md shadow-lg bg-white dark:bg-zinc-800 text-black dark:text-white print:shadow-none print:border-none">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-sky-700 dark:text-sky-300">{schoolData.name}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{schoolData.address || 'N/A'}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{schoolData.contactInfo || 'N/A'}</p>
        </div>

        <div className="mb-6 border-b pb-4 border-zinc-200 dark:border-zinc-700">
          <h3 className="text-xl font-semibold mb-2">Payslip Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Record ID:</div><div>{record.id}</div>
            <div className="font-medium">Pay Period:</div><div>{isValid(new Date(record.payPeriodStart)) ? format(new Date(record.payPeriodStart), 'MMM dd,yyyy') : 'N/A'} - {isValid(new Date(record.payPeriodEnd)) ? format(new Date(record.payPeriodEnd), 'MMM dd,yyyy') : 'N/A'}</div>
            <div className="font-medium">Payment Date:</div><div>{record.paymentDate ? (isValid(new Date(record.paymentDate)) ? format(new Date(record.paymentDate), 'MMM dd,yyyy') : 'N/A') : 'Not Paid'}</div>
            <div className="font-medium">Status:</div><div className={`${record.isPaid ? 'text-green-600' : 'text-red-600'} font-semibold`}>{record.isPaid ? 'PAID' : 'UNPAID'}</div>
          </div>
        </div>

        <div className="mb-6 border-b pb-4 border-zinc-200 dark:border-zinc-700">
          <h3 className="text-xl font-semibold mb-2">Employee Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Name:</div><div>{user ? `${user.firstName} ${user.lastName}` : 'N/A'}</div>
            <div className="font-medium">Staff ID:</div><div>{staff ? staff.staffIdNumber : 'N/A'}</div>
            <div className="font-medium">Job Title:</div><div>{staff ? staff.jobTitle : 'N/A'}</div>
            <div className="font-medium">Email:</div><div>{user ? user.email : 'N/A'}</div>
          </div>
        </div>

        <div className="text-center mb-6 py-4 border-b border-2 border-dashed border-zinc-300 dark:border-zinc-700">
          <h3 className="text-3xl font-bold text-sky-600 dark:text-sky-400">Net Pay: ${record.netSalary.toFixed(2)}</h3>
        </div>

        <div className="text-sm text-zinc-700 dark:text-zinc-300 print:hidden">
          <p className="mt-4 text-center text-xs">This is an auto-generated payslip and may not require a signature.</p>
        </div>
      </div>
    );
  };


  // --- Helper Functions for Display (reusing from above where possible) ---
  const getStaffNameForFilter = useCallback((id) => {
    const staff = staffList.find(s => s.id === id);
    return staff ? `${staff.user?.firstName || ''} ${staff.user?.lastName || ''}` : 'N/A';
  }, [staffList]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Briefcase className="mr-3 h-8 w-8 opacity-80"/>Manage Payroll
          </h1>
          <p className={descriptionTextClasses}>Track staff salaries, allowances, deductions, and generate payslips.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(''); }}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}> <PlusCircle className="mr-2 h-4 w-4" /> Add Payroll Record </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingRecord ? 'Edit Payroll Record' : 'Add New Payroll Record'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingRecord ? 'Update payroll record details.' : 'Create a new payroll entry for a staff member.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
              <PayrollFormFields
                formData={formData}
                onFormChange={handleFormChange}
                onSelectChange={handleSelectChange}
                onCheckboxChange={handleCheckboxChange}
                staffList={staffList}
                isLoadingDeps={isLoadingDeps}
              />
              {formError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingDeps}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingRecord ? 'Saving...' : 'Creating...'}</> : editingRecord ? 'Save Changes' : 'Add Record'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      {/* Payroll Filters */}
      <div className={`${glassCardClasses} flex flex-wrap items-center gap-4`}>
        <h3 className={`text-md font-semibold ${titleTextClasses} mr-2`}>Filters:</h3>
        <Select value={filterStaffId} onValueChange={(value) => setFilterStaffId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Staff" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Staff</SelectItem>
            {Array.isArray(staffList) && staffList.map(staff => <SelectItem key={staff.id} value={staff.id}>{getStaffNameForFilter(staff.id)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Label htmlFor="payPeriodStartFrom" className="text-zinc-600 dark:text-zinc-400">Period From:</Label>
        <Input id="payPeriodStartFrom" name="payPeriodStartFrom" type="date" value={filterPayPeriodStartFrom} onChange={(e) => setFilterPayPeriodStartFrom(e.target.value)} className={`${filterInputClasses} w-[150px]`} />

        <Label htmlFor="payPeriodEndTo" className="text-zinc-600 dark:text-zinc-400">Period To:</Label>
        <Input id="payPeriodEndTo" name="payPeriodEndTo" type="date" value={filterPayPeriodEndTo} onChange={(e) => setFilterPayPeriodEndTo(e.target.value)} className={`${filterInputClasses} w-[150px]`} />

        <Select value={filterIsPaid} onValueChange={(value) => setFilterIsPaid(value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[120px]`}> <SelectValue placeholder="Paid Status" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Paid</SelectItem>
            <SelectItem value="false">Unpaid</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => { setFilterStaffId(''); setFilterPayPeriodStartFrom(''); setFilterPayPeriodEndTo(''); setFilterIsPaid('all'); }} variant="outline" className={outlineButtonClasses}>
          Reset Filters
        </Button>
      </div>

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Staff Member</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Job Title</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Pay Period</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-right`}>Net Salary</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Payment Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center`}>Paid</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-10 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : payrollRecords.length > 0 ? payrollRecords.map((record) => (
              <TableRow key={record.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{record.staff?.user ? `${record.staff.user.firstName} ${record.staff.user.lastName}` : 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses}`}>{record.staff?.jobTitle || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>
                  {isValid(new Date(record.payPeriodStart)) ? format(new Date(record.payPeriodStart), 'MMM dd,yyyy') : 'N/A'} - {isValid(new Date(record.payPeriodEnd)) ? format(new Date(record.payPeriodEnd), 'MMM dd,yyyy') : 'N/A'}
                </TableCell>
                <TableCell className={`font-semibold text-right ${descriptionTextClasses}`}>${record.netSalary.toFixed(2)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>
                  {record.paymentDate ? (isValid(new Date(record.paymentDate)) ? format(new Date(record.paymentDate), 'MMM dd,yyyy') : 'N/A') : 'Unpaid'}
                </TableCell>
                <TableCell className="text-center">
                  {record.isPaid ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-red-500 mx-auto" />}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(record)} title="Edit Record"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => handleGeneratePayslip(record)} title="Generate Payslip"> <Printer className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(record.id)} title="Delete Record"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="7" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No payroll records found. Click "Add Payroll Record" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payslip Generation Dialog */}
      <Dialog open={isPayslipDialogOpen} onOpenChange={setIsPayslipDialogOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 print:p-0">
          <div className="p-6 print:p-0"> {/* Wrapper for print styling */}
            <DialogHeader className="p-0">
              <DialogTitle className={`${titleTextClasses} hidden print:block text-center py-4`}>{schoolData?.name || 'School'}</DialogTitle>
              <DialogDescription className={`${descriptionTextClasses} hidden print:block text-center mb-4`}>Staff Payslip</DialogDescription>
              <DialogClose className="!absolute right-4 top-4 print:hidden" />
            </DialogHeader>
            <PayslipContent record={selectedRecordForPayslip} schoolData={schoolData} />
          </div>
          <DialogFooter className="py-4 px-6 print:hidden">
            <Button variant="outline" className={outlineButtonClasses} onClick={() => setIsPayslipDialogOpen(false)}>Close</Button>
            <Button className={primaryButtonClasses} onClick={() => window.print()}>Print Payslip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
