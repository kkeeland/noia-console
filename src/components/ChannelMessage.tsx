// Individual message component for the Channels message view
// Renders a single message bubble with markdown support, timestamps, and role indicators

import { useState, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Sparkles, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../types/clawdbot'
import { getMessageText } from '../lib/api'

interface ChannelMessageProps {
  message: Message
  index: number
}

const ChannelMessage = memo(function ChannelMessage({ message, index }: ChannelMessageProps) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  const text = getMessageText(message)
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  if (!text) return null

  // System messages — compact centered pill
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center py-1"
      >
        <div className="px-3 py-1 rounded-full bg-[#1e1e2e]/50 text-[10px] text-[#52525b] max-w-[80%] truncate">
          {text}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.2) }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center mr-2 mt-1">
          <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
        </div>
      )}

      <div className="relative max-w-[75%]">
        {/* Copy button on hover */}
        <AnimatePresence>
          {hovered && text && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleCopy}
              className={`absolute -top-2 ${isUser ? '-left-7' : '-right-7'} p-1 rounded-md bg-[#1e1e2e] border border-[#2e2e3e] text-[#71717a] hover:text-[#e4e4e7] transition-colors z-10`}
              title="Copy"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </motion.button>
          )}
        </AnimatePresence>

        <div className={`
          rounded-2xl px-3.5 py-2.5
          ${isUser
            ? 'bg-[#8b5cf6] text-white rounded-br-md'
            : 'bg-[#16161e] border border-[#1e1e2e] rounded-bl-md text-[#e4e4e7]'
          }
        `}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
          ) : (
            <div className="gh-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {text}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <div className={`mt-0.5 px-1 text-[10px] ${isUser ? 'text-right text-[#52525b]' : 'text-[#3f3f46]'}`}>
            {timestamp}
          </div>
        )}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1e1e2e] flex items-center justify-center ml-2 mt-1">
          <User className="w-3.5 h-3.5 text-[#71717a]" />
        </div>
      )}
    </motion.div>
  )
})

export default ChannelMessage
