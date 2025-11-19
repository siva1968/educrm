'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { studentApi } from '@/lib/api-client'
import { Activity } from '@/types'
import { formatDateTime } from '@/lib/utils'

export function RecentActivities() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const response = await studentApi.get<Activity[]>('/api/dashboard/activities')
      return response.data ?? []
    },
  })

  const getActivityIcon = (type: string) => {
    return type.substring(0, 2).toUpperCase()
  }

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      student: 'bg-blue-100 text-blue-800',
      attendance: 'bg-green-100 text-green-800',
      fee: 'bg-orange-100 text-orange-800',
      grade: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[type] || colors.other
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities && activities.length > 0 ? (
            activities.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-4 rounded-lg border p-3"
              >
                <Avatar>
                  <AvatarFallback className={getActivityColor(activity.type)}>
                    {getActivityIcon(activity.type)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.userName} • {formatDateTime(activity.timestamp)}
                  </p>
                </div>
                <Badge variant="outline">{activity.type}</Badge>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No recent activities
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
