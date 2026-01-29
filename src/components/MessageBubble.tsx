import { useState, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ChevronRight, Copy, Check, Sparkles, Wrench } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Message, MessageContent } from '../types/clawdbot'
import { getMessageText, hasThinking, getThinkingText } from '../lib/api'

interface MessageBubbleProps {
  message: Message
  index: number
  isStreamingMessage?: boolean
}

// --- Code Block with Copy + Language Tag ---
function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const lang = match?.[1] || ''
  const code = String(children).replace(/\n$/, '')

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="relative group/code my-3 rounded-lg overflow-hidden border border-[#1e1e2e]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#141420] border-b border-[#1e1e2e]">
        <span className="text-[11px] text-[#52525b] font-mono">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover/code:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-[#71717a] hover:text-[#e4e4e7]"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 bg-[#0a0a0f] overflow-x-auto text-[13px] leading-relaxed">
        <code className={`${className || ''} text-[#e4e4e7]`}>{children}</code>
      </pre>
    </div>
  )
}

// --- Tool Call Expandable ---
function ToolCallBubble({ content }: { content: MessageContent & { type: 'toolCall' } }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#a78bfa] transition-colors group"
      >
        <Wrench className="w-3 h-3 group-hover:rotate-12 transition-transform" />
        <span className="font-mono">{content.name}</span>
        <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <pre className="mt-1.5 p-2.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] text-xs text-[#71717a] font-mono overflow-x-auto max-h-[300px]">
              {JSON.stringify(content.arguments, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Streaming Cursor ---
function StreamingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, times: [0, 0.45, 0.55, 1] }}
      className="inline-block w-[2px] h-[1.1em] bg-[#8b5cf6] ml-0.5 align-text-bottom"
    />
  )
}

// --- Thinking Block ---
function ThinkingBlock({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mx-4 mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#a78bfa] transition-colors group"
      >
        <Brain className="w-3 h-3 group-hover:scale-110 transition-transform" />
        <span>{expanded ? 'Hide' : 'Show'} thinking</span>
        {isStreaming && (
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-[#8b5cf6]"
          >
            ···
          </motion.span>
        )}
        <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e] border-l-2 border-l-[#8b5cf6]/30 text-xs text-[#71717a] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#2e2e3e]">
              <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                {text}
                {isStreaming && <StreamingCursor />}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Main MessageBubble ---
const MessageBubble = memo(function MessageBubble({ message, index, isStreamingMessage }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  const text = getMessageText(message)
  const thinking = hasThinking(message) ? getThinkingText(message) : null
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  const toolCalls = message.content.filter(
    (c): c is MessageContent & { type: 'toolCall' } => c.type === 'toolCall'
  )

  if (!text && !thinking && toolCalls.length === 0) return null

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  // System messages
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center"
      >
        <div className="px-3 py-1.5 rounded-full bg-[#1e1e2e]/50 text-xs text-[#71717a] max-w-[80%] truncate">
          {text}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.2) }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative max-w-[85%] lg:max-w-[75%]">
        {/* Copy button (hover) */}
        <AnimatePresence>
          {hovered && text && !isStreamingMessage && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleCopy}
              className={`absolute -top-2 ${isUser ? '-left-9' : '-right-9'} p-1.5 rounded-lg bg-[#1e1e2e] border border-[#2e2e3e] text-[#71717a] hover:text-[#e4e4e7] transition-colors z-10`}
              title="Copy message"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </motion.button>
          )}
        </AnimatePresence>

        <div className={`
          rounded-2xl overflow-hidden
          ${isUser
            ? 'bg-[#8b5cf6] text-white rounded-br-md'
            : 'bg-[#12121a] border border-[#1e1e2e] rounded-bl-md text-[#e4e4e7]'
          }
        `}>
          {/* Assistant header */}
          {!isUser && (
            <div className="flex items-center gap-2 px-4 pt-3 text-[#8b5cf6]">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold tracking-wide uppercase">Noia</span>
              {isStreamingMessage && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="ml-auto text-[10px] text-[#8b5cf6]/60 font-mono"
                >
                  streaming
                </motion.div>
              )}
            </div>
          )}

          {/* Thinking block */}
          {thinking && !isUser && (
            <ThinkingBlock text={thinking} isStreaming={isStreamingMessage} />
          )}

          {/* Tool calls */}
          {toolCalls.length > 0 && (
            <div className="px-4 pt-2">
              {toolCalls.map((tc) => (
                <ToolCallBubble key={tc.id} content={tc} />
              ))}
            </div>
          )}

          {/* Message text */}
          {text && (
            <div className={isUser ? 'px-4 py-3' : 'px-4 py-2'}>
              {isUser ? (
                <p className="leading-relaxed whitespace-pre-wrap text-sm">{text}</p>
              ) : (
                <div className="gh-markdown">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      code({ className, children, ...props }) {
                        const isInline = !className && typeof children === 'string' && !children.includes('\n')
                        if (isInline) {
                          return (
                            <code className="px-1.5 py-0.5 rounded-md bg-[#1e1e2e] text-[#a78bfa] text-[13px] font-mono" {...props}>
                              {children}
                            </code>
                          )
                        }
                        return <CodeBlock className={className}>{children}</CodeBlock>
                      },
                      pre({ children }) {
                        return <>{children}</>
                      },
                      // Links open in new tab
                      a({ href, children, ...props }) {
                        return (
                          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                            {children}
                          </a>
                        )
                      },
                    }}
                  >
                    {text}
                  </ReactMarkdown>
                  {isStreamingMessage && <StreamingCursor />}
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          {timestamp && (
            <div className={`px-4 pb-2 ${isUser ? 'text-white/40' : 'text-[#3f3f46]'}`}>
              <span className="text-[10px]">{timestamp}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

export default MessageBubble
