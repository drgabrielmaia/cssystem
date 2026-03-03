'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Sparkles, Loader2, Brain, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface EmbeddedAIChatProps {
  /** Function that returns the context string for the AI based on current page data */
  contextBuilder: () => string
  /** System prompt persona for the AI */
  systemPrompt: string
  /** Title shown in the chat header */
  title?: string
  /** Subtitle shown in the chat header */
  subtitle?: string
  /** Suggested questions shown when chat is empty */
  suggestions?: string[]
  /** Accent color for gradients (tailwind class suffix) */
  accentColor?: 'violet' | 'emerald' | 'blue' | 'amber'
  /** User email for API auth */
  userEmail?: string
  /** Whether the chat starts collapsed */
  defaultCollapsed?: boolean
}

const ACCENT_COLORS = {
  violet: {
    gradient: 'from-violet-600 to-indigo-700',
    gradientHover: 'hover:from-violet-500 hover:to-indigo-600',
    shadow: 'shadow-violet-500/20',
    ring: 'focus:ring-violet-500/30 focus:border-violet-500/30',
    headerBg: 'from-violet-600/10 to-indigo-600/10',
    msgBg: 'from-violet-600 to-indigo-700',
    text: 'text-violet-400',
    textStrong: 'text-violet-300',
    suggestionHover: 'hover:bg-violet-500/10 hover:border-violet-500/20 hover:text-violet-300',
    iconBg: 'from-violet-600/20 to-indigo-600/20',
    iconBorder: 'border-violet-500/20',
    dot: 'bg-emerald-500',
  },
  emerald: {
    gradient: 'from-emerald-600 to-teal-700',
    gradientHover: 'hover:from-emerald-500 hover:to-teal-600',
    shadow: 'shadow-emerald-500/20',
    ring: 'focus:ring-emerald-500/30 focus:border-emerald-500/30',
    headerBg: 'from-emerald-600/10 to-teal-600/10',
    msgBg: 'from-emerald-600 to-teal-700',
    text: 'text-emerald-400',
    textStrong: 'text-emerald-300',
    suggestionHover: 'hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-300',
    iconBg: 'from-emerald-600/20 to-teal-600/20',
    iconBorder: 'border-emerald-500/20',
    dot: 'bg-violet-500',
  },
  blue: {
    gradient: 'from-blue-600 to-cyan-700',
    gradientHover: 'hover:from-blue-500 hover:to-cyan-600',
    shadow: 'shadow-blue-500/20',
    ring: 'focus:ring-blue-500/30 focus:border-blue-500/30',
    headerBg: 'from-blue-600/10 to-cyan-600/10',
    msgBg: 'from-blue-600 to-cyan-700',
    text: 'text-blue-400',
    textStrong: 'text-blue-300',
    suggestionHover: 'hover:bg-blue-500/10 hover:border-blue-500/20 hover:text-blue-300',
    iconBg: 'from-blue-600/20 to-cyan-600/20',
    iconBorder: 'border-blue-500/20',
    dot: 'bg-emerald-500',
  },
  amber: {
    gradient: 'from-amber-600 to-orange-700',
    gradientHover: 'hover:from-amber-500 hover:to-orange-600',
    shadow: 'shadow-amber-500/20',
    ring: 'focus:ring-amber-500/30 focus:border-amber-500/30',
    headerBg: 'from-amber-600/10 to-orange-600/10',
    msgBg: 'from-amber-600 to-orange-700',
    text: 'text-amber-400',
    textStrong: 'text-amber-300',
    suggestionHover: 'hover:bg-amber-500/10 hover:border-amber-500/20 hover:text-amber-300',
    iconBg: 'from-amber-600/20 to-orange-600/20',
    iconBorder: 'border-amber-500/20',
    dot: 'bg-emerald-500',
  },
}

export default function EmbeddedAIChat({
  contextBuilder,
  systemPrompt,
  title = 'Assistente IA',
  subtitle = 'Análise em tempo real',
  suggestions = [],
  accentColor = 'violet',
  userEmail = 'admin@system.com',
  defaultCollapsed = false,
}: EmbeddedAIChatProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const colors = ACCENT_COLORS[accentColor]

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const analyticsContext = contextBuilder()
      const fullSystemPrompt = `${systemPrompt}\n\nDADOS DISPONÍVEIS:\n${analyticsContext}\n\nREGRAS:\n- Responda SEMPRE em português brasileiro\n- Base suas análises EXCLUSIVAMENTE nos dados fornecidos\n- Se não tem dados suficientes, diga claramente\n- Use markdown para formatar (negrito, listas, títulos)\n- Sempre que possível, cite números específicos dos dados`

      const response = await fetch('/api/chat-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          userEmail,
          context: {
            nome: title,
            especialidade: 'Analytics',
            tipoPost: 'chat',
            tomComunicacao: 'profissional e direto',
            persona: fullSystemPrompt,
            publicoAlvo: 'gestores',
            doresDesejos: [],
            problemasAudiencia: '',
            desejoAudiencia: '',
            transformacao: ''
          }
        })
      })

      const data = await response.json()

      if (data.success && data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, tive um problema ao processar sua solicitação. Tente novamente.' }])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro de conexão. Verifique sua internet e tente novamente.' }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, contextBuilder, systemPrompt, userEmail, title])

  return (
    <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className={`flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r ${colors.headerBg} cursor-pointer select-none`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg ${colors.shadow}`}>
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {title}
              <Sparkles className={`h-3.5 w-3.5 ${colors.text}`} />
            </h3>
            <p className="text-[10px] text-white/40">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setMessages([]) }}
              className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Limpar conversa"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all">
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* Chat Body */}
      {!isCollapsed && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-h-[500px] min-h-[300px] scrollbar-thin scrollbar-thumb-white/10">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.iconBg} border ${colors.iconBorder} flex items-center justify-center mb-4`}>
                  <Bot className={`h-7 w-7 ${colors.text}`} />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
                <p className="text-xs text-white/40 mb-5 max-w-[300px]">
                  Pergunte qualquer coisa sobre os dados desta tela. Tenho acesso a todas as métricas em tempo real.
                </p>
                {suggestions.length > 0 && (
                  <div className="space-y-2 w-full max-w-sm">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion)
                          setTimeout(() => inputRef.current?.focus(), 100)
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs text-white/50 bg-white/[0.03] border border-white/[0.06] rounded-xl ${colors.suggestionHover} transition-all`}
                      >
                        <Sparkles className={`h-3 w-3 inline mr-2 ${colors.text} opacity-50`} />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? `bg-gradient-to-br ${colors.msgBg} text-white rounded-br-md`
                    : 'bg-white/[0.05] border border-white/[0.06] text-white/80 rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className={`prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-medium [&_strong]:${colors.textStrong} [&_code]:text-emerald-400 [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-white/[0.08] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-white/60" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0`}>
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-white/[0.05] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className={`h-4 w-4 ${colors.text} animate-spin`} />
                    <span className="text-xs text-white/40">Analisando dados...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/[0.06] bg-[#111115]">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Pergunte sobre os dados..."
                rows={1}
                className={`flex-1 resize-none bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 ${colors.ring} transition-all max-h-32`}
                style={{ minHeight: '44px' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors.gradient} text-white flex items-center justify-center ${colors.gradientHover} disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg ${colors.shadow}`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
