'use client'

import { Button } from '@/components/ui/button'
import { CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Attendance</h1>
        <Button>
          <CalendarDays className="mr-2 h-4 w-4" />
          Mark Attendance
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Attendance Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Attendance tracking features will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
