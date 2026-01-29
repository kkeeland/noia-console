// Channels — Unified inbox showing messages from all channels
// (WhatsApp, iMessage, Telegram) via native CLI data + gateway sessions
//
// Uses wacli/imsg CLIs for native message access and contacts.json for
// human-readable name resolution.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, MessageSquare, RefreshCw, Loader2, Wifi, WifiOff } from 'lucide-react'
import ChannelInbox from './ChannelInbox'
import type { NativeConversation } from '../lib/native-channels'
import { fetchAllConversations } from '../lib/native-channels'

// Channel config (inline for the tab bar)
const CHANNEL_TABS = [
  { id: 'all',       label: 'All',       emoji: '📬', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)' },
  { id: 'whatsapp',  label: 'WhatsApp',  emoji: '📱', color: '#25D366', bgColor: 'rgba(37,211,102,0.12)' },
  { id: 'imessage',  label: 'iMessage',  emoji: '💬', color: '#34AADC', bgColor: 'rgba(52,170,220,0.12)' },
  { id: 'telegram',  label: 'Telegram',  emoji: '✈️', color: '#0088cc', bgColor: 'rgba(0,136,204,0.12)' },
]

export default function Channels() {
  const [activeChannel, setActiveChannel] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [conversations, setConversations] = useState<NativeConversation[]>([])
  const [contacts, setContacts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  // Load all native conversations
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const result = await fetchAllConversations()
      setConversations(result.conversations)
      setContacts(result.contacts)
      setLastRefresh(Date.now())
    } catch (err) {
      console.error('Failed to load conversations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    // Refresh every 60s
    const timer = setInterval(() => loadData(false), 60_000)
    return () => clearInterval(timer)
  }, [loadData])

  // Compute per-channel counts
  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: conversations.length }
    for (const c of conversations) {
      counts[c.channel] = (counts[c.channel] || 0) + 1
    }
    return counts
  }, [conversations])

  // Unread count for badge
  const unreadCount = useMemo(() => {
    return conversations.filter(c => c.unread).length
  }, [conversations])

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Top bar: channel tabs + search */}
      <div className="border-b border-[#1e1e2e] bg-[#0e0e16]">
        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-[#8b5cf6]" />
            <h1 className="text-lg font-semibold text-[#e4e4e7]">Channels</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] text-xs font-bold">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status dot */}
            <div className="flex items-center gap-1.5 text-[10px] text-[#52525b]">
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : error ? (
                <WifiOff className="w-3 h-3 text-red-400" />
              ) : (
                <Wifi className="w-3 h-3 text-green-400" />
              )}
              {lastRefresh > 0 && !loading && (
                <span>{formatTimeSince(lastRefresh)}</span>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Global search */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search all channels…"
                className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-sm text-[#e4e4e7] placeholder:text-[#3f3f46] outline-none focus:border-[#8b5cf6]/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#52525b] hover:text-[#a1a1aa]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Channel tabs */}
        <div className="flex items-center gap-1 px-5 pb-2 overflow-x-auto scrollbar-hide">
          {CHANNEL_TABS.map(ch => {
            const isActive = activeChannel === ch.id
            const count = channelCounts[ch.id] || 0
            return (
              <motion.button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`
                  relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                  transition-colors whitespace-nowrap
                  ${isActive
                    ? 'text-[#e4e4e7]'
                    : 'text-[#71717a] hover:text-[#a1a1aa]'
                  }
                `}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="channelTab"
                    className="absolute inset-0 rounded-lg"
                    style={{ backgroundColor: ch.bgColor }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <span className="relative z-10 text-base">{ch.emoji}</span>
                <span className="relative z-10">{ch.label}</span>

                {/* Badge count */}
                {count > 0 && (
                  <span
                    className={`
                      relative z-10 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 text-[10px] font-bold
                      ${isActive
                        ? 'text-white'
                        : 'bg-[#1e1e2e] text-[#71717a]'
                      }
                    `}
                    style={isActive ? { backgroundColor: ch.color } : undefined}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-red-500/20 bg-red-500/5 overflow-hidden"
          >
            <div className="px-5 py-2 flex items-center gap-2 text-xs text-red-400">
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
              <button
                onClick={() => loadData()}
                className="ml-auto text-red-300 hover:text-red-200 underline"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inbox body */}
      <div className="flex-1 overflow-hidden">
        <ChannelInbox
          key={activeChannel}
          channelId={activeChannel}
          searchQuery={searchQuery}
          conversations={conversations}
          contacts={contacts}
          loading={loading}
          onRefresh={() => loadData()}
        />
      </div>
    </div>
  )
}

function formatTimeSince(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}
