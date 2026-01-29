import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Server, Key, ArrowRight, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react'
import { setConfig } from '../lib/config'
import { testConnection, type ConnectionTestResult } from '../lib/api'

interface SetupScreenProps {
  onComplete: () => void
}

export default function SetupScreen({ onComplete }: SetupScreenProps) {
  const [step, setStep] = useState<'welcome' | 'connect'>('welcome')
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:18789')
  const [gatewayToken, setGatewayToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setError(null)
    setTestResult(null)
    try {
      const result = await testConnection(gatewayUrl, gatewayToken)
      setTestResult(result)
      if (!result.ok) {
        setError(result.error || 'Connection failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    setConfig({ gatewayUrl, gatewayToken })
    onComplete()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 'welcome' ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="max-w-md w-full text-center"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#8b5cf6]/20">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-[#e4e4e7] mb-2">Noia</h1>
              <p className="text-[#71717a] text-lg">Your AI consciousness console</p>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[#a1a1aa] mb-10 leading-relaxed"
            >
              Connect to your Clawdbot Gateway to manage sessions, memory, rhythms, and more — from anywhere.
            </motion.p>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => setStep('connect')}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="connect"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-lg w-full"
          >
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-[#8b5cf6]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#e4e4e7]">Connect to Gateway</h2>
                  <p className="text-sm text-[#71717a]">Enter your Clawdbot Gateway details</p>
                </div>
              </div>

              {/* Gateway URL */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Gateway URL</label>
                  <div className="relative">
                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
                    <input
                      type="url"
                      value={gatewayUrl}
                      onChange={(e) => { setGatewayUrl(e.target.value); setTestResult(null) }}
                      placeholder="http://localhost:18789"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg text-[#e4e4e7] placeholder-[#3f3f46] focus:outline-none focus:border-[#8b5cf6]/50 focus:ring-1 focus:ring-[#8b5cf6]/25 transition-colors"
                    />
                  </div>
                </div>

                {/* Token */}
                <div>
                  <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Gateway Token</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={gatewayToken}
                      onChange={(e) => { setGatewayToken(e.target.value); setTestResult(null) }}
                      placeholder="Enter your gateway token"
                      className="w-full pl-10 pr-12 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg text-[#e4e4e7] placeholder-[#3f3f46] focus:outline-none focus:border-[#8b5cf6]/50 focus:ring-1 focus:ring-[#8b5cf6]/25 transition-colors font-mono text-sm"
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

                {/* Test Result */}
                <AnimatePresence>
                  {(testResult || error) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`p-3 rounded-lg border ${testResult?.ok 
                        ? 'bg-green-500/5 border-green-500/20' 
                        : 'bg-red-500/5 border-red-500/20'
                      }`}>
                        <div className="flex items-center gap-2">
                          {testResult?.ok ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${testResult?.ok ? 'text-green-400' : 'text-red-400'}`}>
                            {testResult?.ok ? 'Connected successfully' : (error || 'Connection failed')}
                          </span>
                        </div>
                        {testResult?.ok && testResult.latencyMs != null && (
                          <div className="mt-2 flex gap-4 text-xs text-[#71717a]">
                            <span>Latency: {testResult.latencyMs}ms</span>
                            {testResult.version && <span>Version: {testResult.version}</span>}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleTest}
                    disabled={!gatewayUrl || !gatewayToken || testing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#1e1e2e] text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#3f3f46] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {testing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Test Connection
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!testResult?.ok}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Connect
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Back link */}
            <div className="text-center mt-4">
              <button
                onClick={() => setStep('welcome')}
                className="text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors"
              >
                ← Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Re-export Zap for use in template
import { Zap } from 'lucide-react'
