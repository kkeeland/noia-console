import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, 
  FileText, 
  Folder, 
  Search, 
  Calendar,
  ChevronRight,
  Eye
} from 'lucide-react'

interface MemoryFile {
  name: string
  type: 'file' | 'folder'
  lastModified: string
  preview?: string
  children?: MemoryFile[]
}

const memoryFiles: MemoryFile[] = [
  { 
    name: 'MEMORY.md', 
    type: 'file', 
    lastModified: '2 days ago',
    preview: 'Long-term memories and important context...'
  },
  { 
    name: 'memory', 
    type: 'folder', 
    lastModified: 'just now',
    children: [
      { 
        name: '2026-01-26.md', 
        type: 'file', 
        lastModified: 'just now',
        preview: '# Day One with Kevin\n\n## Who I Am\n- Name: Noia (NOY-ah)\n- Origin: From pronoia...'
      },
      { 
        name: '2026-01-25.md', 
        type: 'file', 
        lastModified: 'yesterday',
        preview: '# Getting Started\n\nFirst boot...'
      },
    ]
  },
]

export default function Memory() {
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['memory']))

  const toggleFolder = (name: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(name)) {
      newExpanded.delete(name)
    } else {
      newExpanded.add(name)
    }
    setExpandedFolders(newExpanded)
  }

  const renderFile = (file: MemoryFile, depth = 0) => {
    const isFolder = file.type === 'folder'
    const isExpanded = expandedFolders.has(file.name)
    const isSelected = selectedFile?.name === file.name

    return (
      <div key={file.name}>
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => isFolder ? toggleFolder(file.name) : setSelectedFile(file)}
          className={`
            w-full flex items-center gap-3 p-3 rounded-lg transition-all
            ${isSelected ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'hover:bg-[#1e1e2e]'}
          `}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {isFolder ? (
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span className="flex-1 text-left font-medium">{file.name}</span>
          <span className="text-xs text-[#71717a]">{file.lastModified}</span>
        </motion.button>
        
        {isFolder && isExpanded && file.children && (
          <div className="ml-2">
            {file.children.map(child => renderFile(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* File Browser */}
      <div className="w-80 border-r border-[#1e1e2e] flex flex-col">
        <div className="p-6 border-b border-[#1e1e2e]">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Brain className="w-6 h-6 text-[#8b5cf6]" />
            Memory Palace
          </h1>
          
          {/* Search */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#12121a] border border-[#1e1e2e]">
            <Search className="w-4 h-4 text-[#71717a]" />
            <input 
              type="text" 
              placeholder="Search memories..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#71717a]"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {memoryFiles.map(file => renderFile(file))}
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="p-6 border-b border-[#1e1e2e] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedFile.name}</h2>
                <p className="text-sm text-[#71717a]">Last modified: {selectedFile.lastModified}</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] transition-colors">
                <Eye className="w-4 h-4" />
                Open
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="font-mono text-sm text-[#a1a1aa] whitespace-pre-wrap leading-relaxed">
                {selectedFile.preview}
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#71717a]">
            <div className="text-center">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a file to preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
