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
import { Clock, CalendarDays, PlusCircle, Loader2, AlertTriangle, Home, BookOpen, UserCog, Layers, Filter, Maximize, Edit3, Trash2, XCircle, Grid, List, Lightbulb } from 'lucide-react'; // Added icons

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

  // State for Timetable Suggestion
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [suggestionFormData, setSuggestionFormData] = useState({ ...initialSuggestionFormData });
  const [suggestedSlot, setSuggestedSlot] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');


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

    const topOffsetPx = (offsetMins / 30) * 60; // Assuming 60px height for each 30-minute slot
    const heightPx = (durationMins / 30) * 60; // Height of the entry card

    return { topOffsetPx, heightPx };
  }, [timeSlots]);


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
    if (schoolData?.id && session) {
      fetchTimetableEntries();
      fetchDropdownDependencies();
    }
  }, [schoolData, session, fetchTimetableEntries, fetchDropdownDependencies]);


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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <CalendarDays className="mr-3 h-8 w-8 opacity-80"/>Manage Timetable
          </h1>
          <p className={descriptionTextClasses}>Create and manage class schedules for sections, teachers, and rooms.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Add Timetable Entry Button */}
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
        </div>
      </div>

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
      <div className={`${glassCardClasses} flex flex-wrap items-center gap-4`}>
        <h3 className={`text-md font-semibold ${titleTextClasses} mr-2`}>Filters:</h3>
        <Select value={filterSectionId} onValueChange={(value) => setFilterSectionId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Section" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Sections</SelectItem>
            {Array.isArray(sections) && sections.map(sec => <SelectItem key={sec.id} value={sec.id}>{getSectionFullName(sec.id)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStaffId} onValueChange={(value) => setFilterStaffId(value === 'all' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${filterInputClasses} w-[180px]`}> <SelectValue placeholder="Filter by Teacher" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="all">All Teachers</SelectItem>
            {Array.isArray(teachers) && teachers.map(teach => <SelectItem key={teach.id} value={teach.id}>{getTeacherFullName(teach.id)}</SelectItem>)}
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

        <Button onClick={() => { setFilterSectionId(''); setFilterStaffId(''); setFilterDayOfWeek(''); setFilterRoomId(''); }} variant="outline" className={outlineButtonClasses}>
          Reset Filters
        </Button>
      </div>

      {/* Suggest API Button & Dialog */}
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
            </div>
            <div>
              <Label htmlFor="s_staffId" className={descriptionTextClasses}>Teacher <span className="text-red-500">*</span></Label>
              <Select name="staffId" value={suggestionFormData.staffId || ''} onValueChange={(value) => handleSuggestionSelectChange('staffId', value)} disabled={isLoadingDeps}>
                <SelectTrigger className={`${filterInputClasses} mt-1`}> <SelectValue placeholder="Select teacher" /> </SelectTrigger>
                <SelectContent><SelectItem value="none">Any Teacher</SelectItem>{Array.isArray(teachers) && teachers.map(teach => <SelectItem key={teach.id} value={teach.id}>{getTeacherFullName(teach.id)}</SelectItem>)}</SelectContent>
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


      {/* Timetable Grid Display */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
        </div>
      ) : (
        <>
          {isGridView ? (
            /* Timetable Grid Display */
            <div className={`${glassCardClasses} overflow-x-auto custom-scrollbar`}>
              {/* Note: This grid is fixed height per 30-min slot. Cards span visually using absolute positioning. */}
              <div
                className="grid grid-cols-[auto_repeat(7,minmax(120px,1fr))] text-sm border-t border-l border-zinc-200 dark:border-zinc-700"
                style={{ gridAutoRows: '60px' }} // 30 minutes per 60px height
                onMouseLeave={handleDragLeave} // Clear dragged over cell on mouse leave
              >
                {/* Corner for empty space */}
                <div className="sticky left-0 bg-white dark:bg-zinc-950 z-20 p-2 border-b border-r border-zinc-200 dark:border-zinc-700"></div>
                {/* Day Headers */}
                {getDayOfWeekOptions.map(day => (
                  <div key={day.value} className="text-center font-bold p-2 bg-zinc-100 dark:bg-zinc-800 border-b border-r border-zinc-200 dark:border-zinc-700">
                    {day.label}
                  </div>
                ))}

                {/* Time Rows */}
                {timeSlots.map((time, timeIndex) => (
                  <React.Fragment key={time}>
                    {/* Time Slot Header */}
                    <div className="sticky left-0 bg-white dark:bg-zinc-950 z-20 p-2 font-bold border-b border-r border-zinc-200 dark:border-zinc-700 min-h-[60px] flex items-center justify-center">
                      {time}
                    </div>
                    {/* Cells for each day */}
                    {getDayOfWeekOptions.map(day => (
                      <div
                        key={`${day.value}-${time}`}
                        className={`relative p-0 border-b border-r border-zinc-200 dark:border-zinc-700 min-h-[60px]
                          ${draggedOverCell?.day === day.value && draggedOverCell?.time === time ? 'bg-sky-200/50 dark:bg-sky-800/50' : ''}`}
                        onDragOver={(e) => handleDragOver(e, day.value, time)}
                        onDrop={(e) => handleDrop(e, day.value, time)}
                        onDragLeave={handleDragLeave}
                      >
                        {/* Render timetable entries that START EXACTLY at this time slot */}
                        {positionedTimetableEntries
                          .filter(entry => entry.dayOfWeek.toString() === day.value && entry.startTime === time)
                          .map((entry, entryIndex) => {
                            const { topOffsetPx: entryRelativeTop, heightPx: entryHeight } = calculateSpanAndOffset(entry.startTime, entry.endTime);
                            const cellStartTimeMins = timeToMinutes(time);

                            // Corrected: top in the current cell is 0 if it starts at this slot, height is full span
                            const relativeTopInCell = 0;

                            return (
                              <div
                                key={entry.id}
                                draggable="true" // Make the card draggable
                                onDragStart={(e) => handleDragStart(e, entry)}
                                onDragEnd={handleDragEnd}
                                className="group absolute bg-sky-100 dark:bg-sky-900 border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200 rounded p-1 text-xs cursor-pointer hover:bg-sky-200 dark:hover:bg-sky-800 transition-colors z-10 overflow-hidden break-words"
                                style={{
                                  top: `${relativeTopInCell}px`,
                                  height: `${entryHeight}px`,
                                  left: '2px',
                                  right: '2px',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent opening Add dialog when clicking on an existing entry
                                    openEditDialog(entry);
                                }}
                              >
                                <strong className="block truncate">{getSubjectNameDisplay(entry.subjectId)}</strong>
                                <span className="block truncate text-zinc-700 dark:text-zinc-300">{getSectionFullName(entry.sectionId)}</span>
                                <span className="block truncate text-zinc-600 dark:text-zinc-400 text-xs">{getTeacherFullName(entry.staffId)}</span>
                                <span className="block truncate text-zinc-600 dark:text-zinc-400 text-xs">({getRoomNameDisplay(entry.roomId)})</span>

                                {/* Edit/Delete buttons on hover */}
                                <div className="absolute bottom-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-20">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0.5 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800/70" onClick={(e) => { e.stopPropagation(); openEditDialog(entry); }} title="Edit">
                                        <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0.5 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/70" onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }} title="Delete">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
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
                            <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(entry)} title="Edit Timetable Entry"> <Edit3 className="h-4 w-4" /> </Button>
                            <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(entry.id)} title="Delete Timetable Entry"> <Trash2 className="h-4 w-4" /> </Button>
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

function StudentTimetablePlaceholder() {
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  return (
    <RequireRole role="STUDENT">
      <div className="space-y-4">
        <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
          <CalendarDays className="mr-3 h-8 w-8 opacity-80"/>My Timetable
        </h1>
        <div className="p-6 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-700/50">
          <p className={descriptionTextClasses}>
            Your timetable view is coming soon. In the meantime, you can check your assignments and grades from the Academics section.
          </p>
        </div>
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
    return <StudentTimetablePlaceholder/>;
  }
  return <AdminTimetablePage/>;
}
