import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  RefreshCw,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Zap,
  Github,
  Terminal,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import TaskCard from './TaskCard'
import TaskDetail from './TaskDetail'
import CreateTask from './CreateTask'
import type { UnifiedTask, TaskStats } from '../lib/tasks'
import { fetchAllTasks, computeStats, PRIORITY_COLORS } from '../lib/tasks'
import { listRepos, type GitHubRepo } from '../lib/github'

type ColumnKey = 'ready' | 'in-progress' | 'done'
type SourceFilter = 'all' | 'beads' | 'github'
type PriorityFilter = 'all' | 0 | 1 | 2 | 3

interface Column {
  key: ColumnKey
  label: string
  icon: typeof Zap
  color: string
}

const COLUMNS: Column[] = [
  { key: 'ready', label: 'Open', icon: Zap, color: '#8b5cf6' },
  { key: 'in-progress', label: 'In Progress', icon: Circle, color: '#f97316' },
  { key: 'done', label: 'Done', icon: CheckCircle2, color: '#22c55e' },
]

export default function TaskBoard() {
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let repoList = repos
      if (repoList.length === 0) {
        repoList = await listRepos()
        setRepos(repoList)
      }
      const topRepos = repoList.slice(0, 5).map(r => r.nameWithOwner)
      const allTasks = await fetchAllTasks(topRepos)
      setTasks(allTasks)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [repos])

  useEffect(() => {
    fetchTasks()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Stats
  const stats: TaskStats = useMemo(() => computeStats(tasks), [tasks])

  // Categorize tasks into columns
  const columns = useMemo(() => {
    let filtered = tasks

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        t => t.title.toLowerCase().includes(q) ||
             t.id.toLowerCase().includes(q) ||
             t.labels.some(l => l.toLowerCase().includes(q))
      )
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(t => t.source === sourceFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter)
    }

    const ready: UnifiedTask[] = []
    const inProgress: UnifiedTask[] = []
    const done: UnifiedTask[] = []

    for (const t of filtered) {
      if (t.status === 'closed') {
        done.push(t)
      } else if (t.status === 'in-progress') {
        inProgress.push(t)
      } else if (t.isReady || t.status === 'ready') {
        ready.push(t)
      } else {
        ready.push(t) // default open tasks go to Ready/Open
      }
    }

    const sortByPrio = (a: UnifiedTask, b: UnifiedTask) => a.priority - b.priority
    ready.sort(sortByPrio)
    inProgress.sort(sortByPrio)
    done.sort(sortByPrio)

    return { ready, 'in-progress': inProgress, done }
  }, [tasks, search, sourceFilter, priorityFilter])

  const handleMoveTask = (taskId: string, toColumn: ColumnKey) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      if (toColumn === 'done') return { ...t, status: 'closed' as const }
      if (toColumn === 'in-progress') return { ...t, status: 'in-progress' as const }
      return { ...t, status: t.isReady ? 'ready' as const : 'open' as const }
    }))
  }

  const handleTaskClosed = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'closed' as const } : t))
  }

  const handleTaskStatusChange = (id: string, status: UnifiedTask['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const handleTaskCreated = () => {
    fetchTasks()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 p-4 rounded-xl bg-[#111118] border border-[#1e1e2a]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-sm font-semibold text-[#e4e4e7]">Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" />
            <span className="text-sm font-bold text-[#22c55e]">{stats.completionPct}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-[#27272a] overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.completionPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#22c55e]"
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
            <span className="text-xs text-[#71717a]">Open</span>
            <span className="text-xs font-bold text-[#e4e4e7]">{stats.open}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f97316]" />
            <span className="text-xs text-[#71717a]">In Progress</span>
            <span className="text-xs font-bold text-[#e4e4e7]">{stats.inProgress}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span className="text-xs text-[#71717a]">Done</span>
            <span className="text-xs font-bold text-[#e4e4e7]">{stats.done}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-[#52525b]">Total:</span>
            <span className="text-xs font-bold text-[#a1a1aa]">{stats.total}</span>
          </div>

          {/* Priority breakdown */}
          <div className="flex items-center gap-2 border-l border-[#27272a] pl-4">
            {[0, 1, 2, 3].map(p => (
              stats.byPriority[p] > 0 && (
                <span
                  key={p}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${PRIORITY_COLORS[p]}15`, color: PRIORITY_COLORS[p] }}
                >
                  P{p}: {stats.byPriority[p]}
                </span>
              )
            ))}
          </div>
        </div>
      </motion.div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
            showFilters || sourceFilter !== 'all' || priorityFilter !== 'all'
              ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30 text-[#8b5cf6]'
              : 'bg-[#16161e] border-[#27272a] text-[#a1a1aa] hover:text-[#e4e4e7]'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
        </button>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="p-2 rounded-lg bg-[#16161e] border border-[#27272a] text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#8b5cf6]/30 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex items-center gap-4 p-3 rounded-lg bg-[#111118] border border-[#27272a]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#52525b] font-medium">Source:</span>
                {(['all', 'beads', 'github'] as SourceFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSourceFilter(s)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                      sourceFilter === s
                        ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]'
                        : 'text-[#71717a] hover:text-[#e4e4e7]'
                    }`}
                  >
                    {s === 'beads' && <Terminal className="w-3 h-3" />}
                    {s === 'github' && <Github className="w-3 h-3" />}
                    {s === 'all' ? 'All' : s === 'beads' ? 'Beads' : 'GitHub'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#52525b] font-medium">Priority:</span>
                <button
                  onClick={() => setPriorityFilter('all')}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    priorityFilter === 'all' ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'text-[#71717a] hover:text-[#e4e4e7]'
                  }`}
                >
                  All
                </button>
                {[0, 1, 2, 3].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p as PriorityFilter)}
                    className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                      priorityFilter === p ? '' : 'opacity-50 hover:opacity-100'
                    }`}
                    style={{ color: PRIORITY_COLORS[p] }}
                  >
                    P{p}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      {loading && tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-[#52525b]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6] mb-3" />
          <p className="text-sm">Loading tasks...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center flex-1 text-[#71717a]">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
          <p className="text-sm mb-2">{error}</p>
          <button onClick={fetchTasks} className="text-sm text-[#8b5cf6] hover:underline">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 overflow-y-auto pb-6">
          {COLUMNS.map((col) => {
            const Icon = col.icon
            const colTasks = columns[col.key]
            return (
              <div key={col.key} className="flex flex-col min-h-0">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div
                    className="w-1 h-4 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  <Icon className="w-4 h-4" style={{ color: col.color }} />
                  <span className="text-sm font-semibold text-[#e4e4e7]">{col.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#27272a] text-[#71717a]">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column body */}
                <div className="flex-1 rounded-xl bg-[#111118] border border-[#1e1e2a] p-2 space-y-2 overflow-y-auto min-h-[120px]">
                  <AnimatePresence mode="popLayout">
                    {colTasks.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center h-24 text-[#3f3f46] text-xs"
                      >
                        No tasks
                      </motion.div>
                    ) : (
                      colTasks.map((task, i) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={i}
                          column={col.key}
                          onClick={setSelectedTask}
                          onMove={handleMoveTask}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onTaskClosed={handleTaskClosed}
            onStatusChange={handleTaskStatusChange}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && (
          <CreateTask
            onClose={() => setShowCreate(false)}
            onCreated={handleTaskCreated}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
