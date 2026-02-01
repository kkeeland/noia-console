import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Clock } from 'lucide-react'
import type { BoardTask, Priority } from '../lib/board-data'
import { PRIORITY_CONFIG, timeInColumn } from '../lib/board-data'

interface BoardCardProps {
  task: BoardTask
  index: number
  isNeedsYou?: boolean
  onClick: (task: BoardTask) => void
  onApprove?: (taskId: string) => void
  onReject?: (taskId: string) => void
}

const priorityDot: Record<Priority, string> = {
  0: 'bg-red-500',
  1: 'bg-amber-500',
  2: 'bg-green-500',
}

export default function BoardCard({ task, index, isNeedsYou, onClick, onApprove, onReject }: BoardCardProps) {
  const [hovering, setHovering] = useState(false)
  const prio = PRIORITY_CONFIG[task.priority]
  const isWorking = task.column === 'working'
  const isDone = task.column === 'done'

  return (
    <motion.div
      layout
      layoutId={task.id}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 400, damping: 30 }}
      onClick={() => onClick(task)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`
        group relative p-3.5 rounded-xl cursor-pointer transition-all duration-200
        ${isDone ? 'bg-slate-800/60 opacity-70' : 'bg-slate-800'}
        ${isNeedsYou
          ? 'border border-red-500/30 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-500/10'
          : 'border border-slate-700/50 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/8'
        }
        ${hovering && !isDone ? 'translate-y-[-2px]' : ''}
      `}
    >
      {/* Working pulse indicator */}
      {isWorking && (
        <div className="absolute top-3 right-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
        </div>
      )}

      {/* Top row: avatar + priority + time */}
      <div className="flex items-center gap-2.5 mb-2">
        {/* Expert avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
          style={{ backgroundColor: task.expert.color }}
          title={task.expert.name}
        >
          {task.expert.initial}
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Priority dot */}
          <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot[task.priority]}`} title={prio.label} />
          <span className="text-[10px] font-semibold" style={{ color: prio.color }}>
            {prio.label}
          </span>
        </div>

        {/* Time in column */}
        <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
          <Clock className="w-3 h-3" />
          {timeInColumn(task.enteredColumnAt)}
        </div>
      </div>

      {/* Title */}
      <p className={`text-sm font-semibold leading-snug mb-2 line-clamp-2 ${isDone ? 'text-slate-400' : 'text-slate-100'}`}>
        {task.title}
      </p>

      {/* Business label + tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">
          {task.business}
        </span>
        {task.labels.slice(0, 2).map((label) => (
          <span
            key={label}
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-400"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Expert name */}
      <div className="mt-2 text-[10px] text-slate-500">
        {task.expert.name}
      </div>

      {/* Needs You: inline approve/reject */}
      {isNeedsYou && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onApprove?.(task.id) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/25 hover:border-green-500/50 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            Approve
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReject?.(task.id) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/25 hover:border-red-500/50 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      )}
    </motion.div>
  )
}
