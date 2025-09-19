// app/[subdomain]/(school_app)/finance/expenses/page.jsx
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
import { Checkbox } from "@/components/ui/checkbox"; // For isPaid
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FilePlus2, Edit3, Trash2, DollarSign, Loader2, AlertTriangle, PlusCircle, User, Briefcase, CalendarDays, Printer, Receipt, Tag, GalleryVerticalEnd, List
} from 'lucide-react'; // Added Tag, GalleryVerticalEnd, List icons

// Initial form data for Expense Category
const initialCategoryFormData = {
  id: null,
  name: '',
  description: '',
};

// Initial form data for Expense
const initialExpenseFormData = {
  id: null,
  description: '',
  amount: '',
  date: format(new Date(), 'yyyy-MM-dd'), // Default to current date
  categoryId: '',
  vendorId: '', // Optional
  receiptUrl: '', // Optional
};


// Reusable FormFields Component for Expense Category
const ExpenseCategoryFormFields = ({ formData, onFormChange, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  return (
    <div className="grid grid-cols-1 gap-y-4">
      <div>
        <Label htmlFor="categoryName" className={labelTextClasses}>Category Name <span className="text-red-500">*</span></Label>
        <Input id="categoryName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="categoryDescription" className={labelTextClasses}>Description (Optional)</Label>
        <Textarea id="categoryDescription" name="description" value={formData.description || ''} onChange={onFormChange} rows={2} className={`${inputTextClasses} mt-1`} />
      </div>
    </div>
  );
};

// Reusable FormFields Component for Expense
const ExpenseFormFields = ({ formData, onFormChange, onSelectChange, expenseCategoriesList, vendorsList, staffUsersList, isLoadingDeps }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const getCategoryName = useCallback((id) => {
    const category = expenseCategoriesList.find(c => c.id === id);
    return category ? category.name : 'N/A';
  }, [expenseCategoriesList]);

  const getVendorName = useCallback((id) => {
    const vendor = vendorsList.find(v => v.id === id);
    return vendor ? vendor.name : 'N/A';
  }, [vendorsList]);

  const getStaffUserName = useCallback((id) => {
    const user = staffUsersList.find(u => u.id === id);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'N/A';
  }, [staffUsersList]);


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor="expenseDescription" className={labelTextClasses}>Description <span className="text-red-500">*</span></Label>
        <Textarea id="expenseDescription" name="description" value={formData.description || ''} onChange={onFormChange} required rows={2} className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="amount" className={labelTextClasses}>Amount <span className="text-red-500">*</span></Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0" value={formData.amount || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., 150.75" />
      </div>
      <div>
        <Label htmlFor="date" className={labelTextClasses}>Date <span className="text-red-500">*</span></Label>
        <Input id="date" name="date" type="date" value={formData.date || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="categoryId" className={labelTextClasses}>Category <span className="text-red-500">*</span></Label>
        <Select name="categoryId" value={formData.categoryId || ''} onValueChange={(value) => onSelectChange('categoryId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select category" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isLoadingDeps && (!Array.isArray(expenseCategoriesList) || expenseCategoriesList.length === 0) && <SelectItem value="no-categories" disabled>No categories available</SelectItem>}
            {Array.isArray(expenseCategoriesList) && expenseCategoriesList.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="vendorId" className={labelTextClasses}>Vendor (Optional)</Label>
        <Select name="vendorId" value={formData.vendorId || 'none'} onValueChange={(value) => onSelectChange('vendorId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select vendor" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">No Vendor</SelectItem>
            {!isLoadingDeps && (!Array.isArray(vendorsList) || vendorsList.length === 0) && <SelectItem value="no-vendors" disabled>No vendors available</SelectItem>}
            {Array.isArray(vendorsList) && vendorsList.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="receiptUrl" className={labelTextClasses}>Receipt URL (Optional)</Label>
        <Input id="receiptUrl" name="receiptUrl" type="url" value={formData.receiptUrl || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="Link to receipt image/PDF" />
      </div>
    </div>
  );
};


export default function ManageExpensesPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]); // For vendor dropdown
  const [staffUsers, setStaffUsers] = useState([]); // For paidBy dropdown (Users who are staff)

  const [isLoading, setIsLoading] = useState(true); // For main table
  const [isLoadingDeps, setIsLoadingDeps] = useState(true); // For dropdowns
  const [error, setError] = useState('');

  // Filters
  const [filterCategoryId, setFilterCategoryId] = useState(''); // Corrected variable name for filter
  const [filterVendorId, setFilterVendorId] = useState('');     // Corrected variable name for filter
  const [filterDateFrom, setFilterDateFrom] = useState('');     // Corrected variable name for filter
  const [filterDateTo, setFilterDateTo] = useState('');         // Corrected variable name for filter
  const [filterPaidById, setFilterPaidById] = useState('');     // Corrected variable name for filter


  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);

  const [categoryFormData, setCategoryFormData] = useState({ ...initialCategoryFormData });
  const [expenseFormData, setExpenseFormData] = useState({ ...initialExpenseFormData });

  const [editingCategory, setEditingCategory] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  const [categoryFormError, setCategoryFormError] = useState('');
  const [expenseFormError, setExpenseFormError] = useState(''); // FIX: Defined here


  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  // FIX: Defined filterInputClasses here, accessible throughout component
  const filterInputClasses = 'bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500';


  // --- Fetching Data ---
  const fetchExpenseCategories = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); // Use main loading for initial category fetch
    setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/expense-categories`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch expense categories.'); }
      const data = await response.json();
      setExpenseCategories(data.categories || []);
    } catch (err) { toast.error("Error fetching categories", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchExpenses = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); // Use main loading for expenses too
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (filterCategoryId) queryParams.append('categoryId', filterCategoryId);
      if (filterVendorId) queryParams.append('vendorId', filterVendorId);
      if (filterDateFrom) queryParams.append('dateFrom', filterDateFrom);
      if (filterDateTo) queryParams.append('dateTo', filterDateTo);
      if (filterPaidById) queryParams.append('processedById', filterPaidById); // Corrected parameter name

      const response = await fetch(`/api/schools/${schoolData.id}/finance/expenses?${queryParams.toString()}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch expenses.'); }
      const data = await response.json();
      setExpenses(data.expenses || []);
    } catch (err) { toast.error("Error fetching expenses", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id, filterCategoryId, filterVendorId, filterDateFrom, filterDateTo, filterPaidById]); // Depend on filters


  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;

    try {
      const [categoriesRes, vendorsRes, staffUsersRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/finance/expense-categories`), // Categories for expense dropdown
        fetch(`/api/schools/${schoolData.id}/finance/vendors`), // Vendors for expense dropdown (assuming this route exists)
        fetch(`/api/schools/${schoolData.id}/people/staff?limit=1000`), // Unified staff users for Paid By dropdown
      ]);

      // Process Categories
      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
        const categoriesData = await categoriesRes.value.json();
        setExpenseCategories(Array.isArray(categoriesData.categories) ? categoriesData.categories : []);
      } else {
        const errorData = categoriesRes.status === 'rejected' ? categoriesRes.reason : await categoriesRes.value.json().catch(() => ({}));
        console.error("Categories dropdown fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch categories for dropdown.');
      }

      // Process Vendors
      if (vendorsRes.status === 'fulfilled' && vendorsRes.value.ok) {
        const vendorsData = await vendorsRes.value.json();
        setVendors(Array.isArray(vendorsData.vendors) ? vendorsData.vendors : []);
      } else {
        const errorData = vendorsRes.status === 'rejected' ? vendorsRes.reason : await vendorsRes.value.json().catch(() => ({}));
        console.error("Vendors dropdown fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch vendors for dropdown.');
      }
      
      // Process Staff Users (for Paid By)
      if (staffUsersRes.status === 'fulfilled' && staffUsersRes.value.ok) {
        const staffUsersData = await staffUsersRes.value.json();
        // Unified endpoint returns users array directly
        setStaffUsers(Array.isArray(staffUsersData.users) ? staffUsersData.users : []);
      } else {
        const errorData = staffUsersRes.status === 'rejected' ? staffUsersRes.reason : await staffUsersRes.value.json().catch(() => ({}));
        console.error("Staff Users dropdown fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch staff users for dropdown.');
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
      fetchExpenseCategories(); // Initial fetch for category table
      fetchExpenses(); // Initial fetch for expenses table
      fetchDropdownDependencies(); // Fetch dependencies for forms/filters
    }
  }, [schoolData, session, fetchExpenseCategories, fetchExpenses, fetchDropdownDependencies]);

  // --- Category Form Handlers ---
  const handleCategoryFormChange = (e) => setCategoryFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const openAddCategoryDialog = () => {
    setEditingCategory(null);
    setCategoryFormData({ ...initialCategoryFormData });
    setCategoryFormError('');
    setIsCategoryDialogOpen(true);
  };

  const openEditCategoryDialog = (category) => {
    setEditingCategory(category);
    setCategoryFormData({
      id: category.id,
      name: category.name || '',
      description: category.description || '',
    });
    setCategoryFormError('');
    setIsCategoryDialogOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingCategory(true); setCategoryFormError('');

    const isEditing = !!editingCategory;
    const payload = {
      name: categoryFormData.name,
      description: categoryFormData.description || null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/finance/expense-categories/${editingCategory.id}`
      : `/api/schools/${schoolData.id}/finance/expense-categories`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} category.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setCategoryFormError(err);
      } else {
        toast.success(`Category "${result.category?.name}" ${actionText}d successfully!`);
        setIsCategoryDialogOpen(false);
        fetchExpenseCategories(); // Re-fetch categories for table
        fetchDropdownDependencies(); // Also refresh dropdown dependencies (categories for expense form)
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setCategoryFormError('An unexpected error occurred.');
    } finally { setIsSubmittingCategory(false); }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE category "${categoryName}"? This will affect any associated expenses.`)) return;
    const toastId = `delete-category-${categoryId}`;
    toast.loading("Deleting category...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/expense-categories/${categoryId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Category "${categoryName}" deleted.`, { id: toastId });
      fetchExpenseCategories(); // Re-fetch categories
      fetchDropdownDependencies(); // Also refresh dropdown dependencies
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Expense Form Handlers ---
  const handleExpenseFormChange = (e) => setExpenseFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleExpenseSelectChange = (name, value) => setExpenseFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));

  const openAddExpenseDialog = () => {
    setEditingExpense(null);
    setExpenseFormData({ ...initialExpenseFormData });
    setExpenseFormError('');
    setIsExpenseDialogOpen(true);
  };

  const openEditExpenseDialog = (expense) => {
    setEditingExpense(expense);
    setExpenseFormData({
      id: expense.id,
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      date: expense.date ? format(new Date(expense.date), 'yyyy-MM-dd') : '',
      categoryId: expense.categoryId || '',
      vendorId: expense.vendorId || '',
      receiptUrl: expense.receiptUrl || '',
      // paidById will be current user, not edited here
    });
    setExpenseFormError('');
    setIsExpenseDialogOpen(true);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingExpense(true); setExpenseFormError('');

    const isEditing = !!editingExpense;
    const payload = {
      description: expenseFormData.description,
      amount: parseFloat(expenseFormData.amount),
      date: new Date(expenseFormData.date).toISOString(),
      categoryId: expenseFormData.categoryId,
      vendorId: expenseFormData.vendorId || null,
      receiptUrl: expenseFormData.receiptUrl || null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/finance/expenses/${editingExpense.id}`
      : `/api/schools/${schoolData.id}/finance/expenses`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} expense.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setExpenseFormError(err);
      } else {
        toast.success(`Expense ${actionText}d successfully!`);
        setIsExpenseDialogOpen(false);
        fetchExpenses(); // Re-fetch expenses
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setExpenseFormError('An unexpected error occurred.');
    } finally { setIsSubmittingExpense(false); }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE this expense record?`)) return;
    const toastId = `delete-expense-${expenseId}`;
    toast.loading("Deleting expense...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/finance/expenses/${expenseId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Expense deleted.`, { id: toastId });
      fetchExpenses();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Helper Functions for Display ---
  const getCategoryName = useCallback((id) => {
    const category = expenseCategories.find(c => c.id === id);
    return category ? category.name : 'N/A';
  }, [expenseCategories]);

  const getVendorName = useCallback((id) => {
    const vendor = vendors.find(v => v.id === id);
    return vendor ? vendor.name : 'N/A';
  }, [vendors]);

  const getPaidByName = useCallback((id) => {
    // Assuming staffUsers are user objects, not staff objects
    const user = staffUsers.find(u => u.id === id);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'N/A';
  }, [staffUsers]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Briefcase className="mr-3 h-8 w-8 opacity-80"/>Manage Expenses
          </h1>
          <p className={descriptionTextClasses}>Track and categorize all financial expenses of the school.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Add Category Button */}
          <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => { setIsCategoryDialogOpen(open); if (!open) setCategoryFormError(''); }}>
            <DialogTrigger asChild>
              <Button className={outlineButtonClasses} onClick={openAddCategoryDialog}> <Tag className="mr-2 h-4 w-4" /> Add Category </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className={titleTextClasses}>{editingCategory ? 'Edit Expense Category' : 'Add New Expense Category'}</DialogTitle>
                <DialogDescription className={descriptionTextClasses}>
                  {editingCategory ? 'Update category details.' : 'Create a new category for organizing expenses.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCategorySubmit} className="space-y-6 py-1">
                <ExpenseCategoryFormFields
                  formData={categoryFormData}
                  onFormChange={handleCategoryFormChange}
                  isEdit={!!editingCategory}
                />
                {categoryFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{categoryFormError}</p> )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingCategory}>
                    {isSubmittingCategory ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingCategory ? 'Saving...' : 'Creating...'}</> : editingCategory ? 'Save Changes' : 'Create Category'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Expense Button */}
          <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => { setIsExpenseDialogOpen(open); if (!open) setExpenseFormError(''); }}>
            <DialogTrigger asChild>
              <Button className={primaryButtonClasses} onClick={openAddExpenseDialog}> <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className={titleTextClasses}>{editingExpense ? 'Edit Expense Record' : 'Add New Expense'}</DialogTitle>
                <DialogDescription className={descriptionTextClasses}>
                  {editingExpense ? 'Update expense details.' : 'Record a new financial expense.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleExpenseSubmit} className="space-y-6 py-1">
                <ExpenseFormFields
                  formData={expenseFormData}
                  onFormChange={handleExpenseFormChange}
                  onSelectChange={handleExpenseSelectChange}
                  expenseCategoriesList={expenseCategories}
                  vendorsList={vendors}
                  staffUsersList={staffUsers}
                  isLoadingDeps={isLoadingDeps}
                />
                {expenseFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{expenseFormError}</p> )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingExpense || isLoadingDeps}>
                    {isSubmittingExpense ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingExpense ? 'Saving...' : 'Creating...'}</> : editingExpense ? 'Save Changes' : 'Add Expense'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      {/* Expense Categories Table */}
      <div className={`${glassCardClasses} overflow-x-auto mb-8`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <Tag className="mr-2 h-6 w-6 opacity-80"/>Expense Categories
        </h2>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Category Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Description</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <TableRow key={`cat-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-48 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : expenseCategories.length > 0 ? expenseCategories.map((category) => (
              <TableRow key={category.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{category.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{category.description || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditCategoryDialog(category)} title="Edit Category"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteCategory(category.id, category.name)} title="Delete Category"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="3" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No expense categories defined yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Expenses Table */}
      <div className={`${glassCardClasses} overflow-x-auto`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <DollarSign className="mr-2 h-6 w-6 opacity-80"/>Expense Records
        </h2>
        {/* Expense Filters */}
        <div className={`flex flex-wrap items-center gap-4 mb-4`}>
          <Select value={filterCategoryId || 'all'} onValueChange={(value) => setFilterCategoryId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
            <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Category" /> </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              <SelectItem value="all">All Categories</SelectItem>
              {Array.isArray(expenseCategories) && expenseCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterVendorId || 'all'} onValueChange={(value) => setFilterVendorId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
            <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Vendor" /> </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              <SelectItem value="all">All Vendors</SelectItem>
              {Array.isArray(vendors) && vendors.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Label htmlFor="expenseDateFrom" className="text-zinc-600 dark:text-zinc-400">Date From:</Label>
          <Input id="expenseDateFrom" name="dateFrom" type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={`${filterInputClasses} w-[150px]`} />

          <Label htmlFor="expenseDateTo" className="text-zinc-600 dark:text-zinc-400">Date To:</Label>
          <Input id="expenseDateTo" name="dateTo" type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={`${filterInputClasses} w-[150px]`} />

          <Select value={filterPaidById || 'all'} onValueChange={(value) => setFilterPaidById(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
            <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Paid By" /> </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              <SelectItem value="all">All Staff</SelectItem>
              {Array.isArray(staffUsers) && staffUsers.map(user => <SelectItem key={user.id} value={user.id}>{`${user.firstName} ${user.lastName}`}</SelectItem>)}
            </SelectContent>
          </Select>


          <Button onClick={() => { setFilterCategoryId(''); setFilterVendorId(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterPaidById(''); }} variant="outline" className={outlineButtonClasses}>
            Reset Filters
          </Button>
        </div>


        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Description</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-right`}>Amount</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Date</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Category</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Vendor</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden lg:table-cell`}>Paid By</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`exp-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : expenses.length > 0 ? expenses.map((expense) => (
              <TableRow key={expense.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{expense.description}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-right`}>${expense.amount.toFixed(2)}</TableCell>
                <TableCell className={`${descriptionTextClasses}`}>{isValid(new Date(expense.date)) ? format(new Date(expense.date), 'MMM dd,yyyy') : 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{getCategoryName(expense.categoryId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{getVendorName(expense.vendorId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden lg:table-cell`}>{getPaidByName(expense.paidById)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    {expense.receiptUrl && (
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => window.open(expense.receiptUrl, '_blank')} title="View Receipt"> <GalleryVerticalEnd className="h-4 w-4" /> </Button>
                    )}
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditExpenseDialog(expense)} title="Edit Expense"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteExpense(expense.id)} title="Delete Expense"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="7" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No expense records found. Click "Add New Expense" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
