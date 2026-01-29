/**
 * Daily Briefing — card-based overview of calendar, weather, tasks, and memory
 * Renders inside the Dashboard/Bridge view
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun,
  Calendar,
  CheckSquare,
  Brain,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Clock,
  MapPin,
  Wind,
  Droplets,
  Thermometer,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  fetchCalendar,
  fetchWeather,
  fetchTasks,
  fetchMemoryHighlight,
  type CalendarEvent,
  type WeatherData,
  type TaskItem,
  type MemoryHighlight,
} from '../lib/briefing'

// ─── Collapsible Section ─────────────────────────────────

interface SectionProps {
  title: string
  icon: React.ReactNode
  color: string
  loading?: boolean
  error?: string
  defaultOpen?: boolean
  badge?: string | number
  children: React.ReactNode
}

function BriefingSection({
  title,
  icon,
  color,
  loading,
  error,
  defaultOpen = true,
  badge,
  children,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-[#12121a] border border-[#1e1e2e] overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-[#1e1e2e]/50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="font-medium text-sm flex-1 text-left">{title}</span>
        {badge !== undefined && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#1e1e2e] text-[#a1a1aa]">
            {badge}
          </span>
        )}
        {loading && <Loader2 className="w-4 h-4 text-[#71717a] animate-spin" />}
        {error && <AlertCircle className="w-4 h-4 text-red-400" />}
        <motion.div
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="w-4 h-4 text-[#52525b]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="px-4 pb-4">
              {error ? (
                <p className="text-xs text-red-400/80">{error}</p>
              ) : (
                children
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Weather Card ────────────────────────────────────────

function WeatherCard({ data }: { data: WeatherData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="text-4xl">{data.icon}</span>
        <div>
          <p className="text-2xl font-bold">{data.temp_F}°F</p>
          <p className="text-sm text-[#a1a1aa]">{data.condition}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-1.5 text-xs text-[#71717a]">
          <Thermometer className="w-3.5 h-3.5" />
          <span>Feels {data.feelsLike_F}°F</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#71717a]">
          <Droplets className="w-3.5 h-3.5" />
          <span>{data.humidity}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#71717a]">
          <Wind className="w-3.5 h-3.5" />
          <span>{data.windSpeed} mph</span>
        </div>
      </div>
      {data.location && (
        <div className="flex items-center gap-1.5 text-xs text-[#52525b]">
          <MapPin className="w-3 h-3" />
          <span>{data.location}</span>
        </div>
      )}
    </div>
  )
}

// ─── Calendar List ───────────────────────────────────────

function CalendarList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-[#52525b] italic">No events today — clear schedule ✨</p>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-2.5 rounded-lg bg-[#0a0a0f]/60 border border-[#1e1e2e]/60"
        >
          <div className="w-1 h-full min-h-[32px] rounded-full bg-blue-500/60 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{event.title}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {event.start && (
                <span className="text-xs text-[#71717a] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatEventTime(event.start)}
                  {event.end && ` – ${formatEventTime(event.end)}`}
                </span>
              )}
              {event.location && (
                <span className="text-xs text-[#52525b] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
          {event.allDay && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0">
              All day
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function formatEventTime(timeStr: string): string {
  try {
    const d = new Date(timeStr)
    if (isNaN(d.getTime())) return timeStr
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return timeStr
  }
}

// ─── Tasks List ──────────────────────────────────────────

function TasksList({ tasks }: { tasks: TaskItem[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-[#52525b] italic">No open tasks 🎉</p>
  }

  const priorityColor = (p?: number) => {
    if (p === 1) return 'text-red-400'
    if (p === 2) return 'text-orange-400'
    if (p === 3) return 'text-yellow-400'
    return 'text-[#71717a]'
  }

  return (
    <div className="space-y-1.5">
      {tasks.slice(0, 8).map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#0a0a0f]/60 transition-colors"
        >
          <CheckSquare className={`w-4 h-4 shrink-0 ${priorityColor(task.priority)}`} />
          <span className="text-sm flex-1 truncate">{task.title}</span>
          <span className="text-[10px] font-mono text-[#52525b] shrink-0">{task.id}</span>
        </div>
      ))}
      {tasks.length > 8 && (
        <p className="text-xs text-[#52525b] pl-7">+{tasks.length - 8} more…</p>
      )}
    </div>
  )
}

// ─── Memory Highlight ────────────────────────────────────

function MemoryCard({ highlight }: { highlight: MemoryHighlight }) {
  return (
    <div className="p-3 rounded-lg bg-[#0a0a0f]/60 border border-[#1e1e2e]/60">
      <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">
        {highlight.text}
      </p>
      {highlight.source && (
        <p className="text-[10px] text-[#3f3f46] mt-2">via {highlight.source}</p>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────

export default function DailyBriefing() {
  const [calendar, setCalendar] = useState<{ events: CalendarEvent[]; loading: boolean; error?: string }>({
    events: [],
    loading: true,
  })
  const [weather, setWeather] = useState<{ data: WeatherData | null; loading: boolean; error?: string }>({
    data: null,
    loading: true,
  })
  const [tasks, setTasks] = useState<{ items: TaskItem[]; loading: boolean; error?: string }>({
    items: [],
    loading: true,
  })
  const [memory, setMemory] = useState<{ highlight: MemoryHighlight | null; loading: boolean; error?: string }>({
    highlight: null,
    loading: true,
  })
  const [refreshing, setRefreshing] = useState(false)

  const loadAll = useCallback(async () => {
    setRefreshing(true)

    // Fire all in parallel
    const calP = fetchCalendar()
      .then((events) => setCalendar({ events, loading: false }))
      .catch((e) => setCalendar({ events: [], loading: false, error: e.message }))

    const wxP = fetchWeather()
      .then((data) => setWeather({ data, loading: false }))
      .catch((e) => setWeather({ data: null, loading: false, error: e.message }))

    const taskP = fetchTasks()
      .then((items) => setTasks({ items, loading: false }))
      .catch((e) => setTasks({ items: [], loading: false, error: e.message }))

    const memP = fetchMemoryHighlight()
      .then((highlight) => setMemory({ highlight, loading: false }))
      .catch((e) => setMemory({ highlight: null, loading: false, error: e.message }))

    await Promise.allSettled([calP, wxP, taskP, memP])
    setRefreshing(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const now = new Date()
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-8"
    >
      {/* Briefing header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400" />
            {greeting}
          </h2>
          <p className="text-sm text-[#71717a]">{dateStr}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadAll}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#71717a] hover:text-[#e4e4e7] bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </motion.button>
      </div>

      {/* Briefing grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weather */}
        <BriefingSection
          title="Weather"
          icon={<Sun className="w-4 h-4 text-white" />}
          color="bg-gradient-to-br from-amber-500 to-orange-500"
          loading={weather.loading}
          error={weather.error}
        >
          {weather.data ? (
            <WeatherCard data={weather.data} />
          ) : !weather.loading ? (
            <p className="text-sm text-[#52525b] italic">Weather unavailable</p>
          ) : null}
        </BriefingSection>

        {/* Calendar */}
        <BriefingSection
          title="Today's Schedule"
          icon={<Calendar className="w-4 h-4 text-white" />}
          color="bg-gradient-to-br from-blue-500 to-cyan-500"
          loading={calendar.loading}
          error={calendar.error}
          badge={calendar.events.length > 0 ? calendar.events.length : undefined}
        >
          <CalendarList events={calendar.events} />
        </BriefingSection>

        {/* Tasks */}
        <BriefingSection
          title="Open Tasks"
          icon={<CheckSquare className="w-4 h-4 text-white" />}
          color="bg-gradient-to-br from-green-500 to-emerald-500"
          loading={tasks.loading}
          error={tasks.error}
          badge={tasks.items.length > 0 ? tasks.items.length : undefined}
        >
          <TasksList tasks={tasks.items} />
        </BriefingSection>

        {/* Memory */}
        <BriefingSection
          title="Memory Highlight"
          icon={<Brain className="w-4 h-4 text-white" />}
          color="bg-gradient-to-br from-purple-500 to-pink-500"
          loading={memory.loading}
          error={memory.error}
        >
          {memory.highlight ? (
            <MemoryCard highlight={memory.highlight} />
          ) : !memory.loading ? (
            <p className="text-sm text-[#52525b] italic">No recent memory entries</p>
          ) : null}
        </BriefingSection>
      </div>
    </motion.div>
  )
}
