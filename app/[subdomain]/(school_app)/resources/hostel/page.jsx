// app/[subdomain]/(school_app)/resources/hostel/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation'; // To read hostelId from URL
import Link from 'next/link';

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
import { Textarea } from "@/components/ui/textarea"; // For location/description in hostel/room
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FilePlus2, Edit3, Trash2, Home, List, PlusCircle, UserCog, BedDouble, Key, DollarSign, Users, Shield, Maximize, ChevronLeft,
  AlertTriangle,
  Loader2
} from 'lucide-react'; // Hostel-related icons

// Initial form data for Hostel
const initialHostelFormData = {
  id: null,
  name: '',
  genderPreference: '',
  capacity: '', // Total capacity from rooms will be derived
  wardenId: '',
};

// Initial form data for Hostel Room
const initialHostelRoomFormData = {
  id: null,
  hostelId: '', // Pre-filled if opened from a hostel
  roomNumber: '',
  roomType: '',
  bedCapacity: '',
  pricePerTerm: '',
};


// Reusable FormFields Component for Hostel
const HostelFormFields = ({ formData, onFormChange, onSelectChange, staffList, isLoadingDeps, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const genderPreferenceOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Mixed', label: 'Mixed' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor="hostelName" className={labelTextClasses}>Hostel Name <span className="text-red-500">*</span></Label>
        <Input id="hostelName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="genderPreference" className={labelTextClasses}>Gender Preference (Optional)</Label>
        <Select name="genderPreference" value={formData.genderPreference || 'none'} onValueChange={(value) => onSelectChange('genderPreference', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select gender" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">No Preference</SelectItem>
            {genderPreferenceOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="capacity" className={labelTextClasses}>Overall Capacity (Optional)</Label>
        <Input id="capacity" name="capacity" type="number" min="0" value={formData.capacity || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., 100" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="wardenId" className={labelTextClasses}>Warden (Optional)</Label>
        <Select name="wardenId" value={formData.wardenId || 'none'} onValueChange={(value) => onSelectChange('wardenId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select warden" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">No Warden</SelectItem>
            {!isLoadingDeps && (!Array.isArray(staffList) || staffList.length === 0) && <SelectItem value="no-staff" disabled>No staff available</SelectItem>}
            {Array.isArray(staffList) && staffList.map(staff => (
              <SelectItem key={staff.id} value={staff.id}>{`${staff.user?.firstName || ''} ${staff.user?.lastName || ''} (${staff.jobTitle})`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// Reusable FormFields Component for Hostel Room
const HostelRoomFormFields = ({ formData, onFormChange, onSelectChange, hostelName, isLoadingDeps, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const roomTypeOptions = [
    { value: 'Dormitory', label: 'Dormitory' },
    { value: 'Single', label: 'Single' },
    { value: 'Double', label: 'Double' },
    { value: 'Triple', label: 'Triple' },
    { value: 'Quad', label: 'Quad' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor="roomNumber" className={labelTextClasses}>Room Number <span className="text-red-500">*</span></Label>
        <Input id="roomNumber" name="roomNumber" value={formData.roomNumber || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2">
        <Label className={labelTextClasses}>Hostel</Label>
        <Input value={hostelName} disabled className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="roomType" className={labelTextClasses}>Room Type (Optional)</Label>
        <Select name="roomType" value={formData.roomType || 'none'} onValueChange={(value) => onSelectChange('roomType', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select type" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">No specific type</SelectItem>
            {roomTypeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="bedCapacity" className={labelTextClasses}>Bed Capacity <span className="text-red-500">*</span></Label>
        <Input id="bedCapacity" name="bedCapacity" type="number" min="1" value={formData.bedCapacity || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder="e.g., 4" />
      </div>
      <div>
        <Label htmlFor="pricePerTerm" className={labelTextClasses}>Price Per Term (Optional)</Label>
        <Input id="pricePerTerm" name="pricePerTerm" type="number" step="0.01" min="0" value={formData.pricePerTerm || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., 500.00" />
      </div>
    </div>
  );
};


export default function ManageHostelPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialHostelId = searchParams.get('hostelId'); // Read hostelId from URL

  const [hostels, setHostels] = useState([]);
  const [hostelRooms, setHostelRooms] = useState([]); // Rooms for the currently selected hostel
  const [staffList, setStaffList] = useState([]); // For warden dropdown

  const [isLoading, setIsLoading] = useState(true); // For main tables
  const [isLoadingDeps, setIsLoadingDeps] = useState(true); // For dropdowns (staff)
  const [error, setError] = useState('');

  const [isHostelDialogOpen, setIsHostelDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);

  const [hostelFormData, setHostelFormData] = useState({ ...initialHostelFormData });
  const [hostelRoomFormData, setHostelRoomFormData] = useState({ ...initialHostelRoomFormData, hostelId: initialHostelId || '' }); // Pre-fill hostelId if from URL

  const [editingHostel, setEditingHostel] = useState(null);
  const [editingHostelRoom, setEditingHostelRoom] = useState(null);
  const [parentHostelForRoom, setParentHostelForRoom] = useState(null); // For adding rooms

  const [isSubmittingHostel, setIsSubmittingHostel] = useState(false);
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);

  const [hostelFormError, setHostelFormError] = useState('');
  const [roomFormError, setRoomFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  // --- Fetching Data ---
  const fetchHostels = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/hostels`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch hostels.'); }
      const data = await response.json();
      setHostels(data.hostels || []);
    } catch (err) { toast.error("Error fetching hostels", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchHostelRooms = useCallback(async () => {
    if (!schoolData?.id || !initialHostelId) {
      setHostelRooms([]); // Clear rooms if no hostel selected
      return;
    }
    setIsLoading(true); // Use main loading for rooms table as well
    setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/hostels/${initialHostelId}/rooms`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || `Failed to fetch rooms for hostel ${initialHostelId}.`); }
      const data = await response.json();
      setHostelRooms(data.hostelRooms || []);
    } catch (err) { toast.error("Error fetching hostel rooms", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id, initialHostelId]);

  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;
    try {
      const [staffRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/people/teachers`), // Fetch all staff for warden dropdown
      ]);

      if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
        const staffData = await staffRes.value.json();
        // Assuming your teachers API returns staff members with user data
        setStaffList(Array.isArray(staffData.teachers) ? staffData.teachers : []);
      } else {
        const errorData = staffRes.status === 'rejected' ? staffRes.reason : await staffRes.value.json().catch(() => ({}));
        console.error("Staff list fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch staff list for dropdown.');
      }

      if (overallError) {
        throw overallError;
      }
    } catch (err) {
      toast.error("Error fetching dropdown dependencies", { description: err.message });
      setError(err.message);
      console.error("Dependency fetch error caught:", err);
    } finally {
      setIsLoadingDeps(false);
    }
  }, [schoolData?.id]);


  useEffect(() => {
    if (schoolData?.id && session) {
      if (!initialHostelId) { // Only fetch main hostels list if not viewing specific rooms
        fetchHostels();
      } else {
        fetchHostelRooms(); // Fetch rooms if hostelId is in URL
      }
      fetchDropdownDependencies(); // Always fetch dropdowns
    }
  }, [schoolData, session, initialHostelId, fetchHostels, fetchHostelRooms, fetchDropdownDependencies]);

  // --- Hostel Form Handlers ---
  const handleHostelFormChange = (e) => setHostelFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleHostelSelectChange = (name, value) => setHostelFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));

  const openAddHostelDialog = () => {
    setEditingHostel(null);
    setHostelFormData({ ...initialHostelFormData });
    setHostelFormError('');
    setIsHostelDialogOpen(true);
  };

  const openEditHostelDialog = (hostel) => {
    setEditingHostel(hostel);
    setHostelFormData({
      id: hostel.id,
      name: hostel.name || '',
      genderPreference: hostel.genderPreference || '',
      capacity: hostel.capacity?.toString() || '',
      wardenId: hostel.wardenId || '',
    });
    setHostelFormError('');
    setIsHostelDialogOpen(true);
  };

  const handleHostelSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingHostel(true); setHostelFormError('');

    const isEditing = !!editingHostel;
    const payload = {
      name: hostelFormData.name,
      genderPreference: hostelFormData.genderPreference || null,
      capacity: hostelFormData.capacity ? parseInt(hostelFormData.capacity, 10) : null,
      wardenId: hostelFormData.wardenId || null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/resources/hostels/${editingHostel.id}`
      : `/api/schools/${schoolData.id}/resources/hostels`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} hostel.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setHostelFormError(err);
      } else {
        toast.success(`Hostel "${result.hostel?.name}" ${actionText}d successfully!`);
        setIsHostelDialogOpen(false);
        fetchHostels(); // Re-fetch hostels
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setHostelFormError('An unexpected error occurred.');
    } finally { setIsSubmittingHostel(false); }
  };

  const handleDeleteHostel = async (hostelId, hostelName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE hostel "${hostelName}"? This will also delete all associated rooms and student allocations.`)) return;
    const toastId = `delete-hostel-${hostelId}`;
    toast.loading("Deleting hostel...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/hostels/${hostelId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Hostel "${hostelName}" deleted.`, { id: toastId });
      fetchHostels();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Hostel Room Form Handlers ---
  const handleHostelRoomFormChange = (e) => setHostelRoomFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleHostelRoomSelectChange = (name, value) => setHostelRoomFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));

  const openAddRoomDialog = (hostel) => { // Pre-fill hostel context if opening from a specific hostel
    setEditingHostelRoom(null);
    setParentHostelForRoom(hostel);
    setHostelRoomFormData({ ...initialHostelRoomFormData, hostelId: hostel.id });
    setRoomFormError('');
    setIsRoomDialogOpen(true);
  };

  const openEditRoomDialog = (room, hostel) => {
    setEditingHostelRoom(room);
    setParentHostelForRoom(hostel);
    setHostelRoomFormData({
      id: room.id,
      hostelId: room.hostelId,
      roomNumber: room.roomNumber || '',
      roomType: room.roomType || '',
      bedCapacity: room.bedCapacity,
      pricePerTerm: room.pricePerTerm?.toString() || '',
    });
    setRoomFormError('');
    setIsRoomDialogOpen(true);
  };

  const handleHostelRoomSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id || !parentHostelForRoom) return;
    setIsSubmittingRoom(true); setRoomFormError('');

    const isEditing = !!editingHostelRoom;
    const payload = {
      roomNumber: hostelRoomFormData.roomNumber,
      hostelId: parentHostelForRoom.id, // Ensure correct hostelId from context
      roomType: hostelRoomFormData.roomType || null,
      bedCapacity: parseInt(hostelRoomFormData.bedCapacity, 10),
      pricePerTerm: hostelRoomFormData.pricePerTerm ? parseFloat(hostelRoomFormData.pricePerTerm) : null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/resources/hostels/${parentHostelForRoom.id}/rooms/${editingHostelRoom.id}`
      : `/api/schools/${schoolData.id}/resources/hostels/${parentHostelForRoom.id}/rooms`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} hostel room.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setRoomFormError(err);
      } else {
        toast.success(`Hostel Room "${result.hostelRoom?.roomNumber}" ${actionText}d successfully!`);
        setIsRoomDialogOpen(false);
        fetchHostelRooms(); // Re-fetch rooms for the current hostel
        fetchHostels(); // Also refresh hostels to update room counts
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setRoomFormError('An unexpected error occurred.');
    } finally { setIsSubmittingRoom(false); }
  };

  const handleDeleteHostelRoom = async (roomId, roomNumber, hostelId) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE hostel room "${roomNumber}"? This will affect any allocated students.`)) return;
    const toastId = `delete-hostel-room-${roomId}`;
    toast.loading("Deleting room...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/hostels/${hostelId}/rooms/${roomId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Hostel Room "${roomNumber}" deleted.`, { id: toastId });
      fetchHostelRooms(); // Re-fetch rooms
      fetchHostels(); // Also refresh hostels to update room counts
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Helper Functions for Display ---
  const getWardenName = useCallback((id) => {
    const staff = staffList.find(s => s.id === id);
    return staff ? `${staff.user?.firstName || ''} ${staff.user?.lastName || ''}`.trim() : 'N/A';
  }, [staffList]);

  const getHostelName = useCallback((id) => {
    const hostel = hostels.find(h => h.id === id);
    return hostel ? hostel.name : 'N/A';
  }, [hostels]);

  const currentPageTitle = initialHostelId ? `Rooms in ${getHostelName(initialHostelId) || 'Hostel'}` : 'Manage Hostels';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Home className="mr-3 h-8 w-8 opacity-80"/>{currentPageTitle}
          </h1>
          <p className={descriptionTextClasses}>Define and manage school hostels and their rooms.</p>
          {initialHostelId && (
            <p className={`text-sm mt-1 ${descriptionTextClasses}`}>
              <Button variant="link" onClick={() => router.push(`/${schoolData.subdomain}/resources/hostel`)} className="p-0 h-auto text-sky-600 hover:underline dark:text-sky-400">
                <ChevronLeft className="h-4 w-4 mr-1"/>Back to Hostels
              </Button>
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Add Hostel Button (only if not viewing specific rooms) */}
          {!initialHostelId && (
            <Dialog open={isHostelDialogOpen} onOpenChange={(open) => { setIsHostelDialogOpen(open); if (!open) setHostelFormError(''); }}>
              <DialogTrigger asChild>
                <Button className={primaryButtonClasses} onClick={openAddHostelDialog}> <FilePlus2 className="mr-2 h-4 w-4" /> Add New Hostel </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle className={titleTextClasses}>{editingHostel ? 'Edit Hostel' : 'Add New Hostel'}</DialogTitle>
                  <DialogDescription className={descriptionTextClasses}>
                    {editingHostel ? 'Update hostel details.' : 'Create a new hostel record for the school.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleHostelSubmit} className="space-y-6 py-1">
                  <HostelFormFields
                    formData={hostelFormData}
                    onFormChange={handleHostelFormChange}
                    onSelectChange={handleHostelSelectChange}
                    staffList={staffList}
                    isLoadingDeps={isLoadingDeps}
                    isEdit={!!editingHostel}
                  />
                  {hostelFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{hostelFormError}</p> )}
                  <DialogFooter className="pt-6">
                    <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                    <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingHostel || isLoadingDeps}>
                      {isSubmittingHostel ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingHostel ? 'Saving...' : 'Creating...'}</> : editingHostel ? 'Save Changes' : 'Create Hostel'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Add Room Button (only if viewing specific rooms) */}
          {initialHostelId && (
            <Dialog open={isRoomDialogOpen} onOpenChange={(open) => { setIsRoomDialogOpen(open); if (!open) setRoomFormError(''); }}>
              <DialogTrigger asChild>
                <Button className={primaryButtonClasses} onClick={() => openAddRoomDialog({ id: initialHostelId, name: getHostelName(initialHostelId) })}> <BedDouble className="mr-2 h-4 w-4" /> Add New Room </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle className={titleTextClasses}>{editingHostelRoom ? 'Edit Hostel Room' : 'Add New Hostel Room'}</DialogTitle>
                  <DialogDescription className={descriptionTextClasses}>
                    {editingHostelRoom ? 'Update room details.' : `Create a new room for ${parentHostelForRoom?.name || 'the selected hostel'}.`}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleHostelRoomSubmit} className="space-y-6 py-1">
                  <HostelRoomFormFields
                    formData={hostelRoomFormData}
                    onFormChange={handleHostelRoomFormChange}
                    onSelectChange={handleHostelRoomSelectChange}
                    hostelName={parentHostelForRoom?.name || ''}
                    isLoadingDeps={isLoadingDeps}
                    isEdit={!!editingHostelRoom}
                  />
                  {roomFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{roomFormError}</p> )}
                  <DialogFooter className="pt-6">
                    <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                    <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingRoom || isLoadingDeps}>
                      {isSubmittingRoom ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingHostelRoom ? 'Saving...' : 'Creating...'}</> : editingHostelRoom ? 'Save Changes' : 'Create Room'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      {/* Hostels Table (Visible if no specific hostelId in URL) */}
      {!initialHostelId && (
        <div className={`${glassCardClasses} overflow-x-auto`}>
          <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
            <Home className="mr-2 h-6 w-6 opacity-80"/>Defined Hostels
          </h2>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
                <TableHead className={`${titleTextClasses} font-semibold`}>Hostel Name</TableHead>
                <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Gender</TableHead>
                <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Warden</TableHead>
                <TableHead className={`${titleTextClasses} font-semibold text-center`}>Total Rooms</TableHead>
                <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`hostel-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                    <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-10 rounded" /></TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                  </TableRow>
                ))
              ) : hostels.length > 0 ? hostels.map((hostel) => (
                <TableRow key={hostel.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                  <TableCell className={`${descriptionTextClasses} font-medium`}>{hostel.name}</TableCell>
                  <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{hostel.genderPreference || 'Any'}</TableCell>
                  <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{getWardenName(hostel.wardenId)}</TableCell>
                  <TableCell className={`${descriptionTextClasses} text-center`}>{hostel._count?.rooms ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 md:gap-2">
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditHostelDialog(hostel)} title="Edit Hostel"> <Edit3 className="h-4 w-4" /> </Button>
                      {/* Link to manage rooms for this hostel */}
                      <Link href={`/${schoolData.subdomain}/resources/hostel?hostelId=${hostel.id}`} passHref>
                        <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="Manage Rooms"> <BedDouble className="h-4 w-4" /> </Button>
                      </Link>
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteHostel(hostel.id, hostel.name)} title="Delete Hostel"> <Trash2 className="h-4 w-4" /> </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                    No hostels defined yet. Click "Add New Hostel" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Hostel Rooms Table (Visible if specific hostelId in URL) */}
      {initialHostelId && (
        <div className={`${glassCardClasses} overflow-x-auto`}>
          <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
            <BedDouble className="mr-2 h-6 w-6 opacity-80"/>Rooms for {getHostelName(initialHostelId)}
          </h2>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
                <TableHead className={`${titleTextClasses} font-semibold`}>Room Number</TableHead>
                <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Type</TableHead>
                <TableHead className={`${titleTextClasses} font-semibold text-center`}>Capacity</TableHead>
                <TableHead className={`${titleTextClasses} font-semibold text-center`}>Occupancy</TableHead>
                <TableHead className={`${titleTextClasses} font-semibold text-right hidden md:table-cell`}>Price/Term</TableHead>
                <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? ( // Using isLoading for rooms table as well
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`room-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                    <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                    <TableCell className="text-right hidden md:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                  </TableRow>
                ))
              ) : hostelRooms.length > 0 ? hostelRooms.map((room) => (
                <TableRow key={room.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                  <TableCell className={`${descriptionTextClasses} font-medium`}>{room.roomNumber}</TableCell>
                  <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{room.roomType || 'N/A'}</TableCell>
                  <TableCell className={`${descriptionTextClasses} text-center`}>{room.bedCapacity}</TableCell>
                  <TableCell className={`${descriptionTextClasses} text-center`}>{room.currentOccupancy}</TableCell>
                  <TableCell className={`${descriptionTextClasses} text-right hidden md:table-cell`}>{room.pricePerTerm ? `$${room.pricePerTerm.toFixed(2)}` : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 md:gap-2">
                      {/* Link to allocate students (future feature) */}
                      {/* <Link href={`/${schoolData.subdomain}/resources/hostel/allocate?roomId=${room.id}`} passHref>
                        <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="Allocate Students"> <Users className="h-4 w-4" /> </Button>
                      </Link> */}
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditRoomDialog(room, { id: initialHostelId, name: getHostelName(initialHostelId) })} title="Edit Room"> <Edit3 className="h-4 w-4" /> </Button>
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteHostelRoom(room.id, room.roomNumber, room.hostelId)} title="Delete Room"> <Trash2 className="h-4 w-4" /> </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell colSpan="6" className={`text-center py-10 ${descriptionTextClasses}`}>
                    No rooms defined for this hostel yet. Click "Add New Room" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
