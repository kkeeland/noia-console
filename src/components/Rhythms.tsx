import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Play, Plus, CheckCircle, XCircle, Calendar, Repeat,
  ChevronDown, ChevronRight, Trash2, Pencil, Zap, ToggleLeft,
  ToggleRight, Loader2, AlertTriangle, Timer, Terminal, X,
  RefreshCw, Sun, Moon
} from 'lucide-react'
import {
  cronList, cronAdd, cronRemove, cronUpdate, cronRuns, cronRunNow,
  humanReadableSchedule, relativeTime, formatTimestamp, getNextRunTimes,
  SCHEDULE_PRESETS,
  type CronJob, type CronRun,
} from '../lib/cron-api'

// ── Timeline Component ─────────────────────────────────────────────────────

function DayTimeline({ jobs }: { jobs: CronJob[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60

  // Gather next-run times per job for the next 24 hours
  const jobSlots = jobs.filter(j => j.enabled && j.schedule).map(job => {
    try {
      const times = getNextRunTimes(job.schedule, 48)
      const next24h = times.filter(t => {
        const diff = t.getTime() - Date.now()
        return diff > 0 && diff < 86_400_000
      })
      return { job, times: next24h }
    } catch {
      return { job, times: [] as Date[] }
    }
  })

  // Color palette for jobs
  const colors = [
    'bg-[#8b5cf6]', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-cyan-500', 'bg-pink-500', 'bg-blue-500', 'bg-orange-500',
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-[#12121a] border border-[#1e1e2e] p-5 mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sun className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-medium text-[#a1a1aa]">Next 24 Hours</h3>
        <Moon className="w-4 h-4 text-blue-400 ml-auto" />
      </div>

      {/* Hour grid */}
      <div className="relative">
        <div className="flex">
          {hours.map(h => (
            <div key={h} className="flex-1 min-w-0">
              <div className="text-[10px] text-[#52525b] text-center mb-1.5">
                {h % 6 === 0 ? (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`) : ''}
              </div>
              <div className="h-8 border-l border-[#1e1e2e] relative">
                {/* Markers for jobs running in this hour */}
                {jobSlots.map(({ job, times }, ji) => {
                  const inThisHour = times.filter(t => t.getHours() === h)
                  return inThisHour.map((t, ti) => (
                    <div
                      key={`${job.id}-${ti}`}
                      title={`${job.text?.slice(0, 40)} — ${t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                      className={`absolute w-2 h-2 rounded-full ${colors[ji % colors.length]} opacity-80`}
                      style={{
                        left: `${(t.getMinutes() / 60) * 100}%`,
                        top: `${4 + ji * 6}px`,
                      }}
                    />
                  ))
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Current time indicator */}
        <div
          className="absolute top-5 bottom-0 w-px bg-[#8b5cf6] z-10"
          style={{ left: `${(currentHour / 24) * 100}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-[#8b5cf6] -ml-[3px] -mt-1" />
        </div>
      </div>

      {/* Legend */}
      {jobSlots.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#1e1e2e]">
          {jobSlots.map(({ job }, ji) => (
            <div key={job.id} className="flex items-center gap-1.5 text-xs text-[#71717a]">
              <div className={`w-2 h-2 rounded-full ${colors[ji % colors.length]}`} />
              <span className="truncate max-w-[140px]">{job.text?.slice(0, 30)}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── Run History ────────────────────────────────────────────────────────────

function RunHistory({ jobId }: { jobId: string }) {
  const [runs, setRuns] = useState<CronRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    cronRuns(jobId)
      .then(r => { if (!cancelled) setRuns(r) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [jobId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-[#71717a] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading runs…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-red-400 text-sm">
        <AlertTriangle className="w-4 h-4" />
        {error}
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="py-4 text-[#52525b] text-sm">No runs recorded yet.</div>
    )
  }

  // Stats
  const successCount = runs.filter(r => r.status === 'success').length
  const failCount = runs.filter(r => r.status === 'error').length
  const avgDuration = runs.filter(r => r.durationMs).reduce((s, r) => s + (r.durationMs || 0), 0) / (runs.filter(r => r.durationMs).length || 1)

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1 text-green-400">
          <CheckCircle className="w-3 h-3" /> {successCount} success
        </span>
        {failCount > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <XCircle className="w-3 h-3" /> {failCount} failed
          </span>
        )}
        {avgDuration > 0 && (
          <span className="flex items-center gap-1 text-[#71717a]">
            <Timer className="w-3 h-3" /> avg {(avgDuration / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Run list */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {runs.slice(0, 20).map((run) => (
          <div
            key={run.id}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-[#0a0a0f] text-sm"
          >
            {run.status === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            ) : run.status === 'error' ? (
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            ) : run.status === 'running' ? (
              <Loader2 className="w-4 h-4 text-[#8b5cf6] animate-spin mt-0.5 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-[#52525b] mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[#a1a1aa]">
                  {formatTimestamp(run.startedAt)}
                </span>
                {run.durationMs && (
                  <span className="text-[#52525b] text-xs">
                    {(run.durationMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              {run.output && (
                <pre className="mt-1 text-xs text-[#71717a] font-mono truncate max-w-full">
                  {run.output.slice(0, 200)}
                </pre>
              )}
              {run.error && (
                <p className="mt-1 text-xs text-red-400 truncate">{run.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Job Card ───────────────────────────────────────────────────────────────

function JobCard({
  job,
  onToggle,
  onRunNow,
  onDelete,
  onEdit,
}: {
  job: CronJob
  onToggle: () => void
  onRunNow: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [running, setRunning] = useState(false)

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setRunning(true)
    try { await onRunNow() } finally { setTimeout(() => setRunning(false), 2000) }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      className={`rounded-xl border transition-all ${
        job.enabled
          ? 'bg-[#12121a] border-[#1e1e2e] hover:border-[#8b5cf6]/30'
          : 'bg-[#0e0e14] border-[#18181f] opacity-60'
      }`}
    >
      {/* Main row */}
      <div
        className="p-5 cursor-pointer select-none flex items-start gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand icon */}
        <div className="mt-1 text-[#52525b]">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h3 className="text-base font-semibold truncate">{job.text || 'Untitled rhythm'}</h3>
            {job.enabled ? (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 uppercase tracking-wider font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 uppercase tracking-wider font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                Paused
              </span>
            )}
          </div>

          <div className="flex items-center gap-5 text-sm text-[#71717a] flex-wrap">
            <span className="flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              {humanReadableSchedule(job.schedule)}
            </span>
            {job.nextRun && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Next: {relativeTime(job.nextRun)}
              </span>
            )}
            {job.lastRun && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Last: {relativeTime(job.lastRun)}
              </span>
            )}
          </div>

          {job.model && (
            <div className="mt-1.5 text-xs text-[#52525b] flex items-center gap-1.5">
              <Terminal className="w-3 h-3" />
              {job.model}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={handleRun}
            disabled={running}
            className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors text-[#71717a] hover:text-[#8b5cf6] disabled:opacity-40"
            title="Run now"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors"
            title={job.enabled ? 'Pause' : 'Enable'}
          >
            {job.enabled ? (
              <ToggleRight className="w-5 h-5 text-green-400" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-[#52525b]" />
            )}
          </button>

          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors text-[#71717a] hover:text-[#e4e4e7]"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors text-[#71717a] hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 ml-9 border-t border-[#1e1e2e] mt-0 pt-4">
              <div className="text-xs text-[#52525b] mb-2 font-mono">{job.schedule}</div>
              <RunHistory jobId={job.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Create / Edit Modal ────────────────────────────────────────────────────

function RhythmFormModal({
  existingJob,
  onClose,
  onSave,
}: {
  existingJob?: CronJob | null
  onClose: () => void
  onSave: () => void
}) {
  const [text, setText] = useState(existingJob?.text || '')
  const [schedule, setSchedule] = useState(existingJob?.schedule || '0 9 * * *')
  const [customSchedule, setCustomSchedule] = useState('')
  const [scheduleMode, setScheduleMode] = useState<'preset' | 'custom'>(
    existingJob?.schedule && !SCHEDULE_PRESETS.find(p => p.value === existingJob.schedule)
      ? 'custom' : 'preset'
  )
  const [model, setModel] = useState(existingJob?.model || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!existingJob

  useEffect(() => {
    if (scheduleMode === 'custom' && existingJob?.schedule) {
      setCustomSchedule(existingJob.schedule)
    }
  }, []) // eslint-disable-line

  const effectiveSchedule = scheduleMode === 'custom' ? customSchedule : schedule

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !effectiveSchedule.trim()) return

    setSaving(true)
    setError(null)

    try {
      if (isEditing && existingJob) {
        await cronUpdate(existingJob.id, {
          text: text.trim(),
          schedule: effectiveSchedule.trim(),
          ...(model ? { model } : {}),
        })
      } else {
        await cronAdd({
          text: text.trim(),
          schedule: effectiveSchedule.trim(),
          ...(model ? { model } : {}),
          enabled: true,
        })
      }
      onSave()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-lg rounded-2xl bg-[#12121a] border border-[#1e1e2e] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1e1e2e]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#8b5cf6]" />
            {isEditing ? 'Edit Rhythm' : 'New Rhythm'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#71717a]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Task text */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">
              What should Noia do?
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. Check my email inbox and summarize anything urgent"
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-[#e4e4e7] placeholder-[#3f3f46] focus:border-[#8b5cf6] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]/40 resize-none text-sm"
              autoFocus
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Schedule</label>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setScheduleMode('preset')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  scheduleMode === 'preset'
                    ? 'bg-[#8b5cf6] text-white'
                    : 'bg-[#1e1e2e] text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                Presets
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('custom')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  scheduleMode === 'custom'
                    ? 'bg-[#8b5cf6] text-white'
                    : 'bg-[#1e1e2e] text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                Custom Cron
              </button>
            </div>

            {scheduleMode === 'preset' ? (
              <div className="grid grid-cols-3 gap-2">
                {SCHEDULE_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSchedule(preset.value)}
                    className={`p-2 rounded-lg text-left text-xs transition-all border ${
                      schedule === preset.value
                        ? 'border-[#8b5cf6] bg-[#8b5cf6]/10 text-[#c4b5fd]'
                        : 'border-[#1e1e2e] bg-[#0a0a0f] text-[#71717a] hover:border-[#3f3f46]'
                    }`}
                  >
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-[10px] opacity-60 mt-0.5">{preset.description}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={customSchedule}
                  onChange={e => setCustomSchedule(e.target.value)}
                  placeholder="*/15 * * * *"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-[#e4e4e7] placeholder-[#3f3f46] focus:border-[#8b5cf6] focus:outline-none font-mono text-sm"
                />
                <p className="mt-1.5 text-[10px] text-[#52525b]">
                  Format: minute hour day-of-month month day-of-week
                </p>
              </div>
            )}

            {/* Preview */}
            {effectiveSchedule && (
              <div className="mt-2 text-xs text-[#8b5cf6]/80">
                → {humanReadableSchedule(effectiveSchedule)}
              </div>
            )}
          </div>

          {/* Model (optional) */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">
              Model <span className="text-[#52525b]">(optional)</span>
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-[#e4e4e7] focus:border-[#8b5cf6] focus:outline-none text-sm"
            >
              <option value="">Default</option>
              <option value="anthropic/claude-sonnet-4-20250514">Claude Sonnet 4</option>
              <option value="anthropic/claude-opus-4-5">Claude Opus 4.5</option>
              <option value="anthropic/claude-haiku-3-5">Claude Haiku 3.5</option>
              <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#1e1e2e] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !text.trim() || !effectiveSchedule.trim()}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Rhythm'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Delete Confirmation ────────────────────────────────────────────────────

function DeleteConfirm({
  jobText,
  onConfirm,
  onCancel,
}: {
  jobText: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="w-full max-w-sm rounded-xl bg-[#12121a] border border-[#1e1e2e] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-400" />
          Delete Rhythm?
        </h3>
        <p className="text-sm text-[#71717a] mb-5">
          "{jobText?.slice(0, 60)}{(jobText?.length || 0) > 60 ? '…' : ''}" will be permanently removed.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-[#71717a] hover:bg-[#1e1e2e] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Rhythms() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingJob, setEditingJob] = useState<CronJob | null>(null)
  const [deletingJob, setDeletingJob] = useState<CronJob | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      setError(null)
      const data = await cronList()
      setJobs(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load rhythms')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchJobs, 30_000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  const handleToggle = async (job: CronJob) => {
    try {
      await cronUpdate(job.id, { enabled: !job.enabled })
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, enabled: !j.enabled } : j))
    } catch { /* silent */ }
  }

  const handleRunNow = async (job: CronJob) => {
    await cronRunNow(job.id)
  }

  const handleDelete = async () => {
    if (!deletingJob) return
    try {
      await cronRemove(deletingJob.id)
      setJobs(prev => prev.filter(j => j.id !== deletingJob.id))
    } catch { /* silent */ }
    setDeletingJob(null)
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingJob(null)
    fetchJobs()
  }

  const activeCount = jobs.filter(j => j.enabled).length

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-[#8b5cf6]" />
            Rhythms
          </h1>
          <p className="text-[#71717a]">
            {loading ? 'Loading…' : `${activeCount} active rhythm${activeCount !== 1 ? 's' : ''} · ${jobs.length} total`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            className="p-2 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setEditingJob(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Rhythm
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-[#12121a] border border-[#1e1e2e] animate-pulse" />
          ))}
        </div>
      )}

      {/* Timeline */}
      {!loading && jobs.length > 0 && (
        <DayTimeline jobs={jobs} />
      )}

      {/* Job list */}
      {!loading && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onToggle={() => handleToggle(job)}
                onRunNow={() => handleRunNow(job)}
                onDelete={() => setDeletingJob(job)}
                onEdit={() => { setEditingJob(job); setShowForm(true) }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {!loading && jobs.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-[#71717a]"
        >
          <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-[#8b5cf6] opacity-50" />
          </div>
          <p className="text-lg mb-2">No rhythms yet</p>
          <p className="text-sm mb-6">Create your first automated task</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Rhythm
          </button>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <RhythmFormModal
            existingJob={editingJob}
            onClose={() => { setShowForm(false); setEditingJob(null) }}
            onSave={handleSaved}
          />
        )}
        {deletingJob && (
          <DeleteConfirm
            jobText={deletingJob.text}
            onConfirm={handleDelete}
            onCancel={() => setDeletingJob(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
