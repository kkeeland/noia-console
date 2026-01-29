import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, RefreshCw, X, PanelLeftClose, MessageSquare } from 'lucide-react'
import { formatSessionName, getChannelEmoji, formatRelativeTime } from '../lib/api'
import type { Session } from '../types/clawdbot'

interface SessionListProps {
  sessions: Session[]
  selectedKey: string | null
  loading: boolean
  onSelect: (session: Session) => void
  onRefresh: () => void
  onCollapse?: () => void
}

// Group sessions by time period
function groupByTime(sessions: Session[]): { label: string; sessions: Session[] }[] {
  const now = Date.now()
  const groups: { label: string; sessions: Session[] }[] = [
    { label: 'Today', sessions: [] },
    { label: 'Yesterday', sessions: [] },
    { label: 'This Week', sessions: [] },
    { label: 'Older', sessions: [] },
  ]

  const DAY = 86400000
  const todayStart = new Date().setHours(0, 0, 0, 0)

  for (const s of sessions) {
    const t = s.updatedAt || 0
    if (t >= todayStart) {
      groups[0].sessions.push(s)
    } else if (t >= todayStart - DAY) {
      groups[1].sessions.push(s)
    } else if (now - t < 7 * DAY) {
      groups[2].sessions.push(s)
    } else {
      groups[3].sessions.push(s)
    }
  }

  return groups.filter(g => g.sessions.length > 0)
}

export default function SessionList({ sessions, selectedKey, loading, onSelect, onRefresh, onCollapse }: SessionListProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions
    const q = search.toLowerCase()
    return sessions.filter(s => {
      const name = formatSessionName(s).toLowerCase()
      const channel = s.channel?.toLowerCase() || ''
      const key = s.key.toLowerCase()
      return name.includes(q) || channel.includes(q) || key.includes(q)
    })
  }, [sessions, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  }, [filtered])

  const grouped = useMemo(() => groupByTime(sorted), [sorted])

  return (
    <div className="h-full flex flex-col bg-[#111118]">
      {/* Header */}
      <div className="p-3 border-b border-[#1e1e2e] flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <MessageSquare className="w-4 h-4 text-[#8b5cf6]" />
          <h2 className="font-semibold text-[#e4e4e7] text-sm">Sessions</h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-colors disabled:opacity-50"
          title="Refresh sessions"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] text-sm text-[#e4e4e7] placeholder:text-[#3f3f46] outline-none focus:border-[#8b5cf6]/40 transition-colors"
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#71717a] hover:text-[#e4e4e7]"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-[#1e1e2e] scrollbar-track-transparent">
        {loading && sessions.length === 0 ? (
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-[#71717a] text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading sessions...</span>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-4 text-center text-[#52525b] text-sm">
            {search ? (
              <div>
                <p>No sessions match</p>
                <p className="text-xs mt-1 text-[#3f3f46]">Try a different search term</p>
              </div>
            ) : (
              'No sessions found'
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((group) => (
              <div key={group.label}>
                {/* Time group label */}
                <div className="px-2 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#3f3f46]">
                    {group.label}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.sessions.map((session) => {
                    const isActive = session.key === selectedKey
                    const channelEmoji = getChannelEmoji(session.channel)
                    const name = formatSessionName(session)

                    return (
                      <motion.button
                        key={session.key}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => onSelect(session)}
                        className={`w-full p-2.5 rounded-xl text-left transition-all duration-150 ${
                          isActive
                            ? 'bg-[#8b5cf6]/12 border border-[#8b5cf6]/25 shadow-sm shadow-[#8b5cf6]/5'
                            : 'hover:bg-[#1a1a24] border border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Channel emoji */}
                          <span className="text-base flex-shrink-0 mt-0.5">{channelEmoji}</span>

                          <div className="flex-1 min-w-0">
                            {/* Session name */}
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm truncate ${
                                isActive ? 'text-[#e4e4e7]' : 'text-[#a1a1aa]'
                              }`}>
                                {name}
                              </span>
                            </div>

                            {/* Channel + time row */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-[#52525b] capitalize">{session.channel}</span>
                              {session.updatedAt && (
                                <>
                                  <span className="text-[#3f3f46]">·</span>
                                  <span className="text-[11px] text-[#3f3f46]">
                                    {formatRelativeTime(session.updatedAt)}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Model badge */}
                            {session.model && (
                              <div className="mt-1">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono text-[#52525b] bg-[#0a0a0f] border border-[#1e1e2e]">
                                  {session.model.split('/').pop()?.slice(0, 16)}
                                </span>
                                {session.totalTokens ? (
                                  <span className="ml-1.5 text-[9px] text-[#3f3f46] tabular-nums">
                                    {session.totalTokens >= 1000
                                      ? `${(session.totalTokens / 1000).toFixed(1)}k`
                                      : session.totalTokens
                                    } tok
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-[#1e1e2e]">
        <div className="text-[10px] text-[#3f3f46] text-center tabular-nums">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          {search && filtered.length !== sessions.length && ` · ${filtered.length} shown`}
        </div>
      </div>
    </div>
  )
}
