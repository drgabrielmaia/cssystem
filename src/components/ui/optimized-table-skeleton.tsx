'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OptimizedTableSkeletonProps {
  title?: string
  rows?: number
  columns?: number
  showActions?: boolean
  showStats?: boolean
}

function SkeletonRow({ columns, showActions }: { columns: number; showActions?: boolean }) {
  return (
    <tr className="border-b border-gray-700">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          {index === 0 ? (
            // First column - avatar and name
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse" />
              <div>
                <div className="h-4 bg-gray-700 rounded w-32 mb-2 animate-pulse" />
                <div className="h-3 bg-gray-600 rounded w-24 animate-pulse" />
              </div>
            </div>
          ) : index === 1 ? (
            // Second column - status/badge
            <div className="h-6 bg-gray-700 rounded-full w-20 animate-pulse" />
          ) : index === columns - 1 && showActions ? (
            // Actions column
            <div className="flex space-x-2">
              {Array.from({ length: 3 }).map((_, btnIndex) => (
                <div key={btnIndex} className="w-8 h-8 bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            // Regular columns
            <div className="h-4 bg-gray-700 rounded w-24 animate-pulse" />
          )}
        </td>
      ))}
    </tr>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-700 rounded w-20 mb-2 animate-pulse" />
                <div className="h-8 bg-gray-600 rounded w-16 animate-pulse" />
              </div>
              <div className="w-8 h-8 bg-gray-700 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function OptimizedTableSkeleton({
  title = "Dados",
  rows = 10,
  columns = 5,
  showActions = true,
  showStats = true
}: OptimizedTableSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      {showStats && <StatsSkeleton />}

      {/* Search and actions skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <div className="h-10 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="flex space-x-3">
          <div className="h-10 w-24 bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-blue-600/50 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Table skeleton */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="h-6 bg-gray-700 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-600 rounded w-20 animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Header skeleton */}
              <thead className="bg-gray-700/50">
                <tr>
                  {Array.from({ length: columns }).map((_, index) => (
                    <th key={index} className="px-4 py-3 text-left">
                      <div className="h-4 bg-gray-600 rounded w-20 animate-pulse" />
                    </th>
                  ))}
                </tr>
              </thead>
              {/* Rows skeleton */}
              <tbody className="divide-y divide-gray-700">
                {Array.from({ length: rows }).map((_, index) => (
                  <SkeletonRow key={index} columns={columns} showActions={showActions} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Load more button skeleton */}
          <div className="p-4 border-t border-gray-700 text-center">
            <div className="h-10 w-32 bg-gray-700 rounded mx-auto animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function TableLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 rounded-xl shadow-sm border border-gray-700">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm text-gray-400">Carregando mais dados...</span>
      </div>
    </div>
  )
}