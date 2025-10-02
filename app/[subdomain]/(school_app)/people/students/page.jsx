// app/[subdomain]/(school_app)/people/students/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout'; // Adjust path
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

// Shadcn UI Imports
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area'; // Added ScrollArea

// Lucide React Icons
import { 
  UserPlus, Edit3, Eye, Search, AlertTriangle, Users as UsersIcon, 
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Loader2, ArrowUpRight, Repeat2, BookOpen 
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const initialStudentFormData = {
  firstName: '', lastName: '', middleName: '', 
  studentIdNumber: '', admissionDate: new Date().toISOString().split('T')[0], 
  dateOfBirth: '', gender: 'MALE',
  email: '', phone: '', 
  address: '', city: '', state: '', country: '',
  guardianName: '', guardianRelation: '', guardianPhone: '', guardianEmail: '',
  academicYearId: '', classId: '', sectionId: '',
  createUserAccount: false, password: '', confirmPassword: '',
};

const genderOptions = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];

const StudentFormFields = ({ formData, onFormChange, onSelectChange, academicYearsList, classesList, sectionsList, isLoadingDeps, isEdit = false, outlineButtonClasses }) => {
  const titleTextClasses = "text-black dark:text-white";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  // descriptionTextClasses is not used here, can be removed or defined if needed elsewhere in this component

  if (!formData) {
    return <div className="p-4 flex justify-center items-center h-full min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;
  }
  
  const filteredClasses = formData.academicYearId && Array.isArray(classesList)
    ? classesList.filter(c => c.academicYearId === formData.academicYearId) 
    : [];
  
  const filteredSections = formData.classId && Array.isArray(sectionsList)
    ? sectionsList.filter(s => s.classId === formData.classId)
    : [];

  // console.log("StudentFormFields - formData.academicYearId:", formData.academicYearId);
  // console.log("StudentFormFields - classesList:", classesList);
  // console.log("StudentFormFields - filteredClasses:", filteredClasses);
  // console.log("StudentFormFields - formData.classId:", formData.classId);
  // console.log("StudentFormFields - sectionsList:", sectionsList);
  // console.log("StudentFormFields - filteredSections:", filteredSections);


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 max-h-[65vh] overflow-y-auto p-1 custom-scrollbar">
        <h3 className={`md:col-span-3 text-base font-semibold ${titleTextClasses} pb-2 border-b dark:border-zinc-700 mb-2`}>Personal Details</h3>
        <div><Label htmlFor="firstName" className={labelTextClasses}>First Name <span className="text-red-500">*</span></Label><Input id="firstName" name="firstName" value={formData.firstName || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="lastName" className={labelTextClasses}>Last Name <span className="text-red-500">*</span></Label><Input id="lastName" name="lastName" value={formData.lastName || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="middleName" className={labelTextClasses}>Middle Name</Label><Input id="middleName" name="middleName" value={formData.middleName || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        
        <div><Label htmlFor="dateOfBirth" className={labelTextClasses}>Date of Birth</Label><Input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        <div>
            <Label htmlFor="gender" className={labelTextClasses}>Gender</Label>
            <Select name="gender" value={formData.gender || ''} onValueChange={(value) => onSelectChange('gender', value)}>
                <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900">{genderOptions.map(g => <SelectItem key={g} value={g} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">{g.charAt(0) + g.slice(1).toLowerCase().replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
        </div>
  <div><Label htmlFor="admissionNumber" className={labelTextClasses}>Admission No. <span className="text-red-500">*</span></Label><Input disabled={isEdit} id="admissionNumber" name="studentIdNumber" value={formData.studentIdNumber || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1 ${isEdit ? 'opacity-70 cursor-not-allowed' : ''}`} /></div>
  <div><Label htmlFor="admissionDate" className={labelTextClasses}>Admission Date <span className="text-red-500">*</span></Label><Input disabled={isEdit} id="admissionDate" name="admissionDate" type="date" value={formData.admissionDate || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1 ${isEdit ? 'opacity-70 cursor-not-allowed' : ''}`} /></div>
        
        <h3 className={`md:col-span-3 text-base font-semibold ${titleTextClasses} pb-2 border-b dark:border-zinc-700 mt-4 mb-2`}>Contact & Address</h3>
        <div><Label htmlFor="email" className={labelTextClasses}>Student Email</Label><Input id="email" name="email" type="email" value={formData.email || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="phone" className={labelTextClasses}>Student Phone</Label><Input id="phone" name="phone" value={formData.phone || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        <div className="sm:col-span-2 md:col-span-3"><Label htmlFor="address" className={labelTextClasses}>Address</Label><Textarea id="address" name="address" value={formData.address || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>

        <h3 className={`md:col-span-3 text-base font-semibold ${titleTextClasses} pb-2 border-b dark:border-zinc-700 mt-4 mb-2`}>Guardian Information</h3>
        <div><Label htmlFor="guardianName" className={labelTextClasses}>Guardian Full Name <span className="text-red-500">*</span></Label><Input id="guardianName" name="guardianName" value={formData.guardianName || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="guardianRelation" className={labelTextClasses}>Relation to Student <span className="text-red-500">*</span></Label><Input id="guardianRelation" name="guardianRelation" value={formData.guardianRelation || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="guardianPhone" className={labelTextClasses}>Guardian Phone <span className="text-red-500">*</span></Label><Input id="guardianPhone" name="guardianPhone" value={formData.guardianPhone || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div className="md:col-span-2"><Label htmlFor="guardianEmail" className={labelTextClasses}>Guardian Email</Label><Input id="guardianEmail" name="guardianEmail" type="email" value={formData.guardianEmail || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        
    {!isEdit && (
      <>
      <h3 className={`md:col-span-3 text-base font-semibold ${titleTextClasses} pb-2 border-b dark:border-zinc-700 mt-4 mb-2`}>Initial Enrollment</h3>
      <div>
        <Label htmlFor="academicYearId" className={labelTextClasses}>Academic Year <span className="text-red-500">*</span></Label>
        <Select name="academicYearId" value={formData.academicYearId || ''} onValueChange={(value) => onSelectChange('academicYearId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select Academic Year" /></SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900">{isLoadingDeps ? <SelectItem value="loading" disabled>Loading...</SelectItem> : academicYearsList?.map(ay => <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="classId" className={labelTextClasses}>Class <span className="text-red-500">*</span></Label>
        <Select name="classId" value={formData.classId || ''} onValueChange={(value) => onSelectChange('classId', value)} disabled={!formData.academicYearId || isLoadingDeps || filteredClasses.length === 0}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select Class" /></SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900">{isLoadingDeps ? <SelectItem value="loading" disabled>Loading...</SelectItem> : (filteredClasses.length === 0 && formData.academicYearId ? <SelectItem value="no-classes" disabled>No classes for selected year</SelectItem> : filteredClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.schoolLevel?.name})</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="sectionId" className={labelTextClasses}>Section <span className="text-red-500">*</span></Label>
        <Select name="sectionId" value={formData.sectionId || ''} onValueChange={(value) => onSelectChange('sectionId', value)} disabled={!formData.classId || isLoadingDeps || filteredSections.length === 0}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select Section" /></SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900">{isLoadingDeps ? <SelectItem value="loading" disabled>Loading...</SelectItem> : (filteredSections.length === 0 && formData.classId ? <SelectItem value="no-sections" disabled>No sections for selected class</SelectItem> : filteredSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      </>
    )}
    </div>
  );
};


export default function ManageStudentsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // If a TEACHER lands here (admin page) redirect them to their scoped students page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (session?.user?.role === 'TEACHER') {
      const sub = schoolData?.subdomain || pathname.split('/')[1];
      // Prevent infinite loop by ensuring we're not already on teacher path
      if (!pathname.includes('/teacher/students')) {
        router.replace(`/${sub}/teacher/students`);
      }
    }
  }, [session?.user?.role, schoolData?.subdomain, pathname, router]);

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalStudents: 0, limit: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [addStudentFormData, setAddStudentFormData] = useState({...initialStudentFormData});
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [addFormError, setAddFormError] = useState('');

  // Edit dialog state
  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false);
  const [editStudentFormData, setEditStudentFormData] = useState(null); // null until loaded
  const [editTargetStudent, setEditTargetStudent] = useState(null);
  const [isLoadingEditStudent, setIsLoadingEditStudent] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [originalEditData, setOriginalEditData] = useState(null);
  const [hasEditChanges, setHasEditChanges] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);

  // Promotion / Transfer state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false);
  const [promotionForm, setPromotionForm] = useState({ targetAcademicYearId: '', targetClassId: '', targetSectionId: '', mode: 'AUTO' });
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionError, setPromotionError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";


  const fetchStudents = useCallback(async (page = 1, currentSearchTerm = debouncedSearchTerm) => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const queryParams = new URLSearchParams({ page: page.toString(), limit: pagination.limit.toString(), search: currentSearchTerm });
      const response = await fetch(`/api/schools/${schoolData.id}/students?${queryParams.toString()}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch students`);
      }
      const data = await response.json();
      setStudents(data.students || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalStudents: 0, limit: 10 });
    } catch (err) {
      toast.error("Error fetching students", { description: err.message }); setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id, debouncedSearchTerm, pagination.limit]);

  const fetchDropdownData = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDropdowns(true);
    console.log("ManageStudentsPage: Fetching dropdown data...");
    try {
      const [ayRes, classRes, sectionRes] = await Promise.all([
        fetch(`/api/schools/${schoolData.id}/academic-years`),
        fetch(`/api/schools/${schoolData.id}/academics/classes`),
        fetch(`/api/schools/${schoolData.id}/academics/sections/all`)
      ]);

      if (!ayRes.ok) { const d = await ayRes.json().catch(() => ({})); throw new Error(d.error || 'Failed to load academic years.'); }
      const ayData = await ayRes.json();
      console.log("Fetched Academic Years:", ayData.academicYears);
      setAcademicYears(ayData.academicYears || []);

      if (!classRes.ok) { const d = await classRes.json().catch(() => ({})); throw new Error(d.error || 'Failed to load classes.'); }
      const classData = await classRes.json();
      console.log("Fetched Classes:", classData.classes);
      setClasses(classData.classes || []);
      
      if (!sectionRes.ok) { const d = await sectionRes.json().catch(() => ({})); throw new Error(d.error || 'Failed to load sections.'); }
      const sectionData = await sectionRes.json();
      console.log("Fetched Sections:", sectionData.sections);
      setSections(sectionData.sections || []);

    } catch (error) {
      console.error("Error in fetchDropdownData:", error);
      toast.error("Failed to load form data", { description: error.message });
    } finally {
      setIsLoadingDropdowns(false);
    }
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
    if (schoolData?.id && session && session.user?.role !== 'TEACHER') {
      const currentPage = parseInt(searchParams.get('page') || '1', 10);
      const currentSearch = searchParams.get('search') || '';
      fetchStudents(currentPage, currentSearch);
      fetchDropdownData();
    }
  }, [schoolData, session, fetchStudents, fetchDropdownData, searchParams]);

  // Derived list filters for promotion target
  const promotionTargetClasses = promotionForm.targetAcademicYearId ? classes.filter(c => c.academicYearId === promotionForm.targetAcademicYearId) : [];
  const promotionTargetSections = promotionForm.targetClassId ? sections.filter(s => s.classId === promotionForm.targetClassId) : [];

  const toggleSelectAllStudents = (checked) => {
    if (checked) setSelectedStudentIds(students.map(s => s.id)); else setSelectedStudentIds([]);
  };
  const toggleSelectStudent = (id, checked) => {
    setSelectedStudentIds(prev => checked ? [...prev, id] : prev.filter(sid => sid !== id));
  };
  const openPromotionDialog = () => {
    setPromotionError('');
    setPromotionForm({ targetAcademicYearId: '', targetClassId: '', targetSectionId: '', mode: 'AUTO' });
    setIsPromotionDialogOpen(true);
  };
  const handlePromotionField = (field, value) => {
    setPromotionForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'targetAcademicYearId') { next.targetClassId = ''; next.targetSectionId=''; }
      if (field === 'targetClassId') { next.targetSectionId=''; }
      return next;
    });
  };
  const submitPromotion = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    if (selectedStudentIds.length === 0) { toast.error('No students selected'); return; }
    if (!promotionForm.targetAcademicYearId || !promotionForm.targetSectionId) {
      const msg='Academic Year, Class and Section are required.';
      setPromotionError(msg); toast.error('Validation Error', { description: msg }); return;
    }
    setIsPromoting(true); setPromotionError('');
    try {
      const payload = { studentIds: selectedStudentIds, targetSectionId: promotionForm.targetSectionId, targetAcademicYearId: promotionForm.targetAcademicYearId, mode: promotionForm.mode };
      const res = await fetch(`/api/schools/${schoolData.id}/students/promotions`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Failed to process promotions';
        if (data.issues) msg = data.issues.map(i=> i.message).join('; ');
        setPromotionError(msg); toast.error('Promotion Failed', { description: msg });
      } else {
        const promoted = data.processed?.filter(p=> p.action==='PROMOTED').length || 0;
        const transferred = data.processed?.filter(p=> p.action==='TRANSFERRED').length || 0;
        toast.success('Batch Complete', { description: `${promoted} promoted, ${transferred} transferred, ${data.skipped?.length||0} skipped.` });
        setIsPromotionDialogOpen(false); setSelectedStudentIds([]); fetchStudents(pagination.currentPage);
      }
    } catch (err) {
      console.error('Promotion error', err); setPromotionError('Unexpected error'); toast.error('Unexpected error');
    } finally { setIsPromoting(false); }
  };

  const handleAddStudentFormChange = (e) => {
    const { name, value } = e.target;
    setAddStudentFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleAddStudentSelectChange = (name, value) => {
    const newFormData = { ...addStudentFormData, [name]: value === 'none' ? '' : value };
    if (name === 'academicYearId') {
        newFormData.classId = ''; 
        newFormData.sectionId = ''; 
        console.log("Academic Year changed, resetting class and section. New AY ID:", value);
    } else if (name === 'classId') {
        newFormData.sectionId = ''; 
        console.log("Class changed, resetting section. New Class ID:", value);
    }
    setAddStudentFormData(newFormData);
  };

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    if (!addStudentFormData.academicYearId || !addStudentFormData.sectionId) {
        toast.error("Validation Error", { description: "Academic Year, Class, and Section are required for enrollment."});
        setAddFormError("Academic Year, Class, and Section are required.");
        return;
    }
    if (addStudentFormData.createUserAccount) {
      if (!addStudentFormData.password || addStudentFormData.password.length < 8) {
        const msg = 'Password must be at least 8 characters.';
        toast.error('Validation Error', { description: msg });
        setAddFormError(msg); return;
      }
      if (addStudentFormData.password !== addStudentFormData.confirmPassword) {
        const msg = 'Passwords do not match.';
        toast.error('Validation Error', { description: msg });
        setAddFormError(msg); return;
      }
    }
    setIsSubmittingStudent(true); setAddFormError('');
    try {
      // Ensure admissionDate and dateOfBirth are valid dates before sending
      const payload = {
        ...addStudentFormData,
        // confirmPassword is client-side only
        confirmPassword: undefined,
        admissionDate: addStudentFormData.admissionDate ? new Date(addStudentFormData.admissionDate).toISOString() : null,
        dateOfBirth: addStudentFormData.dateOfBirth ? new Date(addStudentFormData.dateOfBirth).toISOString() : null,
      };

      const response = await fetch(`/api/schools/${schoolData.id}/students`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || 'Failed to add student.';
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Field'}: ${issue.message}`).join('; ');
        toast.error("Submission Failed", { description: errorMessage });
        setAddFormError(errorMessage);
      } else {
        toast.success(`Student "${result.student?.firstName} ${result.student?.lastName}" added successfully!`);
        setAddStudentFormData({...initialStudentFormData}); 
        setIsAddStudentDialogOpen(false); 
        fetchStudents();
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setAddFormError('An unexpected error occurred.');
    } finally { setIsSubmittingStudent(false); }
  };
  
  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const openEditStudentDialog = async (student) => {
    if (!schoolData?.id) return;
    setEditTargetStudent(student);
    setEditFormError('');
    setIsLoadingEditStudent(true);
    setIsEditStudentDialogOpen(true);
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/students/${student.id}?full=true`);
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        throw new Error(d.error || 'Failed to load student details');
      }
      const d = await res.json();
      const s = d.student;
      // Map API response to form structure; enrollment fields are not editable here
      setEditStudentFormData({
        firstName: s.firstName || '',
        lastName: s.lastName || '',
        middleName: s.middleName || '',
        studentIdNumber: s.studentIdNumber || '',
        admissionDate: s.admissionDate ? new Date(s.admissionDate).toISOString().split('T')[0] : '',
        dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : '',
        gender: s.gender || '',
        email: s.email || '',
        phone: s.phone || '',
        address: s.address || '',
        city: s.city || '',
        state: s.state || '',
        country: s.country || '',
        guardianName: s.guardianName || '',
        guardianRelation: s.guardianRelation || '',
        guardianPhone: s.guardianPhone || '',
        guardianEmail: s.guardianEmail || '',
        academicYearId: '',
        classId: '',
        sectionId: '',
      });
      setOriginalEditData({
        firstName: s.firstName || '',
        lastName: s.lastName || '',
        middleName: s.middleName || '',
        studentIdNumber: s.studentIdNumber || '',
        admissionDate: s.admissionDate ? new Date(s.admissionDate).toISOString().split('T')[0] : '',
        dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : '',
        gender: s.gender || '',
        email: s.email || '',
        phone: s.phone || '',
        address: s.address || '',
        city: s.city || '',
        state: s.state || '',
        country: s.country || '',
        guardianName: s.guardianName || '',
        guardianRelation: s.guardianRelation || '',
        guardianPhone: s.guardianPhone || '',
        guardianEmail: s.guardianEmail || '',
        academicYearId: '',
        classId: '',
        sectionId: '',
      });
      setHasEditChanges(false);
    } catch (e) {
      console.error('Load edit student failed', e);
      setEditFormError(e.message);
      toast.error('Failed to load student', { description: e.message });
    } finally {
      setIsLoadingEditStudent(false);
    }
  };

  const handleEditStudentFormChange = (e) => {
    const { name, value } = e.target;
    setEditStudentFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (originalEditData) {
        const differs = Object.keys(originalEditData).some(k => originalEditData[k] !== updated[k]);
        setHasEditChanges(differs);
      }
      return updated;
    });
  };
  const handleEditStudentSelectChange = (name, value) => {
    setEditStudentFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (originalEditData) {
        const differs = Object.keys(originalEditData).some(k => originalEditData[k] !== updated[k]);
        setHasEditChanges(differs);
      }
      return updated;
    });
  };

  const handleEditStudentSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id || !editTargetStudent) return;
    setIsSavingEdit(true); setEditFormError('');
    try {
      const originalRow = students.find(s => s.id === editTargetStudent.id) || {};
      const { admissionDate, studentIdNumber, academicYearId, classId, sectionId, ...editable } = editStudentFormData || {};
      // Build diff payload: only keys whose value differs (ignoring undefined)
      const payload = {};
      Object.entries(editable).forEach(([k,v]) => {
        if (v === '') v = null; // treat empty as null
        const originalComparable = originalRow[k] === undefined ? null : originalRow[k];
        if (k === 'dateOfBirth' && v) {
          // convert for submission
          const iso = new Date(v).toISOString();
          if (originalRow.dateOfBirth !== iso) payload[k] = iso; else if (!originalRow.dateOfBirth && v) payload[k] = iso;
        } else if (v !== originalComparable) {
          payload[k] = v;
        }
      });
      // Optional password reset by admin
      if (newPassword || confirmNewPassword) {
        if (!newPassword || newPassword.length < 8) {
          throw new Error('New password must be at least 8 characters.');
        }
        if (newPassword !== confirmNewPassword) {
          throw new Error('New passwords do not match.');
        }
        payload.newPassword = newPassword;
      }
      if (Object.keys(payload).length === 0) {
        toast.info('No changes to save');
        setIsSavingEdit(false);
        return;
      }
      const res = await fetch(`/api/schools/${schoolData.id}/students/${editTargetStudent.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Failed to update student';
        if (data.issues) msg = data.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ');
        setEditFormError(msg); toast.error('Update failed', { description: msg });
      } else {
        toast.success('Student updated successfully');
        // Optimistic local list update for displayed columns
        setStudents(prev => prev.map(s => s.id === editTargetStudent.id ? { ...s, ...payload, newPassword: undefined } : s));
        setIsEditStudentDialogOpen(false);
        setNewPassword(''); setConfirmNewPassword('');
      }
    } catch (err) {
      console.error('Edit submit error', err);
      setEditFormError(err.message); toast.error('Unexpected error', { description: err.message });
    } finally { setIsSavingEdit(false); }
  };
  const viewStudentProfile = (studentId) => {
    // Fallback: derive base path from current pathname if subdomain not yet loaded
    const base = schoolData?.subdomain ? `/${schoolData.subdomain}` : pathname.split('/').slice(0,2).join('/') || '';
    router.push(`${base}/people/students/${studentId}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <UsersIcon className="mr-3 h-8 w-8 opacity-80"/>Manage Students
          </h1>
          <p className={descriptionTextClasses}>Enroll new students and manage existing student records for {schoolData?.name}.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {selectedStudentIds.length > 0 && (
            <Button variant="outline" className={outlineButtonClasses} onClick={openPromotionDialog}>
              <ArrowUpRight className="h-4 w-4 mr-2"/> Promote / Transfer ({selectedStudentIds.length})
            </Button>
          )}
        </div>
        <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={() => {setAddStudentFormData({...initialStudentFormData}); setAddFormError(''); setIsAddStudentDialogOpen(true);}}> 
              <UserPlus className="mr-2 h-4 w-4" /> Add New Student 
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[85vh] overflow-y-auto">
            <DialogHeader> 
              <DialogTitle className={titleTextClasses}>Enroll New Student</DialogTitle> 
              <DialogDescription className={descriptionTextClasses}>Enter the student's details for enrollment.</DialogDescription> 
            </DialogHeader>
            <form onSubmit={handleAddStudentSubmit} className="space-y-6 py-1">
                <StudentFormFields 
                    formData={addStudentFormData} 
                    onFormChange={handleAddStudentFormChange} 
                    onSelectChange={handleAddStudentSelectChange} 
                    academicYearsList={academicYears} 
                    classesList={classes} 
                    sectionsList={sections}
                    isLoadingDeps={isLoadingDropdowns}
                    outlineButtonClasses={outlineButtonClasses} // Pass this if StudentFormFields uses it
                />
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <input id="createUserAccount" type="checkbox" className="h-4 w-4" checked={!!addStudentFormData.createUserAccount} onChange={(e)=>setAddStudentFormData(p=>({...p, createUserAccount: e.target.checked, password: e.target.checked ? p.password : ''}))} />
                    <Label htmlFor="createUserAccount" className="text-sm font-medium text-black dark:text-white">Create portal login account now?</Label>
                  </div>
                  {addStudentFormData.createUserAccount && (
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="studentAccountEmail" className="text-black dark:text-white text-sm mb-1 block">Account Email (required)</Label>
                        <Input id="studentAccountEmail" name="email" type="email" value={addStudentFormData.email} onChange={handleAddStudentFormChange} placeholder="student@example.com" className="bg-white/50 dark:bg-zinc-800/50" required={addStudentFormData.createUserAccount} />
                      </div>
                      <div className="md:col-span-1">
                        <Label htmlFor="studentPassword" className="text-black dark:text-white text-sm mb-1 block">Password</Label>
                        <div className="flex gap-2">
                          <Input id="studentPassword" name="password" type="text" value={addStudentFormData.password} onChange={handleAddStudentFormChange} placeholder="Min 8 chars" className="bg-white/50 dark:bg-zinc-800/50" required={addStudentFormData.createUserAccount} />
                          <Button type="button" variant="outline" className={outlineButtonClasses} onClick={()=>{
                            const gen = () => {
                              const upper='ABCDEFGHJKLMNPQRSTUVWXYZ';
                              const lower='abcdefghijkmnopqrstuvwxyz';
                              const digits='23456789';
                              const symbols='!@#$%^&*';
                              const all = upper+lower+digits+symbols;
                              const pick = s=>s[Math.floor(Math.random()*s.length)];
                              const base=[pick(upper),pick(lower),pick(digits)];
                              for(let i=base.length;i<12;i++){ base.push(pick(all)); }
                              for(let i=base.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [base[i],base[j]]=[base[j],base[i]]; }
                              return base.join('');
                            };
                            const generated = gen();
                            setAddStudentFormData(p=>({...p, password: generated, confirmPassword: generated}));
                          }}>Gen</Button>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Must include upper, lower & a digit.</p>
                      </div>
                      <div className="md:col-span-1">
                        <Label htmlFor="studentConfirmPassword" className="text-black dark:text-white text-sm mb-1 block">Confirm Password</Label>
                        <Input id="studentConfirmPassword" name="confirmPassword" type="text" value={addStudentFormData.confirmPassword} onChange={handleAddStudentFormChange} placeholder="Repeat password" className="bg-white/50 dark:bg-zinc-800/50" required={addStudentFormData.createUserAccount} />
                        {addStudentFormData.createUserAccount && addStudentFormData.password && addStudentFormData.confirmPassword && addStudentFormData.password !== addStudentFormData.confirmPassword && (
                          <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                        )}
                      </div>
                      <div className="md:col-span-3 text-xs text-zinc-600 dark:text-zinc-400">The student will log in at <code className="font-mono">/{schoolData?.subdomain || '<subdomain>'}/student-login</code> using this email & password.</div>
                    </div>
                  )}
                </div>
                {addFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{addFormError}</p> )}
                <DialogFooter className="pt-6"> 
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose> 
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingStudent || isLoadingDropdowns}> 
                    {isSubmittingStudent ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Enrolling...</> : 'Enroll Student'} 
                  </Button> 
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
          <Input type="search" placeholder="Search students by name, admission no, class, section..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`pl-10 w-full md:w-1/2 lg:w-1/3 ${inputTextClasses}`} />
        </div>
      </div>

      {/* Edit Student Dialog */}
      <Dialog open={isEditStudentDialogOpen} onOpenChange={(open)=>{ setIsEditStudentDialogOpen(open); if(!open){ setEditStudentFormData(null); setEditTargetStudent(null); setEditFormError(''); }}}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>Edit Student</DialogTitle>
            <DialogDescription className={descriptionTextClasses}>Update the student's profile information.</DialogDescription>
          </DialogHeader>
          {editFormError && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{editFormError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleEditStudentSubmit} className="space-y-6 py-1">
            {isLoadingEditStudent ? (
              <div className="flex items-center justify-center h-60"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
            ) : (
              <StudentFormFields
                formData={editStudentFormData}
                onFormChange={handleEditStudentFormChange}
                onSelectChange={handleEditStudentSelectChange}
                academicYearsList={academicYears}
                classesList={classes}
                sectionsList={sections}
                isLoadingDeps={false}
                isEdit={true}
                outlineButtonClasses={outlineButtonClasses}
              />
            )}
            {!isLoadingEditStudent && editStudentFormData && (
              <>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Admission number and admission date are immutable. Enrollment changes are handled separately.</p>
                {session?.user?.role === 'SCHOOL_ADMIN' && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="text-sm font-semibold">Reset Student Password</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Use this if the student forgets their password. This sets a new login password immediately.</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">New Password</Label>
                        <Input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Min 8 chars, include upper/lower/digit" className="bg-white/50 dark:bg-zinc-800/50" />
                      </div>
                      <div>
                        <Label className="text-sm">Confirm New Password</Label>
                        <Input type="password" value={confirmNewPassword} onChange={e=>setConfirmNewPassword(e.target.value)} placeholder="Repeat new password" className="bg-white/50 dark:bg-zinc-800/50" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" className={outlineButtonClasses} disabled={isSavingEdit}>Cancel</Button>
              </DialogClose>
              <Button type="submit" className={primaryButtonClasses} disabled={isSavingEdit || isLoadingEditStudent || !editStudentFormData || !hasEditChanges}>
                {isSavingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (hasEditChanges ? 'Save Changes' : 'No Changes')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {error && !isAddStudentDialogOpen && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className="w-10">
                <Checkbox
                  checked={students.length>0 && selectedStudentIds.length === students.length}
                  onCheckedChange={v=> toggleSelectAllStudents(!!v)}
                  aria-label="Select all students"
                />
              </TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Adm. No.</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Class & Section</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Guardian</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pagination.limit }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-20 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : students.length > 0 ? students.map((student) => (
              <TableRow key={student.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell>
                  <Checkbox
                    checked={selectedStudentIds.includes(student.id)}
                    onCheckedChange={v=> toggleSelectStudent(student.id, !!v)}
                    aria-label={`Select ${student.firstName} ${student.lastName}`}
                  />
                </TableCell>
                <TableCell className={`${descriptionTextClasses} font-mono text-xs`}>{student.studentIdNumber}</TableCell>
                <TableCell className={`${descriptionTextClasses} font-medium`}>{student.firstName} {student.lastName}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{student.currentClassDisplay || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{student.guardianName || 'N/A'} ({student.guardianRelation || 'Guardian'})</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    {session?.user?.role === 'SCHOOL_ADMIN' && (
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="Edit Student" onClick={() => openEditStudentDialog(student)}> <Edit3 className="h-4 w-4" /> </Button>
                    )}
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="View Profile" onClick={() => viewStudentProfile(student.id)}> <Eye className="h-4 w-4" /> </Button>
                    {(session?.user?.role === 'SCHOOL_ADMIN' || session?.user?.role === 'LIBRARIAN') && (
                      <Button
                        variant="outline"
                        size="icon"
                        className={`${outlineButtonClasses} h-8 w-8`}
                        title="Borrow Book"
                        onClick={() => {
                          const sub = schoolData?.subdomain || pathname.split('/')[1];
                          router.push(`/${sub}/resources/library/loans/new?studentId=${student.id}`);
                        }}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No students found {searchTerm && `for your search "${searchTerm}"`}. Start by adding a new student.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {!isLoading && pagination.totalPages > 1 && (
        <div className={`flex items-center justify-between pt-4 flex-wrap gap-2 ${descriptionTextClasses}`}>
          <p className="text-sm"> Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalStudents} total students) </p>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={pagination.currentPage === 1} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronsLeft className="h-4 w-4" /> </Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronLeft className="h-4 w-4" /> </Button>
            <span className="px-2 text-sm"> {pagination.currentPage} </span>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronRight className="h-4 w-4" /> </Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.totalPages)} disabled={pagination.currentPage === pagination.totalPages} className={`${outlineButtonClasses} h-8 w-8`}> <ChevronsRight className="h-4 w-4" /> </Button>
          </div>
        </div>
      )}
      {/* Promotion / Transfer Dialog */}
      <Dialog open={isPromotionDialogOpen} onOpenChange={setIsPromotionDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>Promote / Transfer Students</DialogTitle>
            <DialogDescription className={descriptionTextClasses}>Move {selectedStudentIds.length} selected student(s) to another section / academic year.</DialogDescription>
          </DialogHeader>
          {promotionError && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50 mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{promotionError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={submitPromotion} className="space-y-5">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-black dark:text-white">Target Academic Year <span className="text-red-500">*</span></Label>
                <Select value={promotionForm.targetAcademicYearId} onValueChange={v=> handlePromotionField('targetAcademicYearId', v)}>
                  <SelectTrigger className="mt-1 bg-white/50 dark:bg-zinc-800/50"><SelectValue placeholder="Select Academic Year" /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900">
                    {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}{y.isCurrent && ' (Current)'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-black dark:text-white">Target Class <span className="text-red-500">*</span></Label>
                <Select value={promotionForm.targetClassId} onValueChange={v=> handlePromotionField('targetClassId', v)} disabled={!promotionForm.targetAcademicYearId || promotionTargetClasses.length===0}>
                  <SelectTrigger className="mt-1 bg-white/50 dark:bg-zinc-800/50"><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900">
                    {promotionForm.targetAcademicYearId && promotionTargetClasses.length === 0 && <SelectItem value="no-classes" disabled>No classes</SelectItem>}
                    {promotionTargetClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-black dark:text-white">Target Section <span className="text-red-500">*</span></Label>
                <Select value={promotionForm.targetSectionId} onValueChange={v=> handlePromotionField('targetSectionId', v)} disabled={!promotionForm.targetClassId || promotionTargetSections.length===0}>
                  <SelectTrigger className="mt-1 bg-white/50 dark:bg-zinc-800/50"><SelectValue placeholder="Select Section" /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900">
                    {promotionForm.targetClassId && promotionTargetSections.length === 0 && <SelectItem value="no-sections" disabled>No sections</SelectItem>}
                    {promotionTargetSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-black dark:text-white">Mode</Label>
                <Select value={promotionForm.mode} onValueChange={v=> handlePromotionField('mode', v)}>
                  <SelectTrigger className="mt-1 bg-white/50 dark:bg-zinc-800/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900">
                    <SelectItem value="AUTO">Auto (Promote or Transfer)</SelectItem>
                    <SelectItem value="PROMOTE_ONLY">Promote Only (Year Change)</SelectItem>
                    <SelectItem value="TRANSFER_ONLY">Transfer Only (Same Year)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">Promotion = different academic year. Transfer = same academic year.</p>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className={outlineButtonClasses} disabled={isPromoting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" className={primaryButtonClasses} disabled={isPromoting || selectedStudentIds.length===0}>
                {isPromoting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing...</> : 'Apply Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
