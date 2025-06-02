// app/(superadmin)/users/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react'; // For checking current user's role if needed, API handles main auth
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Edit3, Trash2, Users as UsersIcon, AlertTriangle, CheckSquare, XSquare, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const initialFormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  isActive: true,
};

// Reusable FormFields Component for Add/Edit Super Admin
const SuperAdminFormFields = ({ formData, onFormChange, onSwitchChange, isEdit = false }) => {
  const titleTextClasses = "text-black dark:text-white";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  if (!formData) return <div className="p-4"><Loader2 className="h-6 w-6 animate-spin text-sky-600" /></div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[65vh] overflow-y-auto p-1 custom-scrollbar">
      <div><Label htmlFor={isEdit ? "editFirstName" : "firstName"} className={labelTextClasses}>First Name <span className="text-red-500">*</span></Label><Input id={isEdit ? "editFirstName" : "firstName"} name="firstName" value={formData.firstName || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
      <div><Label htmlFor={isEdit ? "editLastName" : "lastName"} className={labelTextClasses}>Last Name <span className="text-red-500">*</span></Label><Input id={isEdit ? "editLastName" : "lastName"} name="lastName" value={formData.lastName || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
      <div className="sm:col-span-2"><Label htmlFor={isEdit ? "editEmail" : "email"} className={labelTextClasses}>Email <span className="text-red-500">*</span></Label><Input id={isEdit ? "editEmail" : "email"} name="email" type="email" value={formData.email || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
      <div>
        <Label htmlFor={isEdit ? "editPassword" : "password"} className={labelTextClasses}>
            {isEdit ? "New Password (optional)" : "Password"} <span className={!isEdit ? "text-red-500" : ""}>{!isEdit ? "*" : ""}</span>
        </Label>
        <Input 
            id={isEdit ? "editPassword" : "password"} 
            name="password" type="password" 
            value={formData.password || ''} 
            onChange={onFormChange} 
            required={!isEdit} 
            minLength={formData.password || !isEdit ? 8 : undefined} 
            className={`${inputTextClasses} mt-1`}
            placeholder={isEdit ? "Leave blank to keep current" : "Min. 8 characters"}
        />
      </div>
      <div className="flex items-center space-x-2 pt-2 self-end pb-1">
        <Switch id={isEdit ? "editIsActiveSA" : "isActiveSA"} name="isActive" checked={formData.isActive} onCheckedChange={(checked) => onSwitchChange('isActive', checked)} />
        <Label htmlFor={isEdit ? "editIsActiveSA" : "isActiveSA"} className={`text-sm font-medium ${titleTextClasses}`}>Set Account as Active</Label>
      </div>
    </div>
  );
};

export default function ManageSuperAdminUsersPage() {
  const { data: session } = useSession(); // For auth checks if needed on client

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({...initialFormData});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // State for Edit Dialog (to be fully implemented later)
  const [editingUser, setEditingUser] = useState(null); 
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);


  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchSuperAdmins = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/superadmin/users`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch super admin users.');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      toast.error("Error fetching users", { description: err.message }); setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === 'SUPER_ADMIN') { // Ensure only super admins fetch this
        fetchSuperAdmins();
    }
  }, [session, fetchSuperAdmins]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleSwitchChange = (name, checked) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const openAddDialog = () => { 
    setEditingUser(null); 
    setFormData({...initialFormData}); 
    setFormError(''); 
    setIsAddDialogOpen(true); 
  };
  
  // TODO: Implement openEditDialog to fetch user data if needed and set formData
  const openEditDialog = (user) => {
    setEditingUser(user);
    setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '', // Keep password blank for edit
        isActive: user.isActive !== undefined ? user.isActive : true,
    });
    setFormError('');
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); setFormError('');

    const isEditing = !!editingUser;
    const url = isEditing
      ? `/api/superadmin/users/${editingUser.id}`
      : `/api/superadmin/users`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';
    
    let payload = { ...formData };
    if (isEditing) {
        if (!payload.password || payload.password.trim() === '') {
            delete payload.password; // Don't send empty password for update
        }
    }

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} super admin.`;
        if(result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setFormError(err);
      } else {
        toast.success(`Super Admin "${result.user?.firstName} ${result.user?.lastName}" ${actionText}d successfully!`);
        if (isEditing) setIsEditDialogOpen(false); else setIsAddDialogOpen(false);
        fetchSuperAdmins(); // Refresh list
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setFormError('An unexpected error occurred.');
    } finally { setIsSubmitting(false); }
  };
  
  // TODO: Implement handleDelete and handleToggleActive for Super Admins
  const handleDelete = (userId, userName) => {
    if(!window.confirm(`Are you sure you want to DELETE super admin "${userName}"? This is permanent.`)) return;
    toast.info(`Deleting ${userName} (WIP)`);
    // API Call: DELETE /api/superadmin/users/[userId]
  };
  const handleToggleActive = (userId, currentIsActive, userName) => {
    const action = currentIsActive ? "Deactivate" : "Activate";
    if(!window.confirm(`Are you sure you want to ${action.toLowerCase()} super admin "${userName}"?`)) return;
    toast.info(`${action}ing ${userName} (WIP)`);
    // API Call: PATCH /api/superadmin/users/[userId] with { isActive: !currentIsActive }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <UsersIcon className="mr-3 h-8 w-8 opacity-80"/>Manage Super Administrators
          </h1>
          <p className={descriptionTextClasses}>Add, view, and manage platform super admin accounts.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}> <UserPlus className="mr-2 h-4 w-4" /> Add Super Admin </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader> <DialogTitle className={titleTextClasses}>Add New Super Admin</DialogTitle> <DialogDescription className={descriptionTextClasses}>Enter details for the new super admin account.</DialogDescription> </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
              <SuperAdminFormFields formData={formData} onFormChange={handleFormChange} onSwitchChange={handleSwitchChange} isEdit={false}/>
              {formError && isAddDialogOpen && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => setIsAddDialogOpen(false)}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting}> {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating...</> : 'Create Super Admin'} </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isAddDialogOpen && !isEditDialogOpen && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Email</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Created At</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Status</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : users.length > 0 ? users.map((user) => (
              <TableRow key={user.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{user.firstName} {user.lastName}</TableCell>
                <TableCell className={descriptionTextClasses}>{user.email}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "destructive"}
                       className={`text-xs ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200 border border-green-300 dark:border-green-700' : 'bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-200 border border-red-300 dark:border-red-700'}`}>
                        {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(user)} title="Edit User"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon"
                        className={`${user.isActive ? 'border-orange-400 text-orange-600 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/50' : 'border-green-400 text-green-600 hover:bg-green-100 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/50'} h-8 w-8`}
                        onClick={() => handleToggleActive(user.id, user.isActive, `${user.firstName} ${user.lastName}`)}
                        title={user.isActive ? "Deactivate Account" : "Activate Account"}
                      >
                        {user.isActive ? <XSquare className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)} title="Delete User"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No super administrators found. You might be the only one!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Edit Super Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>Edit Super Admin: {formData.firstName} {formData.lastName}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                Update super admin account details. Leave password blank to keep unchanged.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
                <SuperAdminFormFields 
                    formData={formData} 
                    onFormChange={handleFormChange} 
                    onSwitchChange={handleSwitchChange}
                    isEdit={true}
                />
                {formError && isEditDialogOpen && ( <p className="text-sm text-red-600 dark:text-red-400">{formError}</p> )}
                <DialogFooter className="pt-6">
                    <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => setIsEditDialogOpen(false)}>Cancel</Button></DialogClose>
                    <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting}> 
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Changes'} 
                    </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      {/* TODO: Pagination if list becomes long */}
    </div>
  );
}