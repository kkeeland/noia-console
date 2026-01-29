import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Search, Calendar, Users, BarChart3, FolderTree } from 'lucide-react'
import MemorySearch from './MemorySearch'
import MemoryTimeline from './MemoryTimeline'
import MemoryEntities from './MemoryEntities'
import MemoryStats from './MemoryStats'
import MemoryFileBrowser from './MemoryFileBrowser'

type Tab = 'search' | 'timeline' | 'entities' | 'stats' | 'files'

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: 'search', label: 'Search', icon: Search },
  { key: 'timeline', label: 'Timeline', icon: Calendar },
  { key: 'entities', label: 'Entities', icon: Users },
  { key: 'files', label: 'Files', icon: FolderTree },
  { key: 'stats', label: 'Stats', icon: BarChart3 },
]

export default function Memory() {
  const [activeTab, setActiveTab] = useState<Tab>('search')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] px-6 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative">
            <Brain className="w-6 h-6 text-[#8b5cf6]" />
            <motion.div
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <h1 className="text-2xl font-bold text-[#e4e4e7]">Memory Palace</h1>
          <span className="text-xs text-[#525252] bg-[#1e1e2e] px-2 py-0.5 rounded-full ml-2">
            v2
          </span>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 relative">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`
                relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
                ${activeTab === key
                  ? 'text-[#8b5cf6]'
                  : 'text-[#71717a] hover:text-[#a1a1aa]'}
              `}
            >
              <Icon className="w-4 h-4" />
              {label}
              {activeTab === key && (
                <motion.div
                  layoutId="memory-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8b5cf6] rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeTab === 'search' && <MemorySearch />}
            {activeTab === 'timeline' && <MemoryTimeline />}
            {activeTab === 'entities' && <MemoryEntities />}
            {activeTab === 'stats' && <MemoryStats />}
            {activeTab === 'files' && <MemoryFileBrowser />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
