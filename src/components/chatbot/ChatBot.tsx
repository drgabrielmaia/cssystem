'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, TrendingUp, DollarSign, Users, Phone } from 'lucide-react'
import { useChatBotData } from '@/hooks/useChatBotData'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

interface QuickAction {
  id: string
  text: string
  icon: any
  query: string
}

const quickActions: QuickAction[] = [
  {
    id: 'faturamento-mes',
    text: 'Faturamento do mês',
    icon: DollarSign,
    query: 'Qual foi o faturamento deste mês?'
  },
  {
    id: 'faturamento-hoje',
    text: 'Vendas hoje',
    icon: TrendingUp,
    query: 'Quantas vendas tivemos hoje?'
  },
  {
    id: 'leads-hoje',
    text: 'Leads hoje',
    icon: Users,
    query: 'Quantos leads entraram hoje no funil?'
  },
  {
    id: 'calls-fechadas',
    text: 'Calls fechadas',
    icon: Phone,
    query: 'Quantas calls foram fechadas hoje?'
  }
]

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! 👋 Eu posso te ajudar com informações sobre seu negócio. O que você gostaria de saber?',
      sender: 'bot',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { metrics, loading } = useChatBotData()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const processQuery = async (query: string): Promise<string> => {
    const lowerQuery = query.toLowerCase()
    
    // Simulando delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Reconhecimento de palavras-chave para faturamento
    if (lowerQuery.includes('faturamento') || lowerQuery.includes('vendas') || lowerQuery.includes('receita')) {
      if (lowerQuery.includes('mês') || lowerQuery.includes('mensal')) {
        const percentual = metrics.metaDiaria > 0 ? ((metrics.faturamentoMes / (metrics.metaDiaria * 30)) * 100).toFixed(0) : 0
        return `💰 **Faturamento do mês:** ${formatCurrency(metrics.faturamentoMes)}\n\n📊 Meta mensal: ${formatCurrency(metrics.metaDiaria * 30)} (${percentual}%)`
      }
      if (lowerQuery.includes('hoje') || lowerQuery.includes('dia')) {
        const percentual = metrics.metaDiaria > 0 ? ((metrics.faturamentoHoje / metrics.metaDiaria) * 100).toFixed(0) : 0
        return `💰 **Vendas de hoje:** ${formatCurrency(metrics.faturamentoHoje)}\n\n🎯 Meta diária: ${formatCurrency(metrics.metaDiaria)} (${percentual}%)`
      }
    }
    
    // Reconhecimento para leads
    if (lowerQuery.includes('leads') || lowerQuery.includes('prospects')) {
      if (lowerQuery.includes('hoje') || lowerQuery.includes('dia')) {
        return `👥 **Leads de hoje:** ${metrics.leadsHoje} novos leads\n\n📈 Performance: ${metrics.leadsHoje >= 10 ? 'Boa!' : 'Pode melhorar'}`
      }
      if (lowerQuery.includes('semana')) {
        const percentual = metrics.metaSemanal > 0 ? ((metrics.leadsSemana / metrics.metaSemanal) * 100).toFixed(0) : 0
        return `👥 **Leads da semana:** ${metrics.leadsSemana} leads\n\n📊 Meta semanal: ${metrics.metaSemanal} leads (${percentual}%)`
      }
    }
    
    // Reconhecimento para calls
    if (lowerQuery.includes('call') || lowerQuery.includes('ligaç') || lowerQuery.includes('atendimento')) {
      if (lowerQuery.includes('fechada') || lowerQuery.includes('vendida') || lowerQuery.includes('convertida')) {
        const taxaConversao = metrics.totalCalls > 0 ? ((metrics.callsFechadas / metrics.totalCalls) * 100).toFixed(0) : 0
        return `📞 **Calls fechadas hoje:** ${metrics.callsFechadas} de ${metrics.totalCalls}\n\n💼 Taxa de conversão: ${taxaConversao}%\n🎯 Ticket médio: ${formatCurrency(metrics.ticketMedio)}`
      }
      if (lowerQuery.includes('agendada') || lowerQuery.includes('marcada')) {
        return `📅 **Calls agendadas:** ${metrics.callsAgendadas} para hoje\n\n⏰ Status: ${metrics.callsAgendadas > 0 ? 'Agenda ativa!' : 'Nenhuma call agendada'}`
      }
    }
    
    // Reconhecimento para métricas gerais
    if (lowerQuery.includes('resumo') || lowerQuery.includes('dashboard') || lowerQuery.includes('métricas')) {
      const metaPercentual = metrics.metaDiaria > 0 ? ((metrics.faturamentoHoje / metrics.metaDiaria) * 100).toFixed(0) : 0
      return `📊 **Resumo do dia:**\n\n💰 Vendas: ${formatCurrency(metrics.faturamentoHoje)}\n👥 Leads: ${metrics.leadsHoje} novos\n📞 Calls: ${metrics.callsFechadas}/${metrics.totalCalls} fechadas\n🎯 Meta diária: ${metaPercentual}%`
    }
    
    // Resposta genérica para queries não reconhecidas
    return '🤔 Hmm, não entendi muito bem sua pergunta. Posso te ajudar com:\n\n• Faturamento (dia/mês)\n• Leads (hoje/semana)\n• Calls fechadas/agendadas\n• Resumo geral\n\nTente reformular sua pergunta!'
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return

    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)

    // Processar resposta
    try {
      const response = await processQuery(text)
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '❌ Ops! Tive um problema para buscar essa informação. Tente novamente em alguns segundos.',
        sender: 'bot',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.query)
  }

  const formatMessage = (text: string) => {
    // Converter **text** para bold
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Converter quebras de linha
    formatted = formatted.replace(/\n/g, '<br>')
    
    return formatted
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg transition-all duration-300 z-50 flex items-center justify-center ${
          isOpen 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed z-40 flex flex-col bg-white shadow-2xl 
                        lg:bottom-24 lg:right-6 lg:w-80 lg:h-96 lg:rounded-lg
                        md:bottom-24 md:right-6 md:w-80 md:h-96 md:rounded-lg
                        sm:bottom-0 sm:left-0 sm:right-0 sm:w-full sm:h-[70vh] sm:rounded-t-2xl sm:rounded-b-none">
          {/* Header */}
          <div className="bg-blue-500 text-white p-4 
                          lg:rounded-t-lg 
                          md:rounded-t-lg 
                          sm:rounded-t-2xl">
            <h3 className="font-semibold">Assistant GM 🤖</h3>
            <p className="text-blue-100 text-xs">Pergunte sobre suas métricas</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: formatMessage(message.text) 
                    }}
                    className="text-sm whitespace-pre-wrap"
                  />
                  <div className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="p-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-2">Perguntas rápidas:</div>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    className="flex items-center gap-2 p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <action.icon className="w-3 h-3 text-blue-500" />
                    <span className="truncate">{action.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-200">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage(inputText)
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Digite sua pergunta..."
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

    </>
  )
}