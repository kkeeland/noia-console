// Unified messaging API for iMessage, WhatsApp, and Clawdbot sessions

import type { IMessageChat, IMessageMessage, WhatsAppChat, UnifiedChat } from '../types/messages'
import { lookupContact, formatPhone } from './contacts/index'
import { getGatewayUrl, getGatewayToken } from './config'

async function execCommand(command: string): Promise<string> {
  const response = await fetch(`${getGatewayUrl()}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getGatewayToken()}`,
    },
    body: JSON.stringify({ tool: 'exec', args: { command } }),
  })
  
  const data = await response.json()
  if (data.ok && data.result?.content?.[0]?.text) {
    return data.result.content[0].text
  }
  throw new Error(data.error?.message || 'Command failed')
}

// ============ iMessage ============

export async function getIMessageChats(limit = 20): Promise<UnifiedChat[]> {
  const output = await execCommand(`imsg chats --limit ${limit} --json`)
  const lines = output.trim().split('\n').filter(Boolean)
  
  const chats: UnifiedChat[] = []
  
  for (const line of lines) {
    try {
      const chat: IMessageChat = JSON.parse(line)
      
      // Lookup contact name
      let name = chat.name
      if (!name || name === chat.identifier) {
        const contact = await lookupContact(chat.identifier)
        name = contact?.fullName || formatPhone(chat.identifier)
      }
      
      chats.push({
        id: `imessage:${chat.id}`,
        source: 'imessage',
        identifier: chat.identifier,
        name,
        lastMessageAt: new Date(chat.last_message_at),
        service: chat.service,
        kind: 'dm',
      })
    } catch (e) {
      console.error('Failed to parse iMessage chat:', e)
    }
  }
  
  return chats
}

export async function getIMessageHistory(chatId: number, limit = 50): Promise<IMessageMessage[]> {
  const output = await execCommand(`imsg history --chat-id ${chatId} --limit ${limit} --json`)
  const lines = output.trim().split('\n').filter(Boolean)
  
  return lines.map(line => JSON.parse(line) as IMessageMessage)
}

// ============ WhatsApp ============

export async function getWhatsAppChats(limit = 20): Promise<UnifiedChat[]> {
  const output = await execCommand(`wacli chats list --limit ${limit} --json`)
  const data = JSON.parse(output)
  
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to get WhatsApp chats')
  }
  
  return data.data.map((chat: WhatsAppChat) => ({
    id: `whatsapp:${chat.JID}`,
    source: 'whatsapp' as const,
    identifier: chat.JID,
    name: chat.Name || chat.JID,
    lastMessageAt: new Date(chat.LastMessageTS),
    kind: chat.Kind === 'group' ? 'group' : 'dm',
  }))
}

export async function getWhatsAppHistory(jid: string, limit = 50): Promise<unknown[]> {
  const output = await execCommand(`wacli messages list --chat "${jid}" --limit ${limit} --json`)
  const data = JSON.parse(output)
  
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to get WhatsApp messages')
  }
  
  return data.data
}

// ============ Unified ============

export async function getAllChats(limit = 20): Promise<UnifiedChat[]> {
  const results = await Promise.allSettled([
    getIMessageChats(limit),
    getWhatsAppChats(limit),
  ])
  
  const chats: UnifiedChat[] = []
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      chats.push(...result.value)
    } else {
      console.error('Failed to fetch chats:', result.reason)
    }
  }
  
  // Sort by last message time
  return chats.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
}
