import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Loader2,
  RefreshCw,
  Bot,
  AlertTriangle,
  Filter,
  LayoutGrid,
  List,
  Radio,
} from 'lucide-react'
import AgentCard from './AgentCard'
import AgentDetail from './AgentDetail'
import AgentLauncher from './AgentLauncher'
import type { AgentSession, SpawnResult } from '../lib/agents'
import { listAllSessions } from '../lib/agents'

type ViewMode = 'grid' | 'list'
type FilterMode = 'all' | 'active' | 'agents' | 'completed'

export default function Agents() {
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const data = await listAllSessions(3)
      setSessions(data)
      setError(null)
      setLastRefresh(Date.now())

      // Update selected if viewing one
      if (selectedSession) {
        const updated = data.find((a) => a.key === selectedSession.key)
        if (updated) setSelectedSession(updated)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedSession])

  // Initial load + auto-refresh
  useEffect(() => {
    fetchSessions()
    if (!autoRefresh) return
    const interval = setInterval(() => fetchSessions(true), 5000)
    return () => clearInterval(interval)
  }, [fetchSessions, autoRefresh])

  const handleLaunched = useCallback(async (result: SpawnResult) => {
    const data = await listAllSessions(3)
    setSessions(data)
    const newSession = data.find((a) => a.key === result.childSessionKey)
    if (newSession) setSelectedSession(newSession)
  }, [])

  // Filtered sessions
  const filtered = useMemo(() => {
    switch (filter) {
      case 'active':
        return sessions.filter((s) => s.status === 'running' || s.status === 'idle' || s.status === 'waiting')
      case 'agents':
        return sessions.filter((s) => s.key.includes('subagent') || s.kind === 'subagent')
      case 'completed':
        return sessions.filter((s) => s.status === 'completed' || s.status === 'sleeping')
      default:
        return sessions
    }
  }, [sessions, filter])

  // Counts
  const counts = useMemo(() => {
    const active = sessions.filter((s) => s.status === 'running' || s.status === 'idle').length
    const agents = sessions.filter((s) => s.key.includes('subagent') || s.kind === 'subagent').length
    const sleeping = sessions.filter((s) => s.status === 'sleeping' || s.status === 'waiting').length
    return { total: sessions.length, active, agents, sleeping }
  }, [sessions])

  // Detail view
  if (selectedSession) {
    return (
      <AnimatePresence mode="wait">
        <AgentDetail
          key={selectedSession.key}
          agent={selectedSession}
          onBack={() => setSelectedSession(null)}
          onRefresh={() => fetchSessions(true)}
        />
      </AnimatePresence>
    )
  }

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
            <h1 className="text-3xl font-bold">Agents & Sessions</h1>
            <Zap className="w-6 h-6 text-[#8b5cf6]" />
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                autoRefresh
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-[#16161e] border-[#27272a] text-[#71717a]'
              }`}
              title={autoRefresh ? 'Auto-refresh ON (5s)' : 'Auto-refresh OFF'}
            >
              <Radio className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
              Live
            </button>
            {/* Refresh button */}
            <button
              onClick={() => fetchSessions()}
              disabled={refreshing}
              className="p-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#8b5cf6]/30 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </motion.div>
        <p className="text-[#71717a]">Spawn sub-agents and monitor all sessions in real-time.</p>
      </div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        {[
          { label: 'Total', value: counts.total, color: 'text-[#e4e4e7]' },
          { label: 'Active', value: counts.active, color: 'text-green-400' },
          { label: 'Sub-agents', value: counts.agents, color: 'text-[#8b5cf6]' },
          { label: 'Sleeping', value: counts.sleeping, color: 'text-amber-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg bg-[#12121a] border border-[#27272a] px-4 py-3 text-center"
          >
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-[#52525b] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#52525b]" />
          {(['all', 'active', 'agents', 'completed'] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#8b5cf6]'
                  : 'bg-[#16161e] border border-[#27272a] text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'text-[#8b5cf6] bg-[#8b5cf6]/10' : 'text-[#52525b] hover:text-[#a1a1aa]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'text-[#8b5cf6] bg-[#8b5cf6]/10' : 'text-[#52525b] hover:text-[#a1a1aa]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-amber-400 mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Launcher */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <AgentLauncher onLaunched={handleLaunched} />
      </motion.section>

      {/* Loading */}
      {loading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-[#52525b]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6] mb-3" />
          <p className="text-sm">Loading sessions...</p>
        </div>
      )}

      {/* Sessions Grid/List */}
      {filtered.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-2">
              Sessions ({filtered.length})
            </h2>
            <span className="text-[10px] text-[#52525b]">
              Updated {new Date(lastRefresh).toLocaleTimeString()}
            </span>
          </div>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
              : 'flex flex-col gap-2'
          }>
            <AnimatePresence mode="popLayout">
              {filtered.map((session, i) => (
                <AgentCard
                  key={session.key}
                  agent={session}
                  index={i}
                  compact={viewMode === 'list'}
                  onClick={() => setSelectedSession(session)}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.section>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-48 text-[#52525b]"
        >
          <Bot className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">
            {filter !== 'all'
              ? `No ${filter} sessions found. Try a different filter.`
              : 'No sessions yet. Launch an agent above!'}
          </p>
        </motion.div>
      )}
    </div>
  )
}
