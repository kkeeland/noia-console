import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket,
  Loader2,
  ChevronDown,
  FolderGit2,
  Cpu,
  Tag,
  Bot,
  Timer,
  Sparkles,
} from 'lucide-react'
import {
  spawnAgent,
  listAvailableAgents,
  AVAILABLE_MODELS,
  QUICK_TEMPLATES,
} from '../lib/agents'
import type { SpawnResult, AvailableAgent } from '../lib/agents'
import { listRepos, type GitHubRepo } from '../lib/github'

interface AgentLauncherProps {
  onLaunched: (result: SpawnResult) => void
}

export default function AgentLauncher({ onLaunched }: AgentLauncherProps) {
  const [task, setTask] = useState('')
  const [label, setLabel] = useState('')
  const [model, setModel] = useState(AVAILABLE_MODELS[0].id)
  const [repo, setRepo] = useState('')
  const [agentId, setAgentId] = useState('')
  const [timeoutMinutes, setTimeoutMinutes] = useState(30)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launchSuccess, setLaunchSuccess] = useState(false)

  // Load repos + agents on mount
  useEffect(() => {
    const loadRepos = async () => {
      setLoadingRepos(true)
      try {
        const r = await listRepos()
        setRepos(r)
      } catch {
        // Non-critical
      } finally {
        setLoadingRepos(false)
      }
    }

    const loadAgents = async () => {
      setLoadingAgents(true)
      try {
        const a = await listAvailableAgents()
        setAvailableAgents(a)
      } catch {
        // Non-critical
      } finally {
        setLoadingAgents(false)
      }
    }

    loadRepos()
    loadAgents()
  }, [])

  const handleLaunch = async () => {
    if (!task.trim() || launching) return
    setLaunching(true)
    setError(null)
    setLaunchSuccess(false)
    try {
      const result = await spawnAgent({
        task: task.trim(),
        label: label.trim() || undefined,
        model,
        repo: repo || undefined,
        agentId: agentId || undefined,
        timeoutMinutes,
      })
      setTask('')
      setLabel('')
      setLaunchSuccess(true)
      setTimeout(() => setLaunchSuccess(false), 3000)
      onLaunched(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to launch agent')
    } finally {
      setLaunching(false)
    }
  }

  const applyTemplate = (templateTask: string) => {
    setTask(templateTask)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#27272a] bg-[#12121a] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Rocket className="w-5 h-5 text-[#8b5cf6]" />
          Launch Agent
          {launchSuccess && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-green-400 font-medium flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Launched!
            </motion.span>
          )}
        </h3>
      </div>

      <div className="px-6 pb-6">
        {/* Quick Templates */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => applyTemplate(t.task)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e1e2e] border border-[#27272a] text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#8b5cf6]/30 transition-all"
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Agent ID + Task side by side */}
        <div className="flex gap-3 mb-4">
          {/* Agent ID Picker */}
          <div className="w-48 flex-shrink-0">
            <label className="flex items-center gap-1.5 text-xs text-[#71717a] mb-1.5">
              <Bot className="w-3 h-3" />
              Agent ID
            </label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
            >
              <option value="">Default</option>
              {loadingAgents ? (
                <option disabled>Loading...</option>
              ) : (
                availableAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label || a.id}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Task Input */}
          <div className="flex-1">
            <label className="flex items-center gap-1.5 text-xs text-[#71717a] mb-1.5">
              Task description
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe the task for the agent... Be specific about what you want done."
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors mb-3"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? '' : '-rotate-90'}`} />
          Advanced options
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                {/* Repo */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-[#71717a] mb-1.5">
                    <FolderGit2 className="w-3 h-3" />
                    Repository
                  </label>
                  <select
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
                  >
                    <option value="">None</option>
                    {loadingRepos ? (
                      <option disabled>Loading...</option>
                    ) : (
                      repos.map((r) => (
                        <option key={r.nameWithOwner} value={r.nameWithOwner}>
                          {r.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-[#71717a] mb-1.5">
                    <Cpu className="w-3 h-3" />
                    Model
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
                  >
                    {AVAILABLE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Timeout */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-[#71717a] mb-1.5">
                    <Timer className="w-3 h-3" />
                    Timeout (min)
                  </label>
                  <input
                    type="number"
                    value={timeoutMinutes}
                    onChange={(e) => setTimeoutMinutes(Math.max(1, parseInt(e.target.value) || 30))}
                    min={1}
                    max={480}
                    className="w-full px-3 py-2 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
                  />
                </div>

                {/* Label */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-[#71717a] mb-1.5">
                    <Tag className="w-3 h-3" />
                    Label (optional)
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="auto-generated"
                    className="w-full px-3 py-2 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-400 mb-3"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Launch Button */}
        <button
          onClick={handleLaunch}
          disabled={!task.trim() || launching}
          className="
            w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm
            bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white
            hover:shadow-[0_0_24px_rgba(139,92,246,0.3)] hover:from-[#7c3aed] hover:to-[#6d28d9]
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none
            transition-all duration-300
          "
        >
          {launching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Spawning agent...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Launch Agent
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
