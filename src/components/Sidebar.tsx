import { motion } from 'framer-motion'
import { 
  Target, 
  MessageCircle, 
  Brain, 
  Clock, 
  Settings,
  Activity
} from 'lucide-react'

type View = 'dashboard' | 'chat' | 'memory' | 'rhythms' | 'settings'

interface SidebarProps {
  activeView: View
  setActiveView: (view: View) => void
  isOnline: boolean
}

const navItems = [
  { id: 'dashboard', label: 'Bridge', icon: Activity },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'rhythms', label: 'Rhythms', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

export default function Sidebar({ activeView, setActiveView, isOnline }: SidebarProps) {
  return (
    <aside className="w-20 lg:w-64 h-full bg-[#12121a] border-r border-[#1e1e2e] flex flex-col">
      {/* Logo / Brand */}
      <div className="p-4 lg:p-6 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          {/* Online indicator */}
          <motion.div 
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#12121a] ${isOnline ? 'bg-green-500' : 'bg-zinc-500'}`}
            animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div className="hidden lg:block">
          <h1 className="font-semibold text-lg">Noia</h1>
          <p className="text-xs text-[#71717a]">{isOnline ? 'Online' : 'Offline'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 lg:px-4 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id as View)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' 
                      : 'text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#1e1e2e]'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden lg:block font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Status bar */}
      <div className="p-4 border-t border-[#1e1e2e]">
        <div className="hidden lg:block">
          <div className="flex items-center justify-between text-xs text-[#71717a] mb-2">
            <span>Context</span>
            <span>34%</span>
          </div>
          <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '34%' }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
