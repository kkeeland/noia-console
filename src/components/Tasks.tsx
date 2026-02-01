import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ChevronDown,
  LayoutGrid,
  AlertCircle,
} from 'lucide-react'
import BoardCard from './BoardCard'
import BoardDetail from './BoardDetail'
import type { BoardTask, BoardColumn, Priority } from '../lib/board-data'
import {
  MOCK_TASKS,
  COLUMNS,
  EXPERTS,
  BUSINESSES,
} from '../lib/board-data'

export default function Tasks() {
  const [tasks, setTasks] = useState<BoardTask[]>(MOCK_TASKS)
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null)
  const [search, setSearch] = useState('')
  const [filterExpert, setFilterExpert] = useState<string | null>(null)
  const [filterBusiness, setFilterBusiness] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<Set<Priority>>(new Set())
  const [showExpertDropdown, setShowExpertDropdown] = useState(false)
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false)

  // Filtered tasks
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase()
        if (!t.title.toLowerCase().includes(q) && !t.expert.name.toLowerCase().includes(q) && !t.business.toLowerCase().includes(q)) {
          return false
        }
      }
      if (filterExpert && t.expert.id !== filterExpert) return false
      if (filterBusiness && t.business !== filterBusiness) return false
      if (filterPriority.size > 0 && !filterPriority.has(t.priority)) return false
      return true
    })
  }, [tasks, search, filterExpert, filterBusiness, filterPriority])

  // Group by column
  const columns = useMemo(() => {
    const grouped: Record<BoardColumn, BoardTask[]> = {
      'queued': [],
      'working': [],
      'needs-you': [],
      'done': [],
    }
    filtered.forEach((t) => grouped[t.column].push(t))
    // Sort by priority within each column
    for (const col of Object.values(grouped)) {
      col.sort((a, b) => a.priority - b.priority)
    }
    return grouped
  }, [filtered])

  const needsYouCount = columns['needs-you'].length

  const togglePriority = (p: Priority) => {
    setFilterPriority((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  const handleApprove = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, column: 'done' as BoardColumn, enteredColumnAt: new Date() } : t)
    )
    setSelectedTask(null)
  }, [])

  const handleReject = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, column: 'queued' as BoardColumn, enteredColumnAt: new Date() } : t)
    )
    setSelectedTask(null)
  }, [])

  const hasFilters = !!filterExpert || !!filterBusiness || filterPriority.size > 0 || !!search

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 pt-6 pb-4 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <LayoutGrid className="w-6 h-6 text-violet-500" />
          <h1 className="text-2xl font-bold text-slate-100">The Board</h1>
          {needsYouCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold"
            >
              <AlertCircle className="w-3 h-3" />
              {needsYouCount} need{needsYouCount !== 1 ? '' : 's'} attention
            </motion.span>
          )}
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-3 flex-wrap"
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search tasks, experts, businesses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          {/* Expert filter */}
          <div className="relative">
            <button
              onClick={() => { setShowExpertDropdown(!showExpertDropdown); setShowBusinessDropdown(false) }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                filterExpert
                  ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filterExpert ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: EXPERTS.find((e) => e.id === filterExpert)?.color }}
                  >
                    {EXPERTS.find((e) => e.id === filterExpert)?.initial}
                  </div>
                  {EXPERTS.find((e) => e.id === filterExpert)?.name}
                </div>
              ) : 'Expert'}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showExpertDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-1 left-0 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-40 py-1 max-h-72 overflow-y-auto"
              >
                <button
                  onClick={() => { setFilterExpert(null); setShowExpertDropdown(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors"
                >
                  All Experts
                </button>
                {EXPERTS.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { setFilterExpert(e.id); setShowExpertDropdown(false) }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-slate-700/50 transition-colors ${
                      filterExpert === e.id ? 'text-violet-400' : 'text-slate-300'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: e.color }}
                    >
                      {e.initial}
                    </div>
                    <span>{e.name}</span>
                    <span className="text-[10px] text-slate-500 ml-auto">{e.business}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Business filter */}
          <div className="relative">
            <button
              onClick={() => { setShowBusinessDropdown(!showBusinessDropdown); setShowExpertDropdown(false) }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                filterBusiness
                  ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filterBusiness || 'Business'}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showBusinessDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-1 left-0 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-40 py-1"
              >
                <button
                  onClick={() => { setFilterBusiness(null); setShowBusinessDropdown(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors"
                >
                  All Businesses
                </button>
                {BUSINESSES.map((b) => (
                  <button
                    key={b}
                    onClick={() => { setFilterBusiness(b); setShowBusinessDropdown(false) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700/50 transition-colors ${
                      filterBusiness === b ? 'text-violet-400' : 'text-slate-300'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Priority toggles */}
          <div className="flex items-center gap-1">
            {([0, 1, 2] as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  filterPriority.has(p)
                    ? p === 0
                      ? 'bg-red-500/15 border-red-500/40 text-red-400'
                      : p === 1
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-green-500/15 border-green-500/40 text-green-400'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-500 hover:text-slate-300'
                }`}
              >
                P{p}
              </button>
            ))}
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('')
                setFilterExpert(null)
                setFilterBusiness(null)
                setFilterPriority(new Set())
              }}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          )}
        </motion.div>
      </div>

      {/* Close dropdowns on outside click */}
      {(showExpertDropdown || showBusinessDropdown) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => { setShowExpertDropdown(false); setShowBusinessDropdown(false) }}
        />
      )}

      {/* Board columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-w-[900px]">
          {COLUMNS.map((col) => {
            const colTasks = columns[col.key]
            const isNeedsYou = col.urgent

            return (
              <motion.div
                key={col.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col min-h-0"
              >
                {/* Column header */}
                <div className={`flex items-center gap-2 mb-3 px-2 ${isNeedsYou ? 'py-1' : ''}`}>
                  <div
                    className="w-1.5 h-5 rounded-full"
                    style={{ backgroundColor: col.headerColor }}
                  />
                  <span className="text-sm font-bold" style={{ color: col.headerColor }}>
                    {col.label}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isNeedsYou && colTasks.length > 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Column body */}
                <div
                  className={`
                    flex-1 rounded-xl p-2.5 space-y-2.5 overflow-y-auto min-h-[140px]
                    ${isNeedsYou
                      ? 'bg-red-500/[0.03] border-2 border-red-500/20 shadow-inner shadow-red-500/5'
                      : 'bg-slate-900/50 border border-slate-800/60'
                    }
                  `}
                  style={isNeedsYou ? {
                    animation: colTasks.length > 0 ? 'needsYouPulse 3s ease-in-out infinite' : undefined,
                  } : undefined}
                >
                  <AnimatePresence mode="popLayout">
                    {colTasks.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center h-24 text-slate-600 text-xs"
                      >
                        {isNeedsYou ? '✨ All clear!' : 'No tasks'}
                      </motion.div>
                    ) : (
                      colTasks.map((task, i) => (
                        <BoardCard
                          key={task.id}
                          task={task}
                          index={i}
                          isNeedsYou={isNeedsYou}
                          onClick={setSelectedTask}
                          onApprove={handleApprove}
                          onReject={handleReject}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Task detail slide-over */}
      <AnimatePresence>
        {selectedTask && (
          <BoardDetail
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
