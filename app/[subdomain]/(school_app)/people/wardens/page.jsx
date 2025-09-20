'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialForm = {
  id: null,
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: '',
  staffIdNumber: '',
  jobTitle: 'Hostel Warden',
  qualification: '',
  departmentId: '',
}

export default function WardensPage() {
  const { subdomain } = useParams()
  const [schoolId, setSchoolId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState([])

  useEffect(() => {
    try { setSchoolId(window.__SCHOOL_ID__ || localStorage.getItem('schoolId') || '') } catch {}
  }, [])

  async function load() {
    if (!schoolId) return
    setLoading(true)
    try {
      const [listRes, depRes] = await Promise.all([
        fetch(`/api/schools/${schoolId}/people/wardens`),
        fetch(`/api/schools/${schoolId}/academics/departments`)
      ])
      const list = await listRes.json()
      const deps = await depRes.json().catch(() => ({ departments: [] }))
      if (!listRes.ok) throw new Error(list?.error || 'Failed to load wardens')
      setRows(Array.isArray(list.data) ? list.data : [])
      setDepartments(Array.isArray(deps.departments) ? deps.departments : [])
    } catch (e) {
      toast.error(e.message || 'Failed to load')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [schoolId])

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }
  function openCreate() { setForm(initialForm); setOpen(true) }
  function openEdit(r) {
    setForm({
      id: r.id,
      firstName: r.firstName || '',
      lastName: r.lastName || '',
      email: r.email || '',
      password: '',
      phoneNumber: r.phoneNumber || '',
      staffIdNumber: r.staffIdNumber || '',
      jobTitle: r.jobTitle || 'Hostel Warden',
      qualification: r.qualification || '',
      departmentId: r.departmentId || '',
    });
    setOpen(true)
  }

  async function save() {
    try {
      setSaving(true)
      const isEdit = !!form.id
      const url = isEdit ? `/api/schools/${schoolId}/people/wardens/${form.id}` : `/api/schools/${schoolId}/people/wardens`
      const method = isEdit ? 'PATCH' : 'POST'
      const payload = { ...form }
      if (isEdit && !payload.password) delete payload.password
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Save failed')
      toast.success(isEdit ? 'Updated' : 'Created')
      setOpen(false)
      await load()
    } catch (e) {
      toast.error(e.message || 'Save failed')
    } finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('Delete this warden?')) return
    try {
      const res = await fetch(`/api/schools/${schoolId}/people/wardens/${id}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Delete failed')
      toast.success('Deleted')
      await load()
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Hostel Wardens</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>New Warden</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit Warden' : 'New Warden'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input name="firstName" value={form.firstName} onChange={onChange} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input name="lastName" value={form.lastName} onChange={onChange} />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input name="email" type="email" value={form.email} onChange={onChange} />
              </div>
              <div className="sm:col-span-2">
                <Label>Password {form.id ? '(leave blank to keep)' : ''}</Label>
                <Input name="password" type="password" value={form.password} onChange={onChange} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input name="phoneNumber" value={form.phoneNumber} onChange={onChange} />
              </div>
              <div>
                <Label>Staff ID</Label>
                <Input name="staffIdNumber" value={form.staffIdNumber} onChange={onChange} />
              </div>
              <div>
                <Label>Job Title</Label>
                <Input name="jobTitle" value={form.jobTitle} onChange={onChange} />
              </div>
              <div>
                <Label>Qualification</Label>
                <Input name="qualification" value={form.qualification} onChange={onChange} />
              </div>
              <div className="sm:col-span-2">
                <Label>Department</Label>
                <select name="departmentId" className="border rounded h-9 px-2 w-full" value={form.departmentId} onChange={onChange}>
                  <option value="">— None —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : (form.id ? 'Save Changes' : 'Create')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Staff ID</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6}>No wardens yet.</TableCell></TableRow>
            ) : rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.firstName} {r.lastName}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.phoneNumber || '-'}</TableCell>
                <TableCell>{r.staffIdNumber}</TableCell>
                <TableCell>{r.department?.name || '-'}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => del(r.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
