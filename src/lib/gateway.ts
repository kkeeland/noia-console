// Gateway configuration & status helpers
// Fetches real data from the Clawdbot gateway via /tools/invoke

import { getGatewayUrl, getGatewayToken } from './config'

// ---- Types ----

export interface GatewayConfig {
  model?: string
  defaultModel?: string
  channels?: Record<string, unknown>
  plugins?: string[]
  [key: string]: unknown
}

export interface ChannelStatus {
  name: string
  type: string
  connected: boolean
  details?: Record<string, unknown>
}

export interface GatewayStats {
  sessionCount: number
  uptime?: string
  version?: string
  totalTokens?: number
  activeChannels?: number
}

// ---- Internal fetch helper ----

async function gatewayInvoke<T = unknown>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
  const url = getGatewayUrl()
  const token = getGatewayToken()

  const res = await fetch(`${url}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ tool, args }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`Gateway error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  if (!data.ok && data.error) {
    throw new Error(data.error.message || 'Gateway tool invocation failed')
  }

  return data.result?.details ?? data.result ?? data
}

// ---- API Functions ----

/** Fetch gateway config via the gateway tool */
export async function fetchGatewayConfig(): Promise<GatewayConfig> {
  try {
    return await gatewayInvoke<GatewayConfig>('gateway', { action: 'config.get' })
  } catch (e) {
    console.warn('Failed to fetch gateway config:', e)
    throw e
  }
}

/** Set a config value on the gateway */
export async function setGatewayConfig(key: string, value: unknown): Promise<void> {
  await gatewayInvoke('gateway', { action: 'config.set', key, value })
}

/** Fetch health/stats from the gateway */
export async function fetchGatewayStats(): Promise<GatewayStats> {
  const url = getGatewayUrl()
  const token = getGatewayToken()

  const res = await fetch(`${url}/health`, {
    headers: { 'Authorization': `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)

  const data = await res.json()

  // Also try to get session count
  let sessionCount = 0
  try {
    const sessions = await gatewayInvoke<{ sessions: unknown[] }>('sessions_list', { limit: 200 })
    sessionCount = sessions.sessions?.length ?? 0
  } catch {
    // Not critical
  }

  return {
    sessionCount,
    uptime: data.uptime || undefined,
    version: data.version || data.v || undefined,
    totalTokens: data.totalTokens || undefined,
  }
}

/** Fetch connected channel statuses */
export async function fetchChannelStatuses(): Promise<ChannelStatus[]> {
  try {
    const config = await fetchGatewayConfig()
    // Gateway config typically lists channels under `channels` or `plugins`
    const channels: ChannelStatus[] = []
    const knownChannels = ['whatsapp', 'telegram', 'discord', 'signal', 'imessage', 'slack', 'webchat']

    if (config.channels && typeof config.channels === 'object') {
      for (const [name, detail] of Object.entries(config.channels)) {
        channels.push({
          name,
          type: name,
          connected: !!(detail as Record<string, unknown>)?.enabled,
          details: detail as Record<string, unknown>,
        })
      }
    }

    // If no channels from config, try to infer from plugins array
    if (channels.length === 0 && config.plugins && Array.isArray(config.plugins)) {
      for (const plugin of config.plugins) {
        const pluginName = typeof plugin === 'string' ? plugin : (plugin as Record<string, unknown>).name as string
        if (!pluginName) continue
        const lower = pluginName.toLowerCase()
        const match = knownChannels.find(c => lower.includes(c))
        if (match) {
          channels.push({ name: match, type: match, connected: true })
        }
      }
    }

    return channels
  } catch (e) {
    console.warn('Failed to fetch channel statuses:', e)
    return []
  }
}

/** Restart the gateway */
export async function restartGateway(): Promise<void> {
  await gatewayInvoke('gateway', { action: 'restart' })
}
