/**
 * Notification Store / Manager
 *
 * INTEGRATION: Import `toast` anywhere to fire notifications.
 * The <ToastContainer /> component (in Toast.tsx) subscribes to this store.
 *
 * Usage:
 *   import { toast } from '@/lib/notifications'
 *   toast.success('Agent spawned')
 *   toast.error('Connection lost')
 *   toast.info('Memory synced')
 *   toast.warning('Rate limit approaching')
 *   toast('Custom message', { type: 'info', duration: 8000 })
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
  createdAt: number
}

type Listener = () => void

let nextId = 0
let toasts: Toast[] = []
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

function genId(): string {
  return `toast-${++nextId}-${Date.now()}`
}

// ─── Public API ──────────────────────────────────────────

export function getToasts(): Toast[] {
  return toasts
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function addToast(
  message: string,
  opts: { type?: ToastType; duration?: number } = {}
): string {
  const id = genId()
  const t: Toast = {
    id,
    message,
    type: opts.type ?? 'info',
    duration: opts.duration ?? 5000,
    createdAt: Date.now(),
  }
  toasts = [...toasts, t]
  emit()
  return id
}

// ─── Convenience wrapper ─────────────────────────────────

interface ToastFn {
  (message: string, opts?: { type?: ToastType; duration?: number }): string
  success: (msg: string, duration?: number) => string
  error: (msg: string, duration?: number) => string
  info: (msg: string, duration?: number) => string
  warning: (msg: string, duration?: number) => string
}

export const toast: ToastFn = Object.assign(
  (message: string, opts?: { type?: ToastType; duration?: number }) =>
    addToast(message, opts),
  {
    success: (msg: string, duration?: number) =>
      addToast(msg, { type: 'success', duration }),
    error: (msg: string, duration?: number) =>
      addToast(msg, { type: 'error', duration }),
    info: (msg: string, duration?: number) =>
      addToast(msg, { type: 'info', duration }),
    warning: (msg: string, duration?: number) =>
      addToast(msg, { type: 'warning', duration }),
  }
)
