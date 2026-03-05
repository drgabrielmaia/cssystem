/**
 * Follow-up Executor Service
 * Processes follow-up sequences and sends WhatsApp messages.
 * Stores responses from leads.
 */
import { supabase } from '@/lib/supabase'
import whatsappMultiService from '@/lib/whatsapp-multi-service'

interface FollowupStep {
  step_numero: number
  delay_days: number
  delay_hours?: number
  delay_minutes?: number
  tipo_acao: 'email' | 'whatsapp' | 'ligacao' | 'tarefa'
  titulo: string
  conteudo: string
  template_vars?: string[]
  media_url?: string
  media_type?: 'image' | 'video' | 'document'
}

interface ExecutionRecord {
  id: string
  lead_id: string
  sequence_id: string
  organization_id: string
  status: string
  step_atual: number
  proxima_execucao: string | null
  steps_executados: any[]
  respostas_recebidas: any[]
  total_touchpoints: number
}

/**
 * Replace template variables in message content
 */
function replaceVariables(content: string, lead: any): string {
  return content
    .replace(/\{\{nome\}\}/g, lead.nome_completo || lead.nome || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
    .replace(/\{\{telefone\}\}/g, lead.telefone || '')
    .replace(/\{\{empresa\}\}/g, lead.empresa || '')
    .replace(/\{\{solucao\}\}/g, lead.solucao || '')
    .replace(/\{\{origem\}\}/g, lead.origem || '')
}

/**
 * Process a single follow-up execution step
 */
export async function processFollowupStep(execution: ExecutionRecord): Promise<boolean> {
  try {
    // Load the sequence to get step definitions
    const { data: sequence, error: seqError } = await supabase
      .from('lead_followup_sequences')
      .select('*')
      .eq('id', execution.sequence_id)
      .single()

    if (seqError || !sequence) {
      console.error('Sequence not found:', execution.sequence_id)
      return false
    }

    const steps: FollowupStep[] = sequence.steps || []
    const currentStep = steps[execution.step_atual]

    if (!currentStep) {
      // No more steps — mark as completed
      await supabase
        .from('lead_followup_executions')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', execution.id)
      return true
    }

    // Load lead data for variable replacement
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', execution.lead_id)
      .single()

    if (leadError || !lead) {
      console.error('Lead not found:', execution.lead_id)
      return false
    }

    // Replace template variables
    const messageContent = replaceVariables(currentStep.conteudo, lead)

    let sent = false

    // Send based on action type
    if (currentStep.tipo_acao === 'whatsapp') {
      const phone = lead.telefone || lead.whatsapp
      if (phone) {
        // Enviar só os dígitos - a API Baileys resolve o formato correto
        const phoneClean = phone.replace(/\D/g, '')

        const response = await whatsappMultiService.sendMessage(phoneClean, messageContent)
        sent = response.success === true
      }
    }
    // For other types (email, ligacao, tarefa), mark as task
    // These would need additional integrations

    // Record the executed step
    const stepRecord = {
      step_numero: currentStep.step_numero,
      tipo_acao: currentStep.tipo_acao,
      titulo: currentStep.titulo,
      conteudo: messageContent,
      executado_em: new Date().toISOString(),
      enviado: sent,
    }

    const stepsExecutados = [...(execution.steps_executados || []), stepRecord]
    const nextStepIndex = execution.step_atual + 1
    const nextStep = steps[nextStepIndex]

    // Calculate next execution time
    let proximaExecucao: string | null = null
    if (nextStep) {
      const now = new Date()
      now.setDate(now.getDate() + (nextStep.delay_days || 0))
      now.setHours(now.getHours() + (nextStep.delay_hours || 0))
      now.setMinutes(now.getMinutes() + (nextStep.delay_minutes || 0))
      proximaExecucao = now.toISOString()
    }

    // Update execution
    await supabase
      .from('lead_followup_executions')
      .update({
        step_atual: nextStepIndex,
        steps_executados: stepsExecutados,
        total_touchpoints: (execution.total_touchpoints || 0) + 1,
        proxima_execucao: proximaExecucao,
        status: nextStep ? 'active' : 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', execution.id)

    // Update sequence stats
    await supabase
      .from('lead_followup_sequences')
      .update({
        leads_atingidos: (sequence.leads_atingidos || 0) + (execution.step_atual === 0 ? 1 : 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', execution.sequence_id)

    return sent
  } catch (error) {
    console.error('Error processing follow-up step:', error)
    return false
  }
}

/**
 * Start a follow-up sequence for a lead
 */
export async function startFollowupForLead(
  leadId: string,
  sequenceId: string,
  organizationId: string
): Promise<string | null> {
  try {
    // Load sequence to get first step timing
    const { data: sequence } = await supabase
      .from('lead_followup_sequences')
      .select('steps')
      .eq('id', sequenceId)
      .single()

    const steps: FollowupStep[] = sequence?.steps || []
    const firstStep = steps[0]

    // Calculate first execution time
    const now = new Date()
    if (firstStep) {
      now.setDate(now.getDate() + (firstStep.delay_days || 0))
      now.setHours(now.getHours() + (firstStep.delay_hours || 0))
      now.setMinutes(now.getMinutes() + (firstStep.delay_minutes || 0))
    }

    const { data, error } = await supabase
      .from('lead_followup_executions')
      .insert({
        lead_id: leadId,
        sequence_id: sequenceId,
        organization_id: organizationId,
        status: 'active',
        step_atual: 0,
        proxima_execucao: now.toISOString(),
        steps_executados: [],
        respostas_recebidas: [],
        total_touchpoints: 0,
      })
      .select('id')
      .single()

    if (error) throw error
    return data?.id || null
  } catch (error) {
    console.error('Error starting follow-up:', error)
    return null
  }
}

/**
 * Store a response from a lead in the follow-up execution
 */
export async function storeFollowupResponse(
  executionId: string,
  message: string,
  from: string
): Promise<boolean> {
  try {
    const { data: execution, error } = await supabase
      .from('lead_followup_executions')
      .select('respostas_recebidas, status')
      .eq('id', executionId)
      .single()

    if (error || !execution) return false

    const respostas = execution.respostas_recebidas || []

    // Only store the next 3 responses
    if (respostas.length >= 3) return true

    respostas.push({
      mensagem: message,
      de: from,
      recebida_em: new Date().toISOString(),
    })

    await supabase
      .from('lead_followup_executions')
      .update({
        respostas_recebidas: respostas,
        data_resposta: execution.status !== 'responded' ? new Date().toISOString() : undefined,
        status: 'responded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', executionId)

    return true
  } catch (error) {
    console.error('Error storing follow-up response:', error)
    return false
  }
}

/**
 * Process all due follow-up executions
 * Call this periodically (e.g., every minute from a cron/interval)
 */
export async function processDueFollowups(organizationId: string): Promise<number> {
  try {
    const now = new Date().toISOString()

    const { data: dueExecutions, error } = await supabase
      .from('lead_followup_executions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .lte('proxima_execucao', now)
      .order('proxima_execucao', { ascending: true })
      .limit(20)

    if (error || !dueExecutions) return 0

    let processed = 0
    for (const exec of dueExecutions) {
      const success = await processFollowupStep(exec)
      if (success) processed++
    }

    return processed
  } catch (error) {
    console.error('Error processing due follow-ups:', error)
    return 0
  }
}
