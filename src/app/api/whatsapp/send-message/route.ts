import { NextResponse } from 'next/server'

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
        const externalResponse = await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber,
            message: message,
            sender: sender || 'kellybsantoss@icloud.com'
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