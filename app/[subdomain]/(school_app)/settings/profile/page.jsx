// app/[subdomain]/(school_app)/settings/profile/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout'; // Assumes useSchool provides comprehensive school data
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { format } from 'date-fns'; // For date formatting if needed (though times are strings)

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"; // Not directly used in this form, but often imported
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog"; // Not directly used in this form, but often imported
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Settings, AlertTriangle, Building, Phone, Mail, Link as LinkIcon, Clock } from 'lucide-react'; // Added Clock, LinkIcon

// Initial form data for School Profile
const initialProfileFormData = {
  name: '',
  address: '',
  contactInfo: '',
  logoUrl: '',
  timetableStartTime: '', // New field
  timetableEndTime: '',   // New field
  // subdomain, customDomain, isActive are usually not editable via this form
};

export default function SchoolProfilePage() {
  const schoolData = useSchool(); // This context provides the currently loaded school data
  const { data: session } = useSession();

  const [formData, setFormData] = useState({ ...initialProfileFormData });
  const [isLoading, setIsLoading] = useState(false); // For form submission
  const [isFetchingProfile, setIsFetchingProfile] = useState(true); // For initial profile load
  const [formError, setFormError] = useState('');

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1 text-left";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";


  // Populate form when schoolData is available
  useEffect(() => {
    if (schoolData) {
      setFormData({
        name: schoolData.name || '',
        address: schoolData.address || '',
        contactInfo: schoolData.contactInfo || '',
        logoUrl: schoolData.logoUrl || '',
        timetableStartTime: schoolData.timetableStartTime || '', // Populate new field
        timetableEndTime: schoolData.timetableEndTime || '',     // Populate new field
      });
      setIsFetchingProfile(false);
    }
  }, [schoolData]);

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsLoading(true); setFormError('');

    const payload = {
      name: formData.name,
      address: formData.address || null,
      contactInfo: formData.contactInfo || null,
      logoUrl: formData.logoUrl || null,
      timetableStartTime: formData.timetableStartTime || null, // Include new field
      timetableEndTime: formData.timetableEndTime || null,     // Include new field
    };

    try {
      const response = await fetch(`/api/schools/${schoolData.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || 'Failed to update school profile.';
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error("Update Failed", { description: err }); setFormError(err);
      } else {
        toast.success("School profile updated successfully!");
        // Optionally, refetch school data in layout if useSchool doesn't auto-update
        // Or update it locally via setSchoolData from layout context if available and designed for it.
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setFormError('An unexpected error occurred.');
    } finally { setIsLoading(false); }
  };

  if (isFetchingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
        <p className={`mt-4 text-lg ${descriptionTextClasses}`}>Loading school profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Settings className="mr-3 h-8 w-8 opacity-80"/>School Profile Settings
          </h1>
          <p className={descriptionTextClasses}>Manage your school's general information and core operational settings.</p>
        </div>
      </div>

      {formError && ( <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{formError}</AlertDescription> </Alert> )}

      <div className={`${glassCardClasses}`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4`}>General Information</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="md:col-span-2">
              <Label htmlFor="name" className={labelTextClasses}>School Name <span className="text-red-500">*</span></Label>
              <Input id="name" name="name" value={formData.name} onChange={handleFormChange} required className={`${inputTextClasses} mt-1`} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address" className={labelTextClasses}>Address</Label>
              <Textarea id="address" name="address" value={formData.address} onChange={handleFormChange} rows={2} className={`${inputTextClasses} mt-1`} />
            </div>
            <div>
              <Label htmlFor="contactInfo" className={labelTextClasses}>Contact Info (Phone/Email)</Label>
              <Input id="contactInfo" name="contactInfo" value={formData.contactInfo} onChange={handleFormChange} className={`${inputTextClasses} mt-1`} />
            </div>
            <div>
              <Label htmlFor="logoUrl" className={labelTextClasses}>Logo URL</Label>
              <Input id="logoUrl" name="logoUrl" type="url" value={formData.logoUrl} onChange={handleFormChange} className={`${inputTextClasses} mt-1`} />
            </div>

            {/* Read-only domain info */}
            <div>
              <Label className={labelTextClasses}>Subdomain</Label>
              <Input value={schoolData?.subdomain || 'N/A'} disabled className={`${inputTextClasses} mt-1`} />
              <p className={`text-xs mt-1 ${descriptionTextClasses}`}>Your school's unique web address.</p>
            </div>
            <div>
              <Label className={labelTextClasses}>Custom Domain (Optional)</Label>
              <Input value={schoolData?.customDomain || 'N/A'} disabled className={`${inputTextClasses} mt-1`} />
              <p className={`text-xs mt-1 ${descriptionTextClasses}`}>Contact support to set up a custom domain.</p>
            </div>
          </div>

          <hr className="my-6 border-zinc-200 dark:border-zinc-700" />

          <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
            <Clock className="mr-2 h-6 w-6 opacity-80"/>Timetable Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <Label htmlFor="timetableStartTime" className={labelTextClasses}>School Start Time (HH:MM)</Label>
              <Input id="timetableStartTime" name="timetableStartTime" type="time" value={formData.timetableStartTime || ''} onChange={handleFormChange} className={`${inputTextClasses} mt-1`} />
              <p className={`text-xs mt-1 ${descriptionTextClasses}`}>Defines the earliest class time on the timetable.</p>
            </div>
            <div>
              <Label htmlFor="timetableEndTime" className={labelTextClasses}>School End Time (HH:MM)</Label>
              <Input id="timetableEndTime" name="timetableEndTime" type="time" value={formData.timetableEndTime || ''} onChange={handleFormChange} className={`${inputTextClasses} mt-1`} />
              <p className={`text-xs mt-1 ${descriptionTextClasses}`}>Defines the latest class time on the timetable.</p>
            </div>
          </div>

          <DialogFooter className="mt-8">
            <Button type="submit" className={primaryButtonClasses} disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </div>

      {/* Optional: Add sections for Feature Flags, Security Settings, etc. */}
    </div>
  );
}
