import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BAILEYS_API = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cs.medicosderesultado.com.br'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { leadId, leadName, leadEmail, leadPhone, organizationId } = body

    if (!leadId || !leadName || !organizationId) {
      return NextResponse.json({ success: false, error: 'Dados incompletos' }, { status: 400 })
    }

    const results: { step: string; success: boolean; error?: string }[] = []

    // 1. Validar telefone no WhatsApp
    let validJid: string | null = null
    if (leadPhone) {
      try {
        const checkRes = await fetch(`${BAILEYS_API}/users/${organizationId}/check-number`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: leadPhone.replace(/\D/g, '') })
        })
        const checkData = await checkRes.json()

        if (checkData.success && checkData.exists) {
          validJid = checkData.jid
          results.push({ step: 'check-number', success: true })
          console.log(`✅ Número validado: ${leadPhone} → ${validJid}`)
        } else {
          results.push({ step: 'check-number', success: false, error: 'Número não encontrado no WhatsApp' })
          console.log(`⚠️ Número ${leadPhone} não encontrado no WhatsApp`)
        }
      } catch (err: any) {
        results.push({ step: 'check-number', success: false, error: err.message })
      }
    }

    // 2. Enviar mensagem de boas-vindas via WhatsApp
    if (validJid) {
      try {
        const welcomeMessage = `🎉 *Parabéns! Você agora faz parte do Médicos de Resultado!*

Olá *${leadName}*!

Estamos muito felizes por ter você conosco! 🚀

Agora, vamos seguir para a assinatura do seu contrato para oficializar tudo.

📋 Você receberá o link do contrato em instantes.
Fique de olho aqui no WhatsApp!`

        const sendRes = await fetch(`${BAILEYS_API}/users/${organizationId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: validJid, message: welcomeMessage })
        })
        const sendData = await sendRes.json()
        results.push({ step: 'welcome-message', success: !!sendData.success, error: sendData.error })
      } catch (err: any) {
        results.push({ step: 'welcome-message', success: false, error: err.message })
      }
    }

    // 3. Criar contrato automaticamente
    let contractId: string | null = null
    try {
      // Buscar template padrão ativo
      const { data: defaultTemplate, error: templateError } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (templateError || !defaultTemplate) {
        results.push({ step: 'create-contract', success: false, error: 'Nenhum template de contrato ativo encontrado' })
      } else if (!leadEmail) {
        results.push({ step: 'create-contract', success: false, error: 'Lead sem email - contrato não criado' })
      } else {
        const { data: newContractId, error: contractError } = await supabase.rpc('create_contract_from_template', {
          p_template_id: defaultTemplate.id,
          p_organization_id: organizationId,
          p_lead_id: leadId,
          p_recipient_name: leadName,
          p_recipient_email: leadEmail
        })

        if (contractError) {
          results.push({ step: 'create-contract', success: false, error: contractError.message })
        } else {
          contractId = newContractId
          results.push({ step: 'create-contract', success: true })
          console.log(`📋 Contrato criado: ${contractId}`)
        }
      }
    } catch (err: any) {
      results.push({ step: 'create-contract', success: false, error: err.message })
    }

    // 4. Enviar link de CUSTOMIZAÇÃO para o FINANCEIRO (não o link de assinatura pro lead)
    // O financeiro vai personalizar forma de pagamento, valor etc. e depois o sistema envia pro lead
    if (contractId) {
      try {
        // Buscar telefone do financeiro da organização
        const { data: orgData } = await supabase
          .from('organizations')
          .select('financeiro_phone')
          .eq('id', organizationId)
          .single()

        const financeiroPhone = orgData?.financeiro_phone?.replace(/\D/g, '')

        if (!financeiroPhone) {
          results.push({ step: 'send-customization-to-financial', success: false, error: 'Telefone do financeiro não configurado na organização' })
        } else {
          const customizationUrl = `${APP_URL}/personalizar-contrato/${contractId}`
          const financialMessage = `📋 *Novo contrato para personalizar*

Olá! Um novo lead foi convertido e precisa de contrato:

👤 *Nome:* ${leadName}
📧 *Email:* ${leadEmail || 'Não informado'}
📱 *Telefone:* ${leadPhone || 'Não informado'}

🔗 *Personalize o contrato aqui:*
${customizationUrl}

Defina o valor, forma de pagamento e envie o link de assinatura para o cliente.`

          // Small delay to avoid message ordering issues
          await new Promise(r => setTimeout(r, 2000))

          const sendRes = await fetch(`${BAILEYS_API}/users/${organizationId}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: financeiroPhone, message: financialMessage })
          })
          const sendData = await sendRes.json()
          results.push({ step: 'send-customization-to-financial', success: !!sendData.success, error: sendData.error })
        }
      } catch (err: any) {
        results.push({ step: 'send-customization-to-financial', success: false, error: err.message })
      }
    }

    const allSuccess = results.every(r => r.success)
    const summary = results.map(r => `${r.success ? '✅' : '❌'} ${r.step}${r.error ? ': ' + r.error : ''}`).join('\n')

    console.log(`📊 Lead automation results for ${leadName}:\n${summary}`)

    return NextResponse.json({
      success: true,
      allStepsSucceeded: allSuccess,
      contractId,
      numberValidated: !!validJid,
      results
    })

  } catch (error: any) {
    console.error('❌ Erro na automação de lead convertido:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno'
    }, { status: 500 })
  }
}
