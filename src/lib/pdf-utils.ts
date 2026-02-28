import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface CommissionForPDF {
  user_name: string
  user_pix_key: string
  amount: number
  description?: string
  status: string
  created_at: string
  paid_at?: string
}

export const generateCommissionsPDF = (
  commissions: CommissionForPDF[],
  filters: {
    status: string
    organizationName?: string
  }
) => {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.setTextColor(212, 175, 55) // Golden color
  doc.text('Relatório de Comissões Terceirizadas', 20, 20)
  
  // Organization info
  if (filters.organizationName) {
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text(`Organização: ${filters.organizationName}`, 20, 30)
  }
  
  // Date and filters
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  const now = new Date()
  doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, 20, 40)
  
  const statusLabels = {
    all: 'Todas',
    pending: 'Pendentes',
    paid: 'Pagas',
    cancelled: 'Canceladas'
  }
  doc.text(`Filtro: ${statusLabels[filters.status as keyof typeof statusLabels]}`, 20, 46)
  
  // Summary totals
  const totalAmount = commissions.reduce((sum, c) => sum + c.amount, 0)
  const pendingAmount = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)
  const paidAmount = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
  
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('Resumo:', 20, 60)
  
  doc.setFontSize(10)
  doc.text(`Total de comissões: ${commissions.length}`, 20, 68)
  doc.text(`Valor total: R$ ${totalAmount.toFixed(2)}`, 20, 74)
  doc.text(`Pendente: R$ ${pendingAmount.toFixed(2)}`, 20, 80)
  doc.text(`Pago: R$ ${paidAmount.toFixed(2)}`, 20, 86)
  
  // Table data
  const tableData = commissions.map(commission => [
    commission.user_name,
    commission.user_pix_key,
    `R$ ${commission.amount.toFixed(2)}`,
    commission.description || '-',
    commission.status === 'pending' ? 'Pendente' : 
    commission.status === 'paid' ? 'Pago' : 'Cancelado',
    new Date(commission.created_at).toLocaleDateString('pt-BR'),
    commission.paid_at ? new Date(commission.paid_at).toLocaleDateString('pt-BR') : '-'
  ])
  
  // Create table
  doc.autoTable({
    head: [['Nome', 'PIX', 'Valor', 'Descrição', 'Status', 'Criado em', 'Pago em']],
    body: tableData,
    startY: 100,
    theme: 'grid',
    headStyles: {
      fillColor: [212, 175, 55], // Golden color
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 50
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 30 }, // Nome
      1: { cellWidth: 35 }, // PIX
      2: { cellWidth: 25 }, // Valor
      3: { cellWidth: 35 }, // Descrição
      4: { cellWidth: 20 }, // Status
      5: { cellWidth: 25 }, // Criado em
      6: { cellWidth: 25 }, // Pago em
    },
    didParseCell: function(data: any) {
      // Color code status column
      if (data.column.index === 4) { // Status column
        const status = data.cell.raw
        if (status === 'Pendente') {
          data.cell.styles.textColor = [255, 165, 0] // Orange
        } else if (status === 'Pago') {
          data.cell.styles.textColor = [0, 128, 0] // Green
        } else if (status === 'Cancelado') {
          data.cell.styles.textColor = [220, 20, 60] // Red
        }
      }
    }
  })
  
  // Footer
  const pageCount = doc.internal.pages.length - 1
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Página ${i} de ${pageCount} - Customer Success System`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }
  
  // Generate filename with timestamp
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `comissoes-terceiros-${timestamp}.pdf`
  
  // Download the PDF
  doc.save(filename)
  
  return filename
}

export const generateCommissionPaymentList = (
  commissions: CommissionForPDF[],
  organizationName?: string
) => {
  // Filter only pending commissions for payment list
  const pendingCommissions = commissions.filter(c => c.status === 'pending')
  
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.setTextColor(212, 175, 55) // Golden color
  doc.text('Lista de Pagamentos - Comissões Terceirizadas', 20, 20)
  
  // Organization info
  if (organizationName) {
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text(`Organização: ${organizationName}`, 20, 30)
  }
  
  // Date
  doc.setFontSize(10)
  const now = new Date()
  doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, 20, 40)
  
  // Summary
  const totalAmount = pendingCommissions.reduce((sum, c) => sum + c.amount, 0)
  
  doc.setFontSize(14)
  doc.setTextColor(220, 20, 60) // Red for pending
  doc.text(`Total a pagar: R$ ${totalAmount.toFixed(2)}`, 20, 55)
  doc.text(`Quantidade de pagamentos: ${pendingCommissions.length}`, 20, 65)
  
  // Payment list table - simplified for payment processing
  const tableData = pendingCommissions.map((commission, index) => [
    (index + 1).toString(),
    commission.user_name,
    commission.user_pix_key,
    `R$ ${commission.amount.toFixed(2)}`,
    commission.description || '-',
    '☐' // Checkbox for manual checking
  ])
  
  doc.autoTable({
    head: [['#', 'Beneficiário', 'PIX', 'Valor', 'Descrição', 'Pago']],
    body: tableData,
    startY: 80,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 20, 60], // Red color for urgency
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: 50
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 10 }, // Index
      1: { cellWidth: 40 }, // Nome
      2: { cellWidth: 45 }, // PIX
      3: { cellWidth: 25 }, // Valor
      4: { cellWidth: 50 }, // Descrição
      5: { cellWidth: 15 }, // Checkbox
    }
  })
  
  // Instructions
  const finalY = (doc as any).lastAutoTable.finalY || 200
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Instruções:', 20, finalY + 20)
  doc.text('1. Realize os pagamentos via PIX conforme a lista acima', 20, finalY + 28)
  doc.text('2. Marque a coluna "Pago" após realizar cada transferência', 20, finalY + 36)
  doc.text('3. Atualize o status no sistema após processar os pagamentos', 20, finalY + 44)
  
  // Footer
  const pageCount = doc.internal.pages.length - 1
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Página ${i} de ${pageCount} - Lista de Pagamentos`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }
  
  // Generate filename
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `lista-pagamentos-${timestamp}.pdf`

  doc.save(filename)

  return filename
}

// ==============================
// Unified All Commissions PDF
// ==============================

interface UnifiedCommissionItem {
  nome: string
  pix_key: string
  valor: number
  tipo: 'mentorado' | 'terceiro'
  descricao?: string
}

export const generateAllCommissionsPaymentPDF = (
  items: UnifiedCommissionItem[],
  organizationName?: string
) => {
  if (items.length === 0) return null

  const doc = new jsPDF()
  const now = new Date()

  // Header
  doc.setFontSize(20)
  doc.setTextColor(30, 58, 138) // Dark blue
  doc.text('Lista de Pagamentos - Todas as Comissoes', 20, 20)

  // Organization info
  if (organizationName) {
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text(`Organizacao: ${organizationName}`, 20, 30)
  }

  // Date
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')} as ${now.toLocaleTimeString('pt-BR')}`, 20, 38)

  // Summary
  const mentoradoItems = items.filter(i => i.tipo === 'mentorado')
  const terceiroItems = items.filter(i => i.tipo === 'terceiro')
  const totalGeral = items.reduce((sum, i) => sum + i.valor, 0)
  const totalMentorados = mentoradoItems.reduce((sum, i) => sum + i.valor, 0)
  const totalTerceiros = terceiroItems.reduce((sum, i) => sum + i.valor, 0)

  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('Resumo:', 20, 50)

  doc.setFontSize(10)
  doc.text(`Total geral a pagar: R$ ${totalGeral.toFixed(2)}`, 20, 58)
  doc.text(`Mentorados: ${mentoradoItems.length} comissoes - R$ ${totalMentorados.toFixed(2)}`, 20, 64)
  doc.text(`Terceiros: ${terceiroItems.length} comissoes - R$ ${totalTerceiros.toFixed(2)}`, 20, 70)

  // Table data
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.nome,
    item.pix_key || '-',
    `R$ ${item.valor.toFixed(2)}`,
    item.tipo === 'mentorado' ? 'Mentorado' : 'Terceiro',
    item.descricao || '-'
  ])

  doc.autoTable({
    head: [['#', 'Beneficiario', 'Chave PIX', 'Valor', 'Tipo', 'Descricao']],
    body: tableData,
    startY: 80,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: 50
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 35 },
      2: { cellWidth: 40 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 40 },
    },
    didParseCell: function(data: any) {
      if (data.column.index === 4) {
        const tipo = data.cell.raw
        if (tipo === 'Mentorado') {
          data.cell.styles.textColor = [30, 58, 138]
        } else if (tipo === 'Terceiro') {
          data.cell.styles.textColor = [212, 175, 55]
        }
      }
    }
  })

  // Total row
  const finalY = (doc as any).lastAutoTable.finalY || 200
  doc.setFontSize(14)
  doc.setTextColor(220, 20, 60)
  doc.text(`TOTAL A PAGAR: R$ ${totalGeral.toFixed(2)}`, 20, finalY + 15)

  // Footer
  const pageCount = doc.internal.pages.length - 1
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Pagina ${i} de ${pageCount} - Lista de Pagamentos`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Generate filename
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `lista-pagamentos-geral-${timestamp}.pdf`

  doc.save(filename)

  return filename
}