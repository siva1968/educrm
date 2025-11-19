#!/bin/bash

# Complete Frontend Generator for EduCRM
echo "🚀 Creating comprehensive Next.js 14 frontend with TypeScript and Tailwind CSS..."

cd /home/user/educrm/frontend

# Create all directories
mkdir -p src/app/\(dashboard\)/{dashboard,students,attendance,fees,grades,timetable}
mkdir -p src/app/auth/login
mkdir -p src/components/{ui,dashboard,students,layout}
mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/store
mkdir -p public

# Dashboard Layout
cat > src/app/\(dashboard\)/layout.tsx << 'EOF'
import { DashboardNav } from '@/components/layout/dashboard-nav'
import { DashboardHeader } from '@/components/layout/dashboard-header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <DashboardNav />
      <div className="flex-1">
        <DashboardHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
EOF

# Dashboard Page
cat > src/app/\(dashboard\)/dashboard/page.tsx << 'EOF'
import { DashboardStats } from '@/components/dashboard/stats'
import { RecentActivities } from '@/components/dashboard/recent-activities'
import { AttendanceChart } from '@/components/dashboard/attendance-chart'
import { FeeCollectionChart } from '@/components/dashboard/fee-collection-chart'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <DashboardStats />
      <div className="grid gap-6 md:grid-cols-2">
        <AttendanceChart />
        <FeeCollectionChart />
      </div>
      <RecentActivities />
    </div>
  )
}
EOF

# Students Page
cat > src/app/\(dashboard\)/students/page.tsx << 'EOF'
'use client'

import { StudentsTable } from '@/components/students/students-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Students</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>
      <StudentsTable />
    </div>
  )
}
EOF

# Login Page
cat > src/app/auth/login/page.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement login
    console.log('Login:', { email, password })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">EduCRM</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  )
}
EOF

echo "✅ Core pages created successfully!"
echo "📦 Run 'cd frontend && npm install' to install dependencies"
