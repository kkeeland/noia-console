// Native channel data fetcher — pulls messages directly from wacli/imsg CLIs
// via the Clawdbot Gateway exec tool, plus contacts.json for name resolution.

import { getGatewayUrl, getGatewayToken } from './config'

// ─── Types ────────────────────────────────────────────────────────────

export type ChannelSource = 'whatsapp' | 'imessage' | 'telegram'

export interface NativeConversation {
  id: string               // unique key (JID for WA, chat_id for iMsg)
  channel: ChannelSource
  name: string             // resolved contact name or raw identifier
  identifier: string       // phone/JID/handle
  lastMessageAt: string    // ISO timestamp
  lastMessagePreview?: string
  isGroup: boolean
  unread?: boolean         // heuristic: recent + not from me
}

export interface NativeMessage {
  id: string
  channel: ChannelSource
  conversationId: string
  sender: string           // resolved name
  senderRaw: string        // raw phone/JID
  text: string
  timestamp: string        // ISO
  isFromMe: boolean
  attachments?: string[]
}

// ─── Gateway exec helper ──────────────────────────────────────────────

async function gatewayExec(command: string): Promise<string> {
  const url = getGatewayUrl()
  const token = getGatewayToken()

  const res = await fetch(`${url}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ tool: 'exec', args: { command } }),
  })

  if (!res.ok) throw new Error(`Gateway exec failed: ${res.status}`)
  const data = await res.json()
  if (!data.ok) throw new Error(data.error?.message || 'exec failed')

  // Extract text from content array
  const text = data.result?.content
    ?.filter((c: { type: string }) => c.type === 'text')
    ?.map((c: { text: string }) => c.text)
    ?.join('\n') || ''
  return text
}

// ─── Contacts resolver ────────────────────────────────────────────────

let contactsCache: Record<string, string> | null = null
let contactsLoadedAt = 0
const CONTACTS_TTL = 5 * 60_000 // refresh every 5 min

export async function loadContacts(): Promise<Record<string, string>> {
  if (contactsCache && Date.now() - contactsLoadedAt < CONTACTS_TTL) {
    return contactsCache
  }
  try {
    const raw = await gatewayExec('cat ~/clawd/contacts.json')
    contactsCache = JSON.parse(raw)
    contactsLoadedAt = Date.now()
    return contactsCache!
  } catch (err) {
    console.warn('Failed to load contacts.json:', err)
    return contactsCache || {}
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

export function resolveContact(identifier: string, contacts: Record<string, string>): string {
  // Direct match
  if (contacts[identifier]) return contacts[identifier]

  // Try with +
  if (!identifier.startsWith('+') && contacts[`+${identifier}`]) {
    return contacts[`+${identifier}`]
  }

  // Normalize and match by last 10 digits
  const norm = normalizePhone(identifier)
  for (const [key, name] of Object.entries(contacts)) {
    if (normalizePhone(key) === norm) return name
  }

  // Extract phone from WhatsApp JID (e.g. "15035398269@s.whatsapp.net")
  const jidMatch = identifier.match(/^(\d+)@/)
  if (jidMatch) {
    const phone = jidMatch[1]
    const phoneNorm = normalizePhone(phone)
    for (const [key, name] of Object.entries(contacts)) {
      if (normalizePhone(key) === phoneNorm) return name
    }
    // Format as phone number if long enough
    if (phone.length >= 10) {
      const d = phone.length === 11 && phone[0] === '1' ? phone.slice(1) : phone.slice(-10)
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    }
  }

  return identifier
}

// ─── WhatsApp data ────────────────────────────────────────────────────

interface WaChatRaw {
  JID: string
  Kind: string
  Name: string
  LastMessageTS: string
}

interface WaMessageRaw {
  ChatJID: string
  ChatName: string
  MsgID: string
  SenderJID: string
  Timestamp: string
  FromMe: boolean
  Text: string
  DisplayText: string
  MediaType: string
  Snippet: string
}

export async function fetchWhatsAppChats(contacts: Record<string, string>): Promise<NativeConversation[]> {
  try {
    const raw = await gatewayExec('wacli chats list --json')
    const parsed = JSON.parse(raw)
    if (!parsed.success || !parsed.data) return []

    return (parsed.data as WaChatRaw[]).map(chat => {
      const resolvedName = chat.Name && !chat.Name.includes('@')
        ? chat.Name
        : resolveContact(chat.JID, contacts)

      return {
        id: `wa:${chat.JID}`,
        channel: 'whatsapp' as const,
        name: resolvedName,
        identifier: chat.JID,
        lastMessageAt: chat.LastMessageTS,
        isGroup: chat.Kind === 'group',
      }
    })
  } catch (err) {
    console.warn('Failed to fetch WhatsApp chats:', err)
    return []
  }
}

export async function fetchWhatsAppMessages(
  chatJID: string,
  contacts: Record<string, string>,
  limit = 50,
): Promise<NativeMessage[]> {
  try {
    const raw = await gatewayExec(`wacli messages list --chat "${chatJID}" --limit ${limit} --json`)
    const parsed = JSON.parse(raw)
    if (!parsed.success || !parsed.data?.messages) return []

    return (parsed.data.messages as WaMessageRaw[]).map(msg => ({
      id: `wa:${msg.MsgID}`,
      channel: 'whatsapp' as const,
      conversationId: `wa:${msg.ChatJID}`,
      sender: msg.FromMe ? 'You' : resolveContact(msg.SenderJID, contacts),
      senderRaw: msg.SenderJID,
      text: msg.Text || msg.DisplayText || msg.Snippet || '(media)',
      timestamp: msg.Timestamp,
      isFromMe: msg.FromMe,
    }))
  } catch (err) {
    console.warn('Failed to fetch WhatsApp messages:', err)
    return []
  }
}

// ─── iMessage data ────────────────────────────────────────────────────

interface ImsgChatRaw {
  id: number
  name: string
  identifier: string
  service: string
  last_message_at: string
}

interface ImsgMessageRaw {
  id: number
  guid: string
  sender: string
  text: string
  is_from_me: boolean
  created_at: string
  chat_id: number
  reactions?: unknown[]
  attachments?: { filename: string }[]
}

export async function fetchIMessageChats(contacts: Record<string, string>): Promise<NativeConversation[]> {
  try {
    const raw = await gatewayExec('imsg chats --json --limit 50')
    // imsg outputs JSONL (one JSON object per line)
    const chats = raw.trim().split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l) as ImsgChatRaw)

    return chats.map(chat => ({
      id: `im:${chat.id}`,
      channel: 'imessage' as const,
      name: chat.name || resolveContact(chat.identifier, contacts),
      identifier: chat.identifier,
      lastMessageAt: chat.last_message_at,
      isGroup: false, // imsg doesn't easily expose this
    }))
  } catch (err) {
    console.warn('Failed to fetch iMessage chats:', err)
    return []
  }
}

export async function fetchIMessageMessages(
  chatId: number,
  contacts: Record<string, string>,
  limit = 50,
): Promise<NativeMessage[]> {
  try {
    const raw = await gatewayExec(`imsg history --chat-id ${chatId} --limit ${limit} --json`)
    const messages = raw.trim().split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l) as ImsgMessageRaw)

    return messages.map(msg => ({
      id: `im:${msg.guid}`,
      channel: 'imessage' as const,
      conversationId: `im:${msg.chat_id}`,
      sender: msg.is_from_me ? 'You' : resolveContact(msg.sender, contacts),
      senderRaw: msg.sender,
      text: msg.text || '(attachment)',
      timestamp: msg.created_at,
      isFromMe: msg.is_from_me,
      attachments: msg.attachments?.map(a => a.filename),
    }))
  } catch (err) {
    console.warn('Failed to fetch iMessage messages:', err)
    return []
  }
}

// ─── Unified fetch ────────────────────────────────────────────────────

export async function fetchAllConversations(): Promise<{
  conversations: NativeConversation[]
  contacts: Record<string, string>
}> {
  const contacts = await loadContacts()
  const [waChats, imChats] = await Promise.all([
    fetchWhatsAppChats(contacts),
    fetchIMessageChats(contacts),
  ])

  const conversations = [...waChats, ...imChats]
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

  // Mark recent messages as "unread" (within last 2 hours)
  const twoHoursAgo = Date.now() - 2 * 60 * 60_000
  for (const c of conversations) {
    c.unread = new Date(c.lastMessageAt).getTime() > twoHoursAgo
  }

  return { conversations, contacts }
}

export async function fetchConversationMessages(
  conversation: NativeConversation,
  contacts: Record<string, string>,
  limit = 50,
): Promise<NativeMessage[]> {
  if (conversation.channel === 'whatsapp') {
    return fetchWhatsAppMessages(conversation.identifier, contacts, limit)
  }
  if (conversation.channel === 'imessage') {
    const chatId = parseInt(conversation.id.replace('im:', ''), 10)
    return fetchIMessageMessages(chatId, contacts, limit)
  }
  return []
}

// ─── Send via gateway message tool ────────────────────────────────────

export async function sendNativeMessage(
  channel: ChannelSource,
  target: string,
  message: string,
): Promise<void> {
  const url = getGatewayUrl()
  const token = getGatewayToken()

  const res = await fetch(`${url}/tools/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      tool: 'message',
      args: {
        action: 'send',
        channel,
        target,
        message,
      },
    }),
  })

  if (!res.ok) throw new Error(`Send failed: ${res.status}`)
  const data = await res.json()
  if (!data.ok) throw new Error(data.error?.message || 'Send failed')
}
