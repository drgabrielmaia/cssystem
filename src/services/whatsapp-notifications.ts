import { supabase } from '@/lib/supabase'

interface NotificationData {
  organizationId: string
  message: string
  context?: any
}

interface Organization {
  id: string
  name: string
  admin_phone: string
}

export class WhatsAppNotificationService {
  
  /**
   * Buscar dados da organização para notificação
   */
  private async getOrganizationData(organizationId: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, admin_phone')
        .eq('id', organizationId)
        .single()

      if (error || !data) {
        console.error('❌ Erro ao buscar organização:', error?.message)
        return null
      }

      return data
    } catch (error) {
      console.error('❌ Erro ao buscar dados da organização:', error)
      return null
    }
  }

  /**
   * Enviar notificação WhatsApp para admin da organização
   */
  private async sendToAdmin(organizationId: string, message: string): Promise<boolean> {
    try {
      const org = await this.getOrganizationData(organizationId)
      
      if (!org || !org.admin_phone) {
        console.error('❌ Organização sem admin_phone:', organizationId)
        return false
      }

      console.log('📱 Enviando notificação para admin:', org.admin_phone)
      console.log('📝 Mensagem:', message.substring(0, 100) + '...')

      // Usar API WhatsApp Multi-Service com userId = organizationId
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: org.admin_phone,
          message: message,
          sender: 'system',
          organizationId: organizationId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Erro na API WhatsApp:', result)
        return false
      }

      console.log('✅ Notificação enviada com sucesso!')
      return true

    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error)
      return false
    }
  }

  /**
   * Notificação quando evento é criado
   */
  async notifyEventCreated(data: {
    organizationId: string
    eventTitle: string
    eventDate: string
    eventTime?: string
    leadName?: string
    mentoradoName?: string
    description?: string
  }): Promise<boolean> {
    try {
      const { eventTitle, eventDate, eventTime, leadName, mentoradoName, description } = data

      const formattedDate = new Date(eventDate).toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Sao_Paulo'
      })

      let message = `🗓️ *NOVO EVENTO CRIADO*\n\n`
      message += `📋 *Título:* ${eventTitle}\n`
      message += `📅 *Data:* ${formattedDate}\n`
      
      if (eventTime) {
        message += `⏰ *Horário:* ${eventTime}\n`
      }

      if (description) {
        message += `📝 *Descrição:* ${description}\n`
      }

      if (leadName) {
        message += `👤 *Lead:* ${leadName}\n`
      }

      if (mentoradoName) {
        message += `🎓 *Mentorado:* ${mentoradoName}\n`
      }

      message += `\n✅ Evento adicionado ao calendário!`

      return await this.sendToAdmin(data.organizationId, message)

    } catch (error) {
      console.error('❌ Erro ao notificar evento criado:', error)
      return false
    }
  }

  /**
   * Notificação quando pendência é paga
   */
  async notifyPendencyPaid(data: {
    organizationId: string
    personName: string
    amount: number
    description?: string
    paymentMethod?: string
  }): Promise<boolean> {
    try {
      const { personName, amount, description, paymentMethod } = data

      const formattedAmount = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(amount)

      let message = `💰 *PENDÊNCIA PAGA*\n\n`
      message += `👤 *Cliente:* ${personName}\n`
      message += `💵 *Valor:* ${formattedAmount}\n`

      if (description) {
        message += `📝 *Descrição:* ${description}\n`
      }

      if (paymentMethod) {
        message += `💳 *Método:* ${paymentMethod}\n`
      }

      message += `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n`
      message += `⏰ *Horário:* ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`
      message += `\n✅ Pagamento confirmado!`

      return await this.sendToAdmin(data.organizationId, message)

    } catch (error) {
      console.error('❌ Erro ao notificar pendência paga:', error)
      return false
    }
  }

  /**
   * Notificação de follow-up vencido
   */
  async notifyFollowUpDue(data: {
    organizationId: string
    leadName: string
    leadPhone?: string
    followUpType: string
    dueDate: string
    notes?: string
  }): Promise<boolean> {
    try {
      const { leadName, leadPhone, followUpType, dueDate, notes } = data

      const formattedDate = new Date(dueDate).toLocaleDateString('pt-BR')

      let message = `⏰ *FOLLOW-UP VENCIDO*\n\n`
      message += `👤 *Lead:* ${leadName}\n`
      
      if (leadPhone) {
        message += `📱 *Telefone:* ${leadPhone}\n`
      }

      message += `📋 *Tipo:* ${followUpType}\n`
      message += `📅 *Data prevista:* ${formattedDate}\n`

      if (notes) {
        message += `📝 *Observações:* ${notes}\n`
      }

      message += `\n🔔 Lembrete: É hora de fazer o follow-up!`

      return await this.sendToAdmin(data.organizationId, message)

    } catch (error) {
      console.error('❌ Erro ao notificar follow-up:', error)
      return false
    }
  }

  /**
   * Notificação quando lead é convertido
   */
  async notifyLeadConverted(data: {
    organizationId: string
    leadName: string
    saleValue: number
    closer?: string
    product?: string
  }): Promise<boolean> {
    try {
      const { leadName, saleValue, closer, product } = data

      const formattedAmount = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(saleValue)

      let message = `🎉 *NOVA VENDA CONFIRMADA*\n\n`
      message += `👤 *Cliente:* ${leadName}\n`
      message += `💰 *Valor:* ${formattedAmount}\n`

      if (product) {
        message += `📦 *Produto:* ${product}\n`
      }

      if (closer) {
        message += `👨‍💼 *Closer:* ${closer}\n`
      }

      message += `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n`
      message += `⏰ *Horário:* ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`
      message += `\n🎯 Parabéns pela venda!`

      return await this.sendToAdmin(data.organizationId, message)

    } catch (error) {
      console.error('❌ Erro ao notificar conversão:', error)
      return false
    }
  }

  /**
   * Notificação genérica personalizada
   */
  async notifyCustom(data: {
    organizationId: string
    title: string
    message: string
    emoji?: string
  }): Promise<boolean> {
    try {
      const { title, message, emoji = '🔔' } = data

      const notification = `${emoji} *${title.toUpperCase()}*\n\n${message}\n\n📅 ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

      return await this.sendToAdmin(data.organizationId, notification)

    } catch (error) {
      console.error('❌ Erro ao enviar notificação personalizada:', error)
      return false
    }
  }
}

// Instância singleton
export const whatsappNotifications = new WhatsAppNotificationService()