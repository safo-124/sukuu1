// app/[subdomain]/(school_app)/finance/invoices/page.jsx
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
  FilePlus2, Edit3, Trash2, DollarSign, Loader2, AlertTriangle, PlusCircle, User, Tags, Package, Scale, Eye, FileText, Printer
} from 'lucide-react'; // Added Printer icon

// Initial form data for Invoice
const initialInvoiceFormData = {
  id: null,
  studentId: '',
  issueDate: format(new Date(), 'yyyy-MM-dd'), // Default to current date
  dueDate: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
  // For initial item when creating
  initialItemDescription: '',
  initialItemQuantity: 1,
  initialItemUnitPrice: '',
  initialItemFeeStructureId: '',
};

// Initial form data for Invoice Item
const initialInvoiceItemFormData = {
  id: null,
  invoiceId: '', // Parent invoice ID
  description: '',
  quantity: 1,
  unitPrice: '',
  feeStructureId: '',
};


// Reusable FormFields Component for Invoice (Main Dialog)
const InvoiceFormFields = ({ formData, onFormChange, onSelectChange, studentsList, feeStructuresList, isLoadingDeps, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const getStudentFullName = useCallback((id) => {
    const student = studentsList.find(s => s.id === id);
    return student ? `${student.firstName} ${student.lastName} (${student.studentIdNumber})` : 'N/A';
  }, [studentsList]);

  const getFeeStructureName = useCallback((id) => {
    const fs = feeStructuresList.find(f => f.id === id);
    return fs ? `${fs.name} ($${fs.amount})` : 'N/A';
  }, [feeStructuresList]);


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      {isEdit && (
        <div className="sm:col-span-2">
          <Label htmlFor="invoiceNumber" className={labelTextClasses}>Invoice Number</Label>
          <Input id="invoiceNumber" name="invoiceNumber" value={formData.invoiceNumber || ''} disabled className={`${inputTextClasses} mt-1`} />
        </div>
      )}
      <div>
        <Label htmlFor="studentId" className={labelTextClasses}>Student <span className="text-red-500">*</span></Label>
        {isEdit ? ( // Student is usually not editable after invoice creation
          <Input value={getStudentFullName(formData.studentId)} disabled className={`${inputTextClasses} mt-1`} />
        ) : (
          <Select name="studentId" value={formData.studentId || ''} onValueChange={(value) => onSelectChange('studentId', value)} disabled={isLoadingDeps}>
            <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select student" /> </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              {!isLoadingDeps && (!Array.isArray(studentsList) || studentsList.length === 0) && <SelectItem value="no-students" disabled>No students available</SelectItem>}
              {Array.isArray(studentsList) && studentsList.map(student => (
                <SelectItem key={student.id} value={student.id}>
                  {getStudentFullName(student.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div>
        <Label htmlFor="issueDate" className={labelTextClasses}>Issue Date <span className="text-red-500">*</span></Label>
        <Input id="issueDate" name="issueDate" type="date" value={formData.issueDate || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="dueDate" className={labelTextClasses}>Due Date <span className="text-red-500">*</span></Label>
        <Input id="dueDate" name="dueDate" type="date" value={formData.dueDate || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="notes" className={labelTextClasses}>Notes (Optional)</Label>
        <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={onFormChange} rows={2} className={`${inputTextClasses} mt-1`} />
      </div>

      {!isEdit && ( // Initial item section only for creation
        <>
          <div className="sm:col-span-2 border-t pt-4 mt-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Initial Invoice Item</div>
          <div>
            <Label htmlFor="initialItemDescription" className={labelTextClasses}>Item Description <span className="text-red-500">*</span></Label>
            <Input id="initialItemDescription" name="initialItemDescription" value={formData.initialItemDescription || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., Annual Tuition Fee" />
          </div>
          <div>
            <Label htmlFor="initialItemUnitPrice" className={labelTextClasses}>Unit Price <span className="text-red-500">*</span></Label>
            <Input id="initialItemUnitPrice" name="initialItemUnitPrice" type="number" step="0.01" min="0" value={formData.initialItemUnitPrice || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., 100.00" />
          </div>
          <div>
            <Label htmlFor="initialItemQuantity" className={labelTextClasses}>Quantity <span className="text-red-500">*</span></Label>
            <Input id="initialItemQuantity" name="initialItemQuantity" type="number" step="1" min="1" value={formData.initialItemQuantity || 1} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
          </div>
          <div>
            <Label htmlFor="initialItemFeeStructureId" className={labelTextClasses}>Link to Fee Structure (Optional)</Label>
            <Select name="initialItemFeeStructureId" value={formData.initialItemFeeStructureId || 'none'} onValueChange={(value) => onSelectChange('initialItemFeeStructureId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
              <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select fee structure" /> </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                <SelectItem value="none">No Fee Structure</SelectItem>
                {!isLoadingDeps && (!Array.isArray(feeStructuresList) || feeStructuresList.length === 0) && <SelectItem value="no-fees" disabled>No fee structures available</SelectItem>}
                {Array.isArray(feeStructuresList) && feeStructuresList.map(fee => (
                  <SelectItem key={fee.id} value={fee.id}>{getFeeStructureName(fee.id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
};

// Reusable FormFields Component for Invoice Item (Nested Dialog)
const InvoiceItemFormFields = ({ formData, onFormChange, onSelectChange, feeStructuresList, isLoadingDeps }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const getFeeStructureName = useCallback((id) => {
    const fs = feeStructuresList.find(f => f.id === id);
    return fs ? `${fs.name} ($${fs.amount})` : 'N/A';
  }, [feeStructuresList]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      <div className="sm:col-span-2">
        <Label htmlFor="itemDescription" className={labelTextClasses}>Description <span className="text-red-500">*</span></Label>
        <Input id="itemDescription" name="description" value={formData.description || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="itemQuantity" className={labelTextClasses}>Quantity <span className="text-red-500">*</span></Label>
        <Input id="itemQuantity" name="quantity" type="number" step="1" min="1" value={formData.quantity || 1} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="itemUnitPrice" className={labelTextClasses}>Unit Price <span className="text-red-500">*</span></Label>
        <Input id="itemUnitPrice" name="unitPrice" type="number" step="0.01" min="0" value={formData.unitPrice || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="itemFeeStructureId" className={labelTextClasses}>Link to Fee Structure (Optional)</Label>
        <Select name="feeStructureId" value={formData.feeStructureId || 'none'} onValueChange={(value) => onSelectChange('feeStructureId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select fee structure" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">No Fee Structure</SelectItem>
            {!isLoadingDeps && (!Array.isArray(feeStructuresList) || feeStructuresList.length === 0) && <SelectItem value="no-fees" disabled>No fee structures available</SelectItem>}
            {Array.isArray(feeStructuresList) && feeStructuresList.map(fee => (
              <SelectItem key={fee.id} value={fee.id}>{getFeeStructureName(fee.id)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};


export default function ManageInvoicesPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]); // For student dropdown
  const [feeStructures, setFeeStructures] = useState([]); // For fee structure dropdown (initial item/invoice item)

  const [isLoading, setIsLoading] = useState(true); // For main table
  const [isLoadingDeps, setIsLoadingDeps] = useState(true); // For dropdowns
  const [error, setError] = useState('');

  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false); // New dialog for invoice items

  const [invoiceFormData, setInvoiceFormData] = useState({ ...initialInvoiceFormData });
  const [invoiceItemFormData, setInvoiceItemFormData] = useState({ ...initialInvoiceItemFormData });

  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoiceItems, setViewingInvoiceItems] = useState(null); // When managing items for an invoice
  const [editingInvoiceItem, setEditingInvoiceItem] = useState(null);

  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  const [invoiceFormError, setInvoiceFormError] = useState('');
  const [itemFormError, setItemFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;


  // --- Fetching Data ---
  const fetchInvoices = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/invoices`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch invoices.'); }
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) { toast.error("Error fetching invoices", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);


  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;

    try {
      const [studentsRes, feeStructuresRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/people/students`),
        fetch(`/api/schools/${schoolData.id}/finance/fee-structures`),
      ]);

      // Process Students
      if (studentsRes.status === 'fulfilled' && studentsRes.value.ok) {
        const studentsData = await studentsRes.value.json();
        setStudents(Array.isArray(studentsData.students) ? studentsData.students : []);
      } else {
        const errorData = studentsRes.status === 'rejected' ? studentsRes.reason : await studentsRes.value.json().catch(() => ({}));
        console.error("Students fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch students.');
      }

      // Process Fee Structures
      if (feeStructuresRes.status === 'fulfilled' && feeStructuresRes.value.ok) {
        const feeStructuresData = await feeStructuresRes.value.json();
        setFeeStructures(Array.isArray(feeStructuresData.feeStructures) ? feeStructuresData.feeStructures : []);
      } else {
        const errorData = feeStructuresRes.status === 'rejected' ? feeStructuresRes.reason : await feeStructuresRes.value.json().catch(() => ({}));
        console.error("Fee Structures fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch fee structures.');
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
      fetchInvoices();
      fetchDropdownDependencies();
    }
  }, [schoolData, session, fetchInvoices, fetchDropdownDependencies]);


  // --- Invoice Form Handlers ---
  const handleInvoiceFormChange = (e) => {
    const { name, value } = e.target;
    setInvoiceFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleInvoiceSelectChange = (name, value) => setInvoiceFormData(prev => ({ ...prev, [name]: value }));

  const openAddInvoiceDialog = () => {
    setEditingInvoice(null);
    setInvoiceFormData({ ...initialInvoiceFormData });
    setInvoiceFormError('');
    setIsInvoiceDialogOpen(true);
  };

  const openEditInvoiceDialog = (invoice) => {
    setEditingInvoice(invoice);
    setInvoiceFormData({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber || '',
      studentId: invoice.studentId || '',
      issueDate: invoice.issueDate ? format(new Date(invoice.issueDate), 'yyyy-MM-dd') : '',
      dueDate: invoice.dueDate ? format(new Date(invoice.dueDate), 'yyyy-MM-dd') : '',
      notes: invoice.notes || '',
      // No initial item fields when editing existing invoice
    });
    setInvoiceFormError('');
    setIsInvoiceDialogOpen(true);
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingInvoice(true); setInvoiceFormError('');

    const isEditing = !!editingInvoice;
    const payload = {
      studentId: invoiceFormData.studentId,
      issueDate: new Date(invoiceFormData.issueDate).toISOString(),
      dueDate: new Date(invoiceFormData.dueDate).toISOString(),
      notes: invoiceFormData.notes || null,
    };

    // Only include initialItem if creating a new invoice and it's populated
    if (!isEditing && (invoiceFormData.initialItemDescription || invoiceFormData.initialItemFeeStructureId)) {
      payload.initialItem = {
        description: invoiceFormData.initialItemDescription,
        quantity: parseInt(invoiceFormData.initialItemQuantity, 10),
        unitPrice: parseFloat(invoiceFormData.initialItemUnitPrice),
        feeStructureId: invoiceFormData.initialItemFeeStructureId || null,
      };
    }

    const url = isEditing
      ? `/api/schools/${schoolData.id}/finance/invoices/${editingInvoice.id}`
      : `/api/schools/${schoolData.id}/finance/invoices`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} invoice.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setInvoiceFormError(err);
      } else {
        toast.success(`Invoice "${result.invoice?.invoiceNumber}" ${actionText}d successfully!`);
        setIsInvoiceDialogOpen(false);
        fetchInvoices(); // Re-fetch invoices
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setInvoiceFormError('An unexpected error occurred.');
    } finally { setIsLoading(false); }
  };

  const handleDeleteInvoice = async (invoiceId, invoiceNumber) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE invoice "${invoiceNumber}"? This will also delete all associated items and payments.`)) return;
    const toastId = `delete-invoice-${invoiceId}`;
    toast.loading("Deleting invoice...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/invoices/${invoiceId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Invoice "${invoiceNumber}" deleted.`, { id: toastId });
      fetchInvoices(); // Re-fetch invoices
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Invoice Item Form Handlers ---
  const handleInvoiceItemFormChange = (e) => setInvoiceItemFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleInvoiceItemSelectChange = (name, value) => setInvoiceItemFormData(prev => ({ ...prev, [name]: value }));

  const openManageItemsDialog = (invoice) => {
    setViewingInvoiceItems(invoice);
    setIsItemDialogOpen(true);
    // When opening, reset item form and fetch items for this invoice
    setEditingInvoiceItem(null);
    setInvoiceItemFormData({ ...initialInvoiceItemFormData, invoiceId: invoice.id });
    setItemFormError('');
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!schoolData?.id || !viewingInvoiceItems) return;
    setIsSubmittingItem(true); setItemFormError('');

    const payload = {
      description: invoiceItemFormData.description,
      quantity: parseInt(invoiceItemFormData.quantity, 10),
      unitPrice: parseFloat(invoiceItemFormData.unitPrice),
      feeStructureId: invoiceItemFormData.feeStructureId || null,
    };

    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/invoices/${viewingInvoiceItems.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to add invoice item.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`Add Item Failed`, { description: err }); setItemFormError(err);
      } else {
        toast.success(`Item "${result.invoiceItem?.description}" added successfully!`);
        setInvoiceItemFormData({ ...initialInvoiceItemFormData, invoiceId: viewingInvoiceItems.id }); // Reset form
        setEditingInvoiceItem(null);
        // Refresh the viewing invoice's items and the main invoices list
        fetchInvoiceForItemsDialog(viewingInvoiceItems.id);
        fetchInvoices();
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setItemFormError('An unexpected error occurred.');
    } finally { setIsSubmittingItem(false); }
  };

  const handleEditItem = (item) => {
    setEditingInvoiceItem(item);
    setInvoiceItemFormData({
      id: item.id,
      invoiceId: item.invoiceId,
      description: item.description || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      feeStructureId: item.feeStructureId || '',
    });
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!schoolData?.id || !viewingInvoiceItems || !editingInvoiceItem) return;
    setIsSubmittingItem(true); setItemFormError('');

    const payload = {
      description: invoiceItemFormData.description,
      quantity: parseInt(invoiceItemFormData.quantity, 10),
      unitPrice: parseFloat(invoiceItemFormData.unitPrice),
      feeStructureId: invoiceItemFormData.feeStructureId || null,
    };

    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/invoices/${viewingInvoiceItems.id}/items/${editingInvoiceItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to update invoice item.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`Update Item Failed`, { description: err }); setItemFormError(err);
      } else {
        toast.success(`Item "${result.invoiceItem?.description}" updated successfully!`);
        setInvoiceItemFormData({ ...initialInvoiceItemFormData, invoiceId: viewingInvoiceItems.id }); // Reset form
        setEditingInvoiceItem(null);
        // Refresh the viewing invoice's items and the main invoices list
        fetchInvoiceForItemsDialog(viewingInvoiceItems.id);
        fetchInvoices();
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setItemFormError('An unexpected error occurred.');
    } finally { setIsSubmittingItem(false); }
  };

  const handleDeleteItem = async (itemId, itemDescription) => {
    if (!schoolData?.id || !viewingInvoiceItems) return;
    if (!window.confirm(`Are you sure you want to DELETE item "${itemDescription}"?`)) return;
    const toastId = `delete-invoice-item-${itemId}`;
    toast.loading("Deleting item...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/invoices/${viewingInvoiceItems.id}/items/${itemId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Item "${itemDescription}" deleted.`, { id: toastId });
      fetchInvoiceForItemsDialog(viewingInvoiceItems.id); // Refresh items for current invoice
      fetchInvoices(); // Refresh main invoices list
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // Function to re-fetch the specific invoice being viewed for its items
  const fetchInvoiceForItemsDialog = useCallback(async (invoiceId) => {
    if (!schoolData?.id || !invoiceId) return;
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/invoices/${invoiceId}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch invoice items.'); }
      const data = await response.json();
      setViewingInvoiceItems(data.invoice); // Update the invoice data in state
    } catch (err) { toast.error("Error refreshing invoice items", { description: err.message });
    }
  }, [schoolData?.id]);


  // --- Helper Functions for Display ---
  const getStudentFullName = useCallback((id) => {
    const student = students.find(s => s.id === id);
    return student ? `${student.firstName} ${student.lastName}` : 'N/A';
  }, [students]);

  const getFeeStructureName = useCallback((id) => {
    const fs = feeStructures.find(f => f.id === id);
    // FIX: Corrected template literal syntax for consistency
    return fs ? `${fs.name} ($${fs.amount})` : 'N/A';
  }, [feeStructures]);

  const getInvoiceStatusBadge = (status) => {
    let className = "px-2 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'PAID': className += " bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"; break;
      case 'PARTIALLY_PAID': className += " bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"; break;
      case 'OVERDUE': className += " bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"; break;
      case 'SENT': className += " bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"; break;
      case 'DRAFT': className += " bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300"; break;
      case 'VOID':
      case 'CANCELLED': className += " bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 line-through"; break;
      default: className += " bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300"; break;
    }
    return <span className={className}>{status.replace('_', ' ')}</span>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <DollarSign className="mr-3 h-8 w-8 opacity-80"/>Manage Invoices
          </h1>
          <p className={descriptionTextClasses}>Create, track, and manage financial invoices for students.</p>
        </div>
        <Dialog open={isInvoiceDialogOpen} onOpenChange={(open) => { setIsInvoiceDialogOpen(open); if (!open) setFormError(''); }}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddInvoiceDialog}> <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingInvoice ? 'Update invoice details.' : 'Generate a new invoice for a student with an optional initial item.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvoiceSubmit} className="space-y-6 py-1">
              <InvoiceFormFields
                formData={invoiceFormData}
                onFormChange={handleInvoiceFormChange}
                onSelectChange={handleInvoiceSelectChange}
                studentsList={students}
                feeStructuresList={feeStructures}
                isLoadingDeps={isLoadingDeps}
                isEdit={!!editingInvoice}
              />
              {invoiceFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{invoiceFormError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingInvoice || isLoadingDeps}>
                  {isSubmittingInvoice ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingInvoice ? 'Saving...' : 'Creating...'}</> : editingInvoice ? 'Save Changes' : 'Create Invoice'}
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
              <TableHead className={`${titleTextClasses} font-semibold`}>Invoice #</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Student</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Issue Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Due Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-right`}>Total</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-right`}>Paid</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center`}>Status</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : invoices.length > 0 ? invoices.map((invoice) => (
              <TableRow key={invoice.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{invoice.invoiceNumber}</TableCell>
                <TableCell className={`${descriptionTextClasses}`}>{getStudentFullName(invoice.studentId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{isValid(new Date(invoice.issueDate)) ? format(new Date(invoice.issueDate), 'MMM dd,yyyy') : 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{isValid(new Date(invoice.dueDate)) ? format(new Date(invoice.dueDate), 'MMM dd,yyyy') : 'N/A'}</TableCell>
                <TableCell className={`font-semibold text-right ${descriptionTextClasses}`}>${invoice.totalAmount.toFixed(2)}</TableCell>
                <TableCell className={`text-right ${descriptionTextClasses}`}>${invoice.paidAmount.toFixed(2)}</TableCell>
                <TableCell className="text-center">{getInvoiceStatusBadge(invoice.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditInvoiceDialog(invoice)} title="Edit Invoice"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openManageItemsDialog(invoice)} title="Manage Items"> <Tags className="h-4 w-4" /> </Button>
                    {/* Print Button */}
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => window.print()} title="Print Invoice"> <Printer className="h-4 w-4" /> </Button>
                    {/* Link to view payments (future) */}
                    {/* <Link href={`/${schoolData.subdomain}/finance/payments?invoiceId=${invoice.id}`} passHref>
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="View Payments"> <DollarSign className="h-4 w-4" /> </Button>
                    </Link> */}
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNumber)} title="Delete Invoice"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="8" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No invoices found. Click "Create New Invoice" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Items Management Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={(open) => { setIsItemDialogOpen(open); if (!open) setItemFormError(''); setEditingInvoiceItem(null); setInvoiceItemFormData({ ...initialInvoiceItemFormData, invoiceId: viewingInvoiceItems?.id || '' }); }}>
        <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>Manage Items for Invoice #{viewingInvoiceItems?.invoiceNumber}</DialogTitle>
            <DialogDescription className={descriptionTextClasses}>
              Add, edit, or remove items from this invoice. Invoice total will update automatically.
              <p className="mt-2 text-sm font-semibold text-sky-600 dark:text-sky-400">Current Total: ${viewingInvoiceItems?.totalAmount.toFixed(2)}</p>
            </DialogDescription>
          </DialogHeader>

          {/* Form to Add/Edit Invoice Item */}
          <div className="border rounded-md p-4 bg-zinc-50 dark:bg-zinc-900">
            <h3 className={`text-md font-semibold ${titleTextClasses} mb-3`}>{editingInvoiceItem ? 'Edit Item' : 'Add New Item'}</h3>
            <form onSubmit={editingInvoiceItem ? handleUpdateItem : handleAddItem} className="space-y-4">
              <InvoiceItemFormFields
                formData={invoiceItemFormData}
                onFormChange={handleInvoiceItemFormChange}
                onSelectChange={handleInvoiceItemSelectChange}
                feeStructuresList={feeStructures}
                isLoadingDeps={isLoadingDeps}
              />
              {itemFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{itemFormError}</p> )}
              <DialogFooter>
                {editingInvoiceItem && (
                  <Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => { setEditingInvoiceItem(null); setInvoiceItemFormData({ ...initialInvoiceItemFormData, invoiceId: viewingInvoiceItems?.id || '' }); }}>
                    Cancel Edit
                  </Button>
                )}
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingItem || isLoadingDeps}>
                  {isSubmittingItem ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : editingInvoiceItem ? 'Update Item' : 'Add Item'}
                </Button>
              </DialogFooter>
            </form>
          </div>

          {/* Table of Existing Invoice Items */}
          <div className="mt-6 border rounded-md overflow-hidden">
            <h3 className={`text-md font-semibold ${titleTextClasses} p-4 bg-zinc-100 dark:bg-zinc-800 border-b`}>Items ({viewingInvoiceItems?.items?.length || 0})</h3>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className={`${titleTextClasses} font-semibold`}>Description</TableHead>
                    <TableHead className={`${titleTextClasses} font-semibold text-right`}>Qty</TableHead>
                    <TableHead className={`${titleTextClasses} font-semibold text-right`}>Unit Price</TableHead>
                    <TableHead className={`${titleTextClasses} font-semibold text-right`}>Total</TableHead>
                    <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingInvoiceItems?.items?.length === 0 ? (
                    <TableRow><TableCell colSpan="5" className="text-center text-zinc-500 py-4">No items added to this invoice yet.</TableCell></TableRow>
                  ) : (
                    viewingInvoiceItems?.items?.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className={descriptionTextClasses}>{item.description}</TableCell>
                        <TableCell className={`${descriptionTextClasses} text-right`}>{item.quantity}</TableCell>
                        <TableCell className={`${descriptionTextClasses} text-right`}>${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className={`${descriptionTextClasses} text-right`}>${item.totalPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleEditItem(item)} title="Edit Item"><Edit3 className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" className="h-7 w-7 text-red-600 border-red-300 hover:bg-red-100" onClick={() => handleDeleteItem(item.id, item.description)} title="Delete Item"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
