"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Package, Tags, Truck, CircleAlert, FileText, ArrowRight, Building2, Boxes } from 'lucide-react';

export default function ProcurementDashboardPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const subdomain = params?.subdomain;
  const schoolId = session?.user?.schoolId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const canView = useMemo(() => {
    const role = session?.user?.role;
    return role === 'PROCUREMENT_OFFICER' || role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  }, [session]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) return;

    if (!canView) {
      router.replace(`/${subdomain}/dashboard`);
      return;
    }

    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/schools/${schoolId}/dashboard/procurement`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setStats(data);
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || 'Error');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [status, session, schoolId, canView, router, subdomain]);

  if (status === 'loading' || loading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{String(error)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Procurement Dashboard</h1>
          <p className="text-sm text-muted-foreground">Quick snapshot of inventory and purchase activities</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${subdomain}/resources/stores`}>
            <Button variant="default" className="gap-2"><Boxes className="h-4 w-4"/> Manage Items</Button>
          </Link>
          <Link href={`/${subdomain}/resources/stores`}>
            <Button variant="outline" className="gap-2"><Tags className="h-4 w-4"/> Categories</Button>
          </Link>
          <Link href={`/${subdomain}/resources/stores`}>
            <Button variant="outline" className="gap-2"><Building2 className="h-4 w-4"/> Stores</Button>
          </Link>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
  <StatCard title="Items" value={stats?.itemsCount ?? 0} icon={Package} href={`/${subdomain}/resources/stores`} />
  <StatCard title="Categories" value={stats?.categoriesCount ?? 0} icon={Tags} href={`/${subdomain}/resources/stores`} />
  <StatCard title="Vendors" value={stats?.vendorsCount ?? 0} icon={Truck} href={`/${subdomain}/finance/vendors`} />
  <StatCard title="Low Stock" value={stats?.lowStockCount ?? 0} icon={CircleAlert} href={`/${subdomain}/resources/stores?filter=low-stock`} />
      </div>

      {/* Purchase order status summary (if model exists) */}
      {stats?.purchaseOrders && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Purchase Orders</h2>
            <Link href={`/${subdomain}/finance/expenses`} className="text-sm text-primary inline-flex items-center gap-1">View expenses <ArrowRight className="h-4 w-4"/></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(stats.purchaseOrders).map(([k,v]) => (
              <div key={k} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-1">{k.replaceAll('_',' ')}</div>
                <div className="text-xl font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent low stock */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Low stock items</h2>
          <Link href={`/${subdomain}/resources/stores?filter=low-stock`} className="text-sm text-primary inline-flex items-center gap-1">See all <ArrowRight className="h-4 w-4"/></Link>
        </div>
        {stats?.recentLowStock?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {stats.recentLowStock.map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">Qty: {item.quantityInStock ?? 0} / Reorder: {item.reorderLevel ?? '-'}</div>
                </div>
                <Badge variant="destructive">Low</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No low stock items right now.</p>
        )}
      </Card>

      {/* Recent 30-day expense summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Last 30 days</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground mb-1">Expense entries</div>
            <div className="text-xl font-semibold">{stats?.recentExpenses?.count ?? 0}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground mb-1">Total spent</div>
            <div className="text-xl font-semibold">GHS {Number(stats?.recentExpenses?.totalAmount ?? 0).toLocaleString()}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, href }) {
  return (
    <Link href={href}>
      <Card className="p-4 hover:border-primary transition-colors">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="flex items-center gap-2 mt-1">
          {Icon ? <Icon className="h-5 w-5 text-muted-foreground"/> : null}
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </Card>
    </Link>
  );
}
