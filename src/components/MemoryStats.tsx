import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Database, FileText, Cpu, Users, Loader2, RefreshCw, Clock,
  HardDrive, Search, History, Trash2, TrendingUp
} from 'lucide-react'
import {
  getStats, getEntities, getFacts,
  getSearchHistory, clearSearchHistory,
  type MemoryStats as Stats, type Entity, type Fact, type SearchHistoryEntry,
} from '../lib/memory'

// --- Animated stat card ---
function StatCard({ label, value, subValue, icon: Icon, color, index }: {
  label: string
  value: number | string
  subValue?: string
  icon: React.ElementType
  color: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 flex items-start gap-4 
                 hover:border-[#8b5cf6]/20 transition-all"
    >
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#e4e4e7]">{value}</p>
        <p className="text-xs text-[#71717a] mt-0.5">{label}</p>
        {subValue && (
          <p className="text-[10px] text-[#525252] mt-1">{subValue}</p>
        )}
      </div>
    </motion.div>
  )
}

// --- Entity type breakdown ---
function EntityTypeBreakdown({ entities }: { entities: Entity[] }) {
  const counts: Record<string, number> = {}
  for (const e of entities) {
    counts[e.type] = (counts[e.type] || 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const total = entities.length || 1

  const typeColors: Record<string, string> = {
    person: 'bg-blue-500',
    project: 'bg-purple-500',
    decision: 'bg-amber-500',
    preference: 'bg-rose-500',
    lesson: 'bg-emerald-500',
  }

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <h3 className="text-sm font-medium text-[#e4e4e7] mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-[#8b5cf6]" />
        Entity Breakdown
      </h3>
      <div className="flex flex-col gap-3">
        {sorted.map(([type, count]) => (
          <div key={type}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#a1a1aa] capitalize">{type}s</span>
              <span className="text-xs text-[#71717a] font-mono">{count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${typeColors[type] || 'bg-[#8b5cf6]'}`}
                initial={{ width: 0 }}
                animate={{ width: `${(count / total) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <span className="text-xs text-[#525252]">No entities indexed yet</span>
        )}
      </div>
    </div>
  )
}

// --- Fact type breakdown ---
function FactTypeBreakdown({ facts }: { facts: Fact[] }) {
  const counts: Record<string, number> = {}
  for (const f of facts) {
    counts[f.type] = (counts[f.type] || 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <h3 className="text-sm font-medium text-[#e4e4e7] mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#8b5cf6]" />
        Fact Types
      </h3>
      <div className="flex flex-wrap gap-2">
        {sorted.map(([type, count]) => (
          <div
            key={type}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e2e] border border-[#2a2a3a]"
          >
            <span className="text-xs text-[#a1a1aa]">{type}</span>
            <span className="text-xs text-[#8b5cf6] font-bold">{count}</span>
          </div>
        ))}
        {sorted.length === 0 && (
          <span className="text-xs text-[#525252]">No facts indexed yet</span>
        )}
      </div>
    </div>
  )
}

// --- Search history panel ---
function SearchHistoryPanel() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([])

  useEffect(() => {
    setHistory(getSearchHistory())
  }, [])

  const handleClear = () => {
    clearSearchHistory()
    setHistory([])
  }

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#e4e4e7] flex items-center gap-2">
          <History className="w-4 h-4 text-[#8b5cf6]" />
          Search History
        </h3>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-[10px] text-[#525252] hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-[#525252]">No searches yet</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {history.map((entry, i) => {
            const timeAgo = getTimeAgo(entry.timestamp)
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#0a0a0f] group"
              >
                <Search className="w-3 h-3 text-[#525252] shrink-0" />
                <span className="flex-1 text-xs text-[#a1a1aa] truncate">{entry.query}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-[#8b5cf6] font-mono">{entry.resultCount}</span>
                  <span className="text-[10px] text-[#525252]">{timeAgo}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// --- Main Stats Component ---
export default function MemoryStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [facts, setFacts] = useState<Fact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = () => {
    setLoading(true)
    setError(null)
    Promise.all([getStats(), getEntities(), getFacts()])
      .then(([s, e, f]) => {
        setStats(s)
        setEntities(e)
        setFacts(f)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  const lastIndexedDisplay = useMemo(() => {
    if (!stats?.lastIndexed) return null
    const d = new Date(stats.lastIndexed)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }, [stats])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-6 h-6 text-[#8b5cf6] animate-spin" />
        <p className="text-xs text-[#525252]">Loading memory stats...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-red-400">{error}</p>
        <button onClick={loadAll} className="text-xs text-[#8b5cf6] hover:underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-[#e4e4e7]">Memory System Overview</h3>
          {stats?.lastIndexed && (
            <p className="text-[10px] text-[#525252] mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last updated: {lastIndexedDisplay}
            </p>
          )}
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e2e] text-xs text-[#71717a]
                   hover:text-[#e4e4e7] hover:bg-[#2a2a3a] transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Chunks"
          value={stats?.chunks ?? 0}
          icon={Database}
          color="bg-[#8b5cf6]/10 text-[#8b5cf6]"
          index={0}
        />
        <StatCard
          label="Files"
          value={stats?.files ?? 0}
          subValue={stats?.totalSize || undefined}
          icon={FileText}
          color="bg-blue-500/10 text-blue-400"
          index={1}
        />
        <StatCard
          label="Vectors"
          value={stats?.vectors ?? 0}
          icon={Cpu}
          color="bg-emerald-500/10 text-emerald-400"
          index={2}
        />
        <StatCard
          label="Entities"
          value={entities.length}
          subValue={`${facts.length} facts`}
          icon={Users}
          color="bg-amber-500/10 text-amber-400"
          index={3}
        />
      </div>

      {/* Storage info */}
      {stats?.totalSize && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 mb-6 flex items-center gap-4"
        >
          <div className="p-2 rounded-lg bg-[#8b5cf6]/10">
            <HardDrive className="w-4 h-4 text-[#8b5cf6]" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#a1a1aa]">Total Memory Storage</p>
            <p className="text-lg font-bold text-[#e4e4e7]">{stats.totalSize}</p>
          </div>
          {stats.lastIndexed && (
            <div className="text-right">
              <p className="text-xs text-[#525252]">Last Modified</p>
              <p className="text-xs text-[#71717a] font-mono">
                {new Date(stats.lastIndexed).toLocaleDateString()}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Breakdowns + History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <EntityTypeBreakdown entities={entities} />
        <FactTypeBreakdown facts={facts} />
      </div>

      {/* Search History */}
      <SearchHistoryPanel />
    </div>
  )
}
