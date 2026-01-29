import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Server, Eye, EyeOff, Zap, Loader2, CheckCircle2, XCircle,
  Trash2, Save, User, Wifi, WifiOff, RefreshCw, Settings2,
  Cpu, MessageSquare, BarChart3, Palette, AlertTriangle,
  ChevronDown, ChevronRight, Copy, Check, RotateCcw,
  Activity, Hash, Clock, Database, Radio
} from 'lucide-react'
import { getConfig, setConfig, clearConfig, type NoiaConfig } from '../lib/config'
import { testConnection, type ConnectionTestResult } from '../lib/api'
import {
  fetchGatewayConfig, fetchGatewayStats, fetchChannelStatuses,
  restartGateway, setGatewayConfig,
  type GatewayConfig, type GatewayStats, type ChannelStatus
} from '../lib/gateway'

// ---- Constants ----

const COMMON_MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-opus-4-5', label: 'Claude Opus 4.5', provider: 'Anthropic' },
  { id: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (routed)', provider: 'Anthropic' },
  { id: 'openai/gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/o3', label: 'o3', provider: 'OpenAI' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'Google' },
]

const ACCENT_COLORS = [
  { id: 'violet', color: '#8b5cf6', label: 'Violet' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'amber', color: '#f59e0b', label: 'Amber' },
  { id: 'rose', color: '#f43f5e', label: 'Rose' },
  { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
]

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: '📱', telegram: '✈️', discord: '🎮',
  signal: '🔒', imessage: '💬', webchat: '🌐', slack: '💼',
}

// ---- Component ----

interface SettingsProps {
  onConfigChange?: () => void
}

export default function Settings({ onConfigChange }: SettingsProps) {
  // Connection settings
  const [config, setLocalConfig] = useState<NoiaConfig>(getConfig())
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Live status
  const [liveStatus, setLiveStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [liveLatency, setLiveLatency] = useState<number | null>(null)

  // Gateway config
  const [gwConfig, setGwConfig] = useState<GatewayConfig | null>(null)
  const [gwConfigLoading, setGwConfigLoading] = useState(false)
  const [gwConfigError, setGwConfigError] = useState<string | null>(null)
  const [gwConfigExpanded, setGwConfigExpanded] = useState(false)
  const [configCopied, setConfigCopied] = useState(false)

  // Model selector
  const [currentModel, setCurrentModel] = useState<string>('')
  const [modelSaving, setModelSaving] = useState(false)
  const [customModel, setCustomModel] = useState('')
  const [showCustomModel, setShowCustomModel] = useState(false)

  // Channel status
  const [channels, setChannels] = useState<ChannelStatus[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)

  // Stats
  const [stats, setStats] = useState<GatewayStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Theme
  const [accentColor, setAccentColor] = useState(() =>
    localStorage.getItem('noia-accent') || '#8b5cf6'
  )

  // Danger zone
  const [restarting, setRestarting] = useState(false)
  const [restartResult, setRestartResult] = useState<'success' | 'error' | null>(null)

  // ---- Data fetching ----

  const checkLiveStatus = useCallback(async () => {
    setLiveStatus('checking')
    try {
      const currentConfig = getConfig()
      const result = await testConnection(currentConfig.gatewayUrl, currentConfig.gatewayToken)
      setLiveStatus(result.ok ? 'online' : 'offline')
      setLiveLatency(result.latencyMs ?? null)
    } catch {
      setLiveStatus('offline')
      setLiveLatency(null)
    }
  }, [])

  const loadGatewayConfig = useCallback(async () => {
    setGwConfigLoading(true)
    setGwConfigError(null)
    try {
      const cfg = await fetchGatewayConfig()
      setGwConfig(cfg)
      // Extract current model from config
      const model = (cfg.model || cfg.defaultModel || '') as string
      if (model) setCurrentModel(model)
    } catch (e) {
      setGwConfigError(e instanceof Error ? e.message : 'Failed to load config')
    } finally {
      setGwConfigLoading(false)
    }
  }, [])

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true)
    try {
      const ch = await fetchChannelStatuses()
      setChannels(ch)
    } catch {
      // Non-critical
    } finally {
      setChannelsLoading(false)
    }
  }, [])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const s = await fetchGatewayStats()
      setStats(s)
    } catch {
      // Non-critical
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkLiveStatus()
    loadGatewayConfig()
    loadChannels()
    loadStats()
  }, [checkLiveStatus, loadGatewayConfig, loadChannels, loadStats])

  // ---- Handlers ----

  const handleChange = (field: keyof NoiaConfig, value: string) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }))
    setDirty(true)
    setTestResult(null)
    setSaved(false)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection(config.gatewayUrl, config.gatewayToken)
      setTestResult(result)
    } catch (e) {
      setTestResult({ ok: false, error: e instanceof Error ? e.message : 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    setConfig(config)
    setSaved(true)
    setDirty(false)
    onConfigChange?.()
    setTimeout(() => {
      checkLiveStatus()
      loadGatewayConfig()
      loadChannels()
      loadStats()
    }, 500)
  }

  const handleClear = () => {
    if (confirm('Clear all settings? You will need to re-enter your gateway details.')) {
      clearConfig()
      setLocalConfig({ gatewayUrl: 'http://localhost:18789', gatewayToken: '' })
      setTestResult(null)
      setSaved(false)
      setDirty(false)
      onConfigChange?.()
    }
  }

  const handleModelChange = async (modelId: string) => {
    setCurrentModel(modelId)
    setModelSaving(true)
    try {
      await setGatewayConfig('model', modelId)
    } catch {
      // Config set might not be supported — store locally as fallback
      console.warn('Could not set model on gateway, storing locally')
    } finally {
      setModelSaving(false)
    }
  }

  const handleCustomModelSubmit = async () => {
    if (!customModel.trim()) return
    await handleModelChange(customModel.trim())
    setShowCustomModel(false)
    setCustomModel('')
  }

  const handleCopyConfig = () => {
    if (gwConfig) {
      navigator.clipboard.writeText(JSON.stringify(gwConfig, null, 2))
      setConfigCopied(true)
      setTimeout(() => setConfigCopied(false), 2000)
    }
  }

  const handleAccentChange = (color: string) => {
    setAccentColor(color)
    localStorage.setItem('noia-accent', color)
  }

  const handleRestart = async () => {
    if (!confirm('Restart the gateway? Active sessions may be interrupted.')) return
    setRestarting(true)
    setRestartResult(null)
    try {
      await restartGateway()
      setRestartResult('success')
      setTimeout(() => {
        checkLiveStatus()
        setRestartResult(null)
      }, 5000)
    } catch {
      setRestartResult('error')
    } finally {
      setRestarting(false)
    }
  }

  const handleClearLocalStorage = () => {
    if (!confirm('Clear ALL local storage for Noia Console? This removes config, theme preferences, and cached data.')) return
    localStorage.clear()
    window.location.reload()
  }

  // ---- Section animation props ----
  const sectionProps = (delay: number) => ({
    initial: { opacity: 0, y: 10 } as const,
    animate: { opacity: 1, y: 0 } as const,
    transition: { delay },
  })

  // ---- Render ----

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 lg:p-8 space-y-6 pb-24">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#e4e4e7]">Settings</h1>
            <Settings2 className="w-5 h-5 text-[#8b5cf6]" />
          </div>
          <p className="text-[#71717a] mt-1">
            Manage your Gateway connection, model, channels, and preferences
          </p>
        </div>

        {/* ━━━ Connection Status ━━━ */}
        <motion.div {...sectionProps(0)} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {liveStatus === 'checking' ? (
                <Loader2 className="w-5 h-5 text-[#71717a] animate-spin" />
              ) : liveStatus === 'online' ? (
                <Wifi className="w-5 h-5 text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-400" />
              )}
              <div>
                <p className="font-medium text-[#e4e4e7]">
                  {liveStatus === 'checking' ? 'Checking connection...'
                    : liveStatus === 'online' ? 'Connected to Gateway'
                    : 'Disconnected'}
                </p>
                <div className="flex gap-4 text-xs text-[#71717a]">
                  {liveStatus === 'online' && liveLatency != null && <span>Latency: {liveLatency}ms</span>}
                  {stats?.version && <span>v{stats.version}</span>}
                  {stats?.uptime && <span>Uptime: {stats.uptime}</span>}
                </div>
              </div>
            </div>
            <button
              onClick={checkLiveStatus}
              className="p-2 rounded-lg text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#1e1e2e] transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${liveStatus === 'checking' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </motion.div>

        {/* ━━━ Gateway Connection ━━━ */}
        <motion.div {...sectionProps(0.05)} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-4 h-4 text-[#8b5cf6]" />
            <h2 className="font-medium text-[#e4e4e7]">Gateway Connection</h2>
          </div>

          <div>
            <label className="block text-sm text-[#a1a1aa] mb-1.5">Gateway URL</label>
            <input
              type="url"
              value={config.gatewayUrl}
              onChange={(e) => handleChange('gatewayUrl', e.target.value)}
              placeholder="http://localhost:18789"
              className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg text-[#e4e4e7] placeholder-[#3f3f46] focus:outline-none focus:border-[#8b5cf6]/50 focus:ring-1 focus:ring-[#8b5cf6]/25 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#a1a1aa] mb-1.5">Gateway Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={config.gatewayToken}
                onChange={(e) => handleChange('gatewayToken', e.target.value)}
                placeholder="Enter your gateway token"
                className="w-full px-4 pr-12 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg text-[#e4e4e7] placeholder-[#3f3f46] focus:outline-none focus:border-[#8b5cf6]/50 focus:ring-1 focus:ring-[#8b5cf6]/25 transition-colors font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#a1a1aa] transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTest}
              disabled={!config.gatewayUrl || !config.gatewayToken || testing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1e1e2e] text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#3f3f46] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Test Connection
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty && !testResult?.ok}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <AnimatePresence>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-sm text-green-400"
                >
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Test result */}
          <AnimatePresence>
            {testResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-3 rounded-lg border ${testResult.ok
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {testResult.ok ? 'Connection successful' : (testResult.error || 'Failed')}
                    </span>
                  </div>
                  {testResult.ok && (
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#71717a]">
                      {testResult.latencyMs != null && <span>Latency: {testResult.latencyMs}ms</span>}
                      {testResult.version && <span>Version: {testResult.version}</span>}
                      {testResult.uptime && <span>Uptime: {testResult.uptime}</span>}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ━━━ Model Selector ━━━ */}
        <motion.div {...sectionProps(0.1)} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#8b5cf6]" />
              <h2 className="font-medium text-[#e4e4e7]">Model</h2>
            </div>
            {modelSaving && <Loader2 className="w-4 h-4 text-[#8b5cf6] animate-spin" />}
          </div>

          {currentModel && (
            <div className="px-3 py-2 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg">
              <span className="text-xs text-[#71717a]">Current: </span>
              <span className="text-sm font-mono text-[#e4e4e7]">{currentModel}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COMMON_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => handleModelChange(m.id)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                  currentModel === m.id
                    ? 'border-[#8b5cf6]/50 bg-[#8b5cf6]/10 text-[#e4e4e7]'
                    : 'border-[#1e1e2e] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#e4e4e7]'
                }`}
              >
                <div className="text-sm font-medium">{m.label}</div>
                <div className="text-xs text-[#71717a]">{m.provider}</div>
              </button>
            ))}
          </div>

          {/* Custom model input */}
          <div>
            <button
              onClick={() => setShowCustomModel(!showCustomModel)}
              className="text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors flex items-center gap-1"
            >
              {showCustomModel ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Custom model
            </button>
            <AnimatePresence>
              {showCustomModel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomModelSubmit()}
                      placeholder="provider/model-name"
                      className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg text-sm text-[#e4e4e7] placeholder-[#3f3f46] focus:outline-none focus:border-[#8b5cf6]/50 font-mono"
                    />
                    <button
                      onClick={handleCustomModelSubmit}
                      disabled={!customModel.trim()}
                      className="px-3 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm disabled:opacity-40 transition-colors"
                    >
                      Set
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ━━━ Channel Status ━━━ */}
        <motion.div {...sectionProps(0.15)} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#8b5cf6]" />
              <h2 className="font-medium text-[#e4e4e7]">Channels</h2>
            </div>
            <button
              onClick={loadChannels}
              className="p-1.5 rounded-lg text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#1e1e2e] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${channelsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {channelsLoading && channels.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[#71717a] py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading channels...
            </div>
          ) : channels.length === 0 ? (
            <div className="text-sm text-[#71717a] py-3">
              No channel information available. Connect to gateway first.
            </div>
          ) : (
            <div className="space-y-2">
              {channels.map((ch) => (
                <div
                  key={ch.name}
                  className="flex items-center justify-between px-3 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{CHANNEL_ICONS[ch.type] || '💬'}</span>
                    <span className="text-sm font-medium text-[#e4e4e7] capitalize">{ch.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${ch.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className={`text-xs ${ch.connected ? 'text-green-400' : 'text-red-400'}`}>
                      {ch.connected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ━━━ Session Stats ━━━ */}
        <motion.div {...sectionProps(0.2)} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#8b5cf6]" />
              <h2 className="font-medium text-[#e4e4e7]">Session Stats</h2>
            </div>
            <button
              onClick={loadStats}
              className="p-1.5 rounded-lg text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#1e1e2e] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {statsLoading && !stats ? (
            <div className="flex items-center gap-2 text-sm text-[#71717a] py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading stats...
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard icon={Hash} label="Sessions" value={String(stats.sessionCount)} />
              {stats.uptime && <StatCard icon={Clock} label="Uptime" value={stats.uptime} />}
              {stats.version && <StatCard icon={Activity} label="Version" value={stats.version} />}
              {stats.totalTokens != null && (
                <StatCard icon={Database} label="Tokens" value={formatTokens(stats.totalTokens)} />
              )}
              {channels.length > 0 && (
                <StatCard icon={Radio} label="Channels" value={`${channels.filter(c => c.connected).length}/${channels.length}`} />
              )}
            </div>
          ) : (
            <div className="text-sm text-[#71717a] py-3">
              Connect to gateway to see stats.
            </div>
          )}
        </motion.div>

        {/* ━━━ Gateway Config Viewer ━━━ */}
        <motion.div {...sectionProps(0.25)} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setGwConfigExpanded(!gwConfigExpanded)}
              className="flex items-center gap-2 text-left"
            >
              {gwConfigExpanded
                ? <ChevronDown className="w-4 h-4 text-[#8b5cf6]" />
                : <ChevronRight className="w-4 h-4 text-[#8b5cf6]" />}
              <h2 className="font-medium text-[#e4e4e7]">Gateway Config</h2>
            </button>
            <div className="flex items-center gap-1">
              {gwConfig && (
                <button
                  onClick={handleCopyConfig}
                  className="p-1.5 rounded-lg text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#1e1e2e] transition-colors"
                  title="Copy config"
                >
                  {configCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={loadGatewayConfig}
                className="p-1.5 rounded-lg text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#1e1e2e] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gwConfigLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {gwConfigExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {gwConfigLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[#71717a] py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading config...
                  </div>
                ) : gwConfigError ? (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <span className="text-sm text-red-400">{gwConfigError}</span>
                  </div>
                ) : gwConfig ? (
                  <pre className="p-3 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg text-xs text-[#a1a1aa] font-mono overflow-x-auto max-h-80 overflow-y-auto">
                    {JSON.stringify(gwConfig, null, 2)}
                  </pre>
                ) : (
                  <div className="text-sm text-[#71717a] py-3">
                    No config available.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ━━━ User Profile ━━━ */}
        <motion.div {...sectionProps(0.3)} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-[#8b5cf6]" />
            <h2 className="font-medium text-[#e4e4e7]">Profile</h2>
          </div>
          <div>
            <label className="block text-sm text-[#a1a1aa] mb-1.5">Display Name</label>
            <input
              type="text"
              value={config.userName || ''}
              onChange={(e) => handleChange('userName', e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg text-[#e4e4e7] placeholder-[#3f3f46] focus:outline-none focus:border-[#8b5cf6]/50 focus:ring-1 focus:ring-[#8b5cf6]/25 transition-colors"
            />
          </div>
        </motion.div>

        {/* ━━━ Theme / Appearance ━━━ */}
        <motion.div {...sectionProps(0.35)} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-4 h-4 text-[#8b5cf6]" />
            <h2 className="font-medium text-[#e4e4e7]">Appearance</h2>
          </div>

          <div>
            <label className="block text-sm text-[#a1a1aa] mb-2.5">Accent Color</label>
            <div className="flex gap-3">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAccentChange(c.color)}
                  title={c.label}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    accentColor === c.color
                      ? 'border-white scale-110'
                      : 'border-transparent hover:border-[#3f3f46] hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-[#e4e4e7]">Dark Mode</p>
              <p className="text-xs text-[#71717a]">Always on (light mode coming soon)</p>
            </div>
            <div className="w-10 h-6 rounded-full bg-[#8b5cf6] flex items-center px-1 cursor-not-allowed">
              <div className="w-4 h-4 rounded-full bg-white ml-auto" />
            </div>
          </div>
        </motion.div>

        {/* ━━━ Danger Zone ━━━ */}
        <motion.div
          {...sectionProps(0.4)}
          className="bg-[#12121a] border border-red-500/20 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="font-medium text-red-400">Danger Zone</h2>
          </div>

          <div className="space-y-3">
            {/* Restart gateway */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#e4e4e7]">Restart Gateway</p>
                <p className="text-xs text-[#71717a]">Restarts the Clawdbot gateway process</p>
              </div>
              <button
                onClick={handleRestart}
                disabled={restarting || liveStatus !== 'online'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {restarting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Restart
              </button>
            </div>

            {restartResult && (
              <div className={`text-xs px-3 py-2 rounded-lg ${
                restartResult === 'success'
                  ? 'text-green-400 bg-green-500/5 border border-green-500/20'
                  : 'text-red-400 bg-red-500/5 border border-red-500/20'
              }`}>
                {restartResult === 'success' ? 'Gateway is restarting…' : 'Failed to restart gateway'}
              </div>
            )}

            <div className="border-t border-[#1e1e2e]" />

            {/* Clear settings */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#e4e4e7]">Clear Settings</p>
                <p className="text-xs text-[#71717a]">Remove saved gateway URL and token</p>
              </div>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>

            <div className="border-t border-[#1e1e2e]" />

            {/* Clear all local storage */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#e4e4e7]">Clear Local Storage</p>
                <p className="text-xs text-[#71717a]">Wipe all cached data and preferences</p>
              </div>
              <button
                onClick={handleClearLocalStorage}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Wipe All
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ---- Sub-components ----

function StatCard({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-[#71717a]" />
        <span className="text-xs text-[#71717a]">{label}</span>
      </div>
      <p className="text-sm font-medium text-[#e4e4e7]">{value}</p>
    </div>
  )
}

// ---- Helpers ----

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
