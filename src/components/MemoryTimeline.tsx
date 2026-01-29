import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, FileText, Loader2, ChevronLeft, ChevronRight,
  CalendarDays, Eye, ArrowLeft, Search, X, Hash, Sparkles,
} from 'lucide-react'
import {
  getTimeline, getRecent, getDailyFileMetas, extractHeaders, searchMemory,
  type TimelineDay, type DailyFileMeta, type SearchResult,
} from '../lib/memory'

// ─── Heatmap date generation ───────────────────────────────────────────────────

function getHeatmapDates(weekCount = 20): string[][] {
  const weeks: string[][] = []
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (weekCount * 7 - 1))
  startDate.setDate(startDate.getDate() - startDate.getDay())

  for (let w = 0; w < weekCount; w++) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + w * 7 + d)
      week.push(date.toISOString().split('T')[0])
    }
    weeks.push(week)
  }
  return weeks
}

function getMonthLabels(weeks: string[][]): Array<{ label: string; col: number }> {
  const labels: Array<{ label: string; col: number }> = []
  let lastMonth = ''
  for (let i = 0; i < weeks.length; i++) {
    const date = new Date(weeks[i][0] + 'T12:00:00')
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    if (month !== lastMonth) {
      labels.push({ label: month, col: i })
      lastMonth = month
    }
  }
  return labels
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

// ─── Heatmap Cell ──────────────────────────────────────────────────────────────

function HeatmapCell({ date, intensity, isToday, isSelected, onClick, tooltip }: {
  date: string
  intensity: number // 0-4
  isToday: boolean
  isSelected: boolean
  onClick: () => void
  tooltip: string
}) {
  const isFuture = new Date(date + 'T23:59:59') > new Date()

  const bgClass =
    isFuture ? 'bg-[#0a0a0f]' :
    intensity >= 4 ? 'bg-[#8b5cf6]' :
    intensity === 3 ? 'bg-[#8b5cf6]/70' :
    intensity === 2 ? 'bg-[#8b5cf6]/45' :
    intensity === 1 ? 'bg-[#8b5cf6]/20' :
    'bg-[#1e1e2e]/60'

  return (
    <motion.button
      whileHover={!isFuture ? { scale: 1.4, zIndex: 10 } : undefined}
      onClick={onClick}
      disabled={isFuture}
      title={tooltip}
      className={`
        w-[13px] h-[13px] rounded-[3px] transition-all
        ${isFuture ? 'cursor-default' : 'cursor-pointer'}
        ${isSelected ? 'ring-2 ring-[#c4b5fd] ring-offset-1 ring-offset-[#0a0a0f]' : ''}
        ${isToday && !isSelected ? 'ring-1 ring-[#e4e4e7]/30' : ''}
        ${bgClass}
      `}
    />
  )
}

// ─── Date Picker ───────────────────────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [year, month] = useMemo(() => {
    const d = value ? new Date(value + 'T12:00:00') : new Date()
    return [d.getFullYear(), d.getMonth()]
  }, [value])

  const [viewYear, setViewYear] = useState(year)
  const [viewMonth, setViewMonth] = useState(month)

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-[#1e1e2e] text-[#71717a]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-[#e4e4e7]">{monthName}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-[#1e1e2e] text-[#71717a]">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-[10px] text-[#525252] py-1">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === today
          const isSelected = dateStr === value
          const isFuture = new Date(dateStr + 'T23:59:59') > new Date()

          return (
            <button
              key={day}
              onClick={() => !isFuture && onChange(dateStr)}
              disabled={isFuture}
              className={`
                text-xs py-1.5 rounded-lg transition-all
                ${isFuture ? 'text-[#2a2a3a] cursor-default' : 'hover:bg-[#1e1e2e] cursor-pointer'}
                ${isSelected ? 'bg-[#8b5cf6] text-white font-bold' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-[#8b5cf6]/50 text-[#8b5cf6]' : ''}
                ${!isFuture && !isSelected && !isToday ? 'text-[#a1a1aa]' : ''}
              `}
            >
              {day}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => onChange(today)}
        className="w-full mt-3 py-1.5 rounded-lg bg-[#1e1e2e] text-xs text-[#71717a] 
                   hover:text-[#8b5cf6] hover:bg-[#8b5cf6]/10 transition-all"
      >
        Today
      </button>
    </div>
  )
}

// ─── Markdown Renderer ─────────────────────────────────────────────────────────

function renderContent(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# ')) {
      return <div key={i} className="text-base font-bold text-[#e4e4e7] mt-3 mb-1">{line.slice(2)}</div>
    }
    if (line.startsWith('## ')) {
      return <div key={i} className="text-sm font-semibold text-[#c4b5fd] mt-2 mb-1">{line.slice(3)}</div>
    }
    if (line.startsWith('### ')) {
      return <div key={i} className="text-sm font-medium text-[#a78bfa] mt-2 mb-0.5">{line.slice(4)}</div>
    }
    if (line.startsWith('- ')) {
      return <div key={i} className="pl-3 before:content-['•'] before:text-[#8b5cf6] before:mr-2">{line.slice(2)}</div>
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />
    }
    return <div key={i}>{line}</div>
  })
}

// ─── Day Detail View ───────────────────────────────────────────────────────────

function DayDetail({ date, content, onBack }: { date: string; content: TimelineDay[]; onBack: () => void }) {
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#8b5cf6] mb-3 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to timeline
      </button>

      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="w-4 h-4 text-[#8b5cf6]" />
        <h3 className="text-sm font-medium text-[#e4e4e7]">{displayDate}</h3>
      </div>

      {content.length > 0 ? (
        <div className="flex flex-col gap-4">
          {content.map((day, i) => (
            <div key={i} className="bg-[#12121a] rounded-xl border border-[#1e1e2e] overflow-hidden">
              {day.file && (
                <div className="px-4 py-2 border-b border-[#1e1e2e] flex items-center gap-2">
                  <FileText className="w-3 h-3 text-[#8b5cf6]" />
                  <span className="text-[10px] text-[#525252] font-mono">
                    {day.file.split('/').pop()}
                  </span>
                </div>
              )}
              <div className="p-4">
                <div className="text-sm text-[#a1a1aa] whitespace-pre-wrap leading-relaxed font-mono max-h-[60vh] overflow-y-auto">
                  {renderContent(day.content)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[#525252] text-center py-12 bg-[#12121a] rounded-xl border border-[#1e1e2e]">
          No memories recorded for this date
        </div>
      )}
    </motion.div>
  )
}

// ─── Inline Search Bar + Results ───────────────────────────────────────────────

function InlineSearch({ onSelectDate }: { onSelectDate: (date: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const res = await searchMemory(q.trim(), 8)
      setResults(res.results)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(value), 400)
    } else {
      setResults([])
      setSearched(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      doSearch(query)
    }
  }

  // Extract date from path like "memory/daily/2026-01-28.md"
  const getDateFromPath = (path: string): string | null => {
    const match = path.match(/(\d{4}-\d{2}-\d{2})/)
    return match ? match[1] : null
  }

  return (
    <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] overflow-hidden">
      <div className="p-3 flex items-center gap-2 border-b border-[#1e1e2e]">
        <Search className="w-4 h-4 text-[#525252]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search within memories..."
          className="flex-1 bg-transparent text-sm text-[#e4e4e7] placeholder:text-[#3a3a4a]
                     focus:outline-none"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-[#8b5cf6] animate-spin" />}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setResults([]); setSearched(false) }}>
            <X className="w-3.5 h-3.5 text-[#525252] hover:text-[#a1a1aa]" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {searched && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {results.length > 0 ? (
              <div className="max-h-72 overflow-y-auto divide-y divide-[#1e1e2e]">
                {results.map((r, i) => {
                  const date = getDateFromPath(r.path)
                  return (
                    <motion.button
                      key={`${r.path}:${r.startLine}`}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => date && onSelectDate(date)}
                      className="w-full text-left px-4 py-3 hover:bg-[#1a1a25] transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-3 h-3 text-[#8b5cf6]" />
                        <span className="text-[10px] text-[#71717a] font-mono">
                          {r.path.split('/').pop()}
                        </span>
                        <span className="text-[10px] text-[#525252]">
                          L{r.startLine}–{r.endLine}
                        </span>
                        {/* Score indicator */}
                        <div className="ml-auto flex items-center gap-1">
                          <div className="w-12 h-1 rounded-full bg-[#1e1e2e] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#8b5cf6]"
                              style={{ width: `${Math.round(r.score * 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-[#525252] font-mono">{Math.round(r.score * 100)}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#a1a1aa] line-clamp-2 leading-relaxed">
                        {r.snippet}
                      </p>
                    </motion.button>
                  )
                })}
              </div>
            ) : !loading ? (
              <div className="py-6 text-center text-xs text-[#525252]">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Timeline Entry Card ───────────────────────────────────────────────────────

function TimelineEntry({ day, index, onClick }: {
  day: TimelineDay & { headers?: string[]; meta?: DailyFileMeta }
  index: number
  onClick: () => void
}) {
  const dateDisplay = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
  const headers = day.headers || extractHeaders(day.content)
  const firstLine = day.content.split('\n').find(l => l.trim())?.replace(/^#+\s*/, '') || ''
  const preview = day.content.split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .slice(0, 2)
    .join(' ')

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="relative flex gap-4 group"
    >
      {/* Timeline rail */}
      <div className="flex flex-col items-center shrink-0 pt-1">
        <div className="w-3 h-3 rounded-full bg-[#8b5cf6]/30 border-2 border-[#8b5cf6] 
                        group-hover:bg-[#8b5cf6] group-hover:scale-125 transition-all" />
        {/* Connecting line */}
        <div className="w-px flex-1 bg-gradient-to-b from-[#8b5cf6]/30 to-transparent mt-1" />
      </div>

      {/* Card */}
      <div
        onClick={onClick}
        className="flex-1 bg-[#12121a] rounded-xl border border-[#1e1e2e] p-4 mb-4
                   hover:border-[#8b5cf6]/30 hover:shadow-lg hover:shadow-[#8b5cf6]/5
                   transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-3.5 h-3.5 text-[#8b5cf6]" />
          <span className="text-sm font-medium text-[#e4e4e7]">{dateDisplay}</span>
          <span className="text-[10px] text-[#525252] font-mono">{day.date}</span>
          {day.meta && (
            <span className="text-[10px] text-[#3a3a4a] font-mono ml-auto">
              {day.meta.size > 1024
                ? `${(day.meta.size / 1024).toFixed(1)}KB`
                : `${day.meta.size}B`}
            </span>
          )}
          <Eye className="w-3 h-3 text-[#525252] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Title */}
        {firstLine && (
          <p className="text-xs text-[#8b5cf6]/80 font-medium mb-1.5 truncate">
            {firstLine}
          </p>
        )}

        {/* Topic tags from headers */}
        {headers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {headers.slice(0, 6).map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md 
                           bg-[#1e1e2e] text-[10px] text-[#a1a1aa] border border-[#2a2a3a]"
              >
                <Hash className="w-2.5 h-2.5 text-[#525252]" />
                {h.length > 30 ? h.slice(0, 28) + '…' : h}
              </span>
            ))}
            {headers.length > 6 && (
              <span className="text-[10px] text-[#525252] px-1 py-0.5">
                +{headers.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* Preview text */}
        <p className="text-xs text-[#71717a] line-clamp-2 leading-relaxed">
          {preview}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MemoryTimeline() {
  const [recentDays, setRecentDays] = useState<TimelineDay[]>([])
  const [fileMetas, setFileMetas] = useState<DailyFileMeta[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDayContent, setSelectedDayContent] = useState<TimelineDay[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [loadingDay, setLoadingDay] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weeks = useMemo(() => getHeatmapDates(20), [])
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks])
  const today = new Date().toISOString().split('T')[0]

  // Build activity map from file metadata: date → intensity level
  const activityMap = useMemo(() => {
    const map: Record<string, { level: number; size: number; sections: number }> = {}
    if (fileMetas.length === 0) {
      // Fallback: use recentDays presence as basic activity
      for (const d of recentDays) {
        map[d.date] = { level: 1, size: 0, sections: 0 }
      }
      return map
    }

    // Calculate intensity based on file size
    const sizes = fileMetas.map(m => m.size)
    const maxSize = Math.max(...sizes, 1)
    const p25 = maxSize * 0.25
    const p50 = maxSize * 0.50
    const p75 = maxSize * 0.75

    for (const meta of fileMetas) {
      const level =
        meta.size >= p75 ? 4 :
        meta.size >= p50 ? 3 :
        meta.size >= p25 ? 2 : 1
      map[meta.date] = { level, size: meta.size, sections: meta.sections }
    }
    return map
  }, [fileMetas, recentDays])

  // Total stats
  const totalDays = fileMetas.length || recentDays.length
  const totalSize = fileMetas.reduce((acc, m) => acc + m.size, 0)

  // Fetch data on mount
  useEffect(() => {
    const load = async () => {
      setLoadingRecent(true)
      setError(null)
      try {
        const [days, metas] = await Promise.all([
          getRecent(60),
          getDailyFileMetas(),
        ])
        setRecentDays(days)
        setFileMetas(metas)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoadingRecent(false)
      }
    }
    load()
  }, [])

  const handleDayClick = useCallback(async (date: string) => {
    setSelectedDate(date)
    setLoadingDay(true)
    try {
      const days = await getTimeline(date)
      setSelectedDayContent(days)
    } catch {
      setSelectedDayContent([])
    } finally {
      setLoadingDay(false)
    }
  }, [])

  // Enrich recent days with meta
  const enrichedDays = useMemo(() => {
    return recentDays.map(day => ({
      ...day,
      headers: extractHeaders(day.content),
      meta: fileMetas.find(m => m.date === day.date),
    }))
  }, [recentDays, fileMetas])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <AnimatePresence mode="wait">
        {selectedDate && !loadingDay ? (
          <motion.div key="detail" className="p-6">
            <DayDetail
              date={selectedDate}
              content={selectedDayContent}
              onBack={() => setSelectedDate(null)}
            />
          </motion.div>
        ) : (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* ── Calendar Heatmap ──────────────────────────────────────────── */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-[#8b5cf6]" />
                <h3 className="text-sm font-medium text-[#e4e4e7]">Activity Heatmap</h3>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-[10px] text-[#525252]">
                    {totalDays} day{totalDays !== 1 ? 's' : ''} recorded
                    {totalSize > 0 && ` · ${(totalSize / 1024).toFixed(1)}KB total`}
                  </span>
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      showDatePicker ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'hover:bg-[#1e1e2e] text-[#71717a]'
                    }`}
                  >
                    <CalendarDays className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                {/* Heatmap grid */}
                <div className="flex-1 bg-[#12121a] rounded-xl p-4 border border-[#1e1e2e]">
                  {/* Month labels */}
                  <div className="flex ml-8 mb-1.5 gap-0">
                    {monthLabels.map(({ label, col }, i) => {
                      const prevCol = i > 0 ? monthLabels[i - 1].col : 0
                      const offset = i === 0 ? col * 16.5 : (col - prevCol - 1) * 16.5
                      return (
                        <div
                          key={`${label}-${col}`}
                          className="text-[10px] text-[#525252]"
                          style={{ marginLeft: `${Math.max(0, offset)}px`, minWidth: 16.5 }}
                        >
                          {label}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-[3px]">
                    {/* Day labels */}
                    <div className="flex flex-col gap-[3px] mr-1">
                      {DAY_LABELS.map((label, i) => (
                        <div key={i} className="w-6 h-[13px] text-[10px] text-[#525252] flex items-center justify-end pr-1">
                          {label}
                        </div>
                      ))}
                    </div>

                    {/* Grid */}
                    <div className="flex gap-[3px]">
                      {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-[3px]">
                          {week.map(date => {
                            const activity = activityMap[date]
                            const sizeStr = activity?.size
                              ? activity.size > 1024
                                ? `${(activity.size / 1024).toFixed(1)}KB`
                                : `${activity.size}B`
                              : ''
                            const tooltip = activity
                              ? `${date} — ${sizeStr}${activity.sections ? `, ${activity.sections} sections` : ''}`
                              : date

                            return (
                              <HeatmapCell
                                key={date}
                                date={date}
                                intensity={activity?.level || 0}
                                isToday={date === today}
                                isSelected={date === selectedDate}
                                onClick={() => handleDayClick(date)}
                                tooltip={tooltip}
                              />
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-2 mt-3 justify-end">
                    <span className="text-[10px] text-[#525252]">Less</span>
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[#1e1e2e]/60" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[#8b5cf6]/20" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[#8b5cf6]/45" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[#8b5cf6]/70" />
                    <div className="w-[10px] h-[10px] rounded-[2px] bg-[#8b5cf6]" />
                    <span className="text-[10px] text-[#525252]">More</span>
                  </div>
                </div>

                {/* Date picker */}
                <AnimatePresence>
                  {showDatePicker && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 260 }}
                      exit={{ opacity: 0, width: 0 }}
                      className="shrink-0 overflow-hidden"
                    >
                      <DatePicker
                        value={selectedDate || today}
                        onChange={date => {
                          handleDayClick(date)
                          setShowDatePicker(false)
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Loading day spinner */}
            {loadingDay && selectedDate && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-[#8b5cf6] animate-spin" />
              </div>
            )}

            {/* ── Inline Search ──────────────────────────────────────────── */}
            <div className="px-6 pb-4">
              <InlineSearch onSelectDate={handleDayClick} />
            </div>

            {/* ── Recent Activity Timeline ───────────────────────────────── */}
            <div className="px-6 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-[#8b5cf6]" />
                <h3 className="text-sm font-medium text-[#e4e4e7]">Memory Timeline</h3>
                <span className="text-xs text-[#525252] ml-auto">
                  {enrichedDays.length} day{enrichedDays.length !== 1 ? 's' : ''} with notes
                </span>
              </div>

              {loadingRecent ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-5 h-5 text-[#8b5cf6] animate-spin" />
                  <p className="text-xs text-[#525252]">Loading memories...</p>
                </div>
              ) : error ? (
                <div className="text-sm text-red-400 text-center py-8 bg-[#12121a] rounded-xl border border-[#1e1e2e]">
                  {error}
                </div>
              ) : enrichedDays.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-[#525252] bg-[#12121a] rounded-xl border border-[#1e1e2e]">
                  <Sparkles className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-sm">No memories recorded yet</p>
                  <p className="text-xs mt-1 text-[#3a3a4a]">Daily notes will appear here as they&apos;re created</p>
                </div>
              ) : (
                <div className="relative">
                  {enrichedDays.slice(0, 15).map((day, i) => (
                    <TimelineEntry
                      key={day.date}
                      day={day}
                      index={i}
                      onClick={() => handleDayClick(day.date)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
