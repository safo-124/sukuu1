// app/api/schools/[schoolId]/resources/books/[bookId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateBookSchema, bookIdSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/books/[bookId]
// Fetches a single book by ID
export async function GET(request, { params }) {
  const { schoolId, bookId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'STUDENT' && session.user?.role !== 'PARENT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    bookIdSchema.parse(bookId);

    const book = await prisma.book.findUnique({
      where: { id: bookId, schoolId: schoolId },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ book }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Book by ID) - Error for school ${schoolId}, book ${bookId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve book.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/resources/books/[bookId]
// Updates an existing book
export async function PUT(request, { params }) {
  const { schoolId, bookId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    bookIdSchema.parse(bookId);
    const validation = updateBookSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Book) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingBook = await prisma.book.findUnique({
      where: { id: bookId, schoolId: schoolId },
    });

    if (!existingBook) {
      return NextResponse.json({ error: 'Book not found or does not belong to this school.' }, { status: 404 });
    }

    // Check for unique ISBN conflict if ISBN is being updated
    if (validation.data.isbn && validation.data.isbn !== existingBook.isbn) {
        const existingBookWithIsbn = await prisma.book.findUnique({
            where: { schoolId_isbn: { schoolId: schoolId, isbn: validation.data.isbn } } // Check unique compound index
        });
        if (existingBookWithIsbn) {
            return NextResponse.json({ error: 'Another book with this ISBN already exists for this school.' }, { status: 409 });
        }
    }


    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ book: updatedBook, message: 'Book updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT Book) - Detailed error for school ${schoolId}, book ${bookId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (P2002) if ISBN is updated to conflict
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('isbn')) {
        return NextResponse.json({ error: 'A book with this ISBN already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update book.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/resources/books/[bookId]
// Deletes a book
export async function DELETE(request, { params }) {
  const { schoolId, bookId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    bookIdSchema.parse(bookId);

    const existingBook = await prisma.book.findUnique({
      where: { id: bookId, schoolId: schoolId },
    });

    if (!existingBook) {
      return NextResponse.json({ error: 'Book not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.book.delete({
      where: { id: bookId },
    });

    return NextResponse.json({ message: 'Book deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if book is checked out)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete book: it has associated checkout records. Please return all copies first.' }, { status: 409 });
    }
    console.error(`API (DELETE Book) - Detailed error for school ${schoolId}, book ${bookId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete book.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
