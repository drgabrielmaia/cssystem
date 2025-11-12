import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { followUp, lead } = body

    if (!followUp || !lead) {
      return NextResponse.json({
        success: false,
        error: 'Dados do follow-up ou lead não fornecidos'
      }, { status: 400 })
    }

    // Formato da data do follow-up
    const followUpDate = new Date(followUp.data_agendada)
    const dateStr = followUpDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    const timeStr = followUpDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })

    // Emojis para tipos e prioridades
    const prioridadeEmoji: Record<string, string> = {
      'urgente': '🚨',
      'alta': '🔥',
      'media': '⚡',
      'baixa': '📝'
    }

    const tipoEmoji: Record<string, string> = {
      'call': '📞',
      'email': '📧',
      'whatsapp': '💬',
      'meeting': '🤝',
      'proposal': '📄'
    }

    // Montar mensagem de notificação
    let notificationMessage = `🔔 NOVO FOLLOW-UP AGENDADO\n\n`
    notificationMessage += `${prioridadeEmoji[followUp.prioridade] || '📝'} ${followUp.titulo}\n`
    notificationMessage += `⏰ ${dateStr} às ${timeStr}\n`
    notificationMessage += `${tipoEmoji[followUp.tipo] || '📝'} Tipo: ${followUp.tipo}\n\n`

    // Informações do lead
    notificationMessage += `👤 LEAD: ${lead.nome_completo}`
    if (lead.empresa) {
      notificationMessage += ` (${lead.empresa})`
    }
    notificationMessage += `\n`

    if (lead.telefone) {
      notificationMessage += `📱 ${lead.telefone}\n`
    }

    // Informações de qualificação
    if (lead.nivel_interesse || lead.temperatura || lead.urgencia_compra) {
      let qualificacao = '🎯 '
      if (lead.nivel_interesse) {
        qualificacao += `Interesse: ${lead.nivel_interesse}/10 `
      }
      if (lead.temperatura) {
        const tempEmoji = lead.temperatura === 'quente' ? '🔥' : lead.temperatura === 'morno' ? '🟠' : '🔵'
        qualificacao += `${tempEmoji} ${lead.temperatura} `
      }
      if (lead.urgencia_compra) {
        qualificacao += `⚡ ${lead.urgencia_compra}`
      }
      notificationMessage += `${qualificacao}\n`
    }

    // Informações financeiras
    if (lead.orcamento_disponivel) {
      notificationMessage += `💰 Orçamento: R$ ${lead.orcamento_disponivel.toLocaleString('pt-BR')}\n`
    }

    // Responsável
    if (lead.responsavel_vendas) {
      notificationMessage += `👨‍💼 Responsável: ${lead.responsavel_vendas}\n`
    }

    // Descrição do follow-up
    if (followUp.descricao) {
      notificationMessage += `\n💬 ${followUp.descricao}\n`
    }

    notificationMessage += `\n🚀 Lembrete será enviado na agenda diária!`

    // Enviar notificação para o baileys-server-multi
    const whatsappResponse = await fetch('http://localhost:3333/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: notificationMessage,
        type: 'followup_created'
      })
    })

    if (!whatsappResponse.ok) {
      console.log('⚠️ Erro ao enviar notificação via WhatsApp, mas follow-up foi criado')
    }

    return NextResponse.json({
      success: true,
      message: 'Notificação de follow-up enviada'
    })

  } catch (error) {
    console.error('Erro ao enviar notificação de follow-up:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}