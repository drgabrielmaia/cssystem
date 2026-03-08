import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BAILEYS_API = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'http://api.medicosderesultado.com.br'
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
          p_recipient_name: leadName,
          p_recipient_email: leadEmail,
          p_recipient_phone: leadPhone || null,
          p_organization_id: organizationId,
          p_created_by_email: 'auto_lead_conversion',
          p_lead_id: leadId,
          p_placeholders: {}
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

    // 4. Enviar link do contrato via WhatsApp
    if (contractId && validJid) {
      try {
        const signingUrl = `${APP_URL}/assinar-contrato/${contractId}`
        const contractMessage = `📋 *Contrato Digital - Médicos de Resultado*

Olá *${leadName}*!

Seu contrato está pronto para assinatura digital:

✅ *Para assinar:*
1️⃣ Clique no link abaixo
2️⃣ Leia o contrato completo
3️⃣ Preencha seus dados
4️⃣ Faça sua assinatura digital

🔗 *Link para assinatura:*
${signingUrl}

⏰ *Importante:* Assine o quanto antes para liberar seu acesso!

🔒 Sua assinatura é protegida e tem validade legal.`

        // Small delay to avoid message ordering issues
        await new Promise(r => setTimeout(r, 2000))

        const sendRes = await fetch(`${BAILEYS_API}/users/${organizationId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: validJid, message: contractMessage })
        })
        const sendData = await sendRes.json()
        results.push({ step: 'send-contract-link', success: !!sendData.success, error: sendData.error })

        // Update contract with WhatsApp sent timestamp
        if (sendData.success) {
          await supabase
            .from('contracts')
            .update({
              whatsapp_sent_at: new Date().toISOString()
            })
            .eq('id', contractId)
        }
      } catch (err: any) {
        results.push({ step: 'send-contract-link', success: false, error: err.message })
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
