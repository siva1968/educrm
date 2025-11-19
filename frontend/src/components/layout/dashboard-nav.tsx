'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  DollarSign,
  BookOpen,
  ClipboardCheck,
  Award,
  Settings,
  UserCog,
  BarChart3,
  Building,
  Bus,
  Library,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Teachers', href: '/teachers', icon: GraduationCap },
  { name: 'Classes', href: '/classes', icon: Building },
  { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
  { name: 'Timetable', href: '/timetable', icon: CalendarDays },
  { name: 'Examinations', href: '/examinations', icon: BookOpen },
  { name: 'Gradebook', href: '/gradebook', icon: Award },
  { name: 'Fees', href: '/fees', icon: DollarSign },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Transport', href: '/transport', icon: Bus },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'HR', href: '/hr', icon: UserCog },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">EduCRM</span>
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
