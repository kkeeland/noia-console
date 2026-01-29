import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  MailOpen,
  Send,
  Loader2,
  ChevronRight,
  Bot,
  Brain,
  Clock,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Terminal,
  Filter,
} from 'lucide-react'
import type { AgentSession, AgentMessage } from '../lib/agents'
import { listAllSessions, getAgentHistory, sendToAgent, formatRuntime, formatTokens } from '../lib/agents'

type ThreadFilter = 'all' | 'unread' | 'active' | 'completed'

interface Thread {
  session: AgentSession
  messages: AgentMessage[]
  lastMessage: AgentMessage | null
  lastMessageTime: number
  unread: boolean
  preview: string
}

export default function AgentMail() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<ThreadFilter>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [readKeys, setReadKeys] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('noia-mail-read')
      return new Set(stored ? JSON.parse(stored) : [])
    } catch { return new Set() }
  })

  // Mark thread as read
  const markRead = useCallback((key: string) => {
    setReadKeys(prev => {
      const next = new Set(prev)
      next.add(key)
      localStorage.setItem('noia-mail-read', JSON.stringify([...next]))
      return next
    })
  }, [])

  // Fetch all sessions and their last messages
  const fetchThreads = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const sessions = await listAllSessions(1)
      
      // Build threads from sessions that have messages
      const threadList: Thread[] = sessions
        .filter(s => s.messages && s.messages.length > 0)
        .map(s => {
          const lastMsg = s.messages[s.messages.length - 1]
          const preview = lastMsg?.content
            ?.filter(c => c.type === 'text')
            .map(c => c.text || '')
            .join(' ')
            .slice(0, 150) || ''
          
          return {
            session: s,
            messages: s.messages,
            lastMessage: lastMsg,
            lastMessageTime: s.updatedAt || Date.now(),
            unread: !readKeys.has(s.key) && lastMsg?.role === 'assistant',
            preview,
          }
        })
        .sort((a, b) => b.lastMessageTime - a.lastMessageTime)

      setThreads(threadList)
      setLoading(false)

      // Update selected thread if open
      if (selectedThread) {
        const updated = threadList.find(t => t.session.key === selectedThread.session.key)
        if (updated) setSelectedThread(updated)
      }
    } catch (e) {
      console.error('[AgentMail] Failed to fetch:', e)
      setLoading(false)
    } finally {
      setRefreshing(false)
    }
  }, [readKeys, selectedThread])

  useEffect(() => {
    fetchThreads()
    const interval = setInterval(() => fetchThreads(true), 8000)
    return () => clearInterval(interval)
  }, [fetchThreads])

  // Open thread — fetch full history
  const openThread = useCallback(async (thread: Thread) => {
    markRead(thread.session.key)
    setSelectedThread(thread)
    
    // Fetch full history
    try {
      const msgs = await getAgentHistory(thread.session.key, 50)
      setSelectedThread(prev => prev ? { ...prev, messages: msgs } : null)
    } catch (e) {
      console.error('[AgentMail] Failed to fetch history:', e)
    }
  }, [markRead])

  // Send reply
  const handleReply = async () => {
    if (!replyInput.trim() || !selectedThread || sending) return
    const msg = replyInput.trim()
    setReplyInput('')
    setSending(true)
    try {
      await sendToAgent(selectedThread.session.key, msg)
      // Refresh thread
      const msgs = await getAgentHistory(selectedThread.session.key, 50)
      setSelectedThread(prev => prev ? { ...prev, messages: msgs } : null)
    } catch (e) {
      console.error('[AgentMail] Failed to send:', e)
    } finally {
      setSending(false)
    }
  }

  // Filtered threads
  const filtered = useMemo(() => {
    switch (filter) {
      case 'unread': return threads.filter(t => t.unread)
      case 'active': return threads.filter(t => ['running', 'idle', 'waiting'].includes(t.session.status))
      case 'completed': return threads.filter(t => ['completed', 'sleeping'].includes(t.session.status))
      default: return threads
    }
  }, [threads, filter])

  const unreadCount = threads.filter(t => t.unread).length

  // ── Thread Detail View ──
  if (selectedThread) {
    const isActive = ['running', 'idle', 'waiting'].includes(selectedThread.session.status)
    
    return (
      <div className="h-full flex flex-col">
        {/* Thread Header */}
        <div className="px-6 py-4 border-b border-[#1e1e2e] bg-[#12121a] flex items-center gap-4">
          <button
            onClick={() => setSelectedThread(null)}
            className="p-2 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {selectedThread.session.label || selectedThread.session.displayName || selectedThread.session.key.split(':').pop()}
            </h2>
            <div className="flex items-center gap-3 text-xs text-[#52525b]">
              <StatusBadge status={selectedThread.session.status} />
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRuntime(selectedThread.session.updatedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {formatTokens(selectedThread.session.totalTokens || 0)} tokens
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {selectedThread.messages.map((msg, i) => (
            <MailMessage key={i} message={msg} />
          ))}
        </div>

        {/* Reply */}
        {isActive && (
          <div className="px-6 py-4 border-t border-[#1e1e2e] bg-[#12121a]">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={replyInput}
                onChange={e => setReplyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                placeholder="Reply to agent..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
              />
              <button
                onClick={handleReply}
                disabled={!replyInput.trim() || sending}
                className="p-2.5 rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] disabled:opacity-30 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {!isActive && (
          <div className="px-6 py-3 border-t border-[#1e1e2e] text-center text-xs text-[#52525b] bg-[#12121a]">
            Session {selectedThread.session.status} — {selectedThread.messages.length} messages
          </div>
        )}
      </div>
    )
  }

  // ── Inbox View ──
  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-2"
        >
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Agent Mail</h1>
            <Mail className="w-6 h-6 text-[#8b5cf6]" />
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#8b5cf6] text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={() => fetchThreads()}
            disabled={refreshing}
            className="p-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#8b5cf6]/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </motion.div>
        <p className="text-[#71717a]">Updates and messages from your agents, threaded by session.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-[#52525b]" />
        {(['all', 'unread', 'active', 'completed'] as ThreadFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f
                ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#8b5cf6]'
                : 'bg-[#16161e] border border-[#27272a] text-[#71717a] hover:text-[#a1a1aa]'
            }`}
          >
            {f === 'unread' && unreadCount > 0 ? `Unread (${unreadCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center h-48 text-[#52525b]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6] mb-3" />
          <p className="text-sm">Loading agent mail...</p>
        </div>
      )}

      {/* Thread List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((thread, i) => (
              <motion.button
                key={thread.session.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => openThread(thread)}
                className={`w-full text-left px-4 py-3.5 rounded-lg border transition-all hover:border-[#8b5cf6]/30 hover:bg-[#16161e]/80 ${
                  thread.unread
                    ? 'bg-[#8b5cf6]/5 border-[#8b5cf6]/20'
                    : 'bg-[#12121a] border-[#1e1e2e]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${
                    thread.unread ? 'bg-[#8b5cf6]/20' : 'bg-[#1e1e2e]'
                  }`}>
                    {thread.unread
                      ? <Mail className="w-4 h-4 text-[#8b5cf6]" />
                      : <MailOpen className="w-4 h-4 text-[#52525b]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium truncate ${
                        thread.unread ? 'text-[#e4e4e7]' : 'text-[#a1a1aa]'
                      }`}>
                        {thread.session.label || thread.session.displayName || thread.session.key.split(':').pop()}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <StatusBadge status={thread.session.status} />
                        <span className="text-[10px] text-[#52525b]">
                          {formatRuntime(thread.lastMessageTime)}
                        </span>
                      </div>
                    </div>
                    <p className={`text-xs truncate ${
                      thread.unread ? 'text-[#a1a1aa]' : 'text-[#52525b]'
                    }`}>
                      {thread.preview || 'No messages'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#3f3f46]">
                      <span>{thread.session.model?.replace('anthropic/', '') || 'unknown'}</span>
                      <span>•</span>
                      <span>{formatTokens(thread.session.totalTokens || 0)} tokens</span>
                      <span>•</span>
                      <span>{thread.session.messageCount || thread.messages.length} msgs</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#27272a] flex-shrink-0 mt-1" />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-[#52525b]">
          <Bot className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">
            {filter !== 'all' ? 'No matching threads.' : 'No agent threads yet.'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    running: { color: 'text-green-400', bg: 'bg-green-400' },
    idle: { color: 'text-cyan-400', bg: 'bg-cyan-400' },
    completed: { color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]' },
    failed: { color: 'text-red-400', bg: 'bg-red-400' },
    waiting: { color: 'text-amber-400', bg: 'bg-amber-400' },
    sleeping: { color: 'text-blue-400', bg: 'bg-blue-400' },
  }
  const c = config[status] || config.completed
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${c.bg}`} />
      <span className={`text-[10px] font-medium ${c.color}`}>{status}</span>
    </div>
  )
}

function MailMessage({ message }: { message: AgentMessage }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  
  const textContent = message.content
    .filter(c => c.type === 'text')
    .map(c => c.text || '')
    .join('\n')
  
  const toolCalls = message.content.filter(c => c.type === 'toolCall')
  const hasThinking = message.content.some(c => c.type === 'thinking')

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/10">
          <p className="text-[10px] text-amber-400/50">{textContent.slice(0, 100)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
        isUser ? 'bg-[#8b5cf6]/20' : 'bg-[#1e1e2e]'
      }`}>
        {isUser ? <Send className="w-3.5 h-3.5 text-[#8b5cf6]" /> : <Brain className="w-3.5 h-3.5 text-[#8b5cf6]" />}
      </div>
      <div className={`flex-1 max-w-[85%] space-y-2 ${isUser ? 'items-end' : ''}`}>
        {textContent && (
          <div className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-[#8b5cf6]/10 border border-[#8b5cf6]/20'
              : 'bg-[#12121a] border border-[#27272a]'
          }`}>
            <p className="text-sm text-[#e4e4e7] whitespace-pre-wrap leading-relaxed">{textContent}</p>
          </div>
        )}
        {toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {toolCalls.map((tc, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/15 text-[10px] text-blue-400 font-mono">
                <Terminal className="w-2.5 h-2.5" />
                {tc.name}
              </span>
            ))}
          </div>
        )}
        {hasThinking && !textContent && toolCalls.length === 0 && (
          <span className="text-[10px] text-purple-400/40 italic">thinking...</span>
        )}
      </div>
    </div>
  )
}
