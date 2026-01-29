import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Loader2 } from 'lucide-react'
import { createBeadsTask, PRIORITY_COLORS } from '../lib/tasks'

interface CreateTaskProps {
  onClose: () => void
  onCreated?: (id: string) => void
}

export default function CreateTask({ onClose, onCreated }: CreateTaskProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(2)
  const [labels, setLabels] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setCreating(true)
    setError(null)
    try {
      const labelList = labels.split(',').map(l => l.trim()).filter(Boolean)
      const id = await createBeadsTask(title.trim(), priority, labelList.length ? labelList : undefined, description.trim() || undefined)
      onCreated?.(id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
      setCreating(false)
    }
  }

  const prioOptions = [
    { value: 0, label: 'P0 — Critical', short: 'P0', color: PRIORITY_COLORS[0] },
    { value: 1, label: 'P1 — High', short: 'P1', color: PRIORITY_COLORS[1] },
    { value: 2, label: 'P2 — Medium', short: 'P2', color: PRIORITY_COLORS[2] },
    { value: 3, label: 'P3 — Low', short: 'P3', color: PRIORITY_COLORS[3] },
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
        className="fixed inset-x-4 top-[15%] max-w-md mx-auto bg-[#0a0a0f] border border-[#27272a] rounded-xl shadow-2xl z-50"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
            <h2 className="text-lg font-bold text-[#e4e4e7]">New Task</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#16161e] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {prioOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`text-xs font-medium px-2 py-2 rounded-lg border transition-all ${
                      priority === opt.value
                        ? 'border-transparent'
                        : 'border-[#27272a] bg-[#16161e] text-[#71717a] hover:border-[#3f3f46]'
                    }`}
                    style={priority === opt.value ? { backgroundColor: `${opt.color}20`, color: opt.color, borderColor: `${opt.color}40` } : undefined}
                  >
                    {opt.short}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-[#3f3f46]">
                {prioOptions.find(o => o.value === priority)?.label}
              </p>
            </div>

            {/* Labels */}
            <div>
              <label className="block text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-1.5">
                Labels <span className="font-normal text-[#3f3f46]">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                placeholder="console, feature, ..."
                className="w-full px-3 py-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[#27272a] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-[#71717a] hover:text-[#e4e4e7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || creating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}
