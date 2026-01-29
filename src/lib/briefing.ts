/**
 * Daily Briefing data fetchers
 * Uses Gateway's exec tool to run local commands and parse results
 */

import { getGatewayUrl, getGatewayToken } from './config'

// ─── Types ───────────────────────────────────────────────

export interface CalendarEvent {
  title: string
  start?: string
  end?: string
  location?: string
  allDay?: boolean
}

export interface WeatherData {
  temp_F: string
  temp_C: string
  condition: string
  humidity: string
  windSpeed: string
  feelsLike_F: string
  location: string
  icon: string
}

export interface TaskItem {
  id: string
  title: string
  priority?: number
  labels?: string[]
  status?: string
}

export interface MemoryHighlight {
  text: string
  source?: string
}

export interface BriefingData {
  calendar: { events: CalendarEvent[]; loading: boolean; error?: string }
  weather: { data: WeatherData | null; loading: boolean; error?: string }
  tasks: { items: TaskItem[]; loading: boolean; error?: string }
  memory: { highlight: MemoryHighlight | null; loading: boolean; error?: string }
}

// ─── Gateway exec helper ─────────────────────────────────

async function execCommand(command: string): Promise<string> {
  const url = getGatewayUrl()
  const token = getGatewayToken()

  const res = await fetch(`${url}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      tool: 'exec',
      args: { command },
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  // Extract text from tool response content blocks
  if (data.result?.content) {
    return data.result.content
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { text: string }) => c.text)
      .join('\n')
  }
  // Fallback: check for stdout in details
  if (data.result?.details?.stdout) {
    return data.result.details.stdout
  }
  return ''
}

// ─── Fetchers ────────────────────────────────────────────

export async function fetchCalendar(): Promise<CalendarEvent[]> {
  const raw = await execCommand(
    'accli list --from today --to tomorrow --json 2>/dev/null || echo "[]"'
  )
  try {
    const parsed = JSON.parse(raw.trim())
    if (Array.isArray(parsed)) {
      return parsed.map((e: Record<string, unknown>) => ({
        title: (e.title || e.summary || e.name || 'Untitled') as string,
        start: (e.start || e.startDate || e.startTime || '') as string,
        end: (e.end || e.endDate || e.endTime || '') as string,
        location: (e.location || '') as string,
        allDay: !!e.allDay,
      }))
    }
  } catch {
    // Try line-based parsing if not JSON
    const lines = raw.trim().split('\n').filter(Boolean)
    return lines.map((line) => ({ title: line.trim() }))
  }
  return []
}

export async function fetchWeather(): Promise<WeatherData | null> {
  const raw = await execCommand('curl -s "wttr.in/?format=j1" 2>/dev/null | head -c 2000')
  try {
    const data = JSON.parse(raw.trim())
    const current = data.current_condition?.[0]
    const area = data.nearest_area?.[0]
    if (!current) return null

    const condition = (current.weatherDesc?.[0]?.value || 'Unknown').toLowerCase()
    let icon = '☀️'
    if (condition.includes('cloud') || condition.includes('overcast')) icon = '☁️'
    else if (condition.includes('rain') || condition.includes('drizzle')) icon = '🌧️'
    else if (condition.includes('snow')) icon = '❄️'
    else if (condition.includes('thunder') || condition.includes('storm')) icon = '⛈️'
    else if (condition.includes('fog') || condition.includes('mist')) icon = '🌫️'
    else if (condition.includes('partly') || condition.includes('haze')) icon = '⛅'
    else if (condition.includes('clear') || condition.includes('sunny')) icon = '☀️'

    return {
      temp_F: current.temp_F || '--',
      temp_C: current.temp_C || '--',
      condition: current.weatherDesc?.[0]?.value || 'Unknown',
      humidity: current.humidity || '--',
      windSpeed: current.windspeedMiles || '--',
      feelsLike_F: current.FeelsLikeF || current.temp_F || '--',
      location: area ? `${area.areaName?.[0]?.value || ''}, ${area.region?.[0]?.value || ''}` : 'Unknown',
      icon,
    }
  } catch {
    return null
  }
}

export async function fetchTasks(): Promise<TaskItem[]> {
  const raw = await execCommand('cd ~/clawd && bd ready 2>/dev/null || echo ""')
  if (!raw.trim()) return []

  const lines = raw.trim().split('\n').filter(Boolean)
  return lines.map((line) => {
    // Parse bd ready output: "noia-abc  Title here  [label]  P1"
    const match = line.match(/^(\S+)\s+(.+?)(?:\s+\[(.+?)\])?(?:\s+P(\d))?$/i)
    if (match) {
      return {
        id: match[1],
        title: match[2].trim(),
        labels: match[3] ? match[3].split(',').map((l) => l.trim()) : undefined,
        priority: match[4] ? parseInt(match[4]) : undefined,
      }
    }
    // Fallback: just use the line
    const parts = line.trim().split(/\s{2,}/)
    return {
      id: parts[0] || line.trim().slice(0, 10),
      title: parts.slice(1).join(' ') || line.trim(),
    }
  })
}

export async function fetchMemoryHighlight(): Promise<MemoryHighlight | null> {
  const raw = await execCommand('~/bin/noia-mem recent 1 2>/dev/null || echo ""')
  if (!raw.trim()) return null
  return {
    text: raw.trim().slice(0, 500),
    source: 'noia-mem',
  }
}
