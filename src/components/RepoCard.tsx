import { motion } from 'framer-motion'
import {
  Lock,
  Globe,
  Star,
  ExternalLink,
  AlertCircle,
  GitPullRequest,
  GitBranch,
} from 'lucide-react'
import type { GitHubRepo } from '../lib/github'
import { formatRelativeTime, getLanguageColor } from '../lib/github'

interface RepoCardProps {
  repo: GitHubRepo
  index: number
  onSelect: (repo: GitHubRepo) => void
}

export default function RepoCard({ repo, index, onSelect }: RepoCardProps) {
  const langColor = getLanguageColor(repo.primaryLanguage?.name)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -2 }}
      onClick={() => onSelect(repo)}
      className="group relative p-5 rounded-xl bg-[#16161e] border border-[#27272a] hover:border-[#8b5cf6]/40 transition-all duration-200 cursor-pointer hover:shadow-[0_0_20px_rgba(139,92,246,0.08)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h3 className="font-semibold text-[#e4e4e7] truncate group-hover:text-[#8b5cf6] transition-colors">
            {repo.name}
          </h3>
          {repo.isPrivate ? (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa] shrink-0">
              <Lock className="w-2.5 h-2.5" />
              Private
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] shrink-0">
              <Globe className="w-2.5 h-2.5" />
              Public
            </span>
          )}
        </div>
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#27272a] transition-colors opacity-0 group-hover:opacity-100"
          title="Open on GitHub"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Description */}
      <p className="text-sm text-[#71717a] mb-4 line-clamp-2 min-h-[2.5rem]">
        {repo.description || 'No description'}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-4 text-xs text-[#71717a]">
        {/* Language */}
        {repo.primaryLanguage && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: langColor }}
            />
            <span>{repo.primaryLanguage.name}</span>
          </div>
        )}

        {/* Branch */}
        {repo.defaultBranchRef?.name && (
          <div className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            <span className="font-mono text-[11px]">{repo.defaultBranchRef.name}</span>
          </div>
        )}

        {/* Stars */}
        {repo.stargazerCount > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span>{repo.stargazerCount}</span>
          </div>
        )}

        {/* Issues */}
        {repo.openIssues && repo.openIssues.totalCount > 0 && (
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>{repo.openIssues.totalCount}</span>
          </div>
        )}

        {/* PRs */}
        {repo.openPRs && repo.openPRs.totalCount > 0 && (
          <div className="flex items-center gap-1">
            <GitPullRequest className="w-3 h-3" />
            <span>{repo.openPRs.totalCount}</span>
          </div>
        )}

        {/* Updated */}
        <div className="ml-auto text-[#52525b]">
          {formatRelativeTime(repo.updatedAt)}
        </div>
      </div>
    </motion.div>
  )
}
