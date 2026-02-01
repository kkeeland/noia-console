/**
 * The Briefing — Weekly/Daily intelligence rollup
 * Shows what the AI team accomplished and what needs attention
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Mail,
  FileDown,
  ChevronRight,
  Zap,
  DollarSign,
  Users,
  Lightbulb,
  Shield,
  X,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────

interface ExpertPerformance {
  id: string
  name: string
  role: string
  avatar: string
  color: string
  tasksCompleted: number
  highlight: string
  currentTask: string
  progress: number // 0-100
}

interface Decision {
  id: string
  date: string
  expert: string
  expertAvatar: string
  decision: string
  action: 'approved' | 'rejected' | 'pending'
  impact: string
  context?: string
}

interface Insight {
  id: string
  text: string
  type: 'warning' | 'positive' | 'neutral'
  icon: typeof TrendingUp
}

interface ActionItem {
  id: string
  type: 'approval' | 'stalled' | 'deadline'
  title: string
  expert: string
  urgency: 'high' | 'medium' | 'low'
  detail: string
  dueDate?: string
}

// ─── Mock Data ───────────────────────────────────────────

const experts: ExpertPerformance[] = [
  {
    id: 'sofia',
    name: 'Sofia Chen',
    role: 'Marketing Director',
    avatar: '👩‍💼',
    color: 'from-pink-500 to-rose-600',
    tasksCompleted: 11,
    highlight: 'Launched Q1 social media campaign across 4 platforms with 23% higher engagement than projected',
    currentTask: 'Analyzing competitor ad spend for February strategy',
    progress: 78,
  },
  {
    id: 'marcus',
    name: 'Marcus Rivera',
    role: 'Sales Manager',
    avatar: '👨‍💻',
    color: 'from-blue-500 to-indigo-600',
    tasksCompleted: 8,
    highlight: 'Closed partnership deal with Regional Distributors Inc. worth $24K/yr',
    currentTask: 'Building Q1 sales pipeline forecast',
    progress: 62,
  },
  {
    id: 'robert',
    name: 'Robert Kim',
    role: 'Operations Lead',
    avatar: '🧑‍🔧',
    color: 'from-emerald-500 to-teal-600',
    tasksCompleted: 9,
    highlight: 'Reduced fulfillment processing time by 18% through workflow automation',
    currentTask: 'Inventory audit for February restock',
    progress: 85,
  },
  {
    id: 'patricia',
    name: 'Patricia Owens',
    role: 'Finance Controller',
    avatar: '👩‍💼',
    color: 'from-amber-500 to-yellow-600',
    tasksCompleted: 6,
    highlight: 'Completed Q4 financial close 3 days ahead of schedule',
    currentTask: 'Preparing February cash flow projections',
    progress: 45,
  },
  {
    id: 'harold',
    name: 'Harold West',
    role: 'Legal & Compliance',
    avatar: '👨‍⚖️',
    color: 'from-slate-500 to-zinc-600',
    tasksCompleted: 4,
    highlight: 'Finalized updated Terms of Service and privacy policy refresh',
    currentTask: 'Reviewing vendor contract amendments',
    progress: 30,
  },
  {
    id: 'karen',
    name: 'Dr. Karen Liu',
    role: 'R&D Director',
    avatar: '👩‍🔬',
    color: 'from-violet-500 to-purple-600',
    tasksCompleted: 5,
    highlight: 'Published internal whitepaper on adaptogen bioavailability optimization',
    currentTask: 'Designing new product formulation trials',
    progress: 55,
  },
  {
    id: 'jessica',
    name: 'Jessica Torres',
    role: 'Customer Success',
    avatar: '👩‍🎤',
    color: 'from-cyan-500 to-sky-600',
    tasksCompleted: 4,
    highlight: 'Achieved 94% CSAT score — highest this quarter',
    currentTask: 'Building customer feedback synthesis report',
    progress: 70,
  },
]

const decisions: Decision[] = [
  {
    id: 'd1',
    date: 'Jan 31',
    expert: 'Sofia Chen',
    expertAvatar: '👩‍💼',
    decision: 'Increase Instagram ad budget by 40% for Super Bowl weekend',
    action: 'approved',
    impact: 'Projected +15% engagement',
    context: 'Sofia identified a window of lower CPM rates around Super Bowl weekend. Historical data shows 2.3x ROI during similar sports events for wellness brands.',
  },
  {
    id: 'd2',
    date: 'Jan 30',
    expert: 'Marcus Rivera',
    expertAvatar: '👨‍💻',
    decision: 'Offer 10% volume discount to Regional Distributors Inc.',
    action: 'approved',
    impact: '$24K annual deal secured',
    context: 'Marcus negotiated terms that maintain 62% margins while locking in a 12-month commitment. Competitor was offering 12% discount.',
  },
  {
    id: 'd3',
    date: 'Jan 30',
    expert: 'Patricia Owens',
    expertAvatar: '👩‍💼',
    decision: 'Reallocate $5K from events budget to digital marketing',
    action: 'pending',
    impact: 'Could boost Feb digital ROI by 20%',
    context: 'Q1 events calendar is light. Patricia recommends redirecting unused event funds to support Sofia\'s expanded digital campaign.',
  },
  {
    id: 'd4',
    date: 'Jan 29',
    expert: 'Robert Kim',
    expertAvatar: '🧑‍🔧',
    decision: 'Switch to 2-day shipping default for orders over $50',
    action: 'approved',
    impact: 'Est. 8% increase in AOV',
    context: 'Analysis of 3-month order data shows customers who receive orders in 2 days have 34% higher repeat purchase rate.',
  },
  {
    id: 'd5',
    date: 'Jan 29',
    expert: 'Dr. Karen Liu',
    expertAvatar: '👩‍🔬',
    decision: 'Proceed with ashwagandha + lion\'s mane combination study',
    action: 'pending',
    impact: 'New product line potential',
    context: 'Preliminary research suggests synergistic effects. Study requires $2K in materials and 6-week timeline.',
  },
  {
    id: 'd6',
    date: 'Jan 28',
    expert: 'Harold West',
    expertAvatar: '👨‍⚖️',
    decision: 'Update returns policy to 30-day window (from 14-day)',
    action: 'rejected',
    impact: 'Risk: +12% return rate',
    context: 'Harold flagged competitive pressure but projected return rate increase outweighs customer acquisition benefit at current margins.',
  },
  {
    id: 'd7',
    date: 'Jan 27',
    expert: 'Jessica Torres',
    expertAvatar: '👩‍🎤',
    decision: 'Launch customer loyalty rewards program pilot',
    action: 'approved',
    impact: 'Target: 15% repeat purchase lift',
    context: 'Jessica designed a points-based system modeled on successful DTC brands. Pilot targets top 200 customers first.',
  },
]

const insights: Insight[] = [
  {
    id: 'i1',
    text: 'Marketing spend is generating 3.2x ROI — well above the 2.0x target. Consider scaling budget.',
    type: 'positive',
    icon: TrendingUp,
  },
  {
    id: 'i2',
    text: 'Customer acquisition cost dropped 18% this month due to organic content strategy.',
    type: 'positive',
    icon: TrendingUp,
  },
  {
    id: 'i3',
    text: 'Inventory levels for top 3 SKUs are projected to deplete by Feb 15 — restock order needed.',
    type: 'warning',
    icon: AlertTriangle,
  },
  {
    id: 'i4',
    text: 'R&D pipeline has 2 products in trial phase — earliest launch window is Q2.',
    type: 'neutral',
    icon: Lightbulb,
  },
]

const actionItems: ActionItem[] = [
  {
    id: 'a1',
    type: 'approval',
    title: 'Approve budget reallocation: $5K events → digital',
    expert: 'Patricia Owens',
    urgency: 'high',
    detail: 'Patricia is waiting on this to finalize February budget. Sofia needs the funds by Feb 3.',
    dueDate: 'Feb 1',
  },
  {
    id: 'a2',
    type: 'approval',
    title: 'Approve ashwagandha + lion\'s mane study',
    expert: 'Dr. Karen Liu',
    urgency: 'medium',
    detail: 'Materials need to be ordered by Feb 5 to stay on schedule.',
    dueDate: 'Feb 5',
  },
  {
    id: 'a3',
    type: 'stalled',
    title: 'Vendor contract amendments — no progress in 72h',
    expert: 'Harold West',
    urgency: 'medium',
    detail: 'Harold is waiting on vendor response. May need escalation.',
  },
  {
    id: 'a4',
    type: 'deadline',
    title: 'Q1 sales pipeline forecast due',
    expert: 'Marcus Rivera',
    urgency: 'low',
    detail: 'Marcus is 62% complete. On track for Feb 3 deadline.',
    dueDate: 'Feb 3',
  },
]

// ─── Helper Components ───────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: typeof CheckCircle2 }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col items-center gap-1 p-4 rounded-xl bg-[#0a0a0f]/60 border border-[#1e1e2e]/60"
    >
      <Icon className={`w-5 h-5 mb-1 ${color}`} />
      <span className="text-2xl font-bold text-[#e4e4e7]">{value}</span>
      <span className="text-xs text-[#71717a] text-center">{label}</span>
    </motion.div>
  )
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden w-full">
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
      />
    </div>
  )
}

function ActionBadge({ urgency }: { urgency: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-green-500/10 text-green-400 border-green-500/20',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${styles[urgency]} uppercase font-medium`}>
      {urgency}
    </span>
  )
}

function DecisionStatusBadge({ action }: { action: 'approved' | 'rejected' | 'pending' }) {
  const styles = {
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
  }
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${styles[action]} font-medium capitalize`}>
      {action}
    </span>
  )
}

// ─── Section Components ──────────────────────────────────

function SectionHeader({ icon: Icon, title, color }: { icon: typeof BarChart3; title: string; color: string }) {
  return (
    <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-[#e4e4e7]">{title}</h3>
    </motion.div>
  )
}

function ExpertCard({ expert }: { expert: ExpertPerformance }) {
  return (
    <motion.div
      variants={fadeUp}
      className="min-w-[280px] max-w-[320px] flex-shrink-0 rounded-xl bg-[#12121a] border border-[#1e1e2e] p-4 hover:border-[#8b5cf6]/30 transition-colors"
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(139, 92, 246, 0.08)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${expert.color} flex items-center justify-center text-lg`}>
          {expert.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#e4e4e7] truncate">{expert.name}</p>
          <p className="text-xs text-[#71717a]">{expert.role}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-[#e4e4e7]">{expert.tasksCompleted}</p>
          <p className="text-[10px] text-[#52525b]">tasks</p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-xs text-[#52525b] uppercase tracking-wider mb-1">Top Achievement</p>
        <p className="text-xs text-[#a1a1aa] leading-relaxed line-clamp-2">{expert.highlight}</p>
      </div>

      <div className="mb-3">
        <p className="text-xs text-[#52525b] uppercase tracking-wider mb-1">Working On</p>
        <p className="text-xs text-[#71717a] truncate">{expert.currentTask}</p>
      </div>

      <div className="flex items-center gap-2">
        <ProgressBar value={expert.progress} color={expert.color} />
        <span className="text-[10px] text-[#52525b] font-mono w-8 text-right">{expert.progress}%</span>
      </div>
    </motion.div>
  )
}

function DecisionRow({ decision, onExpand }: { decision: Decision; onExpand: (id: string) => void }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`flex items-center gap-4 p-3 rounded-lg border transition-colors cursor-pointer ${
        decision.action === 'pending'
          ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
          : 'bg-[#0a0a0f]/40 border-[#1e1e2e]/60 hover:border-[#8b5cf6]/30'
      }`}
      onClick={() => onExpand(decision.id)}
      whileHover={{ x: 2 }}
    >
      <span className="text-lg flex-shrink-0">{decision.expertAvatar}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#e4e4e7] truncate">{decision.decision}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[#52525b]">{decision.date}</span>
          <span className="text-[10px] text-[#3f3f46]">·</span>
          <span className="text-[10px] text-[#52525b]">{decision.expert}</span>
          <span className="text-[10px] text-[#3f3f46]">·</span>
          <span className="text-[10px] text-[#71717a]">{decision.impact}</span>
        </div>
      </div>
      <DecisionStatusBadge action={decision.action} />
      <ChevronRight className="w-4 h-4 text-[#3f3f46] flex-shrink-0" />
    </motion.div>
  )
}

function DecisionDetail({ decision, onClose }: { decision: Decision; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-2xl bg-[#12121a] border border-[#1e1e2e] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 20 }}
        animate={{ y: 0 }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{decision.expertAvatar}</span>
            <div>
              <p className="text-sm font-semibold text-[#e4e4e7]">{decision.expert}</p>
              <p className="text-xs text-[#71717a]">{decision.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#1e1e2e] transition-colors">
            <X className="w-4 h-4 text-[#71717a]" />
          </button>
        </div>

        <h4 className="text-base font-medium text-[#e4e4e7] mb-2">{decision.decision}</h4>
        <div className="flex items-center gap-3 mb-4">
          <DecisionStatusBadge action={decision.action} />
          <span className="text-xs text-[#71717a]">Impact: {decision.impact}</span>
        </div>

        {decision.context && (
          <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]/60 mb-4">
            <p className="text-xs text-[#52525b] uppercase tracking-wider mb-1">Full Context</p>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">{decision.context}</p>
          </div>
        )}

        {decision.action === 'pending' && (
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors">
              Approve
            </button>
            <button className="flex-1 px-4 py-2 rounded-lg bg-[#1e1e2e] hover:bg-[#2a2a3e] text-[#a1a1aa] text-sm font-medium transition-colors">
              Reject
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function ActionItemCard({ item }: { item: ActionItem }) {
  const typeIcon = {
    approval: <Shield className="w-4 h-4 text-amber-400" />,
    stalled: <AlertTriangle className="w-4 h-4 text-red-400" />,
    deadline: <Clock className="w-4 h-4 text-blue-400" />,
  }

  return (
    <motion.div
      variants={fadeUp}
      className={`p-4 rounded-xl border transition-colors ${
        item.urgency === 'high'
          ? 'bg-red-500/5 border-red-500/20'
          : item.urgency === 'medium'
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-[#12121a] border-[#1e1e2e]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{typeIcon[item.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-[#e4e4e7]">{item.title}</p>
            <ActionBadge urgency={item.urgency} />
          </div>
          <p className="text-xs text-[#71717a] mb-2">{item.detail}</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#52525b]">{item.expert}</span>
            {item.dueDate && (
              <>
                <span className="text-[10px] text-[#3f3f46]">·</span>
                <span className="text-[10px] text-[#52525b]">Due {item.dueDate}</span>
              </>
            )}
          </div>
        </div>
        {item.type === 'approval' && (
          <button className="px-3 py-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-medium transition-colors flex-shrink-0">
            Approve
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────

export default function Briefing() {
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly')
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null)

  const selectedDecision = useMemo(
    () => decisions.find((d) => d.id === expandedDecision),
    [expandedDecision]
  )

  const totalTasks = experts.reduce((sum, e) => sum + e.tasksCompleted, 0)
  const pendingDecisions = decisions.filter((d) => d.action === 'pending').length

  // Date range for header
  const dateRange = viewMode === 'weekly'
    ? 'Jan 27 – Feb 1, 2026'
    : 'January 31, 2026'

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 pb-20">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#e4e4e7]">
                  {viewMode === 'weekly' ? 'Weekly' : 'Daily'} Briefing
                </h1>
                <p className="text-sm text-[#71717a] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {dateRange}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-[#12121a] border border-[#1e1e2e] rounded-lg p-0.5">
              {(['daily', 'weekly'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === mode
                      ? 'bg-[#8b5cf6] text-white shadow-sm'
                      : 'text-[#71717a] hover:text-[#e4e4e7]'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Export Buttons */}
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[#71717a] hover:text-[#e4e4e7] bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/30 transition-colors">
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Email</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[#71717a] hover:text-[#e4e4e7] bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/30 transition-colors">
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </motion.div>

        {/* ── Executive Summary ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border border-[#1e1e2e] p-6 mb-8"
        >
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6"
          >
            <StatCard label="Tasks Completed" value={String(totalTasks)} color="text-green-400" icon={CheckCircle2} />
            <StatCard label="Decisions Made" value="12" color="text-blue-400" icon={Zap} />
            <StatCard label="Pending Approvals" value={String(pendingDecisions)} color="text-amber-400" icon={AlertTriangle} />
            <StatCard label="Hours Saved" value="38h" color="text-purple-400" icon={Clock} />
            <StatCard label="Team Cost" value="$42" color="text-emerald-400" icon={DollarSign} />
          </motion.div>

          <div className="p-4 rounded-xl bg-[#0a0a0f]/60 border border-[#1e1e2e]/40">
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              This week your team focused on <span className="text-[#e4e4e7] font-medium">marketing campaign launches</span> and{' '}
              <span className="text-[#e4e4e7] font-medium">Q1 financial review</span>. Sofia's social media campaign exceeded projections
              by 23%, while Marcus closed a key distribution partnership. The team completed {totalTasks} tasks across all departments with
              an estimated 38 hours of work equivalent — at a total cost of just $42. Two decisions are awaiting your approval,
              including a budget reallocation that Patricia and Sofia are coordinating.
            </p>
          </div>
        </motion.div>

        {/* ── Expert Performance ── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <SectionHeader icon={Users} title="Expert Performance" color="from-[#8b5cf6] to-[#6d28d9]" />
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-[#1e1e2e] scrollbar-track-transparent"
          >
            {experts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </motion.div>
        </motion.section>

        {/* ── Decisions Log ── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <SectionHeader icon={Zap} title="Decisions Log" color="from-blue-500 to-indigo-600" />
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-2"
          >
            {decisions.map((decision) => (
              <DecisionRow
                key={decision.id}
                decision={decision}
                onExpand={setExpandedDecision}
              />
            ))}
          </motion.div>
        </motion.section>

        {/* ── Cross-Business Insights ── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <SectionHeader icon={Lightbulb} title="Insights & Intelligence" color="from-amber-500 to-yellow-600" />
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {insights.map((insight) => {
              const Icon = insight.icon
              const borderColor = {
                positive: 'border-green-500/20 bg-green-500/5',
                warning: 'border-amber-500/20 bg-amber-500/5',
                neutral: 'border-[#1e1e2e] bg-[#12121a]',
              }
              const iconColor = {
                positive: 'text-green-400',
                warning: 'text-amber-400',
                neutral: 'text-[#71717a]',
              }
              return (
                <motion.div
                  key={insight.id}
                  variants={fadeUp}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${borderColor[insight.type]}`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor[insight.type]}`} />
                  <p className="text-sm text-[#a1a1aa] leading-relaxed">{insight.text}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </motion.section>

        {/* ── Action Items ── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <SectionHeader icon={AlertTriangle} title="Action Items" color="from-red-500 to-orange-600" />
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            {actionItems.map((item) => (
              <ActionItemCard key={item.id} item={item} />
            ))}
          </motion.div>
        </motion.section>
      </div>

      {/* Decision Detail Modal */}
      <AnimatePresence>
        {selectedDecision && (
          <DecisionDetail
            decision={selectedDecision}
            onClose={() => setExpandedDecision(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
