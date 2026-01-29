import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Filter,
  UserPlus,
  X,
} from 'lucide-react'
import ContactCard from './ContactCard'
import ContactDetail from './ContactDetail'
import type { Contact } from '../lib/crm'
import { fetchContacts, getHeatLevel } from '../lib/crm'

type SortKey = 'name' | 'lastContact'
type FilterHeat = 'all' | 'hot' | 'warm' | 'cold' | 'frozen' | 'blocked'

export default function People() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [filterHeat, setFilterHeat] = useState<FilterHeat>('all')

  const loadContacts = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      // Always fetch all (including blocked) so we can show the blocked count & filter
      const data = await fetchContacts({ includeBlocked: true })
      setContacts(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const handleContactUpdate = useCallback((updated: Contact) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelectedContact(updated)
  }, [])

  const blockedCount = useMemo(() => contacts.filter(c => c.blocked).length, [contacts])

  // Filter and sort
  const filtered = useMemo(() => {
    let result = contacts

    // Blocked filter: show ONLY blocked. Otherwise hide blocked entirely.
    if (filterHeat === 'blocked') {
      result = result.filter(c => c.blocked)
    } else {
      // Always hide blocked from normal views
      result = result.filter(c => !c.blocked)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phones.some(p => p.includes(q)) ||
        c.emails.some(e => e.toLowerCase().includes(q)) ||
        c.tags.some(t => t.includes(q))
      )
    }

    // Heat filter (skip if viewing blocked list)
    if (filterHeat !== 'all' && filterHeat !== 'blocked') {
      result = result.filter(c => getHeatLevel(c.lastContact) === filterHeat)
    }

    // Sort
    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    } else {
      result = [...result].sort((a, b) => b.lastContact - a.lastContact)
    }

    return result
  }, [contacts, searchQuery, filterHeat, sortBy])

  const hasFilters = searchQuery || filterHeat !== 'all'

  // Detail view
  if (selectedContact) {
    return (
      <AnimatePresence mode="wait">
        <ContactDetail
          key={selectedContact.id}
          contact={selectedContact}
          onBack={() => setSelectedContact(null)}
          onUpdate={handleContactUpdate}
        />
      </AnimatePresence>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <Users className="w-6 h-6 text-[#8b5cf6]" />
            <h1 className="text-2xl font-bold">People</h1>
            {!loading && (
              <span className="text-xs text-[#52525b] bg-[#1e1e2e] px-2 py-0.5 rounded-full">
                {contacts.length - blockedCount} contacts
              </span>
            )}
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => loadContacts()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#12121a] border border-[#1e1e2e] hover:border-[#8b5cf6]/40 text-sm text-[#71717a] hover:text-[#e4e4e7] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
        </div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative mb-4"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, email, or tag…"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#12121a] border border-[#1e1e2e] text-sm text-[#e4e4e7] placeholder-[#3f3f46] focus:outline-none focus:border-[#8b5cf6]/40 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4 text-[#52525b]" />

          {/* Sort */}
          {(['name', 'lastContact'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === key
                  ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#8b5cf6]'
                  : 'bg-[#16161e] border border-[#27272a] text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              {key === 'name' ? 'A–Z' : 'Recent'}
            </button>
          ))}

          <div className="w-px h-5 bg-[#1e1e2e] mx-1" />

          {/* Heat filter */}
          {(['all', 'hot', 'warm', 'cold'] as FilterHeat[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterHeat(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterHeat === f
                  ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#8b5cf6]'
                  : 'bg-[#16161e] border border-[#27272a] text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'hot' ? '🔥 Hot' : f === 'warm' ? '☀️ Warm' : '❄️ Cold'}
            </button>
          ))}

          {blockedCount > 0 && (
            <>
              <div className="w-px h-5 bg-[#1e1e2e] mx-1" />
              <button
                onClick={() => setFilterHeat(filterHeat === 'blocked' ? 'all' : 'blocked')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterHeat === 'blocked'
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                    : 'bg-[#16161e] border border-[#27272a] text-[#52525b] hover:text-red-400'
                }`}
              >
                🚫 Blocked
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  filterHeat === 'blocked' ? 'bg-red-500/30' : 'bg-[#27272a]'
                }`}>
                  {blockedCount}
                </span>
              </button>
            </>
          )}

          {hasFilters && (
            <button
              onClick={() => { setSearchQuery(''); setFilterHeat('all') }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[#71717a] hover:text-red-400 transition-colors ml-auto"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </motion.div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-amber-400 mx-6 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Loading */}
      {loading && contacts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-[#52525b]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6] mb-3" />
          <p className="text-sm">Loading contacts…</p>
        </div>
      )}

      {/* Contact list */}
      {!loading && (
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length > 0 ? (
            <div className="space-y-2 max-w-3xl">
              <AnimatePresence mode="popLayout">
                {filtered.map((contact, i) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    index={i}
                    onClick={setSelectedContact}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-48 text-[#52525b]"
            >
              <UserPlus className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">
                {hasFilters ? 'No contacts match your filters.' : 'No contacts found. Check contacts.json.'}
              </p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
