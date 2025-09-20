"use client";

import { useEffect, useState } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Users, BedDouble, PlusCircle, ClipboardList } from 'lucide-react';

function StatCard({ title, value, hint, icon: Icon }) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-semibold">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
        </div>
        {Icon && <Icon className="h-8 w-8 text-muted-foreground" />}
      </div>
    </Card>
  )
}

export default function HostelDashboard() {
  const schoolData = useSchool();
  const { data: session } = useSession();
  const [stats, setStats] = useState({ hostels: 0, rooms: 0, occupiedBeds: 0, totalBeds: 0 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!schoolData?.id || !session) return;
      try {
        const res = await fetch(`/api/schools/${schoolData.id}/resources/hostels/stats`);
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        if (!cancelled) setStats({
          hostels: data.hostels || 0,
          rooms: data.rooms || 0,
          occupiedBeds: data.occupiedBeds || 0,
          totalBeds: data.totalBeds || 0,
        });
      } catch (e) {
        if (!cancelled) setStats({ hostels: 0, rooms: 0, occupiedBeds: 0, totalBeds: 0 });
      }
    }
    load();
    return () => { cancelled = true };
  }, [schoolData?.id, session]);

  const availableBeds = Math.max(stats.totalBeds - stats.occupiedBeds, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hostel Dashboard</h1>
        <p className="text-muted-foreground">Overview of hostels, rooms, and bed occupancy.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Hostels" value={stats.hostels} hint="Total hostels" icon={Home} />
        <StatCard title="Rooms" value={stats.rooms} hint="Total rooms across hostels" icon={ClipboardList} />
        <StatCard title="Beds (Occupied)" value={`${stats.occupiedBeds}`} hint={`Available: ${availableBeds}`} icon={BedDouble} />
        <StatCard title="Beds (Total)" value={stats.totalBeds} hint="Capacity" icon={Users} />
      </div>

      <Card className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="../resources/hostel">
            <Button variant="secondary"><Home className="h-4 w-4 mr-2"/> Manage Hostels</Button>
          </Link>
          <Link href="../resources/hostel?create=1">
            <Button><PlusCircle className="h-4 w-4 mr-2"/> Add Hostel</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
