// ChannelInbox — Message inbox per channel
// Shows conversation list on the left, message thread on the right
// Supports search, send reply, and real-time message display

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search, X, ArrowLeft, Send, Loader2, RefreshCw,
} from 'lucide-react'
import { listSessions, getSessionHistory, sendToSession } from '../lib/api'
import {
  extractContactName, formatConversationTime,
  channelFromSession, getChannelConfig,
} from '../lib/channels'
import type { Session, Message } from '../types/clawdbot'
import ChannelMessage from './ChannelMessage'

interface ChannelInboxProps {
  channelId: string       // 'all' | 'whatsapp' | 'imessage' | etc
  searchQuery: string     // global search from parent
}

export default function ChannelInbox({ channelId, searchQuery }: ChannelInboxProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [localSearch, setLocalSearch] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load sessions filtered by channel
  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const all = await listSessions(200)
      setSessions(all)
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Filter sessions by channel + search
  const filteredSessions = sessions
    .filter(s => {
      if (channelId !== 'all') {
        const ch = channelFromSession(s)
        if (ch !== channelId) return false
      }
      return true
    })
    .filter(s => {
      const q = (searchQuery || localSearch).toLowerCase()
      if (!q) return true
      const name = extractContactName(s).toLowerCase()
      const ch = s.channel?.toLowerCase() || ''
      const key = s.key.toLowerCase()
      return name.includes(q) || ch.includes(q) || key.includes(q)
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  // Load message history for selected session
  useEffect(() => {
    if (!selectedSession) return
    let cancelled = false

    async function load() {
      setLoadingMessages(true)
      try {
        const msgs = await getSessionHistory(selectedSession!.key, 100, false)
        if (!cancelled) {
          setMessages(msgs.reverse())
        }
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        if (!cancelled) setLoadingMessages(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedSession])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send reply
  const handleSend = useCallback(async () => {
    if (!replyText.trim() || !selectedSession || sending) return
    const text = replyText.trim()
    setReplyText('')
    setSending(true)
    try {
      await sendToSession(selectedSession.key, text)
      // Optimistically add the message
      setMessages(prev => [...prev, {
        role: 'user',
        content: [{ type: 'text', text }],
        timestamp: Date.now(),
      }])
    } catch (err) {
      console.error('Failed to send:', err)
      setReplyText(text) // restore on failure
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [replyText, selectedSession, sending])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Channel config for selected session
  const selectedChannelConfig = selectedSession
    ? getChannelConfig(channelFromSession(selectedSession))
    : null

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className={`
        ${selectedSession ? 'hidden lg:flex' : 'flex'}
        flex-col w-full lg:w-[340px] xl:w-[380px] border-r border-[#1e1e2e] bg-[#0e0e16]
      `}>
        {/* Local search */}
        <div className="p-3 border-b border-[#1e1e2e]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" />
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-8 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-sm text-[#e4e4e7] placeholder:text-[#3f3f46] outline-none focus:border-[#8b5cf6]/50 transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#52525b] hover:text-[#a1a1aa]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation items */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#52525b]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-[#52525b] text-sm">
              {localSearch || searchQuery ? 'No conversations match' : 'No conversations yet'}
            </div>
          ) : (
            <div className="py-1">
              {filteredSessions.map(session => {
                const ch = getChannelConfig(channelFromSession(session))
                const name = extractContactName(session)
                const isActive = selectedSession?.key === session.key
                return (
                  <motion.button
                    key={session.key}
                    onClick={() => setSelectedSession(session)}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full px-3 py-3 flex items-start gap-3 text-left transition-colors
                      ${isActive
                        ? 'bg-[#8b5cf6]/10 border-l-2 border-[#8b5cf6]'
                        : 'hover:bg-[#16161e] border-l-2 border-transparent'
                      }
                    `}
                  >
                    {/* Channel emoji avatar */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: ch.bgColor }}
                    >
                      {ch.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium truncate ${isActive ? 'text-[#e4e4e7]' : 'text-[#a1a1aa]'}`}>
                          {name}
                        </span>
                        {session.updatedAt && (
                          <span className="text-[10px] text-[#52525b] flex-shrink-0">
                            {formatConversationTime(session.updatedAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {channelId === 'all' && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: ch.bgColor, color: ch.color }}
                          >
                            {ch.label}
                          </span>
                        )}
                        <span className="text-xs text-[#52525b] truncate">
                          {session.kind === 'group' ? '👥 Group' : session.key.split(':').pop()?.slice(0, 30)}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-[#1e1e2e] flex items-center justify-between">
          <span className="text-[10px] text-[#3f3f46] px-2">
            {filteredSessions.length} conversation{filteredSessions.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={loadSessions}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Message view */}
      <div className="flex-1 flex flex-col bg-[#0a0a0f]">
        {selectedSession ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e2e] bg-[#0e0e16]">
              <button
                onClick={() => setSelectedSession(null)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                style={{ backgroundColor: selectedChannelConfig?.bgColor }}
              >
                {selectedChannelConfig?.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#e4e4e7] truncate">
                  {extractContactName(selectedSession)}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-[#52525b]">
                  <span style={{ color: selectedChannelConfig?.color }}>
                    {selectedChannelConfig?.label}
                  </span>
                  <span>·</span>
                  <span className="truncate">{selectedSession.key}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-[#52525b]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-[#52525b] text-sm">
                  No messages yet
                </div>
              ) : (
                messages.map((msg, i) => (
                  <ChannelMessage key={i} message={msg} index={i} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="border-t border-[#1e1e2e] bg-[#0e0e16] p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a reply…"
                  rows={1}
                  className="flex-1 resize-none rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] px-4 py-2.5 text-sm text-[#e4e4e7] placeholder:text-[#3f3f46] outline-none focus:border-[#8b5cf6]/50 transition-colors max-h-32"
                  style={{ minHeight: '40px' }}
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!replyText.trim() || sending}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                    ${replyText.trim()
                      ? 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed]'
                      : 'bg-[#1e1e2e] text-[#52525b]'
                    }
                  `}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-[#52525b] text-sm">Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
