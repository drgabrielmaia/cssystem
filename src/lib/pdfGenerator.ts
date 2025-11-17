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
    'novo': 'Novo',
    'call_agendada': 'Call Agendada',
    'proposta_enviada': 'Proposta Enviada',
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

  // Header
  doc.setFontSize(22)
  doc.text(title, 14, 22)

  doc.setFontSize(12)
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 32)

  // Cards principais (estatísticas)
  drawStatsCards(doc, stats, leads)

  // Gráfico de pizza (distribuição por status)
  drawPieChart(doc, stats, 20, 80, 'Distribuição por Status')

  // Gráfico de barras (valores por status)
  drawBarChart(doc, stats, 120, 80, 'Valores por Status')

  // Tabela resumo
  drawSummaryTable(doc, stats, 20, 180)

  // Nova página para lista de leads
  doc.addPage()

  doc.setFontSize(18)
  doc.text('Lista Completa de Leads', 14, 22)

  // Tabela de leads
  const headers = ['Nome', 'Status', 'Telefone', 'Empresa', 'Valor', 'Data']
  const data = leads.map(lead => [
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
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  })

  // Footer em todas as páginas
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Página ${i} de ${pageCount} - Customer Success Dashboard`,
      14,
      doc.internal.pageSize.height - 10
    )
  }

  const fileName = `dashboard_leads_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// Desenhar cards de estatísticas
function drawStatsCards(doc: jsPDF, stats: LeadStats[], leads: Lead[]) {
  const totalLeads = leads.length
  const vendidos = stats.find(s => s.status === 'vendido')?.quantidade || 0
  const valorTotal = stats.reduce((sum, stat) => sum + (stat.valor_total_vendido || 0), 0)
  const taxaConversao = totalLeads > 0 ? ((vendidos / totalLeads) * 100).toFixed(1) : '0'

  const cards = [
    { title: 'Total de Leads', value: totalLeads.toString(), color: [59, 130, 246] },
    { title: 'Leads Vendidos', value: vendidos.toString(), color: [34, 197, 94] },
    { title: 'Valor Total', value: formatCurrency(valorTotal), color: [168, 85, 247] },
    { title: 'Taxa Conversão', value: `${taxaConversao}%`, color: [245, 158, 11] }
  ]

  cards.forEach((card, index) => {
    const x = 14 + (index * 45)
    const y = 45

    // Fundo do card
    doc.setFillColor(...card.color)
    doc.rect(x, y, 40, 25, 'F')

    // Texto
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(card.title, x + 2, y + 6)
    doc.setFontSize(14)
    doc.text(card.value, x + 2, y + 16)
    doc.setTextColor(0, 0, 0) // Reset cor
  })
}

// Desenhar gráfico de pizza simples
function drawPieChart(doc: jsPDF, stats: LeadStats[], x: number, y: number, title: string) {
  const total = stats.reduce((sum, stat) => sum + stat.quantidade, 0)

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

  stats.forEach((stat, index) => {
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
  stats.forEach((stat, index) => {
    if (stat.quantidade > 0) {
      // Quadradinho colorido
      doc.setFillColor(...colors[index % colors.length])
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

  const maxValue = Math.max(...stats.map(s => s.valor_total_vendido || 0))
  const barWidth = 12
  const maxHeight = 40

  stats.forEach((stat, index) => {
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

  const tableData = stats.map(stat => [
    getStatusLabel(stat.status),
    stat.quantidade.toString(),
    stat.valor_total_vendido ? formatCurrency(stat.valor_total_vendido) : 'R$ 0,00',
    stat.quantidade > 0 && stat.valor_total_vendido ? formatCurrency(stat.valor_total_vendido / stat.quantidade) : 'R$ 0,00'
  ])

  autoTable(doc, {
    head: [['Status', 'Quantidade', 'Total Vendido', 'Valor Médio']],
    body: tableData,
    startY: y + 10,
    styles: { fontSize: 8 },
    headStyles: {
      fillColor: [75, 85, 99],
      textColor: 255
    }
  })
}

// Função auxiliar para desenhar fatia de pizza
function drawPieSlice(doc: jsPDF, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, color: number[]) {
  doc.setFillColor(...color)

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