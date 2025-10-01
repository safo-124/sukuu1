// app/[subdomain]/(school_app)/academics/timetable/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import React from 'react'; // Import React for React.Fragment
import RequireRole from '@/components/auth/RequireRole';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"; // Still useful for dialogs/skeletons
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, CalendarDays, PlusCircle, Loader2, AlertTriangle, Home, BookOpen, UserCog, Layers, Filter, Maximize, Edit3, Trash2, XCircle, Grid, List, Lightbulb, Rocket } from 'lucide-react'; // Added icons

// Visual defaults for the timetable grid (row height will be dynamic below)
// const GRID_ROW_HEIGHT = 48;

// Helper function to convert day number to name (JS Date.getDay() standard: Sunday=0, Monday=1, ..., Saturday=6)
const getDayName = (dayNum) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum];
};

// Helper to convert HH:MM to minutes from midnight (NEEDED ON FRONTEND)
const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to convert minutes past midnight to HH:MM string (NEEDED ON FRONTEND)
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Initial form data for Timetable Entry
const initialTimetableFormData = {
  id: null,
  sectionId: '',
  subjectId: '',
  staffId: '',
  dayOfWeek: '', // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  startTime: '',
  endTime: '',
  roomId: '',
};

// Initial form data for Timetable Suggestion
const initialSuggestionFormData = {
  sectionId: '',
  subjectId: '',
  staffId: '',
  dayOfWeek: '',
  durationMinutes: '60', // Default duration
  preferredRoomId: '',
};


// Reusable FormFields Component for Timetable Entry
const TimetableFormFields = ({ formData, onFormChange, onSelectChange, sectionsList, subjectsList, teachersList, roomsList, isLoadingDeps }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const daysOfWeekOptions = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '0', label: 'Sunday' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div>
        <Label htmlFor="sectionId" className={labelTextClasses}>Section <span className="text-red-500">*</span></Label>
        <Select name="sectionId" value={formData.sectionId || ''} onValueChange={(value) => onSelectChange('sectionId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select section" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isLoadingDeps && (!Array.isArray(sectionsList) || sectionsList.length === 0) && <SelectItem value="no-sections" disabled>No sections available</SelectItem>}
            {Array.isArray(sectionsList) && sectionsList.map(section => <SelectItem key={section.id} value={section.id}>{`${section.class?.name || 'N/A'} - ${section.name}`}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="subjectId" className={labelTextClasses}>Subject <span className="text-red-500">*</span></Label>
        <Select name="subjectId" value={formData.subjectId || ''} onValueChange={(value) => onSelectChange('subjectId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select subject" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isLoadingDeps && (!Array.isArray(subjectsList) || subjectsList.length === 0) && <SelectItem value="no-subjects" disabled>No subjects available</SelectItem>}
            {Array.isArray(subjectsList) && subjectsList.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="staffId" className={labelTextClasses}>Teacher <span className="text-red-500">*</span></Label>
        <Select name="staffId" value={formData.staffId || ''} onValueChange={(value) => onSelectChange('staffId', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select teacher" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isLoadingDeps && (!Array.isArray(teachersList) || teachersList.length === 0) && <SelectItem value="no-teachers" disabled>No teachers available</SelectItem>}
            {Array.isArray(teachersList) && teachersList.map(teacher => (
              <SelectItem key={teacher.id} value={teacher.id}>{`${teacher.user?.firstName} ${teacher.user?.lastName}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="dayOfWeek" className={labelTextClasses}>Day of Week <span className="text-red-500">*</span></Label>
        <Select name="dayOfWeek" value={formData.dayOfWeek?.toString() || ''} onValueChange={(value) => onSelectChange('dayOfWeek', value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select day" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {daysOfWeekOptions.map(day => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="startTime" className={labelTextClasses}>Start Time <span className="text-red-500">*</span></Label>
        <Input id="startTime" name="startTime" type="time" value={formData.startTime || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="endTime" className={labelTextClasses}>End Time <span className="text-red-500">*</span></Label>
        <Input id="endTime" name="endTime" type="time" value={formData.endTime || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="roomId" className={labelTextClasses}>Room (Optional)</Label>
        <Select name="roomId" value={formData.roomId || 'none'} onValueChange={(value) => onSelectChange('roomId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select room" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">No specific room</SelectItem>
            {!isLoadingDeps && (!Array.isArray(roomsList) || roomsList.length === 0) && <SelectItem value="no-rooms" disabled>No rooms available</SelectItem>}
            {Array.isArray(roomsList) && roomsList.map(room => <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};


function AdminTimetablePage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'SCHOOL_ADMIN';
  const isTeacher = session?.user?.role === 'TEACHER';
  const teacherStaffId = session?.user?.staffProfileId || '';

  const [timetableEntries, setTimetableEntries] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true);
  const [error, setError] = useState('');

  // Filters for the timetable display
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterStaffId, setFilterStaffId] = useState('');
  const [filterDayOfWeek, setFilterDayOfWeek] = useState(''); // String '0' to '6'
  const [filterRoomId, setFilterRoomId] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false); // New state for conflict dialog
  const [conflictMessage, setConflictMessage] = useState(''); // Conflict message from API
  const [pendingSubmitData, setPendingSubmitData] = useState(null); // Data to submit after conflict confirmation

  const [formData, setFormData] = useState({ ...initialTimetableFormData });
  const [editingEntry, setEditingEntry] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [isGridView, setIsGridView] = useState(true); // New state to toggle view
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenOptionsOpen, setIsGenOptionsOpen] = useState(false);
  const [genOptions, setGenOptions] = useState({ includePinned: true, honorUnavailability: true, preferredStartTime: '', preferredEndTime: '', targetSectionIds: [] });

  // Display controls
  const [showWeekend, setShowWeekend] = useState(false);
  const [rowDensity, setRowDensity] = useState('cozy'); // 'compact' | 'cozy' | 'comfortable'
  const rowHeight = useMemo(() => (rowDensity === 'compact' ? 32 : rowDensity === 'comfortable' ? 56 : 40), [rowDensity]);
  const [fitHeight, setFitHeight] = useState(true);
  const [colorBy, setColorBy] = useState('subject'); // 'subject' | 'department'

  // Requirements management state
  const [isReqDialogOpen, setIsReqDialogOpen] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [reqFilterSectionId, setReqFilterSectionId] = useState('');
  const initialReqForm = { id: null, sectionId: '', subjectId: '', periodsPerWeek: '1', durationMinutes: '60', minGapMins: '0', allowDouble: false, preferredRoomType: '' };
  const [reqFormData, setReqFormData] = useState({ ...initialReqForm });
  const [editingReq, setEditingReq] = useState(null);
  const [isReqSubmitting, setIsReqSubmitting] = useState(false);
  const [reqError, setReqError] = useState('');

  // State for Timetable Suggestion
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [suggestionFormData, setSuggestionFormData] = useState({ ...initialSuggestionFormData });
  const [suggestedSlot, setSuggestedSlot] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');

  // Compute allowed teachers for the selected subject (and section's level if provided)
  const allowedTeachersForSuggestion = useMemo(() => {
    if (!suggestionFormData.subjectId) return teachers;
    const subject = subjects.find(s => s.id === suggestionFormData.subjectId);
    if (!subject) return teachers;
    const levelId = (() => {
      if (!suggestionFormData.sectionId) return null;
      const sec = sections.find(se => se.id === suggestionFormData.sectionId);
      return sec?.class?.schoolLevelId || null;
    })();
    const staffIds = (subject.staffSubjectLevels || [])
      .filter(link => (levelId ? link?.schoolLevel?.id === levelId : true))
      .map(link => link?.staff?.id)
      .filter(Boolean);
    const staffIdSet = new Set(staffIds);
    const filtered = teachers.filter(t => staffIdSet.has(t.id));
    return filtered.length ? filtered : teachers;
  }, [suggestionFormData.subjectId, suggestionFormData.sectionId, subjects, sections, teachers]);

  // Auto-select the only available teacher when there is exactly one
  useEffect(() => {
    if (allowedTeachersForSuggestion.length === 1) {
      const only = allowedTeachersForSuggestion[0];
      if (!suggestionFormData.staffId || suggestionFormData.staffId !== only.id) {
        setSuggestionFormData(prev => ({ ...prev, staffId: only.id }));
      }
    } else if (
      suggestionFormData.staffId &&
      !allowedTeachersForSuggestion.some(t => t.id === suggestionFormData.staffId)
    ) {
      // Clear selection if it's no longer valid for the chosen subject/section
      setSuggestionFormData(prev => ({ ...prev, staffId: '' }));
    }
  }, [allowedTeachersForSuggestion, suggestionFormData.staffId]);

  // Overlay state for grid (pinned/unavailability)
  const [overlayPinnedSet, setOverlayPinnedSet] = useState(new Set()); // keys of form `${day}-${time}`
  const [overlayStaffUnavSet, setOverlayStaffUnavSet] = useState(new Set());
  const [overlayRoomUnavSet, setOverlayRoomUnavSet] = useState(new Set());
  const [isOverlayLoading, setIsOverlayLoading] = useState(false);
  const [overlayShowPinned, setOverlayShowPinned] = useState(true);
  const [overlayShowStaff, setOverlayShowStaff] = useState(true);
  const [overlayShowRoom, setOverlayShowRoom] = useState(true);

  // Staff Unavailability management state
  const [isStaffUnavDialogOpen, setIsStaffUnavDialogOpen] = useState(false);
  const [staffUnavailability, setStaffUnavailability] = useState([]);
  const [staffUnavFilterStaffId, setStaffUnavFilterStaffId] = useState('');
  const initialStaffUnavForm = { id: null, staffId: '', dayOfWeek: '', startTime: '', endTime: '', note: '' };
  const [staffUnavFormData, setStaffUnavFormData] = useState({ ...initialStaffUnavForm });
  const [editingStaffUnav, setEditingStaffUnav] = useState(null);
  const [isStaffUnavSubmitting, setIsStaffUnavSubmitting] = useState(false);
  const [staffUnavError, setStaffUnavError] = useState('');

  // Room Unavailability management state
  const [isRoomUnavDialogOpen, setIsRoomUnavDialogOpen] = useState(false);
  const [roomUnavailability, setRoomUnavailability] = useState([]);
  const [roomUnavFilterRoomId, setRoomUnavFilterRoomId] = useState('');
  const initialRoomUnavForm = { id: null, roomId: '', dayOfWeek: '', startTime: '', endTime: '', note: '' };
  const [roomUnavFormData, setRoomUnavFormData] = useState({ ...initialRoomUnavForm });
  const [editingRoomUnav, setEditingRoomUnav] = useState(null);
  const [isRoomUnavSubmitting, setIsRoomUnavSubmitting] = useState(false);
  const [roomUnavError, setRoomUnavError] = useState('');

  // Pinned Slots management state
  const [isPinnedDialogOpen, setIsPinnedDialogOpen] = useState(false);
  const [pinnedSlots, setPinnedSlots] = useState([]);
  const [pinnedFilterSectionId, setPinnedFilterSectionId] = useState('');
  const [pinnedFilterStaffId, setPinnedFilterStaffId] = useState('');
  const initialPinnedForm = { id: null, sectionId: '', subjectId: '', staffId: '', roomId: '', dayOfWeek: '', startTime: '', endTime: '', note: '' };
  const [pinnedFormData, setPinnedFormData] = useState({ ...initialPinnedForm });
  const [editingPinned, setEditingPinned] = useState(null);
  const [isPinnedSubmitting, setIsPinnedSubmitting] = useState(false);
  const [pinnedError, setPinnedError] = useState('');


  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const filterInputClasses = 'bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500';


  // --- Helper function to convert day number to name (JS Date.getDay() standard: Sunday=0, Monday=1, ..., Saturday=6) ---
  const getDayNameDisplay = useCallback((dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  }, []);

  const getDayOfWeekOptions = useMemo(() => [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '0', label: 'Sunday' },
  ], []);

  const visibleDays = useMemo(() => {
    const base = getDayOfWeekOptions;
    return showWeekend ? base : base.filter(d => ['1','2','3','4','5'].includes(d.value));
  }, [getDayOfWeekOptions, showWeekend]);

  // Timetable start/end times from schoolData, with fallbacks
  const schoolTimetableStartTime = schoolData?.timetableStartTime || "08:00";
  const schoolTimetableEndTime = schoolData?.timetableEndTime || "17:00";

  // Time slots for the grid (dynamically generated based on school settings and 30-min intervals)
  const timeSlots = useMemo(() => {
    const slots = [];
    const startHour = parseInt(schoolTimetableStartTime.split(':')[0], 10);
    const startMinute = parseInt(schoolTimetableStartTime.split(':')[1], 10);
    const endHour = parseInt(schoolTimetableEndTime.split(':')[0], 10);
    const endMinute = parseInt(schoolTimetableEndTime.split(':')[1], 10);

    let currentTime = startHour * 60 + startMinute; // Minutes from midnight
    const endTotalMinutes = endHour * 60 + endMinute;

    while (currentTime < endTotalMinutes) {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      currentTime += 30; // 30-minute interval
    }
    return slots;
  }, [schoolTimetableStartTime, schoolTimetableEndTime]);

  // Helper to convert HH:MM to minutes from midnight (DEFINED GLOBALLY IN THIS COMPONENT)
  const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper to convert minutes past midnight to HH:MM string (DEFINED GLOBALLY IN THIS COMPONENT)
  const minutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Helper to calculate duration in 30-minute blocks for positioning
  const calculateSpanAndOffset = useCallback((startTime, endTime) => {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const durationMins = endMins - startMins;

    const gridStartTimeMins = timeToMinutes(timeSlots[0] || '00:00'); // Time of the very first slot displayed
    const offsetMins = startMins - gridStartTimeMins;

    const topOffsetPx = (offsetMins / 30) * rowHeight; // dynamic row height
    const heightPx = (durationMins / 30) * rowHeight; // Height of the entry card

    return { topOffsetPx, heightPx };
  }, [timeSlots, rowHeight]);


  // --- Fetching Data ---
  const fetchTimetableEntries = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const queryParams = new URLSearchParams();
      if (filterSectionId) queryParams.append('sectionId', filterSectionId);
      if (filterStaffId) queryParams.append('staffId', filterStaffId);
      if (filterDayOfWeek) queryParams.append('dayOfWeek', filterDayOfWeek);
      if (filterRoomId) queryParams.append('roomId', filterRoomId);

      const response = await fetch(`/api/schools/${schoolData.id}/academics/timetable?${queryParams.toString()}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch timetable entries.'); }
      const data = await response.json();
      setTimetableEntries(data.timetableEntries || []);
    } catch (err) { toast.error("Error fetching timetable", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id, filterSectionId, filterStaffId, filterDayOfWeek, filterRoomId]);

  // If user is a teacher, force the staff filter to their own staffProfileId
  useEffect(() => {
    if (isTeacher && teacherStaffId && filterStaffId !== teacherStaffId) {
      setFilterStaffId(teacherStaffId);
    }
  }, [isTeacher, teacherStaffId, filterStaffId]);


  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;

    try {
      const [sectionsRes, subjectsRes, teachersRes, roomsRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/academics/sections`),
        fetch(`/api/schools/${schoolData.id}/academics/subjects`),
        fetch(`/api/schools/${schoolData.id}/people/teachers`),
        fetch(`/api/schools/${schoolData.id}/resources/rooms`),
      ]);

      // Process Sections
      if (sectionsRes.status === 'fulfilled' && sectionsRes.value.ok) {
        const sectionsData = await sectionsRes.value.json();
        setSections(Array.isArray(sectionsData.sections) ? sectionsData.sections : []);
      } else {
        const errorData = sectionsRes.status === 'rejected' ? sectionsRes.reason : await sectionsRes.value.json().catch(() => ({}));
        console.error("Sections fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch sections.');
      }

      // Process Subjects
      if (subjectsRes.status === 'fulfilled' && subjectsRes.value.ok) {
        const subjectsData = await subjectsRes.value.json();
        setSubjects(Array.isArray(subjectsData.subjects) ? subjectsData.subjects : []);
      } else {
        const errorData = subjectsRes.value?.json ? await subjectsRes.value.json().catch(() => ({})) : (subjectsRes.reason || {});
        console.error("Subjects fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch subjects.');
      }

      // Process Teachers
      if (teachersRes.status === 'fulfilled' && teachersRes.value.ok) {
        const teachersData = await teachersRes.value.json();
        setTeachers(Array.isArray(teachersData.teachers) ? teachersData.teachers : []);
      } else {
        const errorData = teachersRes.value?.json ? await teachersRes.value.json().catch(() => ({})) : (teachersRes.reason || {});
        console.error("Teachers fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch teachers.');
      }

      // Process Rooms
      if (roomsRes.status === 'fulfilled' && roomsRes.value.ok) {
        const roomsData = await roomsRes.value.json();
        setRooms(Array.isArray(roomsData.rooms) ? roomsData.rooms : []);
      } else {
        const errorData = roomsRes.value?.json ? await roomsRes.value.json().catch(() => ({})) : (roomsRes.reason || {});
        console.error("Rooms fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch rooms.');
      }

      if (overallError) {
        throw overallError;
      }

    } catch (err) {
      toast.error("Error fetching form dependencies", { description: err.message });
      setError(err.message);
      console.error("Dependency fetch error caught:", err);
    } finally {
      setIsLoadingDeps(false);
    }
  }, [schoolData?.id]);


  useEffect(() => {
    // For teachers, wait until their staff filter is applied before fetching
    const canFetch = schoolData?.id && session && (!isTeacher || !!filterStaffId);
    if (canFetch) {
      fetchTimetableEntries();
      fetchDropdownDependencies();
    }
  }, [schoolData, session, isTeacher, filterStaffId, fetchTimetableEntries, fetchDropdownDependencies]);


  // --- Timetable Submission Logic ---
  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const openAddDialog = () => {
    setEditingEntry(null);
    setFormData({ ...initialTimetableFormData });
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (entry) => {
    setEditingEntry(entry);
    setFormData({
      id: entry.id,
      sectionId: entry.sectionId,
      subjectId: entry.subjectId,
      staffId: entry.staffId,
      dayOfWeek: entry.dayOfWeek?.toString() || '',
      startTime: entry.startTime,
      endTime: entry.endTime,
      roomId: entry.roomId || '',
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const executeSubmit = async (payload, method, url, actionText, isOverride = false) => {
    setIsSubmitting(true);
    setFormError('');
    setConflictDialogOpen(false); // Close conflict dialog if open

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, overrideConflict: isOverride }), // Add override flag
      });
      const result = await response.json();

      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} timetable entry.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');

        // Check for specific conflict error (status 409)
        if (response.status === 409 && (err.includes('Timetable conflict detected') || err.includes('This entry would exceed the teacher'))) {
          setConflictMessage(err);
          setPendingSubmitData({ payload, method, url, actionText }); // Store data for re-submission
          setIsDialogOpen(false); // Close the entry form dialog
          setConflictDialogOpen(true); // Open the conflict confirmation dialog
          return; // Stop here, wait for user confirmation
        }

        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err });
        setFormError(err);
      } else {
        toast.success(`Timetable entry ${actionText}d successfully!`);
        setIsDialogOpen(false);
        setPendingSubmitData(null); // Clear pending data
        fetchTimetableEntries(); // Re-fetch entries
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
      setFormError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      sectionId: formData.sectionId,
      subjectId: formData.subjectId,
      staffId: formData.staffId,
      dayOfWeek: parseInt(formData.dayOfWeek, 10),
      startTime: formData.startTime,
      endTime: formData.endTime,
      roomId: formData.roomId || null,
    };
    const url = editingEntry
      ? `/api/schools/${schoolData.id}/academics/timetable/${editingEntry.id}`
      : `/api/schools/${schoolData.id}/academics/timetable`;
    const method = editingEntry ? 'PUT' : 'POST';
    const actionText = editingEntry ? 'update' : 'create';

    executeSubmit(payload, method, url, actionText);
  };

  const handleConflictConfirm = () => {
    if (pendingSubmitData) {
      executeSubmit(
        pendingSubmitData.payload,
        pendingSubmitData.method,
        pendingSubmitData.url,
        pendingSubmitData.actionText,
        true // Send override flag
      );
    }
  };

  // --- Automated Generation ---
  const runAutoGeneration = async () => {
    if (!schoolData?.id) return;
    setIsGenerating(true);
    const toastId = `generate-timetable-${schoolData.id}`;
    toast.loading('Generating timetable...', { id: toastId });
    try {
      const payload = {
        includePinned: !!genOptions.includePinned,
        honorUnavailability: !!genOptions.honorUnavailability,
        ...(genOptions.preferredStartTime ? { preferredStartTime: genOptions.preferredStartTime } : {}),
        ...(genOptions.preferredEndTime ? { preferredEndTime: genOptions.preferredEndTime } : {}),
        ...(Array.isArray(genOptions.targetSectionIds) && genOptions.targetSectionIds.length ? { targetSectionIds: genOptions.targetSectionIds } : {}),
      };
      const res = await fetch(`/api/schools/${schoolData.id}/academics/timetable/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || 'Failed to generate timetable.';
        toast.error('Generation failed', { description: msg, id: toastId });
      } else {
        toast.success(`Generated ${data.placed || 0} placements`, { id: toastId, description: 'Timetable updated.' });
        if ((data.placed || 0) === 0) {
          // If no placements were generated, hint about requirements/inference
          try {
            const reqRes = await fetch(`/api/schools/${schoolData.id}/academics/requirements`);
            const reqData = await reqRes.json().catch(() => ({}));
            const reqCount = Array.isArray(reqData.requirements) ? reqData.requirements.length : 0;
            if (reqCount === 0) {
              toast.message('No subject requirements found', {
                description: 'Add requirements via "Manage Subject Requirements" or link subjects to classes so the generator can auto-infer.',
              });
            }
          } catch {}
        }
        // Refresh entries
        await fetchTimetableEntries();
      }
    } catch (e) {
      toast.error('Unexpected error during generation', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Requirements CRUD ---
  const fetchRequirements = useCallback(async (sectionId) => {
    if (!schoolData?.id) return;
    try {
      const q = new URLSearchParams();
      if (sectionId) q.set('sectionId', sectionId);
      const res = await fetch(`/api/schools/${schoolData.id}/academics/requirements?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch requirements');
      setRequirements(Array.isArray(data.requirements) ? data.requirements : []);
    } catch (e) {
      toast.error('Failed to fetch requirements', { description: e.message });
      setRequirements([]);
    }
  }, [schoolData?.id]);

  const openAddReqDialog = () => {
    setEditingReq(null);
    setReqFormData({ ...initialReqForm });
    setReqError('');
    setIsReqDialogOpen(true);
    fetchRequirements(reqFilterSectionId);
  };
  const openEditReqDialog = (req) => {
    setEditingReq(req);
    setReqFormData({
      id: req.id,
      sectionId: req.sectionId,
      subjectId: req.subjectId,
      periodsPerWeek: String(req.periodsPerWeek || '1'),
      durationMinutes: String(req.durationMinutes || '60'),
      minGapMins: String(req.minGapMins || '0'),
      allowDouble: !!req.allowDouble,
      preferredRoomType: req.preferredRoomType || '',
    });
    setReqError('');
    setIsReqDialogOpen(true);
  };
  const handleReqFormChange = (e) => setReqFormData(prev => ({ ...prev, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const handleReqSelectChange = (name, value) => setReqFormData(prev => ({ ...prev, [name]: value }));

  const handleReqSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsReqSubmitting(true);
    setReqError('');
    try {
      const payload = {
        sectionId: reqFormData.sectionId,
        subjectId: reqFormData.subjectId,
        periodsPerWeek: parseInt(reqFormData.periodsPerWeek, 10),
        durationMinutes: parseInt(reqFormData.durationMinutes, 10),
        minGapMins: parseInt(reqFormData.minGapMins, 10),
        allowDouble: !!reqFormData.allowDouble,
        preferredRoomType: reqFormData.preferredRoomType || null,
      };
      const url = editingReq ? `/api/schools/${schoolData.id}/academics/requirements/${editingReq.id}` : `/api/schools/${schoolData.id}/academics/requirements`;
      const method = editingReq ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'Failed to save requirement';
        setReqError(msg);
        toast.error('Save failed', { description: msg });
      } else {
        toast.success(editingReq ? 'Requirement updated' : 'Requirement created');
        await fetchRequirements(reqFilterSectionId);
        setReqFormData({ ...initialReqForm });
        setEditingReq(null);
      }
    } catch (e) {
      setReqError('Unexpected error');
    } finally {
      setIsReqSubmitting(false);
    }
  };

  const handleReqDelete = async (id) => {
    if (!schoolData?.id) return;
    if (!window.confirm('Delete this requirement?')) return;
    const toastId = `delete-req-${id}`;
    toast.loading('Deleting...', { id: toastId });
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/academics/requirements/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success('Requirement deleted', { id: toastId });
      await fetchRequirements(reqFilterSectionId);
    } catch (e) {
      toast.error('Delete failed', { description: e.message, id: toastId });
    }
  };

  // --- Overlays: fetch + compute sets ---
  const computeOverlaySets = useCallback((opts) => {
    const { pinned = [], staffUnav = [], roomUnav = [], restrictDay = '' } = opts || {};
    const pinnedSet = new Set();
    const staffSet = new Set();
    const roomSet = new Set();

    // helper to fill keys for a range
    const fillKeysForRange = (targetSet, dayOfWeek, startTime, endTime) => {
      const startM = timeToMinutes(startTime);
      const endM = timeToMinutes(endTime);
      getDayOfWeekOptions.forEach(d => {
        if (d.value !== String(dayOfWeek)) return;
        timeSlots.forEach(t => {
          const tM = timeToMinutes(t);
          if (tM >= startM && tM < endM) {
            if (!restrictDay || restrictDay === d.value) {
              targetSet.add(`${d.value}-${t}`);
            }
          }
        });
      });
    };

    pinned.forEach(p => fillKeysForRange(pinnedSet, p.dayOfWeek, p.startTime, p.endTime));
    staffUnav.forEach(u => fillKeysForRange(staffSet, u.dayOfWeek, u.startTime, u.endTime));
    roomUnav.forEach(u => fillKeysForRange(roomSet, u.dayOfWeek, u.startTime, u.endTime));
    return { pinnedSet, staffSet, roomSet };
  }, [getDayOfWeekOptions, timeSlots]);

  const fetchGridOverlays = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsOverlayLoading(true);
    try {
      // Fetch in parallel when relevant
      const requests = [];
      // Pinned: if section or staff filter applied, fetch; otherwise light fetch (skip to avoid heavy list)
  if ((filterSectionId || filterStaffId) && overlayShowPinned) {
        const qp = new URLSearchParams();
        if (filterSectionId) qp.set('sectionId', filterSectionId);
        if (filterStaffId) qp.set('staffId', filterStaffId);
        requests.push(fetch(`/api/schools/${schoolData.id}/academics/pinned?${qp.toString()}`).then(r => r.json().then(j => ({ ok: r.ok, data: j, kind: 'pinned' }))));
      }
      // Staff unavailability: only if filtering by staff
  if (filterStaffId && overlayShowStaff) {
        const qp = new URLSearchParams({ staffId: filterStaffId });
        requests.push(fetch(`/api/schools/${schoolData.id}/academics/unavailability/staff?${qp.toString()}`).then(r => r.json().then(j => ({ ok: r.ok, data: j, kind: 'staff' }))));
      }
      // Room unavailability: only if filtering by room
  if (filterRoomId && overlayShowRoom) {
        const qp = new URLSearchParams({ roomId: filterRoomId });
        requests.push(fetch(`/api/schools/${schoolData.id}/academics/unavailability/rooms?${qp.toString()}`).then(r => r.json().then(j => ({ ok: r.ok, data: j, kind: 'room' }))));
      }

      const results = await Promise.allSettled(requests);
      let pinned = [];
      let staff = [];
      let room = [];
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value.ok !== false) {
          if (res.value.kind === 'pinned') pinned = Array.isArray(res.value.data.pinned) ? res.value.data.pinned : [];
          if (res.value.kind === 'staff') staff = Array.isArray(res.value.data.unavailability) ? res.value.data.unavailability : [];
          if (res.value.kind === 'room') room = Array.isArray(res.value.data.unavailability) ? res.value.data.unavailability : [];
        }
      });
      const restrictDay = filterDayOfWeek || '';
      const { pinnedSet, staffSet, roomSet } = computeOverlaySets({ pinned, staffUnav: staff, roomUnav: room, restrictDay });
      setOverlayPinnedSet(pinnedSet);
      setOverlayStaffUnavSet(staffSet);
      setOverlayRoomUnavSet(roomSet);
    } catch (e) {
      // Fail silently; overlays are optional
    } finally {
      setIsOverlayLoading(false);
    }
  }, [schoolData?.id, filterSectionId, filterStaffId, filterRoomId, filterDayOfWeek, overlayShowPinned, overlayShowStaff, overlayShowRoom, computeOverlaySets]);

  useEffect(() => {
    fetchGridOverlays();
  }, [fetchGridOverlays]);

  // --- Staff Unavailability CRUD ---
  const fetchStaffUnavailability = useCallback(async (staffId) => {
    if (!schoolData?.id) return;
    try {
      const q = new URLSearchParams();
      if (staffId) q.set('staffId', staffId);
      const res = await fetch(`/api/schools/${schoolData.id}/academics/unavailability/staff?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch staff unavailability');
      setStaffUnavailability(Array.isArray(data.unavailability) ? data.unavailability : []);
    } catch (e) {
      toast.error('Failed to fetch staff unavailability', { description: e.message });
      setStaffUnavailability([]);
    }
  }, [schoolData?.id]);

  const openAddStaffUnavDialog = () => {
    setEditingStaffUnav(null);
    setStaffUnavFormData({ ...initialStaffUnavForm });
    setStaffUnavError('');
    setIsStaffUnavDialogOpen(true);
    fetchStaffUnavailability(staffUnavFilterStaffId);
  };
  const openEditStaffUnavDialog = (item) => {
    setEditingStaffUnav(item);
    setStaffUnavFormData({ id: item.id, staffId: item.staffId, dayOfWeek: String(item.dayOfWeek), startTime: item.startTime, endTime: item.endTime, note: item.note || '' });
    setStaffUnavError('');
    setIsStaffUnavDialogOpen(true);
  };
  const handleStaffUnavFormChange = (e) => setStaffUnavFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleStaffUnavSelectChange = (name, value) => setStaffUnavFormData(prev => ({ ...prev, [name]: value }));
  const handleStaffUnavSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsStaffUnavSubmitting(true);
    setStaffUnavError('');
    try {
      const payload = { staffId: staffUnavFormData.staffId, dayOfWeek: parseInt(staffUnavFormData.dayOfWeek, 10), startTime: staffUnavFormData.startTime, endTime: staffUnavFormData.endTime, note: staffUnavFormData.note || null };
      const url = editingStaffUnav ? `/api/schools/${schoolData.id}/academics/unavailability/staff/${editingStaffUnav.id}` : `/api/schools/${schoolData.id}/academics/unavailability/staff`;
      const method = editingStaffUnav ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save unavailability');
      toast.success(editingStaffUnav ? 'Unavailability updated' : 'Unavailability created');
      await fetchStaffUnavailability(staffUnavFilterStaffId);
      setStaffUnavFormData({ ...initialStaffUnavForm });
      setEditingStaffUnav(null);
    } catch (e) {
      setStaffUnavError(e.message);
    } finally {
      setIsStaffUnavSubmitting(false);
    }
  };
  const handleStaffUnavDelete = async (id) => {
    if (!schoolData?.id) return;
    if (!window.confirm('Delete this unavailability?')) return;
    const toastId = `delete-staff-unav-${id}`;
    toast.loading('Deleting...', { id: toastId });
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/academics/unavailability/staff/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success('Unavailability deleted', { id: toastId });
      await fetchStaffUnavailability(staffUnavFilterStaffId);
    } catch (e) {
      toast.error('Delete failed', { description: e.message, id: toastId });
    }
  };

  // --- Room Unavailability CRUD ---
  const fetchRoomUnavailability = useCallback(async (roomId) => {
    if (!schoolData?.id) return;
    try {
      const q = new URLSearchParams();
      if (roomId) q.set('roomId', roomId);
      const res = await fetch(`/api/schools/${schoolData.id}/academics/unavailability/rooms?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch room unavailability');
      setRoomUnavailability(Array.isArray(data.unavailability) ? data.unavailability : []);
    } catch (e) {
      toast.error('Failed to fetch room unavailability', { description: e.message });
      setRoomUnavailability([]);
    }
  }, [schoolData?.id]);

  const openAddRoomUnavDialog = () => {
    setEditingRoomUnav(null);
    setRoomUnavFormData({ ...initialRoomUnavForm });
    setRoomUnavError('');
    setIsRoomUnavDialogOpen(true);
    fetchRoomUnavailability(roomUnavFilterRoomId);
  };
  const openEditRoomUnavDialog = (item) => {
    setEditingRoomUnav(item);
    setRoomUnavFormData({ id: item.id, roomId: item.roomId, dayOfWeek: String(item.dayOfWeek), startTime: item.startTime, endTime: item.endTime, note: item.note || '' });
    setRoomUnavError('');
    setIsRoomUnavDialogOpen(true);
  };
  const handleRoomUnavFormChange = (e) => setRoomUnavFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleRoomUnavSelectChange = (name, value) => setRoomUnavFormData(prev => ({ ...prev, [name]: value }));
  const handleRoomUnavSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsRoomUnavSubmitting(true);
    setRoomUnavError('');
    try {
      const payload = { roomId: roomUnavFormData.roomId, dayOfWeek: parseInt(roomUnavFormData.dayOfWeek, 10), startTime: roomUnavFormData.startTime, endTime: roomUnavFormData.endTime, note: roomUnavFormData.note || null };
      const url = editingRoomUnav ? `/api/schools/${schoolData.id}/academics/unavailability/rooms/${editingRoomUnav.id}` : `/api/schools/${schoolData.id}/academics/unavailability/rooms`;
      const method = editingRoomUnav ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save unavailability');
      toast.success(editingRoomUnav ? 'Unavailability updated' : 'Unavailability created');
      await fetchRoomUnavailability(roomUnavFilterRoomId);
      setRoomUnavFormData({ ...initialRoomUnavForm });
      setEditingRoomUnav(null);
    } catch (e) {
      setRoomUnavError(e.message);
    } finally {
      setIsRoomUnavSubmitting(false);
    }
  };
  const handleRoomUnavDelete = async (id) => {
    if (!schoolData?.id) return;
    if (!window.confirm('Delete this unavailability?')) return;
    const toastId = `delete-room-unav-${id}`;
    toast.loading('Deleting...', { id: toastId });
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/academics/unavailability/rooms/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success('Unavailability deleted', { id: toastId });
      await fetchRoomUnavailability(roomUnavFilterRoomId);
    } catch (e) {
      toast.error('Delete failed', { description: e.message, id: toastId });
    }
  };

  // --- Pinned Slots CRUD ---
  const fetchPinnedSlots = useCallback(async (sectionId, staffId) => {
    if (!schoolData?.id) return;
    try {
      const q = new URLSearchParams();
      if (sectionId) q.set('sectionId', sectionId);
      if (staffId) q.set('staffId', staffId);
      const res = await fetch(`/api/schools/${schoolData.id}/academics/pinned?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch pinned slots');
      setPinnedSlots(Array.isArray(data.pinned) ? data.pinned : []);
    } catch (e) {
      toast.error('Failed to fetch pinned slots', { description: e.message });
      setPinnedSlots([]);
    }
  }, [schoolData?.id]);

  const openAddPinnedDialog = () => {
    setEditingPinned(null);
    setPinnedFormData({ ...initialPinnedForm });
    setPinnedError('');
    setIsPinnedDialogOpen(true);
    fetchPinnedSlots(pinnedFilterSectionId, pinnedFilterStaffId);
  };
  const openEditPinnedDialog = (item) => {
    setEditingPinned(item);
    setPinnedFormData({ id: item.id, sectionId: item.sectionId, subjectId: item.subjectId, staffId: item.staffId || '', roomId: item.roomId || '', dayOfWeek: String(item.dayOfWeek), startTime: item.startTime, endTime: item.endTime, note: item.note || '' });
    setPinnedError('');
    setIsPinnedDialogOpen(true);
  };
  const handlePinnedFormChange = (e) => setPinnedFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handlePinnedSelectChange = (name, value) => setPinnedFormData(prev => ({ ...prev, [name]: value }));
  const handlePinnedSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsPinnedSubmitting(true);
    setPinnedError('');
    try {
      const payload = { sectionId: pinnedFormData.sectionId, subjectId: pinnedFormData.subjectId, staffId: pinnedFormData.staffId || null, roomId: pinnedFormData.roomId || null, dayOfWeek: parseInt(pinnedFormData.dayOfWeek, 10), startTime: pinnedFormData.startTime, endTime: pinnedFormData.endTime, note: pinnedFormData.note || null };
      const url = editingPinned ? `/api/schools/${schoolData.id}/academics/pinned/${editingPinned.id}` : `/api/schools/${schoolData.id}/academics/pinned`;
      const method = editingPinned ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save pinned slot');
      toast.success(editingPinned ? 'Pinned slot updated' : 'Pinned slot created');
      await fetchPinnedSlots(pinnedFilterSectionId, pinnedFilterStaffId);
      setPinnedFormData({ ...initialPinnedForm });
      setEditingPinned(null);
    } catch (e) {
      setPinnedError(e.message);
    } finally {
      setIsPinnedSubmitting(false);
    }
  };
  const handlePinnedDelete = async (id) => {
    if (!schoolData?.id) return;
    if (!window.confirm('Delete this pinned slot?')) return;
    const toastId = `delete-pinned-${id}`;
    toast.loading('Deleting...', { id: toastId });
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/academics/pinned/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success('Pinned slot deleted', { id: toastId });
      await fetchPinnedSlots(pinnedFilterSectionId, pinnedFilterStaffId);
    } catch (e) {
      toast.error('Delete failed', { description: e.message, id: toastId });
    }
  };

  const handleDelete = async (entryId) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE this timetable entry?`)) return;
    const toastId = `delete-timetable-entry-${entryId}`;
    toast.loading("Deleting entry...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/academics/timetable/${entryId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Timetable entry deleted.`, { id: toastId });
      fetchTimetableEntries(); // Re-fetch entries
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Functions for Display ---
  const getSectionFullName = useCallback((id) => {
    const section = sections.find(s => s.id === id);
    return section ? `${section.class?.name || 'N/A'} - ${section.name}` : 'N/A';
  }, [sections]);

  const getSubjectNameDisplay = useCallback((id) => {
    const subject = subjects.find(s => s.id === id);
    return subject ? subject.name : 'N/A';
  }, [subjects]);

  const getTeacherFullName = useCallback((id) => {
    const teacher = teachers.find(t => t.id === id);
    return teacher ? `${teacher.user?.firstName || ''} ${teacher.user?.lastName || ''}`.trim() : 'N/A';
  }, [teachers]);

  const getRoomNameDisplay = useCallback((id) => {
    const room = rooms.find(r => r.id === id);
    return room ? room.name : 'N/A';
  }, [rooms]);

  // --- Color palette helpers for entry cards ---
  const stringToHue = (str) => {
    if (!str) return 210;
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h % 360;
  };
  const colorForKey = (key) => {
    const keyStr = String(key || '');
    const hue = stringToHue(keyStr);
    const s = 70; const l = 45;
    return {
      bg: `hsla(${hue}, ${s}%, ${Math.min(92, l + 40)}%, 0.35)`,
      border: `hsl(${hue} ${s}% ${Math.max(30, l - 5)}%)`,
      text: '#0b1324',
    };
  };
  const getColorKeyForEntry = (entry) => {
    if (colorBy === 'department') {
      const subj = subjects.find(s => s.id === entry.subjectId);
      return subj?.departmentId || entry.subjectId;
    }
    return entry.subjectId;
  };


  // Group entries for the grid, calculating span and position
  const positionedTimetableEntries = useMemo(() => {
    const allPositioned = [];
    timetableEntries.forEach(entry => {
      const { topOffsetPx, heightPx } = calculateSpanAndOffset(entry.startTime, entry.endTime);
      allPositioned.push({
        ...entry,
        topPxRelativeToGridStart: topOffsetPx, // Total offset from the first grid time slot
        heightPx: heightPx,
      });
    });
    return allPositioned;
  }, [timetableEntries, calculateSpanAndOffset]);

  // --- Drag and Drop Logic (Simplified) ---
  const [draggingEntry, setDraggingEntry] = useState(null);
  const [draggedOverCell, setDraggedOverCell] = useState(null); // { day: '1', time: '09:00' }

  const handleDragStart = (e, entry) => {
    setDraggingEntry(entry);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: e.dataTransfer.setDragImage(e.currentTarget, 0, 0); // Can customize drag image
  };

  const handleDragOver = (e, day, time) => {
    e.preventDefault(); // Necessary to allow drop
    setDraggedOverCell({ day, time });
    e.dataTransfer.dropEffect = 'move'; // Visual feedback for valid drop target
  };

  const handleDragLeave = () => {
    setDraggedOverCell(null);
  };

  const handleDrop = (e, targetDay, targetTime) => {
    e.preventDefault();
    if (draggingEntry) {
      // Prepare new data for the moved entry (pre-fill dialog)
      const newFormData = {
        ...draggingEntry, // Copy all existing fields (like ID if editing)
        dayOfWeek: parseInt(targetDay, 10),
        startTime: targetTime,
        // Calculate new endTime based on original duration
        endTime: minutesToTime(timeToMinutes(targetTime) + (timeToMinutes(draggingEntry.endTime) - timeToMinutes(draggingEntry.startTime))),
      };
      setFormData(newFormData);
      setEditingEntry(draggingEntry); // Treat as an edit operation for existing entry
      setIsDialogOpen(true); // Open dialog to confirm the move (will be a PUT request)
    }
    setDraggingEntry(null);
    setDraggedOverCell(null);
  };

  const handleDragEnd = () => {
    setDraggingEntry(null);
    setDraggedOverCell(null);
  };

  // --- Timetable Suggestion Logic ---
  const handleSuggestionFormChange = (e) => setSuggestionFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSuggestionSelectChange = (name, value) => setSuggestionFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));

  const executeSuggestion = async () => {
    setIsSuggesting(true);
    setSuggestedSlot(null);
    setSuggestionError('');

    try {
      const payload = {
        sectionId: suggestionFormData.sectionId || null,
        subjectId: suggestionFormData.subjectId || null,
        staffId: suggestionFormData.staffId || null,
        dayOfWeek: suggestionFormData.dayOfWeek ? parseInt(suggestionFormData.dayOfWeek, 10) : null,
        durationMinutes: parseInt(suggestionFormData.durationMinutes, 10),
        preferredRoomId: suggestionFormData.preferredRoomId || null,
      };

      const response = await fetch(`/api/schools/${schoolData.id}/academics/timetable/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        let err = result.error || `Failed to get suggestion.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        setSuggestionError(err);
        toast.error("Suggestion Failed", { description: err });
      } else {
        setSuggestedSlot(result.suggestedSlot);
        toast.success("Suggested a slot!", { description: `Found slot: Day ${getDayNameDisplay(result.suggestedSlot.dayOfWeek)}, ${result.suggestedSlot.startTime} - ${result.suggestedSlot.endTime}` });

        // Pre-fill the main Add dialog with the suggestion
        setFormData(prev => ({
          ...prev,
          sectionId: suggestionFormData.sectionId, // Keep original filter criteria from suggestion form
          subjectId: suggestionFormData.subjectId,
          staffId: suggestionFormData.staffId,
          dayOfWeek: result.suggestedSlot.dayOfWeek.toString(),
          startTime: result.suggestedSlot.startTime,
          endTime: result.suggestedSlot.endTime,
          roomId: result.suggestedSlot.roomId || '',
        }));
        setIsDialogOpen(true); // Open the main Add/Edit dialog
        setIsSuggestionDialogOpen(false); // Close suggestion dialog
      }
    } catch (err) {
      toast.error('An unexpected error occurred during suggestion.');
      setSuggestionError('An unexpected error occurred.');
      console.error("Suggestion API error:", err);
    } finally {
      setIsSuggesting(false);
    }
  };


  return (
    <div className="space-y-8">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { max-height: none !important; overflow: visible !important; box-shadow: none !important; }
          .print-area * { box-shadow: none !important; }
        }
      `}</style>
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <CalendarDays className="mr-3 h-8 w-8 opacity-80"/>{isTeacher ? 'My Timetable' : 'Manage Timetable'}
          </h1>
          <p className={descriptionTextClasses}>
            {isTeacher ? 'View your scheduled lessons.' : 'Create and manage class schedules for sections, teachers, and rooms.'}
          </p>
        </div>
  <div className="flex flex-col sm:flex-row gap-2">
          {isAdmin && (
            <>
              <Button className={primaryButtonClasses} onClick={() => runAutoGeneration()} disabled={isGenerating || isLoadingDeps} title="Run automatic generation now">
                <Rocket className="mr-2 h-4 w-4" /> Generate Timetable
              </Button>
              <Button variant="outline" className={outlineButtonClasses} onClick={() => setIsGenOptionsOpen(true)} disabled={isGenerating || isLoadingDeps} title="Advanced generation options">
                Advanced Options
              </Button>
              <Button variant="outline" className={outlineButtonClasses} onClick={() => { setIsReqDialogOpen(true); fetchRequirements(reqFilterSectionId); }} disabled={isLoadingDeps} title="Manage Subject Requirements">
                Manage Subject Requirements
              </Button>
              <Button variant="outline" className={outlineButtonClasses} onClick={() => { setIsStaffUnavDialogOpen(true); fetchStaffUnavailability(staffUnavFilterStaffId); }} disabled={isLoadingDeps} title="Manage Staff Unavailability">
                Manage Staff Unavailability
              </Button>
              <Button variant="outline" className={outlineButtonClasses} onClick={() => { setIsRoomUnavDialogOpen(true); fetchRoomUnavailability(roomUnavFilterRoomId); }} disabled={isLoadingDeps} title="Manage Room Unavailability">
                Manage Room Unavailability
              </Button>
              <Button variant="outline" className={outlineButtonClasses} onClick={() => { setIsPinnedDialogOpen(true); fetchPinnedSlots(pinnedFilterSectionId, pinnedFilterStaffId); }} disabled={isLoadingDeps} title="Manage Pinned Slots">
                Manage Pinned Slots
              </Button>
              <Dialog open={isGenOptionsOpen} onOpenChange={setIsGenOptionsOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className={titleTextClasses}>Generation Options</DialogTitle>
                    <DialogDescription className={descriptionTextClasses}>Set constraints and scope for the automated generator.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-1">
                    <div className="flex items-center justify-between">
                      <Label className={titleTextClasses}>Include Pinned Slots</Label>
                      <input type="checkbox" checked={!!genOptions.includePinned} onChange={(e) => setGenOptions(o => ({ ...o, includePinned: e.target.checked }))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className={titleTextClasses}>Honor Unavailability</Label>
                      <input type="checkbox" checked={!!genOptions.honorUnavailability} onChange={(e) => setGenOptions(o => ({ ...o, honorUnavailability: e.target.checked }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className={titleTextClasses}>Preferred Start</Label>
                        <Input type="time" value={genOptions.preferredStartTime} onChange={(e) => setGenOptions(o => ({ ...o, preferredStartTime: e.target.value }))} />
                      </div>
                      <div>
                        <Label className={titleTextClasses}>Preferred End</Label>
                        <Input type="time" value={genOptions.preferredEndTime} onChange={(e) => setGenOptions(o => ({ ...o, preferredEndTime: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label className={titleTextClasses}>Target Sections</Label>
                      <div className="max-h-48 overflow-auto border rounded p-2 space-y-1">
                        {sections.map(sec => {
                          const checked = genOptions.targetSectionIds?.includes(sec.id);
                          return (
                            <label key={sec.id} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={!!checked} onChange={(e) => {
                                setGenOptions(o => ({
                                  ...o,
                                  targetSectionIds: e.target.checked ? [...(o.targetSectionIds||[]), sec.id] : (o.targetSectionIds||[]).filter(id => id !== sec.id)
                                }));
                              }} />
                              <span>{getSectionFullName(sec.id)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="pt-2">
                    <DialogClose asChild><Button variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                    <Button className={primaryButtonClasses} onClick={() => { setIsGenOptionsOpen(false); runAutoGeneration(); }} disabled={isGenerating}>
                      {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Generating...</> : 'Run Generation'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          {/* Add Timetable Entry Button (admin only) */}
          {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(''); }}>
            <DialogTrigger asChild>
              <Button className={primaryButtonClasses} onClick={openAddDialog}> <PlusCircle className="mr-2 h-4 w-4" /> Add Timetable Entry </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className={titleTextClasses}>{editingEntry ? 'Edit Timetable Entry' : 'Add New Timetable Entry'}</DialogTitle>
                <DialogDescription className={descriptionTextClasses}>
                  {editingEntry ? 'Adjust the details for this timetable slot.' : 'Define a new teaching slot for a section, subject, teacher, and room.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 py-1">
                <TimetableFormFields
                  formData={formData}
                  onFormChange={handleFormChange}
                  onSelectChange={handleSelectChange}
                  sectionsList={sections}
                  subjectsList={subjects}
                  teachersList={teachers}
                  roomsList={rooms}
                  isLoadingDeps={isLoadingDeps}
                />
                {formError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingDeps}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingEntry ? 'Saving...' : 'Creating...'}</> : editingEntry ? 'Save Changes' : 'Create Entry'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}

          {/* View Toggle Buttons */}
          <Button
            variant="outline"
            onClick={() => setIsGridView(true)}
            className={`${isGridView ? primaryButtonClasses : outlineButtonClasses}`}
            title="Switch to Grid View"
          >
            <Grid className="mr-2 h-4 w-4" /> Grid View
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsGridView(false)}
            className={`${!isGridView ? primaryButtonClasses : outlineButtonClasses}`}
            title="Switch to Table View"
          >
            <List className="mr-2 h-4 w-4" /> Table View
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className={outlineButtonClasses}
            title="Print Timetable"
          >
            Print Timetable
          </Button>
        </div>
      </div>

      {/* Requirements Management Dialog */}
      <Dialog open={isReqDialogOpen} onOpenChange={(open) => { setIsReqDialogOpen(open); if (!open) { setEditingReq(null); setReqFormData({ ...initialReqForm }); setReqError(''); } }}>
        <DialogContent className="sm:max-w-3xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>Subject Requirements</DialogTitle>
            <DialogDescription className={descriptionTextClasses}>Define weekly periods for each section-subject and session options.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label className={titleTextClasses}>Filter by Section</Label>
              <Select value={reqFilterSectionId || 'all'} onValueChange={(v) => { const val = v === 'all' ? '' : v; setReqFilterSectionId(val); fetchRequirements(val); }}>
                <SelectTrigger className={`${filterInputClasses} w-[220px]`}>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map(s => (<SelectItem key={s.id} value={s.id}>{getSectionFullName(s.id)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Periods/Week</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Double</TableHead>
                    <TableHead>Min Gap</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.length === 0 ? (
                    <TableRow><TableCell colSpan="7" className={descriptionTextClasses}>No requirements found.</TableCell></TableRow>
                  ) : (
                    requirements.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className={descriptionTextClasses}>{getSectionFullName(r.sectionId)}</TableCell>
                        <TableCell className={descriptionTextClasses}>{getSubjectNameDisplay(r.subjectId)}</TableCell>
                        <TableCell className={descriptionTextClasses}>{r.periodsPerWeek}</TableCell>
                        <TableCell className={descriptionTextClasses}>{r.durationMinutes} mins</TableCell>
                        <TableCell className={descriptionTextClasses}>{r.allowDouble ? 'Yes' : 'No'}</TableCell>
                        <TableCell className={descriptionTextClasses}>{r.minGapMins} mins</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className={outlineButtonClasses} onClick={() => openEditReqDialog(r)}>Edit</Button>
                            <Button variant="outline" size="sm" className={`${outlineButtonClasses} border-red-300 text-red-600 dark:border-red-700 dark:text-red-400`} onClick={() => handleReqDelete(r.id)}>Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-md font-semibold ${titleTextClasses}`}>{editingReq ? 'Edit Requirement' : 'Add Requirement'}</h3>
              <form onSubmit={handleReqSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <Label className={titleTextClasses}>Section</Label>
                  <Select value={reqFormData.sectionId || ''} onValueChange={(v) => handleReqSelectChange('sectionId', v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select section"/></SelectTrigger>
                    <SelectContent>
                      {sections.map(s => (<SelectItem key={s.id} value={s.id}>{getSectionFullName(s.id)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Subject</Label>
                  <Select value={reqFormData.subjectId || ''} onValueChange={(v) => handleReqSelectChange('subjectId', v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select subject"/></SelectTrigger>
                    <SelectContent>
                      {subjects.map(sub => (<SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Periods per Week</Label>
                  <Input name="periodsPerWeek" type="number" min="1" step="1" value={reqFormData.periodsPerWeek} onChange={handleReqFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                <div>
                  <Label className={titleTextClasses}>Duration (minutes)</Label>
                  <Input name="durationMinutes" type="number" min="15" step="5" value={reqFormData.durationMinutes} onChange={handleReqFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                <div>
                  <Label className={titleTextClasses}>Min Gap (minutes)</Label>
                  <Input name="minGapMins" type="number" min="0" step="5" value={reqFormData.minGapMins} onChange={handleReqFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input id="allowDouble" name="allowDouble" type="checkbox" checked={!!reqFormData.allowDouble} onChange={handleReqFormChange} />
                  <Label htmlFor="allowDouble" className={titleTextClasses}>Allow Double Periods</Label>
                </div>
                <div className="md:col-span-2">
                  <Label className={titleTextClasses}>Preferred Room Type (optional)</Label>
                  <Input name="preferredRoomType" type="text" value={reqFormData.preferredRoomType} onChange={handleReqFormChange} className={`${filterInputClasses} mt-1`} placeholder="e.g., SCIENCE_LAB" />
                </div>
                {reqError && (<p className="md:col-span-2 text-sm text-red-600 dark:text-red-400">{reqError}</p>)}
                <div className="md:col-span-2 flex justify-end gap-2">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Close</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isReqSubmitting}>{isReqSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (editingReq ? 'Save Changes' : 'Add Requirement')}</Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff Unavailability Management Dialog */}
      <Dialog open={isStaffUnavDialogOpen} onOpenChange={(open) => { setIsStaffUnavDialogOpen(open); if (!open) { setEditingStaffUnav(null); setStaffUnavFormData({ ...initialStaffUnavForm }); setStaffUnavError(''); } }}>
        <DialogContent className="sm:max-w-3xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>Staff Unavailability</DialogTitle>
            <DialogDescription className={descriptionTextClasses}>Block times when teachers are unavailable.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label className={titleTextClasses}>Filter by Teacher</Label>
              <Select value={staffUnavFilterStaffId || 'all'} onValueChange={(v) => { const val = v === 'all' ? '' : v; setStaffUnavFilterStaffId(val); fetchStaffUnavailability(val); }}>
                <SelectTrigger className={`${filterInputClasses} w-[240px]`}>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map(t => (<SelectItem key={t.id} value={t.id}>{getTeacherFullName(t.id)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffUnavailability.length === 0 ? (
                    <TableRow><TableCell colSpan="5" className={descriptionTextClasses}>No unavailability found.</TableCell></TableRow>
                  ) : (
                    staffUnavailability.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className={descriptionTextClasses}>{getTeacherFullName(u.staffId)}</TableCell>
                        <TableCell className={descriptionTextClasses}>{getDayNameDisplay(u.dayOfWeek)}</TableCell>
                        <TableCell className={descriptionTextClasses}>{u.startTime} - {u.endTime}</TableCell>
                        <TableCell className={descriptionTextClasses}>{u.note || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className={outlineButtonClasses} onClick={() => openEditStaffUnavDialog(u)}>Edit</Button>
                            <Button variant="outline" size="sm" className={`${outlineButtonClasses} border-red-300 text-red-600 dark:border-red-700 dark:text-red-400`} onClick={() => handleStaffUnavDelete(u.id)}>Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-md font-semibold ${titleTextClasses}`}>{editingStaffUnav ? 'Edit Unavailability' : 'Add Unavailability'}</h3>
              <form onSubmit={handleStaffUnavSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <Label className={titleTextClasses}>Teacher</Label>
                  <Select value={staffUnavFormData.staffId || ''} onValueChange={(v) => handleStaffUnavSelectChange('staffId', v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select teacher"/></SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (<SelectItem key={t.id} value={t.id}>{getTeacherFullName(t.id)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Day of Week</Label>
                  <Select value={staffUnavFormData.dayOfWeek || ''} onValueChange={(v) => handleStaffUnavSelectChange('dayOfWeek', v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select day"/></SelectTrigger>
                    <SelectContent>
                      {getDayOfWeekOptions.map(d => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Start Time</Label>
                  <Input name="startTime" type="time" value={staffUnavFormData.startTime} onChange={handleStaffUnavFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                <div>
                  <Label className={titleTextClasses}>End Time</Label>
                  <Input name="endTime" type="time" value={staffUnavFormData.endTime} onChange={handleStaffUnavFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                <div className="md:col-span-2">
                  <Label className={titleTextClasses}>Note (optional)</Label>
                  <Input name="note" type="text" value={staffUnavFormData.note} onChange={handleStaffUnavFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                {staffUnavError && (<p className="md:col-span-2 text-sm text-red-600 dark:text-red-400">{staffUnavError}</p>)}
                <div className="md:col-span-2 flex justify-end gap-2">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Close</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isStaffUnavSubmitting}>{isStaffUnavSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>) : (editingStaffUnav ? 'Save Changes' : 'Add Unavailability')}</Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Unavailability Management Dialog */}
      <Dialog open={isRoomUnavDialogOpen} onOpenChange={(open) => { setIsRoomUnavDialogOpen(open); if (!open) { setEditingRoomUnav(null); setRoomUnavFormData({ ...initialRoomUnavForm }); setRoomUnavError(''); } }}>
        <DialogContent className="sm:max-w-3xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>Room Unavailability</DialogTitle>
            <DialogDescription className={descriptionTextClasses}>Block times when rooms are unavailable.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label className={titleTextClasses}>Filter by Room</Label>
              <Select value={roomUnavFilterRoomId || 'all'} onValueChange={(v) => { const val = v === 'all' ? '' : v; setRoomUnavFilterRoomId(val); fetchRoomUnavailability(val); }}>
                <SelectTrigger className={`${filterInputClasses} w-[240px]`}>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {rooms.map(r => (<SelectItem key={r.id} value={r.id}>{getRoomNameDisplay(r.id)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomUnavailability.length === 0 ? (
                    <TableRow><TableCell colSpan="5" className={descriptionTextClasses}>No unavailability found.</TableCell></TableRow>
                  ) : (
                    roomUnavailability.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className={descriptionTextClasses}>{getRoomNameDisplay(u.roomId)}</TableCell>
                        <TableCell className={descriptionTextClasses}>{getDayNameDisplay(u.dayOfWeek)}</TableCell>
                        <TableCell className={descriptionTextClasses}>{u.startTime} - {u.endTime}</TableCell>
                        <TableCell className={descriptionTextClasses}>{u.note || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className={outlineButtonClasses} onClick={() => openEditRoomUnavDialog(u)}>Edit</Button>
                            <Button variant="outline" size="sm" className={`${outlineButtonClasses} border-red-300 text-red-600 dark:border-red-700 dark:text-red-400`} onClick={() => handleRoomUnavDelete(u.id)}>Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-md font-semibold ${titleTextClasses}`}>{editingRoomUnav ? 'Edit Unavailability' : 'Add Unavailability'}</h3>
              <form onSubmit={handleRoomUnavSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <Label className={titleTextClasses}>Room</Label>
                  <Select value={roomUnavFormData.roomId || ''} onValueChange={(v) => handleRoomUnavSelectChange('roomId', v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select room"/></SelectTrigger>
                    <SelectContent>
                      {rooms.map(r => (<SelectItem key={r.id} value={r.id}>{getRoomNameDisplay(r.id)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Day of Week</Label>
                  <Select value={roomUnavFormData.dayOfWeek || ''} onValueChange={(v) => handleRoomUnavSelectChange('dayOfWeek', v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select day"/></SelectTrigger>
                    <SelectContent>
                      {getDayOfWeekOptions.map(d => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Start Time</Label>
                  <Input name="startTime" type="time" value={roomUnavFormData.startTime} onChange={handleRoomUnavFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                <div>
                  <Label className={titleTextClasses}>End Time</Label>
                  <Input name="endTime" type="time" value={roomUnavFormData.endTime} onChange={handleRoomUnavFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                <div className="md:col-span-2">
                  <Label className={titleTextClasses}>Note (optional)</Label>
                  <Input name="note" type="text" value={roomUnavFormData.note} onChange={handleRoomUnavFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                {roomUnavError && (<p className="md:col-span-2 text-sm text-red-600 dark:text-red-400">{roomUnavError}</p>)}
                <div className="md:col-span-2 flex justify-end gap-2">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Close</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isRoomUnavSubmitting}>{isRoomUnavSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>) : (editingRoomUnav ? 'Save Changes' : 'Add Unavailability')}</Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pinned Slots Management Dialog */}
      <Dialog open={isPinnedDialogOpen} onOpenChange={(open) => { setIsPinnedDialogOpen(open); if (!open) { setEditingPinned(null); setPinnedFormData({ ...initialPinnedForm }); setPinnedError(''); } }}>
        <DialogContent className="sm:max-w-4xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>Pinned Slots</DialogTitle>
            <DialogDescription className={descriptionTextClasses}>Force certain lessons to fixed times; the generator will respect these.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label className={titleTextClasses}>Filter by Section</Label>
              <Select value={pinnedFilterSectionId || 'all'} onValueChange={(v) => { const val = v === 'all' ? '' : v; setPinnedFilterSectionId(val); fetchPinnedSlots(val, pinnedFilterStaffId); }}>
                <SelectTrigger className={`${filterInputClasses} w-[220px]`}>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map(s => (<SelectItem key={s.id} value={s.id}>{getSectionFullName(s.id)}</SelectItem>))}
                </SelectContent>
              </Select>
              <Label className={titleTextClasses}>Filter by Teacher</Label>
              <Select value={pinnedFilterStaffId || 'all'} onValueChange={(v) => { const val = v === 'all' ? '' : v; setPinnedFilterStaffId(val); fetchPinnedSlots(pinnedFilterSectionId, val); }}>
                <SelectTrigger className={`${filterInputClasses} w-[220px]`}>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map(t => (<SelectItem key={t.id} value={t.id}>{getTeacherFullName(t.id)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pinnedSlots.length === 0 ? (
                    <TableRow><TableCell colSpan="8" className={descriptionTextClasses}>No pinned slots found.</TableCell></TableRow>
                  ) : (
                    pinnedSlots.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className={descriptionTextClasses}>{getSectionFullName(p.sectionId)}</TableCell>
                        <TableCell className={descriptionTextClasses}>{getSubjectNameDisplay(p.subjectId)}</TableCell>
                        <TableCell className={descriptionTextClasses}>{p.staffId ? getTeacherFullName(p.staffId) : '-'}</TableCell>
                        <TableCell className={descriptionTextClasses}>{getDayNameDisplay(p.dayOfWeek)}</TableCell>
                        <TableCell className={descriptionTextClasses}>{p.startTime} - {p.endTime}</TableCell>
                        <TableCell className={descriptionTextClasses}>{p.roomId ? getRoomNameDisplay(p.roomId) : '-'}</TableCell>
                        <TableCell className={descriptionTextClasses}>{p.note || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className={outlineButtonClasses} onClick={() => openEditPinnedDialog(p)}>Edit</Button>
                            <Button variant="outline" size="sm" className={`${outlineButtonClasses} border-red-300 text-red-600 dark:border-red-700 dark:text-red-400`} onClick={() => handlePinnedDelete(p.id)}>Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-md font-semibold ${titleTextClasses}`}>{editingPinned ? 'Edit Pinned Slot' : 'Add Pinned Slot'}</h3>
              <form onSubmit={handlePinnedSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <Label className={titleTextClasses}>Section</Label>
                  <Select value={pinnedFormData.sectionId || ''} onValueChange={(v) => handlePinnedSelectChange('sectionId', v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select section"/></SelectTrigger>
                    <SelectContent>
                      {sections.map(s => (<SelectItem key={s.id} value={s.id}>{getSectionFullName(s.id)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Subject</Label>
                  <Select value={pinnedFormData.subjectId || ''} onValueChange={(v) => handlePinnedSelectChange('subjectId', v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select subject"/></SelectTrigger>
                    <SelectContent>
                      {subjects.map(sub => (<SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Teacher (optional)</Label>
                  <Select value={pinnedFormData.staffId || '__NONE__'} onValueChange={(v) => handlePinnedSelectChange('staffId', v === '__NONE__' ? '' : v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select teacher (optional)"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">None</SelectItem>
                      {teachers.map(t => (<SelectItem key={t.id} value={t.id}>{getTeacherFullName(t.id)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Room (optional)</Label>
                  <Select value={pinnedFormData.roomId || '__NONE__'} onValueChange={(v) => handlePinnedSelectChange('roomId', v === '__NONE__' ? '' : v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select room (optional)"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">None</SelectItem>
                      {rooms.map(r => (<SelectItem key={r.id} value={r.id}>{getRoomNameDisplay(r.id)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Day of Week</Label>
                  <Select value={pinnedFormData.dayOfWeek || ''} onValueChange={(v) => handlePinnedSelectChange('dayOfWeek', v)}>
                    <SelectTrigger className={`${filterInputClasses} mt-1`}><SelectValue placeholder="Select day"/></SelectTrigger>
                    <SelectContent>
                      {getDayOfWeekOptions.map(d => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={titleTextClasses}>Start Time</Label>
                  <Input name="startTime" type="time" value={pinnedFormData.startTime} onChange={handlePinnedFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                <div>
                  <Label className={titleTextClasses}>End Time</Label>
                  <Input name="endTime" type="time" value={pinnedFormData.endTime} onChange={handlePinnedFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                <div className="md:col-span-2">
                  <Label className={titleTextClasses}>Note (optional)</Label>
                  <Input name="note" type="text" value={pinnedFormData.note} onChange={handlePinnedFormChange} className={`${filterInputClasses} mt-1`} />
                </div>
                {pinnedError && (<p className="md:col-span-2 text-sm text-red-600 dark:text-red-400">{pinnedError}</p>)}
                <div className="md:col-span-2 flex justify-end gap-2">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Close</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isPinnedSubmitting}>{isPinnedSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>) : (editingPinned ? 'Save Changes' : 'Add Pinned Slot')}</Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      {/* Conflict Confirmation Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>Timetable Conflict Detected!</DialogTitle>
            <DialogDescription className="text-red-600 dark:text-red-400 font-medium">
              {conflictMessage}
            </DialogDescription>
            <DialogDescription className={descriptionTextClasses}>
              This time slot is already occupied. Do you want to proceed and override?
              <br/>
              **Warning: Overriding will delete any existing conflicting entries and is irreversible.**
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
            <Button type="button" className={primaryButtonClasses} onClick={handleConflictConfirm} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Confirm Anyway (Override)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Timetable Filters */}
  <div className={`${glassCardClasses} flex flex-wrap items-center gap-4 no-print`}>
        <h3 className={`text-md font-semibold ${titleTextClasses} mr-2`}>Filters:</h3>
        {/* Teacher context badge */}
        {isTeacher && (
          <span className="text-xs px-2 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-300/50">
            Viewing: Me
          </span>
        )}
        <Select value={filterSectionId} onValueChange={(value) => setFilterSectionId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Section" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Sections</SelectItem>
            {Array.isArray(sections) && sections.map(sec => <SelectItem key={sec.id} value={sec.id}>{getSectionFullName(sec.id)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStaffId || (isTeacher ? teacherStaffId : '')} onValueChange={(value) => setFilterStaffId(value === 'all' ? '' : value)} disabled={isLoadingDeps || isTeacher}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder={isTeacher ? 'Me' : 'Filter by Teacher'} /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isTeacher && <SelectItem value="all">All Teachers</SelectItem>}
            {Array.isArray(teachers) && teachers.map(teach => (
              <SelectItem key={teach.id} value={teach.id} disabled={isTeacher && teach.id !== teacherStaffId}>
                {getTeacherFullName(teach.id)} {isTeacher && teach.id === teacherStaffId ? '(Me)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterRoomId} onValueChange={(value) => setFilterRoomId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Room" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Rooms</SelectItem>
            {Array.isArray(rooms) && rooms.map(room => <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterDayOfWeek} onValueChange={(value) => setFilterDayOfWeek(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[150px]`}> <SelectValue placeholder="Filter by Day" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Days</SelectItem>
            {getDayOfWeekOptions.map(day => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {!isTeacher && (
          <Button onClick={() => { setFilterSectionId(''); setFilterStaffId(''); setFilterDayOfWeek(''); setFilterRoomId(''); }} variant="outline" className={outlineButtonClasses}>
            Reset Filters
          </Button>
        )}
      </div>

      {/* Suggest API Button & Dialog */}
        {!isTeacher && (
        <Dialog open={isSuggestionDialogOpen} onOpenChange={setIsSuggestionDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-fit" onClick={() => {
            setSuggestionFormData({ ...initialSuggestionFormData });
            setSuggestedSlot(null);
            setSuggestionError('');
            setIsSuggestionDialogOpen(true);
          }}>
            <Lightbulb className="mr-2 h-4 w-4" /> Suggest Best Slot
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className={titleTextClasses}>Suggest Timetable Slot</DialogTitle>
            <DialogDescription className={descriptionTextClasses}>
              Find the next available conflict-free slot based on criteria.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); executeSuggestion(); }} className="space-y-4 py-2">
            {/* Suggestion Form Fields */}
            <div>
              <Label htmlFor="s_sectionId" className={descriptionTextClasses}>Section <span className="text-red-500">*</span></Label>
              <Select name="sectionId" value={suggestionFormData.sectionId || ''} onValueChange={(value) => handleSuggestionSelectChange('sectionId', value)} disabled={isLoadingDeps}>
                <SelectTrigger className={`${filterInputClasses} mt-1`}> <SelectValue placeholder="Select section" /> </SelectTrigger>
                <SelectContent><SelectItem value="none">Any Section</SelectItem>{Array.isArray(sections) && sections.map(sec => <SelectItem key={sec.id} value={sec.id}>{getSectionFullName(sec.id)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="s_subjectId" className={descriptionTextClasses}>Subject <span className="text-red-500">*</span></Label>
              <Select name="subjectId" value={suggestionFormData.subjectId || ''} onValueChange={(value) => handleSuggestionSelectChange('subjectId', value)} disabled={isLoadingDeps}>
                <SelectTrigger className={`${filterInputClasses} mt-1`}> <SelectValue placeholder="Select subject" /> </SelectTrigger>
                <SelectContent><SelectItem value="none">Any Subject</SelectItem>{Array.isArray(subjects) && subjects.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}</SelectContent>
              </Select>
              {suggestionFormData.subjectId && (
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {(() => {
                    const subject = subjects.find(s => s.id === suggestionFormData.subjectId);
                    const names = (subject?.staffSubjectLevels || [])
                      .filter(link => {
                        if (!link?.staff?.user) return false;
                        const sec = sections.find(se => se.id === suggestionFormData.sectionId);
                        const levelId = sec?.class?.schoolLevelId || null;
                        return levelId ? (link?.schoolLevel?.id === levelId) : true;
                      })
                      .map(link => `${link.staff.user.firstName || ''} ${link.staff.user.lastName || ''}`.trim())
                      .filter(Boolean);
                    return names.length ? `Teachers for this subject${suggestionFormData.sectionId ? ' (at this level)' : ''}: ${names.join(', ')}` : 'No linked teachers found; showing all teachers.';
                  })()}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="s_staffId" className={descriptionTextClasses}>Teacher <span className="text-red-500">*</span></Label>
              <Select name="staffId" value={suggestionFormData.staffId || ''} onValueChange={(value) => handleSuggestionSelectChange('staffId', value)} disabled={isLoadingDeps}>
                <SelectTrigger className={`${filterInputClasses} mt-1`}> <SelectValue placeholder="Select teacher" /> </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any Teacher</SelectItem>
                  {Array.isArray(allowedTeachersForSuggestion) && allowedTeachersForSuggestion.map(teach => (
                    <SelectItem key={teach.id} value={teach.id}>{getTeacherFullName(teach.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="s_dayOfWeek" className={descriptionTextClasses}>Day of Week <span className="text-red-500">*</span></Label>
              <Select name="dayOfWeek" value={suggestionFormData.dayOfWeek?.toString() || ''} onValueChange={(value) => handleSuggestionSelectChange('dayOfWeek', value)} disabled={isLoadingDeps}>
                <SelectTrigger className={`${filterInputClasses} mt-1`}> <SelectValue placeholder="Select day" /> </SelectTrigger>
                <SelectContent><SelectItem value="none">Any Day</SelectItem>{getDayOfWeekOptions.map(day => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="s_durationMinutes" className={descriptionTextClasses}>Duration (minutes) <span className="text-red-500">*</span></Label>
              <Input id="s_durationMinutes" name="durationMinutes" type="number" min="15" step="15" value={suggestionFormData.durationMinutes || ''} onChange={handleSuggestionFormChange} required className={`${filterInputClasses} mt-1`} placeholder="e.g., 60" />
            </div>
            <div>
              <Label htmlFor="s_preferredRoomId" className={descriptionTextClasses}>Preferred Room (Optional)</Label>
              <Select name="preferredRoomId" value={suggestionFormData.preferredRoomId || ''} onValueChange={(value) => handleSuggestionSelectChange('preferredRoomId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
                <SelectTrigger className={`${filterInputClasses} mt-1`}> <SelectValue placeholder="Select room" /> </SelectTrigger>
                <SelectContent><SelectItem value="none">Any Room</SelectItem>{Array.isArray(rooms) && rooms.map(room => <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {suggestionError && ( <p className="text-sm text-red-600 dark:text-red-400">{suggestionError}</p> )}
            <DialogFooter className="pt-4">
              <Button type="submit" className={primaryButtonClasses} disabled={isSuggesting || isLoadingDeps}>
                {isSuggesting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Suggesting...</> : 'Find Slot'}
              </Button>
            </DialogFooter>
          </form>
          {suggestedSlot && (
            <Alert className="mt-4 bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300 dark:border-green-700/50">
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Suggested Slot:</AlertTitle>
              <AlertDescription>
                **{getDayNameDisplay(suggestedSlot.dayOfWeek)}** from {suggestedSlot.startTime} to {suggestedSlot.endTime} {suggestedSlot.roomId ? `in ${getRoomNameDisplay(suggestedSlot.roomId)}` : ''}.
              </AlertDescription>
              <Button variant="outline" className="mt-2" onClick={() => {
                // Pre-fill main form and open it
                setFormData(prev => ({
                  ...prev,
                  sectionId: suggestionFormData.sectionId,
                  subjectId: suggestionFormData.subjectId,
                  staffId: suggestionFormData.staffId,
                  dayOfWeek: suggestedSlot.dayOfWeek.toString(),
                  startTime: suggestedSlot.startTime,
                  endTime: suggestedSlot.endTime,
                  roomId: suggestedSlot.roomId || '',
                }));
                setIsDialogOpen(true); // Open the main Add/Edit dialog
                setIsSuggestionDialogOpen(false); // Close suggestion dialog
              }}>
                Use this slot
              </Button>
            </Alert>
          )}
        </DialogContent>
  </Dialog>
  )}


      {/* Timetable Grid Display */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
        </div>
      ) : (
        <>
          {isGridView ? (
            /* Timetable Grid Display */
            <div className={`${glassCardClasses} overflow-auto custom-scrollbar relative print-area`}
                 style={{ maxHeight: fitHeight ? 'calc(100vh - 220px)' : undefined }}> {/* Fit to viewport height if enabled */}
              {/* Display Controls */}
              <div className="flex flex-wrap items-center gap-3 mb-3 no-print">
                <div className="flex items-center gap-2">
                  <Label className={titleTextClasses}>Days</Label>
                  <Button variant="outline" size="sm" className={outlineButtonClasses}
                          onClick={() => setShowWeekend(v => !v)}>
                    {showWeekend ? 'Mon–Sun' : 'Mon–Fri'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label className={titleTextClasses}>Density</Label>
                  <div className="inline-flex rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                    <button type="button" className={`px-2 py-1 text-xs ${rowDensity==='compact' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`} onClick={() => setRowDensity('compact')}>Compact</button>
                    <button type="button" className={`px-2 py-1 text-xs border-l border-zinc-300 dark:border-zinc-700 ${rowDensity==='cozy' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`} onClick={() => setRowDensity('cozy')}>Cozy</button>
                    <button type="button" className={`px-2 py-1 text-xs border-l border-zinc-300 dark:border-zinc-700 ${rowDensity==='comfortable' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`} onClick={() => setRowDensity('comfortable')}>Comfortable</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className={titleTextClasses}>Fit Height</Label>
                  <input type="checkbox" checked={fitHeight} onChange={(e) => setFitHeight(e.target.checked)} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className={titleTextClasses}>Color by</Label>
                  <div className="inline-flex rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                    <button type="button" className={`px-2 py-1 text-xs ${colorBy==='subject' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`} onClick={() => setColorBy('subject')}>Subject</button>
                    <button type="button" className={`px-2 py-1 text-xs border-l border-zinc-300 dark:border-zinc-700 ${colorBy==='department' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`} onClick={() => setColorBy('department')}>Department</button>
                  </div>
                </div>
              </div>
              {/* Legend for overlays */}
              <div className="flex flex-wrap items-center gap-4 mb-3 text-xs no-print">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={overlayShowPinned} onChange={(e) => setOverlayShowPinned(e.target.checked)} />
                  <span className="inline-block h-3 w-3 rounded-sm bg-amber-300/60 dark:bg-amber-500/40 border border-amber-500/50"></span>
                  <span className={descriptionTextClasses}>Pinned</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={overlayShowStaff} onChange={(e) => setOverlayShowStaff(e.target.checked)} />
                  <span className="inline-block h-3 w-3 rounded-sm bg-red-300/50 dark:bg-red-500/30 border border-red-500/40"></span>
                  <span className={descriptionTextClasses}>Staff Unavailable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={overlayShowRoom} onChange={(e) => setOverlayShowRoom(e.target.checked)} />
                  <span className="inline-block h-3 w-3 rounded-sm bg-purple-300/50 dark:bg-purple-500/30 border border-purple-500/40"></span>
                  <span className={descriptionTextClasses}>Room Unavailable</span>
                </label>
              </div>
              {/* Note: This grid is fixed height per 30-min slot. Cards span visually using absolute positioning. */}
              <div
                className="grid text-sm border-t border-l border-zinc-200 dark:border-zinc-700 min-w-max"
                style={{ gridAutoRows: `${rowHeight}px`, gridTemplateColumns: `72px repeat(${visibleDays.length}, minmax(140px, 1fr))` }}
                onMouseLeave={handleDragLeave} // Clear dragged over cell on mouse leave
              >
                {/* Corner for empty space */}
                <div className="sticky top-0 left-0 bg-white dark:bg-zinc-950 z-40 p-2 border-b border-r border-zinc-200 dark:border-zinc-700"></div>
                {/* Day Headers */}
                {visibleDays.map(day => (
                  <div key={day.value} className="sticky top-0 z-30 text-center font-semibold p-2 bg-gradient-to-b from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 border-b border-r border-zinc-200 dark:border-zinc-700">
                    {day.label}
                  </div>
                ))}

                {/* Time Rows */}
                {timeSlots.map((time, timeIndex) => (
                  <React.Fragment key={time}>
                    {/* Time Slot Header */}
                    <div className={`sticky left-0 z-20 p-2 font-medium border-b border-r border-zinc-200 dark:border-zinc-700 h-full flex items-center justify-center ${timeIndex % 2 === 1 ? 'bg-zinc-50 dark:bg-zinc-900/40' : 'bg-white dark:bg-zinc-950'}`}>
                      {time}
                    </div>
                    {/* Cells for each day */}
                    {visibleDays.map(day => (
                      <div
                        key={`${day.value}-${time}`}
                        className={`relative p-0 border-b border-r border-zinc-200 dark:border-zinc-700 h-full
                          ${draggedOverCell?.day === day.value && draggedOverCell?.time === time ? 'bg-sky-200/50 dark:bg-sky-800/50' : ''}`}
                        onDragOver={(e) => handleDragOver(e, day.value, time)}
                        onDrop={(e) => handleDrop(e, day.value, time)}
                        onDragLeave={handleDragLeave}
                      >
                        {/* Zebra background stripe layer */}
                        {timeIndex % 2 === 1 && (
                          <div className="absolute inset-0 -z-20 bg-zinc-50 dark:bg-zinc-900/40" />
                        )}
                        {/* Overlays background layers (optional, based on filters) */}
                        <div className="absolute inset-0 -z-10 pointer-events-none">
                          {overlayShowPinned && overlayPinnedSet.has(`${day.value}-${time}`) && (
                            <div className="absolute inset-0 bg-amber-300/30 dark:bg-amber-500/20" />
                          )}
                          {overlayShowStaff && overlayStaffUnavSet.has(`${day.value}-${time}`) && (
                            <div className="absolute inset-0 bg-red-300/30 dark:bg-red-500/20" />
                          )}
                          {overlayShowRoom && overlayRoomUnavSet.has(`${day.value}-${time}`) && (
                            <div className="absolute inset-0 bg-purple-300/30 dark:bg-purple-500/20" />
                          )}
                        </div>
                        {/* Render timetable entries that START EXACTLY at this time slot */}
                        {positionedTimetableEntries
                          .filter(entry => entry.dayOfWeek.toString() === day.value && entry.startTime === time)
                          .map((entry, entryIndex) => {
                            const { topOffsetPx: entryRelativeTop, heightPx: entryHeight } = calculateSpanAndOffset(entry.startTime, entry.endTime);
                            const cellStartTimeMins = timeToMinutes(time);

                            // Corrected: top in the current cell is 0 if it starts at this slot, height is full span
                            const relativeTopInCell = 0;
                            const colorKey = getColorKeyForEntry(entry);
                            const colors = colorForKey(colorKey);

                            return (
                              <div
                                key={entry.id}
                                draggable={isAdmin} // Only admins can drag
                                onDragStart={(e) => handleDragStart(e, entry)}
                                onDragEnd={handleDragEnd}
                                className="group absolute backdrop-blur-sm rounded-md p-1.5 text-[11px] leading-tight cursor-pointer transition-colors z-10 overflow-hidden break-words shadow-sm"
                                style={{
                                  top: `${relativeTopInCell}px`,
                                  height: `${entryHeight}px`,
                                  left: '3px',
                                  right: '3px',
                                  backgroundColor: colors.bg,
                                  border: `1px solid ${colors.border}`,
                                  color: colors.text,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent opening Add dialog when clicking on an existing entry
                                    if (isAdmin) openEditDialog(entry);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <strong className="block truncate pr-2">{getSubjectNameDisplay(entry.subjectId)}</strong>
                                  <span className="text-[10px] text-zinc-600 dark:text-zinc-300">{entry.startTime}–{entry.endTime}</span>
                                </div>
                                <span className="block truncate text-zinc-700 dark:text-zinc-300">{getSectionFullName(entry.sectionId)}</span>
                                <span className="block truncate text-zinc-600 dark:text-zinc-400">{getTeacherFullName(entry.staffId)}</span>
                                <span className="block truncate text-zinc-600 dark:text-zinc-400">{getRoomNameDisplay(entry.roomId)}</span>

                                {/* Edit/Delete buttons on hover */}
                {isAdmin && (
        <div className="absolute bottom-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-20">
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0.5 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800/70" onClick={(e) => { e.stopPropagation(); openEditDialog(entry); }} title="Edit">
                                        <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0.5 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/70" onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }} title="Delete">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                </div>
                )}
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            /* Timetable Table Display (Alternative View) */
            <div className={`${glassCardClasses} overflow-x-auto`}>
              <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
                <List className="mr-2 h-6 w-6 opacity-80"/>Timetable List
              </h2>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
                    <TableHead className={`${titleTextClasses} font-semibold`}>Section</TableHead>
                    <TableHead className={`${titleTextClasses} font-semibold`}>Subject</TableHead>
                    <TableHead className={`${titleTextClasses} font-semibold`}>Teacher</TableHead>
                    <TableHead className={`${titleTextClasses} font-semibold`}>Day</TableHead>
                    <TableHead className={`${titleTextClasses} font-semibold`}>Time</TableHead>
                    <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Room</TableHead>
                    <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetableEntries.length === 0 ? (
                    <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                      <TableCell colSpan="7" className={`text-center py-10 ${descriptionTextClasses}`}>
                        No timetable entries found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    timetableEntries.map((entry) => (
                      <TableRow key={entry.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                        <TableCell className={`${descriptionTextClasses} font-medium`}>{getSectionFullName(entry.sectionId)}</TableCell>
                        <TableCell className={`${descriptionTextClasses}`}>{getSubjectNameDisplay(entry.subjectId)}</TableCell>
                        <TableCell className={`${descriptionTextClasses}`}>{getTeacherFullName(entry.staffId)}</TableCell>
                        <TableCell className={`${descriptionTextClasses}`}>{getDayNameDisplay(entry.dayOfWeek)}</TableCell>
                        <TableCell className={`${descriptionTextClasses}`}>{`${entry.startTime} - ${entry.endTime}`}</TableCell>
                        <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{getRoomNameDisplay(entry.roomId)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 md:gap-2">
                            {isAdmin && (
                              <>
                                <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(entry)} title="Edit Timetable Entry"> <Edit3 className="h-4 w-4" /> </Button>
                                <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(entry.id)} title="Delete Timetable Entry"> <Trash2 className="h-4 w-4" /> </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StudentTimetableView() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [section, setSection] = useState(null);
  const [isGridView, setIsGridView] = useState(true);
  const [showWeekend, setShowWeekend] = useState(false);
  const [rowDensity, setRowDensity] = useState('cozy');
  const rowHeight = useMemo(() => (rowDensity === 'compact' ? 32 : rowDensity === 'comfortable' ? 56 : 40), [rowDensity]);

  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";

  const schoolTimetableStartTime = schoolData?.timetableStartTime || '08:00';
  const schoolTimetableEndTime = schoolData?.timetableEndTime || '17:00';
  const timeSlots = useMemo(() => {
    const slots = [];
    const startHour = parseInt(schoolTimetableStartTime.split(':')[0], 10);
    const startMinute = parseInt(schoolTimetableStartTime.split(':')[1], 10);
    const endHour = parseInt(schoolTimetableEndTime.split(':')[0], 10);
    const endMinute = parseInt(schoolTimetableEndTime.split(':')[1], 10);
    let currentTime = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    while (currentTime < endTotalMinutes) {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      currentTime += 30;
    }
    return slots;
  }, [schoolTimetableStartTime, schoolTimetableEndTime]);

  const days = useMemo(() => (
    showWeekend
      ? [
          { value: '1', label: 'Monday' },
          { value: '2', label: 'Tuesday' },
          { value: '3', label: 'Wednesday' },
          { value: '4', label: 'Thursday' },
          { value: '5', label: 'Friday' },
          { value: '6', label: 'Saturday' },
          { value: '0', label: 'Sunday' },
        ]
      : [
          { value: '1', label: 'Monday' },
          { value: '2', label: 'Tuesday' },
          { value: '3', label: 'Wednesday' },
          { value: '4', label: 'Thursday' },
          { value: '5', label: 'Friday' },
        ]
  ), [showWeekend]);

  const fetchData = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const res = await fetch(`/api/schools/${schoolData.id}/students/me/timetable`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load timetable');
      setSection(data.section || null);
      setItems(Array.isArray(data.timetable) ? data.timetable : []);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [schoolData?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const calculateSpanAndOffset = useCallback((startTime, endTime) => {
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h*60+m; };
    const startMins = toMin(startTime);
    const endMins = toMin(endTime);
    const durationMins = endMins - startMins;
    const gridStartTimeMins = (() => { const [h,m] = (timeSlots[0]||'00:00').split(':').map(Number); return h*60+m; })();
    const offsetMins = startMins - gridStartTimeMins;
    const topOffsetPx = (offsetMins / 30) * rowHeight;
    const heightPx = (durationMins / 30) * rowHeight;
    return { topOffsetPx, heightPx };
  }, [timeSlots, rowHeight]);

  const colorForKey = (key) => {
    const keyStr = String(key || '');
    let h = 0; for (let i = 0; i < keyStr.length; i++) h = (h * 31 + keyStr.charCodeAt(i)) >>> 0;
    const hue = h % 360, s = 70, l = 45;
    return { bg: `hsla(${hue}, ${s}%, ${Math.min(92, l + 40)}%, 0.35)`, border: `hsl(${hue} ${s}% ${Math.max(30, l - 5)}%)`, text: '#0b1324' };
  };

  return (
    <RequireRole role="STUDENT">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
              <CalendarDays className="mr-3 h-8 w-8 opacity-80"/>My Timetable
            </h1>
            <p className={descriptionTextClasses}>{section ? `Section: ${section.class?.name || ''} - ${section.name}` : 'No current section found.'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsGridView(true)} className={`${isGridView ? primaryButtonClasses : outlineButtonClasses}`}>Grid</Button>
            <Button variant="outline" onClick={() => setIsGridView(false)} className={`${!isGridView ? primaryButtonClasses : outlineButtonClasses}`}>List</Button>
            <Button variant="outline" onClick={() => window.print()} className={outlineButtonClasses}>Print</Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
        ) : items.length === 0 ? (
          <div className={`${glassCardClasses}`}>
            <p className={descriptionTextClasses}>No timetable entries found for your current section.</p>
          </div>
        ) : (
          <>
            {isGridView ? (
              <div className={`${glassCardClasses} overflow-auto custom-scrollbar`}
                   style={{ maxHeight: 'calc(100vh - 240px)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Label className={titleTextClasses}>Days</Label>
                    <Button variant="outline" size="sm" className={outlineButtonClasses}
                            onClick={() => setShowWeekend(v => !v)}>
                      {showWeekend ? 'Mon–Sun' : 'Mon–Fri'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className={titleTextClasses}>Density</Label>
                    <div className="inline-flex rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                      <button type="button" className={`px-2 py-1 text-xs ${rowDensity==='compact' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`} onClick={() => setRowDensity('compact')}>Compact</button>
                      <button type="button" className={`px-2 py-1 text-xs border-l border-zinc-300 dark:border-zinc-700 ${rowDensity==='cozy' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`} onClick={() => setRowDensity('cozy')}>Cozy</button>
                      <button type="button" className={`px-2 py-1 text-xs border-l border-zinc-300 dark:border-zinc-700 ${rowDensity==='comfortable' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`} onClick={() => setRowDensity('comfortable')}>Comfortable</button>
                    </div>
                  </div>
                </div>

                <div className="grid text-sm border-t border-l border-zinc-200 dark:border-zinc-700 min-w-max"
                     style={{ gridAutoRows: `${rowHeight}px`, gridTemplateColumns: `72px repeat(${days.length}, minmax(140px, 1fr))` }}>
                  <div className="sticky top-0 left-0 bg-white dark:bg-zinc-950 z-40 p-2 border-b border-r border-zinc-200 dark:border-zinc-700"></div>
                  {days.map(day => (
                    <div key={day.value} className="sticky top-0 z-30 text-center font-semibold p-2 bg-gradient-to-b from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 border-b border-r border-zinc-200 dark:border-zinc-700">{day.label}</div>
                  ))}

                  {timeSlots.map((time, timeIndex) => (
                    <React.Fragment key={time}>
                      <div className={`sticky left-0 z-20 p-2 font-medium border-b border-r border-zinc-200 dark:border-zinc-700 h-full flex items-center justify-center ${timeIndex % 2 === 1 ? 'bg-zinc-50 dark:bg-zinc-900/40' : 'bg-white dark:bg-zinc-950'}`}>{time}</div>
                      {days.map(day => (
                        <div key={`${day.value}-${time}`} className={`relative p-0 border-b border-r border-zinc-200 dark:border-zinc-700 h-full`}>
                          {timeIndex % 2 === 1 && (<div className="absolute inset-0 -z-20 bg-zinc-50 dark:bg-zinc-900/40" />)}
                          {items.filter(e => String(e.dayOfWeek) === day.value && e.startTime === time).map((entry) => {
                            const { heightPx } = calculateSpanAndOffset(entry.startTime, entry.endTime);
                            const colors = colorForKey(entry.subject?.id || entry.id);
                            return (
                              <div key={entry.id} className="absolute rounded-md p-1.5 text-[11px] leading-tight overflow-hidden shadow-sm"
                                   style={{ top: 0, height: `${heightPx}px`, left: '3px', right: '3px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
                                <div className="flex items-center justify-between">
                                  <strong className="block truncate pr-2">{entry.subject?.name || 'Subject'}</strong>
                                  <span className="text-[10px] text-zinc-700 dark:text-zinc-300">{entry.startTime}–{entry.endTime}</span>
                                </div>
                                <span className="block truncate text-zinc-700 dark:text-zinc-300">{entry.staff?.name || ''}</span>
                                <span className="block truncate text-zinc-600 dark:text-zinc-400">{entry.room?.name || ''}</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`${glassCardClasses} overflow-x-auto`}>
                <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
                  <List className="mr-2 h-6 w-6 opacity-80"/>Timetable List
                </h2>
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
                      <TableHead className={`${titleTextClasses} font-semibold`}>Day</TableHead>
                      <TableHead className={`${titleTextClasses} font-semibold`}>Time</TableHead>
                      <TableHead className={`${titleTextClasses} font-semibold`}>Subject</TableHead>
                      <TableHead className={`${titleTextClasses} font-semibold`}>Teacher</TableHead>
                      <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Room</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((e) => (
                      <TableRow key={e.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                        <TableCell className={descriptionTextClasses}>{getDayName(e.dayOfWeek)}</TableCell>
                        <TableCell className={descriptionTextClasses}>{e.startTime} - {e.endTime}</TableCell>
                        <TableCell className={descriptionTextClasses}>{e.subject?.name || '-'}</TableCell>
                        <TableCell className={descriptionTextClasses}>{e.staff?.name || '-'}</TableCell>
                        <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{e.room?.name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>
    </RequireRole>
  );
}

export default function TimetablePage() {
  const { data: session, status } = useSession();
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (session?.user?.role === 'STUDENT') {
    return <StudentTimetableView/>;
  }
  return <AdminTimetablePage/>;
}
