import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, PanelLeft, Loader2, ChevronDown, Wifi, WifiOff } from 'lucide-react'
import {
  listSessions,
  getSessionHistory,
  sendToSession,
  abortSession,
  createSession,
  formatSessionName,
  getChannelEmoji,
} from '../lib/api'
import { useChatStream, useGatewayStatus } from '../hooks/useGateway'
import type { Session, Message } from '../types/clawdbot'
import SessionList from './SessionList'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

export default function Chat() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)

  const wsStatus = useGatewayStatus()

  // Real-time streaming via WebSocket
  const {
    messages: streamMessages,
    isStreaming,
    streamingText,
    appendMessage,
    replaceMessages,
  } = useChatStream(selectedSession?.key ?? null)

  // --- Load sessions ---
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true)
    setError(null)
    try {
      const data = await listSessions(100)
      setSessions(data)
    } catch (err) {
      console.error('Failed to load sessions:', err)
      setError('Failed to load sessions')
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // --- Load history when session changes ---
  useEffect(() => {
    if (!selectedSession) return
    let cancelled = false

    async function load() {
      setLoadingHistory(true)
      setError(null)
      try {
        const data = await getSessionHistory(selectedSession!.key, 100, true)
        if (!cancelled) {
          replaceMessages(data.reverse())
        }
      } catch (err) {
        console.error('Failed to load history:', err)
        if (!cancelled) setError('Failed to load message history')
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [selectedSession, replaceMessages])

  // --- Auto-scroll ---
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamMessages, streamingText, autoScroll])

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distFromBottom < 100
    setAutoScroll(atBottom)
    setShowScrollButton(distFromBottom > 300)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setAutoScroll(true)
    setShowScrollButton(false)
  }, [])

  // --- Send message ---
  const handleSend = useCallback(async (text: string) => {
    if (!selectedSession || sending) return

    const userMsg: Message = {
      role: 'user',
      content: [{ type: 'text', text }],
      timestamp: Date.now(),
    }
    appendMessage(userMsg)
    setAutoScroll(true)
    setSending(true)
    setError(null)

    try {
      await sendToSession(selectedSession.key, text)
    } catch (err) {
      console.error('Failed to send:', err)
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }, [selectedSession, sending, appendMessage])

  // --- Abort ---
  const handleAbort = useCallback(async () => {
    if (!selectedSession) return
    try {
      await abortSession(selectedSession.key)
    } catch (err) {
      console.error('Failed to abort:', err)
    }
  }, [selectedSession])

  // --- New session ---
  const handleNewSession = useCallback(async () => {
    if (creatingSession) return
    setCreatingSession(true)
    setError(null)
    try {
      const session = await createSession()
      // Refresh session list and select the new one
      await loadSessions()
      setSelectedSession(session)
      setAutoScroll(true)
    } catch (err) {
      console.error('Failed to create session:', err)
      setError('Failed to create session')
    } finally {
      setCreatingSession(false)
    }
  }, [creatingSession, loadSessions])

  // --- Select session ---
  const handleSelectSession = useCallback((session: Session) => {
    setSelectedSession(session)
    setAutoScroll(true)
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [])

  return (
    <div className="h-full flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — overlay on mobile, inline on desktop */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 304, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-shrink-0 border-r border-[#1e1e2e] overflow-hidden max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:bg-[#0a0a0f]"
          >
            <div className="w-[304px] h-full">
              <SessionList
                sessions={sessions}
                selectedKey={selectedSession?.key ?? null}
                loading={loadingSessions}
                onSelect={handleSelectSession}
                onRefresh={loadSessions}
                onCollapse={() => setSidebarOpen(false)}
                onNewSession={handleNewSession}
                creatingSession={creatingSession}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div className="h-14 flex-shrink-0 px-4 border-b border-[#1e1e2e] flex items-center gap-3 bg-[#0a0a0f]/80 backdrop-blur-sm z-10">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
              title="Show sessions"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
          {selectedSession ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-xl flex-shrink-0">{getChannelEmoji(selectedSession.channel)}</span>
              <div className="min-w-0">
                <h1 className="font-semibold text-sm text-[#e4e4e7] truncate">
                  {formatSessionName(selectedSession)}
                </h1>
                <p className="text-[11px] text-[#52525b] truncate">
                  {selectedSession.model || 'Unknown model'}
                  {selectedSession.totalTokens ? ` · ${selectedSession.totalTokens.toLocaleString()} tokens` : ''}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                {/* Streaming indicator */}
                <AnimatePresence>
                  {isStreaming && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6] text-xs"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Streaming</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Connection indicator */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${
                  wsStatus === 'connected'
                    ? 'text-emerald-400/70 bg-emerald-500/5'
                    : wsStatus === 'connecting' || wsStatus === 'reconnecting'
                    ? 'text-yellow-400/70 bg-yellow-500/5'
                    : 'text-red-400/70 bg-red-500/5'
                }`}>
                  {wsStatus === 'connected' ? (
                    <Wifi className="w-3 h-3" />
                  ) : (
                    <WifiOff className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline capitalize">{wsStatus}</span>
                </div>
              </div>
            </div>
          ) : (
            <h1 className="font-semibold text-sm text-[#52525b]">Select a session</h1>
          )}
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="hover:text-red-300 ml-2 underline">
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scroll-smooth"
        >
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-64 text-[#71717a]">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading history...</span>
              </div>
            ) : !selectedSession ? (
              <div className="flex flex-col items-center justify-center h-64 text-[#52525b]">
                <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Select a session to view messages</p>
                <p className="text-xs mt-1 text-[#3f3f46]">Pick one from the sidebar</p>
              </div>
            ) : streamMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[#52525b]">
                <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No messages in this session yet</p>
                <p className="text-xs mt-1 text-[#3f3f46]">Send a message to get started</p>
              </div>
            ) : (
              <>
                {streamMessages.map((message, index) => (
                  <MessageBubble
                    key={`${index}-${message.timestamp || index}`}
                    message={message}
                    index={index}
                    isStreamingMessage={isStreaming && index === streamMessages.length - 1 && message.role === 'assistant'}
                  />
                ))}

                {/* Typing indicator when streaming starts but no tokens yet */}
                <AnimatePresence>
                  {isStreaming && (streamMessages.length === 0 || streamMessages[streamMessages.length - 1]?.role !== 'assistant') && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex justify-start"
                    >
                      <div className="rounded-2xl rounded-bl-md bg-[#12121a] border border-[#1e1e2e] px-4 py-3">
                        <div className="flex items-center gap-1">
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                            className="w-2 h-2 rounded-full bg-[#8b5cf6]"
                          />
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                            className="w-2 h-2 rounded-full bg-[#8b5cf6]"
                          />
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                            className="w-2 h-2 rounded-full bg-[#8b5cf6]"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll-to-bottom button */}
        <AnimatePresence>
          {showScrollButton && streamMessages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              onClick={scrollToBottom}
              className="absolute bottom-24 right-6 w-10 h-10 rounded-full bg-[#1e1e2e] border border-[#2e2e3e] flex items-center justify-center text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#2a2a3a] shadow-lg shadow-black/30 transition-colors z-20"
              title="Scroll to bottom"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onAbort={handleAbort}
          disabled={!selectedSession || sending}
          isStreaming={isStreaming}
          placeholder={selectedSession ? 'Message Noia...' : 'Select a session first'}
        />
      </div>
    </div>
  )
}
