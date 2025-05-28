// app/(superadmin)/schools/create/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner'; // ✨ Import toast function

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
// Alert can still be used for more permanent messages or detailed validation errors if needed
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { ArrowLeft, AlertTriangle } from 'lucide-react'; // CheckCircle removed as toast will handle visual success

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

export default function CreateSchoolPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  // You might still want a local error state for form-specific validation messages not suitable for toasts
  const [formError, setFormError] = useState('');


  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/login?error=UnauthorizedRole');
    }
  }, [session, sessionStatus, router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' || type === 'switch' ? checked : value,
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
    setFormError(''); // Clear local form error
    setIsLoading(true);

    if (!formData.name || !formData.subdomain) {
        // For critical form validation, you might show a local message OR a toast
        toast.error("School Name and Subdomain are required.");
        // setFormError("School Name and Subdomain are required.");
        setIsLoading(false);
        return;
    }
    if (formData.logoUrl && !formData.logoUrl.startsWith('http')) {
        toast.error("Please enter a valid URL for the logo.");
        // setFormError("Please enter a valid URL for the logo (e.g., http:// or https://).");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/superadmin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (!response.ok) {
        let errorMessage = result.error || 'Failed to create school.';
        if (result.issues && Array.isArray(result.issues)) { // Zod issues
          errorMessage = result.issues.map(issue => `${issue.path.join('.') || 'Error'}: ${issue.message}`).join('; ');
          // You could show these detailed errors in a local Alert component or a multi-line toast
          toast.error("Validation failed. Please check the details.", { description: errorMessage });
          // setFormError(errorMessage); // Optionally set local error too
        } else {
            toast.error(errorMessage);
        }
      } else {
        toast.success(`School "${result.school?.name}" created successfully!`);
        setFormData(initialFormData);
        setTimeout(() => {
          router.push('/schools');
        }, 1500); // Slightly shorter delay as toast is immediate
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionStatus === 'loading' || !session || session.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <p className="text-xl text-black dark:text-white">Loading or Access Denied...</p>
      </div>
    );
  }

  const featureFlags = [
    { name: 'hasParentAppAccess', label: 'Parent App Access' },
    { name: 'hasAutoTimetable', label: 'Automatic Timetable' },
    { name: 'hasFinanceModule', label: 'Finance Module' },
    // ... (rest of featureFlags as before)
    { name: 'hasAdvancedHRModule', label: 'Advanced HR Module' },
    { name: 'hasProcurementModule', label: 'Procurement Module' },
    { name: 'hasLibraryModule', label: 'Library Module' },
    { name: 'hasTransportationModule', label: 'Transportation Module' },
    { name: 'hasHostelModule', label: 'Hostel Module' },
  ];

  // Tailwind class constants (as defined in previous B&W Tailwind-only version)
  const glassSectionClasses = `p-6 md:p-8 rounded-xl backdrop-blur-lg backdrop-saturate-150 shadow-lg dark:shadow-2xl bg-white/60 border border-white/40 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-700 dark:text-zinc-300";
  const labelTextClasses = "text-black dark:text-white block text-sm font-medium mb-1";
  const inputTextClasses = "dark:bg-zinc-800/50 dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const placeholderTextClasses = "placeholder:text-zinc-400 dark:placeholder:text-zinc-500";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";


  return (
    <div className="p-4 md:p-6 lg:p-8 w-full">
      <div className="mb-8 flex justify-between items-center">
        <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses}`}>Create New School</h1>
        <Link href="/schools" className={`inline-flex items-center text-sm hover:underline ${descriptionTextClasses}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Schools List
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <section className={glassSectionClasses}>
          <h2 className={`text-xl font-semibold border-b pb-3 mb-6 dark:border-zinc-700 ${titleTextClasses}`}>
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {/* School Name */}
            <div>
              <Label htmlFor="name" className={labelTextClasses}>School Name <span className="text-red-500">*</span></Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required className={`${inputTextClasses} ${placeholderTextClasses}`} />
            </div>
            {/* Subdomain */}
            <div>
              <Label htmlFor="subdomain" className={labelTextClasses}>Subdomain <span className="text-red-500">*</span></Label>
              <Input id="subdomain" name="subdomain" value={formData.subdomain} onChange={handleChange} placeholder="e.g., myschool" required className={`${inputTextClasses} ${placeholderTextClasses}`} />
              <p className={`text-xs mt-1 ${descriptionTextClasses}`}>{formData.subdomain || "[subdomain]"}.yourdomain.com</p>
            </div>
            {/* Contact Info */}
            <div className="md:col-span-2 lg:col-span-1">
              <Label htmlFor="contactInfo" className={labelTextClasses}>Contact Info (Phone/Email)</Label>
              <Input id="contactInfo" name="contactInfo" value={formData.contactInfo} onChange={handleChange} className={`${inputTextClasses} ${placeholderTextClasses}`} />
            </div>
            {/* Address */}
            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="address" className={labelTextClasses}>Address</Label>
              <Textarea id="address" name="address" value={formData.address} onChange={handleChange} rows={3} className={`${inputTextClasses} ${placeholderTextClasses}`} />
            </div>
            {/* Logo URL */}
            <div className="lg:col-span-2">
              <Label htmlFor="logoUrl" className={labelTextClasses}>Logo URL</Label>
              <Input id="logoUrl" name="logoUrl" type="url" value={formData.logoUrl} onChange={handleChange} placeholder="https://example.com/logo.png" className={`${inputTextClasses} ${placeholderTextClasses}`} />
            </div>
            {/* Is Active Switch */}
            <div className="flex items-center space-x-2 pt-2 lg:col-span-1 self-end pb-1">
              <Switch id="isActive" name="isActive" checked={formData.isActive} onCheckedChange={(checked) => handleSwitchChange('isActive', checked)} />
              <Label htmlFor="isActive" className={`text-sm font-medium ${titleTextClasses}`}>Set School as Active</Label>
            </div>
          </div>
        </section>

        <section className={glassSectionClasses}>
          <h2 className={`text-xl font-semibold border-b pb-3 mb-6 dark:border-zinc-700 ${titleTextClasses}`}>
            Enabled Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-6">
            {featureFlags.map(feature => (
                <div key={feature.name} className="flex items-center space-x-3 p-2 rounded-md hover:bg-zinc-500/10 dark:hover:bg-white/10 transition-colors">
                    <Switch id={feature.name} name={feature.name} checked={formData[feature.name]} onCheckedChange={(checked) => handleSwitchChange(feature.name, checked)} />
                    <Label htmlFor={feature.name} className={`text-sm font-medium cursor-pointer select-none ${descriptionTextClasses}`}>{feature.label}</Label>
                </div>
            ))}
          </div>
        </section>

        {/* Local Form Error Display (Optional - if you want to keep some errors outside of toasts) */}
        {formError && (
            <Alert variant="destructive" className="my-6 dark:bg-red-900/30 dark:border-red-700/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Please correct the errors:</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{formError}</AlertDescription>
            </Alert>
        )}

        <div className="flex justify-end space-x-3 mt-8">
          <Link href="/schools" passHref>
            <Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button>
          </Link>
          <Button type="submit" className={primaryButtonClasses} disabled={isLoading}>
            {isLoading ? 'Creating School...' : 'Create School'}
          </Button>
        </div>
      </form>
    </div>
  );
}