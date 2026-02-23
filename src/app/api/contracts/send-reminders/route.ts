import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ContractWhatsAppService } from '@/lib/contract-whatsapp'

export async function POST() {
  try {
    console.log('🔄 Iniciando processo de lembretes de contrato...')

    // Get contracts expiring in 3 days and 7 days
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    // Query for contracts that need reminders
    const { data: contractsNeedingReminders, error } = await supabase
      .from('contracts')
      .select(`
        id,
        recipient_name,
        recipient_email,
        recipient_phone,
        organization_id,
        expires_at,
        created_at,
        whatsapp_sent_at,
        contract_templates!inner (
          name
        )
      `)
      .eq('status', 'pending')
      .not('recipient_phone', 'is', null)
      .lt('expires_at', sevenDaysFromNow.toISOString())
      .gt('expires_at', new Date().toISOString()) // Not yet expired

    if (error) {
      console.error('❌ Erro ao buscar contratos:', error)
      throw error
    }

    if (!contractsNeedingReminders || contractsNeedingReminders.length === 0) {
      console.log('ℹ️ Nenhum contrato necessita de lembrete no momento')
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum contrato necessita de lembrete',
        sent: 0
      })
    }

    let remindersSent = 0
    const results = []

    for (const contract of contractsNeedingReminders) {
      try {
        const expirationDate = new Date(contract.expires_at)
        const now = new Date()
        const daysUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Only send reminders for 3 days and 7 days before expiry
        if (daysUntilExpiry !== 3 && daysUntilExpiry !== 7) {
          continue
        }

        // Check if we already sent a reminder recently (avoid spam)
        const { data: recentReminders, error: auditError } = await supabase
          .from('contract_audit_log')
          .select('created_at')
          .eq('contract_id', contract.id)
          .eq('event_type', 'reminder_sent')
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

        if (auditError) {
          console.error('❌ Erro ao verificar lembretes recentes:', auditError)
          continue
        }

        if (recentReminders && recentReminders.length > 0) {
          console.log(`⏭️ Lembrete já enviado nas últimas 24h para ${contract.recipient_name}`)
          continue
        }

        console.log(`📱 Enviando lembrete para ${contract.recipient_name} (expira em ${daysUntilExpiry} dias)`)

        const reminderSent = await ContractWhatsAppService.sendContractReminder({
          contractId: contract.id,
          recipientName: contract.recipient_name,
          recipientPhone: contract.recipient_phone,
          organizationId: contract.organization_id,
          templateName: (contract.contract_templates as any).name,
          daysUntilExpiry
        })

        if (reminderSent) {
          // Log the reminder
          await supabase
            .from('contract_audit_log')
            .insert({
              contract_id: contract.id,
              event_type: 'reminder_sent',
              event_data: {
                days_until_expiry: daysUntilExpiry,
                reminder_type: daysUntilExpiry === 3 ? 'urgent' : 'warning',
                sent_at: new Date().toISOString()
              }
            })

          remindersSent++
          results.push({
            contract_id: contract.id,
            recipient_name: contract.recipient_name,
            days_until_expiry: daysUntilExpiry,
            status: 'sent'
          })
          
          console.log(`✅ Lembrete enviado para ${contract.recipient_name}`)
        } else {
          results.push({
            contract_id: contract.id,
            recipient_name: contract.recipient_name,
            days_until_expiry: daysUntilExpiry,
            status: 'failed'
          })
          
          console.log(`❌ Falha ao enviar lembrete para ${contract.recipient_name}`)
        }

        // Add small delay to avoid overwhelming the WhatsApp API
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (contractError) {
        console.error(`❌ Erro ao processar contrato ${contract.id}:`, contractError)
        results.push({
          contract_id: contract.id,
          recipient_name: contract.recipient_name,
          status: 'error',
          error: contractError instanceof Error ? contractError.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ Processo de lembretes concluído: ${remindersSent} lembretes enviados`)

    return NextResponse.json({
      success: true,
      message: `${remindersSent} lembretes enviados com sucesso`,
      sent: remindersSent,
      total_processed: contractsNeedingReminders.length,
      results
    })

  } catch (error) {
    console.error('❌ Erro no processo de lembretes:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Expire old contracts
export async function PUT() {
  try {
    console.log('🔄 Expirando contratos vencidos...')

    const { data, error } = await supabase.rpc('expire_old_contracts')

    if (error) {
      console.error('❌ Erro ao expirar contratos:', error)
      throw error
    }

    const expiredCount = data || 0
    console.log(`✅ ${expiredCount} contratos expirados`)

    return NextResponse.json({
      success: true,
      message: `${expiredCount} contratos expirados`,
      expired_count: expiredCount
    })

  } catch (error) {
    console.error('❌ Erro ao expirar contratos:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}