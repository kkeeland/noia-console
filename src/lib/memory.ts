// Memory API helpers — wraps Clawdbot Gateway tool invocations
// Uses memory_search for semantic search, memory_get for file content, exec for noia-mem CLI

import { getGatewayUrl, getGatewayToken } from './config'

interface ToolInvokeResponse {
  ok: boolean
  result?: {
    content: Array<{ type: string; text?: string }>
    details: unknown
  }
  error?: {
    type: string
    message: string
  }
}

async function invokeTool(tool: string, args: Record<string, unknown> = {}): Promise<unknown> {
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

  const data: ToolInvokeResponse = await response.json()

  if (!data.ok || !data.result) {
    throw new Error(data.error?.message || 'Unknown error')
  }

  return data.result
}

// Extract text from tool result content blocks
function extractText(result: unknown): string {
  const r = result as { content?: Array<{ type: string; text?: string }> }
  if (r?.content) {
    return r.content
      .filter(c => c.type === 'text' && c.text)
      .map(c => c.text!)
      .join('\n')
  }
  return String(result)
}

// --- Semantic Search ---

export interface SearchResult {
  path: string
  startLine: number
  endLine: number
  score: number
  snippet: string
  source?: string
}

export interface SearchResponse {
  results: SearchResult[]
  provider?: string
  model?: string
  searchTimeMs: number
}

export async function searchMemory(query: string, maxResults = 10): Promise<SearchResponse> {
  const start = performance.now()
  try {
    const result = await invokeTool('memory_search', { query, maxResults })
    const searchTimeMs = Math.round(performance.now() - start)
    const details = (result as { details?: SearchResponse })?.details
    return {
      results: details?.results || [],
      provider: details?.provider,
      model: details?.model,
      searchTimeMs,
    }
  } catch {
    // Fallback to noia-mem CLI
    const start2 = performance.now()
    const text = await execNoiaMem(`search "${query.replace(/"/g, '\\"')}"`)
    const searchTimeMs = Math.round(performance.now() - start2)
    return {
      results: parseSearchResults(text),
      searchTimeMs,
    }
  }
}

function parseSearchResults(text: string): SearchResult[] {
  const results: SearchResult[] = []
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const match = line.match(/(\d+\.?\d*)%\s+(.+?):(\d+)-(\d+)/)
    if (match) {
      const score = parseFloat(match[1]) / 100
      const path = match[2].trim()
      const startLine = parseInt(match[3])
      const endLine = parseInt(match[4])
      let snippet = ''
      i++
      while (i < lines.length && !lines[i].match(/\d+\.?\d*%\s+/)) {
        if (lines[i].trim()) {
          snippet += (snippet ? '\n' : '') + lines[i].trim()
        }
        i++
      }
      results.push({ path, startLine, endLine, score, snippet })
      continue
    }
    i++
  }
  return results
}

// --- Memory Get (file content) ---

export async function getMemoryFile(path: string, from?: number, lines?: number): Promise<string> {
  try {
    const args: Record<string, unknown> = { path }
    if (from !== undefined) args.from = from
    if (lines !== undefined) args.lines = lines
    const result = await invokeTool('memory_get', args)
    return extractText(result)
  } catch {
    // Fallback: use exec to cat file
    const fullPath = path.startsWith('/') ? path : `~/clawd/${path}`
    const result = await invokeTool('exec', { command: `cat "${fullPath}"` })
    return extractText(result)
  }
}

// --- List Memory Directory ---

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
  size?: number
  modified?: string
}

export async function listMemoryFiles(dirPath = 'memory'): Promise<FileTreeNode[]> {
  try {
    const fullPath = dirPath.startsWith('/') ? dirPath : `~/clawd/${dirPath}`
    const result = await invokeTool('exec', {
      command: `find "${fullPath}" -maxdepth 4 -type f -o -type d | sort`,
    })
    const text = extractText(result)
    return parseFileTree(text, fullPath)
  } catch {
    return []
  }
}

function parseFileTree(text: string, basePath: string): FileTreeNode[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length === 0) return []

  // Normalize base path
  const base = basePath.replace(/^~\/clawd\//, '').replace(/\/$/, '')
  
  // Build a nested structure
  const root: Record<string, FileTreeNode> = {}
  
  for (const line of lines) {
    // Normalize the path
    let rel = line.trim()
    // Remove home directory prefix variations
    rel = rel.replace(/^\/Users\/[^/]+\/clawd\//, '')
    if (!rel.startsWith(base)) continue
    
    const relPath = rel.slice(base.length).replace(/^\//, '')
    if (!relPath) continue
    
    const parts = relPath.split('/')
    let current = root
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const fullRelPath = base + '/' + parts.slice(0, i + 1).join('/')
      const isLast = i === parts.length - 1
      const isFile = isLast && part.includes('.')
      
      if (!current[part]) {
        current[part] = {
          name: part,
          path: fullRelPath,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
        }
      }
      
      if (!isLast && current[part].children) {
        // Convert children array to object for building
        const childMap: Record<string, FileTreeNode> = {}
        for (const child of current[part].children!) {
          childMap[child.name] = child
        }
        current = childMap
        // We'll reconstruct children from the map
        const parentNode = root[parts[0]]
        if (parentNode) {
          // Navigate to correct parent and update children
        }
      }
    }
  }
  
  // Simpler approach: just build flat then nest
  return buildTreeFromPaths(lines, base)
}

function buildTreeFromPaths(lines: string[], base: string): FileTreeNode[] {
  const pathSet = new Set<string>()
  const dirSet = new Set<string>()
  
  for (const line of lines) {
    let rel = line.trim()
    rel = rel.replace(/^\/Users\/[^/]+\/clawd\//, '')
    if (!rel.startsWith(base)) continue
    const relPath = rel.slice(base.length).replace(/^\//, '')
    if (!relPath) continue
    
    pathSet.add(relPath)
    // Add all parent directories
    const parts = relPath.split('/')
    for (let i = 0; i < parts.length - 1; i++) {
      dirSet.add(parts.slice(0, i + 1).join('/'))
    }
  }
  
  // Find which paths are directories (appear as prefix of other paths)
  for (const p of pathSet) {
    for (const other of pathSet) {
      if (other !== p && other.startsWith(p + '/')) {
        dirSet.add(p)
        break
      }
    }
  }
  
  // Build tree from top-level items
  function getChildren(prefix: string): FileTreeNode[] {
    const children: Map<string, FileTreeNode> = new Map()
    
    for (const p of pathSet) {
      const rel = prefix ? (p.startsWith(prefix + '/') ? p.slice(prefix.length + 1) : null) : p
      if (rel === null) continue
      
      const firstPart = rel.split('/')[0]
      if (!firstPart) continue
      
      const fullPath = prefix ? `${prefix}/${firstPart}` : firstPart
      
      if (!children.has(firstPart)) {
        const isDir = dirSet.has(fullPath)
        children.set(firstPart, {
          name: firstPart,
          path: `${base}/${fullPath}`,
          type: isDir ? 'directory' : 'file',
          children: isDir ? getChildren(fullPath) : undefined,
        })
      }
    }
    
    // Sort: directories first, then alphabetical
    return Array.from(children.values()).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }
  
  return getChildren('')
}

// --- Exec helper ---

async function execNoiaMem(subcommand: string): Promise<string> {
  const result = await invokeTool('exec', {
    command: `cd ~/clawd/noia-memory && node cli.mjs ${subcommand}`,
  })
  return extractText(result)
}

// --- Timeline ---

export interface TimelineDay {
  date: string
  content: string
  file?: string
}

export async function getTimeline(date: string): Promise<TimelineDay[]> {
  // Try to fetch the daily note file directly
  try {
    const content = await getMemoryFile(`memory/daily/${date}.md`)
    if (content && content.trim() && !content.includes('No such file')) {
      return [{ date, content: content.trim(), file: `memory/daily/${date}.md` }]
    }
  } catch {
    // Fall through to CLI
  }
  const text = await execNoiaMem(`timeline ${date}`)
  return parseTimelineDays(text)
}

export async function getRecent(days = 7): Promise<TimelineDay[]> {
  // Try listing daily files and reading them
  try {
    const result = await invokeTool('exec', {
      command: `ls -1r ~/clawd/memory/daily/ 2>/dev/null | head -${days}`,
    })
    const text = extractText(result)
    const files = text.split('\n').filter(f => f.trim().endsWith('.md'))
    
    if (files.length > 0) {
      const dayPromises = files.map(async (file) => {
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/)
        if (!dateMatch) return null
        try {
          const content = await getMemoryFile(`memory/daily/${file.trim()}`, 1, 20)
          return {
            date: dateMatch[1],
            content: content.trim(),
            file: `memory/daily/${file.trim()}`,
          } as TimelineDay
        } catch {
          return null
        }
      })
      const results = await Promise.all(dayPromises)
      const valid = results.filter((d): d is TimelineDay => d !== null && d.content.length > 0)
      if (valid.length > 0) return valid
    }
  } catch {
    // Fall through
  }
  
  const text = await execNoiaMem(`recent ${days}`)
  return parseTimelineDays(text)
}

function parseTimelineDays(text: string): TimelineDay[] {
  const days: TimelineDay[] = []
  const sections = text.split(/─{20,}/)
  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed) continue
    const dateMatch = trimmed.match(/(\d{4}-\d{2}-\d{2})/)
    const fileMatch = trimmed.match(/\/Users\/[^\s]+\.md/)
    if (dateMatch) {
      const lines = trimmed.split('\n')
      const contentStart = lines.findIndex(l => l.match(/^\s{2}\S/))
      const content = contentStart >= 0
        ? lines.slice(contentStart).map(l => l.replace(/^\s{2}/, '')).join('\n').trim()
        : trimmed
      days.push({
        date: dateMatch[1],
        content,
        file: fileMatch?.[0],
      })
    }
  }
  return days
}

// --- Daily File Metadata (for heatmap) ---

export interface DailyFileMeta {
  date: string
  size: number       // bytes
  sections: number   // count of ## headings
}

export async function getDailyFileMetas(): Promise<DailyFileMeta[]> {
  try {
    // Get file listing with sizes
    const result = await invokeTool('exec', {
      command: `ls -la ~/clawd/memory/daily/*.md 2>/dev/null | awk '{print $5, $NF}'`,
    })
    const text = extractText(result)
    const lines = text.split('\n').filter(l => l.trim())
    
    const metas: DailyFileMeta[] = []
    
    for (const line of lines) {
      const match = line.match(/(\d+)\s+.*?(\d{4}-\d{2}-\d{2})\.md/)
      if (match) {
        metas.push({
          date: match[2],
          size: parseInt(match[1]),
          sections: 0, // will be enriched below
        })
      }
    }
    
    // Get section counts for each file (batch with grep)
    if (metas.length > 0) {
      try {
        const result2 = await invokeTool('exec', {
          command: `grep -c '^##' ~/clawd/memory/daily/*.md 2>/dev/null || true`,
        })
        const text2 = extractText(result2)
        for (const line of text2.split('\n')) {
          const m = line.match(/(\d{4}-\d{2}-\d{2})\.md:(\d+)/)
          if (m) {
            const meta = metas.find(d => d.date === m[1])
            if (meta) meta.sections = parseInt(m[2])
          }
        }
      } catch { /* section counts are optional */ }
    }
    
    return metas.sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

// --- Extract headers from daily content ---

export function extractHeaders(content: string): string[] {
  return content.split('\n')
    .filter(l => /^#{1,3}\s/.test(l))
    .map(l => l.replace(/^#{1,3}\s+/, '').trim())
    .filter(Boolean)
}

// --- Entities ---

export interface Entity {
  name: string
  type: string
  properties: Record<string, string>
  source: string
  firstSeen: string
  lastSeen: string
}

export async function getEntities(type?: string): Promise<Entity[]> {
  const text = await execNoiaMem('entities')
  return parseEntities(text, type)
}

function parseEntities(text: string, filterType?: string): Entity[] {
  const entities: Entity[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(/\[(\w+)\]\s+(.+?)\s+(\{.*\})/)
    if (match) {
      const type = match[1]
      const name = match[2]
      let properties: Record<string, string> = {}
      try {
        properties = JSON.parse(match[3])
      } catch { /* ignore */ }

      let source = ''
      let firstSeen = ''
      let lastSeen = ''
      if (i + 1 < lines.length) {
        const srcMatch = lines[i + 1].match(/source:\s*(.+?)\s*\|\s*first:\s*(.+?)\s*\|\s*last:\s*(.+)/)
        if (srcMatch) {
          source = srcMatch[1].trim()
          firstSeen = srcMatch[2].trim()
          lastSeen = srcMatch[3].trim()
        }
      }

      if (!filterType || type === filterType) {
        entities.push({ name, type, properties, source, firstSeen, lastSeen })
      }
    }
  }
  return entities
}

// --- Relations ---

export interface Relation {
  from: string
  to: string
  type: string
}

export async function getRelations(name?: string): Promise<Relation[]> {
  const cmd = name ? `relations "${name.replace(/"/g, '\\"')}"` : 'relations'
  const text = await execNoiaMem(cmd)
  const relations: Relation[] = []
  const lines = text.split('\n')
  for (const line of lines) {
    // Match format: "Kevin [person] --owns--> HelloSpore [project] {"role":"founder"}"
    const match = line.match(/^\s*(.+?)\s+\[\w+\]\s+--(\w+)-->\s+(.+?)\s+\[\w+\]/)
    if (match) {
      relations.push({ from: match[1].trim(), to: match[3].trim(), type: match[2] })
      continue
    }
    // Fallback: arrow format "Name → [type] → Name"
    const arrowMatch = line.match(/(.+?)\s+→\s+\[(\w+)\]\s+→\s+(.+)/)
    if (arrowMatch) {
      relations.push({ from: arrowMatch[1].trim(), to: arrowMatch[3].trim(), type: arrowMatch[2] })
    }
  }
  return relations
}

// --- Facts ---

export interface Fact {
  type: string
  text: string
  source: string
  line: number
  confidence: number
  tags: string[]
}

export async function getFacts(type?: string, search?: string): Promise<Fact[]> {
  let cmd = 'facts'
  if (type) cmd += ` --type ${type}`
  if (search) cmd += ` "${search.replace(/"/g, '\\"')}"`
  const text = await execNoiaMem(cmd)
  return parseFacts(text)
}

function parseFacts(text: string): Fact[] {
  const facts: Fact[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(/\[(\w+)\]\s+(.+)/)
    if (match) {
      const type = match[1]
      const factText = match[2]
      let source = ''
      let lineNum = 0
      let confidence = 0
      let tags: string[] = []
      if (i + 1 < lines.length) {
        const srcMatch = lines[i + 1].match(/(.+?):(\d+)\s*\|\s*(\d+)%\s*\|\s*(.*)/)
        if (srcMatch) {
          source = srcMatch[1].trim()
          lineNum = parseInt(srcMatch[2])
          confidence = parseInt(srcMatch[3]) / 100
          tags = srcMatch[4].split(',').map(t => t.trim()).filter(Boolean)
        }
      }
      facts.push({ type, text: factText, source, line: lineNum, confidence, tags })
    }
  }
  return facts
}

// --- Stats ---

export interface MemoryStats {
  chunks: number
  files: number
  vectors: number
  entities?: number
  facts?: number
  lastIndexed?: string
  totalSize?: string
}

export async function getStats(): Promise<MemoryStats> {
  const stats: MemoryStats = { chunks: 0, files: 0, vectors: 0 }
  
  // Get basic stats from CLI
  try {
    const text = await execNoiaMem('stats')
    const chunksMatch = text.match(/Chunks:\s*(\d+)/)
    const filesMatch = text.match(/Files:\s*(\d+)/)
    const vectorsMatch = text.match(/Vectors:\s*(\d+)/)
    if (chunksMatch) stats.chunks = parseInt(chunksMatch[1])
    if (filesMatch) stats.files = parseInt(filesMatch[1])
    if (vectorsMatch) stats.vectors = parseInt(vectorsMatch[1])
  } catch {
    // Try getting file count directly
    try {
      const result = await invokeTool('exec', {
        command: `find ~/clawd/memory -type f -name '*.md' 2>/dev/null | wc -l`,
      })
      const count = parseInt(extractText(result).trim())
      if (!isNaN(count)) stats.files = count
    } catch { /* ignore */ }
  }
  
  // Get total size
  try {
    const result = await invokeTool('exec', {
      command: `du -sh ~/clawd/memory 2>/dev/null | awk '{print $1}'`,
    })
    stats.totalSize = extractText(result).trim()
  } catch { /* ignore */ }
  
  // Get last modified time
  try {
    const result = await invokeTool('exec', {
      command: `find ~/clawd/memory -type f -name '*.md' -exec stat -f '%m %N' {} + 2>/dev/null | sort -rn | head -1 | awk '{print $1}'`,
    })
    const ts = parseInt(extractText(result).trim())
    if (!isNaN(ts)) {
      stats.lastIndexed = new Date(ts * 1000).toISOString()
    }
  } catch { /* ignore */ }
  
  return stats
}

// --- Search History (localStorage) ---

const SEARCH_HISTORY_KEY = 'noia-memory-search-history'
const MAX_HISTORY = 20

export interface SearchHistoryEntry {
  query: string
  resultCount: number
  timestamp: number
}

export function getSearchHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

export function addSearchHistory(query: string, resultCount: number): void {
  const history = getSearchHistory()
  // Remove duplicates
  const filtered = history.filter(h => h.query !== query)
  filtered.unshift({ query, resultCount, timestamp: Date.now() })
  // Trim
  while (filtered.length > MAX_HISTORY) filtered.pop()
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered))
}

export function clearSearchHistory(): void {
  localStorage.removeItem(SEARCH_HISTORY_KEY)
}
