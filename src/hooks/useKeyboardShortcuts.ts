import { useEffect, useCallback } from 'react'

type View = 'dashboard' | 'chat' | 'channels' | 'people' | 'memory' | 'rhythms' | 'code' | 'tasks' | 'agents' | 'settings'

const viewOrder: View[] = ['dashboard', 'chat', 'channels', 'people', 'memory', 'rhythms', 'code', 'tasks', 'agents', 'settings']

interface UseKeyboardShortcutsOptions {
  setActiveView: (view: View) => void
  onEscape?: () => void
}

/**
 * Global keyboard shortcut handler for Noia Console.
 *
 * ⌘1-7  — Switch views
 * ⌘K    — Open command palette
 * ⌘/    — Focus chat input
 * Escape — Close modals/panels
 */
export function useKeyboardShortcuts({ setActiveView, onEscape }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey

    // ⌘1-7: Switch views
    if (mod) {
      const num = parseInt(e.key)
      if (num >= 1 && num <= viewOrder.length) {
        e.preventDefault()
        setActiveView(viewOrder[num - 1])
        return
      }
    }

    // ⌘K: Command palette
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('open-command-palette'))
      return
    }

    // ⌘/: Focus chat input
    if (mod && e.key === '/') {
      e.preventDefault()
      const chatInput = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
        '[data-chat-input], #chat-input, textarea[placeholder*="message" i], textarea[placeholder*="chat" i]'
      )
      if (chatInput) {
        chatInput.focus()
      } else {
        // Switch to chat view then focus after render
        setActiveView('chat')
        requestAnimationFrame(() => {
          const el = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
            '[data-chat-input], #chat-input, textarea[placeholder*="message" i], textarea[placeholder*="chat" i]'
          )
          el?.focus()
        })
      }
      return
    }

    // Escape: Close modals/panels
    if (e.key === 'Escape') {
      // Dispatch a generic close event for modals/panels to listen to
      window.dispatchEvent(new CustomEvent('close-modal'))
      onEscape?.()
      return
    }
  }, [setActiveView, onEscape])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
