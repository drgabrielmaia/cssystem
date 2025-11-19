import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface LeadStats {
  status: string
  quantidade: number
  valor_total_vendido: number | null
  valor_total_arrecadado: number | null
  valor_medio_vendido: number | null
  valor_medio_arrecadado: number | null
}

interface Lead {
  id: string
  nome_completo: string
  email?: string | null
  telefone: string | null
  empresa?: string | null
  cargo?: string | null
  status: string
  valor_potencial?: number | null
  valor_vendido?: number | null
  origem?: string | null
  data_primeiro_contato?: string | null
  observacoes?: string | null
  responsavel_vendas?: string | null
}

export const generateLeadsPDF = (leads: Lead[], title = 'Relatório de Leads') => {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text(title, 14, 22)

  doc.setFontSize(11)
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32)
  doc.text(`Total de leads: ${leads.length}`, 14, 40)

  // Prepare data for the table
  const headers = [
    'Nome',
    'Email',
    'Telefone',
    'Status',
    'Empresa',
    'Valor Potencial',
    'Data Contato'
  ]

  const data = leads.map(lead => [
    lead.nome_completo || '-',
    lead.email || '-',
    lead.telefone || '-',
    getStatusLabel(lead.status),
    lead.empresa || '-',
    lead.valor_potencial ? formatCurrency(lead.valor_potencial) : '-',
    lead.data_primeiro_contato ? formatDate(lead.data_primeiro_contato) : '-'
  ])

  // Generate table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 50,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [34, 197, 94], // green-500
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Nome
      1: { cellWidth: 40 }, // Email
      2: { cellWidth: 25 }, // Telefone
      3: { cellWidth: 20 }, // Status
      4: { cellWidth: 30 }, // Empresa
      5: { cellWidth: 25 }, // Valor
      6: { cellWidth: 20 }  // Data
    }
  })

  // Summary section
  const yPosition = (doc as any).lastAutoTable.finalY + 20

  doc.setFontSize(14)
  doc.text('Resumo:', 14, yPosition)

  doc.setFontSize(10)
  const summary = generateSummary(leads)

  let currentY = yPosition + 10
  Object.entries(summary).forEach(([key, value]) => {
    doc.text(`${key}: ${value}`, 14, currentY)
    currentY += 8
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Página ${i} de ${pageCount} - Customer Success Management`,
      14,
      doc.internal.pageSize.height - 10
    )
  }

  // Save the PDF
  const fileName = `leads_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

export const generateDetailedLeadsPDF = (leads: Lead[], title = 'Relatório Detalhado de Leads') => {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text(title, 14, 22)

  doc.setFontSize(11)
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32)
  doc.text(`Total de leads: ${leads.length}`, 14, 40)

  let currentY = 60

  leads.forEach((lead, index) => {
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }

    // Lead header
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`${index + 1}. ${lead.nome_completo}`, 14, currentY)
    currentY += 10

    // Lead details
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const details = [
      ['Email:', lead.email || 'Não informado'],
      ['Telefone:', lead.telefone || 'Não informado'],
      ['Empresa:', lead.empresa || 'Não informado'],
      ['Cargo:', lead.cargo || 'Não informado'],
      ['Status:', getStatusLabel(lead.status)],
      ['Valor Potencial:', lead.valor_potencial ? formatCurrency(lead.valor_potencial) : 'Não informado'],
      ['Valor Vendido:', lead.valor_vendido ? formatCurrency(lead.valor_vendido) : 'Não vendido'],
      ['Origem:', lead.origem || 'Não informado'],
      ['Responsável:', lead.responsavel_vendas || 'Não definido'],
      ['Data do Contato:', lead.data_primeiro_contato ? formatDate(lead.data_primeiro_contato) : 'Não informado']
    ]

    details.forEach(([label, value]) => {
      doc.text(`${label} ${value}`, 20, currentY)
      currentY += 6
    })

    // Observations
    if (lead.observacoes && lead.observacoes.trim()) {
      doc.text('Observações:', 20, currentY)
      currentY += 6

      // Split long text into lines
      const lines = doc.splitTextToSize(lead.observacoes, 170)
      lines.forEach((line: string) => {
        doc.text(line, 25, currentY)
        currentY += 6
      })
    }

    currentY += 10 // Space between leads
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Página ${i} de ${pageCount} - Customer Success Management`,
      14,
      doc.internal.pageSize.height - 10
    )
  }

  const fileName = `leads_detalhado_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

const getStatusLabel = (status: string): string => {
  const statusLabels: { [key: string]: string } = {
    'call_agendada': 'Call Agendada',
    'proposta_enviada': 'Aguardando resposta',
    'vendido': 'Vendido',
    'perdido': 'Perdido',
    'no_show': 'No Show',
    'follow_up': 'Follow-up'
  }
  return statusLabels[status] || status
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

const generateSummary = (leads: Lead[]) => {
  const summary: { [key: string]: string } = {}

  // Count by status
  const statusCounts: { [key: string]: number } = {}
  leads.forEach(lead => {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1
  })

  Object.entries(statusCounts).forEach(([status, count]) => {
    summary[`${getStatusLabel(status)}`] = `${count} leads`
  })

  // Calculate totals
  const totalPotencial = leads.reduce((sum, lead) => sum + (lead.valor_potencial || 0), 0)
  const totalVendido = leads.reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0)
  const leadsVendidos = leads.filter(lead => lead.status === 'vendido').length
  const taxaConversao = leads.length > 0 ? (leadsVendidos / leads.length * 100).toFixed(1) : '0'

  summary['Total Valor Potencial'] = formatCurrency(totalPotencial)
  summary['Total Valor Vendido'] = formatCurrency(totalVendido)
  summary['Taxa de Conversão'] = `${taxaConversao}%`

  return summary
}

// Nova função para gerar PDF estilo dashboard com gráficos
export const generateDashboardPDF = (leads: Lead[], stats: LeadStats[], title = 'Dashboard de Leads') => {
  const doc = new jsPDF()

  // Background gradient effect (simulated with rectangles)
  doc.setFillColor(59, 130, 246) // Blue
  doc.rect(0, 0, 210, 40, 'F')

  doc.setFillColor(79, 150, 266) // Lighter blue
  doc.rect(0, 40, 210, 20, 'F')

  // Modern header with white text
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('📊 ' + title, 14, 25)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`🕐 Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 35)

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Cards principais (estatísticas) - ajustado para novo layout
  drawStatsCards(doc, stats, leads, 70)

  // Seção de gráficos com background
  doc.setFillColor(248, 250, 252) // Light gray background
  doc.rect(10, 115, 190, 85, 'F')

  // Gráfico de pizza (distribuição por status)
  drawPieChart(doc, stats, 20, 130, '📈 Distribuição por Status')

  // Gráfico de barras (valores por status)
  drawBarChart(doc, stats, 120, 130, '💰 Valores por Status')

  // Tabela resumo modernizada
  drawSummaryTable(doc, stats, 20, 220)

  // Nova página para lista de leads
  doc.addPage()

  // Header para segunda página
  doc.setFillColor(34, 197, 94) // Green
  doc.rect(0, 0, 210, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('📋 Lista Completa de Leads', 14, 20)

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Tabela de leads (excluindo leads com status "novo")
  const headers = ['Nome', 'Status', 'Telefone', 'Empresa', 'Valor', 'Data']
  const filteredLeads = leads.filter(lead => lead.status !== 'novo')
  const data = filteredLeads.map(lead => [
    lead.nome_completo || '-',
    getStatusLabel(lead.status),
    lead.telefone || '-',
    lead.empresa || '-',
    lead.valor_vendido ? formatCurrency(lead.valor_vendido) : '-',
    lead.data_primeiro_contato ? formatDate(lead.data_primeiro_contato) : '-'
  ])

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 35,
    styles: {
      fontSize: 8,
      cellPadding: 4,
      lineColor: [229, 231, 235], // Border gray-200
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [34, 197, 94], // Green-500
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Gray-50
    },
    columnStyles: {
      1: { halign: 'center' }, // Status center aligned
      4: { halign: 'right' },  // Valor right aligned
      5: { halign: 'center' }  // Data center aligned
    }
  })

  // Footer moderno em todas as páginas
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer background
    doc.setFillColor(249, 250, 251) // Gray-50
    doc.rect(0, doc.internal.pageSize.height - 15, 210, 15, 'F')

    doc.setTextColor(75, 85, 99) // Gray-600
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `📊 Customer Success Dashboard • Página ${i} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 5
    )

    // Timestamp no footer
    doc.text(
      `Generated: ${new Date().toLocaleString('pt-BR')}`,
      doc.internal.pageSize.width - 60,
      doc.internal.pageSize.height - 5
    )
  }

  const fileName = `dashboard_leads_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// Desenhar cards de estatísticas modernos
function drawStatsCards(doc: jsPDF, stats: LeadStats[], leads: Lead[], startY = 45) {
  const totalLeads = leads.length
  const vendidos = stats.find(s => s.status === 'vendido')?.quantidade || 0
  const valorTotal = stats.reduce((sum, stat) => sum + (stat.valor_total_vendido || 0), 0)
  const taxaConversao = totalLeads > 0 ? ((vendidos / totalLeads) * 100).toFixed(1) : '0'

  const cards = [
    { title: 'Total de Leads', value: totalLeads.toString(), color: [59, 130, 246], icon: '👥' },
    { title: 'Leads Vendidos', value: vendidos.toString(), color: [34, 197, 94], icon: '✅' },
    { title: 'Valor Total', value: formatCurrency(valorTotal), color: [168, 85, 247], icon: '💰' },
    { title: 'Taxa Conversão', value: `${taxaConversao}%`, color: [245, 158, 11], icon: '📈' }
  ]

  cards.forEach((card, index) => {
    const x = 14 + (index * 47)
    const y = startY

    // Shadow effect
    doc.setFillColor(0, 0, 0, 0.1)
    doc.rect(x + 1, y + 1, 42, 27, 'F')

    // Fundo do card com bordas arredondadas (simuladas)
    doc.setFillColor(255, 255, 255)
    doc.rect(x, y, 42, 27, 'F')

    // Borda colorida no topo
    doc.setFillColor(card.color[0], card.color[1], card.color[2])
    doc.rect(x, y, 42, 3, 'F')

    // Ícone
    doc.setFontSize(16)
    doc.text(card.icon, x + 3, y + 15)

    // Título
    doc.setTextColor(75, 85, 99) // Gray-600
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(card.title, x + 3, y + 21)

    // Valor
    doc.setTextColor(17, 24, 39) // Gray-900
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(card.value, x + 3, y + 25)

    // Reset
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
  })
}

// Desenhar gráfico de pizza simples
function drawPieChart(doc: jsPDF, stats: LeadStats[], x: number, y: number, title: string) {
  // Filtrar status "novo"
  const filteredStats = stats.filter(stat => stat.status !== 'novo')
  const total = filteredStats.reduce((sum, stat) => sum + stat.quantidade, 0)

  doc.setFontSize(12)
  doc.text(title, x, y - 5)

  // Cores para os status
  const colors = [
    [59, 130, 246],   // azul
    [34, 197, 94],    // verde
    [239, 68, 68],    // vermelho
    [245, 158, 11],   // amarelo
    [168, 85, 247],   // roxo
    [156, 163, 175]   // cinza
  ]

  let startAngle = 0
  const radius = 25
  const centerX = x + 30
  const centerY = y + 30

  filteredStats.forEach((stat, index) => {
    const percentage = total > 0 ? stat.quantidade / total : 0
    const endAngle = startAngle + (percentage * 2 * Math.PI)

    // Desenhar fatia
    if (percentage > 0) {
      drawPieSlice(doc, centerX, centerY, radius, startAngle, endAngle, colors[index % colors.length])
    }

    startAngle = endAngle
  })

  // Legenda
  let legendY = y + 70
  filteredStats.forEach((stat, index) => {
    if (stat.quantidade > 0) {
      // Quadradinho colorido
      const color = colors[index % colors.length]
      doc.setFillColor(color[0], color[1], color[2])
      doc.rect(x, legendY, 3, 3, 'F')

      // Texto
      doc.setFontSize(8)
      doc.text(`${getStatusLabel(stat.status)}: ${stat.quantidade}`, x + 6, legendY + 2.5)
      legendY += 8
    }
  })
}

// Desenhar gráfico de barras simples
function drawBarChart(doc: jsPDF, stats: LeadStats[], x: number, y: number, title: string) {
  doc.setFontSize(12)
  doc.text(title, x, y - 5)

  // Filtrar status "novo"
  const filteredStats = stats.filter(stat => stat.status !== 'novo')
  const maxValue = Math.max(...filteredStats.map(s => s.valor_total_vendido || 0))
  const barWidth = 12
  const maxHeight = 40

  filteredStats.forEach((stat, index) => {
    if ((stat.valor_total_vendido || 0) > 0) {
      const barHeight = maxValue > 0 ? ((stat.valor_total_vendido || 0) / maxValue) * maxHeight : 0
      const barX = x + (index * (barWidth + 2))
      const barY = y + maxHeight - barHeight + 20

      // Desenhar barra
      doc.setFillColor(34, 197, 94)
      doc.rect(barX, barY, barWidth, barHeight, 'F')

      // Label
      doc.setFontSize(6)
      doc.text(stat.status.substring(0, 4), barX, y + maxHeight + 35, { angle: 45 })

      // Valor
      if (stat.valor_total_vendido && stat.valor_total_vendido > 0) {
        doc.setFontSize(6)
        const valor = stat.valor_total_vendido > 1000 ?
          `R$${(stat.valor_total_vendido / 1000).toFixed(0)}k` :
          `R$${stat.valor_total_vendido}`
        doc.text(valor, barX, barY - 2)
      }
    }
  })
}

// Desenhar tabela resumo
function drawSummaryTable(doc: jsPDF, stats: LeadStats[], x: number, y: number) {
  doc.setFontSize(12)
  doc.text('Resumo por Status', x, y)

  // Filtrar status "novo"
  const filteredStats = stats.filter(stat => stat.status !== 'novo')
  const tableData = filteredStats.map(stat => [
    getStatusLabel(stat.status),
    stat.quantidade.toString(),
    stat.valor_total_vendido ? formatCurrency(stat.valor_total_vendido) : 'R$ 0,00',
    stat.quantidade > 0 && stat.valor_total_vendido ? formatCurrency(stat.valor_total_vendido / stat.quantidade) : 'R$ 0,00'
  ])

  autoTable(doc, {
    head: [['📊 Status', '📈 Quantidade', '💰 Total Vendido', '💵 Valor Médio']],
    body: tableData,
    startY: y + 10,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [229, 231, 235],
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [79, 70, 229], // Indigo-600
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // Gray-50
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  })
}

// Função auxiliar para desenhar fatia de pizza
function drawPieSlice(doc: jsPDF, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, color: number[]) {
  doc.setFillColor(color[0], color[1], color[2])

  const steps = Math.max(5, Math.floor((endAngle - startAngle) * 50))
  const angleStep = (endAngle - startAngle) / steps

  // Começar do centro
  doc.moveTo(centerX, centerY)

  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (i * angleStep)
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius

    if (i === 0) {
      doc.lineTo(x, y)
    } else {
      doc.lineTo(x, y)
    }
  }

  doc.lineTo(centerX, centerY)
  doc.fill()
}