// app/(superadmin)/schools/[schoolId]/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Edit3, CheckSquare, XSquare, Info, MapPin, Phone, Link2, Users, UserPlus, Settings } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose, // This is DialogPrimitive.Close wrapped by Shadcn
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

// Helper component for displaying detail items
const DetailItem = ({ label, value, icon, isLoading, isBoolean = false }) => {
  const IconComponent = icon;
  const detailDescriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const detailTitleTextClasses = "text-black dark:text-white";

  if (isLoading) {
    return (
      <div className="py-3">
        <Skeleton className={`h-4 w-24 mb-1 bg-zinc-300 dark:bg-zinc-700 rounded`} />
        <Skeleton className={`h-5 w-36 bg-zinc-300 dark:bg-zinc-700 rounded`} />
      </div>
    );
  }
  let displayValue = value;
  if (isBoolean) {
    displayValue = value ?
      <span className="flex items-center text-green-600 dark:text-green-400"><CheckSquare className="mr-2 h-5 w-5" /> Enabled</span> :
      <span className="flex items-center text-red-600 dark:text-red-400"><XSquare className="mr-2 h-5 w-5" /> Disabled</span>;
  } else if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
    displayValue = <span className="italic text-zinc-500 dark:text-zinc-500">Not set</span>;
  }

  return (
    <div className="py-3">
      <dt className={`text-sm font-medium flex items-center ${detailDescriptionTextClasses}`}>
        {IconComponent && <IconComponent className="mr-2 h-4 w-4 opacity-80" />}
        {label}
      </dt>
      <dd className={`mt-1 text-base break-words ${isBoolean ? '' : detailTitleTextClasses}`}>
        {displayValue}
      </dd>
    </div>
  );
};

const initialAddAdminFormData = { firstName: '', lastName: '', email: '', password: '' };
const initialEditAdminFormData = { id: '', firstName: '', lastName: '', email: '', password: '', isActive: true };

export default function ViewSchoolDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { schoolId } = params;
  const { data: session, status: sessionStatus } = useSession();

  const [school, setSchool] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [isLoadingSchool, setIsLoadingSchool] = useState(true);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [error, setError] = useState('');

  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [addAdminFormData, setAddAdminFormData] = useState(initialAddAdminFormData);
  const [isSubmittingAddAdmin, setIsSubmittingAddAdmin] = useState(false);

  const [isEditAdminDialogOpen, setIsEditAdminDialogOpen] = useState(false);
  const [editAdminFormData, setEditAdminFormData] = useState(initialEditAdminFormData);
  const [isSubmittingEditAdmin, setIsSubmittingEditAdmin] = useState(false);
  const [currentEditingAdminId, setCurrentEditingAdminId] = useState(null);

  // Tailwind Class Constants
  const glassSectionClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const titleTextClasses = "text-black dark:text-white";
  const pageTitleClasses = `text-2xl md:text-3xl font-bold ${titleTextClasses}`;
  const sectionTitleClasses = `text-xl font-semibold border-b pb-3 mb-6 dark:border-zinc-700 ${titleTextClasses}`;
  const descriptionTextClasses = "text-zinc-700 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const labelTextClasses = `${titleTextClasses} block text-sm font-medium mb-1 text-left`;


  const fetchSchoolDetails = useCallback(async () => {
    if (!schoolId || !session || session.user?.role !== 'SUPER_ADMIN') return;
    setIsLoadingSchool(true); setError('');
    try {
      const response = await fetch(`/api/superadmin/schools/${schoolId}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `Failed to fetch school data (${response.status})` }));
        throw new Error(errData.error);
      }
      const data = await response.json();
      if (data.school) setSchool(data.school);
      else throw new Error('School data not found.');
    } catch (err) {
      console.error("Error fetching school details:", err); setError(err.message); toast.error(err.message || "Could not load school details.");
    } finally {
      setIsLoadingSchool(false);
    }
  }, [schoolId, session]);

  const fetchSchoolAdmins = useCallback(async () => {
    if (!schoolId || !session || session.user?.role !== 'SUPER_ADMIN') return;
    setIsLoadingAdmins(true);
    try {
      const response = await fetch(`/api/superadmin/schools/${schoolId}/admins`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to fetch administrators.' }));
        throw new Error(errData.error);
      }
      const data = await response.json();
      setAdmins(data.admins || []);
    } catch (err) {
      console.error("Error fetching school admins:", err); toast.error(err.message || "Could not load administrators.");
    } finally {
      setIsLoadingAdmins(false);
    }
  }, [schoolId, session]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') { router.push('/login'); return; }
    if (sessionStatus === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') { router.push('/login?error=UnauthorizedRole'); return; }
    if (schoolId && session?.user?.role === 'SUPER_ADMIN') { // Ensure schoolId is present before fetching
        fetchSchoolDetails();
        fetchSchoolAdmins();
    }
  }, [schoolId, sessionStatus, session, router, fetchSchoolDetails, fetchSchoolAdmins]);

  const handleAdminFormChange = (e, formType = 'add') => {
    const setter = formType === 'edit' ? setEditAdminFormData : setAddAdminFormData;
    setter(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleAdminSwitchChange = (name, checked) => {
    setEditAdminFormData(prev => ({ ...prev, [name]: checked, }));
  };

  const handleAddAdminSubmit = async (e) => {
    e.preventDefault(); setIsSubmittingAddAdmin(true);
    try {
      const response = await fetch(`/api/superadmin/schools/${schoolId}/admins`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addAdminFormData),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || 'Failed to create administrator.';
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Error'}: ${issue.message}`).join('\n');
        toast.error("Creation Failed", { description: errorMessage });
      } else {
        toast.success(`Administrator "${result.admin?.firstName} ${result.admin?.lastName}" created successfully!`);
        setAddAdminFormData(initialAddAdminFormData); setIsAddAdminDialogOpen(false); fetchSchoolAdmins();
      }
    } catch (err) { console.error("Error submitting add admin form:", err); toast.error('An unexpected error occurred.');
    } finally { setIsSubmittingAddAdmin(false); }
  };

  const openEditAdminDialog = (admin) => {
    setCurrentEditingAdminId(admin.id);
    setEditAdminFormData({
      id: admin.id, firstName: admin.firstName || '', lastName: admin.lastName || '',
      email: admin.email || '', password: '', isActive: admin.isActive !== undefined ? admin.isActive : true,
    });
    setIsEditAdminDialogOpen(true);
  };

  const handleEditAdminSubmit = async (e) => {
    e.preventDefault(); if (!currentEditingAdminId) return; setIsSubmittingEditAdmin(true);
    const dataToSubmit = { ...editAdminFormData };
    if (!dataToSubmit.password || dataToSubmit.password.trim() === '') { delete dataToSubmit.password; }
    try {
      const response = await fetch(`/api/superadmin/schools/${schoolId}/admins/${currentEditingAdminId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSubmit),
      });
      const result = await response.json();
      if (!response.ok) {
        let errorMessage = result.error || 'Failed to update administrator.';
        if (result.issues) errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Error'}: ${issue.message}`).join('\n');
        toast.error("Update Failed", { description: errorMessage });
      } else {
        toast.success(`Administrator "${result.admin?.firstName} ${result.admin?.lastName}" updated successfully!`);
        setIsEditAdminDialogOpen(false); fetchSchoolAdmins();
      }
    } catch (err) { console.error("Error submitting edit admin form:", err); toast.error('An unexpected error occurred during update.');
    } finally { setIsSubmittingEditAdmin(false); }
  };

  const handleToggleAdminActive = async (adminId, currentIsActive) => {
    const actionText = currentIsActive ? "Deactivate" : "Activate";
    if (!window.confirm(`Are you sure you want to ${actionText.toLowerCase()} this administrator?`)) return;
    try {
      const response = await fetch(`/api/superadmin/schools/${schoolId}/admins/${adminId}`, { method: 'PATCH' });
      const result = await response.json();
      if (!response.ok) { toast.error(result.error || `Failed to ${actionText.toLowerCase()} administrator.`);
      } else { toast.success(result.message || `Administrator status updated.`); fetchSchoolAdmins(); }
    } catch (err) { console.error("Error toggling admin active status:",err); toast.error(`An unexpected error occurred while trying to ${actionText.toLowerCase()} administrator.`); }
  };
  
  const pageIsLoading = isLoadingSchool || (!school && !error && sessionStatus !== 'unauthenticated');

  if (pageIsLoading) { 
    return (
      <div className="p-4 md:p-6 lg:p-8 w-full">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 md:w-72 mb-2 bg-zinc-300 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-5 w-64 md:w-96 bg-zinc-300 dark:bg-zinc-700 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-9 w-28 bg-zinc-300 dark:bg-zinc-700 rounded" />
          </div>
        </div>
        <div className={`space-y-10`}>
          {[1, 2, 3].map(sectionKey => (
            <section key={sectionKey} className={glassSectionClasses}>
              <Skeleton className="h-7 w-1/3 mb-6 bg-zinc-300 dark:bg-zinc-700 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                {Array.from({ length: sectionKey === 3 ? 3 : 6 }).map((_, itemKey) => (
                  <div key={itemKey} className="py-2">
                    <Skeleton className="h-4 w-24 mb-1 bg-zinc-300 dark:bg-zinc-700 rounded" />
                    <Skeleton className="h-5 w-36 bg-zinc-300 dark:bg-zinc-700 rounded" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }
  
  if (error && !isLoadingSchool) { 
       return (
         <div className="p-4 md:p-6 lg:p-8 w-full">
           <div className="mb-6"> <Link href="/schools" className={`inline-flex items-center text-sm hover:underline ${descriptionTextClasses}`}> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Schools List </Link> </div>
           <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error Loading School Data</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert>
         </div>
    );
  }

  if (!school) { 
    return (
      <div className="p-4 md:p-6 lg:p-8 w-full">
        <p className={`text-xl ${titleTextClasses}`}>School not found or an error occurred.</p>
        <Link href="/schools" className={`inline-flex items-center text-sm hover:underline mt-4 ${descriptionTextClasses}`}> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Schools List </Link>
      </div>
    );
  }

  const featureFlags = [ 
    { key: 'hasParentAppAccess', label: 'Parent App Access' }, { key: 'hasAutoTimetable', label: 'Automatic Timetable' },
    { key: 'hasFinanceModule', label: 'Finance Module' }, { key: 'hasAdvancedHRModule', label: 'Advanced HR Module' },
    { key: 'hasProcurementModule', label: 'Procurement Module' }, { key: 'hasLibraryModule', label: 'Library Module' },
    { key: 'hasTransportationModule', label: 'Transportation Module' }, { key: 'hasHostelModule', label: 'Hostel Module' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div> 
          <h1 className={pageTitleClasses}>{school.name}</h1> 
          <p className={descriptionTextClasses}>Detailed information and configuration.</p> 
        </div>
        <div className="flex gap-2 flex-wrap">
            <Link href="/schools" passHref> 
              <Button variant="outline" size="sm" className={outlineButtonClasses}> <ArrowLeft className="mr-2 h-4 w-4" /> Back to List </Button> 
            </Link>
            <Link href={`/schools/${schoolId}/edit`} passHref> 
              <Button size="sm" className={`${primaryButtonClasses}`}> <Edit3 className="mr-2 h-4 w-4" /> Edit School </Button> 
            </Link>
        </div>
      </div>

      <div className="space-y-10">
        <section className={glassSectionClasses}> 
          <h2 className={sectionTitleClasses}>Basic Information</h2> 
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1"> 
            <DetailItem label="School Name" value={school.name} icon={Info} isLoading={isLoadingSchool} />
            <DetailItem label="Subdomain" value={school.subdomain} icon={Link2} isLoading={isLoadingSchool} />
            <DetailItem label="Status" value={school.isActive} icon={school.isActive ? CheckSquare : XSquare} isLoading={isLoadingSchool} isBoolean />
            <DetailItem label="Contact Info" value={school.contactInfo} icon={Phone} isLoading={isLoadingSchool} />
            <DetailItem label="Logo URL" value={school.logoUrl} icon={Link2} isLoading={isLoadingSchool} />
            <DetailItem label="Address" value={school.address} icon={MapPin} isLoading={isLoadingSchool} />
            <DetailItem label="Created At" value={new Date(school.createdAt).toLocaleString()} icon={Info} isLoading={isLoadingSchool} />
            <DetailItem label="Last Updated" value={new Date(school.updatedAt).toLocaleString()} icon={Info} isLoading={isLoadingSchool} />
          </dl> 
        </section>

        <section className={glassSectionClasses}> 
          <h2 className={sectionTitleClasses}>Enabled Features</h2> 
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-1"> 
            {featureFlags.map(flag => ( <DetailItem key={flag.key} label={flag.label} value={school[flag.key]} isLoading={isLoadingSchool} isBoolean /> ))} 
          </dl> 
        </section>
        
        <section className={glassSectionClasses}>
          <div className="flex justify-between items-center mb-6 border-b pb-3 dark:border-zinc-700">
            <h2 className={`text-xl font-semibold ${titleTextClasses}`}>School Administrators</h2>
            <Dialog open={isAddAdminDialogOpen} onOpenChange={setIsAddAdminDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className={primaryButtonClasses}> <UserPlus className="mr-2 h-4 w-4" /> Add Administrator </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <DialogHeader> 
                  <DialogTitle className={titleTextClasses}>Add New Administrator for {school?.name}</DialogTitle> 
                  <DialogDescription className={descriptionTextClasses}> Fill in the details for the new school administrator. </DialogDescription> 
                </DialogHeader>
                <form onSubmit={handleAddAdminSubmit} className="space-y-4 py-4">
                  <div> <Label htmlFor="addFirstName" className={labelTextClasses}>First Name</Label> <Input id="addFirstName" name="firstName" value={addAdminFormData.firstName} onChange={(e) => handleAdminFormChange(e, 'add')} required className={`${inputTextClasses} mt-1`} /> </div>
                  <div> <Label htmlFor="addLastName" className={labelTextClasses}>Last Name</Label> <Input id="addLastName" name="lastName" value={addAdminFormData.lastName} onChange={(e) => handleAdminFormChange(e, 'add')} required className={`${inputTextClasses} mt-1`} /> </div>
                  <div> <Label htmlFor="addEmail" className={labelTextClasses}>Email</Label> <Input id="addEmail" name="email" type="email" value={addAdminFormData.email} onChange={(e) => handleAdminFormChange(e, 'add')} required className={`${inputTextClasses} mt-1`} /> </div>
                  <div> <Label htmlFor="addPassword" className={labelTextClasses}>Password</Label> <Input id="addPassword" name="password" type="password" value={addAdminFormData.password} onChange={(e) => handleAdminFormChange(e, 'add')} required minLength={8} className={`${inputTextClasses} mt-1`} /> </div>
                  <DialogFooter> 
                    <DialogClose asChild> 
                      <Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button> 
                    </DialogClose> 
                    <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingAddAdmin}> {isSubmittingAddAdmin ? 'Adding...' : 'Add Administrator'} </Button> 
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingAdmins ? (
            <div className="space-y-3">
              {[1,2].map(i => (<div key={i} className="flex items-center space-x-4 p-2 justify-between"><div className="flex items-center space-x-2 w-2/5"><Skeleton className="h-5 w-full bg-zinc-300 dark:bg-zinc-700 rounded" /></div><div className="flex items-center space-x-2 w-2/5"><Skeleton className="h-5 w-full bg-zinc-300 dark:bg-zinc-700 rounded" /></div><div className="flex items-center space-x-2 w-1/5"><Skeleton className="h-7 w-full bg-zinc-300 dark:bg-zinc-700 rounded-md" /></div><div className="flex items-center space-x-1 w-auto"><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /><Skeleton className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded" /></div></div>))}
            </div>
          ) : admins.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-zinc-700">
                  <TableHead className={titleTextClasses}>Name</TableHead>
                  <TableHead className={titleTextClasses}>Email</TableHead>
                  <TableHead className={titleTextClasses}>Status</TableHead>
                  <TableHead className={`text-right ${titleTextClasses}`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map(admin => (
                  <TableRow key={admin.id} className="dark:border-zinc-700">
                    <TableCell className={descriptionTextClasses}>{admin.firstName} {admin.lastName}</TableCell>
                    <TableCell className={descriptionTextClasses}>{admin.email}</TableCell>
                    <TableCell>
                       <Badge variant={admin.isActive ? "default" : "destructive"}
                       className={`text-xs ${admin.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200 border border-green-300 dark:border-green-700' : 'bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-200 border border-red-300 dark:border-red-700'}`}>
                        {admin.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditAdminDialog(admin)} title="Edit Administrator"> <Edit3 className="h-4 w-4" /> </Button>
                      <Button variant="outline" size="icon"
                        className={`${admin.isActive ? 'border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-800/50' : 'border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-800/50'} h-8 w-8`}
                        onClick={() => handleToggleAdminActive(admin.id, admin.isActive)}
                        title={admin.isActive ? "Deactivate" : "Activate"}
                      >
                        {admin.isActive ? <XSquare className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className={`${descriptionTextClasses} py-4`}>No administrators found for this school yet.</p>
          )}
        </section>

        <Dialog open={isEditAdminDialogOpen} onOpenChange={setIsEditAdminDialogOpen}>
          <DialogContent className="sm:max-w-[480px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className={titleTextClasses}>Edit Administrator</DialogTitle>
              <DialogDescription className={descriptionTextClasses}>
                Update details for {editAdminFormData.firstName} {editAdminFormData.lastName}. Leave password blank to keep unchanged.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditAdminSubmit} className="space-y-4 py-4">
              <div> <Label htmlFor="editFirstName" className={labelTextClasses}>First Name</Label> <Input id="editFirstName" name="firstName" value={editAdminFormData.firstName} onChange={(e) => handleAdminFormChange(e, 'edit')} required className={`${inputTextClasses} mt-1`} /> </div>
              <div> <Label htmlFor="editLastName" className={labelTextClasses}>Last Name</Label> <Input id="editLastName" name="lastName" value={editAdminFormData.lastName} onChange={(e) => handleAdminFormChange(e, 'edit')} required className={`${inputTextClasses} mt-1`} /> </div>
              <div> <Label htmlFor="editEmail" className={labelTextClasses}>Email</Label> <Input id="editEmail" name="email" type="email" value={editAdminFormData.email} onChange={(e) => handleAdminFormChange(e, 'edit')} required className={`${inputTextClasses} mt-1`} /> </div>
              <div> <Label htmlFor="editPassword" className={labelTextClasses}>New Password (optional)</Label> <Input id="editPassword" name="password" type="password" value={editAdminFormData.password} onChange={(e) => handleAdminFormChange(e, 'edit')} minLength={editAdminFormData.password ? 8 : undefined} className={`${inputTextClasses} mt-1`} placeholder="Leave blank to keep current password" /> </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="editIsActive" name="isActive" checked={editAdminFormData.isActive} onCheckedChange={(checked) => handleAdminSwitchChange('isActive', checked)} />
                <Label htmlFor="editIsActive" className={`text-sm font-medium ${titleTextClasses}`}>Administrator Active</Label>
              </div>
              <DialogFooter>
                <DialogClose asChild> 
                  <Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button> 
                </DialogClose>
                <Button type="submit" className={primaryButtonClasses} disabled={isSubmittingEditAdmin}> {isSubmittingEditAdmin ? 'Saving...' : 'Save Changes'} </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}