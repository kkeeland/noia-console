import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Github,
  Terminal,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react'
import type { UnifiedTask } from '../lib/tasks'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../lib/tasks'

type ColumnKey = 'ready' | 'in-progress' | 'done'

interface TaskCardProps {
  task: UnifiedTask
  index: number
  column: ColumnKey
  onClick: (task: UnifiedTask) => void
  onMove?: (taskId: string, toColumn: ColumnKey) => void
}

const COLUMN_ORDER: ColumnKey[] = ['ready', 'in-progress', 'done']

export default function TaskCard({ task, index, column, onClick, onMove }: TaskCardProps) {
  const [hovering, setHovering] = useState(false)
  const prioColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[3]
  const colIdx = COLUMN_ORDER.indexOf(column)
  const canMoveLeft = colIdx > 0
  const canMoveRight = colIdx < COLUMN_ORDER.length - 1

  const handleMoveLeft = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canMoveLeft) onMove?.(task.id, COLUMN_ORDER[colIdx - 1])
  }

  const handleMoveRight = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canMoveRight) onMove?.(task.id, COLUMN_ORDER[colIdx + 1])
  }

  return (
    <motion.div
      layout
      layoutId={task.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onClick(task)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group relative p-3 rounded-lg bg-[#16161e] border border-[#27272a] hover:border-[#8b5cf6]/30 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#8b5cf6]/5"
    >
      {/* Priority stripe */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
        style={{ backgroundColor: prioColor }}
      />

      {/* Top row: ID + source + priority */}
      <div className="flex items-center justify-between mb-1.5 pl-2">
        <span className="text-[11px] font-mono text-[#52525b]">{task.id}</span>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${prioColor}20`, color: prioColor }}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.source === 'github' ? (
            <Github className="w-3 h-3 text-[#52525b]" />
          ) : (
            <Terminal className="w-3 h-3 text-[#52525b]" />
          )}
        </div>
      </div>

      {/* Title */}
      <p className="text-sm text-[#e4e4e7] font-medium leading-snug mb-2 line-clamp-2 pl-2">
        {task.title}
      </p>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-2">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa]"
            >
              {label}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#27272a] text-[#52525b]">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* GitHub author */}
      {task.ghAuthor && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[#52525b] pl-2">
          <Github className="w-2.5 h-2.5" />
          {task.ghAuthor}
          {task.ghRepo && <span>· {task.ghRepo.split('/').pop()}</span>}
        </div>
      )}

      {/* Move buttons — appear on hover */}
      {hovering && onMove && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#0a0a0f] border border-[#27272a] rounded-full px-1.5 py-0.5 shadow-lg z-10"
        >
          {canMoveLeft && (
            <button
              onClick={handleMoveLeft}
              className="p-0.5 rounded-full text-[#71717a] hover:text-[#8b5cf6] hover:bg-[#8b5cf6]/10 transition-colors"
              title={`Move to ${COLUMN_ORDER[colIdx - 1]}`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {canMoveRight && column !== 'done' && (
            <button
              onClick={handleMoveRight}
              className="p-0.5 rounded-full text-[#71717a] hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
              title={`Move to ${COLUMN_ORDER[colIdx + 1]}`}
            >
              {colIdx + 1 === COLUMN_ORDER.length - 1 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
