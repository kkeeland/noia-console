// Agent API helpers — spawn, monitor, and interact with sub-agents
import { getGatewayUrl, getGatewayToken } from './config'

// --- Types ---

export interface AgentSession {
  key: string
  kind: string
  label: string
  displayName: string
  channel: string
  updatedAt: number
  sessionId: string
  model: string
  totalTokens: number
  messages: AgentMessage[]
  status: 'running' | 'completed' | 'failed' | 'waiting' | 'idle' | 'sleeping'
  agentId?: string
  parentKey?: string
  createdAt?: number
  messageCount?: number
}

export interface AgentMessageContent {
  type: 'text' | 'thinking' | 'toolCall' | 'toolResult'
  text?: string
  thinking?: string
  id?: string
  name?: string
  arguments?: Record<string, unknown>
  content?: string
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: AgentMessageContent[]
  timestamp?: number
}

export interface SpawnOptions {
  task: string
  label?: string
  model?: string
  repo?: string
  agentId?: string
  timeoutMinutes?: number
}

export interface SpawnResult {
  status: string
  childSessionKey: string
  runId: string
}

export interface AvailableAgent {
  id: string
  label?: string
  description?: string
}

// --- Helpers ---

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

  const data = await response.json()

  if (!data.ok || !data.result) {
    throw new Error(data.error?.message || 'Unknown error')
  }

  return data.result.details
}

// --- API Functions ---

export async function listSessions(opts: {
  limit?: number
  kinds?: string[]
  messageLimit?: number
} = {}): Promise<AgentSession[]> {
  const args: Record<string, unknown> = {}
  if (opts.limit) args.limit = opts.limit
  if (opts.kinds) args.kinds = opts.kinds
  if (opts.messageLimit !== undefined) args.messageLimit = opts.messageLimit

  const data = await invokeTool<{ sessions: AgentSession[] }>('sessions_list', args)
  const sessions = data.sessions || []

  return sessions.map((s) => ({
    ...s,
    status: inferStatus(s),
  }))
}

export async function listAgents(activeMinutes = 120): Promise<AgentSession[]> {
  const data = await invokeTool<{ sessions: AgentSession[] }>('sessions_list', {
    activeMinutes,
    messageLimit: 3,
  })

  const sessions = data.sessions || []

  return sessions
    .filter((s) => s.key.includes('subagent') || s.kind === 'subagent')
    .map((s) => ({
      ...s,
      status: inferStatus(s),
    }))
}

export async function listAllSessions(messageLimit = 2): Promise<AgentSession[]> {
  const data = await invokeTool<{ sessions: AgentSession[] }>('sessions_list', {
    limit: 100,
    messageLimit,
  })

  const sessions = data.sessions || []

  return sessions.map((s) => ({
    ...s,
    status: inferStatus(s),
  }))
}

function inferStatus(s: AgentSession): AgentSession['status'] {
  // If the session already has a meaningful status, respect it
  if (s.status === 'failed') return 'failed'

  const age = Date.now() - s.updatedAt
  if (age < 30_000) return 'running'
  if (age < 120_000) return 'idle'
  if (age < 300_000) return 'waiting'
  if (age < 900_000) return 'sleeping'
  return 'completed'
}

export async function listAvailableAgents(): Promise<AvailableAgent[]> {
  try {
    const data = await invokeTool<{ agents: string[] }>('agents_list', {})
    const agents = data.agents || []
    return agents.map((id) => ({
      id,
      label: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }))
  } catch {
    return []
  }
}

export async function spawnAgent(opts: SpawnOptions): Promise<SpawnResult> {
  let task = opts.task
  if (opts.repo) {
    task = `[Repo: ${opts.repo}] ${task}`
  }

  const args: Record<string, unknown> = { task }
  if (opts.label) args.label = opts.label
  if (opts.model) args.model = opts.model
  if (opts.agentId) args.agentId = opts.agentId
  if (opts.timeoutMinutes) args.timeoutMinutes = opts.timeoutMinutes

  return invokeTool<SpawnResult>('sessions_spawn', args)
}

export async function getAgentHistory(
  sessionKey: string,
  limit = 100,
  includeTools = true
): Promise<AgentMessage[]> {
  const data = await invokeTool<{ messages: AgentMessage[] }>('sessions_history', {
    sessionKey,
    limit,
    includeTools,
  })
  return data.messages || []
}

export async function sendToAgent(sessionKey: string, message: string): Promise<void> {
  await invokeTool('sessions_send', { sessionKey, message })
}

export async function abortAgent(sessionKey: string): Promise<void> {
  await invokeTool('sessions_abort', { sessionKey })
}

export async function getAgentStatus(sessionKey: string): Promise<AgentSession | null> {
  const agents = await listAgents(1440)
  return agents.find((a) => a.key === sessionKey) || null
}

// --- Formatting ---

export function formatRuntime(startMs: number): string {
  const diff = Date.now() - startMs
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return String(tokens)
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function extractTaskPreview(messages: AgentMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return 'No task description'
  const text = firstUser.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text || '')
    .join(' ')
  return text.slice(0, 200) || 'No task description'
}

export function extractLastMessage(messages: AgentMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'assistant') {
      const text = msg.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text || '')
        .join(' ')
      if (text) return text.slice(0, 120)
    }
  }
  return ''
}

export function getChannelIcon(channel: string): string {
  const icons: Record<string, string> = {
    whatsapp: '📱',
    telegram: '✈️',
    discord: '🎮',
    signal: '🔒',
    imessage: '💬',
    webchat: '🌐',
    slack: '💼',
    agent: '🤖',
    subagent: '🧬',
  }
  return icons[channel?.toLowerCase()] || '💬'
}

export function getSessionKindLabel(session: AgentSession): string {
  if (session.key.includes('subagent') || session.kind === 'subagent') return 'Sub-agent'
  if (session.kind === 'dm') return 'Direct'
  if (session.kind === 'group') return 'Group'
  return session.kind || 'Session'
}

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'anthropic/claude-opus-4-5', label: 'Claude Opus 4.5' },
  { id: 'anthropic/claude-haiku-3.5', label: 'Claude Haiku 3.5' },
]

export const QUICK_TEMPLATES = [
  { label: 'Fix CI', icon: '🔧', task: 'Fix the failing CI pipeline. Check the latest CI run, identify the error, and submit a fix.' },
  { label: 'Add Tests', icon: '🧪', task: 'Add comprehensive tests for the most recently changed files. Focus on edge cases and error handling.' },
  { label: 'Code Review', icon: '👀', task: 'Review the latest commits for code quality, potential bugs, and improvements. Create issues for anything found.' },
  { label: 'Refactor', icon: '♻️', task: 'Identify and refactor the most complex or duplicated code. Keep changes backward-compatible.' },
  { label: 'Research', icon: '🔍', task: 'Research the project structure, dependencies, and architecture. Write a summary document.' },
  { label: 'Update Deps', icon: '📦', task: 'Check for outdated dependencies, update them, and ensure everything still builds and tests pass.' },
]
