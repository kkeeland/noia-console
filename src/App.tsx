import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import Dashboard from './components/Dashboard'
import Chat from './components/Chat'
import Memory from './components/Memory'
import Rhythms from './components/Rhythms'
import Settings from './components/Settings'
import Code from './components/Code'
import Agents from './components/Agents'
import AgentMail from './components/AgentMail'
import Channels from './components/Channels'
import Tasks from './components/Tasks'
import People from './components/People'
import SetupScreen from './components/SetupScreen'
import { isConfigured } from './lib/config'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMobileDetect } from './hooks/useMobileDetect'
import { useGatewayConnect } from './hooks/useGateway'

type View = 'dashboard' | 'chat' | 'channels' | 'people' | 'memory' | 'rhythms' | 'code' | 'tasks' | 'agents' | 'agent-mail' | 'settings'

function App() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [configured, setConfigured] = useState(isConfigured())
  const { isMobile } = useMobileDetect()

  // Global keyboard shortcuts (⌘1-7, ⌘K, ⌘/, Escape)
  useKeyboardShortcuts({ setActiveView })

  // Auto-connect WebSocket to gateway for real-time streaming
  useGatewayConnect()

  const handleSetupComplete = useCallback(() => {
    setConfigured(true)
  }, [])

  const handleConfigChange = useCallback(() => {
    setConfigured(isConfigured())
  }, [])

  // First-run setup
  if (!configured) {
    return <SetupScreen onComplete={handleSetupComplete} />
  }

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-[#e4e4e7]">
      {/* Sidebar — hidden on mobile */}
      {!isMobile && (
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
      )}
      
      {/* Main Content */}
      <main className={`flex-1 overflow-hidden ${isMobile ? 'pb-[72px]' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeView === 'dashboard' && <Dashboard onNavigate={(v) => setActiveView(v as View)} />}
            {activeView === 'chat' && <Chat />}
            {activeView === 'channels' && <Channels />}
            {activeView === 'people' && <People />}
            {activeView === 'memory' && <Memory />}
            {activeView === 'rhythms' && <Rhythms />}
            {activeView === 'code' && <Code />}
            {activeView === 'tasks' && <Tasks />}
            {activeView === 'agents' && <Agents />}
            {activeView === 'agent-mail' && <AgentMail />}
            {activeView === 'settings' && <Settings onConfigChange={handleConfigChange} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <MobileNav activeView={activeView} setActiveView={setActiveView} />
      )}
    </div>
  )
}

export default App
