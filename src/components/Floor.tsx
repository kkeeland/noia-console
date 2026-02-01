import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
  Check,
  X,
  Target,
  Users,
  Bell,
} from 'lucide-react'
import { getGatewayUrl } from '../lib/config'

// ─── Types ──────────────────────────────────────────────────────────

interface Persona {
  id: string
  company_id: string
  name: string
  role: string
  slug: string
  avatar_url: string | null
  status: string
  role_type: string
  personality_profile: {
    tone: string
    background: string
    expertise_areas: string[]
  }
}

interface Company {
  id: string
  name: string
  slug: string
}

type ExpertStatus = 'working' | 'waiting' | 'blocked' | 'idle'

interface ActivityEntry {
  id: string
  expertName: string
  expertSlug: string
  action: string
  timestamp: Date
  type: 'completed' | 'attention' | 'info' | 'blocked'
}

interface ActionItem {
  id: string
  expertName: string
  expertSlug: string
  title: string
  description: string
  priority: 0 | 1 | 2
  type: 'approval' | 'decision' | 'review'
}

// ─── Mock Data ──────────────────────────────────────────────────────

const MOCK_STATUSES: Record<string, ExpertStatus> = {
  'sofia-martinez': 'working',
  'marcus-chen': 'waiting',
  'robert-sterling': 'idle',
  'patricia-walsh': 'working',
  'harold-whitfield': 'idle',
  'dr-karen-liu': 'working',
  'jessica-park': 'idle',
}

const MOCK_ACTIVITIES: ActivityEntry[] = [
  {
    id: '1',
    expertName: 'Sofia Martinez',
    expertSlug: 'sofia-martinez',
    action: 'Drafted Q2 marketing plan with projected 40% reach increase',
    timestamp: new Date(Date.now() - 2 * 60000),
    type: 'completed',
  },
  {
    id: '2',
    expertName: 'Marcus Chen',
    expertSlug: 'marcus-chen',
    action: 'Flagged cash flow concern — distributor payment 15 days overdue',
    timestamp: new Date(Date.now() - 8 * 60000),
    type: 'attention',
  },
  {
    id: '3',
    expertName: 'Patricia Walsh',
    expertSlug: 'patricia-walsh',
    action: 'Needs approval: vendor contract for cold chain logistics partner',
    timestamp: new Date(Date.now() - 12 * 60000),
    type: 'attention',
  },
  {
    id: '4',
    expertName: 'Dr. Karen Liu',
    expertSlug: 'dr-karen-liu',
    action: 'Completed nano-emulsion stability test — batch 47 passed all metrics',
    timestamp: new Date(Date.now() - 25 * 60000),
    type: 'completed',
  },
  {
    id: '5',
    expertName: 'Harold Whitfield',
    expertSlug: 'harold-whitfield',
    action: 'Reviewing Minnesota hemp regulation updates for compliance impact',
    timestamp: new Date(Date.now() - 35 * 60000),
    type: 'info',
  },
  {
    id: '6',
    expertName: 'Robert Sterling',
    expertSlug: 'robert-sterling',
    action: 'Blocked: waiting on Q1 actuals from accounting to finalize forecast',
    timestamp: new Date(Date.now() - 45 * 60000),
    type: 'blocked',
  },
  {
    id: '7',
    expertName: 'Jessica Park',
    expertSlug: 'jessica-park',
    action: 'Published community recap post — 23 new members this week',
    timestamp: new Date(Date.now() - 55 * 60000),
    type: 'completed',
  },
  {
    id: '8',
    expertName: 'Sofia Martinez',
    expertSlug: 'sofia-martinez',
    action: 'Analyzed competitor Cann\'s latest campaign — insights shared in #marketing',
    timestamp: new Date(Date.now() - 70 * 60000),
    type: 'info',
  },
]

const MOCK_ACTIONS: ActionItem[] = [
  {
    id: 'a1',
    expertName: 'Patricia Walsh',
    expertSlug: 'patricia-walsh',
    title: 'Vendor Contract Approval',
    description: 'Cold chain logistics partner — 2-year agreement, $24K/yr. Patricia recommends approval.',
    priority: 0,
    type: 'approval',
  },
  {
    id: 'a2',
    expertName: 'Marcus Chen',
    expertSlug: 'marcus-chen',
    title: 'Distributor Payment Follow-up',
    description: 'Southwest Beverages invoice 15 days past due ($18,200). Escalate or extend grace period?',
    priority: 1,
    type: 'decision',
  },
  {
    id: 'a3',
    expertName: 'Sofia Martinez',
    expertSlug: 'sofia-martinez',
    title: 'Q2 Campaign Budget',
    description: 'Marketing plan requires $35K budget allocation. ROI projected at 3.2x based on Q1 data.',
    priority: 2,
    type: 'review',
  },
]

// ─── Helpers ────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2)
}

function getStatusColor(status: ExpertStatus) {
  switch (status) {
    case 'working': return 'bg-green-500'
    case 'waiting': return 'bg-amber-500'
    case 'blocked': return 'bg-red-500'
    case 'idle': return 'bg-zinc-500'
  }
}

function getStatusPulse(status: ExpertStatus) {
  return status === 'working' || status === 'waiting'
}

function getBorderColor(type: ActivityEntry['type']) {
  switch (type) {
    case 'completed': return 'border-l-green-500'
    case 'attention': return 'border-l-amber-500'
    case 'info': return 'border-l-blue-500'
    case 'blocked': return 'border-l-red-500'
  }
}

function getTypeIcon(type: ActivityEntry['type']) {
  switch (type) {
    case 'completed': return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
    case 'attention': return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
    case 'info': return <Info className="w-3.5 h-3.5 text-blue-500" />
    case 'blocked': return <XCircle className="w-3.5 h-3.5 text-red-500" />
  }
}

function getPriorityColor(priority: number) {
  switch (priority) {
    case 0: return 'border-red-500/50 bg-red-500/5'
    case 1: return 'border-amber-500/50 bg-amber-500/5'
    case 2: return 'border-green-500/50 bg-green-500/5'
    default: return 'border-zinc-700 bg-zinc-800/50'
  }
}

function getPriorityLabel(priority: number) {
  switch (priority) {
    case 0: return { text: 'P0', color: 'text-red-400 bg-red-500/10' }
    case 1: return { text: 'P1', color: 'text-amber-400 bg-amber-500/10' }
    case 2: return { text: 'P2', color: 'text-green-400 bg-green-500/10' }
    default: return { text: 'P3', color: 'text-zinc-400 bg-zinc-500/10' }
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Generate a consistent hue from a name string
function nameToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

// ─── Sub-Components ─────────────────────────────────────────────────

function ExpertAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const hue = nameToHue(name)
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  return (
    <div
      className={`${sizeClass} rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: `hsl(${hue}, 55%, 35%)` }}
    >
      {getInitials(name)}
    </div>
  )
}

function StatusDot({ status }: { status: ExpertStatus }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {getStatusPulse(status) && (
        <span className={`absolute inline-flex h-full w-full rounded-full ${getStatusColor(status)} opacity-40 animate-ping`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${getStatusColor(status)}`} />
    </span>
  )
}

// ─── Left Rail ──────────────────────────────────────────────────────

function LeftRail({
  companies,
  selectedCompany,
  setSelectedCompany,
  personas,
  selectedExpert,
  setSelectedExpert,
}: {
  companies: Company[]
  selectedCompany: string | null
  setSelectedCompany: (id: string) => void
  personas: Persona[]
  selectedExpert: string | null
  setSelectedExpert: (slug: string | null) => void
}) {
  return (
    <div className="w-full lg:w-[250px] flex-shrink-0 border-r border-[#1e1e2e] flex flex-col bg-[#0e0e16] overflow-hidden">
      {/* Business Selector */}
      <div className="p-3 border-b border-[#1e1e2e]">
        <div className="relative">
          <select
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full bg-[#1a1a28] text-[#e4e4e7] text-sm font-medium rounded-lg px-3 py-2 pr-8 border border-[#2a2a3e] focus:border-[#8b5cf6] focus:outline-none appearance-none cursor-pointer"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a] pointer-events-none" />
        </div>
      </div>

      {/* Expert Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1.5 flex items-center gap-2 text-[10px] text-[#52525b] uppercase tracking-wider font-medium">
          <Users className="w-3 h-3" />
          Expert Team ({personas.length})
        </div>
        {personas.map((persona) => {
          const expertStatus = MOCK_STATUSES[persona.slug] || 'idle'
          const isActive = selectedExpert === persona.slug
          return (
            <motion.button
              key={persona.id}
              onClick={() => setSelectedExpert(isActive ? null : persona.slug)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-[#8b5cf6]/10 border border-[#8b5cf6]/30'
                  : 'hover:bg-[#1a1a28] border border-transparent'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <ExpertAvatar name={persona.name} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[#e4e4e7] truncate">{persona.name}</div>
                <div className="text-[11px] text-[#71717a] truncate">{persona.role}</div>
              </div>
              <StatusDot status={expertStatus} />
            </motion.button>
          )
        })}
      </div>

      {/* Status Legend */}
      <div className="p-3 border-t border-[#1e1e2e]">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#52525b]">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Working</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Waiting</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Blocked</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Idle</span>
        </div>
      </div>
    </div>
  )
}

// ─── Center Stream ──────────────────────────────────────────────────

function ActivityStream({ activities }: { activities: ActivityEntry[] }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#1e1e2e] flex items-center gap-2">
        <Target className="w-4 h-4 text-[#8b5cf6]" />
        <h2 className="text-sm font-semibold text-[#e4e4e7]">Activity Stream</h2>
        <span className="text-[11px] text-[#52525b]">Live</span>
        <span className="relative flex h-2 w-2 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence initial={false}>
          {activities.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 20, height: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[#12121a] border-l-2 ${getBorderColor(entry.type)}`}
            >
              <ExpertAvatar name={entry.expertName} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-[#a1a1aa]">{entry.expertName}</span>
                  {getTypeIcon(entry.type)}
                </div>
                <p className="text-sm text-[#e4e4e7] leading-relaxed">{entry.action}</p>
              </div>
              <span className="text-[10px] text-[#52525b] flex-shrink-0 mt-0.5">{timeAgo(entry.timestamp)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Right Rail ─────────────────────────────────────────────────────

function ActionQueue({
  actions,
  onApprove,
  onReject,
}: {
  actions: ActionItem[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const sorted = useMemo(() => [...actions].sort((a, b) => a.priority - b.priority), [actions])
  const attentionCount = actions.length

  return (
    <div className="w-full lg:w-[300px] flex-shrink-0 border-l border-[#1e1e2e] flex flex-col bg-[#0e0e16] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center gap-2">
        <Bell className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-[#e4e4e7]">Needs Your Attention</h2>
        {attentionCount > 0 && (
          <span className="ml-auto min-w-[20px] h-5 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold flex items-center justify-center px-1.5">
            {attentionCount}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence>
          {sorted.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="text-3xl mb-2">🎯</div>
              <p className="text-sm text-[#71717a]">You're all caught up</p>
              <p className="text-[11px] text-[#52525b] mt-1">Nothing needs your attention right now</p>
            </motion.div>
          ) : (
            sorted.map((item) => {
              const pLabel = getPriorityLabel(item.priority)
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  className={`rounded-lg border p-3 ${getPriorityColor(item.priority)}`}
                >
                  <div className="flex items-start gap-2.5 mb-2">
                    <ExpertAvatar name={item.expertName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#e4e4e7] truncate">{item.title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pLabel.color}`}>
                          {pLabel.text}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#71717a] mt-0.5">{item.expertName}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#a1a1aa] leading-relaxed mb-3">{item.description}</p>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => onApprove(item.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600/20 text-green-400 text-xs font-medium hover:bg-green-600/30 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </motion.button>
                    <motion.button
                      onClick={() => onReject(item.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600/20 text-red-400 text-xs font-medium hover:bg-red-600/30 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </motion.button>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Expert Detail Panel ────────────────────────────────────────────

function ExpertDetail({ persona, onClose }: { persona: Persona; onClose: () => void }) {
  const status = MOCK_STATUSES[persona.slug] || 'idle'
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute inset-0 bg-[#0e0e16] z-20 flex flex-col overflow-hidden lg:relative lg:w-[350px] lg:border-l lg:border-[#1e1e2e]"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
        <h2 className="text-sm font-semibold text-[#e4e4e7]">Expert Detail</h2>
        <motion.button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#1a1a28] text-[#71717a] hover:text-[#e4e4e7]"
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <ExpertAvatar name={persona.name} />
          <div>
            <div className="text-base font-semibold text-[#e4e4e7]">{persona.name}</div>
            <div className="text-xs text-[#71717a]">{persona.role}</div>
          </div>
          <StatusDot status={status} />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1.5">Role Type</h3>
            <span className="text-xs text-[#a1a1aa] bg-[#1a1a28] px-2 py-1 rounded capitalize">{persona.role_type}</span>
          </div>

          <div>
            <h3 className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1.5">Tone</h3>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">{persona.personality_profile.tone}</p>
          </div>

          <div>
            <h3 className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1.5">Background</h3>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">{persona.personality_profile.background}</p>
          </div>

          <div>
            <h3 className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1.5">Expertise</h3>
            <div className="flex flex-wrap gap-1.5">
              {persona.personality_profile.expertise_areas.map((area) => (
                <span key={area} className="text-[10px] text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-full">
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Floor Component ───────────────────────────────────────────

export default function Floor() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [selectedExpert, setSelectedExpert] = useState<string | null>(null)
  const [activities] = useState<ActivityEntry[]>(MOCK_ACTIVITIES)
  const [actions, setActions] = useState<ActionItem[]>(MOCK_ACTIONS)
  const [loading, setLoading] = useState(true)

  // Derive the forge API base from gateway URL (same host, port 3100)
  const forgeBase = useMemo(() => {
    try {
      const gwUrl = getGatewayUrl()
      if (gwUrl) {
        const u = new URL(gwUrl)
        return `${u.protocol}//${u.hostname}:3100`
      }
    } catch { /* fallback */ }
    return 'http://localhost:3100'
  }, [])

  // Fetch companies
  useEffect(() => {
    fetch(`${forgeBase}/api/companies`)
      .then(r => r.json())
      .then((data: Company[]) => {
        setCompanies(data)
        if (data.length > 0 && !selectedCompany) {
          setSelectedCompany(data[0].id)
        }
      })
      .catch(err => console.error('Failed to fetch companies:', err))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forgeBase])

  // Fetch personas when company changes
  useEffect(() => {
    if (!selectedCompany) return
    fetch(`${forgeBase}/api/companies/${selectedCompany}/personas`)
      .then(r => r.json())
      .then((data: Persona[]) => setPersonas(data))
      .catch(err => console.error('Failed to fetch personas:', err))
  }, [forgeBase, selectedCompany])

  const selectedPersona = useMemo(
    () => personas.find(p => p.slug === selectedExpert) || null,
    [personas, selectedExpert]
  )

  const handleApprove = (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id))
  }

  const handleReject = (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id))
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Left Rail */}
      <LeftRail
        companies={companies}
        selectedCompany={selectedCompany}
        setSelectedCompany={setSelectedCompany}
        personas={personas}
        selectedExpert={selectedExpert}
        setSelectedExpert={setSelectedExpert}
      />

      {/* Center — Activity Stream */}
      <ActivityStream activities={activities} />

      {/* Right Rail — Action Queue (or Expert Detail when selected) */}
      <AnimatePresence mode="wait">
        {selectedPersona ? (
          <ExpertDetail
            key="detail"
            persona={selectedPersona}
            onClose={() => setSelectedExpert(null)}
          />
        ) : (
          <ActionQueue
            key="queue"
            actions={actions}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
