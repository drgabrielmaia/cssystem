'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Loading component
const FormBuilderSkeleton = () => (
  <div className="p-8 space-y-6">
    <div className="h-8 bg-gray-200 rounded animate-pulse" />
    <div className="h-32 bg-gray-200 rounded animate-pulse" />
    <div className="h-16 bg-gray-200 rounded animate-pulse" />
  </div>
)

// Lazy load o form builder
const FormBuilderComponent = dynamic(
  () => import('@/app/form-builder/page'),
  {
    loading: () => <FormBuilderSkeleton />,
    ssr: false // Client-side only para reduzir JS inicial
  }
)

export default function LazyFormBuilder() {
  return (
    <Suspense fallback={<FormBuilderSkeleton />}>
      <FormBuilderComponent />
    </Suspense>
  )
}