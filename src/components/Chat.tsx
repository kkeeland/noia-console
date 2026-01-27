import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Mic, Paperclip, Sparkles } from 'lucide-react'

interface Message {
  id: number
  text: string
  sender: 'user' | 'noia'
  timestamp: Date
}

const initialMessages: Message[] = [
  { id: 1, text: "Hey Noia, let's build something beautiful today.", sender: 'user', timestamp: new Date(Date.now() - 60000) },
  { id: 2, text: "I'm ready! What are we working on? 🎯", sender: 'noia', timestamp: new Date(Date.now() - 30000) },
]

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    
    setMessages([...messages, {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    }])
    setInput('')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[#1e1e2e]">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Chat
          <span className="text-sm font-normal text-[#71717a]">with Noia</span>
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`
              max-w-[70%] p-4 rounded-2xl
              ${message.sender === 'user' 
                ? 'bg-[#8b5cf6] text-white rounded-br-md' 
                : 'bg-[#12121a] border border-[#1e1e2e] rounded-bl-md'
              }
            `}>
              {message.sender === 'noia' && (
                <div className="flex items-center gap-2 mb-2 text-[#8b5cf6]">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Noia</span>
                </div>
              )}
              <p className="leading-relaxed">{message.text}</p>
              <p className={`text-xs mt-2 ${message.sender === 'user' ? 'text-white/60' : 'text-[#71717a]'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-[#1e1e2e]">
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-[#12121a] border border-[#1e1e2e] focus-within:border-[#8b5cf6]/50 transition-colors">
          <button className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors text-[#71717a] hover:text-[#e4e4e7]">
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message Noia..."
            className="flex-1 bg-transparent outline-none placeholder:text-[#71717a]"
          />
          <button className="p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors text-[#71717a] hover:text-[#e4e4e7]">
            <Mic className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSend}
            className="p-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] transition-colors text-white"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
