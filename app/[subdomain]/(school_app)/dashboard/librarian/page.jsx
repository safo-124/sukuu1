'use client'

import { useEffect, useState } from 'react'
import { useSchool } from '../../layout'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Users, ClipboardList, PlusCircle } from 'lucide-react'

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

export default function LibrarianDashboard() {
  const schoolData = useSchool()
  const { data: session } = useSession()
  const [stats, setStats] = useState({ books: 0, borrowed: 0, activeBorrowers: 0 })

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!schoolData?.id || !session) return
      try {
        const res = await fetch(`/api/schools/${schoolData.id}/resources/library/stats`)
        if (!res.ok) throw new Error('Failed to load stats')
        const data = await res.json()
        if (!cancelled) setStats({ books: data.books ?? 0, borrowed: data.borrowed ?? 0, activeBorrowers: data.activeBorrowers ?? 0 })
      } catch (e) {
        if (!cancelled) setStats({ books: 0, borrowed: 0, activeBorrowers: 0 })
      }
    }
    load()
    return () => { cancelled = true }
  }, [schoolData?.id, session])

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Library Dashboard</h1>
        <p className="text-muted-foreground">Overview of library resources and activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Books" value={stats.books} hint="Catalog size" icon={BookOpen} />
        <StatCard title="Books Borrowed" value={stats.borrowed} hint="Currently checked out" icon={ClipboardList} />
        <StatCard title="Active Borrowers" value={stats.activeBorrowers} hint="Students & staff" icon={Users} />
      </div>

      <Card className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="../resources/library">
            <Button variant="secondary"><BookOpen className="h-4 w-4 mr-2"/> Open Library</Button>
          </Link>
          <Link href="../resources/library/books/new">
            <Button><PlusCircle className="h-4 w-4 mr-2"/> Add New Book</Button>
          </Link>
          <Link href="../resources/library/loans">
            <Button variant="outline"><ClipboardList className="h-4 w-4 mr-2"/> Manage Loans</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
