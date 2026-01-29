import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw, Clock, Zap, RotateCw } from 'lucide-react'
import { useGatewayStatusDetail } from '../hooks/useGateway'
import type { ConnectionState } from '../lib/gateway-ws'
import { getGateway } from '../lib/gateway-ws'

const stateConfig: Record<ConnectionState, { color: string; bgColor: string; label: string; icon: typeof Wifi }> = {
  connected: { color: 'bg-green-500', bgColor: 'bg-green-500/10', label: 'Connected', icon: Wifi },
  connecting: { color: 'bg-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Connecting...', icon: RefreshCw },
  reconnecting: { color: 'bg-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Reconnecting...', icon: RefreshCw },
  disconnected: { color: 'bg-red-500', bgColor: 'bg-red-500/10', label: 'Disconnected', icon: WifiOff },
}

interface ConnectionStatusProps {
  collapsed?: boolean
}

function formatTimeAgo(ts: number | null): string {
  if (!ts) return 'Never'
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5) return 'Just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatLatency(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1) return '<1ms'
  return `${ms}ms`
}

export default function ConnectionStatus({ collapsed = false }: ConnectionStatusProps) {
  const { state, reconnectAttempts, lastConnectedAt, latencyMs } = useGatewayStatusDetail()
  const [showDetails, setShowDetails] = useState(false)
  const config = stateConfig[state]
  const Icon = config.icon
  const isSpinning = state === 'connecting' || state === 'reconnecting'

  const latencyColor = useMemo(() => {
    if (latencyMs === null) return 'text-[#71717a]'
    if (latencyMs < 50) return 'text-green-400'
    if (latencyMs < 150) return 'text-yellow-400'
    return 'text-red-400'
  }, [latencyMs])

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          w-full flex items-center gap-2.5 rounded-lg transition-all duration-200
          hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7]
          ${collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2'}
        `}
      >
        {/* Status dot */}
        <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
          <motion.div
            className={`w-2.5 h-2.5 rounded-full ${config.color}`}
            animate={state === 'connected' ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {isSpinning && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>
        {!collapsed && (
          <div className="flex items-center justify-between flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{config.label}</span>
            {state === 'connected' && latencyMs !== null && (
              <span className={`text-[10px] font-mono ${latencyColor}`}>
                {formatLatency(latencyMs)}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Details popup */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-64 p-4 rounded-xl bg-[#12121a] border border-[#1e1e2e] shadow-2xl z-50"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${state === 'connected' ? 'text-green-400' : state === 'disconnected' ? 'text-red-400' : 'text-yellow-400'}`} />
                <span className="text-sm font-semibold text-[#e4e4e7]">Gateway WebSocket</span>
              </div>

              {/* Status details grid */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#71717a] flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
                    Status
                  </span>
                  <span className={`font-medium ${state === 'connected' ? 'text-green-400' : state === 'disconnected' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {config.label}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#71717a] flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    Latency
                  </span>
                  <span className={`font-mono font-medium ${latencyColor}`}>
                    {formatLatency(latencyMs)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#71717a] flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Connected
                  </span>
                  <span className="text-[#e4e4e7] font-medium">
                    {formatTimeAgo(lastConnectedAt)}
                  </span>
                </div>

                {reconnectAttempts > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#71717a] flex items-center gap-1.5">
                      <RotateCw className="w-3 h-3" />
                      Reconnects
                    </span>
                    <span className="text-yellow-400 font-medium">{reconnectAttempts}</span>
                  </div>
                )}

                <div className="h-px bg-[#1e1e2e] my-1" />

                <div className="flex justify-between">
                  <span className="text-[#71717a]">Protocol</span>
                  <span className="text-[#e4e4e7]">WebSocket</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Endpoint</span>
                  <span className="text-[#e4e4e7] truncate ml-2">localhost:18789</span>
                </div>
              </div>

              {/* Reconnect button */}
              {state === 'disconnected' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    getGateway().connect()
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-[#8b5cf6]/20 text-[#8b5cf6] text-xs font-semibold hover:bg-[#8b5cf6]/30 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reconnect
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
