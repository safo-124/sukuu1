// app/(superadmin)/schools/[schoolId]/edit/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Use useParams for dynamic segments
import { useSession } from 'next-auth/react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // For boolean toggles
import { Textarea } from "@/components/ui/textarea"; // For address/contactInfo
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Initial form state structure matching the School model fields we want to edit
const initialFormData = {
  name: '',
  subdomain: '',
  address: '',
  contactInfo: '',
  logoUrl: '',
  isActive: true,
  hasParentAppAccess: false,
  hasAutoTimetable: false,
  hasFinanceModule: false,
  hasAdvancedHRModule: false,
  hasProcurementModule: false,
  hasLibraryModule: false,
  hasTransportationModule: false,
  hasHostelModule: false,
};

export default function EditSchoolPage() {
  const router = useRouter();
  const params = useParams(); // Gets { schoolId: 'value' }
  const { schoolId } = params;
  const { data: session, status: sessionStatus } = useSession();

  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(true); // For page load and form submission
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    } else if (sessionStatus === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/login?error=UnauthorizedRole');
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (schoolId && session?.user?.role === 'SUPER_ADMIN') {
      setIsLoading(true);
      fetch(`/api/superadmin/schools/${schoolId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch school data (${res.status})`);
          }
          return res.json();
        })
        .then(data => {
          if (data.school) {
            // Ensure all fields from initialFormData are present, even if null from DB
            const schoolData = { ...initialFormData, ...data.school };
            setFormData(schoolData);
          } else {
            setError(data.error || 'School not found.');
          }
        })
        .catch(err => {
          console.error(err);
          setError(err.message);
        })
        .finally(() => setIsLoading(false));
    }
  }, [schoolId, session]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSwitchChange = (name, checked) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    // Prepare only changed fields if you want to send partial updates,
    // or send all fields. For simplicity, sending all editable fields from formData.
    // Make sure to filter out any fields not in your updateSchoolSchema if necessary.
    const dataToSubmit = {
        name: formData.name,
        subdomain: formData.subdomain,
        address: formData.address || null, // Send null if empty string for optional fields
        contactInfo: formData.contactInfo || null,
        logoUrl: formData.logoUrl || null,
        isActive: formData.isActive,
        hasParentAppAccess: formData.hasParentAppAccess,
        hasAutoTimetable: formData.hasAutoTimetable,
        hasFinanceModule: formData.hasFinanceModule,
        hasAdvancedHRModule: formData.hasAdvancedHRModule,
        hasProcurementModule: formData.hasProcurementModule,
        hasLibraryModule: formData.hasLibraryModule,
        hasTransportationModule: formData.hasTransportationModule,
        hasHostelModule: formData.hasHostelModule,
    };


    try {
      const response = await fetch(`/api/superadmin/schools/${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to update school.');
        if (result.issues) {
          setError(result.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
        }
      } else {
        setSuccessMessage('School updated successfully!');
        // Optionally re-fetch or update formData with result.school if needed
        setFormData(prev => ({ ...prev, ...result.school }));
        // router.push('/(superadmin)/schools'); // Or stay on page
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionStatus === 'loading' || (isLoading && !formData.name)) { // Show skeleton if session is loading or initial data is loading
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center mb-6">
          <Skeleton className="h-8 w-8 mr-2 rounded" />
          <Skeleton className="h-8 w-48 rounded" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 8 }).map((_, i) => ( // Skeleton for form fields
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/4 rounded" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          ))}
          <Skeleton className="h-10 w-32 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/(superadmin)/schools" className="inline-flex items-center text-sm hover:underline card-description-bw">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Schools List
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6 card-title-bw">Edit School: {formData.name || 'Loading...'}</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name" className="card-title-bw">School Name</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} className="dark:bg-zinc-800 dark:text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subdomain" className="card-title-bw">Subdomain</Label>
            <Input id="subdomain" name="subdomain" value={formData.subdomain} onChange={handleChange} className="dark:bg-zinc-800 dark:text-white" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address" className="card-title-bw">Address</Label>
            <Textarea id="address" name="address" value={formData.address || ''} onChange={handleChange} className="dark:bg-zinc-800 dark:text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactInfo" className="card-title-bw">Contact Info (Phone/Email)</Label>
            <Input id="contactInfo" name="contactInfo" value={formData.contactInfo || ''} onChange={handleChange} className="dark:bg-zinc-800 dark:text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl" className="card-title-bw">Logo URL</Label>
            <Input id="logoUrl" name="logoUrl" type="url" value={formData.logoUrl || ''} onChange={handleChange} className="dark:bg-zinc-800 dark:text-white" />
          </div>
          <div className="flex items-center space-x-2 md:col-span-2">
            <Switch
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
            />
            <Label htmlFor="isActive" className="card-title-bw">School Active</Label>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold card-title-bw border-b pb-2 mb-4 dark:border-zinc-700">Feature Flags</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {[
                { name: 'hasParentAppAccess', label: 'Parent App Access' },
                { name: 'hasAutoTimetable', label: 'Automatic Timetable' },
                { name: 'hasFinanceModule', label: 'Finance Module' },
                { name: 'hasAdvancedHRModule', label: 'Advanced HR Module' },
                { name: 'hasProcurementModule', label: 'Procurement Module' },
                { name: 'hasLibraryModule', label: 'Library Module' },
                { name: 'hasTransportationModule', label: 'Transportation Module' },
                { name: 'hasHostelModule', label: 'Hostel Module' },
            ].map(feature => (
                <div key={feature.name} className="flex items-center space-x-2">
                    <Switch
                        id={feature.name}
                        name={feature.name}
                        checked={formData[feature.name]}
                        onCheckedChange={(checked) => handleSwitchChange(feature.name, checked)}
                    />
                    <Label htmlFor={feature.name} className="card-description-bw text-sm">{feature.label}</Label>
                </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm font-medium text-red-600 dark:text-red-400 p-3 bg-red-100 dark:bg-red-900/30 rounded-md">{error}</p>}
        {successMessage && <p className="text-sm font-medium text-green-600 dark:text-green-400 p-3 bg-green-100 dark:bg-green-900/30 rounded-md">{successMessage}</p>}

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => router.push('/(superadmin)/schools')} className="dark:text-white dark:border-gray-700 hover:dark:border-white text-black border-gray-300 hover:border-black">
            Cancel
          </Button>
          <Button type="submit" className="button-primary-bw" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}