// Cron API helpers — wraps Gateway /tools/invoke for cron operations

import { getGatewayUrl, getGatewayToken } from './config'

// ── Types ──────────────────────────────────────────────────────────────────

export interface CronJob {
  id: string
  text: string
  schedule: string
  enabled: boolean
  model?: string
  channel?: string
  createdAt?: string
  lastRun?: string
  nextRun?: string
  thinking?: string
  thinkingBudget?: number
}

export interface CronRun {
  id: string
  jobId: string
  startedAt: string
  finishedAt?: string
  status: 'success' | 'error' | 'running' | 'skipped'
  output?: string
  error?: string
  durationMs?: number
}

// ── Cron schedule presets ──────────────────────────────────────────────────

export interface SchedulePreset {
  label: string
  value: string
  description: string
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { label: 'Every 15 min', value: '*/15 * * * *', description: 'Runs at :00, :15, :30, :45' },
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the top of every hour' },
  { label: 'Every 3 hours', value: '0 */3 * * *', description: 'Runs every 3 hours' },
  { label: 'Daily at 8 AM', value: '0 8 * * *', description: 'Once a day at 8:00 AM' },
  { label: 'Daily at 9 AM', value: '0 9 * * *', description: 'Once a day at 9:00 AM' },
  { label: 'Twice daily', value: '0 9,17 * * *', description: '9 AM and 5 PM' },
  { label: 'Weekdays at 9 AM', value: '0 9 * * 1-5', description: 'Mon–Fri at 9:00 AM' },
  { label: 'Weekly (Monday)', value: '0 9 * * 1', description: 'Every Monday at 9 AM' },
  { label: 'Monthly (1st)', value: '0 9 1 * *', description: 'First of month at 9 AM' },
]

// ── Human-readable schedule ────────────────────────────────────────────────

export function humanReadableSchedule(cron: string): string {
  if (!cron) return 'No schedule'
  
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return cron

  const [min, hour, dom, _mon, dow] = parts

  // Check presets first
  const preset = SCHEDULE_PRESETS.find(p => p.value === cron)
  if (preset) return preset.label

  // Common patterns
  if (min === '*' && hour === '*') return 'Every minute'
  if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`
  if (hour.startsWith('*/') && min === '0') return `Every ${hour.slice(2)} hours`

  const formatHour = (h: string) => {
    const n = parseInt(h)
    if (isNaN(n)) return h
    if (n === 0) return '12:00 AM'
    if (n < 12) return `${n}:${min.padStart(2, '0')} AM`
    if (n === 12) return `12:${min.padStart(2, '0')} PM`
    return `${n - 12}:${min.padStart(2, '0')} PM`
  }

  const formatDow = (d: string) => {
    const days: Record<string, string> = {
      '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed',
      '4': 'Thu', '5': 'Fri', '6': 'Sat', '7': 'Sun',
    }
    if (d.includes('-')) {
      const [s, e] = d.split('-')
      return `${days[s] || s}–${days[e] || e}`
    }
    if (d.includes(',')) {
      return d.split(',').map(x => days[x] || x).join(', ')
    }
    return days[d] || d
  }

  // Multi-hour
  if (hour.includes(',') && dom === '*') {
    const hours = hour.split(',').map(formatHour).join(' & ')
    if (dow !== '*') return `${formatDow(dow)} at ${hours}`
    return `Daily at ${hours}`
  }

  // Specific time patterns
  if (dom === '1' && dow === '*') return `Monthly on the 1st at ${formatHour(hour)}`
  if (dow !== '*' && dom === '*') return `${formatDow(dow)} at ${formatHour(hour)}`
  if (dom === '*' && dow === '*') return `Daily at ${formatHour(hour)}`

  return cron
}

// ── Relative time ──────────────────────────────────────────────────────────

export function relativeTime(timestamp: string | undefined): string {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return timestamp
  
  const now = Date.now()
  const diff = now - date.getTime()
  const absDiff = Math.abs(diff)
  const future = diff < 0

  if (absDiff < 60_000) return future ? 'in a moment' : 'just now'
  if (absDiff < 3_600_000) {
    const m = Math.floor(absDiff / 60_000)
    return future ? `in ${m}m` : `${m}m ago`
  }
  if (absDiff < 86_400_000) {
    const h = Math.floor(absDiff / 3_600_000)
    return future ? `in ${h}h` : `${h}h ago`
  }
  const d = Math.floor(absDiff / 86_400_000)
  return future ? `in ${d}d` : `${d}d ago`
}

export function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return timestamp
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// ── Next run times for timeline ────────────────────────────────────────────

export function getNextRunTimes(cron: string, count: number = 24): Date[] {
  // Simple approximation for visualization — parse cron and project forward
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return []

  const [minField, hourField, , , dowField] = parts
  const results: Date[] = []
  const now = new Date()

  // Expand field to list of numbers
  const expandField = (field: string, max: number): number[] => {
    if (field === '*') return Array.from({ length: max }, (_, i) => i)
    if (field.startsWith('*/')) {
      const step = parseInt(field.slice(2))
      return Array.from({ length: Math.ceil(max / step) }, (_, i) => i * step)
    }
    if (field.includes(',')) return field.split(',').map(Number).filter(n => !isNaN(n))
    if (field.includes('-')) {
      const [s, e] = field.split('-').map(Number)
      return Array.from({ length: e - s + 1 }, (_, i) => s + i)
    }
    const n = parseInt(field)
    return isNaN(n) ? [] : [n]
  }

  const minutes = expandField(minField, 60)
  const hours = expandField(hourField, 24)
  const dows = dowField === '*' ? null : expandField(dowField, 8).map(d => d % 7)

  // Project forward from now for `count` occurrences
  const cursor = new Date(now)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  let safety = 0
  while (results.length < count && safety < 10080) { // max 7 days of minutes
    safety++
    if (
      hours.includes(cursor.getHours()) &&
      minutes.includes(cursor.getMinutes()) &&
      (dows === null || dows.includes(cursor.getDay()))
    ) {
      results.push(new Date(cursor))
    }
    cursor.setMinutes(cursor.getMinutes() + 1)
  }

  return results
}

// ── API calls ──────────────────────────────────────────────────────────────

async function invokeCron<T>(action: string, args: Record<string, unknown> = {}): Promise<T> {
  const gatewayUrl = getGatewayUrl()
  const gatewayToken = getGatewayToken()

  const response = await fetch(`${gatewayUrl}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gatewayToken}`,
    },
    body: JSON.stringify({ tool: 'cron', args: { action, ...args } }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  
  if (!data.ok && data.error) {
    throw new Error(data.error?.message || 'Unknown error')
  }

  // The response shape can vary — extract details or result
  return (data.result?.details ?? data.result ?? data) as T
}

export async function cronList(): Promise<CronJob[]> {
  const data = await invokeCron<{ jobs?: CronJob[] }>('list')
  return data.jobs || []
}

export async function cronAdd(job: {
  text: string
  schedule: string
  model?: string
  channel?: string
  enabled?: boolean
  thinking?: string
  thinkingBudget?: number
}): Promise<CronJob> {
  return invokeCron<CronJob>('add', { job })
}

export async function cronRemove(jobId: string): Promise<void> {
  await invokeCron('remove', { jobId })
}

export async function cronUpdate(jobId: string, patch: Partial<CronJob>): Promise<CronJob> {
  return invokeCron<CronJob>('update', { jobId, patch })
}

export async function cronRuns(jobId: string): Promise<CronRun[]> {
  const data = await invokeCron<{ runs?: CronRun[] }>('runs', { jobId })
  return data.runs || []
}

export async function cronRunNow(jobId: string): Promise<void> {
  await invokeCron('run', { jobId })
}
