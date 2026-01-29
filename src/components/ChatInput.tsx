import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Square, CornerDownLeft } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  onAbort?: () => void
  disabled?: boolean
  isStreaming?: boolean
  placeholder?: string
}

export default function ChatInput({ onSend, onAbort, disabled, isStreaming, placeholder }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const charCount = input.length
  const lineCount = input.split('\n').length
  const isMultiLine = lineCount > 1

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [input])

  // Auto-focus on mount and when enabled
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus()
    }
  }, [disabled])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || disabled) return
    onSend(text)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, disabled, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Enter sends, Shift+Enter or Ctrl+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      handleSend()
    }
    // Escape blurs
    if (e.key === 'Escape') {
      textareaRef.current?.blur()
    }
  }, [handleSend])

  // Handle paste - allow multi-line paste naturally
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    // Let default paste behavior work for text
    // For images, we could handle later
    const items = e.clipboardData?.items
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          // TODO: Image paste handling
          e.preventDefault()
          return
        }
      }
    }
  }, [])

  return (
    <div className="p-3 border-t border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-sm">
      <div
        className={`
          flex items-end gap-3 p-3 rounded-2xl bg-[#12121a] border transition-all duration-200
          ${isFocused
            ? 'border-[#8b5cf6]/50 shadow-[0_0_15px_rgba(139,92,246,0.08)]'
            : 'border-[#1e1e2e] hover:border-[#2e2e3e]'
          }
        `}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || 'Message Noia...'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent outline-none placeholder:text-[#52525b] disabled:opacity-40 resize-none text-[#e4e4e7] text-sm leading-relaxed max-h-[200px] py-1 scrollbar-thin scrollbar-thumb-[#2e2e3e] scrollbar-track-transparent"
        />
        <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
          {/* Char count */}
          <AnimatePresence>
            {charCount > 200 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`text-[10px] tabular-nums font-mono ${
                  charCount > 8000 ? 'text-red-400' : charCount > 4000 ? 'text-yellow-400/70' : 'text-[#52525b]'
                }`}
              >
                {charCount.toLocaleString()}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Hint for multi-line */}
          {isFocused && !isMultiLine && input.length > 0 && (
            <span className="text-[10px] text-[#3f3f46] hidden sm:flex items-center gap-0.5">
              <CornerDownLeft className="w-2.5 h-2.5" />
              <span>shift</span>
            </span>
          )}

          {/* Send / Stop button */}
          {isStreaming ? (
            <motion.button
              onClick={onAbort}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 transition-all text-red-400 hover:text-red-300"
              title="Stop generating (Esc)"
            >
              <Square className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleSend}
              disabled={disabled || !input.trim()}
              whileTap={{ scale: 0.9 }}
              className={`p-2 rounded-xl transition-all ${
                input.trim() && !disabled
                  ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-sm shadow-[#8b5cf6]/20'
                  : 'bg-[#1e1e2e] text-[#52525b] cursor-not-allowed'
              }`}
              title="Send message (Enter)"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}
