import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  Cpu,
  Zap,
  MessageSquare,
  Hash,
} from 'lucide-react'
import type { AgentSession } from '../lib/agents'
import {
  formatRuntime,
  formatTokens,
  formatRelativeTime,
  extractTaskPreview,
  extractLastMessage,
  getChannelIcon,
  getSessionKindLabel,
} from '../lib/agents'

interface AgentCardProps {
  agent: AgentSession
  index: number
  compact?: boolean
  onClick: () => void
}

const statusConfig = {
  running: { color: 'text-green-400', bg: 'bg-green-400', border: 'border-green-500/30', label: 'Running', glow: true },
  idle: { color: 'text-cyan-400', bg: 'bg-cyan-400', border: 'border-cyan-500/30', label: 'Idle', glow: false },
  completed: { color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]', border: 'border-[#8b5cf6]/30', label: 'Completed', glow: false },
  failed: { color: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/30', label: 'Failed', glow: false },
  waiting: { color: 'text-amber-400', bg: 'bg-amber-400', border: 'border-amber-500/30', label: 'Waiting', glow: false },
  sleeping: { color: 'text-blue-400', bg: 'bg-blue-400', border: 'border-blue-500/30', label: 'Sleeping', glow: false },
}

export default function AgentCard({ agent, index, compact, onClick }: AgentCardProps) {
  const [runtime, setRuntime] = useState(formatRuntime(agent.updatedAt))
  const status = statusConfig[agent.status] || statusConfig.completed
  const taskPreview = extractTaskPreview(agent.messages || [])
  const lastMsg = extractLastMessage(agent.messages || [])
  const isActive = agent.status === 'running' || agent.status === 'idle'
  const channelIcon = getChannelIcon(agent.channel)
  const kindLabel = getSessionKindLabel(agent)

  // Live runtime counter
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setRuntime(formatRuntime(agent.updatedAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [agent.updatedAt, isActive])

  const modelShort = agent.model
    ? agent.model.replace('anthropic/', '').replace('claude-', '').split('-').slice(0, 2).join(' ')
    : '—'

  // Compact list view
  if (compact) {
    return (
      <motion.button
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        onClick={onClick}
        className={`
          w-full text-left flex items-center gap-4 px-4 py-3 rounded-lg border transition-all duration-200
          bg-[#12121a] hover:bg-[#16161e]
          ${isActive ? 'border-[#8b5cf6]/30' : 'border-[#1e1e2e] hover:border-[#3f3f46]'}
        `}
      >
        {/* Status dot */}
        <div className="relative flex-shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ${status.bg}`} />
          {status.glow && (
            <motion.div
              className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${status.bg}`}
              animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>

        {/* Name + channel */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#e4e4e7] truncate">
              {agent.label || agent.displayName || agent.key.split(':').pop()}
            </span>
            <span className="text-[10px] text-[#52525b]">{channelIcon}</span>
          </div>
          {lastMsg && (
            <p className="text-xs text-[#52525b] truncate mt-0.5">"{lastMsg}"</p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-[10px] text-[#52525b] flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color} ${status.border} border bg-opacity-10`}>
            {status.label}
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            {modelShort}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isActive ? runtime : formatRelativeTime(agent.updatedAt)}
          </span>
        </div>
      </motion.button>
    )
  }

  // Grid card view
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={onClick}
      className={`
        relative w-full text-left p-5 rounded-xl border transition-all duration-300
        bg-[#12121a] hover:bg-[#16161e]
        ${isActive
          ? 'border-[#8b5cf6]/40 shadow-[0_0_20px_rgba(139,92,246,0.1)]'
          : 'border-[#27272a] hover:border-[#3f3f46]'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${status.bg}`} />
            {status.glow && (
              <motion.div
                className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${status.bg}`}
                animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <span className="font-semibold text-sm text-[#e4e4e7] truncate max-w-[180px]">
            {agent.label || agent.displayName || agent.key.split(':').pop()}
          </span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color} bg-opacity-10 ${status.border} border`}>
          {status.label}
        </span>
      </div>

      {/* Channel + Kind badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#1e1e2e] text-[#71717a]">
          <span>{channelIcon}</span>
          {agent.channel || 'unknown'}
        </span>
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#1e1e2e] text-[#71717a]">
          <Hash className="w-2.5 h-2.5" />
          {kindLabel}
        </span>
      </div>

      {/* Task preview */}
      <p className="text-xs text-[#a1a1aa] line-clamp-2 mb-2 leading-relaxed">
        {taskPreview}
      </p>

      {/* Last message */}
      {lastMsg && (
        <div className="flex items-start gap-1.5 mb-3">
          <MessageSquare className="w-3 h-3 text-[#52525b] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#52525b] line-clamp-1 italic">
            {lastMsg}
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-[10px] text-[#52525b]">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {isActive ? runtime : formatRelativeTime(agent.updatedAt)}
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

      {/* Running glow effect */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl border border-[#8b5cf6]/20 pointer-events-none"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </motion.button>
  )
}
