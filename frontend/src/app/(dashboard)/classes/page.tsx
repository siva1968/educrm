'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ClassesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Classes</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Class
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Class Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Class management features will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
