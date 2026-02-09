import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

let toastCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({
    title,
    description,
    variant = 'default',
    duration = 4000,
    ...props
  }: Omit<Toast, 'id'>) => {
    const id = (++toastCounter).toString()
    const newToast: Toast = {
      id,
      title,
      description,
      variant,
      duration,
      ...props,
    }

    setToasts((prevToasts) => [...prevToasts, newToast])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
      }, duration)
    }

    return {
      id,
      dismiss: () => {
        setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
      },
      update: (props: Partial<Toast>) => {
        setToasts((prevToasts) =>
          prevToasts.map((toast) =>
            toast.id === id ? { ...toast, ...props } : toast
          )
        )
      },
    }
  }, [])

  return {
    toast,
    toasts,
    dismiss: (toastId: string) => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== toastId))
    },
  }
}