import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ChevronRight, Clock, Sparkles, FileText, Loader2,
  History, X, ArrowUpRight, TrendingUp
} from 'lucide-react'
import {
  searchMemory, addSearchHistory, getSearchHistory, clearSearchHistory,
  type SearchResult, type SearchResponse, type SearchHistoryEntry,
} from '../lib/memory'

// --- Highlight matched terms in snippet ---
function highlightSnippet(text: string, query: string): React.ReactNode[] {
  if (!query.trim()) return [text]
  const words = query.trim().split(/\s+/).filter(w => w.length > 2)
  if (words.length === 0) return [text]
  const regex = new RegExp(
    `(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  )
  const parts = text.split(regex)
  return parts.map((part, i) => {
    if (words.some(w => part.toLowerCase() === w.toLowerCase())) {
      return (
        <mark key={i} className="bg-[#8b5cf6]/30 text-[#e4e4e7] rounded px-0.5 font-medium">
          {part}
        </mark>
      )
    }
    return part
  })
}

// --- Relevance score bar ---
function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    score > 0.5 ? 'from-emerald-500 to-emerald-400' :
    score > 0.3 ? 'from-amber-500 to-yellow-400' :
    score > 0.15 ? 'from-orange-500 to-amber-400' :
    'from-red-500 to-orange-400'
  const label =
    score > 0.5 ? 'High' :
    score > 0.3 ? 'Good' :
    score > 0.15 ? 'Fair' :
    'Low'

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 5)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] text-[#71717a] font-mono w-14 text-right">
        {pct}% <span className="text-[#525252]">{label}</span>
      </span>
    </div>
  )
}

// --- Path breadcrumb ---
function PathBreadcrumb({ path }: { path: string }) {
  const parts = path.split('/').filter(Boolean)
  return (
    <div className="flex items-center gap-1 text-xs text-[#71717a]">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3" />}
          <span className={i === parts.length - 1 ? 'text-[#a1a1aa] font-medium' : ''}>
            {part}
          </span>
        </span>
      ))}
    </div>
  )
}

// --- Result card ---
function ResultCard({
  result, query, index, onViewFile,
}: {
  result: SearchResult
  query: string
  index: number
  onViewFile?: (path: string, line: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group border border-[#1e1e2e] rounded-xl p-4 hover:border-[#8b5cf6]/30 
                 hover:bg-[#12121a]/50 transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3.5 h-3.5 text-[#8b5cf6] shrink-0" />
            <PathBreadcrumb path={result.path} />
            {onViewFile && (
              <button
                onClick={e => { e.stopPropagation(); onViewFile(result.path, result.startLine) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#8b5cf6]/10 transition-all"
                title="View file"
              >
                <ArrowUpRight className="w-3 h-3 text-[#8b5cf6]" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[#525252] bg-[#1e1e2e] px-1.5 py-0.5 rounded">
              L{result.startLine}–{result.endLine}
            </span>
            <ScoreBar score={result.score} />
          </div>
        </div>
      </div>

      <div className={`text-sm text-[#a1a1aa] leading-relaxed mt-3 ${expanded ? '' : 'line-clamp-3'}`}>
        {highlightSnippet(result.snippet, query)}
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-[#1e1e2e]"
        >
          {result.source && (
            <p className="text-xs text-[#525252]">Source: {result.source}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">
              Score: {Math.round(result.score * 100)}%
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1e2e] text-[#71717a]">
              {result.endLine - result.startLine + 1} lines
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// --- Search history panel ---
function SearchHistoryPanel({
  history, onSelect, onClear, onClose,
}: {
  history: SearchHistoryEntry[]
  onSelect: (query: string) => void
  onClear: () => void
  onClose: () => void
}) {
  if (history.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="absolute top-full left-0 right-0 mt-2 bg-[#12121a] border border-[#1e1e2e] 
                 rounded-xl shadow-xl z-20 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2 text-xs text-[#71717a]">
          <History className="w-3 h-3" />
          Recent Searches
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClear} className="text-[10px] text-[#525252] hover:text-red-400 transition-colors">
            Clear
          </button>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-[#1e1e2e]">
            <X className="w-3 h-3 text-[#525252]" />
          </button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {history.map((entry, i) => (
          <button
            key={i}
            onClick={() => onSelect(entry.query)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1e1e2e]/50 transition-colors text-left"
          >
            <Search className="w-3 h-3 text-[#525252] shrink-0" />
            <span className="flex-1 text-sm text-[#a1a1aa] truncate">{entry.query}</span>
            <span className="text-[10px] text-[#525252] shrink-0">
              {entry.resultCount} results
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// --- Suggestions ---
const SUGGESTIONS = [
  'people and relationships',
  'project status',
  'decisions made',
  'preferences and rules',
  'lessons learned',
  'recent conversations',
  'tools and setup',
]

export default function MemorySearch() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [sortBy, setSortBy] = useState<'relevance' | 'path'>('relevance')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => getSearchHistory(), [response])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResponse(null)
      return
    }
    // Cancel previous
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)
    try {
      const res = await searchMemory(q.trim(), 15)
      setResponse(res)
      addSearchHistory(q.trim(), res.results.length)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = useCallback((value: string) => {
    setQuery(value)
    setShowHistory(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(value), 350)
    } else {
      setResponse(null)
    }
  }, [doSearch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      doSearch(query)
      setShowHistory(false)
    }
    if (e.key === 'Escape') {
      setShowHistory(false)
    }
  }, [query, doSearch])

  const handleSuggestion = useCallback((suggestion: string) => {
    setQuery(suggestion)
    doSearch(suggestion)
    setShowHistory(false)
  }, [doSearch])

  const handleClearSearch = useCallback(() => {
    setQuery('')
    setResponse(null)
    setError(null)
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Sort results
  const sortedResults = useMemo(() => {
    if (!response) return []
    const results = [...response.results]
    if (sortBy === 'path') {
      results.sort((a, b) => a.path.localeCompare(b.path))
    }
    // relevance is default order
    return results
  }, [response, sortBy])

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-6 pb-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#71717a] 
                           group-focus-within:text-[#8b5cf6] transition-colors" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => history.length > 0 && !query && setShowHistory(true)}
            placeholder="Search your memories..."
            className="w-full pl-12 pr-20 py-3.5 rounded-xl bg-[#12121a] border border-[#1e1e2e]
                       text-[#e4e4e7] placeholder:text-[#525252] text-base
                       focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/50 focus:border-[#8b5cf6]/50
                       transition-all"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && (
              <Loader2 className="w-4 h-4 text-[#8b5cf6] animate-spin" />
            )}
            {query && !loading && (
              <button
                onClick={handleClearSearch}
                className="p-1 rounded-lg hover:bg-[#1e1e2e] transition-colors"
              >
                <X className="w-4 h-4 text-[#525252] hover:text-[#a1a1aa]" />
              </button>
            )}
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1 rounded-lg transition-colors ${showHistory ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'hover:bg-[#1e1e2e] text-[#525252]'}`}
              >
                <History className="w-4 h-4" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showHistory && (
              <SearchHistoryPanel
                history={history}
                onSelect={handleSuggestion}
                onClear={() => { clearSearchHistory(); setShowHistory(false) }}
                onClose={() => setShowHistory(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Result count + sort */}
        {response && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between mt-3"
          >
            <div className="flex items-center gap-2 text-xs text-[#525252]">
              <Clock className="w-3 h-3" />
              <span>
                {response.results.length} result{response.results.length !== 1 ? 's' : ''} in {response.searchTimeMs}ms
              </span>
              {response.provider && (
                <span className="ml-2 px-1.5 py-0.5 bg-[#1e1e2e] rounded text-[#71717a]">
                  {response.provider}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSortBy('relevance')}
                className={`px-2 py-1 rounded text-[10px] transition-colors ${
                  sortBy === 'relevance' ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'text-[#525252] hover:text-[#71717a]'
                }`}
              >
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Relevance
              </button>
              <button
                onClick={() => setSortBy('path')}
                className={`px-2 py-1 rounded text-[10px] transition-colors ${
                  sortBy === 'path' ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'text-[#525252] hover:text-[#71717a]'
                }`}
              >
                <FileText className="w-3 h-3 inline mr-1" />
                Path
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <AnimatePresence mode="wait">
          {/* Loading skeleton */}
          {loading && !response && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-[#1e1e2e] rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3.5 h-3.5 rounded bg-[#1e1e2e]" />
                    <div className="h-3 w-48 bg-[#1e1e2e] rounded" />
                  </div>
                  <div className="h-2 w-24 bg-[#1e1e2e] rounded mb-3" />
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-[#1e1e2e] rounded" />
                    <div className="h-3 w-3/4 bg-[#1e1e2e] rounded" />
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Results */}
          {!loading && response && sortedResults.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {sortedResults.map((result, i) => (
                <ResultCard
                  key={`${result.path}:${result.startLine}`}
                  result={result}
                  query={query}
                  index={i}
                />
              ))}
            </motion.div>
          )}

          {/* No results */}
          {!loading && response && response.results.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-16 text-[#525252]"
            >
              <Search className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs mt-1">Try different keywords or check spelling</p>
            </motion.div>
          )}

          {/* Empty state with suggestions */}
          {!loading && !response && !error && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-16"
            >
              <Sparkles className="w-10 h-10 text-[#8b5cf6]/30 mb-4" />
              <p className="text-sm text-[#71717a] mb-6">Try searching for:</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="px-3 py-1.5 rounded-lg bg-[#1e1e2e] text-xs text-[#a1a1aa]
                             hover:bg-[#8b5cf6]/10 hover:text-[#8b5cf6] transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {history.length > 0 && (
                <div className="mt-8 text-center">
                  <p className="text-xs text-[#525252] mb-3">Or pick a recent search:</p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {history.slice(0, 5).map((h, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestion(h.query)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e2e]/50 text-xs 
                                   text-[#71717a] hover:bg-[#8b5cf6]/10 hover:text-[#8b5cf6] transition-all"
                      >
                        <History className="w-3 h-3" />
                        {h.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Error */}
          {!loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-16 text-red-400"
            >
              <p className="text-sm">{error}</p>
              <button
                onClick={() => doSearch(query)}
                className="mt-3 text-xs text-[#8b5cf6] hover:underline"
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
