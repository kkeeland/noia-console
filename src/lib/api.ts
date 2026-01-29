// Clawdbot Gateway API Client

import type { Session, Message } from '../types/clawdbot'
import { getGatewayUrl, getGatewayToken } from './config'
import { GatewayWS } from './gateway-ws'

export interface ConnectionTestResult {
  ok: boolean
  latencyMs?: number
  version?: string
  uptime?: string
  error?: string
}

// Test connection to a gateway (used by setup/settings before config is saved)
// Uses POST /tools/invoke with session_status since /health returns HTML
export async function testConnection(gatewayUrl: string, token: string): Promise<ConnectionTestResult> {
  const start = performance.now()
  try {
    const response = await fetch(`${gatewayUrl}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tool: 'session_status', args: {} }),
      signal: AbortSignal.timeout(10000),
    })
    const latencyMs = Math.round(performance.now() - start)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: 'Invalid token (unauthorized)', latencyMs }
      }
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}`, latencyMs }
    }

    let version: string | undefined
    let uptime: string | undefined
    try {
      const data = await response.json()
      // Extract version/uptime from the tools/invoke response
      const details = data.result?.details || {}
      version = details.version || details.v
      uptime = details.uptime
      // Also check text content for version info
      if (!version) {
        const text = data.result?.content
          ?.filter((c: { type: string }) => c.type === 'text')
          ?.map((c: { text: string }) => c.text)
          ?.join('\n') || ''
        const versionMatch = text.match(/version[:\s]+([^\s,]+)/i)
        if (versionMatch) version = versionMatch[1]
      }
    } catch {
      // Response might not be JSON — still means gateway is reachable
    }

    return { ok: true, latencyMs, version, uptime }
  } catch (e) {
    const latencyMs = Math.round(performance.now() - start)
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, error: 'Connection timed out (10s)', latencyMs }
    }
    if (e instanceof TypeError) {
      // Network error (CORS, DNS, refused, etc.)
      return { ok: false, error: 'Cannot reach gateway — check URL and network', latencyMs }
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error', latencyMs }
  }
}

interface ToolInvokeResponse<T> {
  ok: boolean
  result?: {
    content: Array<{ type: string; text?: string }>
    details: T
  }
  error?: {
    type: string
    message: string
  }
}

async function invokeTool<T>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
  const gatewayUrl = getGatewayUrl()
  const gatewayToken = getGatewayToken()

  const response = await fetch(`${gatewayUrl}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gatewayToken}`,
    },
    body: JSON.stringify({ tool, args }),
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }
  
  const data: ToolInvokeResponse<T> = await response.json()
  
  if (!data.ok || !data.result) {
    throw new Error(data.error?.message || 'Unknown error')
  }
  
  return data.result.details
}

export async function listSessions(limit = 50): Promise<Session[]> {
  const data = await invokeTool<{ sessions: Session[] }>('sessions_list', { limit })
  return data.sessions || []
}

export async function getSessionHistory(sessionKey: string, limit = 100, includeTools = false): Promise<Message[]> {
  const data = await invokeTool<{ messages: Message[] }>('sessions_history', { 
    sessionKey, 
    limit,
    includeTools 
  })
  return data.messages || []
}

export async function sendToSession(sessionKey: string, message: string): Promise<void> {
  // Prefer WebSocket when connected for real-time streaming
  const gw = GatewayWS.getInstance()
  if (gw.isConnected()) {
    await gw.chatSend(sessionKey, message)
    return
  }
  // Fall back to HTTP
  await invokeTool('sessions_send', { sessionKey, message })
}

export async function abortSession(sessionKey: string): Promise<void> {
  const gw = GatewayWS.getInstance()
  if (gw.isConnected()) {
    await gw.chatAbort(sessionKey)
    return
  }
  await invokeTool('sessions_abort', { sessionKey })
}

export async function injectToSession(sessionKey: string, role: string, content: string): Promise<void> {
  const gw = GatewayWS.getInstance()
  if (gw.isConnected()) {
    await gw.chatInject(sessionKey, role, content)
    return
  }
  await invokeTool('sessions_inject', { sessionKey, role, content })
}

// Extract text content from a message
export function getMessageText(message: Message): string {
  return message.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map(c => c.text)
    .join('\n')
}

// Check if message has thinking content
export function hasThinking(message: Message): boolean {
  return message.content.some(c => c.type === 'thinking')
}

// Get thinking content
export function getThinkingText(message: Message): string | null {
  const thinking = message.content.find((c): c is { type: 'thinking'; thinking: string } => c.type === 'thinking')
  return thinking?.thinking || null
}

// Format session display name
export function formatSessionName(session: Session): string {
  if (session.displayName) {
    // Clean up display names like "whatsapp:g-agent-main-main"
    const parts = session.displayName.split(':')
    if (parts.length > 1) {
      let name = parts[1]
      // Remove common prefixes
      name = name.replace(/^g-/, '')
      // Convert dashes to spaces and title case
      name = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      return name
    }
    return session.displayName
  }
  return session.key
}

// Get channel emoji
export function getChannelEmoji(channel: string): string {
  const emojis: Record<string, string> = {
    whatsapp: '📱',
    telegram: '✈️',
    discord: '🎮',
    signal: '🔒',
    imessage: '💬',
    webchat: '🌐',
    slack: '💼',
  }
  return emojis[channel?.toLowerCase()] || '💬'
}

// Format relative time
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}
