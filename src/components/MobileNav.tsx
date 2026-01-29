import { motion } from 'framer-motion'
import {
  Activity,
  MessageCircle,
  Brain,
  CheckSquare,
  Settings,
} from 'lucide-react'

type View = 'dashboard' | 'chat' | 'channels' | 'people' | 'memory' | 'rhythms' | 'code' | 'tasks' | 'agents' | 'agent-mail' | 'settings'

interface MobileNavProps {
  activeView: View
  setActiveView: (view: View) => void
}

const navItems: { id: View; label: string; icon: typeof Activity }[] = [
  { id: 'dashboard', label: 'Bridge', icon: Activity },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function MobileNav({ activeView, setActiveView }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#12121a]/95 backdrop-blur-lg border-t border-[#1e1e2e] safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="relative flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] py-1.5"
            >
              {/* Active pill indicator */}
              {isActive && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute -top-1 w-8 h-[3px] rounded-full bg-[#8b5cf6]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              {/* Icon with glow */}
              <motion.div
                className={`relative p-1.5 rounded-xl ${isActive ? 'bg-[#8b5cf6]/15' : ''}`}
                animate={isActive ? { scale: 1 } : { scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Icon
                  className={`w-5 h-5 transition-colors duration-150 ${
                    isActive ? 'text-[#8b5cf6]' : 'text-[#52525b]'
                  }`}
                />
              </motion.div>

              {/* Label */}
              <span
                className={`text-[10px] mt-0.5 font-medium transition-colors duration-150 truncate ${
                  isActive ? 'text-[#8b5cf6]' : 'text-[#52525b]'
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
