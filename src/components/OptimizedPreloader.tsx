'use client'

import { useEffect } from 'react'

export default function OptimizedPreloader() {
  useEffect(() => {
    // Remove unused preload links after page load
    const removeUnusedPreloads = () => {
      const preloadLinks = document.querySelectorAll('link[rel="preload"]')
      preloadLinks.forEach((link) => {
        const href = (link as HTMLLinkElement).href
        // Check if CSS is actually used
        if (href.includes('.css')) {
          const cssUsed = Array.from(document.styleSheets).some((sheet) => {
            try {
              return sheet.href === href && sheet.cssRules.length > 0
            } catch {
              return false
            }
          })
          if (!cssUsed) {
            link.remove()
          }
        }
      })
    }

    // Run after page is fully loaded
    const timer = setTimeout(removeUnusedPreloads, 3000)
    return () => clearTimeout(timer)
  }, [])

  return null
}