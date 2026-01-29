import { motion } from 'framer-motion'
import { Phone, Mail, ChevronRight } from 'lucide-react'
import type { Contact } from '../lib/crm'
import { getHeatLevel, getHeatConfig, getChannelIcon } from '../lib/crm'

interface ContactCardProps {
  contact: Contact
  index: number
  onClick: (contact: Contact) => void
}

export default function ContactCard({ contact, index, onClick }: ContactCardProps) {
  const heat = getHeatLevel(contact.lastContact)
  const heatConfig = getHeatConfig(heat)

  // Get initials for avatar
  const initials = contact.name
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={() => onClick(contact)}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/30 transition-all text-left group"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8b5cf6]/30 to-[#6d28d9]/20 border border-[#27272a] flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-[#a78bfa]">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#e4e4e7] truncate">{contact.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {contact.phones.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#52525b]">
              <Phone className="w-3 h-3" />
              {contact.phones[0]}
            </span>
          )}
          {contact.emails.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#52525b]">
              <Mail className="w-3 h-3" />
              {contact.emails[0]}
            </span>
          )}
        </div>
      </div>

      {/* Channels */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {contact.channels.slice(0, 3).map((ch, i) => (
          <span key={i} className="text-xs" title={ch.type}>
            {getChannelIcon(ch.type)}
          </span>
        ))}
      </div>

      {/* Heat indicator */}
      {contact.lastContact > 0 && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${heatConfig.bg} ${heatConfig.color} flex-shrink-0`}>
          {heatConfig.label}
        </span>
      )}

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
          {contact.tags.slice(0, 2).map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa]">
              {t}
            </span>
          ))}
        </div>
      )}

      <ChevronRight className="w-4 h-4 text-[#3f3f46] group-hover:text-[#8b5cf6] transition-colors flex-shrink-0" />
    </motion.button>
  )
}
