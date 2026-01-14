import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getOrganizationId(): Promise<string> {
  try {
    // Buscar usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      console.warn('⚠️ Usuário não autenticado, usando organizationId padrão')
      return 'default'
    }

    console.log('🔍 Buscando organização para usuário:', user.email, 'ID:', user.id)

    // Tentar buscar por email primeiro (mais confiável)
    const { data: orgByEmail, error: emailError } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('email', user.email)
      .single()

    if (!emailError && orgByEmail) {
      console.log('✅ Organização encontrada por email:', orgByEmail.organization_id)
      return orgByEmail.organization_id
    }

    // Fallback: tentar buscar pela tabela organizations usando owner_email
    const { data: orgDirectData, error: orgDirectError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_email', user.email)
      .single()

    if (!orgDirectError && orgDirectData) {
      console.log('✅ Organização encontrada como owner:', orgDirectData.id)
      return orgDirectData.id
    }

    console.warn('⚠️ Organização não encontrada, usando padrão')
    return 'default'
  } catch (error) {
    console.error('❌ Erro ao obter organization_id:', error)
    return 'default'
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phoneNumber, message, sender } = body

    if (!phoneNumber || !message) {
      return NextResponse.json({
        success: false,
        error: 'Número de telefone e mensagem são obrigatórios'
      }, { status: 400 })
    }

    let result: any = null
    let success = false

    // Tentar primeiro o baileys-server-multi (local)
    try {
      console.log('🔄 Tentando enviar via baileys-server-multi...')
      const whatsappResponse = await fetch('http://localhost:3333/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          phoneNumber: phoneNumber,
          type: 'calendar_event_created'
        })
      })

      if (whatsappResponse.ok) {
        result = await whatsappResponse.json()
        success = true
        console.log('✅ Mensagem enviada via baileys-server-multi:', result)
      } else {
        throw new Error(`Baileys falhou: ${whatsappResponse.status}`)
      }
    } catch (baileyError) {
      console.warn('⚠️ Baileys-server-multi não disponível:', baileyError)

      // Fallback: usar API externa do WhatsApp
      try {
        console.log('🔄 Tentando enviar via API externa...')
        // Buscar organizationId dinamicamente
        const userId = await getOrganizationId()

        const externalResponse = await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/users/${userId}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber,
            message: message
          })
        })

        if (externalResponse.ok) {
          result = await externalResponse.json()
          success = true
          console.log('✅ Mensagem enviada via API externa:', result)
        } else {
          throw new Error(`API externa falhou: ${externalResponse.status}`)
        }
      } catch (externalError) {
        console.error('❌ Falha em ambas as APIs:', externalError)
        throw new Error('Todas as APIs de WhatsApp falharam')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: result
    })

  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 })
  }
}