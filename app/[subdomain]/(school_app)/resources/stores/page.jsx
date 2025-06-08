// app/[subdomain]/(school_app)/resources/stores/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';

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
  FilePlus2, Edit3, Trash2, Store, List, Box, Layers, Loader2, AlertTriangle, Package, Tags, Scale
} from 'lucide-react'; // Added Package, Tags, Scale icons

// Initial form data for Inventory Category
const initialCategoryFormData = {
  id: null,
  name: '',
};

// Initial form data for Inventory Item
const initialItemFormData = {
  id: null,
  name: '',
  description: '',
  categoryId: '',
  quantityInStock: 0,
  reorderLevel: '',
  supplierInfo: '',
};


// Reusable FormFields Component for Inventory Category
const InventoryCategoryFormFields = ({ formData, onFormChange, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  return (
    <div className="grid grid-cols-1 gap-y-4">
      <div>
        <Label htmlFor="categoryName" className={labelTextClasses}>Category Name <span className="text-red-500">*</span></Label>
        <Input id="categoryName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
    </div>
  );
};

// Reusable FormFields Component for Inventory Item
const InventoryItemFormFields = ({ formData, onFormChange, onSelectChange, categoriesList, isLoadingDeps, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor="itemName" className={labelTextClasses}>Item Name <span className="text-red-500">*</span></Label>
        <Input id="itemName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="description" className={labelTextClasses}>Description (Optional)</Label>
        <Textarea id="description" name="description" value={formData.description || ''} onChange={onFormChange} rows={2} className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="categoryId" className={labelTextClasses}>Category (Optional)</Label>
        <Select name="categoryId" value={formData.categoryId || 'none'} onValueChange={(value) => onSelectChange('categoryId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select category" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">No Category</SelectItem>
            {!isLoadingDeps && (!Array.isArray(categoriesList) || categoriesList.length === 0) && <SelectItem value="no-categories" disabled>No categories available</SelectItem>}
            {Array.isArray(categoriesList) && categoriesList.map(category => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="quantityInStock" className={labelTextClasses}>Quantity in Stock <span className="text-red-500">*</span></Label>
        <Input id="quantityInStock" name="quantityInStock" type="number" min="0" value={formData.quantityInStock || 0} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="reorderLevel" className={labelTextClasses}>Reorder Level (Optional)</Label>
        <Input id="reorderLevel" name="reorderLevel" type="number" min="0" value={formData.reorderLevel || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., 10" />
      </div>
      <div>
        <Label htmlFor="supplierInfo" className={labelTextClasses}>Supplier Info (Optional)</Label>
        <Input id="supplierInfo" name="supplierInfo" value={formData.supplierInfo || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., ABC Supplies" />
      </div>
    </div>
  );
};


export default function ManageStoresPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // For main tables
  const [isLoadingDeps, setIsLoadingDeps] = useState(true); // For dropdowns (categories)
  const [error, setError] = useState('');

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

  const [categoryFormData, setCategoryFormData] = useState({ ...initialCategoryFormData });
  const [itemFormData, setItemFormData] = useState({ ...initialItemFormData });

  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  const [categoryFormError, setCategoryFormError] = useState('');
  const [itemFormError, setItemFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  // --- Fetching Data ---
  const fetchCategories = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); // Use main loading for initial category fetch
    setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/inventory-categories`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch inventory categories.'); }
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err) { toast.error("Error fetching categories", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchItems = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); // Use main loading for items too
    setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/inventory-items`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch inventory items.'); }
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) { toast.error("Error fetching items", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;
    try {
      const [categoriesRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/resources/inventory-categories`), // Fetch categories for item dropdown
      ]);

      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
        const categoriesData = await categoriesRes.value.json();
        setCategories(Array.isArray(categoriesData.categories) ? categoriesData.categories : []);
      } else {
        const errorData = categoriesRes.status === 'rejected' ? categoriesRes.reason : await categoriesRes.value.json().catch(() => ({}));
        console.error("Categories dropdown fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch categories for dropdown.');
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
      fetchCategories(); // Initial fetch for category table
      fetchItems(); // Initial fetch for item table
      fetchDropdownDependencies(); // Fetch categories for item dropdown
    }
  }, [schoolData, session, fetchCategories, fetchItems, fetchDropdownDependencies]);

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
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/resources/inventory-categories/${editingCategory.id}`
      : `/api/schools/${schoolData.id}/resources/inventory-categories`;
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
        fetchCategories(); // Re-fetch categories
        fetchDropdownDependencies(); // Also refresh dropdown deps
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setCategoryFormError('An unexpected error occurred.');
    } finally { setIsSubmittingCategory(false); }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE category "${categoryName}"? This will affect any associated inventory items.`)) return;
    const toastId = `delete-category-${categoryId}`;
    toast.loading("Deleting category...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/inventory-categories/${categoryId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Category "${categoryName}" deleted.`, { id: toastId });
      fetchCategories();
      fetchDropdownDependencies(); // Also refresh dropdown deps
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Item Form Handlers ---
  const handleItemFormChange = (e) => setItemFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleItemSelectChange = (name, value) => setItemFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));

  const openAddItemDialog = () => {
    setEditingItem(null);
    setItemFormData({ ...initialItemFormData });
    setItemFormError('');
    setIsItemDialogOpen(true);
  };

  const openEditItemDialog = (item) => {
    setEditingItem(item);
    setItemFormData({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      categoryId: item.categoryId || '',
      quantityInStock: item.quantityInStock,
      reorderLevel: item.reorderLevel?.toString() || '',
      supplierInfo: item.supplierInfo || '',
    });
    setItemFormError('');
    setIsItemDialogOpen(true);
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingItem(true); setItemFormError('');

    const isEditing = !!editingItem;
    const payload = {
      name: itemFormData.name,
      description: itemFormData.description || null,
      categoryId: itemFormData.categoryId || null,
      quantityInStock: parseInt(itemFormData.quantityInStock, 10),
      reorderLevel: itemFormData.reorderLevel ? parseInt(itemFormData.reorderLevel, 10) : null,
      supplierInfo: itemFormData.supplierInfo || null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/resources/inventory-items/${editingItem.id}`
      : `/api/schools/${schoolData.id}/resources/inventory-items`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} item.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setItemFormError(err);
      } else {
        toast.success(`Item "${result.item?.name}" ${actionText}d successfully!`);
        setIsItemDialogOpen(false);
        fetchItems(); // Re-fetch items
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setItemFormError('An unexpected error occurred.');
    } finally { setIsSubmittingItem(false); }
  };

  const handleDeleteItem = async (itemId, itemName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE item "${itemName}"? This may affect associated purchase orders.`)) return;
    const toastId = `delete-item-${itemId}`;
    toast.loading("Deleting item...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/inventory-items/${itemId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Item "${itemName}" deleted.`, { id: toastId });
      fetchItems();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Helper Functions for Display ---
  const getCategoryName = useCallback((id) => {
    const category = categories.find(c => c.id === id);
    return category ? category.name : 'N/A';
  }, [categories]);

  const isLowStock = (item) => item.reorderLevel !== null && item.quantityInStock <= item.reorderLevel;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Store className="mr-3 h-8 w-8 opacity-80"/>Manage Inventory & Stores
          </h1>
          <p className={descriptionTextClasses}>Categorize, track, and manage school inventory items.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Add Category Button */}
          <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => { setIsCategoryDialogOpen(open); if (!open) setCategoryFormError(''); }}>
            <DialogTrigger asChild>
              <Button className={outlineButtonClasses} onClick={openAddCategoryDialog}> <Tags className="mr-2 h-4 w-4" /> Add Category </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className={titleTextClasses}>{editingCategory ? 'Edit Inventory Category' : 'Add New Inventory Category'}</DialogTitle>
                <DialogDescription className={descriptionTextClasses}>
                  {editingCategory ? 'Update category name.' : 'Create a new category for organizing inventory items.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCategorySubmit} className="space-y-6 py-1">
                <InventoryCategoryFormFields
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

          {/* Add Item Button */}
          <Dialog open={isItemDialogOpen} onOpenChange={(open) => { setIsItemDialogOpen(open); if (!open) setItemFormError(''); }}>
            <DialogTrigger asChild>
              <Button className={primaryButtonClasses} onClick={openAddItemDialog}> <Package className="mr-2 h-4 w-4" /> Add New Item </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className={titleTextClasses}>{editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</DialogTitle>
                <DialogDescription className={descriptionTextClasses}>
                  {editingItem ? 'Update item details.' : 'Fill in the details for a new inventory item.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleItemSubmit} className="space-y-6 py-1">
                <InventoryItemFormFields
                  formData={itemFormData}
                  onFormChange={handleItemFormChange}
                  onSelectChange={handleItemSelectChange}
                  categoriesList={categories}
                  isLoadingDeps={isLoadingDeps}
                  isEdit={!!editingItem}
                />
                {itemFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{itemFormError}</p> )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingItem || isLoadingDeps}>
                    {isSubmittingItem ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingItem ? 'Saving...' : 'Creating...'}</> : editingItem ? 'Save Changes' : 'Create Item'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      {/* Inventory Categories Table */}
      <div className={`${glassCardClasses} overflow-x-auto mb-8`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <Tags className="mr-2 h-6 w-6 opacity-80"/>Inventory Categories
        </h2>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Category Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center hidden sm:table-cell`}>Items Count</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <TableRow key={`cat-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="text-center hidden sm:table-cell"><Skeleton className="h-5 w-10 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : categories.length > 0 ? categories.map((category) => (
              <TableRow key={category.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{category.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-center hidden sm:table-cell`}>{category._count?.items ?? 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditCategoryDialog(category)} title="Edit Category"> <Edit3 className="h-4 w-4" /> </Button>
                    {/* Link to view items in this category */}
                    <Link href={`/${schoolData.subdomain}/resources/stores?categoryId=${category.id}`} passHref>
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="View Items"> <List className="h-4 w-4" /> </Button>
                    </Link>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteCategory(category.id, category.name)} title="Delete Category"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="3" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No inventory categories defined yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Inventory Items Table */}
      <div className={`${glassCardClasses} overflow-x-auto`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <Package className="mr-2 h-6 w-6 opacity-80"/>Inventory Items
        </h2>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Item Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Category</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-right`}>Quantity</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-right hidden md:table-cell`}>Reorder Level</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`item-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="text-right hidden md:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : items.length > 0 ? items.map((item) => (
              <TableRow key={item.id} className={`border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5 ${isLowStock(item) ? 'bg-orange-500/10 dark:bg-orange-800/20' : ''}`}>
                <TableCell className={`${descriptionTextClasses} font-medium ${isLowStock(item) ? 'text-orange-600 dark:text-orange-400' : ''}`}>{item.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{getCategoryName(item.categoryId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-right ${isLowStock(item) ? 'font-semibold text-orange-600 dark:text-orange-400' : ''}`}>{item.quantityInStock}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-right hidden md:table-cell`}>{item.reorderLevel || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditItemDialog(item)} title="Edit Item"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteItem(item.id, item.name)} title="Delete Item"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No inventory items defined yet. Click "Add New Item" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
