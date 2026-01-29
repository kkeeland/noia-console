// React hooks for Gateway WebSocket

import { useState, useEffect, useCallback, useRef } from 'react'
import { getGateway, type ConnectionState } from '../lib/gateway-ws'
import { getGatewayUrl, getGatewayToken } from '../lib/config'
import type { Message } from '../types/clawdbot'

/**
 * Returns the current WebSocket connection state.
 */
export function useGatewayStatus(): ConnectionState {
  const [state, setState] = useState<ConnectionState>(() => getGateway().getState())

  useEffect(() => {
    const gw = getGateway()
    setState(gw.getState())

    const handler = (newState: unknown) => {
      setState(newState as ConnectionState)
    }
    gw.on('connectionState', handler)
    return () => gw.off('connectionState', handler)
  }, [])

  return state
}

/**
 * Returns detailed gateway status: state, reconnect attempts, last connected, latency.
 */
export function useGatewayStatusDetail() {
  const state = useGatewayStatus()
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [lastConnectedAt, setLastConnectedAt] = useState<number | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  useEffect(() => {
    const gw = getGateway()

    const handler = (newState: unknown) => {
      const s = newState as ConnectionState
      if (s === 'reconnecting') {
        setReconnectAttempts(prev => prev + 1)
      } else if (s === 'connected') {
        setReconnectAttempts(0)
        setLastConnectedAt(Date.now())
      }
    }
    gw.on('connectionState', handler)

    // Measure latency periodically
    const interval = setInterval(() => {
      if (gw.isConnected()) {
        const start = performance.now()
        // Use a lightweight request to measure latency
        fetch(`${getGatewayUrl()}/tools/invoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getGatewayToken()}` },
          body: JSON.stringify({ tool: 'session_status', args: {} }),
          signal: AbortSignal.timeout(5000),
        })
          .then(() => setLatencyMs(Math.round(performance.now() - start)))
          .catch(() => setLatencyMs(null))
      }
    }, 15000)

    return () => {
      gw.off('connectionState', handler)
      clearInterval(interval)
    }
  }, [])

  return { state, reconnectAttempts, lastConnectedAt, latencyMs }
}

/**
 * Subscribe to a gateway event. Callback is stable across re-renders via ref.
 */
export function useGatewayEvent(eventName: string, callback: (data: unknown) => void): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const gw = getGateway()
    const handler = (data: unknown) => callbackRef.current(data)
    gw.on(eventName, handler)
    return () => gw.off(eventName, handler)
  }, [eventName])
}

/**
 * Streaming token event shape from gateway
 */
interface ChatStreamEvent {
  sessionKey?: string
  message?: Message
  type?: string
  // Token-level streaming
  token?: string
  text?: string
  delta?: string
  // Thinking streaming
  thinking?: string
  thinkingDelta?: string
}

/**
 * Chat stream hook — accumulates messages from WS events for a session.
 * Supports token-by-token streaming with real-time rendering.
 */
export function useChatStream(sessionKey: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamingThinking, setStreamingThinking] = useState('')
  const streamingRef = useRef({ text: '', thinking: '' })

  // Handle chat events (full message updates)
  useGatewayEvent('chat', useCallback((data: unknown) => {
    const evt = data as ChatStreamEvent
    if (!sessionKey || evt.sessionKey !== sessionKey) return

    if (evt.type === 'stream_start') {
      setIsStreaming(true)
      streamingRef.current = { text: '', thinking: '' }
      setStreamingText('')
      setStreamingThinking('')
      return
    }

    if (evt.type === 'stream_end') {
      setIsStreaming(false)
      // Finalize: if we have accumulated streaming text, build a proper message
      if (streamingRef.current.text || streamingRef.current.thinking) {
        const content: Message['content'] = []
        if (streamingRef.current.thinking) {
          content.push({ type: 'thinking', thinking: streamingRef.current.thinking })
        }
        if (streamingRef.current.text) {
          content.push({ type: 'text', text: streamingRef.current.text })
        }
        const finalMsg: Message = {
          role: 'assistant',
          content,
          timestamp: Date.now(),
        }
        setMessages(prev => {
          // Replace last assistant message if it was a streaming placeholder
          if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
            return [...prev.slice(0, -1), finalMsg]
          }
          return [...prev, finalMsg]
        })
        streamingRef.current = { text: '', thinking: '' }
        setStreamingText('')
        setStreamingThinking('')
      }
      return
    }

    if (evt.type === 'stream_delta' && evt.message) {
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
          return [...prev.slice(0, -1), evt.message!]
        }
        return [...prev, evt.message!]
      })
      return
    }

    if (evt.message) {
      setMessages(prev => [...prev, evt.message!])
    }
  }, [sessionKey]))

  // Handle token-level streaming events
  useGatewayEvent('chat.token', useCallback((data: unknown) => {
    const evt = data as ChatStreamEvent
    if (!sessionKey || evt.sessionKey !== sessionKey) return

    const token = evt.token || evt.delta || evt.text || ''
    if (!token) return

    streamingRef.current.text += token
    setStreamingText(streamingRef.current.text)

    // Build a live assistant message from accumulated tokens
    const content: Message['content'] = []
    if (streamingRef.current.thinking) {
      content.push({ type: 'thinking', thinking: streamingRef.current.thinking })
    }
    content.push({ type: 'text', text: streamingRef.current.text })

    const liveMsg: Message = {
      role: 'assistant',
      content,
      timestamp: Date.now(),
    }
    setMessages(prev => {
      if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
        return [...prev.slice(0, -1), liveMsg]
      }
      return [...prev, liveMsg]
    })
  }, [sessionKey]))

  // Handle streaming events (alternate event name)
  useGatewayEvent('chat.stream', useCallback((data: unknown) => {
    const evt = data as ChatStreamEvent
    if (!sessionKey || evt.sessionKey !== sessionKey) return

    // Stream start/end
    if (evt.type === 'start') {
      setIsStreaming(true)
      streamingRef.current = { text: '', thinking: '' }
      setStreamingText('')
      setStreamingThinking('')
      return
    }
    if (evt.type === 'end' || evt.type === 'done') {
      setIsStreaming(false)
      return
    }

    // Token delta
    const token = evt.token || evt.delta || evt.text || ''
    if (token) {
      streamingRef.current.text += token
      setStreamingText(streamingRef.current.text)
    }

    // Thinking delta
    const thinkDelta = evt.thinkingDelta || evt.thinking || ''
    if (thinkDelta) {
      streamingRef.current.thinking += thinkDelta
      setStreamingThinking(streamingRef.current.thinking)
    }
  }, [sessionKey]))

  // Reset when session changes
  useEffect(() => {
    setMessages([])
    setIsStreaming(false)
    setStreamingText('')
    setStreamingThinking('')
    streamingRef.current = { text: '', thinking: '' }
  }, [sessionKey])

  const appendMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg])
  }, [])

  const replaceMessages = useCallback((msgs: Message[]) => {
    setMessages(msgs)
  }, [])

  return {
    messages,
    isStreaming,
    streamingText,
    streamingThinking,
    appendMessage,
    replaceMessages,
  }
}

/**
 * Get the gateway instance for imperative use
 */
export function useGateway() {
  return getGateway()
}
