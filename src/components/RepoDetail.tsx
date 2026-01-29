import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ExternalLink,
  Star,
  GitFork,
  Lock,
  Globe,
  AlertCircle,
  GitPullRequest,
  GitCommit,
  Rocket,
  Loader2,
  FileText,
} from 'lucide-react'
import type { GitHubRepo, GitHubIssue, GitHubPR, GitHubCommit, RepoDetails } from '../lib/github'
import {
  getRepoDetails,
  listIssues,
  listPRs,
  listRecentCommits,
  formatRelativeTime,
  getLanguageColor,
} from '../lib/github'

interface RepoDetailProps {
  repo: GitHubRepo
  onClose: () => void
}

type DetailTab = 'overview' | 'issues' | 'prs' | 'commits'

export default function RepoDetail({ repo, onClose }: RepoDetailProps) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const [details, setDetails] = useState<RepoDetails | null>(null)
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [prs, setPrs] = useState<GitHubPR[]>([])
  const [commits, setCommits] = useState<GitHubCommit[]>([])
  const [loading, setLoading] = useState(true)

  const nwo = repo.nameWithOwner || repo.name

  useEffect(() => {
    let cancelled = false
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect

    Promise.all([
      getRepoDetails(nwo),
      listIssues(nwo),
      listPRs(nwo),
      listRecentCommits(nwo),
    ]).then(([d, i, p, c]) => {
      if (cancelled) return
      setDetails(d)
      setIssues(i)
      setPrs(p)
      setCommits(c)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [nwo])

  const tabs: { id: DetailTab; label: string; icon: typeof AlertCircle; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'issues', label: 'Issues', icon: AlertCircle, count: issues.length },
    { id: 'prs', label: 'Pull Requests', icon: GitPullRequest, count: prs.length },
    { id: 'commits', label: 'Commits', icon: GitCommit, count: commits.length },
  ]

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />

      {/* Slide-over panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#0a0a0f] border-l border-[#27272a] z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#27272a] flex items-start justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-[#e4e4e7] truncate">{repo.name}</h2>
              {repo.isPrivate ? (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa]">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">
                  <Globe className="w-2.5 h-2.5" /> Public
                </span>
              )}
            </div>
            <p className="text-sm text-[#71717a]">{repo.description || 'No description'}</p>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 text-xs text-[#71717a]">
              {repo.primaryLanguage && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getLanguageColor(repo.primaryLanguage.name) }} />
                  <span>{repo.primaryLanguage.name}</span>
                </div>
              )}
              {details && (
                <>
                  <div className="flex items-center gap-1"><Star className="w-3 h-3" />{details.stargazerCount}</div>
                  <div className="flex items-center gap-1"><GitFork className="w-3 h-3" />{details.forkCount}</div>
                </>
              )}
              <span>Updated {formatRelativeTime(repo.updatedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#16161e] transition-colors"
              title="Open on GitHub"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#16161e] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-[#27272a] shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors relative
                  ${tab === t.id ? 'text-[#8b5cf6] bg-[#8b5cf6]/5' : 'text-[#71717a] hover:text-[#e4e4e7]'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa]">
                    {t.count}
                  </span>
                )}
                {tab === t.id && (
                  <motion.div layoutId="detailTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8b5cf6]" />
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 text-[#8b5cf6] animate-spin" />
            </div>
          ) : (
            <>
              {tab === 'overview' && <OverviewTab details={details} />}
              {tab === 'issues' && <IssuesTab issues={issues} />}
              {tab === 'prs' && <PRsTab prs={prs} />}
              {tab === 'commits' && <CommitsTab commits={commits} />}
            </>
          )}
        </div>

        {/* Footer action */}
        <div className="p-4 border-t border-[#27272a] shrink-0">
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium transition-colors"
            onClick={() => { /* placeholder for agent launcher */ }}
          >
            <Rocket className="w-4 h-4" />
            Work on this
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function OverviewTab({ details }: { details: RepoDetails | null }) {
  if (!details) return <p className="text-[#71717a]">Could not load details.</p>

  return (
    <div className="space-y-6">
      {details.readme ? (
        <div>
          <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">README</h3>
          <div className="p-4 rounded-xl bg-[#16161e] border border-[#27272a] text-sm text-[#a1a1aa] whitespace-pre-wrap max-h-96 overflow-y-auto font-mono leading-relaxed">
            {details.readme.slice(0, 3000)}
            {details.readme.length > 3000 && '\n\n... (truncated)'}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-[#16161e] border border-[#27272a] text-center text-[#52525b]">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No README found</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Info</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Default branch', value: details.defaultBranchRef?.name || 'main' },
            { label: 'Created', value: formatRelativeTime(details.createdAt) },
            { label: 'Updated', value: formatRelativeTime(details.updatedAt) },
            { label: 'Homepage', value: details.homepageUrl || '—' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-[#16161e] border border-[#27272a]">
              <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-sm text-[#e4e4e7] truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IssuesTab({ issues }: { issues: GitHubIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="p-8 text-center text-[#52525b]">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No open issues</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <a
          key={issue.number}
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 rounded-lg bg-[#16161e] border border-[#27272a] hover:border-[#8b5cf6]/30 transition-colors"
        >
          <AlertCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[#e4e4e7] font-medium truncate">
              #{issue.number} {issue.title}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#52525b]">
              <span>{issue.author?.login}</span>
              <span>·</span>
              <span>{formatRelativeTime(issue.updatedAt)}</span>
              {issue.labels?.map((l) => (
                <span key={l.name} className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: `#${l.color}20`, color: `#${l.color}` }}>
                  {l.name}
                </span>
              ))}
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

function PRsTab({ prs }: { prs: GitHubPR[] }) {
  if (prs.length === 0) {
    return (
      <div className="p-8 text-center text-[#52525b]">
        <GitPullRequest className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No open pull requests</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {prs.map((pr) => (
        <a
          key={pr.number}
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 rounded-lg bg-[#16161e] border border-[#27272a] hover:border-[#8b5cf6]/30 transition-colors"
        >
          <GitPullRequest className="w-4 h-4 text-[#8b5cf6] mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[#e4e4e7] font-medium truncate">
              #{pr.number} {pr.title}
              {pr.isDraft && <span className="ml-2 text-[10px] text-[#52525b]">DRAFT</span>}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#52525b]">
              <span>{pr.author?.login}</span>
              <span>→</span>
              <span className="font-mono text-[#8b5cf6]/60">{pr.headRefName}</span>
              <span>·</span>
              <span>{formatRelativeTime(pr.updatedAt)}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

function CommitsTab({ commits }: { commits: GitHubCommit[] }) {
  if (commits.length === 0) {
    return (
      <div className="p-8 text-center text-[#52525b]">
        <GitCommit className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No recent commits</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {commits.map((commit, i) => (
        <div
          key={`${commit.oid}-${i}`}
          className="flex items-start gap-3 p-3 rounded-lg bg-[#16161e] border border-[#27272a]"
        >
          <GitCommit className="w-4 h-4 text-[#52525b] mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[#e4e4e7] truncate">{commit.messageHeadline}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#52525b]">
              <span className="font-mono text-[#8b5cf6]/60">{commit.oid}</span>
              <span>·</span>
              <span>{commit.authors?.[0]?.name || 'unknown'}</span>
              <span>·</span>
              <span>{formatRelativeTime(commit.committedDate)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
