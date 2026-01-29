/**
 * Toast Notification System
 *
 * INTEGRATION (App.tsx):
 *   1. Import: import { ToastContainer } from './components/Toast'
 *   2. Add <ToastContainer /> as a sibling inside your root <div>, e.g.:
 *
 *      return (
 *        <div className="flex h-screen bg-[#0a0a0f] text-[#e4e4e7]">
 *          <Sidebar ... />
 *          <main>...</main>
 *          <ToastContainer />
 *        </div>
 *      )
 *
 *   Then from anywhere:
 *     import { toast } from '../lib/notifications'
 *     toast.success('It worked!')
 */

import { useEffect, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import {
  getToasts,
  subscribe,
  dismissToast,
  type Toast as ToastData,
  type ToastType,
} from '../lib/notifications'

// ─── Colour & icon map ───────────────────────────────────

const styles: Record<ToastType, { bg: string; border: string; icon: typeof Info }> = {
  success: {
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500/40',
    icon: CheckCircle2,
  },
  error: {
    bg: 'bg-red-950/80',
    border: 'border-red-500/40',
    icon: XCircle,
  },
  info: {
    bg: 'bg-blue-950/80',
    border: 'border-blue-500/40',
    icon: Info,
  },
  warning: {
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/40',
    icon: AlertTriangle,
  },
}

const iconColor: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-amber-400',
}

// ─── Single toast ────────────────────────────────────────

function ToastItem({ toast }: { toast: ToastData }) {
  const s = styles[toast.type]
  const Icon = s.icon

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), toast.duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`
        pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3
        backdrop-blur-xl shadow-2xl min-w-[320px] max-w-[420px]
        ${s.bg} ${s.border}
      `}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor[toast.type]}`} />
      <span className="flex-1 text-sm text-[#e4e4e7] leading-snug">
        {toast.message}
      </span>
      <button
        onClick={() => dismissToast(toast.id)}
        className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
      >
        <X size={14} className="text-[#71717a]" />
      </button>
    </motion.div>
  )
}

// ─── Container (render once in App) ──────────────────────

export function ToastContainer() {
  const toasts = useSyncExternalStore(subscribe, getToasts, getToasts)

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ToastContainer
