import { motion } from 'framer-motion'
import { 
  CheckSquare, 
  Brain, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Sparkles
} from 'lucide-react'

const stats = [
  { label: 'Tasks', value: '21', icon: CheckSquare, color: 'from-blue-500 to-blue-600' },
  { label: 'Memories', value: '3', icon: Brain, color: 'from-purple-500 to-purple-600' },
  { label: 'Rhythms', value: '4', icon: Clock, color: 'from-amber-500 to-amber-600' },
]

const recentActivity = [
  { text: 'Notion task list created', time: '2 min ago', type: 'success' },
  { text: 'Lemwarm check scheduled', time: '5 min ago', type: 'info' },
  { text: 'Memory saved for today', time: '10 min ago', type: 'info' },
  { text: 'HelloSpore email sequence drafted', time: '15 min ago', type: 'success' },
]

export default function Dashboard() {
  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <h1 className="text-3xl font-bold">The Bridge</h1>
          <Sparkles className="w-6 h-6 text-[#8b5cf6]" />
        </motion.div>
        <p className="text-[#71717a]">Your command center. Everything at a glance.</p>
      </div>

      {/* Current Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/10 to-transparent border border-[#8b5cf6]/20"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[#71717a] mb-1">Currently thinking about</p>
            <p className="text-xl font-medium">"Building Noia Console with Kevin"</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#8b5cf6]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8b5cf6] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8b5cf6]"></span>
            </span>
            Active
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="p-5 rounded-xl bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#71717a] group-hover:text-[#8b5cf6] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-[#71717a]">{stat.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#8b5cf6]" />
          Recent Activity
        </h2>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-[#12121a] border border-[#1e1e2e]"
            >
              <div className={`w-2 h-2 rounded-full ${activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
              <p className="flex-1">{activity.text}</p>
              <span className="text-sm text-[#71717a]">{activity.time}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
