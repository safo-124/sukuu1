// app/[subdomain]/(school_app)/academics/grades/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

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
  FilePlus2, Edit3, Trash2, Gauge, Loader2, AlertTriangle, ChartLine, PlusCircle, CheckSquare, Settings,
  BookOpen, Layers, Users, CalendarDays, Percent
} from 'lucide-react';

// Charting Library (Install one if you don't have it, e.g., npm install recharts)
// For simplicity, I'll use a placeholder for the graph and assume Recharts for concepts.
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const initialGradeFormData = {
  id: null,
  studentId: '',
  subjectId: '',
  examScheduleId: '', // Optional: if linking to a specific exam
  termId: '',
  academicYearId: '',
  marksObtained: '',
  gradeLetter: '', // Could be derived from marks and grading scale
  gpa: '', // Could be derived
  comments: '',
};

const initialWeightConfigFormData = {
  id: null,
  academicYearId: '',
  schoolLevelId: '',
  classId: '',
  subjectId: '',
  examWeight: 0,
  classworkWeight: 0,
  assignmentWeight: 0,
  isDefault: false,
};


// Reusable FormFields for Grading Weight Configuration
const GradingWeightConfigFormFields = ({ formData, onFormChange, onSelectChange, academicYearsList, schoolLevelsList, classesList, subjectsList, isLoadingDeps }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  // const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400"; // Already available in parent component

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div>
        <Label htmlFor="academicYearId" className={labelTextClasses}>Academic Year <span className="text-red-500">*</span></Label>
        <Select name="academicYearId" value={formData.academicYearId || ''} onValueChange={(value) => onSelectChange('academicYearId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select academic year" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isLoadingDeps && academicYearsList?.length === 0 && <SelectItem value="no-years" disabled>No academic years</SelectItem>}
            {academicYearsList?.map(year => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="schoolLevelId" className={labelTextClasses}>School Level (Optional)</Label>
        <Select name="schoolLevelId" value={formData.schoolLevelId || ''} onValueChange={(value) => onSelectChange('schoolLevelId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select school level" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">All Levels</SelectItem>
            {!isLoadingDeps && schoolLevelsList?.length === 0 && <SelectItem value="no-levels" disabled>No school levels</SelectItem>}
            {schoolLevelsList?.map(level => <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="classId" className={labelTextClasses}>Class (Optional)</Label>
        <Select name="classId" value={formData.classId || ''} onValueChange={(value) => onSelectChange('classId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select class" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">All Classes</SelectItem>
            {!isLoadingDeps && classesList?.length === 0 && <SelectItem value="no-classes" disabled>No classes</SelectItem>}
            {/* Filter classes by selected academic year and school level if desired */}
            {classesList
                .filter(c => !formData.academicYearId || c.academicYearId === formData.academicYearId)
                .filter(c => !formData.schoolLevelId || c.schoolLevelId === formData.schoolLevelId)
                .map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="subjectId" className={labelTextClasses}>Subject (Optional)</Label>
        <Select name="subjectId" value={formData.subjectId || ''} onValueChange={(value) => onSelectChange('subjectId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select subject" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">All Subjects</SelectItem>
            {!isLoadingDeps && subjectsList?.length === 0 && <SelectItem value="no-subjects" disabled>No subjects</SelectItem>}
            {subjectsList?.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2 grid grid-cols-3 gap-4 border-t pt-4 mt-4 border-zinc-200 dark:border-zinc-700">
        <div>
          <Label htmlFor="examWeight" className={labelTextClasses}>Exam Weight (%) <span className="text-red-500">*</span></Label>
          <Input id="examWeight" name="examWeight" type="number" min="0" max="100" value={formData.examWeight || 0} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
        </div>
        <div>
          <Label htmlFor="classworkWeight" className={labelTextClasses}>Classwork Weight (%) <span className="text-red-500">*</span></Label>
          <Input id="classworkWeight" name="classworkWeight" type="number" min="0" max="100" value={formData.classworkWeight || 0} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
        </div>
        <div>
          <Label htmlFor="assignmentWeight" className={labelTextClasses}>Assignment Weight (%) <span className="text-red-500">*</span></Label>
          <Input id="assignmentWeight" name="assignmentWeight" type="number" min="0" max="100" value={formData.assignmentWeight || 0} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
        </div>
      </div>
      <div className="sm:col-span-2 text-right">
        <p className={`text-sm text-zinc-600 dark:text-zinc-400`}>Total Weight: <span className="font-semibold">{Number(formData.examWeight || 0) + Number(formData.classworkWeight || 0) + Number(formData.assignmentWeight || 0)}%</span></p>
        <p className={`text-xs text-zinc-600 dark:text-zinc-400`}>Should ideally sum to 100%.</p>
      </div>
    </div>
  );
};


export default function ManageGradesPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [grades, setGrades] = useState([]); // Will store actual grades
  const [weightConfigs, setWeightConfigs] = useState([]); // New state for weight configurations
  const [academicYears, setAcademicYears] = useState([]);
  const [schoolLevels, setSchoolLevels] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]); // Needed for grade entry
  const [exams, setExams] = useState([]); // Needed for grade entry

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true);
  const [error, setError] = useState('');

  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [isWeightConfigDialogOpen, setIsWeightConfigDialogOpen] = useState(false);

  const [gradeFormData, setGradeFormData] = useState({ ...initialGradeFormData });
  const [weightConfigFormData, setWeightConfigFormData] = useState({ ...initialWeightConfigFormData });

  const [editingGrade, setEditingGrade] = useState(null);
  const [editingWeightConfig, setEditingWeightConfig] = useState(null);

  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [isSubmittingWeightConfig, setIsSubmittingWeightConfig] = useState(false);

  const [gradeFormError, setGradeFormError] = useState('');
  const [weightConfigFormError, setWeightConfigFormError] = useState('');

  // Tailwind class constants - DEFINED HERE FOR GLOBAL USE IN THIS COMPONENT
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  // --- Fetching Data ---
  const fetchGrades = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      // TODO: Implement API for fetching grades with filters
      // For now, mock data or empty array
      setGrades([]); // Mock
    } catch (err) { toast.error("Error fetching grades", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchWeightConfigs = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError(''); // Reuse isLoading for main table
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/grading-weights`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch grading weight configurations.'); }
      const data = await response.json();
      setWeightConfigs(data.gradingWeightConfigs || []);
    } catch (err) { toast.error("Error fetching grading weights", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    try {
      // Using Promise.allSettled to ensure all promises attempt to resolve
      // and we can catch specific errors per fetch.
      const [yearsRes, levelsRes, classesRes, subjectsRes, studentsRes, examsRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/academic-years`),
        fetch(`/api/schools/${schoolData.id}/academics/school-levels`),
        fetch(`/api/schools/${schoolData.id}/academics/classes`),
        fetch(`/api/schools/${schoolData.id}/academics/subjects`),
        fetch(`/api/schools/${schoolData.id}/students`), // CHANGED PATH HERE from /people/students
        fetch(`/api/schools/${schoolData.id}/academics/exams`),
      ]);

      // Handle each response individually
      if (yearsRes.status === 'rejected' || !yearsRes.value.ok) {
          const errorData = yearsRes.status === 'rejected' ? { error: yearsRes.reason.message } : await yearsRes.value.json().catch(() => ({}));
          console.error("Academic Years fetch failed:", errorData);
          throw new Error(errorData.error || 'Failed to fetch academic years.');
      }
      const yearsData = await yearsRes.value.json();
      setAcademicYears(yearsData.academicYears?.map(year => ({ ...year, terms: year.terms || [] })) || []);

      if (levelsRes.status === 'rejected' || !levelsRes.value.ok) {
          const errorData = levelsRes.status === 'rejected' ? { error: levelsRes.reason.message } : await levelsRes.value.json().catch(() => ({}));
          console.error("School Levels fetch failed:", errorData);
          throw new Error(errorData.error || 'Failed to fetch school levels.');
      }
      const levelsData = await levelsRes.value.json(); setSchoolLevels(levelsData.schoolLevels || []);

      if (classesRes.status === 'rejected' || !classesRes.value.ok) {
          const errorData = classesRes.status === 'rejected' ? { error: classesRes.reason.message } : await classesRes.value.json().catch(() => ({}));
          console.error("Classes fetch failed:", errorData);
          throw new Error(errorData.error || 'Failed to fetch classes.');
      }
      const classesData = await classesRes.value.json(); setClasses(classesData.classes || []);

      if (subjectsRes.status === 'rejected' || !subjectsRes.value.ok) {
          const errorData = subjectsRes.status === 'rejected' ? { error: subjectsRes.reason.message } : await subjectsRes.value.json().catch(() => ({}));
          console.error("Subjects fetch failed:", errorData);
          throw new Error(errorData.error || 'Failed to fetch subjects.');
      }
      const subjectsData = await subjectsRes.value.json(); setSubjects(subjectsData.subjects || []);

      if (studentsRes.status === 'rejected' || !studentsRes.value.ok) {
          const errorData = studentsRes.status === 'rejected' ? { error: studentsRes.reason.message } : await studentsRes.value.json().catch(() => ({}));
          console.error("Students fetch failed:", errorData);
          throw new Error(errorData.error || 'Failed to fetch students.');
      }
      const studentsData = await studentsRes.value.json(); setStudents(studentsData.students || []);

      if (examsRes.status === 'rejected' || !examsRes.value.ok) {
          const errorData = examsRes.status === 'rejected' ? { error: examsRes.reason.message } : await examsRes.value.json().catch(() => ({}));
          console.error("Exams fetch failed:", errorData);
          throw new Error(errorData.error || 'Failed to fetch exams.');
      }
      const examsData = await examsRes.value.json(); setExams(examsData.exams || []);

    } catch (err) {
      toast.error("Error fetching grade form dependencies", { description: err.message });
      console.error("Dependency fetch error caught:", err);
    } finally {
      setIsLoadingDeps(false);
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session) {
      fetchGrades();
      fetchWeightConfigs();
      fetchDropdownDependencies();
    }
  }, [schoolData, session, fetchGrades, fetchWeightConfigs, fetchDropdownDependencies]);

  // --- Form Handlers for Grading Weights ---
  const handleWeightConfigFormChange = (e) => setWeightConfigFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleWeightConfigSelectChange = (name, value) => setWeightConfigFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));

  const openAddWeightConfigDialog = () => {
    setEditingWeightConfig(null);
    setWeightConfigFormData({ ...initialWeightConfigFormData });
    setWeightConfigFormError('');
    setIsWeightConfigDialogOpen(true);
  };

  const openEditWeightConfigDialog = (config) => {
    setEditingWeightConfig(config);
    setWeightConfigFormData({
      id: config.id,
      academicYearId: config.academicYearId,
      schoolLevelId: config.schoolLevelId || '',
      classId: config.classId || '',
      subjectId: config.subjectId || '',
      examWeight: config.examWeight,
      classworkWeight: config.classworkWeight,
      assignmentWeight: config.assignmentWeight,
      isDefault: config.isDefault,
    });
    setWeightConfigFormError('');
    setIsWeightConfigDialogOpen(true);
  };

  const handleWeightConfigSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingWeightConfig(true); setWeightConfigFormError('');

    const isEditing = !!editingWeightConfig;

    const payload = {
      ...weightConfigFormData,
      schoolId: schoolData.id,
      examWeight: parseFloat(weightConfigFormData.examWeight),
      classworkWeight: parseFloat(weightConfigFormData.classworkWeight),
      assignmentWeight: parseFloat(weightConfigFormData.assignmentWeight),
    };

    // Basic validation for weights sum
    const totalWeight = payload.examWeight + payload.classworkWeight + payload.assignmentWeight;
    if (totalWeight !== 100) {
      setWeightConfigFormError('Total weight for Exam, Classwork, and Assignment must sum to 100%.');
      setIsSubmittingWeightConfig(false);
      return;
    }

    const url = isEditing
      ? `/api/schools/${schoolData.id}/academics/grading-weights/${editingWeightConfig.id}`
      : `/api/schools/${schoolData.id}/academics/grading-weights`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} grading weight configuration.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setWeightConfigFormError(err);
      } else {
        toast.success(`Grading weight config ${actionText}d successfully!`);
        setIsWeightConfigDialogOpen(false);
        fetchWeightConfigs(); // Re-fetch configs
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setWeightConfigFormError('An unexpected error occurred.');
    } finally { setIsSubmittingWeightConfig(false); }
  };

  const handleDeleteWeightConfig = async (configId) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE this grading weight configuration?`)) return;
    const toastId = `delete-weight-config-${configId}`;
    toast.loading("Deleting configuration...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/grading-weights/${configId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Grading configuration deleted.`, { id: toastId });
      fetchWeightConfigs();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Grade Entry Section (Placeholder for now) ---
  const handleGradeFormChange = (e) => setGradeFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleGradeSelectChange = (name, value) => setGradeFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));

  const openAddGradeDialog = () => {
    setEditingGrade(null);
    setGradeFormData({ ...initialGradeFormData });
    setGradeFormError('');
    setIsGradeDialogOpen(true);
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingGrade(true); setGradeFormError('');
    // TODO: Implement actual grade submission API call
    console.log("Submitting grade data:", gradeFormData);
    toast.info("Grade submission is not fully implemented yet.");
    setIsSubmittingGrade(false);
    setIsGradeDialogOpen(false);
    // fetchGrades(); // Once API is ready
  };

  // --- Helper Functions for Display ---
  const getAcademicYearName = useCallback((id) => academicYears.find(y => y.id === id)?.name || 'N/A', [academicYears]);
  const getSchoolLevelName = useCallback((id) => schoolLevels.find(l => l.id === id)?.name || 'N/A', [schoolLevels]);
  const getClassName = useCallback((id) => classes.find(c => c.id === id)?.name || 'N/A', [classes]);
  const getSubjectName = useCallback((id) => subjects.find(s => s.id === id)?.name || 'N/A', [subjects]);
  const getStudentName = useCallback((id) => {
    const student = students.find(s => s.id === id);
    return student ? `${student.firstName} ${student.lastName}` : 'N/A';
  }, [students]);
  const getExamName = useCallback((id) => exams.find(e => e.id === id)?.name || 'N/A', [exams]);


  // --- Academic Performance Graph (Mock Data & Component Placeholder) ---
  const mockStudentPerformanceData = [
    { name: 'Term 1', Math: 85, Science: 78, English: 92 },
    { name: 'Term 2', Math: 88, Science: 80, English: 90 },
    { name: 'Term 3', Math: 90, Science: 85, English: 95 },
  ];

  const PerformanceGraph = ({ data }) => {
    // This would use a charting library like Recharts or Chart.js
    // For now, it's a visual placeholder.
    return (
      <div className="w-full h-80 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400">
        <p>Academic Performance Graph Placeholder</p>
        {/*
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis dataKey="name" stroke={descriptionTextClasses.split(' ')[0]} />
            <YAxis stroke={descriptionTextClasses.split(' ')[0]} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: 'none' }} />
            <Legend />
            <Line type="monotone" dataKey="Math" stroke="#8884d8" activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="Science" stroke="#82ca9d" />
            <Line type="monotone" dataKey="English" stroke="#ffc658" />
          </LineChart>
        </ResponsiveContainer>
        */}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Gauge className="mr-3 h-8 w-8 opacity-80"/>Manage Grades
          </h1>
          <p className={descriptionTextClasses}>Record student grades and configure grading weights.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isWeightConfigDialogOpen} onOpenChange={(open) => { setIsWeightConfigDialogOpen(open); if (!open) setWeightConfigFormError(''); }}>
                <DialogTrigger asChild>
                    <Button className={outlineButtonClasses} onClick={openAddWeightConfigDialog}> <Percent className="mr-2 h-4 w-4" /> Configure Grading Weights </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <DialogHeader>
                    <DialogTitle className={titleTextClasses}>{editingWeightConfig ? 'Edit Grading Weights' : 'Add New Grading Weight Configuration'}</DialogTitle>
                    <DialogDescription className={descriptionTextClasses}>
                        Define how Exams, Classwork, and Assignments contribute to the overall grade.
                    </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleWeightConfigSubmit} className="space-y-6 py-1">
                    <GradingWeightConfigFormFields
                        formData={weightConfigFormData}
                        onFormChange={handleWeightConfigFormChange}
                        onSelectChange={handleWeightConfigSelectChange}
                        academicYearsList={academicYears}
                        schoolLevelsList={schoolLevels}
                        classesList={classes}
                        subjectsList={subjects}
                        isLoadingDeps={isLoadingDeps}
                    />
                    {weightConfigFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{weightConfigFormError}</p> )}
                    <DialogFooter className="pt-6">
                        <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                        <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingWeightConfig || isLoadingDeps}>
                        {isSubmittingWeightConfig ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Configuration'}
                        </Button>
                    </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isGradeDialogOpen} onOpenChange={(open) => { setIsGradeDialogOpen(open); if (!open) setGradeFormError(''); }}>
                <DialogTrigger asChild>
                    <Button className={primaryButtonClasses} onClick={openAddGradeDialog}> <PlusCircle className="mr-2 h-4 w-4" /> Add Grade </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <DialogHeader>
                    <DialogTitle className={titleTextClasses}>{editingGrade ? 'Edit Grade' : 'Add New Grade'}</DialogTitle>
                    <DialogDescription className={descriptionTextClasses}>
                        Enter a new grade for a student in a subject and term.
                    </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleGradeSubmit} className="space-y-6 py-1">
                        {/* Grade Entry Form Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <Label htmlFor="academicYearId-grade" className={descriptionTextClasses}>Academic Year <span className="text-red-500">*</span></Label>
                                <Select name="academicYearId" value={gradeFormData.academicYearId || ''} onValueChange={(val) => handleGradeSelectChange('academicYearId', val)} disabled={isLoadingDeps}>
                                <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select year" /></SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900">{academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="termId-grade" className={descriptionTextClasses}>Term <span className="text-red-500">*</span></Label>
                                <Select name="termId" value={gradeFormData.termId || ''} onValueChange={(val) => handleGradeSelectChange('termId', val)} disabled={isLoadingDeps}>
                                <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select term" /></SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900">{
                                  academicYears.find(y => y.id === gradeFormData.academicYearId)?.terms?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                                  || <SelectItem value="" disabled>Select Year First</SelectItem>
                                }</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="studentId-grade" className={descriptionTextClasses}>Student <span className="text-red-500">*</span></Label>
                                <Select name="studentId" value={gradeFormData.studentId || ''} onValueChange={(val) => handleGradeSelectChange('studentId', val)} disabled={isLoadingDeps}>
                                <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select student" /></SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900">{students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="subjectId-grade" className={descriptionTextClasses}>Subject <span className="text-red-500">*</span></Label>
                                <Select name="subjectId" value={gradeFormData.subjectId || ''} onValueChange={(val) => handleGradeSelectChange('subjectId', val)} disabled={isLoadingDeps}>
                                <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select subject" /></SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900">{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="marksObtained" className={descriptionTextClasses}>Marks Obtained (Optional)</Label>
                                <Input id="marksObtained" name="marksObtained" type="number" step="0.1" value={gradeFormData.marksObtained} onChange={handleGradeFormChange} className={`${inputTextClasses} mt-1`} />
                            </div>
                            <div>
                                <Label htmlFor="gradeLetter" className={descriptionTextClasses}>Grade Letter (Optional)</Label>
                                <Input id="gradeLetter" name="gradeLetter" value={gradeFormData.gradeLetter} onChange={handleGradeFormChange} className={`${inputTextClasses} mt-1`} />
                            </div>
                            <div className="sm:col-span-2">
                                <Label htmlFor="comments" className={descriptionTextClasses}>Comments (Optional)</Label>
                                <Textarea id="comments" name="comments" value={gradeFormData.comments} onChange={handleGradeFormChange} rows={2} className={`${inputTextClasses} mt-1`} />
                            </div>
                        </div>
                        {gradeFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{gradeFormError}</p> )}
                        <DialogFooter className="pt-6">
                            <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                            <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingGrade || isLoadingDeps}>
                            {isSubmittingGrade ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Grade'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      {/* Grading Weight Configurations Table */}
      <div className={`${glassCardClasses} overflow-x-auto`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <Percent className="mr-2 h-6 w-6 opacity-80"/>Grading Weight Configurations
        </h2>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Academic Year</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Level</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Class</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden lg:table-cell`}>Subject</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center`}>Exam (%)</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center`}>Classwork (%)</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center`}>Assignment (%)</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-weights-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-10 rounded" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-10 rounded" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-10 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : weightConfigs.length > 0 ? weightConfigs.map((config) => (
              <TableRow key={config.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{getAcademicYearName(config.academicYearId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{config.schoolLevelId ? getSchoolLevelName(config.schoolLevelId) : 'All Levels'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{config.classId ? getClassName(config.classId) : 'All Classes'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden lg:table-cell`}>{config.subjectId ? getSubjectName(config.subjectId) : 'All Subjects'}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-center`}>{config.examWeight}%</TableCell>
                <TableCell className={`${descriptionTextClasses} text-center`}>{config.classworkWeight}%</TableCell>
                <TableCell className={`${descriptionTextClasses} text-center`}>{config.assignmentWeight}%</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditWeightConfigDialog(config)} title="Edit Configuration"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteWeightConfig(config.id)} title="Delete Configuration"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="8" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No grading weight configurations set up yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Student Grades Table (Placeholder) */}
      <div className={`${glassCardClasses} overflow-x-auto`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <CheckSquare className="mr-2 h-6 w-6 opacity-80"/>Student Grades
        </h2>
        <p className={`text-sm ${descriptionTextClasses} mb-4`}>This section will list individual student grades. Grade calculation based on configured weights will be displayed here.</p>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Student</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Subject</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Term/Exam</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-right`}>Score / Grade</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.length === 0 ? (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No grades entered yet.
                </TableCell>
              </TableRow>
            ) : (
                // Map over grades when actual data is available
              // grades.map(grade => (
              //   <TableRow key={grade.id}>
              //     <TableCell>{getStudentName(grade.studentId)}</TableCell>
              //     <TableCell>{getSubjectName(grade.subjectId)}</TableCell>
              //     <TableCell>{grade.examScheduleId ? getExamName(grade.examScheduleId) : getTermName(grade.termId)}</TableCell>
              //     <TableCell className="text-right">{grade.marksObtained !== null ? `${grade.marksObtained} / ${grade.gradeLetter || 'N/A'}` : grade.gradeLetter || 'N/A'}</TableCell>
              //     <TableCell className="text-right">
              //       <Button variant="outline" size="icon" onClick={() => openEditGradeDialog(grade)}><Edit3 className="h-4 w-4" /></Button>
              //       <Button variant="outline" size="icon" className="ml-2 text-red-600 hover:text-red-800" onClick={() => handleDeleteGrade(grade.id)}><Trash2 className="h-4 w-4" /></Button>
              //     </TableCell>
              //   </TableRow>
              // ))
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  Grade entry and display coming soon!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Academic Performance Graph Section */}
      <div className={`${glassCardClasses}`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <ChartLine className="mr-2 h-6 w-6 opacity-80"/>Student Academic Performance
        </h2>
        <p className={`text-sm ${descriptionTextClasses} mb-4`}>Select a student and subject to view their performance trend over academic terms.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
                <Label htmlFor="student-for-graph" className={descriptionTextClasses}>Select Student</Label>
                <Select disabled={isLoadingDeps}>
                  <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select a student" /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900">{students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="subject-for-graph" className={descriptionTextClasses}>Select Subject</Label>
                <Select disabled={isLoadingDeps}>
                  <SelectTrigger className={`${inputTextClasses} mt-1`}><SelectValue placeholder="Select a subject" /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900">{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
        </div>
        <PerformanceGraph data={mockStudentPerformanceData} />
        <p className={`text-xs mt-4 ${descriptionTextClasses}`}>Note: Graph will display real data once comprehensive grade entry is available.</p>
      </div>
    </div>
  );
}