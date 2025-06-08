// app/[subdomain]/(school_app)/resources/rooms/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation'; // To read buildingId from URL
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For room type and building dropdowns
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FilePlus2, Edit3, Trash2, Home, List, MapPin, Loader2, AlertTriangle, Building as BuildingIcon, Layers, Maximize
} from 'lucide-react'; // BuildingIcon to avoid conflict with imported Building

// Initial form data for Room
const initialRoomFormData = {
  id: null, // For editing
  name: '',
  roomType: '',
  capacity: '',
  buildingId: '', // Link to a building
};

// Reusable FormFields Component for Room
const RoomFormFields = ({ formData, onFormChange, onSelectChange, buildingsList, isLoadingDeps, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const roomTypeOptions = [
    { value: 'Classroom', label: 'Classroom' },
    { value: 'Laboratory', label: 'Laboratory' },
    { value: 'Library', label: 'Library' },
    { value: 'Office', label: 'Office' },
    { value: 'Staff Room', label: 'Staff Room' },
    { value: 'Computer Lab', label: 'Computer Lab' },
    { value: 'Auditorium', label: 'Auditorium' },
    { value: 'Hall', label: 'Hall' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div className="sm:col-span-2">
        <Label htmlFor="roomName" className={labelTextClasses}>Room Name/Number <span className="text-red-500">*</span></Label>
        <Input id="roomName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
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
        <Label htmlFor="capacity" className={labelTextClasses}>Capacity (Optional)</Label>
        <Input id="capacity" name="capacity" type="number" min="0" value={formData.capacity || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., 30" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="buildingId" className={labelTextClasses}>Building (Optional)</Label>
        <Select name="buildingId" value={formData.buildingId || 'none'} onValueChange={(value) => onSelectChange('buildingId', value === 'none' ? '' : value)} disabled={isLoadingDeps}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select building" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">No specific building</SelectItem>
            {!isLoadingDeps && (!Array.isArray(buildingsList) || buildingsList.length === 0) && <SelectItem value="no-buildings" disabled>No buildings available</SelectItem>}
            {Array.isArray(buildingsList) && buildingsList.map(building => <SelectItem key={building.id} value={building.id}>{building.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};


export default function ManageRoomsPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const initialBuildingId = searchParams.get('buildingId'); // Read buildingId from URL

  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]); // For building dropdown
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeps, setIsLoadingDeps] = useState(true); // For dropdowns
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...initialRoomFormData, buildingId: initialBuildingId || '' }); // Pre-fill buildingId if from URL
  const [editingRoom, setEditingRoom] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  // --- Fetching Data ---
  const fetchRooms = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const queryParams = new URLSearchParams();
      if (initialBuildingId) {
        queryParams.append('buildingId', initialBuildingId);
      }
      const response = await fetch(`/api/schools/${schoolData.id}/resources/rooms?${queryParams.toString()}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch rooms.'); }
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (err) { toast.error("Error fetching rooms", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id, initialBuildingId]); // Depend on initialBuildingId

  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;
    try {
      const [buildingsRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/resources/buildings`),
      ]);

      if (buildingsRes.status === 'fulfilled' && buildingsRes.value.ok) {
        const buildingsData = await buildingsRes.value.json();
        setBuildings(Array.isArray(buildingsData.buildings) ? buildingsData.buildings : []);
      } else {
        const errorData = buildingsRes.status === 'rejected' ? buildingsRes.reason : await buildingsRes.value.json().catch(() => ({}));
        console.error("Buildings fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch buildings list.');
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
      fetchRooms();
      fetchDropdownDependencies();
    }
  }, [schoolData, session, fetchRooms, fetchDropdownDependencies]);

  // --- Form Handlers ---
  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const openAddDialog = () => {
    setEditingRoom(null);
    setFormData({ ...initialRoomFormData, buildingId: initialBuildingId || '' }); // Pre-fill buildingId again
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (room) => {
    setEditingRoom(room);
    setFormData({
      id: room.id,
      name: room.name || '',
      roomType: room.roomType || '',
      capacity: room.capacity?.toString() || '',
      buildingId: room.buildingId || '',
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmitting(true); setFormError('');

    const isEditing = !!editingRoom;
    const payload = {
      name: formData.name,
      roomType: formData.roomType || null,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
      buildingId: formData.buildingId || null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/resources/rooms/${editingRoom.id}`
      : `/api/schools/${schoolData.id}/resources/rooms`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} room.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setFormError(err);
      } else {
        toast.success(`Room "${result.room?.name}" ${actionText}d successfully!`);
        setIsDialogOpen(false);
        fetchRooms(); // Re-fetch rooms
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setFormError('An unexpected error occurred.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (roomId, roomName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE room "${roomName}"? This may affect associated exam schedules or timetable entries.`)) return;
    const toastId = `delete-room-${roomId}`;
    toast.loading("Deleting room...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/rooms/${roomId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Room "${roomName}" deleted.`, { id: toastId });
      fetchRooms();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Helper Functions for Display ---
  const getBuildingName = useCallback((id) => {
    const building = buildings.find(b => b.id === id);
    return building ? building.name : 'N/A';
  }, [buildings]);

  const pageTitle = initialBuildingId ? `Rooms in ${getBuildingName(initialBuildingId)}` : 'Manage Rooms';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Home className="mr-3 h-8 w-8 opacity-80"/>{pageTitle}
          </h1>
          <p className={descriptionTextClasses}>Define and manage physical rooms within your school buildings.</p>
          {initialBuildingId && (
            <p className={`text-sm mt-1 ${descriptionTextClasses}`}>
              <Link href={`/${schoolData.subdomain}/resources/buildings`} className="text-sky-600 hover:underline dark:text-sky-400">
                &larr; Back to Buildings
              </Link>
            </p>
          )}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setFormError(''); }}>
          <DialogTrigger asChild>
            <Button className={primaryButtonClasses} onClick={openAddDialog}> <FilePlus2 className="mr-2 h-4 w-4" /> Add New Room </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                {editingRoom ? 'Update room details.' : 'Create a new room record for the school.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-1">
              <RoomFormFields
                formData={formData}
                onFormChange={handleFormChange}
                onSelectChange={handleSelectChange}
                buildingsList={buildings}
                isLoadingDeps={isLoadingDeps}
                isEdit={!!editingRoom}
              />
              {formError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{formError}</p> )}
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting || isLoadingDeps}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingRoom ? 'Saving...' : 'Creating...'}</> : editingRoom ? 'Save Changes' : 'Create Room'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Room Name/Number</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Type</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Capacity</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden lg:table-cell`}>Building</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : rooms.length > 0 ? rooms.map((room) => (
              <TableRow key={room.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{room.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{room.roomType || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{room.capacity || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden lg:table-cell`}>{getBuildingName(room.buildingId)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDialog(room)} title="Edit Room"> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(room.id, room.name)} title="Delete Room"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No rooms defined yet. Click "Add New Room" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
