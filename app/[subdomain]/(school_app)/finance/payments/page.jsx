// app/[subdomain]/(school_app)/finance/payments/page.jsx
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FilePlus2, Edit3, Trash2, DollarSign, Loader2, AlertTriangle, PlusCircle, User, FileText, Printer, CalendarDays, Receipt, Package, Tags, Maximize
} from 'lucide-react'; // Added Receipt, Maximize icons

// Initial form data for Payment
const initialPaymentFormData = {
  id: null,
  invoiceId: '',
  amount: '',
  paymentDate: format(new Date(), 'yyyy-MM-dd'), // Default to current date
  paymentMethod: '',
  referenceId: '',
  notes: '',
};

// Reusable FormFields Component for Payment
const PaymentFormFields = ({ formData, onFormChange, onSelectChange, invoicesList, studentsList, isLoadingDeps }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const paymentMethodOptions = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' },
    { value: 'ONLINE_GATEWAY', label: 'Online Gateway' },
    { value: 'OTHER', label: 'Other' },
  ];

  // Combine invoices and their student names for a clear dropdown
  const invoiceDisplayOptions = useMemo(() => {
    return Array.isArray(invoicesList)
      ? invoicesList.map(inv => ({
          value: inv.id,
          label: `${inv.invoiceNumber} (${inv.student?.firstName || ''} ${inv.student?.lastName || ''}) - Due: $${inv.totalAmount.toFixed(2)} - Paid: $${inv.paidAmount.toFixed(2)}`
        }))
      : [];
  }, [invoicesList]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div>
        <Label htmlFor="invoiceId" className={labelTextClasses}>Invoice <span className="text-red-500">*</span></Label>
        {formData.id ? ( // If editing, invoice ID is usually not editable
          <Input value={invoiceDisplayOptions.find(opt => opt.value === formData.invoiceId)?.label || 'N/A'} disabled className={`${inputTextClasses} mt-1`} />
        ) : (
          <Select name="invoiceId" value={formData.invoiceId || ''} onValueChange={(value) => onSelectChange('invoiceId', value)} disabled={isLoadingDeps}>
            <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select invoice" /> </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              {!isLoadingDeps && (!Array.isArray(invoiceDisplayOptions) || invoiceDisplayOptions.length === 0) && <SelectItem value="no-invoices" disabled>No invoices available</SelectItem>}
              {invoiceDisplayOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div>
        <Label htmlFor="amount" className={labelTextClasses}>Amount <span className="text-red-500">*</span></Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0.01" value={formData.amount || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., 50.00" />
      </div>
      <div>
        <Label htmlFor="paymentDate" className={labelTextClasses}>Payment Date <span className="text-red-500">*</span></Label>
        <Input id="paymentDate" name="paymentDate" type="date" value={formData.paymentDate || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="paymentMethod" className={labelTextClasses}>Payment Method <span className="text-red-500">*</span></Label>
        <Select name="paymentMethod" value={formData.paymentMethod || ''} onValueChange={(value) => onSelectChange('paymentMethod', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select method" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {paymentMethodOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="referenceId" className={labelTextClasses}>Reference ID (Optional)</Label>
        <Input id="referenceId" name="referenceId" value={formData.referenceId || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., Bank Ref #12345" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="notes" className={labelTextClasses}>Notes (Optional)</Label>
        <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={onFormChange} rows={2} className={`${inputTextClasses} mt-1`} />
      </div>
    </div>
  );
};


export default function ManagePaymentsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]); // For invoice dropdown
  const [students, setStudents] = useState([]); // For filter dropdown on student associated with invoice

  const [isLoading, setIsLoading] = useState(true); // For main table
  const [isLoadingDeps, setIsLoadingDeps] = useState(true); // For dropdowns
  const [error, setError] = useState('');

  // Filters
  const [filterInvoiceId, setFilterInvoiceId] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterPaymentDateFrom, setFilterPaymentDateFrom] = useState('');
  const [filterPaymentDateTo, setFilterPaymentDateTo] = useState('');


  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false); // New dialog for payslip
  const [selectedPaymentForPayslip, setSelectedPaymentForPayslip] = useState(null); // Data for payslip

  const [formData, setFormData] = useState({ ...initialPaymentFormData });
  const [editingPayment, setEditingPayment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const filterInputClasses = 'bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500';


  // --- Fetching Data ---
  const fetchPayments = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const queryParams = new URLSearchParams();
      if (filterInvoiceId) queryParams.append('invoiceId', filterInvoiceId);
      if (filterStudentId) queryParams.append('studentId', filterStudentId);
      if (filterPaymentMethod) queryParams.append('paymentMethod', filterPaymentMethod);
      if (filterPaymentDateFrom) queryParams.append('paymentDateFrom', filterPaymentDateFrom);
      if (filterPaymentDateTo) queryParams.append('paymentDateTo', filterPaymentDateTo);

      const response = await fetch(`/api/schools/${schoolData.id}/finance/payments?${queryParams.toString()}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch payments.'); }
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) { toast.error("Error fetching payments", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id, filterInvoiceId, filterStudentId, filterPaymentMethod, filterPaymentDateFrom, filterPaymentDateTo]);


  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;

    try {
      const [invoicesRes, studentsRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/finance/invoices`), // Fetch all invoices (include student data)
        fetch(`/api/schools/${schoolData.id}/people/students`), // Fetch all students (for filter by student)
      ]);

      // Process Invoices
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value.ok) {
        const invoicesData = await invoicesRes.value.json();
        setInvoices(Array.isArray(invoicesData.invoices) ? invoicesData.invoices : []);
      } else {
        const errorData = invoicesRes.status === 'rejected' ? invoicesRes.reason : await invoicesRes.value.json().catch(() => ({}));
        console.error("Invoices fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch invoices for dropdown.');
      }

      // Process Students
      if (studentsRes.status === 'fulfilled' && studentsRes.value.ok) {
        const studentsData = await studentsRes.value.json();
        setStudents(Array.isArray(studentsData.students) ? studentsData.students : []);
      } else {
        const errorData = studentsRes.status === 'rejected' ? studentsRes.reason : await studentsRes.value.json().catch(() => ({}));
        console.error("Students fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch students for dropdown.');
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
      fetchPayments();
      fetchDropdownDependencies();
    }
  }, [schoolData, session, fetchPayments, fetchDropdownDependencies]);


  // --- Payment Form Handlers ---
  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const openAddDialog = () => {
    setEditingPayment(null);
    setFormData({ ...initialPaymentFormData });
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (payment) => {
    setEditingPayment(payment);
    setFormData({
      id: payment.id,
      invoiceId: payment.invoiceId,
      amount: payment.amount?.toString() || '',
      paymentDate: payment.paymentDate ? format(new Date(payment.paymentDate), 'yyyy-MM-dd') : '',
      paymentMethod: payment.paymentMethod || '',
      referenceId: payment.referenceId || '',
      notes: payment.notes || '',
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true); setFormError('');

    const isEditing = !!editingPayment;
    const payload = {
      invoiceId: formData.invoiceId,
      amount: parseFloat(formData.amount),
      paymentDate: new Date(formData.paymentDate).toISOString(),
      paymentMethod: formData.paymentMethod,
      referenceId: formData.referenceId || null,
      notes: formData.notes || null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/finance/payments/${editingPayment.id}`
      : `/api/schools/${schoolData.id}/finance/payments`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} payment.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setFormError(err);
      } else {
        toast.success(`Payment ${actionText}d successfully!`);
        setIsDialogOpen(false);
        fetchPayments(); // Re-fetch payments
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setFormError('An unexpected error occurred.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (paymentId) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE this payment record? This will adjust the associated invoice.`)) return;
    const toastId = `delete-payment-${paymentId}`;
    toast.loading("Deleting payment...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/payments/${paymentId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Payment deleted.`, { id: toastId });
      fetchPayments(); // Re-fetch payments
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Payslip Generation Logic ---
  const handleGeneratePayslip = (payment) => {
    setSelectedPaymentForPayslip(payment);
    setIsPayslipDialogOpen(true);
    // The dialog itself will contain the print functionality
  };

  const PayslipContent = ({ payment, schoolData }) => {
    if (!payment || !schoolData) return <p className="text-zinc-500">No payment data available.</p>;

    const student = payment.invoice?.student;
    const processedBy = payment.processedBy;

    return (
      <div className="p-6 border rounded-md shadow-lg bg-white dark:bg-zinc-800 text-black dark:text-white print:shadow-none print:border-none">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-sky-700 dark:text-sky-300">{schoolData.name}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{schoolData.address || 'N/A'}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{schoolData.contactInfo || 'N/A'}</p>
        </div>

        <div className="mb-6 border-b pb-4 border-zinc-200 dark:border-zinc-700">
          <h3 className="text-xl font-semibold mb-2">Payment Receipt</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Payment ID:</div><div>{payment.id}</div>
            <div className="font-medium">Date:</div><div>{isValid(new Date(payment.paymentDate)) ? format(new Date(payment.paymentDate), 'MMM dd, yyyy HH:mm') : 'N/A'}</div>
            <div className="font-medium">Method:</div><div>{payment.paymentMethod.replace('_', ' ')}</div>
            {payment.referenceId && <><div className="font-medium">Ref ID:</div><div>{payment.referenceId}</div></>}
          </div>
        </div>

        <div className="mb-6 border-b pb-4 border-zinc-200 dark:border-zinc-700">
          <h3 className="text-xl font-semibold mb-2">Invoice Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Invoice No:</div><div>{payment.invoice?.invoiceNumber || 'N/A'}</div>
            <div className="font-medium">Student:</div><div>{student ? `${student.firstName} ${student.lastName} (${student.studentIdNumber})` : 'N/A'}</div>
            <div className="font-medium">Invoice Total:</div><div>${payment.invoice?.totalAmount.toFixed(2) || '0.00'}</div>
            <div className="font-medium">Invoice Status:</div><div>{payment.invoice?.status.replace('_', ' ') || 'N/A'}</div>
          </div>
        </div>

        <div className="text-center mb-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">Amount Paid: ${payment.amount.toFixed(2)}</h3>
        </div>

        <div className="text-sm text-zinc-700 dark:text-zinc-300">
          <p className="mb-1">Processed By: {processedBy ? `${processedBy.firstName} ${processedBy.lastName}` : 'N/A'}</p>
          {payment.notes && <p className="mb-1">Notes: {payment.notes}</p>}
          <p className="mt-4 text-center text-xs">Thank you for your payment!</p>
        </div>
      </div>
    );
  };


  // --- Helper Functions for Display (reusing from above where possible) ---
  const getInvoiceNumberDisplay = useCallback((id) => {
    const invoice = invoices.find(inv => inv.id === id);
    return invoice ? `${invoice.invoiceNumber} (${invoice.student?.firstName || ''} ${invoice.student?.lastName || ''})` : 'N/A';
  }, [invoices]);

  const getStudentNameForFilter = useCallback((id) => {
    const student = students.find(s => s.id === id);
    return student ? `${student.firstName} ${student.lastName}` : 'N/A';
  }, [students]);

  const paymentMethodOptions = useMemo(() => [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' },
    { value: 'ONLINE_GATEWAY', label: 'Online Gateway' },
    { value: 'OTHER', label: 'Other' },
  ], []);


  // --- Read-only view for STUDENT role ---
  function StudentSelfPayments() {
    const school = useSchool();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [payments, setPayments] = useState([]);
    const [method, setMethod] = useState('ALL');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const fetchPayments = useCallback(async () => {
      if (!school?.id || !session) return;
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (method && method !== 'ALL') params.set('method', method);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const res = await fetch(`/api/schools/${school.id}/students/me/payments?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load payments');
        setPayments(Array.isArray(data.payments) ? data.payments : []);
      } catch (e) {
        setError(e.message);
        toast.error('Failed to load payments', { description: e.message });
      } finally {
        setLoading(false);
      }
    }, [school?.id, session, method, from, to]);

    useEffect(() => { if (school?.id && session) fetchPayments(); }, [school?.id, session, fetchPayments]);

    const titleTextClasses = 'text-black dark:text-white';
    const descriptionTextClasses = 'text-zinc-600 dark:text-zinc-400';
    const glassCardClasses = 'p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50';

    const filtered = payments.filter(p => method === 'ALL' ? true : p.paymentMethod === method);

    return (
      <div className="space-y-8">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Receipt className="mr-3 h-8 w-8 opacity-80"/>My Payments
          </h1>
          <p className={descriptionTextClasses}>View your payment receipts. This is read-only.</p>
        </div>

        {/* Filters */}
        <div className={`${glassCardClasses} flex flex-col md:flex-row gap-3 items-center`}>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm text-muted-foreground">Method</span>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                <SelectItem value="ONLINE_GATEWAY">Online Gateway</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm text-muted-foreground">From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm text-muted-foreground">To</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
          </div>
          <button onClick={fetchPayments} className="ml-auto md:ml-0 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-black text-white dark:bg-white dark:text-black">
            <CalendarDays className="h-4 w-4"/> Apply
          </button>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className={`${glassCardClasses} overflow-x-auto`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={`${titleTextClasses}`}>Date</TableHead>
                <TableHead className={`${titleTextClasses} text-right`}>Amount</TableHead>
                <TableHead className={`${titleTextClasses}`}>Method</TableHead>
                <TableHead className={`${titleTextClasses}`}>Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`s-${idx}`}>
                    <TableCell><Skeleton className="h-5 w-28"/></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16"/></TableCell>
                    <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                    <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                  </TableRow>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="text-sm text-right">${(p.amount ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{p.paymentMethod?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm">{p.invoice?.invoiceNumber || '—'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-zinc-500">No payments found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // If the logged-in user is a STUDENT, show read-only self payments
  if (session?.user?.role === 'STUDENT') {
    return <StudentSelfPayments />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Receipt className="mr-3 h-8 w-8 opacity-80"/>Manage Payments
          </h1>
          <p className={descriptionTextClasses}>Record and track payments received against student invoices.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(''); }}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}> <PlusCircle className="mr-2 h-4 w-4" /> Record New Payment </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingPayment ? 'Edit Payment Record' : 'Record New Payment'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingPayment ? 'Update payment details.' : 'Record a payment against an existing invoice.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
              <PaymentFormFields
                formData={formData}
                onFormChange={handleFormChange}
                onSelectChange={handleSelectChange}
                invoicesList={invoices}
                studentsList={students} // Not directly used in PaymentFormFields, but good to pass if needed later
                isLoadingDeps={isLoadingDeps}
              />
              {formError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingDeps}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingPayment ? 'Saving...' : 'Recording...'}</> : editingPayment ? 'Save Changes' : 'Record Payment'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      {/* Payment Filters */}
      <div className={`${glassCardClasses} flex flex-wrap items-center gap-4`}>
        <h3 className={`text-md font-semibold ${titleTextClasses} mr-2`}>Filters:</h3>
        <Select value={filterInvoiceId} onValueChange={(value) => setFilterInvoiceId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[200px]`}> <SelectValue placeholder="Filter by Invoice" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Invoices</SelectItem>
            {Array.isArray(invoices) && invoices.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber} - {inv.student?.firstName} {inv.student?.lastName}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStudentId} onValueChange={(value) => setFilterStudentId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Student" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Students</SelectItem>
            {Array.isArray(students) && students.map(student => <SelectItem key={student.id} value={student.id}>{getStudentNameForFilter(student.id)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPaymentMethod} onValueChange={(value) => setFilterPaymentMethod(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Method" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Methods</SelectItem>
            {paymentMethodOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Label htmlFor="paymentDateFrom" className="text-zinc-600 dark:text-zinc-400">From:</Label>
        <Input id="paymentDateFrom" name="paymentDateFrom" type="date" value={filterPaymentDateFrom} onChange={(e) => setFilterPaymentDateFrom(e.target.value)} className={`${filterInputClasses} w-[150px]`} />

        <Label htmlFor="paymentDateTo" className="text-zinc-600 dark:text-zinc-400">To:</Label>
        <Input id="paymentDateTo" name="paymentDateTo" type="date" value={filterPaymentDateTo} onChange={(e) => setFilterPaymentDateTo(e.target.value)} className={`${filterInputClasses} w-[150px]`} />

        <Button onClick={() => { setFilterInvoiceId(''); setFilterStudentId(''); setFilterPaymentMethod(''); setFilterPaymentDateFrom(''); setFilterPaymentDateTo(''); }} variant="outline" className={outlineButtonClasses}>
          Reset Filters
        </Button>
      </div>

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Invoice</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Student</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-right`}>Amount</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Method</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Processed By</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28 rounded" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : payments.length > 0 ? payments.map((payment) => (
              <TableRow key={payment.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{payment.invoice?.invoiceNumber || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses}`}>{payment.invoice?.student ? `${payment.invoice.student.firstName} ${payment.invoice.student.lastName}` : 'N/A'}</TableCell>
                <TableCell className={`font-semibold text-right ${descriptionTextClasses}`}>${payment.amount.toFixed(2)}</TableCell>
                <TableCell className={`${descriptionTextClasses}`}>{payment.paymentMethod.replace('_', ' ')}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{isValid(new Date(payment.paymentDate)) ? format(new Date(payment.paymentDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{payment.processedBy ? `${payment.processedBy.firstName} ${payment.processedBy.lastName}` : 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(payment)} title="Edit Payment"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => handleGeneratePayslip(payment)} title="Generate Payslip"> <Printer className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(payment.id)} title="Delete Payment"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="7" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No payments recorded yet. Click "Record New Payment" to get started.
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
              <DialogDescription className={`${descriptionTextClasses} hidden print:block text-center mb-4`}>Payment Receipt</DialogDescription>
              <DialogClose className="!absolute right-4 top-4 print:hidden" />
            </DialogHeader>
            <PayslipContent payment={selectedPaymentForPayslip} schoolData={schoolData} />
          </div>
          <DialogFooter className="py-4 px-6 print:hidden">
            <Button variant="outline" className={outlineButtonClasses} onClick={() => setIsPayslipDialogOpen(false)}>Close</Button>
            <Button className={primaryButtonClasses} onClick={() => window.print()}>Print Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
