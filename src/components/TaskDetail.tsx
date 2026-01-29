import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  ExternalLink,
  Github,
  Terminal,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Circle,
  Zap,
  Play,
} from 'lucide-react'
import type { UnifiedTask, TaskStatus } from '../lib/tasks'
import { PRIORITY_COLORS, PRIORITY_LABELS, PRIORITY_NAMES, closeBeadsTask } from '../lib/tasks'

interface TaskDetailProps {
  task: UnifiedTask
  onClose: () => void
  onTaskClosed?: (id: string) => void
  onStatusChange?: (id: string, status: TaskStatus) => void
}

export default function TaskDetail({ task, onClose, onTaskClosed, onStatusChange }: TaskDetailProps) {
  const [closing, setClosing] = useState(false)
  const prioColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[3]

  const handleClose = async () => {
    if (task.source !== 'beads') return
    setClosing(true)
    try {
      await closeBeadsTask(task.id)
      onTaskClosed?.(task.id)
      onClose()
    } catch (e) {
      console.error('Failed to close task:', e)
      setClosing(false)
    }
  }

  const handleStatusChange = (status: TaskStatus) => {
    onStatusChange?.(task.id, status)
  }

  const statusOptions: { status: TaskStatus; label: string; icon: typeof Circle; color: string }[] = [
    { status: 'open', label: 'Open', icon: Zap, color: '#8b5cf6' },
    { status: 'in-progress', label: 'In Progress', icon: Play, color: '#f97316' },
    { status: 'closed', label: 'Done', icon: CheckCircle2, color: '#22c55e' },
  ]

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-4 top-[10%] max-w-lg mx-auto bg-[#0a0a0f] border border-[#27272a] rounded-xl shadow-2xl z-50 max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-[#52525b]">{task.id}</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${prioColor}20`, color: prioColor }}
                >
                  {PRIORITY_LABELS[task.priority]} · {PRIORITY_NAMES[task.priority]}
                </span>
                {task.source === 'github' ? (
                  <Github className="w-3.5 h-3.5 text-[#52525b]" />
                ) : (
                  <Terminal className="w-3.5 h-3.5 text-[#52525b]" />
                )}
              </div>
              <h2 className="text-lg font-bold text-[#e4e4e7] leading-snug">{task.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#16161e] transition-colors shrink-0 ml-3"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status switcher */}
          <div>
            <h3 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-2">Status</h3>
            <div className="flex items-center gap-2">
              {statusOptions.map((opt) => {
                const Icon = opt.icon
                const isActive =
                  (opt.status === 'open' && (task.status === 'open' || task.status === 'ready')) ||
                  opt.status === task.status
                return (
                  <button
                    key={opt.status}
                    onClick={() => handleStatusChange(opt.status === 'open' ? (task.isReady ? 'ready' : 'open') : opt.status)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      isActive
                        ? 'border-transparent'
                        : 'border-[#27272a] bg-[#16161e] text-[#71717a] hover:border-[#3f3f46]'
                    }`}
                    style={isActive ? { backgroundColor: `${opt.color}15`, color: opt.color, borderColor: `${opt.color}30` } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Labels */}
          {task.labels.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-2">Labels</h3>
              <div className="flex flex-wrap gap-1.5">
                {task.labels.map((label) => (
                  <span
                    key={label}
                    className="text-xs px-2 py-1 rounded-full bg-[#27272a] text-[#a1a1aa]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* GitHub-specific labels with colors */}
          {task.ghLabels && task.ghLabels.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-2">GitHub Labels</h3>
              <div className="flex flex-wrap gap-1.5">
                {task.ghLabels.map((l) => (
                  <span
                    key={l.name}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: `#${l.color}20`, color: `#${l.color}` }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {task.dependsOn && task.dependsOn.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-2">
                <ArrowRight className="w-3 h-3 inline mr-1" />
                Depends on
              </h3>
              <div className="space-y-1">
                {task.dependsOn.map((depId) => (
                  <div key={depId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16161e] border border-[#27272a]">
                    <span className="text-xs font-mono text-[#8b5cf6]">{depId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.blocks && task.blocks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-2">
                <ArrowLeft className="w-3 h-3 inline mr-1" />
                Blocks
              </h3>
              <div className="space-y-1">
                {task.blocks.map((blockId) => (
                  <div key={blockId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16161e] border border-[#27272a]">
                    <span className="text-xs font-mono text-[#f97316]">{blockId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GitHub info */}
          {task.ghAuthor && (
            <div>
              <h3 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-2">Author</h3>
              <p className="text-sm text-[#a1a1aa]">{task.ghAuthor}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#27272a] shrink-0 flex items-center gap-3">
          {task.source === 'beads' && task.status !== 'closed' && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {closing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Close Task
            </button>
          )}
          {task.ghUrl && (
            <a
              href={task.ghUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16161e] border border-[#27272a] text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#8b5cf6]/30 text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in GitHub
            </a>
          )}
        </div>
      </motion.div>
    </>
  )
}
