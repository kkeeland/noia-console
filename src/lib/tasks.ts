// Task API helpers — Beads CLI + GitHub Issues unified
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

// ── Data fetcher (local dev server endpoints) ──────────

interface BeadsJsonIssue {
  id: string
  title: string
  description?: string
  status: string
  priority: number
  issue_type?: string
  labels: string[]
  dependencies?: Array<{ depends_on_id: string; type: string }>
  created_at?: string
  closed_at?: string | null
}

async function fetchBeadsJson(): Promise<BeadsJsonIssue[]> {
  const res = await fetch('/data/beads-json')
  if (!res.ok) throw new Error(`Failed to fetch beads data: ${res.status}`)
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Failed to load beads data')
  return data.issues as BeadsJsonIssue[]
}

function jsonIssueToBeadsTask(issue: BeadsJsonIssue): BeadsTask {
  // Extract dependency IDs where this issue depends on something
  const dependsOn = issue.dependencies
    ?.filter((d) => d.type === 'blocks')
    ?.map((d) => d.depends_on_id) || []

  return {
    id: issue.id,
    title: issue.title,
    priority: issue.priority ?? 3,
    status: issue.status === 'open' ? 'open' : 'closed',
    labels: issue.labels || [],
    isReady: false,
    description: issue.description,
    dependsOn: dependsOn.length ? dependsOn : undefined,
  }
}

// ── Beads API ──────────────────────────────────────────

export async function listBeadsTasks(_all = false): Promise<BeadsTask[]> {
  const issues = await fetchBeadsJson()
  const tasks = issues.map(jsonIssueToBeadsTask)
  // If not showing all, filter to open only
  if (!_all) return tasks.filter((t) => t.status === 'open')
  return tasks
}

export async function getBeadsReady(): Promise<string[]> {
  // Compute "ready" from JSONL: open tasks with no unresolved dependencies
  const issues = await fetchBeadsJson()
  const closedIds = new Set(issues.filter((i) => i.status !== 'open').map((i) => i.id))
  const readyIds: string[] = []

  for (const issue of issues) {
    if (issue.status !== 'open') continue
    const deps = issue.dependencies?.filter((d) => d.type === 'blocks') || []
    const allDepsResolved = deps.every((d) => closedIds.has(d.depends_on_id))
    if (allDepsResolved) readyIds.push(issue.id)
  }
  return readyIds
}

export async function getBeadsTask(id: string): Promise<BeadsTask | null> {
  const issues = await fetchBeadsJson()
  const issue = issues.find((i) => i.id === id)
  if (!issue) return null
  return jsonIssueToBeadsTask(issue)
}

export async function createBeadsTask(
  _title: string,
  _priority?: number,
  _labels?: string[],
  _description?: string,
): Promise<string> {
  // Task creation requires CLI access — not available via local data endpoint.
  // TODO: add a /data/beads-create POST endpoint or use gateway sessions_send.
  throw new Error('Task creation not yet supported via local data endpoints')
}

export async function closeBeadsTask(_id: string): Promise<void> {
  // Task closing requires CLI access — not available via local data endpoint.
  // TODO: add a /data/beads-close POST endpoint or use gateway sessions_send.
  throw new Error('Task closing not yet supported via local data endpoints')
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
