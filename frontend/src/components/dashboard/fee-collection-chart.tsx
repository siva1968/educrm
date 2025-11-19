'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { feeApi } from '@/lib/api-client'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface FeeData {
  name: string
  value: number
}

export function FeeCollectionChart() {
  const { data: feeData, isLoading } = useQuery({
    queryKey: ['fee-collection-chart'],
    queryFn: async () => {
      const response = await feeApi.get<FeeData[]>(
        '/api/dashboard/fee-collection-chart'
      )
      return (
        response.data ?? [
          { name: 'Collected', value: 750000 },
          { name: 'Pending', value: 150000 },
          { name: 'Overdue', value: 100000 },
        ]
      )
    },
  })

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))', 'hsl(var(--destructive))']

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Collection Status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-32 w-32 animate-pulse rounded-full bg-muted" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={feeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {feeData?.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
