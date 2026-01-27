import { motion } from 'framer-motion'
import { 
  Clock, 
  Play, 
  Pause, 
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  Repeat
} from 'lucide-react'

interface Rhythm {
  id: string
  name: string
  schedule: string
  nextRun: string
  status: 'active' | 'paused'
  lastRun?: {
    time: string
    status: 'success' | 'skipped' | 'error'
  }
}

const rhythms: Rhythm[] = [
  {
    id: '1',
    name: 'HelloSpore Daily Task Review',
    schedule: 'Every day at 8:00 AM',
    nextRun: 'Tomorrow 8:00 AM',
    status: 'active',
    lastRun: { time: 'Today 8:00 AM', status: 'success' }
  },
  {
    id: '2',
    name: 'Lemwarm Progress Check',
    schedule: 'Every 3 days at 9:00 AM',
    nextRun: 'Wed 9:00 AM',
    status: 'active',
  },
  {
    id: '3',
    name: 'Weekly Revenue Check',
    schedule: 'Mondays at 9:00 AM',
    nextRun: 'Mon 9:00 AM',
    status: 'active',
  },
  {
    id: '4',
    name: 'Cold Email Performance',
    schedule: 'Every day at 10:00 AM',
    nextRun: 'Tomorrow 10:00 AM',
    status: 'active',
    lastRun: { time: 'Today 10:00 AM', status: 'skipped' }
  },
]

export default function Rhythms() {
  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-[#8b5cf6]" />
            Rhythms
          </h1>
          <p className="text-[#71717a]">Automated tasks that run on schedule</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] transition-colors">
          <Plus className="w-5 h-5" />
          Add Rhythm
        </button>
      </div>

      {/* Rhythms List */}
      <div className="space-y-4">
        {rhythms.map((rhythm, index) => (
          <motion.div
            key={rhythm.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-5 rounded-xl bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/30 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{rhythm.name}</h3>
                  {rhythm.status === 'active' ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                      Paused
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-6 text-sm text-[#71717a]">
                  <span className="flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    {rhythm.schedule}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Next: {rhythm.nextRun}
                  </span>
                </div>

                {rhythm.lastRun && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    {rhythm.lastRun.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : rhythm.lastRun.status === 'skipped' ? (
                      <XCircle className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-[#71717a]">
                      Last run: {rhythm.lastRun.time}
                      {rhythm.lastRun.status === 'skipped' && ' (skipped)'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors text-[#71717a] hover:text-[#e4e4e7]">
                  <Play className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors text-[#71717a] hover:text-[#e4e4e7]">
                  <Pause className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty state for when no rhythms */}
      {rhythms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-[#71717a]">
          <Clock className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg mb-2">No rhythms yet</p>
          <p className="text-sm">Create your first automated task</p>
        </div>
      )}
    </div>
  )
}
