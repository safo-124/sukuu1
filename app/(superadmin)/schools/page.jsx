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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, 
  Edit3, 
  Eye, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  AlertTriangle, 
  Settings2, 
  Trash2,
  Filter,
  Download,
  MoreHorizontal,
  School,
  Globe,
  Calendar,
  Users,
  TrendingUp,
  CheckCircle2
} from "lucide-react";
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


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
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSchools, setSelectedSchools] = useState([]);


  // --- Data Fetching and Handlers ---
  const fetchData = useCallback(async (page = 1, currentSearchTerm = debouncedSearchTerm, limit = 10, status = statusFilter) => {
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
      
      if (status !== 'all') {
        queryParams.set('status', status);
      }
      
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
  }, [debouncedSearchTerm, statusFilter]);

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
  }, [sessionStatus, session, searchParams, fetchData, router, statusFilter]);

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

  const handleSelectSchool = (schoolId) => {
    setSelectedSchools(prev => 
      prev.includes(schoolId) 
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSchools.length === schools.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(schools.map(school => school.id));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedSchools.length === 0) return;
    
    // Implement bulk actions here
    console.log(`Bulk ${action} for schools:`, selectedSchools);
    setSelectedSchools([]);
  };

  const exportToCSV = async () => {
    try {
      const response = await fetch(`/api/superadmin/schools?format=csv&search=${debouncedSearchTerm}&status=${statusFilter}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'schools.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export schools data.');
    }
  };
  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-900 dark:text-white">Loading Session...</p>
        </div>
      </div>
    );
  }
  
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-gray-900 dark:text-white">Access Denied</p>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // --- JSX Structure ---
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Schools Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and oversee all registered institutions on your platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={exportToCSV}
            className="rounded-xl"
            disabled={isLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link href="/schools/create">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Add School
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-xl text-white">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : pagination.totalSchools}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Schools</div>
            </div>
          </div>
        </div>
        
        <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-xl text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : schools.filter(s => s.isActive).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Schools</div>
            </div>
          </div>
        </div>
        
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : schools.filter(s => new Date(s.createdAt) > new Date(Date.now() - 30*24*60*60*1000)).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">New This Month</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="search"
              placeholder="Search schools by name or subdomain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-700/30 rounded-xl"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-white/50 dark:bg-slate-800/50 border-white/30 dark:border-slate-700/30 rounded-xl">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedSchools.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl">
                    <Settings2 className="w-4 h-4 mr-2" />
                    Actions ({selectedSchools.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Activate Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Deactivate Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkAction('delete')}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
      
      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Schools Table */}
      <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-slate-800/20">
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedSchools.length === schools.length && schools.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
              </TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-white">School</TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-white hidden md:table-cell">Domain</TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-white">Status</TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-white hidden lg:table-cell">Users</TableHead>
              <TableHead className="font-semibold text-gray-900 dark:text-white hidden sm:table-cell">Created</TableHead>
              <TableHead className="text-right font-semibold text-gray-900 dark:text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pagination.limit }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-b border-white/10 dark:border-white/5">
                  <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-3 w-24 rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-12 rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20 rounded" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : schools.length > 0 ? schools.map((school) => (
              <TableRow 
                key={school.id} 
                className="border-b border-white/10 dark:border-white/5 hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedSchools.includes(school.id)}
                    onChange={() => handleSelectSchool(school.id)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold text-sm">
                      {school.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {school.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 md:hidden">
                        {school.subdomain}.sukuu.com
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">{school.subdomain}.sukuu.com</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={school.isActive}
                      onCheckedChange={() => handleToggleActive(school.id, school.isActive)}
                      className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300"
                    />
                    <Badge
                      variant={school.isActive ? "default" : "secondary"}
                      className={`rounded-full text-xs hidden lg:inline-flex ${
                        school.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}
                    >
                      {school.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{school._count?.users || 0}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{new Date(school.createdAt).toLocaleDateString()}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/schools/${school.id}`}>
                      <Button variant="ghost" size="sm" className="rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/schools/${school.id}/edit`}>
                      <Button variant="ghost" size="sm" className="rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
                        <DropdownMenuItem>
                          <Settings2 className="w-4 h-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 dark:text-red-400">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-b border-white/10 dark:border-white/5">
                <TableCell colSpan="7" className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <School className="w-12 h-12 text-gray-400" />
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">No schools found</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first school'}
                      </p>
                    </div>
                    {!searchTerm && (
                      <Link href="/schools/create">
                        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl">
                          <Plus className="w-4 h-4 mr-2" />
                          Add First School
                        </Button>
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 flex-wrap gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.limit, pagination.totalSchools)} of{' '}
            {pagination.totalSchools} schools
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handlePageChange(1)} 
              disabled={pagination.currentPage === 1}
              className="rounded-lg"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)} 
              disabled={pagination.currentPage === 1}
              className="rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + Math.max(1, pagination.currentPage - 2);
                if (page > pagination.totalPages) return null;
                return (
                  <Button
                    key={page}
                    variant={page === pagination.currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={`rounded-lg w-10 ${
                      page === pagination.currentPage 
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                        : ''
                    }`}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)} 
              disabled={pagination.currentPage === pagination.totalPages}
              className="rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handlePageChange(pagination.totalPages)} 
              disabled={pagination.currentPage === pagination.totalPages}
              className="rounded-lg"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}