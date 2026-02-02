'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Loader2, DollarSign } from 'lucide-react'

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md ${className}`} />
}

interface OptimizedLoadingCardProps {
  stage?: string
  progress?: number
}

export function OptimizedLoadingCard({ stage = 'Carregando...', progress }: OptimizedLoadingCardProps) {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 border-2 border-yellow-400 shadow-2xl">
      <CardContent className="pt-6 relative z-10">
        {/* Loading overlay */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
          <div className="text-center text-white">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <div className="text-lg font-bold mb-2">{stage}</div>
            {progress !== undefined && (
              <div className="w-48 bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Skeleton content behind overlay */}
        <div className="opacity-30">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-32 bg-white/20" />
                <Skeleton className="h-5 w-16 bg-white/20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48 bg-white/20" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full bg-white/20" />
              <div className="bg-white/20 p-3 rounded-full">
                <DollarSign className="w-8 h-8 text-gray-900" />
              </div>
            </div>
          </div>

          {/* Main value */}
          <div className="text-center mb-6 bg-black/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <Skeleton className="h-12 w-48 mx-auto mb-2 bg-white/20" />
            <Skeleton className="h-6 w-32 mx-auto mb-2 bg-white/20" />
            <Skeleton className="h-4 w-64 mx-auto bg-white/20 rounded-lg" />
          </div>

          {/* Grid metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/30">
                <div className="text-center">
                  <Skeleton className="h-8 w-16 mx-auto mb-1 bg-white/20" />
                  <Skeleton className="h-4 w-20 mx-auto mb-2 bg-white/20" />
                  <Skeleton className="h-2 w-full bg-white/20 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom section */}
          <div className="bg-black/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-48 bg-white/20" />
              <Skeleton className="h-8 w-16 bg-white/20" />
            </div>
            <Skeleton className="h-6 w-full bg-white/20 rounded-full mb-3" />
            <div className="flex justify-between">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-3 w-16 bg-white/20" />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}