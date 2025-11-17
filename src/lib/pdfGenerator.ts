import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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