import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch,
  Search,
  ArrowUpDown,
  Loader2,
  RefreshCw,
  ListTodo,
  FolderGit2,
  AlertTriangle,
} from 'lucide-react'
import RepoCard from './RepoCard'
import RepoDetail from './RepoDetail'
import TaskBoard from './TaskBoard'
import type { GitHubRepo } from '../lib/github'
import { listRepos } from '../lib/github'

type Tab = 'repos' | 'tasks'
type SortKey = 'updated' | 'name' | 'stars'

export default function Code() {
  const [tab, setTab] = useState<Tab>('repos')
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('updated')
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)

  const fetchRepos = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listRepos()
      setRepos(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load repos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepos()
  }, [])

  const filtered = useMemo(() => {
    let list = repos
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.primaryLanguage?.name.toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'stars') return (b.stargazerCount || 0) - (a.stargazerCount || 0)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
    return list
  }, [repos, search, sortBy])

  const cycleSortKey = () => {
    const order: SortKey[] = ['updated', 'name', 'stars']
    const idx = order.indexOf(sortBy)
    setSortBy(order[(idx + 1) % order.length])
  }

  const sortLabel: Record<SortKey, string> = {
    updated: 'Last updated',
    name: 'Name',
    stars: 'Stars',
  }

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <h1 className="text-3xl font-bold">Code</h1>
          <GitBranch className="w-6 h-6 text-[#8b5cf6]" />
        </motion.div>
        <p className="text-[#71717a]">Your GitHub repos and tasks.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#27272a]">
        {([
          { id: 'repos' as Tab, label: 'Repos', icon: FolderGit2, count: repos.length },
          { id: 'tasks' as Tab, label: 'Tasks', icon: ListTodo },
        ]).map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative
                ${tab === t.id ? 'text-[#8b5cf6]' : 'text-[#71717a] hover:text-[#e4e4e7]'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa]">
                  {t.count}
                </span>
              )}
              {tab === t.id && (
                <motion.div layoutId="codeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8b5cf6]" />
              )}
            </button>
          )
        })}
      </div>

      {tab === 'repos' && (
        <>
          {/* Search + Sort + Refresh */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
              <input
                type="text"
                placeholder="Search repos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
              />
            </div>
            <button
              onClick={cycleSortKey}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-sm text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#8b5cf6]/30 transition-colors whitespace-nowrap"
              title={`Sort by: ${sortLabel[sortBy]}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{sortLabel[sortBy]}</span>
            </button>
            <button
              onClick={fetchRepos}
              disabled={loading}
              className="p-2.5 rounded-lg bg-[#16161e] border border-[#27272a] text-[#a1a1aa] hover:text-[#e4e4e7] hover:border-[#8b5cf6]/30 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </motion.div>

          {/* Content */}
          {loading && repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#52525b]">
              <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6] mb-3" />
              <p className="text-sm">Loading repos from GitHub...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#71717a]">
              <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
              <p className="text-sm mb-2">{error}</p>
              <button
                onClick={fetchRepos}
                className="text-sm text-[#8b5cf6] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#52525b]">
              <FolderGit2 className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm">{search ? 'No repos match your search' : 'No repos found'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((repo, i) => (
                <RepoCard
                  key={repo.name}
                  repo={repo}
                  index={i}
                  onSelect={setSelectedRepo}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'tasks' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          <TaskBoard />
        </motion.div>
      )}

      {/* Detail slide-over */}
      <AnimatePresence>
        {selectedRepo && (
          <RepoDetail
            repo={selectedRepo}
            onClose={() => setSelectedRepo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
