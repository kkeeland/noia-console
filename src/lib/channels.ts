// Channel-specific helpers for the unified Channels view

export interface ChannelConfig {
  id: string
  label: string
  emoji: string
  color: string      // Tailwind-safe accent color
  bgColor: string    // Background tint
  kinds: string[]    // Session kind filters for API
}

export const CHANNELS: ChannelConfig[] = [
  { id: 'all',       label: 'All',       emoji: '📬', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)', kinds: [] },
  { id: 'whatsapp',  label: 'WhatsApp',  emoji: '📱', color: '#25D366', bgColor: 'rgba(37,211,102,0.12)',  kinds: ['whatsapp'] },
  { id: 'imessage',  label: 'iMessage',  emoji: '💬', color: '#34AADC', bgColor: 'rgba(52,170,220,0.12)',  kinds: ['imessage'] },
  { id: 'telegram',  label: 'Telegram',  emoji: '✈️', color: '#0088cc', bgColor: 'rgba(0,136,204,0.12)',   kinds: ['telegram'] },
  { id: 'discord',   label: 'Discord',   emoji: '🎮', color: '#5865F2', bgColor: 'rgba(88,101,242,0.12)',  kinds: ['discord'] },
  { id: 'signal',    label: 'Signal',    emoji: '🔒', color: '#3A76F0', bgColor: 'rgba(58,118,240,0.12)',  kinds: ['signal'] },
  { id: 'webchat',   label: 'Webchat',   emoji: '🌐', color: '#a78bfa', bgColor: 'rgba(167,139,250,0.12)', kinds: ['webchat'] },
]

export function getChannelConfig(id: string): ChannelConfig {
  return CHANNELS.find(c => c.id === id) || CHANNELS[0]
}

export function channelFromSessionKey(key: string): string {
  // Session keys often look like "whatsapp:g-agent-main-main" or "discord:channel-id"
  const prefix = key.split(':')[0]?.toLowerCase() || ''
  const match = CHANNELS.find(c => c.kinds.includes(prefix))
  return match?.id || 'webchat'
}

export function channelFromSession(session: { channel?: string; key: string }): string {
  if (session.channel) {
    const ch = session.channel.toLowerCase()
    const match = CHANNELS.find(c => c.kinds.includes(ch))
    if (match) return match.id
  }
  return channelFromSessionKey(session.key)
}

// Extract a human-readable contact name from a session
export function extractContactName(session: { displayName?: string; key: string }): string {
  if (session.displayName) {
    const parts = session.displayName.split(':')
    if (parts.length > 1) {
      let name = parts.slice(1).join(':')
      // Remove common prefixes
      name = name.replace(/^g-/, '').replace(/^agent-/, '')
      // Convert dashes/underscores to spaces, title case
      name = name
        .split(/[-_]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      return name
    }
    return session.displayName
  }
  return session.key.split(':').pop() || session.key
}

// Format a message preview (single line, truncated)
export function messagePreview(text: string, maxLen = 60): string {
  const line = text.replace(/\n+/g, ' ').trim()
  if (line.length <= maxLen) return line
  return line.slice(0, maxLen) + '…'
}

// Format timestamp for conversation list
export function formatConversationTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const date = new Date(ts)
  const today = new Date()

  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Check if yesterday
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  // Check if this week
  if (diff < 7 * 86_400_000) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
