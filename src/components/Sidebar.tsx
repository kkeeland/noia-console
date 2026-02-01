import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, 
  MessageCircle,
  MessageSquare,
  Brain, 
  Clock, 
  Settings,
  Activity,
  GitBranch,
  Zap,
  PanelLeftClose,
  PanelLeft,
  CheckSquare,
  Users,
  Mail,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react'
import ConnectionStatus from './ConnectionStatus'
import { useGatewayStatus } from '../hooks/useGateway'

type View = 'floor' | 'dashboard' | 'chat' | 'channels' | 'people' | 'memory' | 'rhythms' | 'code' | 'briefing' | 'tasks' | 'agents' | 'agent-mail' | 'settings'

interface SidebarProps {
  activeView: View
  setActiveView: (view: View) => void
}

interface NavItem {
  id: View
  label: string
  icon: typeof Activity
  shortcut: string
  badgeKey?: 'chat' | 'channels' | 'agents' | 'code'
}

const navItems: NavItem[] = [
  { id: 'floor', label: 'The Floor', icon: LayoutDashboard, shortcut: '⌘0' },
  { id: 'dashboard', label: 'Bridge', icon: Activity, shortcut: '⌘1' },
  { id: 'chat', label: 'Chat', icon: MessageCircle, shortcut: '⌘2', badgeKey: 'chat' },
  { id: 'channels', label: 'Channels', icon: MessageSquare, shortcut: '⌘3', badgeKey: 'channels' },
  { id: 'people', label: 'People', icon: Users, shortcut: '⌘4' },
  { id: 'memory', label: 'Memory', icon: Brain, shortcut: '⌘5' },
  { id: 'rhythms', label: 'Rhythms', icon: Clock, shortcut: '⌘6' },
  { id: 'code', label: 'Code', icon: GitBranch, shortcut: '⌘7', badgeKey: 'code' },
  { id: 'briefing', label: 'Briefing', icon: BarChart3, shortcut: '' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, shortcut: '⌘8' },
  { id: 'agents', label: 'Agents', icon: Zap, shortcut: '⌘9', badgeKey: 'agents' },
  { id: 'agent-mail', label: 'Agent Mail', icon: Mail, shortcut: '⌘0' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '' },
]

// Mock badge counts — wire to real data later
function useBadgeCounts() {
  const [counts, setCounts] = useState({ chat: 0, channels: 0, agents: 0, code: 0 })
  
  useEffect(() => {
    // TODO: Wire to real gateway events for live counts
    // For now, simulate some activity
    const timer = setTimeout(() => {
      setCounts({ chat: 3, channels: 0, agents: 1, code: 0 })
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return counts
}

function Badge({ count, pulse = false }: { count: number; pulse?: boolean }) {
  if (count === 0) return null
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="relative"
    >
      {pulse && (
        <motion.div
          className="absolute inset-0 rounded-full bg-[#8b5cf6]/40"
          animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <div className="min-w-[18px] h-[18px] rounded-full bg-[#8b5cf6] flex items-center justify-center px-1">
        <span className="text-[10px] font-bold text-white leading-none">
          {count > 99 ? '99+' : count}
        </span>
      </div>
    </motion.div>
  )
}

export default function Sidebar({ activeView, setActiveView }: SidebarProps) {
  const connectionState = useGatewayStatus()
  const isOnline = connectionState === 'connected'
  const badgeCounts = useBadgeCounts()
  const [collapsed, setCollapsed] = useState(false)

  // ⌘[ to toggle sidebar collapse (view shortcuts handled globally by useKeyboardShortcuts)
  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return
    if (e.key === '[') {
      e.preventDefault()
      setCollapsed(prev => !prev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [handleKeyboard])

  return (
    <motion.aside
      className="h-full bg-[#12121a] border-r border-[#1e1e2e] flex flex-col overflow-hidden"
      animate={{ width: collapsed ? 68 : 256 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Avatar / Brand Area */}
      <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="relative flex-shrink-0">
          <motion.div 
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center shadow-lg shadow-[#8b5cf6]/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Target className="w-5 h-5 text-white" />
          </motion.div>
          {/* Status dot */}
          <motion.div
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#12121a] ${
              isOnline ? 'bg-green-500' : connectionState === 'reconnecting' ? 'bg-yellow-500' : 'bg-zinc-500'
            }`}
            animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
            >
              <h1 className="font-semibold text-lg leading-tight">Noia</h1>
              <p className="text-xs text-[#71717a]">
                {isOnline ? 'Online' : connectionState === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0
            
            return (
              <li key={item.id}>
                <motion.button
                  onClick={() => setActiveView(item.id)}
                  className={`
                    relative w-full flex items-center gap-3 rounded-lg transition-colors duration-150
                    ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'}
                    ${isActive 
                      ? 'text-[#e4e4e7]' 
                      : 'text-[#71717a] hover:text-[#e4e4e7]'
                    }
                  `}
                  whileHover={{ backgroundColor: isActive ? 'rgba(139, 92, 246, 0.12)' : 'rgba(30, 30, 46, 0.8)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#8b5cf6]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

                  {/* Active background glow */}
                  {isActive && (
                    <motion.div
                      layoutId="activeBg"
                      className="absolute inset-0 rounded-lg bg-[#8b5cf6]/10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

                  <div className="relative z-10 flex-shrink-0">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#8b5cf6]' : ''}`} />
                    {/* Badge on icon (collapsed mode) */}
                    {collapsed && badgeCount > 0 && (
                      <div className="absolute -top-1.5 -right-1.5">
                        <Badge count={badgeCount} pulse={badgeCount > 0} />
                      </div>
                    )}
                  </div>

                  {!collapsed && (
                    <>
                      <span className="relative z-10 font-medium text-sm flex-1 text-left">{item.label}</span>
                      
                      {/* Badge */}
                      {badgeCount > 0 && (
                        <div className="relative z-10">
                          <Badge count={badgeCount} pulse={item.badgeKey === 'chat'} />
                        </div>
                      )}

                      {/* Keyboard shortcut hint (shown on hover when no badge) */}
                      {badgeCount === 0 && (
                        <span className="relative z-10 text-[10px] text-[#52525b] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.shortcut}
                        </span>
                      )}
                    </>
                  )}
                </motion.button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer: Status + Controls */}
      <div className="border-t border-[#1e1e2e]">
        {/* Quick status footer */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 pt-3 pb-1"
          >
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex flex-col">
                <span className="text-[#52525b] uppercase tracking-wider">Model</span>
                <span className="text-[#a1a1aa] font-medium truncate">Claude Opus</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#52525b] uppercase tracking-wider">Sessions</span>
                <span className="text-[#a1a1aa] font-medium">—</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Connection Status */}
        <div className="px-2 py-2">
          <ConnectionStatus collapsed={collapsed} />
        </div>

        {/* Context bar */}
        {!collapsed && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between text-[10px] text-[#52525b] mb-1.5">
              <span className="uppercase tracking-wider">Context</span>
              <span className="text-[#71717a]">34%</span>
            </div>
            <div className="h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '34%' }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <div className={`px-2 pb-3 ${collapsed ? 'flex justify-center' : ''}`}>
          <motion.button
            onClick={() => setCollapsed(!collapsed)}
            className={`
              flex items-center gap-2 rounded-lg text-[#52525b] hover:text-[#a1a1aa] 
              hover:bg-[#1e1e2e] transition-colors duration-150
              ${collapsed ? 'p-2' : 'px-3 py-1.5 w-full'}
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={collapsed ? 'Expand sidebar (⌘[)' : 'Collapse sidebar (⌘[)'}
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span className="text-xs">Collapse</span>
                <span className="ml-auto text-[10px] font-mono text-[#3f3f46]">⌘[</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.aside>
  )
}
