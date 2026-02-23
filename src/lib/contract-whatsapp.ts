import { supabase } from '@/lib/supabase'

interface ContractWhatsAppData {
  contractId: string
  recipientName: string
  recipientPhone: string
  organizationId: string
  templateName: string
}

export class ContractWhatsAppService {
  private static getSigningUrl(contractId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/assinar-contrato/${contractId}`
  }

  private static formatPhone(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Add country code if not present (assuming Brazil)
    if (cleaned.length === 11 && cleaned.startsWith('11')) {
      return `55${cleaned}` // Add Brazil country code
    } else if (cleaned.length === 10) {
      return `5511${cleaned}` // Add Brazil + SP area code
    } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return cleaned // Already has country code
    }
    
    return cleaned
  }

  private static generateContractMessage(data: ContractWhatsAppData): string {
    const signingUrl = this.getSigningUrl(data.contractId)
    
    return `🤝 *Contrato Digital - Customer Success System*

Olá *${data.recipientName}*!

Você tem um novo contrato para assinatura digital:
📋 *${data.templateName}*

✅ *Para assinar seu contrato:*
1️⃣ Clique no link abaixo
2️⃣ Leia o contrato completo
3️⃣ Preencha as informações adicionais
4️⃣ Faça sua assinatura digital
5️⃣ Confirme a assinatura

🔗 *Link para assinatura:*
${signingUrl}

⏰ *Importante:* Este contrato expira em 30 dias. Assine o quanto antes!

🔒 *Segurança:* Sua assinatura é protegida por criptografia e tem validade legal.

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Customer Success System`
  }

  static async sendContractNotification(data: ContractWhatsAppData): Promise<boolean> {
    try {
      const message = this.generateContractMessage(data)
      const formattedPhone = this.formatPhone(data.recipientPhone)

      console.log(`📤 Enviando contrato via WhatsApp para ${data.recipientName} (${formattedPhone})`)

      // Send via WhatsApp API
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          message: message,
          organizationId: data.organizationId,
          useMultiOrg: true,
          sender: 'contract-system'
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Update contract with WhatsApp sent timestamp
        await supabase
          .from('contracts')
          .update({
            whatsapp_sent_at: new Date().toISOString(),
            whatsapp_message_id: result.data?.messageId || null
          })
          .eq('id', data.contractId)

        // Log the WhatsApp send event
        await supabase
          .from('contract_audit_log')
          .insert({
            contract_id: data.contractId,
            event_type: 'whatsapp_sent',
            event_data: {
              phone: formattedPhone,
              message_id: result.data?.messageId,
              sent_at: new Date().toISOString()
            }
          })

        console.log('✅ Contrato enviado via WhatsApp com sucesso!')
        return true
      } else {
        console.error('❌ Erro ao enviar contrato via WhatsApp:', result.error)
        return false
      }
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de contrato:', error)
      return false
    }
  }

  static async sendContractSigned(data: ContractWhatsAppData): Promise<boolean> {
    try {
      const message = `🎉 *Contrato Assinado com Sucesso!*

Olá *${data.recipientName}*!

Seu contrato foi assinado digitalmente com sucesso! ✅

📋 *Contrato:* ${data.templateName}
📅 *Assinado em:* ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}

✨ *Próximos passos:*
• Você receberá uma cópia por email em breve
• Seu acesso aos serviços foi liberado
• Nossa equipe entrará em contato para dar as boas-vindas

🚀 Bem-vindo(a) ao Customer Success System!

Estamos ansiosos para trabalhar com você e ajudar no seu sucesso!

Atenciosamente,
Equipe Customer Success System`

      const formattedPhone = this.formatPhone(data.recipientPhone)

      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          message: message,
          organizationId: data.organizationId,
          useMultiOrg: true,
          sender: 'contract-system'
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Confirmação de contrato assinado enviada via WhatsApp!')
        return true
      } else {
        console.error('❌ Erro ao enviar confirmação via WhatsApp:', result.error)
        return false
      }
    } catch (error) {
      console.error('❌ Erro ao enviar confirmação de contrato:', error)
      return false
    }
  }

  static async sendContractReminder(data: ContractWhatsAppData & { daysUntilExpiry: number }): Promise<boolean> {
    try {
      const signingUrl = this.getSigningUrl(data.contractId)
      
      const message = `⏰ *Lembrete - Contrato Pendente*

Olá *${data.recipientName}*!

Você ainda tem um contrato pendente de assinatura:
📋 *${data.templateName}*

⚠️ *Atenção:* Seu contrato expira em *${data.daysUntilExpiry} dias*!

🔗 *Assine agora:*
${signingUrl}

✅ *É rápido e seguro:*
• Leitura do contrato: 3-5 min
• Preenchimento: 2 min  
• Assinatura digital: 1 min

Não perca tempo! Garante já seu acesso aos nossos serviços.

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Customer Success System`

      const formattedPhone = this.formatPhone(data.recipientPhone)

      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          message: message,
          organizationId: data.organizationId,
          useMultiOrg: true,
          sender: 'contract-reminder'
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Lembrete de contrato enviado via WhatsApp!')
        return true
      } else {
        console.error('❌ Erro ao enviar lembrete via WhatsApp:', result.error)
        return false
      }
    } catch (error) {
      console.error('❌ Erro ao enviar lembrete de contrato:', error)
      return false
    }
  }
}

// Utility function to automatically send contract after creation
export async function sendContractAfterCreation(contractId: string): Promise<boolean> {
  try {
    // Get contract details
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        id,
        recipient_name,
        recipient_phone,
        organization_id,
        contract_templates!inner (
          name
        )
      `)
      .eq('id', contractId)
      .single()

    if (error || !contract) {
      console.error('❌ Contrato não encontrado para envio WhatsApp:', error)
      return false
    }

    if (!contract.recipient_phone) {
      console.log('⚠️ Contrato sem telefone - não será enviado via WhatsApp')
      return false
    }

    const contractData: ContractWhatsAppData = {
      contractId: contract.id,
      recipientName: contract.recipient_name,
      recipientPhone: contract.recipient_phone,
      organizationId: contract.organization_id,
      templateName: (contract.contract_templates as any).name
    }

    return await ContractWhatsAppService.sendContractNotification(contractData)
  } catch (error) {
    console.error('❌ Erro ao enviar contrato após criação:', error)
    return false
  }
}

// Utility function to send confirmation after signing
export async function sendContractSignedConfirmation(contractId: string): Promise<boolean> {
  try {
    // Get contract details
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        id,
        recipient_name,
        recipient_phone,
        organization_id,
        contract_templates!inner (
          name
        )
      `)
      .eq('id', contractId)
      .single()

    if (error || !contract) {
      console.error('❌ Contrato não encontrado para confirmação WhatsApp:', error)
      return false
    }

    if (!contract.recipient_phone) {
      console.log('⚠️ Contrato sem telefone - confirmação não será enviada via WhatsApp')
      return false
    }

    const contractData: ContractWhatsAppData = {
      contractId: contract.id,
      recipientName: contract.recipient_name,
      recipientPhone: contract.recipient_phone,
      organizationId: contract.organization_id,
      templateName: (contract.contract_templates as any).name
    }

    return await ContractWhatsAppService.sendContractSigned(contractData)
  } catch (error) {
    console.error('❌ Erro ao enviar confirmação de contrato:', error)
    return false
  }
}