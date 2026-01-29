import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Send,
  ChevronDown,
  ChevronRight,
  Terminal,
  Brain,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Cpu,
  Square,
  Loader2,
  Hash,
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react'
import type { AgentSession, AgentMessage, AgentMessageContent } from '../lib/agents'
import {
  getAgentHistory,
  sendToAgent,
  abortAgent,
  formatRuntime,
  formatTokens,
  getChannelIcon,
  getSessionKindLabel,
} from '../lib/agents'

interface AgentDetailProps {
  agent: AgentSession
  onBack: () => void
  onRefresh?: () => void
}

const statusConfig = {
  running: { color: 'text-green-400', bg: 'bg-green-400', label: 'Running' },
  idle: { color: 'text-cyan-400', bg: 'bg-cyan-400', label: 'Idle' },
  completed: { color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]', label: 'Completed' },
  failed: { color: 'text-red-400', bg: 'bg-red-400', label: 'Failed' },
  waiting: { color: 'text-amber-400', bg: 'bg-amber-400', label: 'Waiting' },
  sleeping: { color: 'text-blue-400', bg: 'bg-blue-400', label: 'Sleeping' },
}

export default function AgentDetail({ agent, onBack, onRefresh }: AgentDetailProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [aborting, setAborting] = useState(false)
  const [runtime, setRuntime] = useState(formatRuntime(agent.updatedAt))
  const [fullscreen, setFullscreen] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [historyLimit, setHistoryLimit] = useState(100)
  const feedRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  const isActive = agent.status === 'running' || agent.status === 'idle' || agent.status === 'waiting'
  const status = statusConfig[agent.status] || statusConfig.completed

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const msgs = await getAgentHistory(agent.key, historyLimit)
      setMessages(msgs)
      setLoading(false)
    } catch (e) {
      console.error('[AgentDetail] Failed to fetch history:', e)
      setLoading(false)
    }
  }, [agent.key, historyLimit])

  // Initial load + polling
  useEffect(() => {
    fetchHistory()
    if (!isActive) return
    const interval = setInterval(fetchHistory, 3000)
    return () => clearInterval(interval)
  }, [fetchHistory, isActive])

  // Runtime counter
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setRuntime(formatRuntime(agent.updatedAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [agent.updatedAt, isActive])

  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScroll && messages.length > prevCountRef.current && feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
    }
    prevCountRef.current = messages.length
  }, [messages.length, autoScroll])

  // Detect manual scroll to pause auto-scroll
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80
    setAutoScroll(isNearBottom)
  }, [])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    try {
      await sendToAgent(agent.key, msg)
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: [{ type: 'text', text: msg }] },
      ])
      setAutoScroll(true)
    } catch (e) {
      console.error('[AgentDetail] Failed to send:', e)
    } finally {
      setSending(false)
    }
  }

  const handleAbort = async () => {
    if (aborting) return
    setAborting(true)
    try {
      await abortAgent(agent.key)
      onRefresh?.()
    } catch (e) {
      console.error('[AgentDetail] Failed to abort:', e)
    } finally {
      setAborting(false)
    }
  }

  const handleLoadMore = () => {
    setHistoryLimit((prev) => prev + 200)
  }

  const handleExport = () => {
    const text = messages.map((m) => {
      const role = m.role.toUpperCase()
      const content = m.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text || '')
        .join('\n')
      return `[${role}]\n${content}`
    }).join('\n\n---\n\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-${agent.key.split(':').pop()}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const modelShort = agent.model
    ? agent.model.replace('anthropic/', '')
    : 'unknown'

  const channelIcon = getChannelIcon(agent.channel)
  const kindLabel = getSessionKindLabel(agent)

  // Message counts
  const userMsgCount = messages.filter((m) => m.role === 'user').length
  const assistantMsgCount = messages.filter((m) => m.role === 'assistant').length
  const toolCallCount = messages.reduce(
    (acc, m) => acc + m.content.filter((c) => c.type === 'toolCall').length,
    0
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25 }}
      className={`h-full flex flex-col bg-[#0a0a0f] ${fullscreen ? 'fixed inset-0 z-50' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2e] bg-[#12121a]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {agent.label || agent.displayName || agent.key.split(':').pop()}
              </h2>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${status.bg}`} />
                <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#52525b] mt-0.5">
              <span className="flex items-center gap-1">
                {channelIcon} {agent.channel || 'unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {kindLabel}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {runtime}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {formatTokens(agent.totalTokens || 0)} tokens
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {modelShort}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Message stats */}
          <div className="flex items-center gap-3 text-[10px] text-[#52525b] mr-3">
            <span>{userMsgCount} user</span>
            <span>{assistantMsgCount} assistant</span>
            <span>{toolCallCount} tools</span>
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="p-2 rounded-lg hover:bg-[#1e1e2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
            title="Export log"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-2 rounded-lg hover:bg-[#1e1e2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Refresh history */}
          <button
            onClick={fetchHistory}
            className="p-2 rounded-lg hover:bg-[#1e1e2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
            title="Refresh history"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Abort */}
          {isActive && (
            <button
              onClick={handleAbort}
              disabled={aborting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {aborting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Abort
            </button>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-3"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-[#52525b]">
            <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6] mb-3" />
            <p className="text-sm">Loading agent history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#52525b]">
            <Brain className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No messages yet. Agent may be starting up...</p>
          </div>
        ) : (
          <>
            {/* Load more button */}
            {messages.length >= historyLimit && (
              <div className="text-center mb-4">
                <button
                  onClick={handleLoadMore}
                  className="text-xs text-[#8b5cf6] hover:text-[#a78bfa] transition-colors px-3 py-1.5 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20"
                >
                  Load older messages...
                </button>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <MessageBlock key={`${i}-${msg.role}`} message={msg} index={i} />
              ))}
            </AnimatePresence>

            {/* Auto-scroll indicator */}
            {!autoScroll && messages.length > 10 && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={() => {
                  setAutoScroll(true)
                  feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
                }}
                className="fixed bottom-24 right-8 px-3 py-2 rounded-lg bg-[#8b5cf6] text-white text-xs font-medium shadow-lg hover:bg-[#7c3aed] transition-colors flex items-center gap-1.5"
              >
                <ChevronDown className="w-3 h-3" />
                Jump to latest
              </motion.button>
            )}
          </>
        )}
      </div>

      {/* Send Input */}
      {isActive && (
        <div className="px-6 py-4 border-t border-[#1e1e2e] bg-[#12121a]">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Send a message to this agent..."
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Completed banner */}
      {!isActive && (
        <div className={`px-6 py-3 border-t border-[#1e1e2e] text-center text-xs ${
          agent.status === 'failed' ? 'text-red-400 bg-red-500/5' : 'text-[#52525b] bg-[#12121a]'
        }`}>
          Session {agent.status} • {messages.length} messages • {formatTokens(agent.totalTokens || 0)} tokens used
        </div>
      )}
    </motion.div>
  )
}

// --- Message Block Component ---

function MessageBlock({ message, index }: { message: AgentMessage; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.5) }}
    >
      {message.role === 'user' ? (
        <UserMessage content={message.content} timestamp={message.timestamp} />
      ) : message.role === 'assistant' ? (
        <AssistantMessage content={message.content} />
      ) : message.role === 'system' ? (
        <SystemMessage content={message.content} />
      ) : null}
    </motion.div>
  )
}

function UserMessage({ content, timestamp }: { content: AgentMessageContent[]; timestamp?: number }) {
  const text = content
    .filter((c) => c.type === 'text')
    .map((c) => c.text || '')
    .join('\n')

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#8b5cf6]/20 flex items-center justify-center">
        <MessageSquare className="w-3.5 h-3.5 text-[#8b5cf6]" />
      </div>
      <div className="flex-1">
        <div className="rounded-lg bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 px-4 py-3">
          <p className="text-sm text-[#e4e4e7] whitespace-pre-wrap">{text}</p>
        </div>
        {timestamp && (
          <span className="text-[10px] text-[#3f3f46] mt-1 block">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}

function SystemMessage({ content }: { content: AgentMessageContent[] }) {
  const text = content
    .filter((c) => c.type === 'text')
    .map((c) => c.text || '')
    .join('\n')

  return (
    <div className="flex justify-center">
      <div className="px-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10 max-w-[80%]">
        <p className="text-xs text-amber-400/60 text-center">{text.slice(0, 200)}</p>
      </div>
    </div>
  )
}

function AssistantMessage({ content }: { content: AgentMessageContent[] }) {
  return (
    <div className="space-y-2">
      {content.map((block, i) => {
        switch (block.type) {
          case 'thinking':
            return <ThinkingBlock key={i} text={block.thinking || ''} />
          case 'toolCall':
            return <ToolCallBlock key={i} name={block.name || ''} args={block.arguments || {}} />
          case 'toolResult':
            return <ToolResultBlock key={i} content={block.content || ''} />
          case 'text':
            return block.text ? <TextBlock key={i} text={block.text} /> : null
          default:
            return null
        }
      })}
    </div>
  )
}

function ThinkingBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="ml-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-purple-400/60 hover:text-purple-400 transition-colors"
      >
        <Brain className="w-3 h-3" />
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>Thinking...</span>
        <span className="text-[10px] text-[#3f3f46]">({text.length} chars)</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 text-xs text-purple-300/50 font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToolCallBlock({ name, args }: { name: string; args: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false)
  const argsStr = JSON.stringify(args, null, 2)
  const preview = Object.keys(args).slice(0, 3).map((k) => {
    const v = args[k]
    const vs = typeof v === 'string' ? v.slice(0, 40) : JSON.stringify(v)?.slice(0, 40)
    return `${k}: ${vs}`
  }).join(', ')

  return (
    <div className="ml-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20">
          <Terminal className="w-3 h-3 text-blue-400" />
          <span className="text-xs font-mono font-semibold text-blue-300">{name}</span>
          {expanded ? <ChevronDown className="w-3 h-3 text-blue-400" /> : <ChevronRight className="w-3 h-3 text-blue-400" />}
        </div>
        {!expanded && preview && (
          <span className="text-[10px] text-[#52525b] truncate font-mono">{preview}</span>
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <pre className="mt-2 p-3 rounded-lg bg-[#0d1117] border border-blue-500/10 text-xs text-blue-200/60 font-mono leading-relaxed max-h-64 overflow-y-auto">
              {argsStr}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToolResultBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const isError = content.toLowerCase().includes('error') || content.toLowerCase().includes('failed')
  const preview = content.slice(0, 80).replace(/\n/g, ' ')
  const hasMore = content.length > 80

  return (
    <div className="ml-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md ${
          isError ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'
        }`}>
          {isError
            ? <XCircle className="w-3 h-3 text-red-400" />
            : <CheckCircle2 className="w-3 h-3 text-green-400" />
          }
          <span className={`text-xs font-mono ${isError ? 'text-red-300' : 'text-green-300'}`}>result</span>
          {hasMore && (expanded
            ? <ChevronDown className="w-3 h-3 text-[#52525b]" />
            : <ChevronRight className="w-3 h-3 text-[#52525b]" />
          )}
        </div>
        {!expanded && (
          <span className="text-[10px] text-[#52525b] truncate font-mono">{preview}</span>
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <pre className={`mt-2 p-3 rounded-lg border text-xs font-mono leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap ${
              isError
                ? 'bg-red-500/5 border-red-500/10 text-red-200/60'
                : 'bg-green-500/5 border-green-500/10 text-green-200/60'
            }`}>
              {content}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TextBlock({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#1e1e2e] flex items-center justify-center">
        <Brain className="w-3.5 h-3.5 text-[#8b5cf6]" />
      </div>
      <div className="flex-1 rounded-lg bg-[#12121a] border border-[#27272a] px-4 py-3">
        <p className="text-sm text-[#e4e4e7] whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
