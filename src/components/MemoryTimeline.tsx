import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, FileText, Loader2, ChevronLeft, ChevronRight,
  CalendarDays, Eye, ArrowLeft
} from 'lucide-react'
import { getTimeline, getRecent, type TimelineDay } from '../lib/memory'

// --- Heatmap date generation (configurable weeks) ---
function getHeatmapDates(weekCount = 16): string[][] {
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

// --- Heatmap cell with intensity ---
function HeatmapCell({ date, activityLevel, isToday, isSelected, onClick }: {
  date: string
  activityLevel: number // 0-3
  isToday: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const isFuture = new Date(date + 'T23:59:59') > new Date()
  
  const bgClass =
    isFuture ? 'bg-[#0a0a0f]' :
    activityLevel >= 3 ? 'bg-[#8b5cf6]' :
    activityLevel === 2 ? 'bg-[#8b5cf6]/60' :
    activityLevel === 1 ? 'bg-[#8b5cf6]/30' :
    'bg-[#1e1e2e]'

  return (
    <motion.button
      whileHover={!isFuture ? { scale: 1.3 } : undefined}
      onClick={onClick}
      disabled={isFuture}
      title={`${date}${activityLevel > 0 ? ` (${activityLevel} entries)` : ''}`}
      className={`
        w-3.5 h-3.5 rounded-sm transition-all
        ${isFuture ? 'cursor-default' : 'cursor-pointer'}
        ${isSelected ? 'ring-2 ring-[#8b5cf6] ring-offset-1 ring-offset-[#0a0a0f]' : ''}
        ${isToday && !isSelected ? 'ring-1 ring-[#e4e4e7]/40' : ''}
        ${bgClass}
      `}
    />
  )
}

// --- Date picker ---
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

// --- Day detail with markdown-like rendering ---
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
                <div className="text-sm text-[#a1a1aa] whitespace-pre-wrap leading-relaxed font-mono max-h-96 overflow-y-auto">
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

// Simple markdown-like rendering for daily notes
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

export default function MemoryTimeline() {
  const [recentDays, setRecentDays] = useState<TimelineDay[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDayContent, setSelectedDayContent] = useState<TimelineDay[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [loadingDay, setLoadingDay] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weeks = useMemo(() => getHeatmapDates(16), [])
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks])
  const today = new Date().toISOString().split('T')[0]

  // Build activity map: date → count
  const activityMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of recentDays) {
      map[d.date] = (map[d.date] || 0) + 1
    }
    return map
  }, [recentDays])

  useEffect(() => {
    setLoadingRecent(true)
    getRecent(60)
      .then(days => setRecentDays(days))
      .catch(e => setError(e.message))
      .finally(() => setLoadingRecent(false))
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
            {/* Calendar Heatmap */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-[#8b5cf6]" />
                <h3 className="text-sm font-medium text-[#e4e4e7]">Activity Heatmap</h3>
                <span className="text-xs text-[#525252] ml-auto">Last 16 weeks</span>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    showDatePicker ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'hover:bg-[#1e1e2e] text-[#71717a]'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-4">
                {/* Heatmap */}
                <div className="flex-1 bg-[#12121a] rounded-xl p-4 border border-[#1e1e2e]">
                  {/* Month labels */}
                  <div className="flex ml-8 mb-1 gap-0">
                    {monthLabels.map(({ label, col }, i) => {
                      const prevCol = i > 0 ? monthLabels[i - 1].col : 0
                      const offset = i === 0 ? col * 17.5 : (col - prevCol - 1) * 17.5
                      return (
                        <div
                          key={`${label}-${col}`}
                          className="text-[10px] text-[#525252]"
                          style={{ marginLeft: `${Math.max(0, offset)}px`, minWidth: 17.5 }}
                        >
                          {label}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-1">
                    {/* Day labels */}
                    <div className="flex flex-col gap-[3px] mr-1">
                      {DAY_LABELS.map((label, i) => (
                        <div key={i} className="w-6 h-3.5 text-[10px] text-[#525252] flex items-center justify-end pr-1">
                          {label}
                        </div>
                      ))}
                    </div>

                    {/* Grid */}
                    <div className="flex gap-[3px]">
                      {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-[3px]">
                          {week.map(date => (
                            <HeatmapCell
                              key={date}
                              date={date}
                              activityLevel={Math.min(3, activityMap[date] || 0)}
                              isToday={date === today}
                              isSelected={date === selectedDate}
                              onClick={() => handleDayClick(date)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-2 mt-3 justify-end">
                    <span className="text-[10px] text-[#525252]">Less</span>
                    <div className="w-3 h-3 rounded-sm bg-[#1e1e2e]" />
                    <div className="w-3 h-3 rounded-sm bg-[#8b5cf6]/30" />
                    <div className="w-3 h-3 rounded-sm bg-[#8b5cf6]/60" />
                    <div className="w-3 h-3 rounded-sm bg-[#8b5cf6]" />
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

            {/* Recent Activity */}
            <div className="px-6 pb-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[#8b5cf6]" />
                <h3 className="text-sm font-medium text-[#e4e4e7]">Recent Activity</h3>
                <span className="text-xs text-[#525252] ml-auto">
                  {recentDays.length} day{recentDays.length !== 1 ? 's' : ''} with notes
                </span>
              </div>

              {loadingRecent ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-[#8b5cf6] animate-spin" />
                </div>
              ) : error ? (
                <div className="text-sm text-red-400 text-center py-4">{error}</div>
              ) : recentDays.length === 0 ? (
                <div className="text-sm text-[#525252] text-center py-8">No recent activity</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentDays.slice(0, 10).map((day, i) => {
                    const dateDisplay = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })
                    // Extract first heading or first non-empty line as title
                    const firstLine = day.content.split('\n').find(l => l.trim())?.replace(/^#+\s*/, '') || ''

                    return (
                      <motion.div
                        key={day.date}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-[#12121a] rounded-xl border border-[#1e1e2e] p-4 
                                 hover:border-[#8b5cf6]/20 transition-all cursor-pointer group"
                        onClick={() => handleDayClick(day.date)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-3.5 h-3.5 text-[#8b5cf6]" />
                          <span className="text-sm font-medium text-[#e4e4e7]">{dateDisplay}</span>
                          <span className="text-[10px] text-[#525252] font-mono">{day.date}</span>
                          <Eye className="w-3 h-3 text-[#525252] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {firstLine && (
                          <p className="text-xs text-[#8b5cf6]/70 font-medium mb-1 truncate">
                            {firstLine}
                          </p>
                        )}
                        <p className="text-xs text-[#71717a] line-clamp-2 leading-relaxed">
                          {day.content.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 2).join(' ')}
                        </p>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
