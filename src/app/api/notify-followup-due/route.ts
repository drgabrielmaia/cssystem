import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { whatsappNotifications } from '@/services/whatsapp-notifications'

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Verificando follow-ups vencidos...')

    // Buscar follow-ups vencidos (data anterior ou igual a hoje)
    const hoje = new Date()
    hoje.setHours(23, 59, 59, 999) // Fim do dia

    const { data: followUps, error } = await supabase
      .from('follow_ups')
      .select(`
        *,
        leads!inner(id, nome_completo, telefone, organization_id)
      `)
      .lte('data_followup', hoje.toISOString())
      .eq('status', 'pendente')

    if (error) {
      console.error('❌ Erro ao buscar follow-ups:', error)
      return NextResponse.json({ error: 'Erro ao buscar follow-ups' }, { status: 500 })
    }

    if (!followUps || followUps.length === 0) {
      console.log('✅ Nenhum follow-up vencido encontrado')
      return NextResponse.json({ 
        message: 'Nenhum follow-up vencido',
        processed: 0 
      })
    }

    console.log(`📋 Encontrados ${followUps.length} follow-ups vencidos`)

    let notificationsSent = 0
    let errors = []

    // Agrupar follow-ups por organização
    const followUpsPorOrg = followUps.reduce((acc: any, followUp: any) => {
      const orgId = followUp.leads?.organization_id
      if (!orgId) return acc

      if (!acc[orgId]) {
        acc[orgId] = []
      }
      acc[orgId].push(followUp)
      return acc
    }, {})

    // Enviar notificações para cada organização
    for (const [organizationId, orgFollowUps] of Object.entries(followUpsPorOrg)) {
      try {
        console.log(`📱 Enviando notificações para organização: ${organizationId}`)

        for (const followUp of orgFollowUps as any[]) {
          try {
            await whatsappNotifications.notifyFollowUpDue({
              organizationId: organizationId,
              leadName: followUp.leads.nome_completo,
              leadPhone: followUp.leads.telefone,
              followUpType: followUp.tipo || 'Follow-up',
              dueDate: followUp.data_followup,
              notes: followUp.observacoes
            })

            // Marcar follow-up como notificado
            await supabase
              .from('follow_ups')
              .update({ 
                status: 'notificado',
                data_notificacao: new Date().toISOString()
              })
              .eq('id', followUp.id)

            notificationsSent++
            console.log(`✅ Notificação enviada para: ${followUp.leads.nome_completo}`)

          } catch (followUpError: any) {
            console.error(`❌ Erro ao notificar follow-up ${followUp.id}:`, followUpError)
            errors.push({
              followUpId: followUp.id,
              leadName: followUp.leads.nome_completo,
              error: followUpError?.message || 'Erro desconhecido'
            })
          }
        }

      } catch (orgError: any) {
        console.error(`❌ Erro na organização ${organizationId}:`, orgError)
        errors.push({
          organizationId,
          error: orgError?.message || 'Erro desconhecido'
        })
      }
    }

    console.log(`🎉 Processo concluído: ${notificationsSent} notificações enviadas`)

    return NextResponse.json({
      message: 'Follow-ups processados',
      processed: notificationsSent,
      total: followUps.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('❌ Erro geral na API:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error?.message || 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Endpoint para verificar follow-ups vencidos sem enviar notificações
    const hoje = new Date()
    hoje.setHours(23, 59, 59, 999)

    const { data: followUps, error } = await supabase
      .from('follow_ups')
      .select(`
        id,
        data_followup,
        tipo,
        leads!inner(nome_completo, organization_id)
      `)
      .lte('data_followup', hoje.toISOString())
      .eq('status', 'pendente')

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar follow-ups' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Follow-ups vencidos encontrados',
      total: followUps?.length || 0,
      followUps: followUps || []
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error?.message || 'Erro desconhecido'
    }, { status: 500 })
  }
}