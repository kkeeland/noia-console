/**
 * Command Palette (Cmd+K)
 *
 * INTEGRATION (App.tsx):
 *   1. Import: import CommandPalette from './components/CommandPalette'
 *   2. Pass your view setter so commands can navigate:
 *
 *      <CommandPalette onNavigate={(view) => setActiveView(view)} />
 *
 *   Place it as a sibling inside the root <div>, next to <ToastContainer />.
 *   The component registers its own Cmd+K listener globally.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  LayoutDashboard,
  MessageSquare,
  Brain,
  Timer,
  Code2,
  Bot,
  Settings,
  Zap,
  Send,
  Clock,
  Command,
} from 'lucide-react'
import { toast } from '../lib/notifications'

// ─── Types ───────────────────────────────────────────────

type View = 'dashboard' | 'chat' | 'memory' | 'rhythms' | 'code' | 'agents' | 'settings'

interface PaletteCommand {
  id: string
  label: string
  description: string
  icon: typeof Search
  category: 'navigate' | 'action'
  action: () => void
  keywords?: string[]
}

interface Props {
  onNavigate: (view: View) => void
}

// ─── Fuzzy match ─────────────────────────────────────────

function fuzzy(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(q)) return 60
  // subsequence score
  let qi = 0
  let score = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { qi++; score += 10 }
  }
  return qi === q.length ? score : 0
}

// ─── Recent commands (persisted to localStorage) ─────────

const RECENT_KEY = 'noia-palette-recent'
const MAX_RECENT = 5

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

function pushRecent(id: string) {
  const recent = getRecent().filter((r) => r !== id)
  recent.unshift(id)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

// ─── Component ───────────────────────────────────────────

export default function CommandPalette({ onNavigate }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build command list
  const commands: PaletteCommand[] = useMemo(() => [
    // Navigation
    { id: 'nav-dashboard', label: 'Dashboard', description: 'Go to dashboard overview', icon: LayoutDashboard, category: 'navigate', action: () => onNavigate('dashboard'), keywords: ['home', 'overview'] },
    { id: 'nav-chat', label: 'Chat', description: 'Open chat with Clawd', icon: MessageSquare, category: 'navigate', action: () => onNavigate('chat'), keywords: ['message', 'talk'] },
    { id: 'nav-memory', label: 'Memory', description: 'Browse memory & knowledge', icon: Brain, category: 'navigate', action: () => onNavigate('memory'), keywords: ['search', 'knowledge', 'recall'] },
    { id: 'nav-rhythms', label: 'Rhythms', description: 'Manage cron jobs & schedules', icon: Timer, category: 'navigate', action: () => onNavigate('rhythms'), keywords: ['cron', 'schedule', 'jobs'] },
    { id: 'nav-code', label: 'Code', description: 'View repositories & code', icon: Code2, category: 'navigate', action: () => onNavigate('code'), keywords: ['repo', 'git', 'repository'] },
    { id: 'nav-agents', label: 'Agents', description: 'Manage agent sessions', icon: Bot, category: 'navigate', action: () => onNavigate('agents'), keywords: ['session', 'spawn'] },
    { id: 'nav-settings', label: 'Settings', description: 'Configure Noia Console', icon: Settings, category: 'navigate', action: () => onNavigate('settings'), keywords: ['config', 'preferences'] },
    // Actions
    { id: 'act-search-memory', label: 'Search Memory', description: 'Full-text search through memories', icon: Search, category: 'action', action: () => { onNavigate('memory'); toast.info('Switched to Memory — use search above') }, keywords: ['find', 'recall', 'lookup'] },
    { id: 'act-send-message', label: 'Send Message', description: 'Quick-send a message to Clawd', icon: Send, category: 'action', action: () => { onNavigate('chat'); toast.info('Chat opened — type your message') }, keywords: ['chat', 'talk', 'dm'] },
    { id: 'act-spawn-agent', label: 'Spawn Agent', description: 'Launch a new agent session', icon: Zap, category: 'action', action: () => { onNavigate('agents'); toast.info('Navigate to Agents to spawn') }, keywords: ['launch', 'start', 'new session'] },
    { id: 'act-run-cron', label: 'Run Cron Job', description: 'Trigger a rhythm / cron job now', icon: Clock, category: 'action', action: () => { onNavigate('rhythms'); toast.info('Select a rhythm to run') }, keywords: ['schedule', 'trigger', 'execute'] },
  ], [onNavigate])

  // Filter & sort
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recent first, then all
      const recent = getRecent()
      const recentCmds = recent.map((id) => commands.find((c) => c.id === id)).filter(Boolean) as PaletteCommand[]
      const rest = commands.filter((c) => !recent.includes(c.id))
      return { recent: recentCmds, results: rest }
    }
    const scored = commands
      .map((c) => {
        const textBlob = `${c.label} ${c.description} ${(c.keywords || []).join(' ')}`
        const score = fuzzyScore(query, textBlob)
        return { cmd: c, score }
      })
      .filter((s) => s.score > 0 || fuzzy(query, `${s.cmd.label} ${s.cmd.description}`))
      .sort((a, b) => b.score - a.score)
      .map((s) => s.cmd)
    return { recent: [], results: scored }
  }, [query, commands])

  const allItems = useMemo(() => [...filtered.recent, ...filtered.results], [filtered.recent, filtered.results])

  // Helper: update query and reset selection together
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery)
    setSelectedIndex(0)
  }, [])

  // Global Cmd+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Reset and focus input on open
  const handleOpen = useCallback(() => {
    setQuery('')
    setSelectedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const prevOpenRef = useRef(open)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      handleOpen() // eslint-disable-line react-hooks/set-state-in-effect
    }
    prevOpenRef.current = open
  }, [open, handleOpen])

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const el = list.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Execute command
  const execute = useCallback((cmd: PaletteCommand) => {
    pushRecent(cmd.id)
    cmd.action()
    setOpen(false)
  }, [])

  // Keyboard nav inside palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && allItems[selectedIndex]) {
        e.preventDefault()
        execute(allItems[selectedIndex])
      }
    },
    [allItems, selectedIndex, execute]
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[560px]"
          >
            <div
              className="rounded-xl border border-[#1e1e2e] bg-[#0f0f1a]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
              onKeyDown={handleKeyDown}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e2e]">
                <Search size={18} className="text-[#71717a] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => updateQuery(e.target.value)}
                  placeholder="Type a command or search…"
                  className="flex-1 bg-transparent text-sm text-[#e4e4e7] placeholder:text-[#52525b] outline-none"
                />
                <kbd className="text-[10px] text-[#52525b] border border-[#27272a] rounded px-1.5 py-0.5 font-mono">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
                {allItems.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-[#52525b]">
                    No commands found
                  </div>
                )}

                {/* Recent section header */}
                {filtered.recent.length > 0 && (
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#52525b]">
                    Recent
                  </div>
                )}

                {filtered.recent.map((cmd, i) => (
                  <CommandRow
                    key={cmd.id}
                    cmd={cmd}
                    selected={selectedIndex === i}
                    onSelect={() => execute(cmd)}
                    onHover={() => setSelectedIndex(i)}
                  />
                ))}

                {/* All / Results header */}
                {filtered.results.length > 0 && (
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#52525b]">
                    {query.trim() ? 'Results' : 'Commands'}
                  </div>
                )}

                {filtered.results.map((cmd, i) => {
                  const idx = filtered.recent.length + i
                  return (
                    <CommandRow
                      key={cmd.id}
                      cmd={cmd}
                      selected={selectedIndex === idx}
                      onSelect={() => execute(cmd)}
                      onHover={() => setSelectedIndex(idx)}
                    />
                  )
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-[#1e1e2e] text-[10px] text-[#52525b]">
                <span className="flex items-center gap-1">
                  <kbd className="border border-[#27272a] rounded px-1 py-0.5 font-mono">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-[#27272a] rounded px-1 py-0.5 font-mono">↵</kbd>
                  select
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  <Command size={10} />
                  <kbd className="border border-[#27272a] rounded px-1 py-0.5 font-mono">K</kbd>
                  toggle
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Command Row ─────────────────────────────────────────

function CommandRow({
  cmd,
  selected,
  onSelect,
  onHover,
}: {
  cmd: PaletteCommand
  selected: boolean
  onSelect: () => void
  onHover: () => void
}) {
  const Icon = cmd.icon
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
        ${selected ? 'bg-[#8b5cf6]/15 text-[#e4e4e7]' : 'text-[#a1a1aa] hover:bg-[#1e1e2e]/60'}
      `}
    >
      <div
        className={`
          flex items-center justify-center w-8 h-8 rounded-lg shrink-0
          ${selected ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' : 'bg-[#1e1e2e] text-[#71717a]'}
        `}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{cmd.label}</div>
        <div className="text-xs text-[#52525b] truncate">{cmd.description}</div>
      </div>
      {cmd.category === 'navigate' && (
        <span className="text-[10px] text-[#52525b] border border-[#27272a] rounded px-1.5 py-0.5">
          view
        </span>
      )}
      {cmd.category === 'action' && (
        <span className="text-[10px] text-[#8b5cf6]/60 border border-[#8b5cf6]/20 rounded px-1.5 py-0.5">
          action
        </span>
      )}
    </button>
  )
}
