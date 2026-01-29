// GitHub API helpers — all via Clawdbot Gateway exec tool
import { getGatewayUrl, getGatewayToken } from './config'

export interface GitHubRepo {
  name: string
  nameWithOwner: string
  url: string
  description: string
  isPrivate: boolean
  updatedAt: string
  stargazerCount: number
  primaryLanguage: { name: string } | null
  openIssues: { totalCount: number }
  openPRs: { totalCount: number }
  defaultBranchRef?: { name: string }
}

export interface GitHubIssue {
  number: number
  title: string
  state: string
  createdAt: string
  updatedAt: string
  author: { login: string }
  labels: Array<{ name: string; color: string }>
  url: string
}

export interface GitHubPR {
  number: number
  title: string
  state: string
  createdAt: string
  updatedAt: string
  author: { login: string }
  headRefName: string
  isDraft: boolean
  url: string
}

export interface GitHubCommit {
  oid: string
  messageHeadline: string
  committedDate: string
  authors: Array<{ name: string }>
}

export interface RepoDetails {
  name: string
  nameWithOwner: string
  description: string
  url: string
  isPrivate: boolean
  stargazerCount: number
  forkCount: number
  primaryLanguage: { name: string } | null
  defaultBranchRef: { name: string }
  updatedAt: string
  createdAt: string
  homepageUrl: string
  readme: string | null
}

// Low-level exec invocation via gateway
async function execCommand(command: string): Promise<string> {
  const gatewayUrl = getGatewayUrl()
  const gatewayToken = getGatewayToken()

  const response = await fetch(`${gatewayUrl}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gatewayToken}`,
    },
    body: JSON.stringify({
      tool: 'exec',
      args: { command },
    }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  if (!data.ok) {
    throw new Error(data.error?.message || 'exec failed')
  }

  // Extract text from result content
  const text = data.result?.content
    ?.filter((c: { type: string }) => c.type === 'text')
    ?.map((c: { text: string }) => c.text)
    ?.join('\n') || ''

  return text.trim()
}

export async function listRepos(): Promise<GitHubRepo[]> {
  const raw = await execCommand(
    'gh repo list --json name,nameWithOwner,url,description,isPrivate,updatedAt,stargazerCount,primaryLanguage,defaultBranchRef --limit 50 --no-archived'
  )
  try {
    const repos: GitHubRepo[] = JSON.parse(raw)
    // Sort by updatedAt descending
    repos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    return repos
  } catch {
    console.error('[github] Failed to parse repos:', raw)
    return []
  }
}

export async function getRepoDetails(nameWithOwner: string): Promise<RepoDetails | null> {
  const raw = await execCommand(
    `gh repo view ${nameWithOwner} --json name,nameWithOwner,description,url,isPrivate,stargazerCount,forkCount,primaryLanguage,defaultBranchRef,updatedAt,createdAt,homepageUrl`
  )
  try {
    const details = JSON.parse(raw) as RepoDetails

    // Try to get README
    try {
      const readme = await execCommand(
        `gh api repos/${nameWithOwner}/readme --jq '.content' 2>/dev/null | base64 -d 2>/dev/null || echo ""`
      )
      details.readme = readme || null
    } catch {
      details.readme = null
    }

    return details
  } catch {
    console.error('[github] Failed to parse repo details:', raw)
    return null
  }
}

export async function listIssues(nameWithOwner: string): Promise<GitHubIssue[]> {
  const raw = await execCommand(
    `gh issue list -R ${nameWithOwner} --json number,title,state,createdAt,updatedAt,author,labels,url --limit 20`
  )
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function listPRs(nameWithOwner: string): Promise<GitHubPR[]> {
  const raw = await execCommand(
    `gh pr list -R ${nameWithOwner} --json number,title,state,createdAt,updatedAt,author,headRefName,isDraft,url --limit 20`
  )
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function listRecentCommits(nameWithOwner: string, limit = 10): Promise<GitHubCommit[]> {
  const raw = await execCommand(
    `gh api repos/${nameWithOwner}/commits?per_page=${limit} --jq '[.[] | {oid: .sha[0:7], messageHeadline: (.commit.message | split("\\n")[0]), committedDate: .commit.committer.date, authors: [{name: .commit.author.name}]}]'`
  )
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// Format relative time
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then

  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  if (diff < 2592000000) return `${Math.floor(diff / 604800000)}w ago`
  return new Date(dateStr).toLocaleDateString()
}

// Language color mapping
const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  Ruby: '#701516',
  Swift: '#F05138',
  'C++': '#f34b7d',
  C: '#555555',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Lua: '#000080',
  Dart: '#00B4AB',
  Kotlin: '#A97BFF',
  PHP: '#4F5D95',
}

export function getLanguageColor(lang: string | null | undefined): string {
  if (!lang) return '#71717a'
  return LANG_COLORS[lang] || '#71717a'
}
