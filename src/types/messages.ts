// Unified message types for all channels

export interface UnifiedChat {
  id: string
  source: 'clawdbot' | 'whatsapp' | 'imessage'
  identifier: string  // phone number, JID, or session key
  name: string        // resolved contact name or display name
  lastMessageAt: Date
  service?: string    // iMessage, SMS, RCS, etc.
  kind?: 'dm' | 'group' | 'other'
  unread?: number
}

export interface UnifiedMessage {
  id: string
  source: 'clawdbot' | 'whatsapp' | 'imessage'
  chatId: string
  text: string
  sender: string
  senderName?: string
  isFromMe: boolean
  timestamp: Date
  attachments?: string[]
  reactions?: string[]
}

// iMessage specific types
export interface IMessageChat {
  id: number
  identifier: string
  name: string
  service: string
  last_message_at: string
}

export interface IMessageMessage {
  id: number
  chat_id: number
  text: string
  sender: string
  is_from_me: boolean
  created_at: string
  attachments: string[]
  reactions: string[]
  guid: string
}

// WhatsApp specific types
export interface WhatsAppChat {
  JID: string
  Kind: string
  Name: string
  LastMessageTS: string
}

export interface WhatsAppMessage {
  ID: string
  ChatJID: string
  Text: string
  Sender: string
  IsFromMe: boolean
  Timestamp: string
}
