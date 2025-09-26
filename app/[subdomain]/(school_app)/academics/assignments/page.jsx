// app/[subdomain]/(school_app)/academics/assignments/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Plus, Search, Filter, Calendar, Clock, Users, BookOpen, CheckSquare, 
  FileText, MoreVertical, Edit, Trash2, Eye, Copy, Share, Download,
  AlertCircle, Target, Zap, Book, ChevronDown, ChevronRight, X,
  Paperclip, Upload, Image, Video, File
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RequireRole from '@/components/auth/RequireRole';

// ---------------- MODERN STUDENT ASSIGNMENTS VIEW ----------------
function StudentAssignmentsView() {
  const { data: session } = useSession();
  const school = useSchool();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    if (!session?.user?.schoolId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${session.user.schoolId}/students/me/assignments`);
      if (!res.ok) throw new Error('Failed to load assignments');
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const categorizedAssignments = useMemo(() => {
    const now = new Date();
    const pending = assignments.filter(a => new Date(a.dueDate) > now && !a.submitted);
    const overdue = assignments.filter(a => new Date(a.dueDate) <= now && !a.submitted);
    const completed = assignments.filter(a => a.submitted);
    
    return { pending, overdue, completed };
  }, [assignments]);

  const getStatusColor = (assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (assignment.submitted) return 'bg-green-500';
    if (dueDate <= now) return 'bg-red-500';
    if (dueDate - now < 24 * 60 * 60 * 1000) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (date - now) / (1000 * 60 * 60);
    
    if (diffInHours < 24 && diffInHours > 0) {
      return `Due in ${Math.ceil(diffInHours)} hours`;
    } else if (diffInHours < 0) {
      return `Overdue by ${Math.ceil(-diffInHours)} hours`;
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2"></div>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Assignments</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {categorizedAssignments.pending.length} pending, {categorizedAssignments.overdue.length} overdue
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            Pending
            {categorizedAssignments.pending.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {categorizedAssignments.pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="relative">
            Overdue
            {categorizedAssignments.overdue.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {categorizedAssignments.overdue.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {categorizedAssignments.completed.length > 0 && (
              <Badge variant="outline" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {categorizedAssignments.completed.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <AssignmentsList assignments={categorizedAssignments.pending} onSelect={setSelectedAssignment} />
        </TabsContent>
        
        <TabsContent value="overdue" className="space-y-4">
          <AssignmentsList assignments={categorizedAssignments.overdue} onSelect={setSelectedAssignment} />
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          <AssignmentsList assignments={categorizedAssignments.completed} onSelect={setSelectedAssignment} />
        </TabsContent>
      </Tabs>

      {/* Assignment Detail Modal */}
      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          isOpen={!!selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </div>
  );
}

function AssignmentsList({ assignments, onSelect }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (date - now) / (1000 * 60 * 60);
    
    if (diffInHours < 24 && diffInHours > 0) {
      return `Due in ${Math.ceil(diffInHours)} hours`;
    } else if (diffInHours < 0) {
      return `Overdue by ${Math.ceil(-diffInHours)} hours`;
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const getStatusColor = (assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (assignment.submitted) return 'bg-green-100 text-green-800 border-green-200';
    if (dueDate <= now) return 'bg-red-100 text-red-800 border-red-200';
    if (dueDate - now < 24 * 60 * 60 * 1000) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">No assignments</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          You're all caught up! No assignments in this category.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <Card 
          key={assignment.id} 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onSelect(assignment)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {assignment.title}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {assignment.subject?.name}
                  </Badge>
                  <Badge className={`text-xs ${getStatusColor(assignment)}`}>
                    {assignment.type}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {assignment.description || 'No description provided'}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(assignment.dueDate)}</span>
                  </div>
                  
                  {assignment.maxMarks && (
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span>{assignment.maxMarks} marks</span>
                    </div>
                  )}
                  
                  {assignment.attachments?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Paperclip className="h-4 w-4" />
                      <span>{assignment.attachments.length} files</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className={`w-3 h-3 rounded-full ${assignment.submitted ? 'bg-green-500' : 
                  new Date(assignment.dueDate) <= new Date() ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssignmentDetailModal({ assignment, isOpen, onClose }) {
  // Assignment detail modal implementation
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{assignment.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>{assignment.description}</p>
          {/* Add submission interface here */}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- MODERN ASSIGNMENT FORM ----------------
const initialAssignmentFormData = {
  id: null,
  title: '',
  description: '',
  dueDate: '',
  subjectId: '',
  sectionId: '',
  classId: '',
  teacherId: '',
  maxMarks: '',
  attachments: [],
  type: 'SUBJECT',
  objectives: [],
};

function ModernAssignmentForm({ 
  formData, onFormChange, onSelectChange, onFileChange, onRemoveAttachment,
  subjects, sections, teachers, isLoadingDeps 
}) {
  const [objectives, setObjectives] = useState(formData.objectives || []);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (formData.type === 'OBJECTIVE') {
      onSelectChange('objectives', objectives);
    }
  }, [objectives, formData.type]);

  const addObjective = () => {
    setObjectives(prev => [...prev, { 
      question: '', 
      correctAnswer: '', 
      marks: 1,
      options: [] 
    }]);
  };

  const updateObjective = (index, field, value) => {
    setObjectives(prev => prev.map((obj, i) => 
      i === index ? { ...obj, [field]: value } : obj
    ));
  };

  const removeObjective = (index) => {
    setObjectives(prev => prev.filter((_, i) => i !== index));
  };

  const steps = [
    { id: 1, name: 'Basic Info', icon: FileText },
    { id: 2, name: 'Details', icon: Book },
    { id: 3, name: 'Questions', icon: Target, condition: formData.type === 'OBJECTIVE' }
  ].filter(step => !step.condition || step.condition);

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div 
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 cursor-pointer transition-colors ${
                currentStep >= step.id 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-400 hover:border-gray-400'
              }`}
              onClick={() => setCurrentStep(step.id)}
            >
              <step.icon className="w-5 h-5" />
            </div>
            {index < steps.length - 1 && (
              <div className={`w-20 h-0.5 mx-4 ${
                currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Assignment Title <span className="text-red-500">*</span>
              </Label>
              <Input
                name="title"
                value={formData.title || ''}
                onChange={onFormChange}
                placeholder="Enter assignment title"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Assignment Type <span className="text-red-500">*</span>
              </Label>
              <Select 
                name="type" 
                value={formData.type || 'SUBJECT'} 
                onValueChange={v => onSelectChange('type', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBJECT">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Subject Assignment</div>
                        <div className="text-xs text-gray-500">Manual grading required</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="OBJECTIVE">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Objective Assignment</div>
                        <div className="text-xs text-gray-500">Auto-graded questions</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Select 
                name="subjectId" 
                value={formData.subjectId || ''} 
                onValueChange={v => onSelectChange('subjectId', v)}
                disabled={isLoadingDeps}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setCurrentStep(2)}>
              Next Step <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                name="dueDate"
                type="date"
                value={formData.dueDate || ''}
                onChange={onFormChange}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Maximum Marks
              </Label>
              <Input
                name="maxMarks"
                type="number"
                min="0"
                step="0.1"
                value={formData.maxMarks || ''}
                onChange={onFormChange}
                placeholder="e.g., 100"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Target Class (Optional)
              </Label>
              <Select 
                name="classId" 
                value={formData.classId || ''} 
                onValueChange={v => onSelectChange('classId', v === 'none' ? '' : v)}
                disabled={isLoadingDeps}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Classes</SelectItem>
                  {/* Add classes here */}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Target Section (Optional)
              </Label>
              <Select 
                name="sectionId" 
                value={formData.sectionId || ''} 
                onValueChange={v => onSelectChange('sectionId', v === 'none' ? '' : v)}
                disabled={isLoadingDeps}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Sections</SelectItem>
                  {sections?.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.class?.name} - {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </Label>
            <Textarea
              name="description"
              value={formData.description || ''}
              onChange={onFormChange}
              rows={4}
              placeholder="Provide detailed instructions for the assignment..."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Attachments
            </Label>
            <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                    Upload files
                  </span>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    onChange={onFileChange}
                    className="sr-only"
                  />
                </Label>
                <p className="mt-1 text-xs text-gray-500">
                  PDF, DOC, DOCX, PNG, JPG up to 10MB each
                </p>
              </div>
            </div>

            {/* Show existing attachments */}
            {formData.attachments?.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Attachments:
                </Label>
                {formData.attachments.map((fileUrl, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-blue-500" />
                      <a 
                        href={fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 truncate max-w-xs"
                      >
                        {fileUrl.substring(fileUrl.lastIndexOf('/') + 1)}
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveAttachment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Previous
            </Button>
            {formData.type === 'OBJECTIVE' ? (
              <Button onClick={() => setCurrentStep(3)}>
                Next Step <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Objectives (only for OBJECTIVE type) */}
      {currentStep === 3 && formData.type === 'OBJECTIVE' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Create Questions
              </h3>
              <p className="text-sm text-gray-500">
                Add questions that will be automatically graded
              </p>
            </div>
            <Button onClick={addObjective} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {objectives.map((objective, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Question {index + 1}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeObjective(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Question Text
                    </Label>
                    <Textarea
                      value={objective.question}
                      onChange={e => updateObjective(index, 'question', e.target.value)}
                      placeholder="Enter your question here..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Correct Answer
                      </Label>
                      <Input
                        value={objective.correctAnswer}
                        onChange={e => updateObjective(index, 'correctAnswer', e.target.value)}
                        placeholder="Enter correct answer"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Marks
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={objective.marks}
                        onChange={e => updateObjective(index, 'marks', e.target.value)}
                        placeholder="1"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {objectives.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
                  No questions yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add questions to create an objective assignment
                </p>
                <Button onClick={addObjective} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Question
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Previous
            </Button>
            <div></div>
          </div>
        </div>
      )}
    </div>
  );
}


// ---------------- MAIN ASSIGNMENTS PAGE ----------------
export default function ModernAssignmentsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  // Student role gets modern view
  if (session?.user?.role === 'STUDENT') {
    return (
      <RequireRole role="STUDENT" fallback={null}>
        <StudentAssignmentsView />
      </RequireRole>
    );
  }

  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true);
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...initialAssignmentFormData });
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // cards | list

  // Fetch assignments
  const fetchAssignments = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true);
    setError('');
    
    try {
      const mine = session?.user?.role === 'TEACHER' ? '1' : '0';
      const params = new URLSearchParams({
        mine,
        ...(subjectFilter && { subjectId: subjectFilter }),
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });
      
      const response = await fetch(`/api/schools/${schoolData.id}/academics/assignments?${params}`);
      if (!response.ok) throw new Error('Failed to fetch assignments');
      
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (err) {
      setError(err.message);
      toast.error('Error fetching assignments', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id, session?.user?.role, subjectFilter, search, statusFilter]);

  // Fetch dependencies
  const fetchDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    
    try {
      const mine = session?.user?.role === 'TEACHER' ? '1' : '0';
      const [subjectsRes, sectionsRes] = await Promise.all([
        fetch(`/api/schools/${schoolData.id}/academics/subjects?mine=${mine}`),
        fetch(`/api/schools/${schoolData.id}/academics/sections`),
      ]);

      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData.subjects || []);
      }

      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        setSections(sectionsData.sections || []);
      }

      // Fetch teachers for admin
      if (session?.user?.role === 'SCHOOL_ADMIN') {
        const teachersRes = await fetch(`/api/schools/${schoolData.id}/staff/teachers`);
        if (teachersRes.ok) {
          const teachersData = await teachersRes.json();
          setTeachers(teachersData.teachers?.filter(t => t.user) || []);
        }
      } else if (session?.user?.role === 'TEACHER') {
        const meRes = await fetch(`/api/schools/${schoolData.id}/staff/me`);
        if (meRes.ok) {
          const meData = await meRes.json();
          setTeachers(meData.staff ? [meData.staff] : []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dependencies:', err);
    } finally {
      setIsLoadingDeps(false);
    }
  }, [schoolData?.id, session?.user?.role]);

  useEffect(() => {
    fetchAssignments();
    fetchDependencies();
  }, [fetchAssignments, fetchDependencies]);

  // Form handlers
  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files || []));
  };

  const handleRemoveAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const openCreateDialog = () => {
    setEditingAssignment(null);
    setFormData({
      ...initialAssignmentFormData,
      teacherId: session?.user?.staffProfileId || '',
    });
    setSelectedFiles([]);
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      id: assignment.id,
      title: assignment.title || '',
      description: assignment.description || '',
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
      subjectId: assignment.subjectId || '',
      sectionId: assignment.sectionId || '',
      classId: assignment.classId || '',
      teacherId: assignment.teacherId || '',
      maxMarks: assignment.maxMarks?.toString() || '',
      attachments: assignment.attachments || [],
      type: assignment.type || 'SUBJECT',
      objectives: assignment.objectives || [],
    });
    setSelectedFiles([]);
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      // Upload files if any
      let uploadedFileUrls = [];
      if (selectedFiles.length > 0) {
        const formDataUpload = new FormData();
        selectedFiles.forEach(file => formDataUpload.append('files', file));
        
        const uploadResponse = await fetch('/api/upload-files', {
          method: 'POST',
          body: formDataUpload,
        });
        
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.error || 'File upload failed');
        uploadedFileUrls = uploadResult.fileUrls || [];
      }

      const payload = {
        title: formData.title,
        description: formData.description || null,
        dueDate: new Date(formData.dueDate).toISOString(),
        subjectId: formData.subjectId,
        sectionId: formData.sectionId || null,
        classId: formData.classId || null,
        teacherId: formData.teacherId,
        maxMarks: formData.maxMarks ? parseFloat(formData.maxMarks) : null,
        attachments: [...(formData.attachments || []), ...uploadedFileUrls],
        type: formData.type || 'SUBJECT',
        objectives: (formData.type === 'OBJECTIVE'
          ? (formData.objectives || [])
              .map(o => {
                const obj = {};
                const q = (o.question || '').trim();
                if (!q) return null;
                obj.question = q;
                const ca = (o.correctAnswer || '').trim();
                if (ca) obj.correctAnswer = ca;
                if (o.marks !== undefined && o.marks !== null && String(o.marks).trim() !== '') {
                  const num = Number(o.marks);
                  if (!Number.isNaN(num)) obj.marks = num;
                }
                return obj;
              })
              .filter(Boolean)
          : undefined),
        schoolId: schoolData.id,
      };

      const isEditing = !!editingAssignment;
      const url = isEditing
        ? `/api/schools/${schoolData.id}/academics/assignments/${editingAssignment.id}`
        : `/api/schools/${schoolData.id}/academics/assignments`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${isEditing ? 'update' : 'create'} assignment.`;
        if (result.issues) {
          err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        }
        throw new Error(err);
      }

      toast.success(`Assignment "${result.assignment?.title}" ${isEditing ? 'updated' : 'created'} successfully!`);
      setIsDialogOpen(false);
      fetchAssignments();
    } catch (err) {
      setFormError(err.message);
      toast.error('Operation failed', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (assignment) => {
    if (!confirm(`Delete "${assignment.title}"? This cannot be undone.`)) return;
    
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/assignments/${assignment.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete assignment');
      
      toast.success('Assignment deleted successfully');
      fetchAssignments();
    } catch (err) {
      toast.error('Failed to delete assignment', { description: err.message });
    }
  };

  // Categorize assignments
  const categorizedAssignments = useMemo(() => {
    const now = new Date();
    const active = assignments.filter(a => new Date(a.dueDate) > now);
    const overdue = assignments.filter(a => new Date(a.dueDate) <= now);
    const draft = []; // Placeholder for draft assignments
    
    return { active, overdue, draft };
  }, [assignments]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assignments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track student assignments
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}
          >
            {viewMode === 'cards' ? 'List View' : 'Card View'}
          </Button>
          
          <Button onClick={openCreateDialog} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Assignment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {categorizedAssignments.active.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {categorizedAssignments.overdue.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckSquare className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {assignments.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past Due</SelectItem>
            </SelectContent>
          </Select>

          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Subjects</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assignments Grid */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AssignmentsGrid 
        assignments={assignments}
        viewMode={viewMode}
        onEdit={openEditDialog}
        onDelete={handleDelete}
        schoolData={schoolData}
      />

      {/* Create/Edit Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment 
                ? 'Update assignment details and settings' 
                : 'Create a new assignment for your students'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <ModernAssignmentForm
              formData={formData}
              onFormChange={handleFormChange}
              onSelectChange={handleSelectChange}
              onFileChange={handleFileChange}
              onRemoveAttachment={handleRemoveAttachment}
              subjects={subjects}
              sections={sections}
              teachers={teachers}
              isLoadingDeps={isLoadingDeps}
            />

            {formError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.title || !formData.subjectId || !formData.dueDate}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingAssignment ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingAssignment ? 'Update Assignment' : 'Create Assignment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- ASSIGNMENTS GRID COMPONENT ----------------
function AssignmentsGrid({ assignments, viewMode, onEdit, onDelete, schoolData }) {
  const { data: session } = useSession();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (date - now) / (1000 * 60 * 60);
    
    if (diffInHours < 24 && diffInHours > 0) {
      return { text: `Due in ${Math.ceil(diffInHours)} hours`, urgent: true };
    } else if (diffInHours < 0) {
      return { text: `Overdue by ${Math.ceil(-diffInHours)} hours`, overdue: true };
    }
    
    return { 
      text: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      }),
      upcoming: true
    };
  };

  const getStatusColor = (assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (dueDate <= now) return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' };
    if (dueDate - now < 24 * 60 * 60 * 1000) return { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' };
    return { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' };
  };

  if (assignments.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <BookOpen className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="mt-6 text-lg font-medium text-gray-900 dark:text-white">No assignments found</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Get started by creating your first assignment to engage your students with meaningful learning activities.
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <div className="col-span-4">Assignment</div>
            <div className="col-span-2">Subject</div>
            <div className="col-span-2">Due Date</div>
            <div className="col-span-2">Submissions</div>
            <div className="col-span-2">Actions</div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {assignments.map((assignment) => {
            const dateInfo = formatDate(assignment.dueDate);
            const statusColors = getStatusColor(assignment);
            
            return (
              <div key={assignment.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${statusColors.dot}`}></div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {assignment.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={assignment.type === 'OBJECTIVE' ? 'default' : 'secondary'} className="text-xs">
                            {assignment.type}
                          </Badge>
                          {assignment.attachments?.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Paperclip className="w-3 h-3" />
                              {assignment.attachments.length}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <Badge variant="outline" className="text-xs">
                      {assignment.subject?.name || 'N/A'}
                    </Badge>
                  </div>
                  
                  <div className="col-span-2">
                    <span className={`text-sm ${
                      dateInfo.overdue ? 'text-red-600 font-medium' : 
                      dateInfo.urgent ? 'text-yellow-600 font-medium' : 
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {dateInfo.text}
                    </span>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {assignment._count?.submittedAssignments || 0}
                      </span>
                      <Progress 
                        value={(assignment._count?.submittedAssignments || 0) / Math.max(assignment.enrollmentCount || 1, 1) * 100} 
                        className="w-16 h-2"
                      />
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(assignment)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {session?.user?.role === 'TEACHER' && (
                          <DropdownMenuItem 
                            onClick={() => window.location.assign(`/${schoolData?.subdomain || ''}/teacher/academics/assignments/${assignment.id}/submissions`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Review Submissions
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDelete(assignment)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Card view
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {assignments.map((assignment) => {
        const dateInfo = formatDate(assignment.dueDate);
        const statusColors = getStatusColor(assignment);
        
        return (
          <Card key={assignment.id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusColors.dot}`}></div>
                  <Badge 
                    variant={assignment.type === 'OBJECTIVE' ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    {assignment.type === 'OBJECTIVE' ? (
                      <><Zap className="w-3 h-3 mr-1" />Auto-graded</>
                    ) : (
                      <><FileText className="w-3 h-3 mr-1" />Manual</>
                    )}
                  </Badge>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(assignment)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    {session?.user?.role === 'TEACHER' && (
                      <DropdownMenuItem 
                        onClick={() => window.location.assign(`/${schoolData?.subdomain || ''}/teacher/academics/assignments/${assignment.id}/submissions`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Review Submissions
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(assignment)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 leading-tight">
                  {assignment.title}
                </h3>
                
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {assignment.subject?.name || 'N/A'}
                  </Badge>
                  {assignment.maxMarks && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Target className="w-3 h-3" />
                      {assignment.maxMarks} pts
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                {assignment.description || 'No description provided'}
              </p>
              
              <div className="space-y-3">
                {/* Due date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className={`${
                      dateInfo.overdue ? 'text-red-600 font-medium' : 
                      dateInfo.urgent ? 'text-yellow-600 font-medium' : 
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {dateInfo.text}
                    </span>
                  </div>
                  
                  {assignment.attachments?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Paperclip className="w-4 h-4" />
                      <span>{assignment.attachments.length} files</span>
                    </div>
                  )}
                </div>
                
                {/* Submissions progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Submissions</span>
                    <span className="font-medium">
                      {assignment._count?.submittedAssignments || 0} / {assignment.enrollmentCount || 0}
                    </span>
                  </div>
                  <Progress 
                    value={(assignment._count?.submittedAssignments || 0) / Math.max(assignment.enrollmentCount || 1, 1) * 100} 
                    className="h-2"
                  />
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  {session?.user?.role === 'TEACHER' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs"
                      onClick={() => window.location.assign(`/${schoolData?.subdomain || ''}/teacher/academics/assignments/${assignment.id}/submissions`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => onEdit(assignment)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------- MAIN ASSIGNMENTS PAGE COMPONENT ----------------
export default function ModernAssignmentsPage() {
  const { data: session } = useSession();
  const school = useSchool();
  
  // Return appropriate view based on user role
  if (session?.user?.role === 'STUDENT') {
    return <StudentAssignmentsView />;
  }

  // Teacher/Admin view (includes all management features)
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [subjects, setSubjects] = useState([]);
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Fetch assignments and subjects
  const fetchData = useCallback(async () => {
    if (!school?.id || !session) return;
    
    try {
      setLoading(true);
      setError(null);

      const [assignmentsRes, subjectsRes] = await Promise.all([
        fetch(`/api/schools/${school.id}/academics/assignments`),
        fetch(`/api/schools/${school.id}/academics/subjects`)
      ]);

      if (!assignmentsRes.ok) throw new Error('Failed to fetch assignments');
      if (!subjectsRes.ok) throw new Error('Failed to fetch subjects');

      const assignmentsData = await assignmentsRes.json();
      const subjectsData = await subjectsRes.json();

      setAssignments(assignmentsData.assignments || []);
      setSubjects(subjectsData.subjects || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [school?.id, session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter assignments based on search and filters
  useEffect(() => {
    let filtered = assignments;

    if (searchTerm) {
      filtered = filtered.filter(assignment =>
        assignment.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(assignment => assignment.subjectId === selectedSubject);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(assignment => assignment.type === selectedType);
    }

    setFilteredAssignments(filtered);
  }, [assignments, searchTerm, selectedSubject, selectedType]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const total = assignments.length;
    const overdue = assignments.filter(a => new Date(a.dueDate) < now).length;
    const dueToday = assignments.filter(a => {
      const due = new Date(a.dueDate);
      return due.toDateString() === now.toDateString();
    }).length;
    const totalSubmissions = assignments.reduce((sum, a) => sum + (a._count?.submittedAssignments || 0), 0);

    return { total, overdue, dueToday, totalSubmissions };
  }, [assignments]);

  // Handle assignment operations
  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setIsDialogOpen(true);
  };

  const handleDelete = async (assignment) => {
    if (!confirm(`Are you sure you want to delete "${assignment.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/schools/${school.id}/academics/assignments/${assignment.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete assignment');
      }

      toast.success('Assignment deleted successfully');
      fetchData();
    } catch (err) {
      console.error('Error deleting assignment:', err);
      toast.error('Failed to delete assignment', { description: err.message });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAssignment(null);
  };

  const handleAssignmentSaved = () => {
    handleDialogClose();
    fetchData();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <RequireRole allowedRoles={['TEACHER', 'SCHOOL_ADMIN']}>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assignments</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create, manage, and track student assignments with auto-grading capabilities
            </p>
          </div>
          
          <Button 
            onClick={() => setIsDialogOpen(true)}
            size="lg"
            className="mt-4 sm:mt-0"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Assignment
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Assignments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.overdue}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.dueToday}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Due Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalSubmissions}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search assignments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="OBJECTIVE">
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Auto-graded
                    </div>
                  </SelectItem>
                  <SelectItem value="SUBJECTIVE">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Manual
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-r-none"
                >
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  List
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Grid/List */}
        <AssignmentsGrid
          assignments={filteredAssignments}
          viewMode={viewMode}
          onEdit={handleEdit}
          onDelete={handleDelete}
          schoolData={school}
        />

        {/* Assignment Creation/Edit Dialog */}
        <ModernAssignmentForm
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          onSave={handleAssignmentSaved}
          editingAssignment={editingAssignment}
          schoolId={school?.id}
          subjects={subjects}
        />
      </div>
    </RequireRole>
  );
}