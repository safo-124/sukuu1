// app/(superadmin)/users/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserPlus, 
  Edit3, 
  Trash2, 
  Users as UsersIcon, 
  AlertTriangle, 
  CheckSquare, 
  XSquare, 
  Loader2,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Shield,
  Activity,
  Calendar,
  Mail,
  Settings2
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialFormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  isActive: true,
};

// Reusable FormFields Component for Add/Edit Super Admin
const SuperAdminFormFields = ({ formData, onFormChange, onSwitchChange, isEdit = false }) => {
  if (!formData) return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto">
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "editFirstName" : "firstName"} className="text-sm font-medium text-gray-900 dark:text-white">
          First Name <span className="text-red-500">*</span>
        </Label>
        <Input 
          id={isEdit ? "editFirstName" : "firstName"} 
          name="firstName" 
          value={formData.firstName || ''} 
          onChange={onFormChange} 
          required 
          className="bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-700/30 rounded-xl"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "editLastName" : "lastName"} className="text-sm font-medium text-gray-900 dark:text-white">
          Last Name <span className="text-red-500">*</span>
        </Label>
        <Input 
          id={isEdit ? "editLastName" : "lastName"} 
          name="lastName" 
          value={formData.lastName || ''} 
          onChange={onFormChange} 
          required 
          className="bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-700/30 rounded-xl"
        />
      </div>
      
      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor={isEdit ? "editEmail" : "email"} className="text-sm font-medium text-gray-900 dark:text-white">
          Email Address <span className="text-red-500">*</span>
        </Label>
        <Input 
          id={isEdit ? "editEmail" : "email"} 
          name="email" 
          type="email" 
          value={formData.email || ''} 
          onChange={onFormChange} 
          required 
          className="bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-700/30 rounded-xl"
        />
      </div>
      
      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor={isEdit ? "editPassword" : "password"} className="text-sm font-medium text-gray-900 dark:text-white">
          {isEdit ? "New Password (optional)" : "Password"} 
          <span className={!isEdit ? "text-red-500" : ""}>{!isEdit ? " *" : ""}</span>
        </Label>
        <Input 
          id={isEdit ? "editPassword" : "password"} 
          name="password" 
          type="password" 
          value={formData.password || ''} 
          onChange={onFormChange} 
          required={!isEdit} 
          minLength={formData.password || !isEdit ? 8 : undefined} 
          className="bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-700/30 rounded-xl"
          placeholder={isEdit ? "Leave blank to keep current" : "Minimum 8 characters"}
        />
      </div>
      
      <div className="sm:col-span-2 flex items-center space-x-3 pt-2">
        <Switch 
          id={isEdit ? "editIsActiveSA" : "isActiveSA"} 
          name="isActive" 
          checked={formData.isActive} 
          onCheckedChange={(checked) => onSwitchChange('isActive', checked)}
          className="data-[state=checked]:bg-emerald-600"
        />
        <Label htmlFor={isEdit ? "editIsActiveSA" : "isActiveSA"} className="text-sm font-medium text-gray-900 dark:text-white">
          Account Active
        </Label>
      </div>
    </div>
  );
};

export default function ManageSuperAdminUsersPage() {
  const { data: session } = useSession();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({...initialFormData});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [editingUser, setEditingUser] = useState(null); 
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
              <Shield className="w-5 h-5" />
            </div>
            Super Administrators
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage platform administrators and their access permissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl shadow-lg" 
                onClick={openAddDialog}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-white/10">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Add New Super Admin</DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Create a new administrator account with full platform access.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 py-4">
                <SuperAdminFormFields 
                  formData={formData} 
                  onFormChange={handleFormChange} 
                  onSwitchChange={handleSwitchChange} 
                  isEdit={false}
                />
                {formError && isAddDialogOpen && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="rounded-xl">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        Creating...
                      </>
                    ) : (
                      'Create Admin'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-xl text-white">
              <UsersIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : users.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Admins</div>
            </div>
          </div>
        </div>
        
        <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-xl text-white">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : users.filter(u => u.isActive).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Admins</div>
            </div>
          </div>
        </div>
        
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl text-white">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 30*24*60*60*1000)).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">New This Month</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="search"
              placeholder="Search administrators by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-700/30 rounded-xl"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-700/30 rounded-xl">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Admins</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedUsers.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl">
                    <Settings2 className="w-4 h-4 mr-2" />
                    Actions ({selectedUsers.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Activity className="w-4 h-4 mr-2" />
                    Activate Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <XSquare className="w-4 h-4 mr-2" />
                    Deactivate Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600 dark:text-red-400">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && !isAddDialogOpen && !isEditDialogOpen && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-slate-800/20">
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600"
                />
              </TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-white">Administrator</TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-white hidden md:table-cell">Email</TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-white hidden sm:table-cell">Created</TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-white">Status</TableHead>
              <TableHead className="text-right font-semibold text-gray-900 dark:text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-b border-white/10 dark:border-white/5">
                  <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-3 w-24 rounded md:hidden" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : users.filter(user => {
              const matchesSearch = searchTerm === '' || 
                user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && user.isActive) ||
                (statusFilter === 'inactive' && !user.isActive);
              return matchesSearch && matchesStatus;
            }).length > 0 ? users.filter(user => {
              const matchesSearch = searchTerm === '' || 
                user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && user.isActive) ||
                (statusFilter === 'inactive' && !user.isActive);
              return matchesSearch && matchesStatus;
            }).map((user) => (
              <TableRow 
                key={user.id} 
                className="border-b border-white/10 dark:border-white/5 hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => {
                      setSelectedUsers(prev => 
                        prev.includes(user.id) 
                          ? prev.filter(id => id !== user.id)
                          : [...prev, user.id]
                      );
                    }}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold text-sm">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 md:hidden">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.isActive ? "default" : "secondary"}
                    className={`rounded-full text-xs ${
                      user.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50" 
                      onClick={() => openEditDialog(user)}
                      title="Edit User"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={`rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 ${
                        user.isActive 
                          ? 'text-orange-600 hover:text-orange-700 dark:text-orange-400' 
                          : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400'
                      }`}
                      onClick={() => handleToggleActive(user.id, user.isActive, `${user.firstName} ${user.lastName}`)}
                      title={user.isActive ? "Deactivate Account" : "Activate Account"}
                    >
                      {user.isActive ? <XSquare className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
                        <DropdownMenuItem>
                          <Settings2 className="w-4 h-4 mr-2" />
                          Permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 dark:text-red-400"
                          onClick={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-b border-white/10 dark:border-white/5">
                <TableCell colSpan="6" className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Shield className="w-12 h-12 text-gray-400" />
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">No administrators found</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {searchTerm ? 'Try adjusting your search criteria' : 'You might be the only administrator!'}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Edit Super Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Edit Administrator: {formData.firstName} {formData.lastName}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Update administrator account details. Leave password blank to keep unchanged.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <SuperAdminFormFields 
              formData={formData} 
              onFormChange={handleFormChange} 
              onSwitchChange={handleSwitchChange}
              isEdit={true}
            />
            {formError && isEditDialogOpen && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl">
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}