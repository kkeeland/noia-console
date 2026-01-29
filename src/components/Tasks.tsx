import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare,
  RefreshCw,
  Filter,
  Loader2,
  AlertTriangle,
  X,
  Terminal,
  Circle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import TaskCard from './TaskCard'
import { Modal } from './ui/Modal'
import type { UnifiedTask } from '../lib/tasks'
import {
  fetchAllTasks,
  PRIORITY_COLORS,
  PRIORITY_NAMES,
  computeStats,
} from '../lib/tasks'
import { getGatewayUrl, getGatewayToken } from '../lib/config'

type ColumnKey = 'ready' | 'in-progress' | 'done'
type FilterPriority = 'all' | '0' | '1' | '2' | '3'
type FilterStatus = 'all' | 'open' | 'closed'

const COLUMNS: { key: ColumnKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'ready', label: 'Ready', icon: Circle, color: 'text-blue-400' },
  { key: 'in-progress', label: 'In Progress', icon: Clock, color: 'text-amber-400' },
  { key: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-400' },
]

function classifyTask(task: UnifiedTask): ColumnKey {
  if (task.status === 'closed') return 'done'
  if (task.status === 'in-progress') return 'in-progress'
  return 'ready'
}

export default function Tasks() {
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null)
  const [taskDetail, setTaskDetail] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterLabel, setFilterLabel] = useState<string | null>(null)

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const data = await fetchAllTasks()
      setTasks(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Get task detail via `bd show`
  const loadTaskDetail = useCallback(async (task: UnifiedTask) => {
    setSelectedTask(task)
    setDetailLoading(true)
    setTaskDetail(null)
    try {
      if (task.source === 'beads') {
        const gatewayUrl = getGatewayUrl()
        const gatewayToken = getGatewayToken()
        const res = await fetch(`${gatewayUrl}/tools/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gatewayToken}`,
          },
          body: JSON.stringify({ tool: 'exec', args: { command: `cd ~/clawd && bd show ${task.id}` } }),
        })
        const data = await res.json()
        const text = data.result?.content
          ?.filter((c: { type: string }) => c.type === 'text')
          ?.map((c: { text: string }) => c.text)
          ?.join('\n') || ''
        setTaskDetail(text.trim())
      } else {
        setTaskDetail(`GitHub Issue #${task.ghNumber}\n${task.ghUrl || ''}`)
      }
    } catch {
      setTaskDetail('Failed to load task details')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // All labels for filter dropdown
  const allLabels = useMemo(() => {
    const labels = new Set<string>()
    tasks.forEach(t => t.labels.forEach(l => labels.add(l)))
    return Array.from(labels).sort()
  }, [tasks])

  // Filtered tasks
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterPriority !== 'all' && t.priority !== parseInt(filterPriority)) return false
      if (filterStatus === 'open' && t.status === 'closed') return false
      if (filterStatus === 'closed' && t.status !== 'closed') return false
      if (filterLabel && !t.labels.includes(filterLabel)) return false
      return true
    })
  }, [tasks, filterPriority, filterStatus, filterLabel])

  // Group by column
  const columns = useMemo(() => {
    const grouped: Record<ColumnKey, UnifiedTask[]> = { ready: [], 'in-progress': [], done: [] }
    filtered.forEach(t => {
      const col = classifyTask(t)
      grouped[col].push(t)
    })
    // Sort each column by priority
    for (const col of Object.values(grouped)) {
      col.sort((a, b) => a.priority - b.priority)
    }
    return grouped
  }, [filtered])

  const stats = useMemo(() => computeStats(tasks), [tasks])
  const hasFilters = filterPriority !== 'all' || filterStatus !== 'all' || filterLabel !== null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <CheckSquare className="w-6 h-6 text-[#8b5cf6]" />
            <h1 className="text-2xl font-bold">Tasks</h1>
            {!loading && (
              <span className="text-xs text-[#52525b] bg-[#1e1e2e] px-2 py-0.5 rounded-full">
                {stats.open} open
              </span>
            )}
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fetchTasks()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/40 text-sm text-[#71717a] hover:text-[#e4e4e7] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-6 mb-4"
        >
          {[
            { label: 'Open', value: stats.open, color: 'text-blue-400' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-amber-400' },
            { label: 'Done', value: stats.done, color: 'text-green-400' },
            { label: 'Completion', value: `${stats.completionPct}%`, color: 'text-[#8b5cf6]' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
              <span className="text-xs text-[#52525b]">{s.label}</span>
            </div>
          ))}

          {/* Priority breakdown */}
          <div className="ml-auto flex items-center gap-1.5">
            {[0, 1, 2, 3].map(p => (
              <button
                key={p}
                onClick={() => setFilterPriority(filterPriority === String(p) ? 'all' : String(p) as FilterPriority)}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${
                  filterPriority === String(p) ? 'ring-1 ring-white/30' : 'opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: `${PRIORITY_COLORS[p]}20`, color: PRIORITY_COLORS[p] }}
                title={`Filter: ${PRIORITY_NAMES[p]}`}
              >
                P{p} ({stats.byPriority[p] || 0})
              </button>
            ))}
          </div>
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4 text-[#52525b]" />
          {(['all', 'open', 'closed'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === f
                  ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#8b5cf6]'
                  : 'bg-[#16161e] border border-[#27272a] text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}

          {allLabels.length > 0 && (
            <select
              value={filterLabel || ''}
              onChange={e => setFilterLabel(e.target.value || null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#16161e] border border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] transition-all appearance-none cursor-pointer"
            >
              <option value="">All labels</option>
              {allLabels.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}

          {hasFilters && (
            <button
              onClick={() => {
                setFilterPriority('all')
                setFilterStatus('all')
                setFilterLabel(null)
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[#71717a] hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </motion.div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-amber-400 mx-6 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Loading */}
      {loading && tasks.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-[#52525b]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6] mb-3" />
          <p className="text-sm">Loading tasks…</p>
        </div>
      )}

      {/* Board */}
      {!loading && (
        <div className="flex-1 overflow-x-auto md:overflow-y-hidden overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full md:min-w-[720px]">
            {COLUMNS.map(({ key, label, icon: Icon, color }) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col min-h-0"
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm font-semibold text-[#a1a1aa]">{label}</span>
                  <span className="text-xs text-[#52525b] bg-[#1e1e2e] px-1.5 py-0.5 rounded-full ml-auto">
                    {columns[key].length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  <AnimatePresence mode="popLayout">
                    {columns[key].map((task, i) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={i}
                        column={key}
                        onClick={loadTaskDetail}
                      />
                    ))}
                  </AnimatePresence>
                  {columns[key].length === 0 && (
                    <div className="text-center py-8 text-[#3f3f46] text-xs">
                      No tasks
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <Modal
        open={!!selectedTask}
        onClose={() => { setSelectedTask(null); setTaskDetail(null) }}
        title={selectedTask?.title || 'Task Details'}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-4">
            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-[#52525b] bg-[#1e1e2e] px-2 py-1 rounded">
                {selectedTask.id}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${PRIORITY_COLORS[selectedTask.priority]}20`,
                  color: PRIORITY_COLORS[selectedTask.priority],
                }}
              >
                {PRIORITY_NAMES[selectedTask.priority]}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedTask.status === 'closed'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-blue-500/10 text-blue-400'
              }`}>
                {selectedTask.status}
              </span>
            </div>

            {/* Labels */}
            {selectedTask.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedTask.labels.map(l => (
                  <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa]">
                    {l}
                  </span>
                ))}
              </div>
            )}

            {/* Terminal output */}
            <div className="rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] p-4 overflow-auto max-h-80">
              <div className="flex items-center gap-2 mb-3 text-xs text-[#52525b]">
                <Terminal className="w-3.5 h-3.5" />
                <span className="font-mono">bd show {selectedTask.id}</span>
              </div>
              {detailLoading ? (
                <div className="flex items-center gap-2 text-[#52525b] text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <pre className="text-xs text-[#a1a1aa] font-mono whitespace-pre-wrap leading-relaxed">
                  {taskDetail || 'No details available'}
                </pre>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
