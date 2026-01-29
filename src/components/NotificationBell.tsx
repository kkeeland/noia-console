/**
 * Notification Bell — bell icon with unread badge + dropdown panel
 * Designed for the top bar or sidebar header area
 */

import { useState, useRef, useEffect, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  BellRing,
  X,
  Check,
  CheckCheck,
  Trash2,
  Zap,
  MessageSquare,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import {
  notifications,
  type Notification,
  type NotificationType,
} from '../lib/notification-store'
import { toast } from '../lib/notifications'
import { getGateway } from '../lib/gateway-ws'

// ─── Type config ─────────────────────────────────────────

const typeConfig: Record<NotificationType, { icon: typeof Zap; color: string; label: string }> = {
  'agent-complete': { icon: Zap, color: 'text-purple-400', label: 'Agent' },
  'message-received': { icon: MessageSquare, color: 'text-blue-400', label: 'Message' },
  'calendar-upcoming': { icon: Calendar, color: 'text-amber-400', label: 'Calendar' },
  'system': { icon: AlertCircle, color: 'text-[#71717a]', label: 'System' },
}

// ─── Time formatting ─────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

// ─── Notification Item ───────────────────────────────────

function NotificationItem({
  notif,
  onMarkRead,
  onRemove,
}: {
  notif: Notification
  onMarkRead: (id: string) => void
  onRemove: (id: string) => void
}) {
  const config = typeConfig[notif.type]
  const Icon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      className={`
        flex items-start gap-3 p-3 rounded-lg transition-colors group
        ${notif.read ? 'opacity-60' : 'bg-[#1e1e2e]/50'}
        hover:bg-[#1e1e2e]
      `}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${notif.read ? 'text-[#a1a1aa]' : 'text-[#e4e4e7] font-medium'}`}>
            {notif.title}
          </p>
          {!notif.read && (
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6] shrink-0 mt-1.5" />
          )}
        </div>
        {notif.body && (
          <p className="text-xs text-[#71717a] mt-0.5 line-clamp-2">{notif.body}</p>
        )}
        <p className="text-[10px] text-[#52525b] mt-1">{timeAgo(notif.timestamp)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!notif.read && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id) }}
            className="p-1 rounded hover:bg-[#0a0a0f] transition-colors"
            title="Mark read"
          >
            <Check className="w-3.5 h-3.5 text-[#71717a]" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(notif.id) }}
          className="p-1 rounded hover:bg-[#0a0a0f] transition-colors"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5 text-[#71717a]" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main Bell Component ─────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Subscribe to notification store
  const allNotifs = useSyncExternalStore(
    notifications.subscribe,
    notifications.getAll,
    notifications.getAll,
  )
  const unreadCount = useSyncExternalStore(
    notifications.subscribe,
    notifications.getUnreadCount,
    notifications.getUnreadCount,
  )

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      window.addEventListener('keydown', handleKey)
      return () => window.removeEventListener('keydown', handleKey)
    }
  }, [open])

  // Listen for gateway events and create notifications + fire toasts
  useEffect(() => {
    const gw = getGateway()

    const handleEvent = (payload: unknown) => {
      const ev = payload as { event?: string; data?: Record<string, unknown> }
      if (!ev?.event) return

      if (ev.event === 'session.completed' || ev.event === 'agent.complete') {
        const name = (ev.data?.displayName as string) || (ev.data?.sessionKey as string) || 'Agent'
        const n = notifications.add({
          type: 'agent-complete',
          title: `${name} completed`,
          body: (ev.data?.summary as string) || undefined,
        })
        toast.success(n.title)
      }

      if (ev.event === 'chat.message') {
        const role = ev.data?.role as string
        if (role === 'user') {
          const session = (ev.data?.sessionKey as string) || 'Unknown'
          notifications.add({
            type: 'message-received',
            title: `New message in ${session}`,
          })
          // Don't toast every message — too noisy
        }
      }
    }

    gw.on('*', handleEvent)
    return () => gw.off('*', handleEvent)
  }, [])

  const BellIcon = unreadCount > 0 ? BellRing : Bell

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon className={`w-5 h-5 ${unreadCount > 0 ? 'text-[#e4e4e7]' : 'text-[#71717a]'}`} />
        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#8b5cf6] flex items-center justify-center px-1"
            >
              <span className="text-[10px] font-bold text-white leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] rounded-xl bg-[#12121a] border border-[#1e1e2e] shadow-2xl shadow-black/40 z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => notifications.markAllRead()}
                    className="text-xs text-[#8b5cf6] hover:text-[#a78bfa] transition-colors flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-[#1e1e2e] transition-colors"
                >
                  <X className="w-4 h-4 text-[#71717a]" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {allNotifs.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-8 h-8 text-[#3f3f46] mx-auto mb-2" />
                  <p className="text-sm text-[#52525b]">No notifications yet</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {allNotifs.slice(0, 30).map((n) => (
                    <NotificationItem
                      key={n.id}
                      notif={n}
                      onMarkRead={notifications.markRead}
                      onRemove={notifications.remove}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {allNotifs.length > 0 && (
              <div className="border-t border-[#1e1e2e] px-4 py-2">
                <button
                  onClick={() => { notifications.clear(); setOpen(false) }}
                  className="text-xs text-[#52525b] hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
