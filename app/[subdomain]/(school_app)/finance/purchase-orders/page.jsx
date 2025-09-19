'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

function formatCurrency(n) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n || 0))
  } catch {
    return `$${Number(n || 0).toFixed(2)}`
  }
}

function formatDate(d) {
  if (!d) return '-'
  try {
    const dt = typeof d === 'string' ? new Date(d) : d
    return dt.toLocaleDateString()
  } catch {
    return String(d)
  }
}

export default function PurchaseOrdersPage() {
  const params = useParams()
  const router = useRouter()
  const subdomain = params.subdomain
  const [schoolId, setSchoolId] = useState('')

  // Filters and pagination
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')
  const [vendorId, setVendorId] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Data
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [vendors, setVendors] = useState([])
  const [invItems, setInvItems] = useState([])

  // Create PO dialog state
  const [creating, setCreating] = useState(false)
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({ vendorId: '', expectedDeliveryDate: '', notes: '' })
  const [items, setItems] = useState([
    { itemName: '', description: '', quantity: 1, unitPrice: 0, inventoryItemId: 'NONE' },
  ])

  useEffect(() => {
    try {
      const id = typeof window !== 'undefined' ? (window.__SCHOOL_ID__ || localStorage.getItem('schoolId') || '') : ''
      setSchoolId(id || '')
    } catch {}
  }, [])

  // Load vendors and inventory items for selects
  useEffect(() => {
    if (!schoolId) return
    let ignore = false
    async function loadRefs() {
      try {
        const [vRes, iRes] = await Promise.all([
          fetch(`/api/schools/${schoolId}/finance/vendors`),
          fetch(`/api/schools/${schoolId}/resources/inventory-items?limit=1000`),
        ])
        if (!ignore) {
          if (vRes.ok) {
            const vd = await vRes.json()
            setVendors(vd.vendors || [])
          }
          if (iRes.ok) {
            const idata = await iRes.json()
            setInvItems(idata.items || [])
          }
        }
      } catch (e) {
        if (!ignore) toast.error('Failed to load vendors/items')
      }
    }
    loadRefs()
    return () => { ignore = true }
  }, [schoolId])

  const queryString = useMemo(() => {
    const usp = new URLSearchParams()
    if (q) usp.set('q', q)
  if (status && status !== 'ALL') usp.set('status', status)
  if (vendorId && vendorId !== 'ALL') usp.set('vendorId', vendorId)
    usp.set('page', String(page))
    usp.set('pageSize', String(pageSize))
    return usp.toString()
  }, [q, status, vendorId, page, pageSize])

  // Load purchase orders
  useEffect(() => {
    if (!schoolId) return
    let ignore = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/schools/${schoolId}/procurement/purchase-orders?` + queryString)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        if (!ignore) {
          setList(data.data || [])
          setTotal(data.total || 0)
        }
      } catch (e) {
        if (!ignore) toast.error('Failed to fetch purchase orders')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [schoolId, queryString])

  function resetForm() {
    setForm({ vendorId: '', expectedDeliveryDate: '', notes: '' })
  setItems([{ itemName: '', description: '', quantity: 1, unitPrice: 0, inventoryItemId: 'NONE' }])
  }

  async function submitCreate() {
    if (!schoolId) return
    try {
      // Basic validation
      if (!form.vendorId) {
        toast.error('Select a vendor')
        return
      }
      const payload = {
        vendorId: form.vendorId,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        notes: form.notes || undefined,
        items: items
          .filter((i) => i.itemName && i.quantity > 0)
          .map((i) => ({
            itemName: i.itemName,
            description: i.description || undefined,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice || 0),
            inventoryItemId: i.inventoryItemId && i.inventoryItemId !== 'NONE' ? i.inventoryItemId : undefined,
          })),
      }
      if (!payload.items.length) {
        toast.error('Add at least one item')
        return
      }
      setCreating(true)
      const res = await fetch(`/api/schools/${schoolId}/procurement/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create purchase order')
      }
      const { purchaseOrder } = await res.json()
      toast.success('Purchase order created')
      setOpenCreate(false)
      resetForm()
      // Refresh list
      setPage(1)
      // Navigate to detail
      router.push(`/${subdomain}/finance/purchase-orders/${purchaseOrder.id}`)
    } catch (e) {
      toast.error(e.message || 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Purchase Orders</h1>
        <Dialog open={openCreate} onOpenChange={(o) => { setOpenCreate(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button>Create Purchase Order</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>New Purchase Order</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Vendor</label>
                  <Select value={form.vendorId} onValueChange={(v) => setForm((f) => ({ ...f, vendorId: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Expected Delivery Date</label>
                  <Input type="date" className="mt-1" value={form.expectedDeliveryDate} onChange={(e) => setForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea className="mt-1" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setItems((arr) => [...arr, { itemName: '', description: '', quantity: 1, unitPrice: 0, inventoryItemId: '' }])}>Add item</Button>
                </div>
                <ScrollArea className="max-h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Item name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-32">Unit Price</TableHead>
                        <TableHead className="min-w-[200px]">Link Inv. Item (optional)</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input value={it.itemName} onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, itemName: e.target.value } : x))} placeholder="e.g., A4 Paper (Ream)" />
                          </TableCell>
                          <TableCell>
                            <Input value={it.description} onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} placeholder="Optional details" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={1} value={it.quantity} onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, unitPrice: Number(e.target.value) } : x))} />
                          </TableCell>
                          <TableCell>
                            <Select value={it.inventoryItemId || 'NONE'} onValueChange={(v) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, inventoryItemId: v } : x))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Optional link" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">None</SelectItem>
                                {invItems.map((inv) => (
                                  <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}>✕</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No items. Click "Add item".</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
              <Button onClick={submitCreate} disabled={creating}>{creating ? 'Creating...' : 'Create PO'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium">Search</label>
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Order number or notes" />
            </div>
            <div className="w-[200px]">
              <label className="text-xs font-medium">Status</label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[240px]">
              <label className="text-xs font-medium">Vendor</label>
              <Select value={vendorId} onValueChange={(v) => { setVendorId(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="All vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All vendors</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-[140px]">
            <label className="text-xs font-medium">Page size</label>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10,20,50,100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No purchase orders found</TableCell>
                </TableRow>
              )}
              {list.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.orderNumber}</TableCell>
                  <TableCell>{po.vendor?.name || '-'}</TableCell>
                  <TableCell className="text-right">{po._count?.items ?? '-'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(po.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={po.status === 'RECEIVED' ? 'default' : 'secondary'}>{po.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(po.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link className="text-primary underline" href={`/${subdomain}/finance/purchase-orders/${po.id}`}>Open</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages} • {total} total</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
