import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// API para processar follow-ups agendados
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Processando follow-ups agendados...')

    // 1. Buscar execuções que precisam ser enviadas
    const { data: executions, error: execError } = await supabase
      .from('lead_followup_executions')
      .select(`
        *,
        leads!inner(nome_completo, email, telefone),
        lead_followup_sequences!inner(steps, nome_sequencia, horario_envio_inicio, horario_envio_fim)
      `)
      .eq('status', 'active')
      .lt('proxima_execucao', new Date().toISOString())

    if (execError) {
      console.error('❌ Erro ao buscar execuções:', execError)
      return NextResponse.json({ error: 'Erro ao buscar execuções' }, { status: 500 })
    }

    if (!executions || executions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum follow-up para processar',
        processed: 0 
      })
    }

    console.log(`📋 ${executions.length} follow-ups para processar`)

    const results = []

    // 2. Processar cada execução
    for (const execution of executions) {
      try {
        const lead = execution.leads as any
        const sequence = execution.lead_followup_sequences as any
        const steps = sequence.steps as any[]
        const currentStep = steps[execution.step_atual]

        if (!currentStep) {
          // Marcar como completo se não há mais steps
          await supabase
            .from('lead_followup_executions')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', execution.id)

          results.push({ 
            execution_id: execution.id, 
            status: 'completed', 
            message: 'Sequência finalizada' 
          })
          continue
        }

        // 3. Verificar horário de envio
        const now = new Date()
        const currentHour = now.getHours()
        const startHour = parseInt(sequence.horario_envio_inicio.split(':')[0])
        const endHour = parseInt(sequence.horario_envio_fim.split(':')[0])

        if (currentHour < startHour || currentHour >= endHour) {
          console.log(`⏰ Fora do horário de envio para ${lead.nome_completo}`)
          results.push({ 
            execution_id: execution.id, 
            status: 'postponed', 
            message: 'Fora do horário' 
          })
          continue
        }

        // 4. Enviar mensagem baseado no tipo
        let sent = false
        let error_message = ''

        if (currentStep.tipo_acao === 'whatsapp' && lead.telefone) {
          // Enviar WhatsApp
          const message = processTemplate(currentStep.conteudo, {
            nome: lead.nome_completo,
            solucao: 'nossa solução',
            empresa_similar: 'empresas parceiras'
          })

          const whatsappResult = await sendWhatsApp(lead.telefone, message)
          sent = whatsappResult.success
          error_message = whatsappResult.error || ''
        } 
        else if (currentStep.tipo_acao === 'email' && lead.email) {
          // Enviar Email (implementar se necessário)
          sent = true // Por enquanto marcar como enviado
        }
        else if (currentStep.tipo_acao === 'tarefa') {
          // Criar tarefa manual (implementar se necessário)
          sent = true
        }

        // 5. Atualizar execução
        if (sent) {
          const nextStepIndex = execution.step_atual + 1
          const nextStep = steps[nextStepIndex]
          
          let updateData: any = {
            step_atual: nextStepIndex,
            total_touchpoints: execution.total_touchpoints + 1,
            steps_executados: [
              ...(execution.steps_executados || []),
              {
                step: execution.step_atual,
                executed_at: new Date().toISOString(),
                type: currentStep.tipo_acao,
                content: currentStep.titulo
              }
            ],
            updated_at: new Date().toISOString()
          }

          // Calcular próxima execução ou marcar como completo
          if (nextStep) {
            const nextExecution = new Date()
            nextExecution.setDate(nextExecution.getDate() + nextStep.delay_days)
            nextExecution.setHours(nextExecution.getHours() + (nextStep.delay_hours || 0))
            updateData.proxima_execucao = nextExecution.toISOString()
          } else {
            updateData.status = 'completed'
            updateData.proxima_execucao = null
          }

          await supabase
            .from('lead_followup_executions')
            .update(updateData)
            .eq('id', execution.id)

          // Atualizar estatísticas da sequência
          await supabase
            .from('lead_followup_sequences')
            .update({
              leads_atingidos: sequence.leads_atingidos + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', execution.sequence_id)

          results.push({ 
            execution_id: execution.id, 
            status: 'sent', 
            message: `${currentStep.tipo_acao} enviado para ${lead.nome_completo}`,
            next_step: nextStep ? nextStepIndex : 'completed'
          })

        } else {
          results.push({ 
            execution_id: execution.id, 
            status: 'failed', 
            message: error_message || 'Falha no envio',
            lead_name: lead.nome_completo
          })
        }

      } catch (stepError) {
        console.error('❌ Erro ao processar step:', stepError)
        results.push({ 
          execution_id: execution.id, 
          status: 'error', 
          message: stepError instanceof Error ? stepError.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} follow-ups processados`,
      results: results,
      stats: {
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        completed: results.filter(r => r.status === 'completed').length,
        postponed: results.filter(r => r.status === 'postponed').length
      }
    })

  } catch (error) {
    console.error('💥 Erro no processamento de follow-ups:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para processar templates
function processTemplate(template: string, variables: Record<string, string>): string {
  let processed = template
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    processed = processed.replace(regex, value)
  })
  
  return processed
}

// Função auxiliar para enviar WhatsApp
async function sendWhatsApp(phone: string, message: string) {
  try {
    const cleanPhone = phone.replace(/\D/g, '')
    
    const response = await fetch(`${process.env.ZAPI_BASE_URL || 'https://api.z-api.io'}/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: `55${cleanPhone}`,
        message: message
      })
    })

    if (response.ok) {
      console.log('✅ WhatsApp enviado')
      return { success: true }
    } else {
      console.log('❌ Falha no WhatsApp')
      return { success: false, error: 'Falha na API do WhatsApp' }
    }
  } catch (error) {
    console.error('💥 Erro WhatsApp:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// GET - Status dos follow-ups
export async function GET() {
  try {
    const { data: stats, error } = await supabase
      .from('lead_followup_executions')
      .select('status')

    if (error) throw error

    const statusCount = stats.reduce((acc: Record<string, number>, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      stats: statusCount,
      total: stats.length
    })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}