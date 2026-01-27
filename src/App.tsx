import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, 
  MessageCircle, 
  Brain, 
  Clock, 
  Zap, 
  Settings,
  Activity,
  ChevronRight
} from 'lucide-react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Chat from './components/Chat'
import Memory from './components/Memory'
import Rhythms from './components/Rhythms'

type View = 'dashboard' | 'chat' | 'memory' | 'rhythms' | 'settings'

function App() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [isOnline] = useState(true)

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-[#e4e4e7]">
      {/* Sidebar */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} isOnline={isOnline} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeView === 'dashboard' && <Dashboard />}
            {activeView === 'chat' && <Chat />}
            {activeView === 'memory' && <Memory />}
            {activeView === 'rhythms' && <Rhythms />}
            {activeView === 'settings' && <div className="p-8"><h1 className="text-2xl font-semibold">Settings</h1></div>}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
