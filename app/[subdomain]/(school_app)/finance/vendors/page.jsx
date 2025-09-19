// app/[subdomain]/(school_app)/finance/vendors/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Search, PlusCircle, Edit3, Trash2, Building2, Mail, Phone, MapPin, Loader2, RefreshCcw } from 'lucide-react';

// Initial form data for Vendor
const initialVendorForm = {
  id: null,
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
};

export default function VendorsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [vendorFormData, setVendorFormData] = useState({ ...initialVendorForm });
  const [editingVendor, setEditingVendor] = useState(null);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [formError, setFormError] = useState('');

  const titleTextClasses = 'text-black dark:text-white';
  const descriptionTextClasses = 'text-zinc-600 dark:text-zinc-400';
  const inputClasses = 'bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500';
  const glassCardClasses = 'p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50';

  const canManage = useMemo(() => {
    const role = session?.user?.role;
    return ['SCHOOL_ADMIN', 'ACCOUNTANT', 'PROCUREMENT_OFFICER'].includes(role);
  }, [session?.user?.role]);

  // Fetch Vendors
  const fetchVendors = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/finance/vendors`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch vendors.');
      setVendors(Array.isArray(data.vendors) ? data.vendors : []);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load vendors', { description: err.message });
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  useEffect(() => { if (schoolData?.id && session) fetchVendors(); }, [schoolData, session, fetchVendors]);

  // Dialog handlers
  const openAddVendorDialog = () => {
    setEditingVendor(null);
    setVendorFormData({ ...initialVendorForm });
    setFormError('');
    setIsVendorDialogOpen(true);
  };

  const openEditVendorDialog = (vendor) => {
    setEditingVendor(vendor);
    setVendorFormData({
      id: vendor.id,
      name: vendor.name || '',
      contactPerson: vendor.contactPerson || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
    });
    setFormError('');
    setIsVendorDialogOpen(true);
  };

  const handleVendorFormChange = (e) => setVendorFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingVendor(true); setFormError('');
    const isEditing = !!editingVendor;
    const payload = {
      name: vendorFormData.name,
      contactPerson: vendorFormData.contactPerson || null,
      email: vendorFormData.email || null,
      phone: vendorFormData.phone || null,
      address: vendorFormData.address || null,
    };
    const url = isEditing ? `/api/schools/${schoolData.id}/finance/vendors/${editingVendor.id}` : `/api/schools/${schoolData.id}/finance/vendors`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || `Failed to ${actionText} vendor.`;
        if (data.issues) msg = data.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        setFormError(msg);
        toast.error(`${actionText === 'create' ? 'Create' : 'Update'} Failed`, { description: msg });
      } else {
        toast.success(`Vendor "${data.vendor?.name}" ${actionText}d successfully.`);
        setIsVendorDialogOpen(false);
        fetchVendors();
      }
    } catch (err) {
      setFormError('Unexpected error.');
      toast.error('Unexpected error creating/updating vendor');
    } finally { setIsSubmittingVendor(false); }
  };

  const handleDeleteVendor = async (vendor) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Delete vendor "${vendor.name}"? This cannot be undone (linked expenses may block deletion).`)) return;
    const toastId = `delete-vendor-${vendor.id}`;
    toast.loading('Deleting vendor...', { id: toastId });
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/finance/vendors/${vendor.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success(data.message || 'Vendor deleted', { id: toastId });
      fetchVendors();
    } catch (err) {
      toast.error(`Delete Failed: ${err.message}`, { id: toastId });
    }
  };

  const filteredVendors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter(v => [v.name, v.contactPerson, v.email, v.phone, v.address].some(f => (f || '').toLowerCase().includes(term)));
  }, [vendors, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${titleTextClasses}`}>Vendors</h1>
          <p className={`mt-1 text-sm ${descriptionTextClasses}`}>Manage suppliers & service providers used in expenses and procurement.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input placeholder="Search vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`pl-8 w-64 ${inputClasses}`} />
          </div>
          <Button variant="outline" onClick={fetchVendors} disabled={isLoading} className="flex gap-2 items-center">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Refresh
          </Button>
          {canManage && (
            <Button onClick={openAddVendorDialog} className="flex gap-2 items-center bg-black text-white dark:bg-white dark:text-black">
              <PlusCircle className="w-4 h-4" /> New Vendor
            </Button>
          )}
        </div>
      </div>

      <Card className={glassCardClasses}>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                {canManage && <TableHead className="text-right w-32">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5}>
                    <div className="flex flex-col gap-2">
                      {[...Array(5)].map((_,i)=>(<Skeleton key={i} className="h-6 w-full" />))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredVendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5}>
                    <div className="text-sm text-zinc-500 py-6 text-center">No vendors found{searchTerm ? ' for this search.' : '.'}</div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredVendors.map(vendor => (
                <TableRow key={vendor.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                  <TableCell className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-500" /> {vendor.name}
                  </TableCell>
                  <TableCell>{vendor.contactPerson || <span className="text-zinc-400">—</span>}</TableCell>
                  <TableCell>
                    {vendor.email ? (
                      <a href={`mailto:${vendor.email}`} className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"><Mail className="w-3 h-3" />{vendor.email}</a>
                    ) : <span className="text-zinc-400">—</span>}
                  </TableCell>
                  <TableCell>{vendor.phone ? <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{vendor.phone}</span> : <span className="text-zinc-400">—</span>}</TableCell>
                  <TableCell className="max-w-xs truncate" title={vendor.address || ''}>{vendor.address || <span className="text-zinc-400">—</span>}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditVendorDialog(vendor)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDeleteVendor(vendor)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Vendor Create / Edit Dialog */}
      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>{editingVendor ? 'Edit Vendor' : 'New Vendor'}</DialogTitle>
            <DialogDescription className={descriptionTextClasses}>
              {editingVendor ? 'Update vendor information.' : 'Add a new supplier or service provider.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVendorSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input id="name" name="name" value={vendorFormData.name} onChange={handleVendorFormChange} required className={inputClasses} />
              </div>
              <div>
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" name="contactPerson" value={vendorFormData.contactPerson} onChange={handleVendorFormChange} className={inputClasses} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" name="email" value={vendorFormData.email} onChange={handleVendorFormChange} className={inputClasses} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={vendorFormData.phone} onChange={handleVendorFormChange} className={inputClasses} />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" value={vendorFormData.address} onChange={handleVendorFormChange} rows={2} className={inputClasses} />
              </div>
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <DialogFooter className="flex gap-2 justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmittingVendor}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmittingVendor} className="bg-black text-white dark:bg-white dark:text-black flex gap-2 items-center">
                {isSubmittingVendor && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingVendor ? 'Update Vendor' : 'Create Vendor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
