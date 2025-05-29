// app/[subdomain]/(school_app)/people/students/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout'; // Adjust path to your SchoolAppLayout's context
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // Added usePathname, useSearchParams

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For error display
import { Badge } from '@/components/ui/badge'; // If you plan to use badges for student status, etc.

// Lucide React Icons
import { 
    UserPlus, Edit3, Eye, Search, AlertTriangle, Users as UsersIcon, // Renamed Users to UsersIcon to avoid conflict
    ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, FileText // Added FileText for potential report generation
} from 'lucide-react';

const initialStudentFormData = {
  firstName: '', lastName: '', middleName: '', dateOfBirth: '', gender: 'MALE',
  admissionNumber: '', admissionDate: new Date().toISOString().split('T')[0],
  studentEmail: '', studentPhone: '', addressLine1: '', city: '', state: '', country: '',
  guardianFirstName: '', guardianLastName: '', guardianRelation: '', guardianPhone: '', guardianEmail: '',
  academicYearId: '', classId: '', sectionId: '',
};

export default function ManageStudentsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalStudents: 0, limit: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [addStudentFormData, setAddStudentFormData] = useState(initialStudentFormData);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // States for dropdowns in Add Student form - these will be fetched
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);


  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";


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
    try {
        // Fetch Academic Years
        const ayResponse = await fetch(`/api/schools/${schoolData.id}/academic-years`);
        if (!ayResponse.ok) throw new Error('Failed to fetch academic years');
        const ayData = await ayResponse.json();
        setAcademicYears(ayData.academicYears || []);

        // TODO: Fetch Classes based on selected AY, and Sections based on selected Class
        // This requires more complex state management for cascading dropdowns.
        // For now, we'll just fetch all classes and sections (or you can simplify the form)
        // const classesResponse = await fetch(`/api/schools/${schoolData.id}/academics/classes`); // Needs an API
        // if (!classesResponse.ok) throw new Error('Failed to fetch classes');
        // const classesData = await classesResponse.json();
        // setClasses(classesData.classes || []);

        // const sectionsResponse = await fetch(`/api/schools/${schoolData.id}/academics/sections`); // Needs an API
        // if (!sectionsResponse.ok) throw new Error('Failed to fetch sections');
        // const sectionsData = await sectionsResponse.json();
        // setSections(sectionsData.sections || []);

        // Placeholder for classes and sections for now
        // You should implement APIs to fetch these, likely filtered by academic year for classes,
        // and by class for sections.
        setClasses([{id: 'class1', name: 'Grade 10 (Example)'}, {id: 'class2', name: 'Grade 9 (Example)'}]);
        setSections([{id: 'secA', name: 'Section A (Example)'}, {id: 'secB', name: 'Section B (Example)'}]);


    } catch (error) {
        toast.error("Failed to load data for forms", { description: error.message });
    } finally {
        setIsLoadingDropdowns(false);
    }
  }, [schoolData?.id]);


  useEffect(() => {
    // Debounce search
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (schoolData?.id && session) {
      const currentPage = parseInt(searchParams.get('page') || '1', 10);
      const currentSearch = searchParams.get('search') || '';
      fetchStudents(currentPage, currentSearch);
      fetchDropdownData(); // Fetch data for form dropdowns
    }
  }, [schoolData, session, fetchStudents, fetchDropdownData, searchParams]);


  const handleAddStudentFormChange = (e) => {
    setAddStudentFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleAddStudentSelectChange = (name, value) => {
    setAddStudentFormData(prev => ({ ...prev, [name]: value }));
    // TODO: Implement cascading dropdown logic here if needed
    // e.g., if 'academicYearId' changes, fetch relevant 'classes'
    // if 'classId' changes, fetch relevant 'sections'
  };

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingStudent(true);
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/students`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addStudentFormData),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || 'Failed to add student.';
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Error'}: ${issue.message}`).join('\n');
        toast.error("Submission Failed", { description: errorMessage });
      } else {
        toast.success(`Student "${result.student?.firstName} ${result.student?.lastName}" added successfully!`);
        setAddStudentFormData(initialStudentFormData); setIsAddStudentDialogOpen(false); fetchStudents();
      }
    } catch (err) { toast.error('An unexpected error occurred.');
    } finally { setIsSubmittingStudent(false); }
  };
  
  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Placeholder for Edit/Delete actions
  const openEditStudentDialog = (student) => toast.info(`Editing ${student.firstName} (WIP)`);
  const handleDeleteStudent = (studentId, studentName) => {
    if(!window.confirm(`Are you sure you want to remove student "${studentName}"?`)) return;
    toast.info(`Removing ${studentName} (WIP)`);
  };

  const StudentFormFields = ({ formData, onFormChange, onSelectChange, academicYearsList, classesList, sectionsList, isLoading }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 max-h-[65vh] overflow-y-auto p-1 custom-scrollbar"> {/* Custom scrollbar for dark mode */}
        <div className="md:col-span-3 text-sm font-medium text-zinc-500 dark:text-zinc-400 pb-2 border-b dark:border-zinc-700 mb-2">Personal Details</div>
        <div><Label htmlFor="firstName" className={labelTextClasses}>First Name <span className="text-red-500">*</span></Label><Input id="firstName" name="firstName" value={formData.firstName} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="lastName" className={labelTextClasses}>Last Name <span className="text-red-500">*</span></Label><Input id="lastName" name="lastName" value={formData.lastName} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="middleName" className={labelTextClasses}>Middle Name</Label><Input id="middleName" name="middleName" value={formData.middleName} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        
        <div><Label htmlFor="dateOfBirth" className={labelTextClasses}>Date of Birth <span className="text-red-500">*</span></Label><Input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div>
            <Label htmlFor="gender" className={labelTextClasses}>Gender <span className="text-red-500">*</span></Label>
            <Select name="gender" value={formData.gender} onValueChange={(value) => onSelectChange('gender', value)}>
                <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">{["MALE", "FEMALE", "OTHER", "PREFER_NOT_SAY"].map(g => <SelectItem key={g} value={g} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">{g.charAt(0) + g.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <div><Label htmlFor="admissionNumber" className={labelTextClasses}>Admission No. <span className="text-red-500">*</span></Label><Input id="admissionNumber" name="admissionNumber" value={formData.admissionNumber} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="admissionDate" className={labelTextClasses}>Admission Date <span className="text-red-500">*</span></Label><Input id="admissionDate" name="admissionDate" type="date" value={formData.admissionDate} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        
        <div className="md:col-span-3 text-sm font-medium text-zinc-500 dark:text-zinc-400 pb-2 border-b dark:border-zinc-700 mt-4 mb-2">Contact & Address</div>
        <div><Label htmlFor="studentEmail" className={labelTextClasses}>Student Email</Label><Input id="studentEmail" name="studentEmail" type="email" value={formData.studentEmail} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="studentPhone" className={labelTextClasses}>Student Phone</Label><Input id="studentPhone" name="studentPhone" value={formData.studentPhone} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        <div className="sm:col-span-2 md:col-span-3"><Label htmlFor="addressLine1" className={labelTextClasses}>Address</Label><Textarea id="addressLine1" name="addressLine1" value={formData.addressLine1} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        {/* Add city, state, country inputs if needed */}

        <div className="md:col-span-3 text-sm font-medium text-zinc-500 dark:text-zinc-400 pb-2 border-b dark:border-zinc-700 mt-4 mb-2">Guardian Information</div>
        <div><Label htmlFor="guardianFirstName" className={labelTextClasses}>Guardian First Name <span className="text-red-500">*</span></Label><Input id="guardianFirstName" name="guardianFirstName" value={formData.guardianFirstName} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="guardianLastName" className={labelTextClasses}>Guardian Last Name <span className="text-red-500">*</span></Label><Input id="guardianLastName" name="guardianLastName" value={formData.guardianLastName} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="guardianRelation" className={labelTextClasses}>Relation to Student <span className="text-red-500">*</span></Label><Input id="guardianRelation" name="guardianRelation" value={formData.guardianRelation} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div><Label htmlFor="guardianPhone" className={labelTextClasses}>Guardian Phone <span className="text-red-500">*</span></Label><Input id="guardianPhone" name="guardianPhone" value={formData.guardianPhone} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} /></div>
        <div className="md:col-span-2"><Label htmlFor="guardianEmail" className={labelTextClasses}>Guardian Email</Label><Input id="guardianEmail" name="guardianEmail" type="email" value={formData.guardianEmail} onChange={onFormChange} className={`${inputTextClasses} mt-1`} /></div>
        
        <div className="md:col-span-3 text-sm font-medium text-zinc-500 dark:text-zinc-400 pb-2 border-b dark:border-zinc-700 mt-4 mb-2">Enrollment Details</div>
        <div>
            <Label htmlFor="academicYearId" className={labelTextClasses}>Academic Year <span className="text-red-500">*</span></Label>
            <Select name="academicYearId" value={formData.academicYearId} onValueChange={(value) => onSelectChange('academicYearId', value)} disabled={isLoading}>
                <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select Academic Year" /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900">{academicYearsList?.map(ay => <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <div>
            <Label htmlFor="classId" className={labelTextClasses}>Class <span className="text-red-500">*</span></Label>
            <Select name="classId" value={formData.classId} onValueChange={(value) => onSelectChange('classId', value)} disabled={!formData.academicYearId || classesList?.length === 0 || isLoading}>
                <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900">{classesList?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <div>
            <Label htmlFor="sectionId" className={labelTextClasses}>Section <span className="text-red-500">*</span></Label>
            <Select name="sectionId" value={formData.sectionId} onValueChange={(value) => onSelectChange('sectionId', value)} disabled={!formData.classId || sectionsList?.length === 0 || isLoading}>
                <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select Section" /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900">{sectionsList?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
        </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}><UsersIcon className="mr-3 h-8 w-8 opacity-80"/>Manage Students</h1>
          <p className={descriptionTextClasses}>Enroll new students and manage existing student records for {schoolData?.name}.</p>
        </div>
        <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses}> <UserPlus className="mr-2 h-4 w-4" /> Add New Student </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader> <DialogTitle className={titleTextClasses}>Enroll New Student</DialogTitle> <DialogDescription className={descriptionTextClasses}>Enter the student's details for enrollment.</DialogDescription> </DialogHeader>
            <form onSubmit={handleAddStudentSubmit} className="space-y-6 py-1">
                <StudentFormFields 
                    formData={addStudentFormData} 
                    onFormChange={handleAddStudentFormChange} 
                    onSelectChange={handleAddStudentSelectChange} 
                    academicYearsList={academicYears} 
                    classesList={classes} 
                    sectionsList={sections}
                    isLoading={isLoadingDropdowns}
                />
                <DialogFooter className="pt-6"> <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose> <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingStudent}> {isSubmittingStudent ? 'Enrolling...' : 'Enroll Student'} </Button> </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
          <Input type="search" placeholder="Search students by name, admission no..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`pl-10 w-full md:w-1/2 lg:w-1/3 ${inputTextClasses}`} />
        </div>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Adm. No.</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Class & Section</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Guardian</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
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
                <TableCell className={`${descriptionTextClasses} font-mono text-xs`}>{student.admissionNumber}</TableCell>
                <TableCell className={`${descriptionTextClasses} font-medium`}>{student.firstName} {student.lastName}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>
                  {student.enrollments?.[0] ? `${student.enrollments[0].section?.class?.name} - ${student.enrollments[0].section?.name}` : 'N/A'}
                </TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{student.guardianName || 'N/A'} ({student.guardianRelation || 'Guardian'})</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="Edit" onClick={() => openEditStudentDialog(student)}> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="View Profile" onClick={() => router.push(`/${schoolData.subdomain}/people/students/${student.id}`)}> <Eye className="h-4 w-4" /> </Button> {/* Link to student detail page */}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No students found. Start by adding a new student.
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
       {/* TODO: Add Edit Student Dialog, similar to Add Student Dialog but for updating */}
    </div>
  );
}