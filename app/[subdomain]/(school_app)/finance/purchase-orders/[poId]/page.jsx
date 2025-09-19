'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function formatCurrency(n) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n || 0)) } catch { return `$${Number(n || 0).toFixed(2)}` }
}
function formatDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleString() } catch { return String(d) } }

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const subdomain = params.subdomain
  const poId = params.poId
  const [schoolId, setSchoolId] = useState('')
  const [po, setPo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openReceive, setOpenReceive] = useState(false)
  const [receiving, setReceiving] = useState(false)
  const [receiveLines, setReceiveLines] = useState([])
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    try { setSchoolId(window.__SCHOOL_ID__ || localStorage.getItem('schoolId') || '') } catch {}
  }, [])

  async function load() {
    if (!schoolId || !poId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/schools/${schoolId}/procurement/purchase-orders/${poId}`)
      if (!res.ok) throw new Error('Failed to fetch purchase order')
      const data = await res.json()
      setPo(data.purchaseOrder)
      // Initialize receive lines with zero qty
      setReceiveLines((data.purchaseOrder?.items || []).map((it) => ({ purchaseOrderItemId: it.id, itemName: it.itemName, requested: it.quantity, quantityReceived: 0, inventoryItemId: it.inventoryItemId })))
    } catch (e) {
      toast.error(e.message || 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [schoolId, poId])

  async function submitReceive() {
    try {
      const items = receiveLines.filter((l) => l.quantityReceived > 0).map((l) => ({ purchaseOrderItemId: l.purchaseOrderItemId, quantityReceived: Number(l.quantityReceived) }))
      if (!items.length) { toast.error('Enter at least one quantity to receive'); return }
      setReceiving(true)
      const res = await fetch(`/api/schools/${schoolId}/procurement/purchase-orders/${poId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, reference: reference || undefined, notes: notes || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to receive')
      }
      toast.success('Items received')
      setOpenReceive(false)
      await load()
    } catch (e) {
      toast.error(e.message || 'Failed to receive')
    } finally {
      setReceiving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground"><Link href={`/${subdomain}/finance/purchase-orders`} className="underline">Purchase Orders</Link> / Detail</div>
          <h1 className="text-xl font-semibold">{po?.orderNumber || 'Purchase Order'}</h1>
        </div>
        {po?.status !== 'RECEIVED' && (
          <Dialog open={openReceive} onOpenChange={setOpenReceive}>
            <DialogTrigger asChild>
              <Button>Receive items</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Receive Items</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Reference</label>
                    <Input className="mt-1" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g., GRN-002" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea className="mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
                <Card className="p-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Requested</TableHead>
                        <TableHead className="w-40 text-right">Receive now</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiveLines.map((l, idx) => (
                        <TableRow key={l.purchaseOrderItemId}>
                          <TableCell className="font-medium">{l.itemName}</TableCell>
                          <TableCell className="text-right">{l.requested}</TableCell>
                          <TableCell className="text-right">
                            <Input type="number" min={0} value={l.quantityReceived} onChange={(e) => setReceiveLines((arr) => arr.map((x, i) => i === idx ? { ...x, quantityReceived: Number(e.target.value) } : x))} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenReceive(false)}>Cancel</Button>
                <Button onClick={submitReceive} disabled={receiving}>{receiving ? 'Receiving...' : 'Confirm Receive'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Vendor</div>
            <div className="font-medium">{po?.vendor?.name || '-'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Status</div>
            <Badge variant={po?.status === 'RECEIVED' ? 'default' : 'secondary'}>{po?.status || '-'}</Badge>
          </div>
          <div>
            <div className="text-muted-foreground">Expected Delivery</div>
            <div className="font-medium">{formatDate(po?.expectedDeliveryDate)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Created</div>
            <div className="font-medium">{formatDate(po?.createdAt)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Amount</div>
            <div className="font-medium">{formatCurrency(po?.totalAmount)}</div>
          </div>
          <div className="sm:col-span-3">
            <div className="text-muted-foreground">Notes</div>
            <div className="font-medium whitespace-pre-wrap">{po?.notes || '-'}</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">Items</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Linked Inv. Item</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(po?.items || []).map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">{it.itemName}</TableCell>
                <TableCell>{it.description || '-'}</TableCell>
                <TableCell className="text-right">{it.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(it.unitPrice)}</TableCell>
                <TableCell className="text-right">{formatCurrency(it.totalPrice)}</TableCell>
                <TableCell>{it.inventoryItem ? `${it.inventoryItem.name} (stock: ${it.inventoryItem.quantityInStock ?? 0})` : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">Stock Transactions</h3>
        {(!po?.inventoryTransactions || po.inventoryTransactions.length === 0) ? (
          <div className="text-sm text-muted-foreground">No stock movements yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.inventoryTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell><Badge>{t.type}</Badge></TableCell>
                  <TableCell className="text-right">{t.quantity}</TableCell>
                  <TableCell className="truncate max-w-[240px]">{t.itemId}</TableCell>
                  <TableCell className="truncate max-w-[200px]">{t.reference || '-'}</TableCell>
                  <TableCell className="truncate max-w-[240px]">{t.reason || '-'}</TableCell>
                  <TableCell>{formatDate(t.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
