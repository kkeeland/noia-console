// Channels — Unified inbox showing messages from all channels
// (WhatsApp, iMessage, Telegram, Discord, Signal, Webchat)
//
// ╔═══════════════════════════════════════════════════════════╗
// ║  INTEGRATION:                                             ║
// ║  1. App.tsx — Add 'channels' to the View type union and   ║
// ║     render <Channels /> for that route.                   ║
// ║  2. Sidebar.tsx — Add a nav item with id 'channels',      ║
// ║     icon: MessageSquare (from lucide-react),              ║
// ║     and a badgeKey if desired.                            ║
// ╚═══════════════════════════════════════════════════════════╝

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, X, MessageSquare } from 'lucide-react'
import { CHANNELS, channelFromSession } from '../lib/channels'
import { listSessions } from '../lib/api'
import ChannelInbox from './ChannelInbox'

export default function Channels() {
  const [activeChannel, setActiveChannel] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [channelCounts, setChannelCounts] = useState<Record<string, number>>({})

  // Compute per-channel session counts for badges
  const loadCounts = useCallback(async () => {
    try {
      const sessions = await listSessions(200)
      const counts: Record<string, number> = { all: sessions.length }
      for (const s of sessions) {
        const ch = channelFromSession(s)
        counts[ch] = (counts[ch] || 0) + 1
      }
      setChannelCounts(counts)
    } catch {
      // Silently ignore — badges just won't show
    }
  }, [])

  useEffect(() => {
    loadCounts()
    // Refresh counts every 30s
    const timer = setInterval(loadCounts, 30_000)
    return () => clearInterval(timer)
  }, [loadCounts])

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Top bar: channel tabs + search */}
      <div className="border-b border-[#1e1e2e] bg-[#0e0e16]">
        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-[#8b5cf6]" />
            <h1 className="text-lg font-semibold text-[#e4e4e7]">Channels</h1>
          </div>

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

        {/* Channel tabs */}
        <div className="flex items-center gap-1 px-5 pb-2 overflow-x-auto scrollbar-hide">
          {CHANNELS.map(ch => {
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

      {/* Inbox body */}
      <div className="flex-1 overflow-hidden">
        <ChannelInbox
          key={activeChannel}
          channelId={activeChannel}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  )
}
