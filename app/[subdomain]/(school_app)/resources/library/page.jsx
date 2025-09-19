// app/[subdomain]/(school_app)/resources/library/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Book, Edit3, Trash2, UserRound, Loader2, AlertTriangle, PlusCircle, FileText, Search, Library as LibraryIcon, ClipboardList, Download, Upload
} from 'lucide-react'; // Added LibraryIcon, Search, ClipboardList

// Initial form data for Book
const initialBookFormData = {
  id: null,
  title: '',
  author: '',
  isbn: '',
  publicationYear: '',
  genre: '',
  copiesAvailable: 1, // Default to 1,
};

// Reusable FormFields Component for Book
const BookFormFields = ({ formData, onFormChange, isEdit = false }) => {
  const labelTextClasses = 'text-black dark:text-white block text-sm font-medium mb-1 text-left';
  const inputTextClasses = 'bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500';

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar'>
      <div>
        <Label htmlFor='title' className={labelTextClasses}>Title <span className='text-red-500'>*</span></Label>
        <Input id='title' name='title' value={formData.title || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor='author' className={labelTextClasses}>Author <span className='text-red-500'>*</span></Label>
        <Input id='author' name='author' value={formData.author || ''} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor='isbn' className={labelTextClasses}>ISBN</Label>
        <Input id='isbn' name='isbn' value={formData.isbn || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor='publicationYear' className={labelTextClasses}>Publication Year</Label>
        <Input id='publicationYear' name='publicationYear' type='number' value={formData.publicationYear || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} placeholder='e.g., 2023' />
      </div>
      <div>
        <Label htmlFor='genre' className={labelTextClasses}>Genre (Optional)</Label>
        <Input id='genre' name='genre' value={formData.genre || ''} onChange={onFormChange} className={`${inputTextClasses} mt-1`} />
      </div>
      <div>
        <Label htmlFor='copiesAvailable' className={labelTextClasses}>Copies Available <span className='text-red-500'>*</span></Label>
        <Input id='copiesAvailable' name='copiesAvailable' type='number' min='1' value={formData.copiesAvailable || 1} onChange={onFormChange} required className={`${inputTextClasses} mt-1`} placeholder='e.g., 1' />
      </div>
    </div>
  );
};

export default function ManageLibraryPage() {
  const schoolData = useSchool();
  const { data: session } = useSession();

  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // New state for search

  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false);
  const [bookFormData, setBookFormData] = useState({ ...initialBookFormData });
  const [editingBook, setEditingBook] = useState(null);
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);
  const [bookFormError, setBookFormError] = useState('');
  const [importing, setImporting] = useState(false)

  const handleImportChange = async (e) => {
    if (!schoolData?.id) return
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/schools/${schoolData.id}/resources/books/import`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      toast.success(`Imported ${data.count} book(s)`) 
      fetchBooks()
    } catch (err) {
      toast.error('Import failed', { description: err.message })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  // Tailwind class constants
  const titleTextClasses = 'text-black dark:text-white';
  const descriptionTextClasses = 'text-zinc-600 dark:text-zinc-400';
  const primaryButtonClasses = 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200';
  const outlineButtonClasses = 'border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800';
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const searchInputClasses = 'bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500';

  // --- Fetching Data ---
  const fetchBooks = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoading(true); setError('');
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      // Add other filters if you implement them (e.g., genreFilter)

      const response = await fetch(`/api/schools/${schoolData.id}/resources/books?${queryParams.toString()}`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to fetch books.'); }
      const data = await response.json();
      setBooks(data.books || []);
    } catch (err) { toast.error('Error fetching books', { description: err.message }); setError(err.message);
    } finally { setIsLoading(false); }
  }, [schoolData?.id, searchTerm]); // Depend on searchTerm to refetch on search

  useEffect(() => {
    if (schoolData?.id && session) {
      fetchBooks();
    }
  }, [schoolData, session, fetchBooks]);

  // --- Book Form Handlers ---
  const handleBookFormChange = (e) => setBookFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const openAddBookDialog = () => {
    setEditingBook(null);
    setBookFormData({ ...initialBookFormData });
    setBookFormError('');
    setIsBookDialogOpen(true);
  };

  const openEditBookDialog = (book) => {
    setEditingBook(book);
    setBookFormData({
      id: book.id,
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      publicationYear: book.publicationYear?.toString() || '',
      genre: book.genre || '',
      copiesAvailable: book.copiesAvailable || 1,
    });
    setBookFormError('');
    setIsBookDialogOpen(true);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!schoolData?.id) return;
    setIsSubmittingBook(true); setBookFormError('');

    const isEditing = !!editingBook;
    const payload = {
      title: bookFormData.title,
      author: bookFormData.author,
      isbn: bookFormData.isbn || null,
      publicationYear: bookFormData.publicationYear ? parseInt(bookFormData.publicationYear, 10) : null,
      genre: bookFormData.genre || null,
      copiesAvailable: bookFormData.copiesAvailable ? parseInt(bookFormData.copiesAvailable, 10) : 1, // Ensure at least 1
    };

    const url = isEditing
      ? `/api/schools/${schoolData.id}/resources/books/${editingBook.id}`
      : `/api/schools/${schoolData.id}/resources/books`;
    const method = isEditing ? 'PUT' : 'POST';
    const actionText = isEditing ? 'update' : 'create';

    try {
      const response = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        let err = result.error || `Failed to ${actionText} book.`;
        if (result.issues) err = result.issues.map(i => `${i.path.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Failed`, { description: err }); setBookFormError(err);
      } else {
        // Corrected syntax for toast.success template literal
        toast.success(`Book "${result.book?.title}" ${actionText}d successfully!`);
        setIsBookDialogOpen(false);
        fetchBooks(); // Re-fetch books
      }
    } catch (err) { toast.error('An unexpected error occurred.'); setBookFormError('An unexpected error occurred.');
    } finally { setIsSubmittingBook(false); }
  };

  const handleDeleteBook = async (bookId, bookTitle) => {
    if (!schoolData?.id) return;
    // Corrected syntax for window.confirm template literal
    if (!window.confirm(`Are you sure you want to DELETE book "${bookTitle}" and all its copies?`)) return;
    const toastId = `delete-book-${bookId}`;
    toast.loading('Deleting book...', { id: toastId });
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/resources/books/${bookId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Deletion failed.');
      toast.success(result.message || `Book "${bookTitle}" deleted.`, { id: toastId });
      fetchBooks();
    } catch (err) { toast.error(`Deletion Failed: ${err.message}`, { id: toastId }); }
  };

  return (
    <div className='space-y-8'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <LibraryIcon className='mr-3 h-8 w-8 opacity-80'/>Manage Library
          </h1>
          <p className={descriptionTextClasses}>Add, edit, and manage books in your school library catalog.</p>
        </div>
        <div className='flex flex-col sm:flex-row gap-2'>
          {/* Add Book Button */}
          <Button
            variant='outline'
            className={outlineButtonClasses}
            onClick={async () => {
              try {
                const res = await fetch(`/api/schools/${schoolData.id}/resources/books/export`)
                if (!res.ok) throw new Error('Export failed')
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${schoolData?.subdomain || 'school'}-books.xlsx`
                a.click()
                URL.revokeObjectURL(url)
              } catch (e) {
                toast.error('Export failed', { description: e.message })
              }
            }}
            title='Export to Excel'
          >
            <Download className='mr-2 h-4 w-4'/> Export
          </Button>

          <input id='book-import-file' type='file' accept='.xlsx,.xls' className='hidden' onChange={handleImportChange} />
          <Button
            variant='outline'
            className={outlineButtonClasses}
            disabled={importing}
            title='Import from Excel'
            onClick={() => document.getElementById('book-import-file')?.click()}
          >
            <Upload className='mr-2 h-4 w-4'/>{importing ? 'Importing…' : 'Import'}
          </Button>

          <Dialog open={isBookDialogOpen} onOpenChange={(open) => { setIsBookDialogOpen(open); if (!open) setBookFormError(''); }}>
            <DialogTrigger asChild>
              <Button className={primaryButtonClasses} onClick={openAddBookDialog}> <PlusCircle className='mr-2 h-4 w-4' /> Add New Book </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-lg md:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800'>
              <DialogHeader>
                <DialogTitle className={titleTextClasses}>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
                <DialogDescription className={descriptionTextClasses}>
                  {editingBook ? 'Update book details in the catalog.' : 'Enter details for a new book in the library.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBookSubmit} className='space-y-6 py-1'>
                <BookFormFields
                  formData={bookFormData}
                  onFormChange={handleBookFormChange}
                  isEdit={!!editingBook}
                />
                {bookFormError && ( <p className='text-sm text-red-600 dark:text-red-400 md:col-span-full'>{bookFormError}</p> )}
                <DialogFooter className='pt-6'>
                  <DialogClose asChild><Button type='button' variant='outline' className={outlineButtonClasses}>Cancel</Button></DialogClose>
                  <Button type='submit' className={primaryButtonClasses} disabled={isSubmittingBook}>
                    {isSubmittingBook ? <><Loader2 className='mr-2 h-4 w-4 animate-spin'/>{editingBook ? 'Saving...' : 'Adding Book...'}</> : editingBook ? 'Save Changes' : 'Add Book'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && ( <Alert variant='destructive' className='bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50'> <AlertTriangle className='h-4 w-4' /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert> )}

      {/* Search Bar */}
      <div className='relative'>
        <Input
          type='text'
          placeholder='Search books by title, author, or ISBN...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${searchInputClasses} pl-10`}
        />
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 dark:text-zinc-400' />
      </div>

      {/* Books Table */}
      <div className={`${glassCardClasses} overflow-x-auto`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <Book className='mr-2 h-6 w-6 opacity-80'/>Book Catalog
        </h2>
        <Table>
          <TableHeader>
            <TableRow className='border-zinc-200/80 dark:border-zinc-700/80'>
              <TableHead className={`${titleTextClasses} font-semibold`}>Title</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell`}>Author</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>ISBN</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center hidden lg:table-cell`}>Year</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold text-center hidden lg:table-cell`}>Genre</TableHead>
               <TableHead className={`${titleTextClasses} font-semibold text-center`}>Copies</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`book-skeleton-${index}`} className='border-zinc-200/50 dark:border-zinc-800/50'>
                  <TableCell><Skeleton className='h-5 w-32 rounded' /></TableCell>
                  <TableCell className='hidden sm:table-cell'><Skeleton className='h-5 w-24 rounded' /></TableCell>
                  <TableCell className='hidden md:table-cell'><Skeleton className='h-5 w-20 rounded' /></TableCell>
                  <TableCell className='text-center hidden lg:table-cell'><Skeleton className='h-5 w-16 rounded' /></TableCell>
                  <TableCell className='text-center hidden lg:table-cell'><Skeleton className='h-5 w-24 rounded' /></TableCell>
                  <TableCell className='text-center'><Skeleton className='h-5 w-16 rounded' /></TableCell>
                  <TableCell className='text-right'><div className='flex justify-end gap-2'><Skeleton className='h-8 w-8 rounded' /><Skeleton className='h-8 w-8 rounded' /></div></TableCell>
                </TableRow>
              ))
            ) : books.length > 0 ? books.map((book) => (
              <TableRow key={book.id} className='border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5'>
                <TableCell className={`${descriptionTextClasses} font-medium`}>{book.title}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>{book.author}</TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{book.isbn || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-center hidden lg:table-cell`}>{book.publicationYear || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-center hidden lg:table-cell`}>{book.genre || 'N/A'}</TableCell>
                <TableCell className={`${descriptionTextClasses} text-center`}>{book.copiesAvailable}</TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-1 md:gap-2'>
                    <Button variant='outline' size='icon' className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEditBookDialog(book)} title='Edit Book'> <Edit3 className='h-4 w-4' /> </Button>
                    {/* Future: Link to Book Checkout/Borrowing - requires new models and APIs */}
                    {/* <Link href={`/${schoolData.subdomain}/resources/library/checkout?bookId=${book.id}`} passHref>
                      <Button variant='outline' size='icon' className={`${outlineButtonClasses} h-8 w-8`} title='Manage Copies/Checkout'> <ClipboardList className='h-4 w-4' /> </Button>
                    </Link> */}
                    <Button variant='outline' size='icon' className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDeleteBook(book.id, book.title)} title='Delete Book'> <Trash2 className='h-4 w-4' /> </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className='border-zinc-200/50 dark:border-zinc-800/50'>
                <TableCell colSpan='7' className={`text-center py-10 ${descriptionTextClasses}`}>
                  No books in the library yet. Click "Add New Book" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Optional: Future sections like Borrowed Books, Overdue, etc. */}
      <div className={`${glassCardClasses} mt-8`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4 flex items-center`}>
          <ClipboardList className='mr-2 h-6 w-6 opacity-80'/>Loans
        </h2>
        <div className='flex gap-2'>
          <Link href={`/${schoolData?.subdomain}/resources/library/loans`}>
            <Button variant='outline' className={outlineButtonClasses}>View Loans</Button>
          </Link>
          <Link href={`/${schoolData?.subdomain}/resources/library/loans/new`}>
            <Button className={primaryButtonClasses}><PlusCircle className='h-4 w-4 mr-2'/>New Loan</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
