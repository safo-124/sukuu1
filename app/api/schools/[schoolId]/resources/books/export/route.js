// app/api/schools/[schoolId]/resources/books/export/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { exportBooksToBuffer, tryWriteBooksExport } from '@/lib/excel';

export async function GET(request, { params }) {
  const { schoolId } = params
  const session = await getServerSession(authOptions)
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','LIBRARIAN','SUPER_ADMIN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const books = await prisma.book.findMany({ where: { schoolId }, orderBy: { title: 'asc' } })
    const fileBuffer = await exportBooksToBuffer(books)
    // Fire-and-forget: persist to public/exports when possible
    tryWriteBooksExport(schoolId, books).catch(() => {})
    const res = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${schoolId}-books.xlsx"`,
      },
    })
    return res
  } catch (e) {
    console.error('Export books error', e)
    return NextResponse.json({ error: 'Failed to export books' }, { status: 500 })
  }
}
