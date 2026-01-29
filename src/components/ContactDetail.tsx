import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Phone,
  Mail,
  Save,
  Tag,
  Plus,
  X,
  User,
  Ban,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import type { Contact } from '../lib/crm'
import { getHeatLevel, getHeatConfig, getChannelIcon, saveCrmData, loadCrmData, blockContact, unblockContact } from '../lib/crm'

interface ContactDetailProps {
  contact: Contact
  onBack: () => void
  onUpdate: (contact: Contact) => void
}

export default function ContactDetail({ contact, onBack, onUpdate }: ContactDetailProps) {
  const [notes, setNotes] = useState(contact.notes)
  const [tags, setTags] = useState<string[]>(contact.tags)
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [blocking, setBlocking] = useState(false)

  const heat = getHeatLevel(contact.lastContact)
  const heatConfig = getHeatConfig(heat)

  const initials = contact.name
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const crmData = await loadCrmData()
      crmData[contact.id] = { tags, notes }
      await saveCrmData(crmData)
      onUpdate({ ...contact, tags, notes })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }, [contact, tags, notes, onUpdate])

  const addTag = useCallback(() => {
    const tag = newTag.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setNewTag('')
    }
  }, [newTag, tags])

  const removeTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }, [tags])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="border-b border-[#1e1e2e] px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[#71717a] hover:text-[#e4e4e7] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to People
        </button>

        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/30 to-[#6d28d9]/20 border border-[#27272a] flex items-center justify-center">
            <span className="text-xl font-bold text-[#a78bfa]">{initials}</span>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#e4e4e7]">{contact.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {contact.lastContact > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${heatConfig.bg} ${heatConfig.color}`}>
                  {heatConfig.label}
                </span>
              )}
              {contact.channels.length > 0 && (
                <div className="flex items-center gap-1">
                  {contact.channels.map((ch, i) => (
                    <span key={i} className="text-sm" title={`${ch.type}: ${ch.handle}`}>
                      {getChannelIcon(ch.type)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Contact Info */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-[#52525b] mb-3 flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Contact Info
          </h2>
          <div className="space-y-2">
            {contact.phones.map(phone => (
              <div key={phone} className="flex items-center gap-3 p-3 rounded-lg bg-[#12121a] border border-[#1e1e2e]">
                <Phone className="w-4 h-4 text-[#52525b]" />
                <span className="text-sm font-mono text-[#a1a1aa]">{phone}</span>
              </div>
            ))}
            {contact.emails.map(email => (
              <div key={email} className="flex items-center gap-3 p-3 rounded-lg bg-[#12121a] border border-[#1e1e2e]">
                <Mail className="w-4 h-4 text-[#52525b]" />
                <span className="text-sm text-[#a1a1aa]">{email}</span>
              </div>
            ))}
            {contact.phones.length === 0 && contact.emails.length === 0 && (
              <p className="text-sm text-[#52525b]">No contact info available</p>
            )}
          </div>
        </section>

        {/* Tags */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-[#52525b] mb-3 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" />
            Tags
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map(tag => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#8b5cf6]/10 text-[#a78bfa] border border-[#8b5cf6]/20"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
              placeholder="Add tag…"
              className="flex-1 text-sm px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-[#e4e4e7] placeholder-[#3f3f46] focus:outline-none focus:border-[#8b5cf6]/40"
            />
            <button
              onClick={addTag}
              disabled={!newTag.trim()}
              className="p-2 rounded-lg bg-[#1e1e2e] text-[#71717a] hover:text-[#8b5cf6] transition-colors disabled:opacity-30"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Notes */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-[#52525b] mb-3">Notes</h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this contact…"
            className="w-full h-32 text-sm px-4 py-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-[#e4e4e7] placeholder-[#3f3f46] focus:outline-none focus:border-[#8b5cf6]/40 resize-none"
          />
        </section>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#8b5cf6] text-white text-sm font-medium hover:bg-[#7c3aed] transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
        </button>

        {/* Block / Unblock Section */}
        <div className="mt-8 pt-6 border-t border-[#1e1e2e]">
          {contact.blocked ? (
            /* Currently blocked — show unblock */
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Do Not Contact</span>
              </div>
              <p className="text-xs text-[#71717a] mb-3">
                This contact is blocked. They are hidden from the People list and will never be contacted.
              </p>
              <button
                onClick={async () => {
                  setBlocking(true)
                  try {
                    await unblockContact(contact.id)
                    onUpdate({ ...contact, blocked: false })
                    onBack()
                  } finally {
                    setBlocking(false)
                  }
                }}
                disabled={blocking}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e1e2e] border border-[#27272a] text-sm text-[#a1a1aa] hover:text-green-400 hover:border-green-500/30 transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {blocking ? 'Unblocking…' : 'Unblock Contact'}
              </button>
            </div>
          ) : (
            /* Not blocked — show block option */
            <>
              {!showBlockConfirm ? (
                <button
                  onClick={() => setShowBlockConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#52525b] hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  Block — Do Not Contact
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-red-500/10 border border-red-500/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-semibold text-red-400">Block this contact?</span>
                  </div>
                  <p className="text-xs text-[#a1a1aa] mb-4">
                    <strong>{contact.name}</strong> will be hidden from the People list and{' '}
                    <span className="text-red-400 font-semibold">never contacted</span>. You can unblock them later from the Blocked filter.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setBlocking(true)
                        try {
                          await blockContact(contact.id, contact.name, contact.phones)
                          onUpdate({ ...contact, blocked: true })
                          onBack()
                        } finally {
                          setBlocking(false)
                        }
                      }}
                      disabled={blocking}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-4 h-4" />
                      {blocking ? 'Blocking…' : 'Yes, Block Forever'}
                    </button>
                    <button
                      onClick={() => setShowBlockConfirm(false)}
                      className="px-4 py-2 rounded-lg text-sm text-[#71717a] hover:text-[#e4e4e7] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
