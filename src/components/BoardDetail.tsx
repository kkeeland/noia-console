import { motion } from 'framer-motion'
import { X, Check, Clock, User, Briefcase, Tag, FileText, MessageSquare } from 'lucide-react'
import type { BoardTask } from '../lib/board-data'
import { PRIORITY_CONFIG, timeInColumn } from '../lib/board-data'

interface BoardDetailProps {
  task: BoardTask
  onClose: () => void
  onApprove?: (taskId: string) => void
  onReject?: (taskId: string) => void
}

export default function BoardDetail({ task, onClose, onApprove, onReject }: BoardDetailProps) {
  const prio = PRIORITY_CONFIG[task.priority]
  const isNeedsYou = task.column === 'needs-you'

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-slate-900 border-l border-slate-700/50 z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${prio.color}20`, color: prio.color }}
                >
                  {prio.label}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {task.id}
                </span>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  {timeInColumn(task.enteredColumnAt)} in column
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-100 leading-snug">{task.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0 ml-4"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Expert info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/30">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: task.expert.color }}
            >
              {task.expert.initial}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">{task.expert.name}</p>
              <p className="text-xs text-slate-500">Expert · {task.business}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{task.description}</p>
          </div>

          {/* Work log */}
          {task.workLog && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expert&apos;s Work Log</h3>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/30">
                <p className="text-sm text-slate-300 leading-relaxed">{task.workLog}</p>
              </div>
            </div>
          )}

          {/* Approval details */}
          {task.approvalDetails && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Approval Required</h3>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-slate-300 leading-relaxed">{task.approvalDetails}</p>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500">Business:</span>
              <span className="text-xs text-violet-400 font-medium">{task.business}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500">Labels:</span>
              <div className="flex gap-1.5 flex-wrap">
                {task.labels.map((l) => (
                  <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        {isNeedsYou && (
          <div className="p-5 border-t border-slate-800 shrink-0 flex items-center gap-3">
            <button
              onClick={() => onApprove?.(task.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => onReject?.(task.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-red-600/80 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-white text-sm font-semibold transition-colors"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}
