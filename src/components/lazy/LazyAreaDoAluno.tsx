'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Loading skeleton
const AreaDoAlunoSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="h-10 bg-white/20 rounded animate-pulse mb-4" />
        <div className="h-6 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="space-y-8">
        <div className="h-96 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-64 bg-white/10 rounded-xl animate-pulse" />
      </div>
    </div>
  </div>
)

// Lazy load área do aluno
const AreaDoAlunoComponent = dynamic(
  () => import('@/app/area-do-aluno/page'),
  {
    loading: () => <AreaDoAlunoSkeleton />,
    ssr: false // Client-side only para chat IA
  }
)

export default function LazyAreaDoAluno() {
  return (
    <Suspense fallback={<AreaDoAlunoSkeleton />}>
      <AreaDoAlunoComponent />
    </Suspense>
  )
}