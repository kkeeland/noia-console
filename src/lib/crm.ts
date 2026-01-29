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
  blocked: boolean
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

// ── Blocklist (Do Not Contact) ─────────────────────────
// Format: array of { id, name, phones[], blockedAt }
// Stores phone numbers alongside IDs for system-level enforcement

export interface BlocklistEntry {
  id: string
  name: string
  phones: string[]
  blockedAt: string // ISO timestamp
  reason?: string   // e.g. "court order", "do not contact"
}

export async function loadBlocklistEntries(): Promise<BlocklistEntry[]> {
  try {
    const res = await fetch('/data/blocklist')
    if (!res.ok) return []
    const data = await res.json()
    // Support both old format (string[]) and new format (BlocklistEntry[])
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
      // Legacy: array of IDs — migrate
      return data.map((id: string) => ({ id, name: id, phones: [], blockedAt: new Date().toISOString() }))
    }
    return data as BlocklistEntry[]
  } catch {
    return []
  }
}

export async function loadBlocklist(): Promise<Set<string>> {
  const entries = await loadBlocklistEntries()
  return new Set(entries.map(e => e.id))
}

export async function saveBlocklistEntries(entries: BlocklistEntry[]): Promise<void> {
  await fetch('/data/blocklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries, null, 2),
  })
}

export async function blockContact(contactId: string, contactName: string, phones: string[]): Promise<void> {
  const entries = await loadBlocklistEntries()
  if (!entries.some(e => e.id === contactId)) {
    entries.push({
      id: contactId,
      name: contactName,
      phones,
      blockedAt: new Date().toISOString(),
      reason: 'do not contact',
    })
    await saveBlocklistEntries(entries)
  }
}

export async function unblockContact(contactId: string): Promise<void> {
  const entries = await loadBlocklistEntries()
  await saveBlocklistEntries(entries.filter(e => e.id !== contactId))
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

export interface FetchContactsOpts {
  includeBlocked?: boolean  // default: false — blocked contacts hidden
}

export async function fetchContacts(opts: FetchContactsOpts = {}): Promise<Contact[]> {
  const [contactsMap, crmData, blocklist] = await Promise.all([
    loadContactsJson(),
    loadCrmData(),
    loadBlocklist(),
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
        blocked: blocklist.has(id),
      }
      byName.set(name, contact)
    }

    if (normalized && !contact.phones.includes(normalized)) {
      contact.phones.push(normalized)
      contact.channels.push({ type: 'phone', handle: normalized })
    }
  }

  let result = Array.from(byName.values())

  // Filter out blocked contacts unless explicitly requested
  if (!opts.includeBlocked) {
    result = result.filter(c => !c.blocked)
  }

  return result.sort((a, b) => a.name.localeCompare(b.name))
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
