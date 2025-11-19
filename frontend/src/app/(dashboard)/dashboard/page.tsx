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
