// Gateway WebSocket Client
// Singleton WebSocket connection to Clawdbot Gateway with auto-reconnect

import { getConfig } from './config'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface GatewayEvent {
  event: string
  data: unknown
}

export interface GatewayRequest {
  id: string
  method: string
  params?: Record<string, unknown>
}

export interface GatewayResponse {
  id?: string
  result?: unknown
  error?: { code: number; message: string }
  event?: string
  data?: unknown
}

type EventHandler = (data: unknown) => void

let _instance: GatewayWS | null = null

export class GatewayWS {
  private ws: WebSocket | null = null
  private url: string
  private token: string
  private state: ConnectionState = 'disconnected'
  private listeners = new Map<string, Set<EventHandler>>()
  private pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>()
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private idCounter = 0
  private destroyed = false

  // Reconnect config
  private readonly BASE_DELAY = 1000
  private readonly MAX_DELAY = 30000
  private readonly REQUEST_TIMEOUT = 30000

  constructor(url: string, token: string) {
    this.url = url
    this.token = token
  }

  static getInstance(): GatewayWS {
    if (!_instance) {
      const config = getConfig()
      const wsUrl = config.gatewayUrl.replace(/^http/, 'ws')
      _instance = new GatewayWS(wsUrl, config.gatewayToken)
    }
    return _instance
  }

  /** Reset singleton (e.g. when config changes) */
  static resetInstance(): void {
    if (_instance) {
      _instance.disconnect()
      _instance = null
    }
  }

  // --- Connection ---

  connect(): void {
    if (this.destroyed || this.state === 'connecting' || this.state === 'connected') return

    this.setState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting')

    try {
      // Pass token as query param for auth
      const wsUrl = new URL(this.url)
      if (this.token) {
        wsUrl.searchParams.set('token', this.token)
      }

      this.ws = new WebSocket(wsUrl.toString())
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)
    } catch (err) {
      console.error('[GatewayWS] Connection error:', err)
      this.scheduleReconnect()
    }
  }

  disconnect(): void {
    this.destroyed = true
    this.cleanup()
    this.setState('disconnected')
  }

  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Connection closed'))
      this.pendingRequests.delete(id)
    }
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }
      this.ws = null
    }
  }

  // --- Handlers ---

  private handleOpen(): void {
    console.log('[GatewayWS] Connected')
    this.reconnectAttempt = 0
    this.setState('connected')
    // Gateway manages its own keepalive — no custom heartbeat needed

    // Token is passed as query param during connection — no separate auth frame needed
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const msg: GatewayResponse = JSON.parse(event.data)

      // Handle RPC response (has id)
      if (msg.id && this.pendingRequests.has(msg.id)) {
        const pending = this.pendingRequests.get(msg.id)!
        this.pendingRequests.delete(msg.id)
        clearTimeout(pending.timer)
        if (msg.error) {
          pending.reject(new Error(msg.error.message))
        } else {
          pending.resolve(msg.result)
        }
        return
      }

      // Handle event push
      if (msg.event) {
        this.emit(msg.event, msg.data)
        // Also emit wildcard
        this.emit('*', { event: msg.event, data: msg.data })
        return
      }

      // Unknown message shape — still emit as raw
      this.emit('raw', msg)
    } catch (err) {
      console.warn('[GatewayWS] Failed to parse message:', err)
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('[GatewayWS] Disconnected:', event.code, event.reason)
    this.cleanup()
    if (!this.destroyed) {
      this.setState('disconnected')
      this.scheduleReconnect()
    }
  }

  private handleError(event: Event): void {
    console.error('[GatewayWS] Error:', event)
    // onclose will fire after onerror, so reconnect happens there
  }

  // --- Reconnect ---

  private scheduleReconnect(): void {
    if (this.destroyed || this.reconnectTimer) return

    const delay = Math.min(
      this.BASE_DELAY * Math.pow(2, this.reconnectAttempt),
      this.MAX_DELAY
    )
    this.reconnectAttempt++

    console.log(`[GatewayWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`)
    this.setState('reconnecting')

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  // --- Heartbeat ---

  // --- State ---

  private setState(state: ConnectionState): void {
    if (this.state === state) return
    this.state = state
    this.emit('connectionState', state)
  }

  getState(): ConnectionState {
    return this.state
  }

  isConnected(): boolean {
    return this.state === 'connected'
  }

  // --- Event Emitter ---

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler)
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data)
        } catch (err) {
          console.error(`[GatewayWS] Error in handler for "${event}":`, err)
        }
      }
    }
  }

  // --- RPC ---

  private nextId(): string {
    return `noia-${++this.idCounter}-${Date.now()}`
  }

  private sendRaw(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('WebSocket not connected'))
        return
      }

      const id = this.nextId()
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request timeout: ${method}`))
      }, this.REQUEST_TIMEOUT)

      this.pendingRequests.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      })

      this.sendRaw({ id, method, params })
    })
  }

  // --- Chat Methods ---

  async chatSend(sessionKey: string, message: string, opts?: Record<string, unknown>): Promise<unknown> {
    return this.request('chat.send', { sessionKey, message, ...opts })
  }

  async chatHistory(sessionKey: string, limit = 50): Promise<unknown> {
    return this.request('chat.history', { sessionKey, limit })
  }

  async chatAbort(sessionKey: string): Promise<unknown> {
    return this.request('chat.abort', { sessionKey })
  }

  async chatInject(sessionKey: string, role: string, content: string): Promise<unknown> {
    return this.request('chat.inject', { sessionKey, role, content })
  }
}

// Get singleton — call .connect() once at app init (useGatewayConnect hook).
// Falls back to HTTP /tools/invoke when WS is disconnected.
export function getGateway(): GatewayWS {
  return GatewayWS.getInstance()
}
