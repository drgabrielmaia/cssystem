'use client'

import { useRef, useEffect, useState } from 'react'

interface UseDraggableProps {
  enabled?: boolean
  handle?: string // CSS selector for drag handle
}

export const useDraggable = ({ enabled = true, handle }: UseDraggableProps = {}) => {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0, elementX: 0, elementY: 0 })

  useEffect(() => {
    const element = elementRef.current
    if (!element || !enabled) return

    const handleMouseDown = (e: MouseEvent) => {
      // Check if we should start dragging
      const target = e.target as HTMLElement
      const handleElement = handle ? element.querySelector(handle) : element

      if (handle && handleElement && !handleElement.contains(target)) {
        return // Click was not on the drag handle
      }

      e.preventDefault()
      setIsDragging(true)

      const rect = element.getBoundingClientRect()
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        elementX: rect.left,
        elementY: rect.top
      }

      // Set initial position if not set
      setPosition(prev => ({
        x: prev.x || rect.left,
        y: prev.y || rect.top
      }))
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y

      const newX = dragStartRef.current.elementX + deltaX
      const newY = dragStartRef.current.elementY + deltaY

      // Boundary checks
      const maxX = window.innerWidth - element.offsetWidth
      const maxY = window.innerHeight - element.offsetHeight

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    // Add event listeners
    const dragHandle = handle ? element.querySelector(handle) as HTMLElement : element

    if (dragHandle) {
      dragHandle.addEventListener('mousedown', handleMouseDown)
      dragHandle.style.cursor = 'move'
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // Cleanup
    return () => {
      if (dragHandle) {
        dragHandle.removeEventListener('mousedown', handleMouseDown)
        dragHandle.style.cursor = ''
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [enabled, handle, isDragging])

  // Apply position styles
  useEffect(() => {
    const element = elementRef.current
    if (!element || !enabled) return

    element.style.position = 'fixed'
    element.style.left = `${position.x}px`
    element.style.top = `${position.y}px`
    element.style.zIndex = '9999'
    element.style.userSelect = isDragging ? 'none' : ''
  }, [position, enabled, isDragging])

  return {
    ref: elementRef,
    isDragging,
    position,
    resetPosition: () => setPosition({ x: 0, y: 0 })
  }
}