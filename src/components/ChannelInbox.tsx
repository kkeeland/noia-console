// ChannelInbox — Unified message inbox with native CLI data
// Shows conversation list (left) + message thread (right)
// Fetches from wacli/imsg CLIs via gateway exec + contacts.json resolution

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search, X, ArrowLeft, Send, Loader2, RefreshCw,
  Phone, Video, MoreVertical, Paperclip, Users,
} from 'lucide-react'
import type { NativeConversation, NativeMessage } from '../lib/native-channels'
import { fetchConversationMessages, sendNativeMessage } from '../lib/native-channels'
import { formatConversationTime } from '../lib/channels'

// ─── Channel visual config ────────────────────────────────────────────

const CHANNEL_STYLE: Record<string, { color: string; bgColor: string; emoji: string; label: string }> = {
  whatsapp:  { color: '#25D366', bgColor: 'rgba(37,211,102,0.12)',  emoji: '📱', label: 'WhatsApp' },
  imessage:  { color: '#34AADC', bgColor: 'rgba(52,170,220,0.12)',  emoji: '💬', label: 'iMessage' },
  telegram:  { color: '#0088cc', bgColor: 'rgba(0,136,204,0.12)',   emoji: '✈️', label: 'Telegram' },
}

function getStyle(channel: string) {
  return CHANNEL_STYLE[channel] || { color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)', emoji: '💬', label: channel }
}

// ─── Props ────────────────────────────────────────────────────────────

interface ChannelInboxProps {
  channelId: string
  searchQuery: string
  conversations: NativeConversation[]
  contacts: Record<string, string>
  loading: boolean
  onRefresh: () => void
}

export default function ChannelInbox({
  channelId, searchQuery, conversations, contacts, loading, onRefresh,
}: ChannelInboxProps) {
  const [selectedConvo, setSelectedConvo] = useState<NativeConversation | null>(null)
  const [messages, setMessages] = useState<NativeMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [localSearch, setLocalSearch] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Filter conversations by channel + search
  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => {
        if (channelId !== 'all' && c.channel !== channelId) return false
        const q = (searchQuery || localSearch).toLowerCase()
        if (!q) return true
        return (
          c.name.toLowerCase().includes(q) ||
          c.identifier.toLowerCase().includes(q)
        )
      })
  }, [conversations, channelId, searchQuery, localSearch])

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConvo) return
    let cancelled = false

    async function load() {
      setLoadingMessages(true)
      try {
        const msgs = await fetchConversationMessages(selectedConvo!, contacts, 50)
        if (!cancelled) {
          // Sort chronologically (oldest first)
          msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          setMessages(msgs)
        }
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        if (!cancelled) setLoadingMessages(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedConvo, contacts])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send reply
  const handleSend = useCallback(async () => {
    if (!replyText.trim() || !selectedConvo || sending) return
    const text = replyText.trim()
    setReplyText('')
    setSending(true)
    try {
      await sendNativeMessage(selectedConvo.channel, selectedConvo.identifier, text)
      // Optimistic add
      setMessages(prev => [...prev, {
        id: `sent:${Date.now()}`,
        channel: selectedConvo.channel,
        conversationId: selectedConvo.id,
        sender: 'You',
        senderRaw: 'me',
        text,
        timestamp: new Date().toISOString(),
        isFromMe: true,
      }])
    } catch (err) {
      console.error('Failed to send:', err)
      setReplyText(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [replyText, selectedConvo, sending])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedStyle = selectedConvo ? getStyle(selectedConvo.channel) : null

  return (
    <div className="flex h-full">
      {/* ─── Conversation list (left panel) ─── */}
      <div className={`
        ${selectedConvo ? 'hidden lg:flex' : 'flex'}
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
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#52525b]" />
              <span className="text-xs text-[#3f3f46]">Loading conversations…</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-[#52525b] text-sm">
              {localSearch || searchQuery ? 'No conversations match' : 'No conversations found'}
            </div>
          ) : (
            <div className="py-1">
              {filteredConversations.map(convo => {
                const style = getStyle(convo.channel)
                const isActive = selectedConvo?.id === convo.id
                const ts = new Date(convo.lastMessageAt).getTime()
                return (
                  <motion.button
                    key={convo.id}
                    onClick={() => setSelectedConvo(convo)}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full px-3 py-3 flex items-start gap-3 text-left transition-colors
                      ${isActive
                        ? 'bg-[#8b5cf6]/10 border-l-2 border-[#8b5cf6]'
                        : 'hover:bg-[#16161e] border-l-2 border-transparent'
                      }
                    `}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: style.bgColor }}
                      >
                        {convo.isGroup ? (
                          <Users className="w-5 h-5" style={{ color: style.color }} />
                        ) : (
                          <span className="text-base font-semibold" style={{ color: style.color }}>
                            {convo.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Unread dot */}
                      {convo.unread && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#8b5cf6] border-2 border-[#0e0e16]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium truncate ${
                          convo.unread ? 'text-[#e4e4e7]' : isActive ? 'text-[#e4e4e7]' : 'text-[#a1a1aa]'
                        }`}>
                          {convo.name}
                        </span>
                        <span className={`text-[10px] flex-shrink-0 ${
                          convo.unread ? 'text-[#8b5cf6]' : 'text-[#52525b]'
                        }`}>
                          {formatConversationTime(ts)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {channelId === 'all' && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                            style={{ backgroundColor: style.bgColor, color: style.color }}
                          >
                            {style.label}
                          </span>
                        )}
                        <span className="text-xs text-[#52525b] truncate">
                          {convo.lastMessagePreview || convo.identifier}
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
            {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Message view (right panel) ─── */}
      <div className="flex-1 flex flex-col bg-[#0a0a0f]">
        {selectedConvo ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e2e] bg-[#0e0e16]">
              <button
                onClick={() => setSelectedConvo(null)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: selectedStyle?.bgColor }}
              >
                {selectedConvo.isGroup ? (
                  <Users className="w-4 h-4" style={{ color: selectedStyle?.color }} />
                ) : (
                  <span className="text-sm font-semibold" style={{ color: selectedStyle?.color }}>
                    {selectedConvo.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#e4e4e7] truncate">
                  {selectedConvo.name}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-[#52525b]">
                  <span style={{ color: selectedStyle?.color }}>
                    {selectedStyle?.label}
                  </span>
                  <span>·</span>
                  <span className="truncate">{selectedConvo.identifier}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg hover:bg-[#1e1e2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg hover:bg-[#1e1e2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                  <Video className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg hover:bg-[#1e1e2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#52525b]" />
                  <span className="text-xs text-[#3f3f46]">Loading messages…</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#52525b]">
                  <span className="text-3xl">💬</span>
                  <span className="text-sm">No messages loaded</span>
                  <span className="text-xs text-[#3f3f46]">Messages may not be available for older conversations</span>
                </div>
              ) : (
                <>
                  {/* Date separator for the thread */}
                  <DateMessages messages={messages} />
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="border-t border-[#1e1e2e] bg-[#0e0e16] p-3">
              <div className="flex items-end gap-2">
                <button className="flex-shrink-0 p-2.5 rounded-xl hover:bg-[#1e1e2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <textarea
                  ref={inputRef}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Reply via ${selectedStyle?.label}…`}
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
                      ? 'text-white hover:opacity-90'
                      : 'bg-[#1e1e2e] text-[#52525b]'
                    }
                  `}
                  style={replyText.trim() ? { backgroundColor: selectedStyle?.color || '#8b5cf6' } : undefined}
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
              <div className="text-5xl mb-4">📬</div>
              <p className="text-[#71717a] text-sm font-medium">Select a conversation</p>
              <p className="text-[#3f3f46] text-xs mt-1">Messages from WhatsApp and iMessage in one place</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Message rendering with date separators ───────────────────────────

function DateMessages({ messages }: { messages: NativeMessage[] }) {
  // Group messages by date
  const groups: { date: string; msgs: NativeMessage[] }[] = []
  let currentDate = ''

  for (const msg of messages) {
    const date = new Date(msg.timestamp).toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    if (date !== currentDate) {
      currentDate = date
      groups.push({ date, msgs: [] })
    }
    groups[groups.length - 1].msgs.push(msg)
  }

  return (
    <>
      {groups.map(group => (
        <div key={group.date}>
          {/* Date separator */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#1e1e2e]" />
            <span className="text-[10px] text-[#52525b] font-medium">{group.date}</span>
            <div className="flex-1 h-px bg-[#1e1e2e]" />
          </div>

          {/* Messages */}
          <div className="space-y-1">
            {group.msgs.map((msg, i) => (
              <NativeMessageBubble key={msg.id} message={msg} index={i} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

// ─── Individual message bubble ────────────────────────────────────────

function NativeMessageBubble({ message, index }: { message: NativeMessage; index: number }) {
  const isMe = message.isFromMe
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Channel accent for incoming messages
  const style = getStyle(message.channel)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, delay: Math.min(index * 0.01, 0.15) }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
    >
      {/* Sender avatar for incoming */}
      {!isMe && (
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1 text-[11px] font-bold"
          style={{ backgroundColor: style.bgColor, color: style.color }}
        >
          {message.sender.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="max-w-[75%]">
        {/* Sender name for incoming (if not from me) */}
        {!isMe && (
          <div className="text-[10px] ml-1 mb-0.5" style={{ color: style.color }}>
            {message.sender}
          </div>
        )}

        <div className={`
          rounded-2xl px-3.5 py-2 text-sm leading-relaxed
          ${isMe
            ? 'bg-[#8b5cf6] text-white rounded-br-md'
            : 'bg-[#16161e] border border-[#1e1e2e] rounded-bl-md text-[#e4e4e7]'
          }
        `}>
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>

        {/* Timestamp */}
        <div className={`mt-0.5 px-1 text-[10px] ${isMe ? 'text-right text-[#52525b]' : 'text-[#3f3f46]'}`}>
          {time}
        </div>
      </div>
    </motion.div>
  )
}
