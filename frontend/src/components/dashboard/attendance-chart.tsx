'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '@/lib/api-client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AttendanceData {
  date: string
  present: number
  absent: number
  late: number
}

export function AttendanceChart() {
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance-chart'],
    queryFn: async () => {
      const response = await attendanceApi.get<AttendanceData[]>(
        '/api/dashboard/attendance-chart'
      )
      return (
        response.data ?? [
          { date: 'Mon', present: 450, absent: 30, late: 20 },
          { date: 'Tue', present: 460, absent: 25, late: 15 },
          { date: 'Wed', present: 470, absent: 20, late: 10 },
          { date: 'Thu', present: 455, absent: 28, late: 17 },
          { date: 'Fri', present: 465, absent: 22, late: 13 },
        ]
      )
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-32 w-32 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" fill="hsl(var(--primary))" />
              <Bar dataKey="absent" fill="hsl(var(--destructive))" />
              <Bar dataKey="late" fill="hsl(var(--muted))" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
