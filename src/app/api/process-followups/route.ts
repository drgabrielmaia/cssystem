import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b'
const API_URL = 'http://api.medicosderesultado.com.br'

// API para processar follow-ups agendados
// IMPORTANTE: Processa TODOS os steps pendentes de cada execução em uma única chamada.
// Se step 1 é imediato e step 2 tem delay de 5min já vencido, ambos são enviados na mesma chamada.
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Processando follow-ups agendados...')

    // 1. Buscar execuções que precisam ser enviadas (proxima_execucao já passou)
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

    const results: any[] = []

    // 2. Processar cada execução - COM LOOP para múltiplos steps
    for (const execution of executions) {
      try {
        const lead = execution.leads as any
        const sequence = execution.lead_followup_sequences as any
        const steps = sequence.steps as any[]

        // Verificar horário de envio
        const now = new Date()
        const currentHour = now.getHours()
        const startHour = parseInt(sequence.horario_envio_inicio?.split(':')[0] || '0')
        const endHour = parseInt(sequence.horario_envio_fim?.split(':')[0] || '23')

        if (currentHour < startHour || currentHour >= endHour) {
          console.log(`⏰ Fora do horário de envio para ${lead.nome_completo}`)
          results.push({
            execution_id: execution.id,
            status: 'postponed',
            message: 'Fora do horário'
          })
          continue
        }

        // Estado mutável para processar múltiplos steps em sequência
        let currentStepIndex = execution.step_atual
        let totalTouchpoints = execution.total_touchpoints || 0
        let stepsExecutados = [...(execution.steps_executados || [])]
        let stepsSentThisRun = 0
        const MAX_STEPS_PER_RUN = 5 // Limite de segurança

        // LOOP: Continuar processando steps enquanto:
        // - Há mais steps para processar
        // - O delay do step atual já venceu
        // - Não ultrapassamos o limite de segurança
        while (currentStepIndex < steps.length && stepsSentThisRun < MAX_STEPS_PER_RUN) {
          const currentStep = steps[currentStepIndex]
          if (!currentStep) break

          // Para o step 0 (primeiro), sempre processar (foi criado com proxima_execucao = now)
          // Para steps subsequentes, verificar se o delay já venceu
          if (stepsSentThisRun > 0) {
            // Calcular quando este step deveria executar (baseado no delay do próprio step)
            const stepDelayMs = (
              (currentStep.delay_days || 0) * 86400000 +
              (currentStep.delay_hours || 0) * 3600000 +
              (currentStep.delay_minutes || 0) * 60000
            )

            // Se o delay é > 0, precisamos parar e agendar
            if (stepDelayMs > 0) {
              const nextExecution = new Date(Date.now() + stepDelayMs)
              await supabase
                .from('lead_followup_executions')
                .update({
                  step_atual: currentStepIndex,
                  total_touchpoints: totalTouchpoints,
                  steps_executados: stepsExecutados,
                  proxima_execucao: nextExecution.toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', execution.id)

              console.log(`⏳ Próximo step (${currentStepIndex + 1}) agendado para ${nextExecution.toISOString()} [${lead.nome_completo}]`)
              results.push({
                execution_id: execution.id,
                status: 'scheduled',
                message: `${stepsSentThisRun} step(s) enviados. Próximo em ${formatDelay(currentStep)}`,
                next_step: currentStepIndex
              })
              break // Sair do while - próximo step tem delay
            }
            // Se delay é 0, continuar processando imediatamente
          }

          // Enviar mensagem baseado no tipo
          let sent = false
          let error_message = ''

          if (currentStep.tipo_acao === 'whatsapp' && lead.telefone) {
            const message = processTemplate(currentStep.conteudo, {
              nome: lead.nome_completo,
              solucao: 'nossa solução',
              empresa_similar: 'empresas parceiras'
            })

            let whatsappResult
            if (currentStep.media_url && currentStep.media_type) {
              whatsappResult = await sendWhatsAppMedia(
                lead.telefone, currentStep.media_url, currentStep.media_type,
                message, currentStep.media_filename, currentStep.media_mimetype
              )
            } else {
              whatsappResult = await sendWhatsApp(lead.telefone, message)
            }
            sent = whatsappResult.success
            error_message = whatsappResult.error || ''
          } else if (currentStep.tipo_acao === 'email' && lead.email) {
            sent = true
          } else if (currentStep.tipo_acao === 'tarefa') {
            sent = true
          }

          if (sent) {
            totalTouchpoints++
            stepsSentThisRun++
            stepsExecutados.push({
              step: currentStepIndex,
              titulo: currentStep.titulo,
              executed_at: new Date().toISOString(),
              executado_em: new Date().toISOString(),
              type: currentStep.tipo_acao,
              content: currentStep.titulo
            })

            console.log(`✅ Step ${currentStepIndex + 1}/${steps.length} enviado para ${lead.nome_completo}`)

            currentStepIndex++

            // Se era o último step, marcar como completo
            if (currentStepIndex >= steps.length) {
              await supabase
                .from('lead_followup_executions')
                .update({
                  step_atual: currentStepIndex,
                  status: 'completed',
                  total_touchpoints: totalTouchpoints,
                  steps_executados: stepsExecutados,
                  proxima_execucao: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', execution.id)

              results.push({
                execution_id: execution.id,
                status: 'completed',
                message: `Sequência finalizada. ${stepsSentThisRun} step(s) enviados para ${lead.nome_completo}`
              })
              break
            }

            // Verificar se o PRÓXIMO step tem delay 0 → continuar o loop
            // (o while vai reavaliar no topo)
          } else {
            // Falha no envio - salvar estado e parar
            await supabase
              .from('lead_followup_executions')
              .update({
                step_atual: currentStepIndex,
                total_touchpoints: totalTouchpoints,
                steps_executados: stepsExecutados,
                updated_at: new Date().toISOString()
              })
              .eq('id', execution.id)

            results.push({
              execution_id: execution.id,
              status: 'failed',
              message: error_message || `Falha ao enviar step ${currentStepIndex + 1} para ${lead.nome_completo}`
            })
            break
          }
        }

        // Se saiu do while sem break (todos os steps com delay 0 foram enviados mas não atingiu o fim)
        // Esse cenário é coberto pelos breaks internos

      } catch (stepError) {
        console.error('❌ Erro ao processar execução:', stepError)
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
        sent: results.filter(r => r.status === 'sent' || r.status === 'completed' || r.status === 'scheduled').length,
        failed: results.filter(r => r.status === 'failed').length,
        completed: results.filter(r => r.status === 'completed').length,
        postponed: results.filter(r => r.status === 'postponed').length,
        errors: results.filter(r => r.status === 'error').length
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

// Formatar delay para exibição
function formatDelay(step: any): string {
  const parts = []
  if (step.delay_days > 0) parts.push(`${step.delay_days}d`)
  if (step.delay_hours > 0) parts.push(`${step.delay_hours}h`)
  if (step.delay_minutes > 0) parts.push(`${step.delay_minutes}min`)
  return parts.length > 0 ? parts.join(' ') : 'imediato'
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

// Enviar WhatsApp texto via API Baileys
async function sendWhatsApp(phone: string, message: string) {
  try {
    const cleanPhone = phone.replace(/\D/g, '')
    const response = await fetch(`${API_URL}/users/${ORG_ID}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: cleanPhone, message })
    })
    const result = await response.json()
    if (result.success) {
      console.log(`✅ WhatsApp enviado para ${cleanPhone}`)
      return { success: true }
    } else {
      console.log('❌ Falha no WhatsApp:', result.error)
      return { success: false, error: result.error || 'Falha na API' }
    }
  } catch (error) {
    console.error('💥 Erro WhatsApp:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Enviar mídia (imagem, vídeo, documento) via WhatsApp
async function sendWhatsAppMedia(
  phone: string, mediaUrl: string, mediaType: string,
  caption: string, filename?: string, mimetype?: string
) {
  try {
    const cleanPhone = phone.replace(/\D/g, '')
    const response = await fetch(`${API_URL}/users/${ORG_ID}/send-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: cleanPhone, mediaUrl, mediaType, caption,
        filename: filename || undefined,
        mimetype: mimetype || undefined
      })
    })
    const result = await response.json()
    if (result.success) {
      console.log(`✅ WhatsApp mídia (${mediaType}) enviado para ${cleanPhone}`)
      return { success: true }
    } else {
      console.log('❌ Falha no WhatsApp mídia:', result.error)
      return { success: false, error: result.error || 'Falha na API' }
    }
  } catch (error) {
    console.error('💥 Erro WhatsApp mídia:', error)
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
