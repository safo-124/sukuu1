// app/api/schools/[schoolId]/resources/books/[bookId]/route.js
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { schoolIdSchema, bookIdSchema, updateBookSchema } from '@/validators/resources.validators'
import { exportBooksToExcel } from '@/lib/excel'

// Helpers
function isViewer(role) {
  return ['SCHOOL_ADMIN','LIBRARIAN','TEACHER','STUDENT','PARENT'].includes(role)
}

function isEditor(role) {
  return ['SCHOOL_ADMIN','LIBRARIAN'].includes(role)
}

export async function GET(request, { params }) {
  const { schoolId, bookId } = params
  const session = await getServerSession(authOptions)
  if (!session || session.user?.schoolId !== schoolId || !isViewer(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    schoolIdSchema.parse(schoolId)
    bookIdSchema.parse(bookId)

    const book = await prisma.book.findFirst({ where: { id: bookId, schoolId } })
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    return NextResponse.json({ book }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 })
    }
    console.error('GET Book error', error)
    return NextResponse.json({ error: 'Failed to load book' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  const { schoolId, bookId } = params
  const session = await getServerSession(authOptions)
  if (!session || session.user?.schoolId !== schoolId || !isEditor(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    schoolIdSchema.parse(schoolId)
    bookIdSchema.parse(bookId)

    const validation = updateBookSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 })
    }

    const { title, author, isbn, publicationYear, genre, copiesAvailable } = validation.data

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(author !== undefined ? { author } : {}),
        ...(isbn !== undefined ? { isbn: isbn || null } : {}),
        ...(publicationYear !== undefined ? { publicationYear: publicationYear || null } : {}),
        ...(genre !== undefined ? { genre: genre || null } : {}),
        ...(copiesAvailable !== undefined ? { copiesAvailable } : {}),
      },
    })

    // Regenerate Excel on update
    const allBooks = await prisma.book.findMany({ where: { schoolId }, orderBy: { title: 'asc' } })
    await exportBooksToExcel(schoolId, allBooks)

    return NextResponse.json({ book: updated, message: 'Book updated successfully.' }, { status: 200 })
  } catch (error) {
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)'
      if (String(targetField).includes('isbn')) {
        return NextResponse.json({ error: 'A book with this ISBN already exists for this school.' }, { status: 409 })
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 })
    }
    console.error('PUT Book error', error)
    return NextResponse.json({ error: 'Failed to update book.' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const { schoolId, bookId } = params
  const session = await getServerSession(authOptions)
  if (!session || session.user?.schoolId !== schoolId || !isEditor(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    schoolIdSchema.parse(schoolId)
    bookIdSchema.parse(bookId)

    // Ensure the book belongs to the school
    const existing = await prisma.book.findFirst({ where: { id: bookId, schoolId } })
    if (!existing) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

    await prisma.book.delete({ where: { id: bookId } })

    // Regenerate Excel on delete
    const allBooks = await prisma.book.findMany({ where: { schoolId }, orderBy: { title: 'asc' } })
    await exportBooksToExcel(schoolId, allBooks)

    return NextResponse.json({ message: 'Book deleted successfully.' }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 })
    }
    console.error('DELETE Book error', error)
    return NextResponse.json({ error: 'Failed to delete book.' }, { status: 500 })
  }
}
