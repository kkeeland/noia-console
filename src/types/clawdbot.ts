// Clawdbot API Types

export interface Session {
  key: string
  kind: 'dm' | 'group' | 'other'
  channel: string
  displayName: string
  updatedAt: number
  sessionId: string
  model?: string
  totalTokens?: number
  lastChannel?: string
  transcriptPath?: string
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: MessageContent[]
  timestamp?: number
}

export type MessageContent = 
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'toolCall'; id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'toolResult'; id: string; content: string }

export interface SessionsListResponse {
  count: number
  sessions: Session[]
}

export interface SessionHistoryResponse {
  sessionKey: string
  messages: Message[]
}
