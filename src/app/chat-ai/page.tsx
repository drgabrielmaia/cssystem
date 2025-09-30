'use client'

import { ModernChat } from '@/components/chat/modern-chat'

export default function ChatAIPage() {
  const handleSendMessage = async (message: string): Promise<string> => {
    try {
      const response = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ message }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        return data.response
      } else {
        return data.response || 'Erro ao processar sua mensagem.'
      }
    } catch (error) {
      console.error('Erro na comunicação com IA:', error)
      return 'Erro de conexão. Verifique se o serviço de IA está funcionando.'
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full">
        <ModernChat
          onSendMessage={handleSendMessage}
          className="h-full"
          placeholder="Digite sua solicitação... Ex: 'Quantos mentorados temos?'"
          welcomeMessage="Olá! Sou seu assistente de Customer Success com IA integrada (Gemma 3:4b). 

🧠 **Posso fazer qualquer coisa no sistema:**
• Contar mentorados reais do banco de dados
• Analisar formulários inteligentemente  
• Registrar pendências de pagamento
• Gerar insights com IA sobre os dados
• Cadastrar novos mentorados
• Buscar informações específicas

**Exemplos:**
• 'Quantos mentorados temos?'
• 'Analise os formulários e me dê insights'
• 'João Silva deve 5000 de outubro'
• 'Me dê um relatório completo'

Como posso ajudar?"
        />
      </div>
    </div>
  )
}