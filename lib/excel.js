import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

export function booksToWorksheetRows(books) {
  return books.map(b => ({
    Title: b.title,
    Author: b.author,
    ISBN: b.isbn || '',
    Year: b.publicationYear || '',
    Genre: b.genre || '',
    Copies: b.copiesAvailable ?? 1,
  }))
}

export function rowsToBooks(rows) {
  return rows.map(r => ({
    title: String(r.Title || '').trim(),
    author: String(r.Author || '').trim(),
    isbn: r.ISBN ? String(r.ISBN).trim() : null,
    publicationYear: r.Year ? Number(r.Year) : null,
    genre: r.Genre ? String(r.Genre).trim() : null,
    copiesAvailable: r.Copies ? Number(r.Copies) : 1,
  })).filter(r => r.title && r.author)
}

export function buildBooksWorkbook(books) {
  const rows = booksToWorksheetRows(books)
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Books')
  return wb
}

export async function exportBooksToBuffer(books) {
  const wb = buildBooksWorkbook(books)
  // Return a Node Buffer so we can stream without touching disk
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
  return buf
}

// Best-effort background persistence to public/exports. Returns filePath or null.
export async function tryWriteBooksExport(schoolId, books) {
  try {
    const wb = buildBooksWorkbook(books)
    const exportsDir = path.join(process.cwd(), 'public', 'exports')
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true })
    const filePath = path.join(exportsDir, `${schoolId}-books.xlsx`)
    XLSX.writeFile(wb, filePath)
    return filePath
  } catch (err) {
    // Non-fatal: environments like serverless/Edge may not allow writes
    console.warn('Books export write skipped:', err?.message)
    return null
  }
}

export async function parseBooksFromExcel(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer)
  const wb = XLSX.read(data, { type: 'array' })
  const firstSheet = wb.SheetNames[0]
  const ws = wb.Sheets[firstSheet]
  const rows = XLSX.utils.sheet_to_json(ws)
  return rowsToBooks(rows)
}
