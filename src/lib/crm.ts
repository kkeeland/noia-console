// CRM data layer — unified contact model from contacts.json, Gmail, iMessage, WhatsApp

// ── Types ──────────────────────────────────────────────

export type ChannelType = 'phone' | 'email' | 'imessage' | 'whatsapp' | 'gmail'

export interface ChannelPresence {
  type: ChannelType
  handle: string
  lastSeen?: number
}

export interface Contact {
  id: string
  name: string
  phones: string[]
  emails: string[]
  channels: ChannelPresence[]
  lastContact: number // timestamp
  interactionCount: number
  tags: string[]
  notes: string
}

export type HeatLevel = 'hot' | 'warm' | 'cold' | 'frozen'

// ── Data loaders (local dev server endpoints) ──────────

interface ContactsJsonEntry {
  [phone: string]: string
}

export async function loadContactsJson(): Promise<Map<string, string>> {
  try {
    const res = await fetch('/data/contacts')
    if (!res.ok) return new Map()
    const parsed: ContactsJsonEntry = await res.json()
    return new Map(Object.entries(parsed))
  } catch {
    return new Map()
  }
}

export async function loadCrmData(): Promise<Record<string, { tags: string[]; notes: string }>> {
  try {
    const res = await fetch('/data/crm')
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

export async function saveCrmData(data: Record<string, { tags: string[]; notes: string }>): Promise<void> {
  await fetch('/data/crm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data, null, 2),
  })
}

// ── Build contacts from all sources ────────────────────

function normalizePhone(phone: string): string {
  return phone.replace(/[^+\d]/g, '')
}

function nameToId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown'
}

export function getHeatLevel(lastContact: number): HeatLevel {
  const daysSince = (Date.now() - lastContact) / (1000 * 60 * 60 * 24)
  if (daysSince < 2) return 'hot'
  if (daysSince < 7) return 'warm'
  if (daysSince < 30) return 'cold'
  return 'frozen'
}

export function getHeatConfig(level: HeatLevel): { color: string; bg: string; label: string } {
  switch (level) {
    case 'hot': return { color: 'text-red-400', bg: 'bg-red-500/10', label: '🔥 Hot' }
    case 'warm': return { color: 'text-amber-400', bg: 'bg-amber-500/10', label: '☀️ Warm' }
    case 'cold': return { color: 'text-blue-400', bg: 'bg-blue-500/10', label: '❄️ Cold' }
    case 'frozen': return { color: 'text-zinc-500', bg: 'bg-zinc-500/10', label: '🧊 Frozen' }
  }
}

export function getChannelIcon(type: ChannelType): string {
  switch (type) {
    case 'gmail': return '📧'
    case 'imessage': return '💬'
    case 'whatsapp': return '📱'
    case 'phone': return '📞'
    case 'email': return '✉️'
    default: return '💬'
  }
}

export async function fetchContacts(): Promise<Contact[]> {
  const [contactsMap, crmData] = await Promise.all([
    loadContactsJson(),
    loadCrmData(),
  ])

  // Group by name
  const byName = new Map<string, Contact>()

  for (const [phone, name] of contactsMap) {
    if (!name || name === 'Unknown') continue
    const normalized = normalizePhone(phone)
    const id = nameToId(name)

    let contact = byName.get(name)
    if (!contact) {
      const crm = crmData[id]
      contact = {
        id,
        name,
        phones: [],
        emails: [],
        channels: [],
        lastContact: 0,
        interactionCount: 0,
        tags: crm?.tags || [],
        notes: crm?.notes || '',
      }
      byName.set(name, contact)
    }

    if (normalized && !contact.phones.includes(normalized)) {
      contact.phones.push(normalized)
      contact.channels.push({ type: 'phone', handle: normalized })
    }
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Never'
  const now = Date.now()
  const diff = now - timestamp
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return `${Math.floor(diff / 604800000)}w ago`
}
