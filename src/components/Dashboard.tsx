import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Activity,
  MessageSquare,
  Brain,
  Users,
  Zap,
  Server,
  Clock,
  ArrowRight,
  Search,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
  CircleDot,
  ChevronRight,
} from 'lucide-react'
import { getGatewayUrl, getGatewayToken } from '../lib/config'
import { listSessions, formatRelativeTime, formatSessionName, getChannelEmoji } from '../lib/api'
import { getGateway, type ConnectionState } from '../lib/gateway-ws'
import type { Session } from '../types/clawdbot'
import DailyBriefing from './DailyBriefing'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface HealthData {
  version?: string
  uptime?: string
  model?: string
  status?: string
}

interface ActivityItem {
  id: string
  text: string
  detail?: string
  time: number
  type: 'session' | 'ws' | 'gateway'
  icon?: string
}

interface DashboardProps {
  onNavigate?: (view: string) => void
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function formatUptime(raw?: string): string {
  if (!raw) return '—'
  // If it's already human-readable, return it
  if (/\d+[dhms]/.test(raw)) return raw
  // Might be seconds
  const secs = parseInt(raw, 10)
  if (isNaN(secs)) return raw
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function wsStateColor(state: ConnectionState): string {
  switch (state) {
    case 'connected': return 'text-green-400'
    case 'connecting':
    case 'reconnecting': return 'text-amber-400'
    default: return 'text-red-400'
  }
}

function wsStateLabel(state: ConnectionState): string {
  switch (state) {
    case 'connected': return 'Connected'
    case 'connecting': return 'Connecting…'
    case 'reconnecting': return 'Reconnecting…'
    default: return 'Disconnected'
  }
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function Dashboard({ onNavigate }: DashboardProps) {
  // Live data
  const [health, setHealth] = useState<HealthData | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [wsState, setWsState] = useState<ConnectionState>('disconnected')
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())
  const feedRef = useRef<ActivityItem[]>([])

  // Push to activity feed (max 20)
  const pushActivity = useCallback((item: Omit<ActivityItem, 'id'>) => {
    const newItem = { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
    feedRef.current = [newItem, ...feedRef.current].slice(0, 20)
    setActivityFeed([...feedRef.current])
  }, [])

  // Fetch gateway status via tools/invoke (since /health returns HTML)
  const fetchHealth = useCallback(async () => {
    try {
      const url = getGatewayUrl()
      const token = getGatewayToken()
      const res = await fetch(`${url}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tool: 'session_status', args: {} }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const details = data.result?.details || {}
      const healthData: HealthData = {
        version: details.version || details.v,
        uptime: details.uptime,
        model: details.model || details.defaultModel,
        status: 'ok',
      }
      setHealth(healthData)
      setError(null)
      return healthData
    } catch {
      setError('Cannot reach gateway')
      setHealth(null)
      return null
    }
  }, [])

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const data = await listSessions(50)
      setSessions(data)
      return data
    } catch {
      setSessions([])
      return []
    }
  }, [])

  // Full refresh
  const refresh = useCallback(async () => {
    setLoading(true)
    const [healthData, sessionsData] = await Promise.all([fetchHealth(), fetchSessions()])
    setLoading(false)
    setLastRefresh(Date.now())

    // Seed activity from recent sessions
    if (sessionsData && sessionsData.length > 0) {
      const items: ActivityItem[] = sessionsData
        .filter((s: Session) => s.updatedAt)
        .sort((a: Session, b: Session) => b.updatedAt - a.updatedAt)
        .slice(0, 8)
        .map((s: Session) => ({
          id: s.key,
          text: `Session active: ${formatSessionName(s)}`,
          detail: s.channel,
          time: s.updatedAt,
          type: 'session' as const,
          icon: getChannelEmoji(s.channel),
        }))
      feedRef.current = items
      setActivityFeed(items)
    }

    if (healthData) {
      pushActivity({
        text: 'Gateway health check OK',
        detail: healthData.version ? `v${healthData.version}` : undefined,
        time: Date.now(),
        type: 'gateway',
      })
    }
  }, [fetchHealth, fetchSessions, pushActivity])

  // WebSocket events
  useEffect(() => {
    const gw = getGateway()
    setWsState(gw.getState())

    const handleState = (state: unknown) => {
      setWsState(state as ConnectionState)
      if (state === 'connected') {
        pushActivity({ text: 'WebSocket connected', time: Date.now(), type: 'ws' })
      }
    }

    const handleWildcard = (payload: unknown) => {
      const ev = payload as { event: string; data: unknown }
      if (!ev?.event) return

      // Map known events to activity
      if (ev.event === 'session.updated' || ev.event === 'session.created') {
        const d = ev.data as Record<string, unknown>
        pushActivity({
          text: ev.event === 'session.created' ? 'New session started' : 'Session updated',
          detail: (d?.displayName as string) || (d?.sessionKey as string) || undefined,
          time: Date.now(),
          type: 'session',
        })
        // Refresh sessions silently
        fetchSessions()
      } else if (ev.event === 'chat.message') {
        const d = ev.data as Record<string, unknown>
        pushActivity({
          text: `Message in ${(d?.sessionKey as string) || 'session'}`,
          detail: ((d?.role as string) || '').replace(/^./, c => c.toUpperCase()),
          time: Date.now(),
          type: 'ws',
        })
      }
    }

    gw.on('connectionState', handleState)
    gw.on('*', handleWildcard)

    return () => {
      gw.off('connectionState', handleState)
      gw.off('*', handleWildcard)
    }
  }, [pushActivity, fetchSessions])

  // Initial load + 30s poll
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  // Derived stats
  const activeSessions = sessions.filter(s => Date.now() - s.updatedAt < 3600000).length
  const totalSessions = sessions.length
  const recentAgents = sessions.filter(s => s.key?.includes('agent') && Date.now() - s.updatedAt < 86400000).length

  const stats = [
    {
      label: 'Active Sessions',
      value: activeSessions.toString(),
      sub: `${totalSessions} total`,
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500',
      action: () => onNavigate?.('chat'),
    },
    {
      label: 'Agents (24h)',
      value: recentAgents.toString(),
      sub: 'agent sessions',
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      action: () => onNavigate?.('agents'),
    },
    {
      label: 'Memory',
      value: sessions.length > 0 ? '✓' : '—',
      sub: 'gateway connected',
      icon: Brain,
      color: 'from-amber-500 to-orange-500',
      action: () => onNavigate?.('memory'),
    },
  ]

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">The Bridge</h1>
            <Sparkles className="w-6 h-6 text-[#8b5cf6]" />
          </div>
          <p className="text-[#71717a]">Live command center. Data refreshes every 30s.</p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/40 text-sm text-[#71717a] hover:text-[#e4e4e7] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </motion.button>
      </div>

      {/* Gateway Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`mb-8 p-5 rounded-2xl border ${
          error
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-gradient-to-br from-[#8b5cf6]/10 to-transparent border-[#8b5cf6]/20'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Server className="w-5 h-5 text-[#8b5cf6]" />
              <span className="font-semibold">Gateway Status</span>
              {error ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{error}</span>
              ) : health ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Online</span>
              ) : null}
            </div>

            {health && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[#71717a] text-xs mb-0.5">Version</p>
                  <p className="font-mono">{health.version || '—'}</p>
                </div>
                <div>
                  <p className="text-[#71717a] text-xs mb-0.5">Uptime</p>
                  <p className="font-mono">{formatUptime(health.uptime)}</p>
                </div>
                <div>
                  <p className="text-[#71717a] text-xs mb-0.5">Model</p>
                  <p className="font-mono text-xs">{health.model || '—'}</p>
                </div>
                <div>
                  <p className="text-[#71717a] text-xs mb-0.5">WebSocket</p>
                  <p className={`font-mono flex items-center gap-1.5 ${wsStateColor(wsState)}`}>
                    {wsState === 'connected' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                    {wsStateLabel(wsState)}
                  </p>
                </div>
              </div>
            )}

            {!health && !error && (
              <div className="flex items-center gap-2 text-[#71717a] text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Connecting to gateway…
              </div>
            )}
          </div>

          {/* Live pulse */}
          {health && !error && (
            <div className="flex items-center gap-2 text-sm text-[#8b5cf6] shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8b5cf6] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#8b5cf6]" />
              </span>
              Live
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.button
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={stat.action}
              className="p-5 rounded-xl bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/30 transition-colors text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#71717a] group-hover:text-[#8b5cf6] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-[#71717a]">{stat.label}</p>
              <p className="text-xs text-[#52525b] mt-0.5">{stat.sub}</p>
            </motion.button>
          )
        })}
      </div>

      {/* Daily Briefing */}
      <DailyBriefing />

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#8b5cf6]" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Open Chat', icon: MessageSquare, view: 'chat', accent: 'hover:border-blue-500/40 hover:bg-blue-500/5' },
            { label: 'Launch Agent', icon: Plus, view: 'agents', accent: 'hover:border-purple-500/40 hover:bg-purple-500/5' },
            { label: 'Search Memory', icon: Search, view: 'memory', accent: 'hover:border-amber-500/40 hover:bg-amber-500/5' },
            { label: 'View Rhythms', icon: Clock, view: 'rhythms', accent: 'hover:border-green-500/40 hover:bg-green-500/5' },
          ].map((action) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate?.(action.view)}
                className={`flex items-center gap-3 p-4 rounded-xl bg-[#12121a] border border-[#1e1e2e] transition-all ${action.accent}`}
              >
                <Icon className="w-5 h-5 text-[#71717a]" />
                <span className="text-sm font-medium">{action.label}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Two-column: Activity Feed + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#8b5cf6]" />
            Live Activity
            <span className="text-xs text-[#52525b] font-normal ml-auto">
              Updated {formatRelativeTime(lastRefresh)}
            </span>
          </h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {activityFeed.length === 0 && (
                <div className="text-[#52525b] text-sm p-4 text-center rounded-xl bg-[#12121a] border border-[#1e1e2e]">
                  No activity yet. Waiting for events…
                </div>
              )}
              {activityFeed.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e]"
                >
                  <CircleDot className={`w-3 h-3 shrink-0 ${
                    item.type === 'session' ? 'text-blue-400'
                      : item.type === 'ws' ? 'text-green-400'
                      : 'text-[#8b5cf6]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {item.icon && <span className="mr-1.5">{item.icon}</span>}
                      {item.text}
                    </p>
                    {item.detail && (
                      <p className="text-xs text-[#52525b] truncate">{item.detail}</p>
                    )}
                  </div>
                  <span className="text-xs text-[#52525b] shrink-0">{formatRelativeTime(item.time)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#8b5cf6]" />
            Recent Sessions
            <span className="text-xs text-[#52525b] font-normal ml-auto">{totalSessions} total</span>
          </h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {sessions.length === 0 && !loading && (
              <div className="text-[#52525b] text-sm p-4 text-center rounded-xl bg-[#12121a] border border-[#1e1e2e]">
                No sessions found
              </div>
            )}
            {sessions
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 10)
              .map((session, i) => {
                const isActive = Date.now() - session.updatedAt < 300000 // 5 min
                return (
                  <motion.button
                    key={session.key}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.05 }}
                    onClick={() => onNavigate?.('chat')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/30 transition-colors text-left group"
                  >
                    <span className="text-lg">{getChannelEmoji(session.channel)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{formatSessionName(session)}</p>
                      <p className="text-xs text-[#52525b]">
                        {session.channel} · {formatRelativeTime(session.updatedAt)}
                        {session.model && ` · ${session.model.split('/').pop()}`}
                      </p>
                    </div>
                    {isActive && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-[#52525b] group-hover:text-[#8b5cf6] transition-colors shrink-0" />
                  </motion.button>
                )
              })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
