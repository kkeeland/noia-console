// Task API helpers — Beads CLI + GitHub Issues unified
import { getGatewayUrl, getGatewayToken } from './config'
import { listIssues, type GitHubIssue } from './github'

// ── Types ──────────────────────────────────────────────

export type TaskSource = 'beads' | 'github'
export type TaskStatus = 'open' | 'closed' | 'ready' | 'in-progress'

export interface BeadsTask {
  id: string
  title: string
  priority: number // 0-3
  status: 'open' | 'closed'
  labels: string[]
  isReady: boolean
  description?: string
  dependsOn?: string[]
  blocks?: string[]
}

export interface UnifiedTask {
  id: string
  title: string
  priority: number
  status: TaskStatus
  labels: string[]
  source: TaskSource
  // Beads-specific
  isReady?: boolean
  description?: string
  dependsOn?: string[]
  blocks?: string[]
  // GitHub-specific
  ghNumber?: number
  ghUrl?: string
  ghAuthor?: string
  ghLabels?: Array<{ name: string; color: string }>
  ghRepo?: string
}

// ── Exec helper ────────────────────────────────────────

async function execCommand(command: string): Promise<string> {
  const gatewayUrl = getGatewayUrl()
  const gatewayToken = getGatewayToken()

  const response = await fetch(`${gatewayUrl}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gatewayToken}`,
    },
    body: JSON.stringify({ tool: 'exec', args: { command } }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  if (!data.ok) {
    throw new Error(data.error?.message || 'exec failed')
  }

  const text = data.result?.content
    ?.filter((c: { type: string }) => c.type === 'text')
    ?.map((c: { text: string }) => c.text)
    ?.join('\n') || ''

  return text.trim()
}

// ── Parsers ────────────────────────────────────────────

// Parse `bd list` output lines like:
// ○ noia-cw9 [● P0] [task] [console epic] - EPIC: Noia Console v2
// ✓ noia-jyj [P0] [task] [epic memory] - EPIC: Noia Memory Layer v2
function parseListLine(line: string): BeadsTask | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const isClosed = trimmed.startsWith('✓')
  
  // Extract ID
  const idMatch = trimmed.match(/\b(noia-[a-z0-9]+)\b/)
  if (!idMatch) return null
  const id = idMatch[1]

  // Extract priority — [● P0] or [P0]
  const prioMatch = trimmed.match(/\[●?\s*P(\d)\]/)
  const priority = prioMatch ? parseInt(prioMatch[1]) : 3

  // Extract labels — [label1] [label2] but skip [● Px] and [task]
  const labelMatches = [...trimmed.matchAll(/\[([^\]]+)\]/g)]
  const labels = labelMatches
    .map(m => m[1])
    .filter(l => !l.match(/^●?\s*P\d$/) && l !== 'task')
    .map(l => l.trim())

  // Extract title — everything after the last "] - "
  const titleMatch = trimmed.match(/\]\s*-\s*(.+)$/)
  const title = titleMatch ? titleMatch[1].trim() : id

  const isReady = false

  return {
    id,
    title,
    priority,
    status: isClosed ? 'closed' : 'open',
    labels,
    isReady,
  }
}

// Parse `bd ready` output
function parseReadyOutput(output: string): string[] {
  const ids: string[] = []
  for (const line of output.split('\n')) {
    const match = line.match(/\b(noia-[a-z0-9]+)\b/)
    if (match) ids.push(match[1])
  }
  return ids
}

// Parse `bd show` output
function parseShowOutput(output: string): Partial<BeadsTask> {
  const result: Partial<BeadsTask> = {}

  // Description
  const descMatch = output.match(/DESCRIPTION\n([\s\S]*?)(?=\n(?:LABELS|DEPENDS|BLOCKS|$))/)
  if (descMatch) result.description = descMatch[1].trim()

  // Labels
  const labelMatch = output.match(/LABELS:\s*(.+)/)
  if (labelMatch) result.labels = labelMatch[1].split(',').map(l => l.trim())

  // Dependencies
  const deps: string[] = []
  const depSection = output.match(/DEPENDS ON\n([\s\S]*?)(?=\n(?:BLOCKS|$)|$)/)
  if (depSection) {
    for (const line of depSection[1].split('\n')) {
      const m = line.match(/\b(noia-[a-z0-9]+)\b/)
      if (m) deps.push(m[1])
    }
  }
  if (deps.length) result.dependsOn = deps

  // Blocks
  const blockers: string[] = []
  const blockSection = output.match(/BLOCKS\n([\s\S]*?)(?=\n(?:DEPENDS|$)|$)/)
  if (blockSection) {
    for (const line of blockSection[1].split('\n')) {
      const m = line.match(/\b(noia-[a-z0-9]+)\b/)
      if (m) blockers.push(m[1])
    }
  }
  if (blockers.length) result.blocks = blockers

  return result
}

// ── Beads API ──────────────────────────────────────────

export async function listBeadsTasks(all = false): Promise<BeadsTask[]> {
  const cmd = all ? 'cd ~/clawd && bd list --all' : 'cd ~/clawd && bd list'
  const raw = await execCommand(cmd)
  const tasks: BeadsTask[] = []
  for (const line of raw.split('\n')) {
    const task = parseListLine(line)
    if (task) tasks.push(task)
  }
  return tasks
}

export async function getBeadsReady(): Promise<string[]> {
  const raw = await execCommand('cd ~/clawd && bd ready')
  return parseReadyOutput(raw)
}

export async function getBeadsTask(id: string): Promise<BeadsTask | null> {
  const raw = await execCommand(`cd ~/clawd && bd show ${id}`)
  if (!raw) return null

  // Parse the header line
  const headerTask = parseListLine(raw.split('\n')[0])
  if (!headerTask) {
    // Try to extract from show format: ○ noia-7q4 · Title   [● P1 · OPEN]
    const m = raw.match(/([○✓])\s+(noia-[a-z0-9]+)\s*·\s*(.+?)\s+\[●?\s*P(\d)\s*·\s*(\w+)\]/)
    if (!m) return null
    const task: BeadsTask = {
      id: m[2],
      title: m[3].trim(),
      priority: parseInt(m[4]),
      status: m[5].toLowerCase() === 'open' ? 'open' : 'closed',
      labels: [],
      isReady: false,
    }
    const details = parseShowOutput(raw)
    return { ...task, ...details, labels: details.labels || task.labels }
  }

  const details = parseShowOutput(raw)
  return { ...headerTask, ...details, labels: details.labels?.length ? details.labels : headerTask.labels }
}

export async function createBeadsTask(
  title: string,
  priority?: number,
  labels?: string[],
  description?: string
): Promise<string> {
  let cmd = `cd ~/clawd && bd create "${title.replace(/"/g, '\\"')}"`
  if (priority !== undefined) cmd += ` -p ${priority}`
  if (labels?.length) cmd += ` -l ${labels.join(',')}`
  if (description) cmd += ` --description="${description.replace(/"/g, '\\"')}"`

  const raw = await execCommand(cmd)
  const match = raw.match(/\b(noia-[a-z0-9]+)\b/)
  return match ? match[1] : raw
}

export async function closeBeadsTask(id: string): Promise<void> {
  await execCommand(`cd ~/clawd && bd close ${id}`)
}

// ── Move task between columns ──────────────────────────

export async function moveTaskStatus(id: string, newStatus: TaskStatus): Promise<void> {
  if (newStatus === 'closed') {
    await closeBeadsTask(id)
  }
  // For beads, we don't have a native "in-progress" state via CLI,
  // but we track it client-side. Could extend with labels or bd commands later.
}

// ── GitHub Issues wrapper ──────────────────────────────

export async function listGitHubIssues(repo: string): Promise<GitHubIssue[]> {
  return listIssues(repo)
}

// ── Unified task helpers ───────────────────────────────

export function beadsToUnified(task: BeadsTask): UnifiedTask {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.isReady ? 'ready' : task.status,
    labels: task.labels,
    source: 'beads',
    isReady: task.isReady,
    description: task.description,
    dependsOn: task.dependsOn,
    blocks: task.blocks,
  }
}

export function ghIssueToUnified(issue: GitHubIssue, repo: string): UnifiedTask {
  let priority = 3
  for (const l of issue.labels) {
    if (l.name.match(/p0|critical|urgent/i)) { priority = 0; break }
    if (l.name.match(/p1|high/i)) { priority = 1; break }
    if (l.name.match(/p2|medium/i)) { priority = 2; break }
  }

  return {
    id: `gh-${repo.split('/').pop()}-${issue.number}`,
    title: issue.title,
    priority,
    status: issue.state === 'OPEN' ? 'open' : 'closed',
    labels: issue.labels.map(l => l.name),
    source: 'github',
    ghNumber: issue.number,
    ghUrl: issue.url,
    ghAuthor: issue.author?.login,
    ghLabels: issue.labels,
    ghRepo: repo,
  }
}

export async function fetchAllTasks(repos?: string[]): Promise<UnifiedTask[]> {
  const tasks: UnifiedTask[] = []

  // Fetch beads tasks
  const [beadsTasks, readyIds] = await Promise.all([
    listBeadsTasks(true),
    getBeadsReady(),
  ])

  const readySet = new Set(readyIds)
  for (const t of beadsTasks) {
    t.isReady = readySet.has(t.id)
    tasks.push(beadsToUnified(t))
  }

  // Fetch GitHub issues for specified repos
  if (repos?.length) {
    const issueResults = await Promise.allSettled(
      repos.map(async (repo) => {
        const issues = await listGitHubIssues(repo)
        return issues.map(i => ghIssueToUnified(i, repo))
      })
    )
    for (const result of issueResults) {
      if (result.status === 'fulfilled') {
        tasks.push(...result.value)
      }
    }
  }

  return tasks
}

// ── Stats helpers ──────────────────────────────────────

export interface TaskStats {
  total: number
  open: number
  inProgress: number
  done: number
  completionPct: number
  byPriority: Record<number, number>
}

export function computeStats(tasks: UnifiedTask[]): TaskStats {
  const total = tasks.length
  const done = tasks.filter(t => t.status === 'closed').length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length
  const open = total - done - inProgress
  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0

  const byPriority: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
  for (const t of tasks) {
    if (t.status !== 'closed') {
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1
    }
  }

  return { total, open, inProgress, done, completionPct, byPriority }
}

// Priority helpers — P0=red, P1=orange, P2=blue, P3=gray
export const PRIORITY_COLORS: Record<number, string> = {
  0: '#ef4444',
  1: '#f97316',
  2: '#3b82f6',
  3: '#6b7280',
}

export const PRIORITY_LABELS: Record<number, string> = {
  0: 'P0',
  1: 'P1',
  2: 'P2',
  3: 'P3',
}

export const PRIORITY_NAMES: Record<number, string> = {
  0: 'Critical',
  1: 'High',
  2: 'Medium',
  3: 'Low',
}
