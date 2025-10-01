// app/[subdomain]/(school_app)/people/teachers/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout'; // Adjust path
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Edit3, Trash2, UserCog as UserCogIcon, AlertTriangle, Search, CheckSquare, XSquare, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'; // Added Loader2 and pagination icons
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';


const initialAddFormData = {
  firstName: '', lastName: '', email: '', password: '',
  staffIdNumber: '', jobTitle: '', qualification: '', 
  dateOfJoining: new Date().toISOString().split('T')[0],
  departmentId: '', isActive: true,
  isHostelWarden: false,
  hostelId: '',
};

const initialEditFormData = {
  id: '', // Staff ID
  userId: '', // User ID
  firstName: '', lastName: '', email: '', password: '', 
  staffIdNumber: '', jobTitle: '', qualification: '', 
  dateOfJoining: '',
  departmentId: '', isActive: true,
  isHostelWarden: false,
  hostelId: '',
};

// ✨ Corrected TeacherFormFields to expect 'formData' prop ✨
const TeacherFormFields = ({ formData, onFormChange, onSelectChange, onSwitchChange, departmentsList, isEdit = false, isLoadingDeps, hostelsList = [] }) => {
  // Tailwind class constants (can be defined here or passed as props if they vary more)
  const titleTextClasses = "text-black dark:text-white";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  
  if (!formData) { // Add a guard clause for undefined formData
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[65vh] overflow-y-auto p-1">
            <p className="text-red-500 sm:col-span-2">Form data is not available.</p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[65vh] overflow-y-auto p-1 custom-scrollbar">
        <div className="sm:col-span-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 pb-2 border-b dark:border-zinc-700 mb-2">Account Details</div>
        <div><Label htmlFor={isEdit ? "editFirstName" : "firstName"} className={labelTextClasses}>First Name <span className="text-red-500">*</span></Label><Input id={isEdit ? "editFirstName" : "firstName"} name="firstName" value={formData.firstName} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor={isEdit ? "editLastName" : "lastName"} className={labelTextClasses}>Last Name <span className="text-red-500">*</span></Label><Input id={isEdit ? "editLastName" : "lastName"} name="lastName" value={formData.lastName} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor={isEdit ? "editEmail" : "email"} className={labelTextClasses}>Email <span className="text-red-500">*</span></Label><Input id={isEdit ? "editEmail" : "email"} name="email" type="email" value={formData.email} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div>
            <Label htmlFor={isEdit ? "editPassword" : "password"} className={labelTextClasses}>
                {isEdit ? "New Password (optional)" : "Password"} <span className={!isEdit ? "text-red-500" : ""}>{!isEdit ? "*" : ""}</span>
            </Label>
            <Input 
                id={isEdit ? "editPassword" : "password"} 
                name="password" type="password" 
                value={formData.password} 
                onChange={onFormChange} 
                required={!isEdit} 
                minLength={formData.password || !isEdit ? 8 : undefined} 
                className={`${inputTextClasses} mt-1`}
                placeholder={isEdit ? "Leave blank to keep current" : ""}
            />
        </div>
        
        <div className="sm:col-span-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 pb-2 border-b dark:border-zinc-700 mt-4 mb-2">Staff Information</div>
        <div><Label htmlFor={isEdit ? "editStaffIdNumber" : "staffIdNumber"} className={labelTextClasses}>Staff ID Number</Label><Input id={isEdit ? "editStaffIdNumber" : "staffIdNumber"} name="staffIdNumber" value={formData.staffIdNumber} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor={isEdit ? "editJobTitle" : "jobTitle"} className={labelTextClasses}>Job Title <span className="text-red-500">*</span></Label><Input id={isEdit ? "editJobTitle" : "jobTitle"} name="jobTitle" value={formData.jobTitle} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., Math Teacher"/></div>
        <div className="sm:col-span-2"><Label htmlFor={isEdit ? "editQualification" : "qualification"} className={labelTextClasses}>Qualifications</Label><Textarea id={isEdit ? "editQualification" : "qualification"} name="qualification" value={formData.qualification} onChange={onFormChange} rows={2} className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor={isEdit ? "editDateOfJoining" : "dateOfJoining"} className={labelTextClasses}>Date of Joining <span className="text-red-500">*</span></Label><Input id={isEdit ? "editDateOfJoining" : "dateOfJoining"} name="dateOfJoining" type="date" value={formData.dateOfJoining} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div>
            <Label htmlFor={isEdit ? "editDepartmentId" : "departmentId"} className={labelTextClasses}>Department</Label>
            <Select name="departmentId" value={formData.departmentId || 'none'} onValueChange={(value) => onSelectChange('departmentId', value)} disabled={isLoadingDeps}>
                <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900"><SelectItem value="none" className="text-zinc-500">No Department</SelectItem>{departmentsList?.map(dept => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        {(
          <>
            <div className="sm:col-span-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 pb-2 border-b dark:border-zinc-700 mt-4 mb-2">Hostel Warden (Optional)</div>
            <div className="flex items-center space-x-2 sm:col-span-2">
              <Switch id="isHostelWarden" name="isHostelWarden" checked={!!formData.isHostelWarden} onCheckedChange={(checked) => onSwitchChange('isHostelWarden', checked)} />
              <Label htmlFor="isHostelWarden" className={`text-sm font-medium ${titleTextClasses}`}>Mark this teacher as a Hostel Warden</Label>
            </div>
            {formData.isHostelWarden && (
              <div>
                <Label htmlFor="hostelId" className={labelTextClasses}>Assign Hostel (optional)</Label>
                <Select name="hostelId" value={formData.hostelId || 'none'} onValueChange={(value) => onSelectChange('hostelId', value)} disabled={isLoadingDeps}>
                  <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select hostel (optional)" /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900"><SelectItem value="none" className="text-zinc-500">No Hostel</SelectItem>{hostelsList?.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
        <div className="flex items-center space-x-2 pt-2 sm:col-span-2">
            <Switch id={isEdit ? "editIsActive" : "isActive"} name="isActive" checked={formData.isActive} onCheckedChange={(checked) => onSwitchChange('isActive', checked)} />
            <Label htmlFor={isEdit ? "editIsActive" : "isActive"} className={`text-sm font-medium ${titleTextClasses}`}>Set Account as Active</Label>
        </div>
    </div>
  );
};


export default function ManageTeachersPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // If a TEACHER lands here (admin page), redirect them to the teacher staff directory
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (session?.user?.role === 'TEACHER') {
      const sub = schoolData?.subdomain || pathname.split('/')[1];
      if (!pathname.includes('/teacher/people/teachers')) {
        router.replace(`/${sub}/teacher/people/teachers`);
      }
    }
  }, [session?.user?.role, schoolData?.subdomain, pathname, router]);

  const [teachers, setTeachers] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalTeachers: 0, limit: 10 });
  const [departments, setDepartments] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(''); // For general page errors

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({...initialAddFormData});
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addFormError, setAddFormError] = useState('');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({...initialEditFormData});
  const [currentEditingStaffId, setCurrentEditingStaffId] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);

  // Department memberships (multi-membership) state for Edit dialog
  const [deptMemberships, setDeptMemberships] = useState([]); // array of { id, name }
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false);
  const [addDeptId, setAddDeptId] = useState('');
  const [isMutatingMembership, setIsMutatingMembership] = useState(false);


  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  // labelTextClasses is defined within TeacherFormFields now
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  const fetchTeachers = useCallback(async (page = 1, currentSearchTerm = debouncedSearchTerm) => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const queryParams = new URLSearchParams({ page: page.toString(), limit: pagination.limit.toString(), search: currentSearchTerm });
      const response = await fetch(`/api/schools/${schoolData.id}/staff/teachers?${queryParams.toString()}`);
      if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch teachers.');
      }
      const data = await response.json();
      setTeachers(data.teachers || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalTeachers: 0, limit: 10 });
    } catch (err) {
      toast.error("Error fetching teachers", { description: err.message }); setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id, debouncedSearchTerm, pagination.limit]);

  const fetchDepartments = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDropdowns(true);
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/departments`);
      if (!response.ok) throw new Error('Failed to fetch departments.');
      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (err) {
      toast.error("Error fetching departments for form", { description: err.message });
    } finally {
        setIsLoadingDropdowns(false);
    }
  }, [schoolData?.id]);

  const fetchDeptMemberships = useCallback(async (staffId) => {
    if (!schoolData?.id || !staffId) return;
    setIsLoadingMemberships(true);
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/people/teachers/${staffId}/departments`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load memberships');
      setDeptMemberships(Array.isArray(data.departments) ? data.departments : []);
    } catch (e) {
      setDeptMemberships([]);
      toast.error('Failed to load department memberships', { description: e.message });
    } finally {
      setIsLoadingMemberships(false);
    }
  }, [schoolData?.id]);

  const fetchHostels = useCallback(async () => {
    if (!schoolData?.id) return;
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/hostels`);
      if (response.ok) {
        const data = await response.json();
        setHostels(Array.isArray(data.hostels) ? data.hostels : []);
      }
    } catch (_) {}
  }, [schoolData?.id]);

  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
        const params = new URLSearchParams(searchParams.toString());
        if (searchTerm) params.set('search', searchTerm);
        else params.delete('search');
        params.set('page', '1'); 
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, searchParams, pathname, router]);

  useEffect(() => {
    if (schoolData?.id && session) {
      const currentPage = parseInt(searchParams.get('page') || '1', 10);
      const currentSearch = searchParams.get('search') || '';
      fetchTeachers(currentPage, currentSearch);
      fetchDepartments();
      fetchHostels();
    }
  }, [schoolData, session, fetchTeachers, fetchDepartments, fetchHostels, searchParams]);

  const handleAddFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddFormData(prev => ({ ...prev, [name]: type === 'switch' ? checked : value }));
  };
  const handleAddSelectChange = (name, value) => {
    setAddFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));
  };
  const handleAddSwitchChange = (name, checked) => {
     setAddFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: type === 'switch' ? checked : value }));
  };
  const handleEditSelectChange = (name, value) => {
    setEditFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));
  };
  const handleEditSwitchChange = (name, checked) => {
    setEditFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingAdd(true); setAddFormError('');
    try {
      // sanitize payload: drop optional fields when not set
      const payload = { ...addFormData };
      if (!payload.isHostelWarden || !payload.hostelId || payload.hostelId === 'none' || payload.hostelId === '') {
        delete payload.hostelId;
      }
      if (!payload.departmentId || payload.departmentId === 'none' || payload.departmentId === '') {
        delete payload.departmentId;
      }
      const response = await fetch(`/api/schools/${schoolData.id}/staff/teachers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || 'Failed to add teacher.';
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Field'}: ${issue.message}`).join('; ');
        toast.error("Creation Failed", { description: errorMessage });
        setAddFormError(errorMessage);
      } else {
        toast.success(`Teacher "${result.teacher?.user?.firstName} ${result.teacher?.user?.lastName}" added successfully!`);
        setAddFormData({...initialAddFormData}); 
        setIsAddDialogOpen(false);
        fetchTeachers();
      }
    } catch (err) {
      toast.error('An unexpected error occurred.'); setAddFormError('An unexpected error occurred.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };
  
  const openAddDialog = () => {
    setAddFormData({...initialAddFormData});
    setAddFormError('');
    setIsAddDialogOpen(true);
  };

  const openEditDialog = async (teacherStaffRecord) => {
    if (!schoolData?.id || !teacherStaffRecord?.id) return;
    setCurrentEditingStaffId(teacherStaffRecord.id);
    setEditFormError('');
    try {
        setIsSubmittingEdit(true); 
        setIsEditDialogOpen(true); 
        const response = await fetch(`/api/schools/${schoolData.id}/staff/teachers/${teacherStaffRecord.id}`);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to fetch teacher details for editing.");
        }
    const data = await response.json();
        if (data.teacher) {
            const t = data.teacher;
      // Determine current hostel assignment (if any) where this teacher is a warden
      const currentHostelId = Array.isArray(t.hostels) && t.hostels.length > 0 ? t.hostels[0].id : '';
            setEditFormData({
                id: t.id,
                userId: t.user.id,
                firstName: t.user.firstName || '',
                lastName: t.user.lastName || '',
                email: t.user.email || '',
                password: '',
                isActive: t.user.isActive !== undefined ? t.user.isActive : true,
                staffIdNumber: t.staffIdNumber || '',
                jobTitle: t.jobTitle || '',
                qualification: t.qualification || '',
                dateOfJoining: t.dateOfJoining ? new Date(t.dateOfJoining).toISOString().split('T')[0] : '',
        departmentId: t.departmentId || '',
        isHostelWarden: !!currentHostelId,
        hostelId: currentHostelId || '',
            });
            // Load multi-department memberships
            fetchDeptMemberships(teacherStaffRecord.id);
        } else {
            toast.error("Teacher details not found.");
            setIsEditDialogOpen(false);
        }
    } catch (err) {
        toast.error("Error opening edit form", { description: err.message });
        setIsEditDialogOpen(false);
    } finally {
        setIsSubmittingEdit(false);
    }
  };

  const handleAddMembership = async () => {
    if (!schoolData?.id || !currentEditingStaffId || !addDeptId || addDeptId === 'none') return;
    setIsMutatingMembership(true);
    const toastId = `add-membership-${currentEditingStaffId}-${addDeptId}`;
    toast.loading('Adding department membership...', { id: toastId });
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/people/teachers/${currentEditingStaffId}/departments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ departmentId: addDeptId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to add membership');
      toast.success('Department added', { id: toastId });
      setAddDeptId('');
      fetchDeptMemberships(currentEditingStaffId);
    } catch (e) {
      toast.error('Add failed', { description: e.message, id: toastId });
    } finally {
      setIsMutatingMembership(false);
    }
  };

  const handleRemoveMembership = async (departmentId, departmentName) => {
    if (!schoolData?.id || !currentEditingStaffId || !departmentId) return;
    if (!window.confirm(`Remove ${departmentName} from memberships?`)) return;
    setIsMutatingMembership(true);
    const toastId = `remove-membership-${currentEditingStaffId}-${departmentId}`;
    toast.loading('Removing department...', { id: toastId });
    try {
      const url = new URL(`/api/schools/${schoolData.id}/people/teachers/${currentEditingStaffId}/departments`, window.location.origin);
      url.searchParams.set('departmentId', departmentId);
      const res = await fetch(url.toString(), { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to remove');
      toast.success('Department removed', { id: toastId });
      fetchDeptMemberships(currentEditingStaffId);
    } catch (e) {
      toast.error('Remove failed', { description: e.message, id: toastId });
    } finally {
      setIsMutatingMembership(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id || !currentEditingStaffId) return;
    setIsSubmittingEdit(true); setEditFormError('');

    const dataToSubmit = { ...editFormData };
    if (!dataToSubmit.password || dataToSubmit.password.trim() === '') {
      delete dataToSubmit.password;
    }
    // sanitize optional fields
    if (!dataToSubmit.isHostelWarden || !dataToSubmit.hostelId || dataToSubmit.hostelId === 'none' || dataToSubmit.hostelId === '') {
      delete dataToSubmit.hostelId;
    }
    if (!dataToSubmit.departmentId || dataToSubmit.departmentId === 'none' || dataToSubmit.departmentId === '') {
      delete dataToSubmit.departmentId;
    }
    delete dataToSubmit.id; 
    delete dataToSubmit.userId;

    try {
      const response = await fetch(`/api/schools/${schoolData.id}/staff/teachers/${currentEditingStaffId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSubmit),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || 'Failed to update teacher.';
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Field'}: ${issue.message}`).join('; ');
        toast.error("Update Failed", { description: errorMessage });
        setEditFormError(errorMessage);
      } else {
        toast.success(`Teacher "${result.teacher?.user?.firstName} ${result.teacher?.user?.lastName}" updated successfully!`);
        setIsEditDialogOpen(false); fetchTeachers();
      }
    } catch (err) {
      toast.error('An unexpected error occurred during update.'); setEditFormError('An unexpected error occurred.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleActive = async (staffId, userId, currentIsActive, teacherName) => {
    if (!schoolData?.id) return;
    const actionText = currentIsActive ? "Deactivate" : "Activate";
    if (!window.confirm(`Are you sure you want to ${actionText.toLowerCase()} teacher "${teacherName}"?`)) return;

    const toastId = `toggle-active-${staffId}`;
    toast.loading(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)}ing teacher...`, { id: toastId });
    try {
        const response = await fetch(`/api/schools/${schoolData.id}/staff/teachers/${staffId}`, {
            method: 'PATCH',
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `Failed to ${actionText.toLowerCase()} teacher.`);
        }
        toast.success(result.message || `Teacher status updated successfully.`, { id: toastId });
        fetchTeachers();
    } catch (err) {
        toast.error(`Operation Failed: ${err.message}`, { id: toastId });
    }
  };
  
  const handleDelete = async (staffId, teacherName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE teacher "${teacherName}"? This action is permanent and cannot be undone.`)) return;

    const toastId = `delete-teacher-${staffId}`;
    toast.loading("Deleting teacher...", { id: toastId });
    try {
        const response = await fetch(`/api/schools/${schoolData.id}/staff/teachers/${staffId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to delete teacher.");
        }
        toast.success(result.message || `Teacher "${teacherName}" deleted successfully.`, { id: toastId });
        fetchTeachers();
    } catch (err) {
        toast.error(`Deletion Failed: ${err.message}`, { id: toastId });
    }
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <UserCogIcon className="mr-3 h-8 w-8 opacity-80"/>Manage Teachers
          </h1>
          <p className={descriptionTextClasses}>Add, view, and manage teacher profiles for {schoolData?.name || 'your school'}.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}>
              <UserPlus className="mr-2 h-4 w-4" /> Add New Teacher
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>Add New Teacher</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>Enter the teacher's details to create their staff profile and user account.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-6 py-1">
              <TeacherFormFields 
                formData={addFormData} 
                onFormChange={handleAddFormChange} 
                onSelectChange={handleAddSelectChange} 
                onSwitchChange={handleAddSwitchChange} 
                departmentsList={departments} 
                hostelsList={hostels}
                isEdit={false}
                isLoadingDeps={isLoadingDropdowns}
              />
              {addFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{addFormError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => setIsAddDialogOpen(false)}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingAdd}>
                  {isSubmittingAdd ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : 'Add Teacher'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
          <Input type="search" placeholder="Search teachers by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`pl-10 w-full md:w-1/2 lg:w-1/3 ${inputTextClasses}`} />
        </div>
      </div>

      {error && !isAddDialogOpen && !isEditDialogOpen && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Email</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Job Title</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Status</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-40 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 bg-zinc-300 dark:bg-zinc-700 rounded-full" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : teachers.length > 0 ? teachers.map((teacher) => (
              <TableRow key={teacher.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{teacher.user?.firstName} {teacher.user?.lastName}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{teacher.user?.email}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{teacher.jobTitle}</TableCell>
                <TableCell>
                  <Badge variant={teacher.user?.isActive ? "default" : "destructive"}
                       className={`text-xs ${teacher.user?.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200 border border-green-300 dark:border-green-700' : 'bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-200 border border-red-300 dark:border-red-700'}`}>
                        {teacher.user?.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(teacher)} title="Edit Teacher"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon"
                        className={`${teacher.user?.isActive ? 'border-orange-400 text-orange-600 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/50' : 'border-green-400 text-green-600 hover:bg-green-100 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/50'} h-8 w-8`}
                        onClick={() => handleToggleActive(teacher.id, teacher.user.id, teacher.user?.isActive, `${teacher.user?.firstName} ${teacher.user?.lastName}`)}
                        title={teacher.user?.isActive ? "Deactivate Account" : "Activate Account"}
                      >
                        {teacher.user?.isActive ? <XSquare className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(teacher.id, `${teacher.user?.firstName} ${teacher.user?.lastName}`)} title="Delete Teacher"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No teachers found. Click "Add New Teacher" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>Edit Teacher Profile</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                Update details for {editFormData.firstName} {editFormData.lastName}. Leave password blank to keep unchanged.
              </DialogDescription>
            </DialogHeader>
            {isSubmittingEdit && !editFormData.firstName ? ( // Show skeleton if fetching data for edit form
                <div className="space-y-6 py-1">
                    <TeacherFormFields 
                        formData={initialEditFormData} // Pass initial to prevent error, but it will be covered by skeletons
                        onFormChange={() => {}} 
                        onSelectChange={() => {}} 
                        onSwitchChange={() => {}}
                        departmentsList={departments}
                        isEdit={true}
                        isLoadingDeps={true} // Indicate dependencies are loading
                    />
                     <div className="pt-6 flex justify-end"><Skeleton className="h-10 w-24" /> <Skeleton className="h-10 w-24 ml-2" /></div>
                </div>
            ) : (
        <form onSubmit={handleEditSubmit} className="space-y-6 py-1">
                    <TeacherFormFields 
                        formData={editFormData} 
                        onFormChange={handleEditFormChange} 
                        onSelectChange={handleEditSelectChange} 
                        onSwitchChange={handleEditSwitchChange}
            departmentsList={departments}
            hostelsList={hostels}
                        isEdit={true}
                        isLoadingDeps={isLoadingDropdowns}
                    />
                    {/* Department Memberships Editor */}
                    <div className="mt-4 border-t pt-4 dark:border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Department Memberships (multiple)</div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {isLoadingMemberships ? (
                          <Skeleton className="h-5 w-40" />
                        ) : deptMemberships.length > 0 ? (
                          deptMemberships.map(d => (
                            <span key={d.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700">
                              {d.name}
                              <button type="button" className="text-red-600 dark:text-red-400 hover:underline" disabled={isMutatingMembership} onClick={() => handleRemoveMembership(d.id, d.name)}>Remove</button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-500">No memberships yet.</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={addDeptId || 'none'} onValueChange={(val)=>setAddDeptId(val)} disabled={isLoadingDropdowns || isMutatingMembership}>
                          <SelectTrigger className={`${inputTextClasses} max-w-xs`}>
                            <SelectValue placeholder="Select department to add" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-900">
                            <SelectItem value="none" disabled>Select department</SelectItem>
                            {departments
                              .filter(d => !deptMemberships.some(m => m.id === d.id))
                              .map(d => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Button type="button" className={primaryButtonClasses} disabled={!addDeptId || addDeptId==='none' || isMutatingMembership} onClick={handleAddMembership}>
                          {isMutatingMembership ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Adding...</> : 'Add Department'}
                        </Button>
                      </div>
                    </div>
                    {editFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{editFormError}</p> )}
                    <DialogFooter className="pt-6">
                        <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses} onClick={() => setIsEditDialogOpen(false)}>Cancel</Button></DialogClose>
                        <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingEdit}>
                            {isSubmittingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            )}
          </DialogContent>
        </Dialog>
      
      {!isLoading && pagination.totalPages > 1 && (
        <div className={`flex items-center justify-between pt-4 flex-wrap gap-2 ${descriptionTextClasses}`}>
          <p className="text-sm"> Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalTeachers} total teachers) </p>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={pagination.currentPage === 1} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronsLeft className="h-4 w-4" /> </Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronLeft className="h-4 w-4" /> </Button>
            <span className="px-2 text-sm"> {pagination.currentPage} </span>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronRight className="h-4 w-4" /> </Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.totalPages)} disabled={pagination.currentPage === pagination.totalPages} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronsRight className="h-4 w-4" /> </Button>
          </div>
        </div>
      )}
    </div>
  );
}