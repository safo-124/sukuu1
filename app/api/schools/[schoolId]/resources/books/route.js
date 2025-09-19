// app/api/schools/[schoolId]/resources/books/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createBookSchema } from '@/validators/resources.validators'; // Import schemas
import { exportBooksToExcel } from '@/lib/excel';

// GET /api/schools/[schoolId]/resources/books
// Fetches all books for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'STUDENT' && session.user?.role !== 'PARENT')) {
    // Broaden access as teachers, students, parents might need to browse books
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');
  const genreFilter = searchParams.get('genre');

  try {
    schoolIdSchema.parse(schoolId);

    const whereClause = {
      schoolId: schoolId,
      ...(genreFilter && { genre: genreFilter }),
      ...(searchTerm && {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { author: { contains: searchTerm, mode: 'insensitive' } },
          { isbn: { contains: searchTerm, mode: 'insensitive' } },
        ]
      })
    };

    const books = await prisma.book.findMany({
      where: whereClause,
      orderBy: { title: 'asc' },
    });

    return NextResponse.json({ books }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Books) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve books.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/resources/books
// Creates a new book for a specific school
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'LIBRARIAN')) {
    // Restrict creation to School Admin or Librarian
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createBookSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST Book) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { title, author, isbn, publicationYear, genre, copiesAvailable } = validation.data;

    const newBook = await prisma.book.create({
      data: {
        title,
        author,
        isbn: isbn || null,
        publicationYear: publicationYear || null,
        genre: genre || null,
        copiesAvailable: copiesAvailable,
        schoolId: schoolId,
      },
    });
    // Regenerate Excel export after change
    const allBooks = await prisma.book.findMany({ where: { schoolId }, orderBy: { title: 'asc' } })
    await exportBooksToExcel(schoolId, allBooks)

    return NextResponse.json({ book: newBook, message: 'Book created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST Book) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for ISBN
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('isbn')) {
        return NextResponse.json({ error: 'A book with this ISBN already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create book.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
