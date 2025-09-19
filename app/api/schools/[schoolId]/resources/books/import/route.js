// app/api/schools/[schoolId]/resources/books/import/route.js
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { parseBooksFromExcel, exportBooksToExcel } from '@/lib/excel'

export async function POST(request, { params }) {
  const { schoolId } = params
  const session = await getServerSession(authOptions)
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','LIBRARIAN','SUPER_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })
    const arrayBuffer = await file.arrayBuffer()
    const books = await parseBooksFromExcel(arrayBuffer)
    if (!books.length) return NextResponse.json({ error: 'No valid rows found' }, { status: 400 })

    // Upsert by ISBN if present; otherwise create new record by title+author (soft rule)
    const ops = books.map(b => {
      const whereUnique = b.isbn ? { schoolId_isbn: { schoolId, isbn: b.isbn } } : undefined
      if (whereUnique) {
        return prisma.book.upsert({
          where: whereUnique,
          update: { title: b.title, author: b.author, publicationYear: b.publicationYear, genre: b.genre, copiesAvailable: b.copiesAvailable },
          create: { schoolId, ...b },
        })
      }
      return prisma.book.create({ data: { schoolId, ...b } })
    })

    const results = await prisma.$transaction(ops)
    // Regenerate export file after import
    const allBooks = await prisma.book.findMany({ where: { schoolId }, orderBy: { title: 'asc' } })
    await exportBooksToExcel(schoolId, allBooks)

    return NextResponse.json({ message: 'Import completed', count: results.length }, { status: 200 })
  } catch (e) {
    console.error('Import books error', e)
    return NextResponse.json({ error: 'Failed to import books' }, { status: 500 })
  }
}
