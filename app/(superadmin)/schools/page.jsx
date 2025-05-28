// app/(superadmin)/schools/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // Using Shadcn Badge
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilePlus2, Edit3, Eye, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle, Settings2, Trash2
} from "lucide-react";
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // For more actions
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle } from 'lucide-react';


export default function ManageSchoolsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [schools, setSchools] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalSchools: 0, limit: 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');


  // --- Tailwind Class Constants for Coherent Styling ---
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const iconButtonClasses = `${outlineButtonClasses} h-9 w-9 md:h-8 md:w-8`; // Made slightly smaller for table actions

  const glassCardClasses = `
    backdrop-blur-lg backdrop-saturate-150
    shadow-xl dark:shadow-2xl
    bg-white/60 border border-zinc-200/50
    dark:bg-zinc-900/60 dark:border-zinc-700/60
    rounded-xl
  `;

  // --- Data Fetching and Handlers ---
  const fetchData = useCallback(async (page = 1, currentSearchTerm = debouncedSearchTerm, limit = 10) => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: currentSearchTerm,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const response = await fetch(`/api/superadmin/schools?${queryParams.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to fetch schools (${response.status})`);
      }
      const data = await response.json();
      setSchools(data.schools);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Error fetching schools:", err);
      setError(err.message);
      setSchools([]);
      setPagination({ currentPage: 1, totalPages: 1, totalSchools: 0, limit: 10 });
    }
    setIsLoading(false);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) {
        params.set('search', searchTerm);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, searchParams, pathname, router]);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user?.role === 'SUPER_ADMIN') {
      const currentPage = parseInt(searchParams.get('page') || '1', 10);
      const currentSearch = searchParams.get('search') || '';
      fetchData(currentPage, currentSearch);
    } else if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    } else if (sessionStatus === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/login?error=UnauthorizedRole');
    }
  }, [sessionStatus, session, searchParams, fetchData, router]);

  const handleToggleActive = async (schoolId, currentIsActive) => {
    setSuccessMessage(''); setError('');
    try {
      const response = await fetch(`/api/superadmin/schools/${schoolId}/toggle-active`, {
        method: 'PATCH',
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Failed to toggle status.');
      } else {
        setSuccessMessage(`School "${result.school.name}" status updated to ${result.school.isActive ? 'Active' : 'Inactive'}.`);
        fetchData(pagination.currentPage, debouncedSearchTerm);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred while toggling status.');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', newPage.toString());
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };
  
  if (sessionStatus === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><p className={`text-xl ${titleTextClasses}`}>Loading Session...</p></div>;
  }
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
     return <div className="flex items-center justify-center min-h-screen"><p className={`text-xl ${titleTextClasses}`}>Access Denied.</p></div>;
  }

  // --- JSX Structure ---
  return (
    <div className="p-4 md:p-6 lg:p-8 w-full space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${titleTextClasses}`}>Manage Schools</h1>
          <p className={descriptionTextClasses}>Oversee all registered school instances.</p>
        </div>
        <Link href="/schools/create" passHref>
          <Button className={`${primaryButtonClasses} w-full sm:w-auto`}>
            <FilePlus2 className="mr-2 h-4 w-4" /> Create New School
          </Button>
        </Link>
      </div>

      {/* Search and Filters Area - can be expanded later */}
      <div className={`${glassCardClasses} p-4 md:p-6`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
          <Input
            type="search"
            placeholder="Search schools by name or subdomain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full bg-white/70 dark:bg-zinc-800/70 border-zinc-300 dark:border-zinc-700 text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>
        {/* Add filter dropdowns here later if needed */}
      </div>
      
      {successMessage && (
        <Alert variant="default" className="bg-green-500/10 border-green-500/30 text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-300">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Schools Table */}
      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80 hover:bg-transparent dark:hover:bg-transparent">
              <TableHead className={`${titleTextClasses} font-semibold`}>Name</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Subdomain</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold`}>Status</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Created</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pagination.limit }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-32 md:w-40 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 md:w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-24 bg-zinc-300 dark:bg-zinc-700 rounded-md" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className={`${iconButtonClasses} bg-zinc-300 dark:bg-zinc-700`} />
                      <Skeleton className={`${iconButtonClasses} bg-zinc-300 dark:bg-zinc-700`} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : schools.length > 0 ? schools.map((school) => (
              <TableRow key={school.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`font-medium ${descriptionTextClasses}`}>{school.name}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{school.subdomain}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`active-toggle-${school.id}`}
                      checked={school.isActive}
                      onCheckedChange={() => handleToggleActive(school.id, school.isActive)}
                      className="data-[state=checked]:bg-green-600 dark:data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-600 dark:data-[state=unchecked]:bg-red-500"
                    />
                    <Badge
                      variant="outline"
                      className={`hidden lg:inline-flex text-xs ${
                        school.isActive
                          ? 'border-green-500/50 text-green-700 dark:border-green-600/70 dark:text-green-400 bg-green-500/10'
                          : 'border-red-500/50 text-red-700 dark:border-red-600/70 dark:text-red-400 bg-red-500/10'
                      }`}
                    >
                      {school.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>
                  {new Date(school.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    <Link href={`/schools/${school.id}/edit`} passHref>
                      <Button variant="outline" size="icon" className={iconButtonClasses} title="Edit School">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/schools/${school.id}`} passHref> {/* TODO: Create View School Details Page */}
                      <Button variant="outline" size="icon" className={iconButtonClasses} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {/* Example for more actions with a dropdown */}
                    {/* <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className={iconButtonClasses} title="More actions">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:bg-zinc-900">
                        <DropdownMenuItem onSelect={() => console.log("Delete", school.id)} className="text-red-600 dark:text-red-400 dark:hover:!bg-red-500/20">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu> */}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No schools found. Try adjusting your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className={`flex items-center justify-between pt-6 flex-wrap gap-4 ${descriptionTextClasses}`}>
          <p className="text-sm">
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalSchools} total schools)
          </p>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={pagination.currentPage === 1} className={outlineButtonClasses + " h-8 w-8"}> <ChevronsLeft className="h-4 w-4" /> </Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} className={outlineButtonClasses + " h-8 w-8"}> <ChevronLeft className="h-4 w-4" /> </Button>
            <span className="px-2 text-sm"> {pagination.currentPage} </span>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages} className={outlineButtonClasses + " h-8 w-8"}> <ChevronRight className="h-4 w-4" /> </Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(pagination.totalPages)} disabled={pagination.currentPage === pagination.totalPages} className={outlineButtonClasses + " h-8 w-8"}> <ChevronsRight className="h-4 w-4" /> </Button>
          </div>
        </div>
      )}
    </div>
  );
}