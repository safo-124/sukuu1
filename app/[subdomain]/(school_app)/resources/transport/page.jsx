// app/[subdomain]/(school_app)/resources/transport/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FilePlus2, Edit3, Trash2, Bus, Route as RouteIcon, Users, Loader2, AlertTriangle, Car, ClipboardList, PlusCircle
} from 'lucide-react'; // Renamed Route to RouteIcon to avoid conflict with model name

// Initial form data for Vehicle
const initialVehicleFormData = {
  id: null,
  registrationNumber: '',
  make: '',
  model: '',
  capacity: '',
  status: '', // e.g., "Active", "Maintenance", "Inactive"
};

// Initial form data for Route
const initialRouteFormData = {
  id: null,
  name: '',
  description: '',
  stops: '', // Will be handled as a comma-separated string for simplicity in UI
};

// Initial form data for Driver
const initialDriverFormData = {
  id: null, // Driver ID
  staffId: '', // Link to Staff member
  licenseNumber: '',
  contactNumber: '',
};


// Reusable FormFields Component for Vehicle
const VehicleFormFields = ({ formData, onFormChange, onSelectChange, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  const vehicleStatusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Maintenance', label: 'In Maintenance' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Retired', label: 'Retired' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div>
        <Label htmlFor="registrationNumber" className={labelTextClasses}>Registration Number <span className="text-red-500">*</span></Label>
        <Input id="registrationNumber" name="registrationNumber" value={formData.registrationNumber || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="make" className={labelTextClasses}>Make (Optional)</Label>
        <Input id="make" name="make" value={formData.make || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="model" className={labelTextClasses}>Model (Optional)</Label>
        <Input id="model" name="model" value={formData.model || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="capacity" className={labelTextClasses}>Capacity (Seats) (Optional)</Label>
        <Input id="capacity" name="capacity" type="number" min="1" value={formData.capacity || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder="e.g., 30" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="status" className={labelTextClasses}>Status (Optional)</Label>
        <Select name="status" value={formData.status || 'none'} onValueChange={(value) => onSelectChange('status', value === 'none' ? '' : value)}>
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select status" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectItem value="none">No Specific Status</SelectItem>
            {vehicleStatusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// Reusable FormFields Component for Route
const RouteFormFields = ({ formData, onFormChange, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  return (
    <div className="grid grid-cols-1 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div>
        <Label htmlFor="routeName" className={labelTextClasses}>Route Name <span className="text-red-500">*</span></Label>
        <Input id="routeName" name="name" value={formData.name || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor="description" className={labelTextClasses}>Description (Optional)</Label>
        <Textarea id="description" name="description" value={formData.description || ''} onChange={onFormChange} rows={2} className={`${inputTextClasses} mt-1`} placeholder="e.g., Morning pickup, Evening drop-off" />
      </div>
      <div>
        <Label htmlFor="stops" className={labelTextClasses}>Stops (Comma-separated) (Optional)</Label>
        <Textarea id="stops" name="stops" value={formData.stops || ''} onChange={onFormChange} rows={3} className={`${inputTextClasses} mt-1`} placeholder="e.g., Town Hall, Market Square, City Center" />
      </div>
    </div>
  );
};

// Reusable FormFields Component for Driver
const DriverFormFields = ({ formData, onFormChange, onSelectChange, staffList, isLoadingDeps, isEdit = false }) => {
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
      <div>
        <Label htmlFor="staffId" className={labelTextClasses}>Staff Member (Driver) <span className="text-red-500">*</span></Label>
        <Select name="staffId" value={formData.staffId || ''} onValueChange={(value) => onSelectChange('staffId', value)} disabled={isLoadingDeps || isEdit}> {/* Staff ID is usually immutable after creation */}
          <SelectTrigger className={`${inputTextClasses} mt-1`}> <SelectValue placeholder="Select staff member" /> </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            {!isLoadingDeps && (!Array.isArray(staffList) || staffList.length === 0) && <SelectItem value="no-staff" disabled>No staff available</SelectItem>}
            {Array.isArray(staffList) && staffList.map(staff => (
              <SelectItem key={staff.id} value={staff.id}>
                {`${staff.user?.firstName || ''} ${staff.user?.lastName || ''} (${staff.jobTitle})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="licenseNumber" className={labelTextClasses}>License Number <span className="text-red-500">*</span></Label>
        <Input id="licenseNumber" name="licenseNumber" value={formData.licenseNumber || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="contactNumber" className={labelTextClasses}>Contact Number (Optional)</Label>
        <Input id="contactNumber" name="contactNumber" type="tel" value={formData.contactNumber || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
    </div>
  );
};


export default function ManageTransportationPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [staffList, setStaffList] = useState([]); // For driver dropdown

  const [isLoading, setIsLoading] = useState(true); // For main tables
  const [isLoadingDeps, setIsLoadingDeps] = useState(true); // For staff dropdown
  const [error, setError] = useState('');

  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);

  const [vehicleFormData, setVehicleFormData] = useState({ ...initialVehicleFormData });
  const [routeFormData, setRouteFormData] = useState({ ...initialRouteFormData });
  const [driverFormData, setDriverFormData] = useState({ ...initialDriverFormData });

  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);

  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [isSubmittingRoute, setIsSubmittingRoute] = useState(false);
  const [isSubmittingDriver, setIsSubmittingDriver] = useState(false);

  const [vehicleFormError, setVehicleFormError] = useState('');
  const [routeFormError, setRouteFormError] = useState('');
  const [driverFormError, setDriverFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  // --- Fetching Data ---
  const fetchVehicles = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/vehicles`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch vehicles.'); }
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (err) { toast.error("Error fetching vehicles", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchRoutes = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/routes`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch routes.'); }
      const data = await response.json();
      setRoutes(data.routes || []);
    } catch (err) { toast.error("Error fetching routes", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchDrivers = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/drivers`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch drivers.'); }
      const data = await response.json();
      setDrivers(data.drivers || []);
    } catch (err) { toast.error("Error fetching drivers", { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id]);

  const fetchDropdownDependencies = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingDeps(true);
    let overallError = null;
    try {
      const [staffRes] = await Promise.allSettled([
        fetch(`/api/schools/${schoolData.id}/people/teachers`), // Fetch all staff for driver dropdown
      ]);

      if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
        const staffData = await staffRes.value.json();
        // Assuming your teachers API returns staff members with user data
        setStaffList(Array.isArray(staffData.teachers) ? staffData.teachers : []);
      } else {
        const errorData = staffRes.status === 'rejected' ? staffRes.reason : await staffRes.value.json().catch(() => ({}));
        console.error("Staff list fetch failed:", errorData);
        overallError = overallError || new Error(errorData.error || 'Failed to fetch staff list for drivers.');
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
      fetchVehicles();
      fetchRoutes();
      fetchDrivers();
      fetchDropdownDependencies();
    }
  }, [schoolData, session, fetchVehicles, fetchRoutes, fetchDrivers, fetchDropdownDependencies]);

  // --- Vehicle Form Handlers ---
  const handleVehicleFormChange = (e) => setVehicleFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleVehicleSelectChange = (name, value) => setVehicleFormData(prev => ({ ...prev, [name]: value }));

  const openAddVehicleDialog = () => {
    setEditingVehicle(null);
    setVehicleFormData({ ...initialVehicleFormData });
    setVehicleFormError('');
    setIsVehicleDialogOpen(true);
  };

  const openEditVehicleDialog = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleFormData({
      id: vehicle.id,
      registrationNumber: vehicle.registrationNumber || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      capacity: vehicle.capacity?.toString() || '',
      status: vehicle.status || '',
    });
    setVehicleFormError('');
    setIsVehicleDialogOpen(true);
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingVehicle(true); setVehicleFormError('');

    const isEditing = !!editingVehicle;
    const payload = {
      registrationNumber: vehicleFormData.registrationNumber,
      make: vehicleFormData.make || null,
      model: vehicleFormData.model || null,
      capacity: vehicleFormData.capacity ? parseInt(vehicleFormData.capacity, 10) : null,
      status: vehicleFormData.status || null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/resources/vehicles/${editingVehicle.id}`
      : `/api/schools/${schoolData.id}/resources/vehicles`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} vehicle.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setVehicleFormError(err);
      } else {
        toast.success(`Vehicle "${result.vehicle?.registrationNumber}" ${actionText}d successfully!`);
        setIsVehicleDialogOpen(false);
        fetchVehicles(); // Re-fetch vehicles
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setVehicleFormError('An unexpected error occurred.');
    } finally { setIsSubmittingVehicle(false); }
  };

  const handleDeleteVehicle = async (vehicleId, registrationNumber) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE vehicle "${registrationNumber}"? This will affect any associated assignments.`)) return;
    const toastId = `delete-vehicle-${vehicleId}`;
    toast.loading("Deleting vehicle...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/vehicles/${vehicleId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Vehicle "${registrationNumber}" deleted.`, { id: toastId });
      fetchVehicles();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Route Form Handlers ---
  const handleRouteFormChange = (e) => setRouteFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const openAddRouteDialog = () => {
    setEditingRoute(null);
    setRouteFormData({ ...initialRouteFormData });
    setRouteFormError('');
    setIsRouteDialogOpen(true);
  };

  const openEditRouteDialog = (route) => {
    setEditingRoute(route);
    setRouteFormData({
      id: route.id,
      name: route.name || '',
      description: route.description || '',
      stops: Array.isArray(route.stops) ? route.stops.join(', ') : (route.stops || ''), // Convert array to comma-separated string
    });
    setRouteFormError('');
    setIsRouteDialogOpen(true);
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingRoute(true); setRouteFormError('');

    const isEditing = !!editingRoute;
    const payload = {
      name: routeFormData.name,
      description: routeFormData.description || null,
      stops: routeFormData.stops ? routeFormData.stops.split(',').map(s => s.trim()).filter(Boolean) : null, // Convert string to array
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/resources/routes/${editingRoute.id}`
      : `/api/schools/${schoolData.id}/resources/routes`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} route.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setRouteFormError(err);
      } else {
        toast.success(`Route "${result.route?.name}" ${actionText}d successfully!`);
        setIsRouteDialogOpen(false);
        fetchRoutes(); // Re-fetch routes
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setRouteFormError('An unexpected error occurred.');
    } finally { setIsSubmittingRoute(false); }
  };

  const handleDeleteRoute = async (routeId, routeName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE route "${routeName}"? This will affect any associated vehicle assignments or student enrollments.`)) return;
    const toastId = `delete-route-${routeId}`;
    toast.loading("Deleting route...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/routes/${routeId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Route "${routeName}" deleted.`, { id: toastId });
      fetchRoutes();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Driver Form Handlers ---
  const handleDriverFormChange = (e) => setDriverFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDriverSelectChange = (name, value) => setDriverFormData(prev => ({ ...prev, [name]: value }));

  const openAddDriverDialog = () => {
    setEditingDriver(null);
    setDriverFormData({ ...initialDriverFormData });
    setDriverFormError('');
    setIsDriverDialogOpen(true);
  };

  const openEditDriverDialog = (driver) => {
    setEditingDriver(driver);
    setDriverFormData({
      id: driver.id,
      staffId: driver.staffId,
      licenseNumber: driver.licenseNumber || '',
      contactNumber: driver.contactNumber || '',
    });
    setDriverFormError('');
    setIsDriverDialogOpen(true);
  };

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingDriver(true); setDriverFormError('');

    const isEditing = !!editingDriver;
    const payload = {
      staffId: driverFormData.staffId,
      licenseNumber: driverFormData.licenseNumber,
      contactNumber: driverFormData.contactNumber || null,
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/resources/drivers/${editingDriver.id}`
      : `/api/schools/${schoolData.id}/resources/drivers`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} driver.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setDriverFormError(err);
      } else {
        toast.success(`Driver "${result.driver?.staff?.user?.firstName} ${result.driver?.staff?.user?.lastName || ''}" ${actionText}d successfully!`);
        setIsDriverDialogOpen(false);
        fetchDrivers(); // Re-fetch drivers
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setDriverFormError('An unexpected error occurred.');
    } finally { setIsSubmittingDriver(false); }
  };

  const handleDeleteDriver = async (driverId, driverName) => {
    if (!schoolData?.id) return;
    if (!window.confirm(`Are you sure you want to DELETE driver "${driverName}"? This will remove their driver profile and may affect assignments.`)) return;
    const toastId = `delete-driver-${driverId}`;
    toast.loading("Deleting driver...", { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/drivers/${driverId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      toast.success(result.message || `Driver "${driverName}" deleted.`, { id: toastId });
      fetchDrivers();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  // --- Helper Functions for Display ---
  const getDriverStaffName = useCallback((staffId) => {
    const driver = drivers.find(d => d.staffId === staffId);
    return driver ? `${driver.staff?.user?.firstName || ''} ${driver.staff?.user?.lastName || ''}`.trim() : 'N/A';
  }, [drivers]);

  const getStaffFullName = useCallback((id) => {
    const staff = staffList.find(s => s.id === id);
    return staff ? `${staff.user?.firstName || ''} ${staff.user?.lastName || ''}`.trim() : 'N/A';
  }, [staffList]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Bus className="mr-3 h-8 w-8 opacity-80"/>Manage Transportation
          </h1>
          <p className={descriptionTextClasses}>Oversee school vehicles, routes, and drivers.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Add Vehicle Button */}
          <Dialog open={isVehicleDialogOpen} onOpenChange={(open) => { setIsVehicleDialogOpen(open); if (!open) setVehicleFormError(''); }}>
            <DialogTrigger asChild>
              <Button className={primaryButtonClasses} onClick={openAddVehicleDialog}> <Car className="mr-2 h-4 w-4" /> Add Vehicle </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className={titleTextClasses}>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                <DialogDescription className={descriptionTextClasses}>
                  {editingVehicle ? 'Update vehicle details.' : 'Register a new school vehicle.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleVehicleSubmit} className="space-y-6 py-1">
                <VehicleFormFields
                  formData={vehicleFormData}
                  onFormChange={handleVehicleFormChange}
                  onSelectChange={handleVehicleSelectChange}
                  isEdit={!!editingVehicle}
                />
                {vehicleFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{vehicleFormError}</p> )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingVehicle}>
                    {isSubmittingVehicle ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingVehicle ? 'Saving...' : 'Creating...'}</> : editingVehicle ? 'Save Changes' : 'Add Vehicle'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Route Button */}
          <Dialog open={isRouteDialogOpen} onOpenChange={(open) => { setIsRouteDialogOpen(open); if (!open) setRouteFormError(''); }}>
            <DialogTrigger asChild>
              <Button className={outlineButtonClasses} onClick={openAddRouteDialog}> <RouteIcon className="mr-2 h-4 w-4" /> Add Route </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className={titleTextClasses}>{editingRoute ? 'Edit Route' : 'Add New Route'}</DialogTitle>
                <DialogDescription className={descriptionTextClasses}>
                  {editingRoute ? 'Update route details.' : 'Define a new transport route.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRouteSubmit} className="space-y-6 py-1">
                <RouteFormFields
                  formData={routeFormData}
                  onFormChange={handleRouteFormChange}
                  isEdit={!!editingRoute}
                />
                {routeFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{routeFormError}</p> )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingRoute}>
                    {isSubmittingRoute ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingRoute ? 'Saving...' : 'Creating...'}</> : editingRoute ? 'Save Changes' : 'Add Route'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Driver Button */}
          <Dialog open={isDriverDialogOpen} onOpenChange={(open) => { setIsDriverDialogOpen(open); if (!open) setDriverFormError(''); }}>
            <DialogTrigger asChild>
              <Button className={outlineButtonClasses} onClick={openAddDriverDialog}> <Users className="mr-2 h-4 w-4" /> Add Driver </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className={titleTextClasses}>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                <DialogDescription className={descriptionTextClasses}>
                  {editingDriver ? 'Update driver details.' : 'Register a new driver from your staff members.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleDriverSubmit} className="space-y-6 py-1">
                <DriverFormFields
                  formData={driverFormData}
                  onFormChange={handleDriverFormChange}
                  onSelectChange={handleDriverSelectChange}
                  staffList={staffList}
                  isLoadingDeps={isLoadingDeps}
                  isEdit={!!editingDriver}
                />
                {driverFormError && ( <p className="text-sm text-red-600 dark:text-red-400 md:col-span-full">{driverFormError}</p> )}
                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button></DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingDriver || isLoadingDeps}>
                    {isSubmittingDriver ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{editingDriver ? 'Saving...' : 'Creating...'}</> : editingDriver ? 'Save Changes' : 'Add Driver'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      {/* Vehicles Table */}
      <div className={`${glassCardClasses} overflow-x-auto mb-8`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <Car className="mr-2 h-6 w-6 opacity-80"/>School Vehicles
        </h2>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Registration No.</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Make & Model</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center hidden md:table-cell`}>Capacity</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center`}>Status</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`veh-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="text-center hidden md:table-cell"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : vehicles.length > 0 ? vehicles.map((vehicle) => (
              <TableRow key={vehicle.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{vehicle.registrationNumber}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{`${vehicle.make || 'N/A'} ${vehicle.model || ''}`.trim()}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-center hidden md:table-cell`}>{vehicle.capacity || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-center`}>{vehicle.status || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditVehicleDialog(vehicle)} title="Edit Vehicle"> <Edit3 className="h-4 w-4" /> </Button>
                    {/* Future: Link to Vehicle Assignments */}
                    {/* <Link href={`/${schoolData.subdomain}/resources/transport/assignments?vehicleId=${vehicle.id}`} passHref>
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="View Assignments"> <ClipboardList className="h-4 w-4" /> </Button>
                    </Link> */}
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteVehicle(vehicle.id, vehicle.registrationNumber)} title="Delete Vehicle"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No vehicles defined yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Routes Table */}
      <div className={`${glassCardClasses} overflow-x-auto mb-8`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <RouteIcon className="mr-2 h-6 w-6 opacity-80"/>Transport Routes
        </h2>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Route Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Description</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Stops</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`route-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-48 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : routes.length > 0 ? routes.map((route) => (
              <TableRow key={route.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{route.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{route.description || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{(Array.isArray(route.stops) ? route.stops.join(', ') : route.stops) || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditRouteDialog(route)} title="Edit Route"> <Edit3 className="h-4 w-4" /> </Button>
                    {/* Future: Link to Student Transport Enrollments for this route */}
                    {/* <Link href={`/${schoolData.subdomain}/resources/transport/students?routeId=${route.id}`} passHref>
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="View Students"> <Users className="h-4 w-4" /> </Button>
                    </Link> */}
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteRoute(route.id, route.name)} title="Delete Route"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="4" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No routes defined yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Drivers Table */}
      <div className={`${glassCardClasses} overflow-x-auto`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <Users className="mr-2 h-6 w-6 opacity-80"/>School Drivers
        </h2>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Driver Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>License No.</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Contact No.</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`driver-skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28 rounded" /></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                </TableRow>
              ))
            ) : drivers.length > 0 ? drivers.map((driver) => (
              <TableRow key={driver.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>{getDriverStaffName(driver.staffId)}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{driver.licenseNumber}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{driver.contactNumber || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditDriverDialog(driver)} title="Edit Driver"> <Edit3 className="h-4 w-4" /> </Button>
                    {/* Future: Link to Driver Assignments */}
                    {/* <Link href={`/${schoolData.subdomain}/resources/transport/assignments?driverId=${driver.id}`} passHref>
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} title="View Assignments"> <ClipboardList className="h-4 w-4" /> </Button>
                    </Link> */}
                    <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteDriver(driver.id, getDriverStaffName(driver.staffId))} title="Delete Driver"> <Trash2 className="h-4 w-4" /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="4" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No drivers defined yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
