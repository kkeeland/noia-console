import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderTree, Folder, FolderOpen, FileText, ChevronRight, ChevronDown,
  Loader2, RefreshCw, Copy, Check, ArrowLeft, Eye, File
} from 'lucide-react'
import { listMemoryFiles, getMemoryFile, type FileTreeNode } from '../lib/memory'

// --- Tree node component ---
function TreeNode({
  node, depth, onFileSelect, selectedPath,
}: {
  node: FileTreeNode
  depth: number
  onFileSelect: (path: string) => void
  selectedPath: string | null
}) {
  const [expanded, setExpanded] = useState(depth < 1)
  const isDir = node.type === 'directory'
  const isSelected = node.path === selectedPath
  const hasChildren = isDir && node.children && node.children.length > 0

  const fileIcon = node.name.endsWith('.md') ? (
    <FileText className="w-3.5 h-3.5 text-[#8b5cf6]" />
  ) : node.name.endsWith('.json') || node.name.endsWith('.jsonl') ? (
    <File className="w-3.5 h-3.5 text-amber-400" />
  ) : (
    <File className="w-3.5 h-3.5 text-[#71717a]" />
  )

  const handleClick = () => {
    if (isDir) {
      setExpanded(!expanded)
    } else {
      onFileSelect(node.path)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-left transition-all text-sm
          ${isSelected
            ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]'
            : 'text-[#a1a1aa] hover:bg-[#1e1e2e] hover:text-[#e4e4e7]'}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDir ? (
          <>
            {hasChildren ? (
              expanded ? (
                <ChevronDown className="w-3 h-3 text-[#525252] shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[#525252] shrink-0" />
              )
            ) : (
              <div className="w-3 h-3 shrink-0" />
            )}
            {expanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
            )}
          </>
        ) : (
          <>
            <div className="w-3 h-3 shrink-0" />
            {fileIcon}
          </>
        )}
        <span className={`truncate ${isDir ? 'font-medium' : ''}`}>
          {node.name}
        </span>
        {isDir && node.children && (
          <span className="text-[10px] text-[#525252] ml-auto shrink-0">
            {node.children.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isDir && expanded && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {node.children.map(child => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                onFileSelect={onFileSelect}
                selectedPath={selectedPath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- File content viewer ---
function FileViewer({
  path, content, loading, onBack, onCopy,
}: {
  path: string
  content: string
  loading: boolean
  onBack: () => void
  onCopy: () => void
}) {
  const [copied, setCopied] = useState(false)
  const fileName = path.split('/').pop() || path
  const lineCount = content.split('\n').length

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* File header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e1e2e] bg-[#12121a]">
        <button
          onClick={onBack}
          className="p-1 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <FileText className="w-4 h-4 text-[#8b5cf6]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#e4e4e7] truncate">{fileName}</p>
          <p className="text-[10px] text-[#525252] font-mono truncate">{path}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-[#525252]">{lineCount} lines</span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-5 h-5 text-[#8b5cf6] animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="flex min-h-full">
            {/* Line numbers */}
            <div className="sticky left-0 bg-[#0a0a0f] border-r border-[#1e1e2e] px-3 py-3 select-none shrink-0">
              {content.split('\n').map((_, i) => (
                <div key={i} className="text-[10px] text-[#525252] text-right font-mono leading-5 h-5">
                  {i + 1}
                </div>
              ))}
            </div>
            {/* Code */}
            <pre className="flex-1 p-3 text-sm text-[#a1a1aa] font-mono leading-5 overflow-x-auto whitespace-pre">
              {renderMarkdown(content)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// Simple syntax highlighting for markdown
function renderMarkdown(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    let className = ''
    if (line.startsWith('#')) className = 'text-[#c4b5fd] font-bold'
    else if (line.startsWith('- ') || line.startsWith('* ')) className = 'text-[#a1a1aa]'
    else if (line.startsWith('> ')) className = 'text-[#71717a] italic border-l-2 border-[#8b5cf6]/30 pl-2'
    else if (line.startsWith('```')) className = 'text-[#525252]'
    else if (line.match(/^\*\*.+\*\*/)) className = 'text-[#e4e4e7] font-semibold'
    else if (line.trim() === '') className = 'h-5'

    return (
      <div key={i} className={`h-5 ${className}`}>
        {line || '\u00A0'}
      </div>
    )
  })
}

// --- Main File Browser ---
export default function MemoryFileBrowser() {
  const [tree, setTree] = useState<FileTreeNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [loadingTree, setLoadingTree] = useState(true)
  const [loadingFile, setLoadingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTree = useCallback(async () => {
    setLoadingTree(true)
    setError(null)
    try {
      const files = await listMemoryFiles('memory')
      setTree(files)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load files')
    } finally {
      setLoadingTree(false)
    }
  }, [])

  useEffect(() => { loadTree() }, [loadTree])

  const handleFileSelect = useCallback(async (path: string) => {
    setSelectedFile(path)
    setLoadingFile(true)
    try {
      const content = await getMemoryFile(path)
      setFileContent(content)
    } catch {
      setFileContent('Failed to load file content')
    } finally {
      setLoadingFile(false)
    }
  }, [])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(fileContent)
  }, [fileContent])

  // Count total files
  const fileCount = countFiles(tree)

  if (loadingTree) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-6 h-6 text-[#8b5cf6] animate-spin" />
        <p className="text-xs text-[#525252]">Loading file tree...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-red-400">{error}</p>
        <button onClick={loadTree} className="text-xs text-[#8b5cf6] hover:underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar: file tree */}
      <div className={`${selectedFile ? 'w-72' : 'w-full max-w-lg mx-auto'} border-r border-[#1e1e2e] flex flex-col transition-all`}>
        {/* Tree header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e1e2e]">
          <FolderTree className="w-4 h-4 text-[#8b5cf6]" />
          <h3 className="text-sm font-medium text-[#e4e4e7]">Memory Files</h3>
          <span className="text-[10px] text-[#525252] ml-auto">
            {fileCount} files
          </span>
          <button
            onClick={loadTree}
            className="p-1 rounded hover:bg-[#1e1e2e] text-[#525252] hover:text-[#71717a] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Tree content */}
        <div className="flex-1 overflow-y-auto py-2 px-1">
          {tree.length === 0 ? (
            <div className="text-center py-12 text-[#525252] text-xs">
              No memory files found
            </div>
          ) : (
            tree.map(node => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                onFileSelect={handleFileSelect}
                selectedPath={selectedFile}
              />
            ))
          )}
        </div>

        {/* Quick access */}
        {!selectedFile && (
          <div className="border-t border-[#1e1e2e] p-3">
            <p className="text-[10px] text-[#525252] mb-2 uppercase tracking-wider font-medium">Quick Access</p>
            <div className="flex flex-col gap-1">
              {[
                { label: 'MEMORY.md', path: 'MEMORY.md' },
                { label: 'INDEX.md', path: 'memory/INDEX.md' },
                { label: "Today's Notes", path: `memory/daily/${new Date().toISOString().split('T')[0]}.md` },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => handleFileSelect(item.path)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[#71717a]
                           hover:bg-[#1e1e2e] hover:text-[#8b5cf6] transition-all text-left"
                >
                  <Eye className="w-3 h-3" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* File viewer */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 min-w-0"
          >
            <FileViewer
              path={selectedFile}
              content={fileContent}
              loading={loadingFile}
              onBack={() => setSelectedFile(null)}
              onCopy={handleCopy}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function countFiles(nodes: FileTreeNode[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.type === 'file') count++
    if (node.children) count += countFiles(node.children)
  }
  return count
}
