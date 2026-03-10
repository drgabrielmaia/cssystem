'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const BAILEYS_API = process.env.NEXT_PUBLIC_BAILEYS_API || 'https://api.medicosderesultado.com.br'

export default function PersonalizarContratoPage() {
  const params = useParams()
  const contractId = params.contractId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [contract, setContract] = useState<any>(null)

  const [form, setForm] = useState({
    valor: '',
    valor_pago: '',
    valor_restante: '',
    forma_negociacao: '',
    data_contrato: new Date().toISOString().split('T')[0],
    observacoes_financeiro: ''
  })

  useEffect(() => {
    loadContract()
  }, [contractId])

  useEffect(() => {
    const valor = parseFloat(form.valor) || 0
    const pago = parseFloat(form.valor_pago) || 0
    setForm(f => ({ ...f, valor_restante: (valor - pago).toFixed(2) }))
  }, [form.valor, form.valor_pago])

  const loadContract = async () => {
    try {
      const { data, error: err } = await supabase
        .from('contracts')
        .select(`
          id, status, valor, valor_pago, valor_restante, forma_negociacao, data_contrato,
          financial_customized_at, financial_sent_to_recipient_at, financial_phone,
          lead_id, mentorado_id, organization_id,
          contract_templates (name)
        `)
        .eq('id', contractId)
        .single()

      if (err || !data) {
        setError('Contrato nao encontrado')
        return
      }

      setContract(data)

      // Get recipient info
      let recipientName = '', recipientPhone = '', recipientEmail = ''
      if (data.lead_id) {
        const { data: lead } = await supabase.from('leads').select('nome_completo, telefone, email').eq('id', data.lead_id).single()
        if (lead) { recipientName = lead.nome_completo; recipientPhone = lead.telefone; recipientEmail = lead.email }
      } else if (data.mentorado_id) {
        const { data: mentorado } = await supabase.from('mentorados').select('nome_completo, telefone, email').eq('id', data.mentorado_id).single()
        if (mentorado) { recipientName = mentorado.nome_completo; recipientPhone = mentorado.telefone; recipientEmail = mentorado.email }
      }

      setContract((prev: any) => ({ ...prev, recipientName, recipientPhone, recipientEmail }))

      if (data.valor) setForm(f => ({ ...f, valor: String(data.valor) }))
      if (data.valor_pago) setForm(f => ({ ...f, valor_pago: String(data.valor_pago) }))
      if (data.valor_restante) setForm(f => ({ ...f, valor_restante: String(data.valor_restante) }))
      if (data.forma_negociacao) setForm(f => ({ ...f, forma_negociacao: data.forma_negociacao }))
      if (data.data_contrato) setForm(f => ({ ...f, data_contrato: data.data_contrato }))

      if (data.financial_sent_to_recipient_at) setSent(true)
    } catch {
      setError('Erro ao carregar contrato')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndSend = async () => {
    setSaving(true)
    setError('')

    try {
      const valorNum = parseFloat(form.valor) || 0
      const valorPagoNum = parseFloat(form.valor_pago) || 0
      const valorRestanteNum = valorNum - valorPagoNum

      // Update contract payment fields
      const { error: updateErr } = await supabase
        .from('contracts')
        .update({
          valor: valorNum,
          valor_pago: valorPagoNum,
          valor_restante: valorRestanteNum,
          forma_negociacao: form.forma_negociacao || null,
          data_contrato: form.data_contrato || null,
          financial_customized_at: new Date().toISOString()
        })
        .eq('id', contractId)

      if (updateErr) throw updateErr

      // Get financial phone (from contract or org)
      const financialPhone = contract.financial_phone
      if (!financialPhone) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('financeiro_phone')
          .eq('id', contract.organization_id)
          .single()
        if (!orgData?.financeiro_phone) {
          setError('Telefone do financeiro nao configurado')
          setSaving(false)
          return
        }
      }

      // Send contract signing link to the recipient via the financial WhatsApp number
      const recipientPhone = contract.recipientPhone?.replace(/\D/g, '')
      if (!recipientPhone) {
        setError('Telefone do destinatario nao encontrado')
        setSaving(false)
        return
      }

      const signingUrl = `${window.location.origin}/assinar-contrato/${contractId}`
      const templateName = (contract.contract_templates as any)?.name || 'Contrato'

      // Format payment details for the message
      const valorFormatted = valorNum ? `R$ ${valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'A definir'
      const formaNeg = form.forma_negociacao || 'A combinar'

      const messageToRecipient = `Ola, me chamo Ana! Sou do financeiro da *Medicos de Resultado*.

Para ter acesso as aulas e garantir sua vaga, e fundamental que voce assine o contrato abaixo:

📋 *${templateName}*
💰 Valor: ${valorFormatted}
💳 Forma de pagamento: ${formaNeg}

🔗 *Assine seu contrato aqui:*
${signingUrl}

Esse processo e rapido e 100% digital. Apos a assinatura, voce recebera suas credenciais de acesso automaticamente!

Qualquer duvida, pode me chamar aqui mesmo. Estou a disposicao! 😊`

      // Send message via the financial WhatsApp instance (org ID)
      await fetch(`${BAILEYS_API}/users/${contract.organization_id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipientPhone, message: messageToRecipient })
      })

      // Mark as sent
      await supabase
        .from('contracts')
        .update({ financial_sent_to_recipient_at: new Date().toISOString() })
        .eq('id', contractId)

      setSent(true)
      alert('Contrato personalizado e link enviado para o destinatario com sucesso!')
    } catch (err: any) {
      console.error('Erro:', err)
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white/60 text-lg">Carregando contrato...</div>
      </div>
    )
  }

  if (error && !contract) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400 text-lg">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#D4AF37]/20 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <h1 className="text-xl font-bold text-white">Personalizar Contrato</h1>
            <p className="text-white/40 text-sm mt-1">Configure os dados financeiros antes de enviar</p>
          </div>

          {/* Recipient Info */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
            <h3 className="text-xs font-semibold text-white/40 uppercase mb-2">Destinatario</h3>
            <p className="text-white font-medium">{contract?.recipientName || 'N/A'}</p>
            <p className="text-white/50 text-sm">{contract?.recipientEmail}</p>
            <p className="text-white/50 text-sm">{contract?.recipientPhone}</p>
          </div>

          {sent && (
            <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 text-center">
              <span className="text-green-400 text-sm font-medium">Link ja enviado para o destinatario!</span>
              <p className="text-green-400/60 text-xs mt-1">
                Enviado em: {contract?.financial_sent_to_recipient_at
                  ? new Date(contract.financial_sent_to_recipient_at).toLocaleString('pt-BR')
                  : 'Agora'}
              </p>
            </div>
          )}

          {/* Payment Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm mb-1">Valor Total (R$)</label>
              <input type="number" step="0.01" value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                placeholder="0.00" />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-1">Valor Pago / Entrada (R$)</label>
              <input type="number" step="0.01" value={form.valor_pago}
                onChange={e => setForm(f => ({ ...f, valor_pago: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                placeholder="0.00" />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-1">Valor Restante (R$)</label>
              <input type="number" step="0.01" value={form.valor_restante} readOnly
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-white/5 rounded-xl text-white/60 cursor-not-allowed" />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-1">Forma de Pagamento</label>
              <select value={form.forma_negociacao}
                onChange={e => setForm(f => ({ ...f, forma_negociacao: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
                <option value="">Selecione...</option>
                <option value="Pix a vista">Pix a vista</option>
                <option value="Cartao de credito a vista">Cartao de credito a vista</option>
                <option value="Cartao 2x">Cartao 2x</option>
                <option value="Cartao 3x">Cartao 3x</option>
                <option value="Cartao 4x">Cartao 4x</option>
                <option value="Cartao 5x">Cartao 5x</option>
                <option value="Cartao 6x">Cartao 6x</option>
                <option value="Cartao 10x">Cartao 10x</option>
                <option value="Cartao 12x">Cartao 12x</option>
                <option value="Boleto a vista">Boleto a vista</option>
                <option value="Boleto parcelado">Boleto parcelado</option>
                <option value="Entrada + parcelas">Entrada + parcelas</option>
                <option value="Negociacao especial">Negociacao especial</option>
              </select>
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-1">Data do Contrato</label>
              <input type="date" value={form.data_contrato}
                onChange={e => setForm(f => ({ ...f, data_contrato: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Action Button */}
          <button onClick={handleSaveAndSend} disabled={saving || !form.forma_negociacao}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
              saving || !form.forma_negociacao
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-[#D4AF37] text-gray-900 hover:bg-[#C5A028] active:scale-[0.98]'
            }`}>
            {saving ? 'Salvando e enviando...' : sent ? 'Reenviar Link para o Destinatario' : 'Salvar e Enviar Link para Assinatura'}
          </button>

          <p className="text-white/30 text-[10px] text-center">
            Ao clicar, o link de assinatura sera enviado via WhatsApp para {contract?.recipientName || 'o destinatario'}
          </p>
        </div>
      </div>
    </div>
  )
}
