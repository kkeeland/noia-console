/**
 * Notification Store — persistent notification state
 *
 * Separate from toasts (lib/notifications.ts). Toasts are ephemeral UI feedback.
 * Notifications are persistent items (agent-complete, messages, calendar, system).
 *
 * Usage:
 *   import { notifications } from '../lib/notification-store'
 *   notifications.add({ type: 'agent-complete', title: 'Agent done', body: 'Task finished' })
 *   const unread = notifications.getUnreadCount()
 */

export type NotificationType = 'agent-complete' | 'message-received' | 'calendar-upcoming' | 'system'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body?: string
  timestamp: number
  read: boolean
}

type Listener = () => void

let nextId = 0
let items: Notification[] = []
const listeners = new Set<Listener>()

// Persist to localStorage
const STORAGE_KEY = 'noia-notifications'

function loadFromStorage(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* ignore */ }
  return []
}

function saveToStorage() {
  try {
    // Keep only the last 100
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)))
  } catch { /* ignore */ }
}

// Initialize
items = loadFromStorage()

function emit() {
  listeners.forEach((l) => l())
}

function genId(): string {
  return `notif-${++nextId}-${Date.now()}`
}

// ─── Public API ──────────────────────────────────────────

function getAll(): Notification[] {
  return items
}

function getUnread(): Notification[] {
  return items.filter((n) => !n.read)
}

function getUnreadCount(): number {
  return items.filter((n) => !n.read).length
}

function add(opts: {
  type: NotificationType
  title: string
  body?: string
}): Notification {
  const n: Notification = {
    id: genId(),
    type: opts.type,
    title: opts.title,
    body: opts.body,
    timestamp: Date.now(),
    read: false,
  }
  items = [n, ...items].slice(0, 100)
  saveToStorage()
  emit()
  return n
}

function markRead(id: string) {
  items = items.map((n) => (n.id === id ? { ...n, read: true } : n))
  saveToStorage()
  emit()
}

function markAllRead() {
  items = items.map((n) => ({ ...n, read: true }))
  saveToStorage()
  emit()
}

function remove(id: string) {
  items = items.filter((n) => n.id !== id)
  saveToStorage()
  emit()
}

function clear() {
  items = []
  saveToStorage()
  emit()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const notifications = {
  getAll,
  getUnread,
  getUnreadCount,
  add,
  markRead,
  markAllRead,
  remove,
  clear,
  subscribe,
}
