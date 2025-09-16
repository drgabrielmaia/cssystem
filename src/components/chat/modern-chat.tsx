'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  RotateCcw,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
}

interface ModernChatProps {
  onSendMessage?: (message: string) => Promise<string>
  className?: string
  placeholder?: string
  welcomeMessage?: string
}

export function ModernChat({ 
  onSendMessage,
  className,
  placeholder = "Digite sua mensagem...",
  welcomeMessage = "Olá! Como posso ajudá-lo hoje?"
}: ModernChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize welcome message on client side only
  useEffect(() => {
    if (!isInitialized) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }])
      setIsInitialized(true)
    }
  }, [welcomeMessage, isInitialized])

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    const scrollToBottom = () => {
      // Try scrollIntoView first (most reliable)
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        })
        return
      }

      // Fallback to manual scroll
      if (scrollAreaRef.current) {
        const scrollContainer = 
          scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') ||
          scrollAreaRef.current.querySelector('.scroll-area-viewport') ||
          scrollAreaRef.current.querySelector('[data-radix-scroll-area-content]') ||
          scrollAreaRef.current
        
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    }

    // Scroll immediately
    scrollToBottom()
    
    // Also scroll after a delay to ensure content is rendered
    const timeoutId = setTimeout(scrollToBottom, 150)
    
    return () => clearTimeout(timeoutId)
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [inputValue])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }

    setMessages(prev => [...prev, userMessage, loadingMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      let response = 'Desculpe, não foi possível processar sua mensagem.'
      
      if (onSendMessage) {
        response = await onSendMessage(userMessage.content)
      }

      // Remove loading message and add real response
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading)
        return [
          ...withoutLoading,
          {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: response,
            timestamp: new Date()
          }
        ]
      })
    } catch (error) {
      // Remove loading message and add error
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading)
        return [
          ...withoutLoading,
          {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
            timestamp: new Date()
          }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date()
    }])
  }

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end' 
      })
    }
  }

  const scrollToTop = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = 
        scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') ||
        scrollAreaRef.current.querySelector('.scroll-area-viewport') ||
        scrollAreaRef.current.querySelector('[data-radix-scroll-area-content]') ||
        scrollAreaRef.current
      
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-50 to-green-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Gemma3 AI Assistant</h3>
            <p className="text-sm text-gray-500">Assistente inteligente para Customer Success</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToTop}
            className="text-gray-500 hover:text-gray-700"
            title="Ir para o topo"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToBottom}
            className="text-gray-500 hover:text-gray-700"
            title="Ir para o fim"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-gray-500 hover:text-gray-700"
            title="Limpar chat"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1">
        <ScrollArea ref={scrollAreaRef} className="h-full p-4">
          <div className="space-y-4 min-h-full">
            {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 group",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white text-xs">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                  message.role === 'user'
                    ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white"
                    : "bg-gray-100 text-gray-900 border"
                )}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-gray-500">Pensando...</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div 
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: message.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/\n- (.*)/g, '\n• $1')
                          .replace(/\n/g, '<br>')
                      }}
                    />
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(message.content)}
                          className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-gray-400">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </ScrollArea>
        
        {/* Floating scroll button */}
        {messages.length > 3 && (
          <Button
            onClick={scrollToBottom}
            size="sm"
            className="absolute bottom-4 right-4 z-10 h-10 w-10 p-0 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg"
            title="Ir para o fim"
          >
            <ChevronDown className="h-4 w-4 text-white" />
          </Button>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={isLoading}
              className="min-h-[40px] max-h-[200px] resize-none border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl pr-12"
              rows={1}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            className="h-10 w-10 p-0 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}