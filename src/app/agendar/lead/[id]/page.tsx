'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Copy, ExternalLink, Calendar, Clock, User, Mail, Briefcase, Heart, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

interface Lead {
  id: string
  nome_completo: string
  email: string | null
  telefone: string | null
  empresa: string | null
  valor_vendido: number | null
  status: string
}

interface AgendamentoLink {
  id: string
  token_link: string
  lead_id: string
  titulo_personalizado: string | null
  descricao_personalizada: string | null
  cor_tema: string
  ativo: boolean
  expira_em: string | null
  uso_unico: boolean
  total_visualizacoes: number
  total_agendamentos: number
}

export default function AgendarLeadPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params?.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [agendamentoLink, setAgendamentoLink] = useState<AgendamentoLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Configurações do link
  const [linkConfig, setLinkConfig] = useState({
    titulo_personalizado: '',
    descricao_personalizada: '',
    cor_tema: '#059669',
    uso_unico: false,
    expira_em: ''
  })

  useEffect(() => {
    if (leadId) {
      loadLeadData()
      loadExistingLink()
    }
  }, [leadId])

  const loadLeadData = async () => {
    try {
      const { data: leadData, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (error) throw error
      setLead(leadData)

      // Configurar título padrão
      if (leadData) {
        setLinkConfig(prev => ({
          ...prev,
          titulo_personalizado: `Agendamento de Call - ${leadData.nome_completo}`,
          descricao_personalizada: `Olá ${leadData.nome_completo}! Aqui você pode agendar nossa call comercial. Escolha o melhor horário para você.`
        }))
      }
    } catch (error) {
      console.error('Erro ao carregar lead:', error)
    }
  }

  const loadExistingLink = async () => {
    try {
      const { data, error } = await supabase
        .from('agendamento_links')
        .select('*')
        .eq('lead_id', leadId)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      if (data && data.length > 0) {
        setAgendamentoLink(data[0])
        setLinkConfig({
          titulo_personalizado: data[0].titulo_personalizado || '',
          descricao_personalizada: data[0].descricao_personalizada || '',
          cor_tema: data[0].cor_tema || '#059669',
          uso_unico: data[0].uso_unico || false,
          expira_em: data[0].expira_em ? new Date(data[0].expira_em).toISOString().slice(0, 16) : ''
        })
      }
    } catch (error) {
      console.error('Erro ao carregar link existente:', error)
    } finally {
      setLoading(false)
    }
  }

  const criarOuAtualizarLink = async () => {
    if (!lead) return

    setCreating(true)
    try {
      const linkData = {
        lead_id: leadId,
        titulo_personalizado: linkConfig.titulo_personalizado || null,
        descricao_personalizada: linkConfig.descricao_personalizada || null,
        cor_tema: linkConfig.cor_tema,
        uso_unico: linkConfig.uso_unico,
        expira_em: linkConfig.expira_em ? new Date(linkConfig.expira_em).toISOString() : null,
        tipo_call_permitido: lead.valor_vendido && lead.valor_vendido >= 5000 ? 'ambos' : 'vendas',
        ativo: true
      }

      if (agendamentoLink) {
        // Atualizar link existente
        const { error } = await supabase
          .from('agendamento_links')
          .update(linkData)
          .eq('id', agendamentoLink.id)

        if (error) throw error
      } else {
        // Criar novo link
        const { data, error } = await supabase
          .from('agendamento_links')
          .insert(linkData)
          .select()
          .single()

        if (error) throw error
        setAgendamentoLink(data)
      }

      await loadExistingLink()
    } catch (error) {
      console.error('Erro ao criar/atualizar link:', error)
      alert('Erro ao gerar link de agendamento')
    } finally {
      setCreating(false)
    }
  }

  const copyLink = async () => {
    if (!agendamentoLink) return

    const fullLink = `${window.location.origin}/agendar/${agendamentoLink.token_link}`

    try {
      await navigator.clipboard.writeText(fullLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // Fallback para navegadores que não suportam clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = fullLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const abrirLink = () => {
    if (!agendamentoLink) return
    const fullLink = `${window.location.origin}/agendar/${agendamentoLink.token_link}`
    window.open(fullLink, '_blank')
  }

  const desativarLink = async () => {
    if (!agendamentoLink || !confirm('Tem certeza que deseja desativar este link?')) return

    try {
      const { error } = await supabase
        .from('agendamento_links')
        .update({ ativo: false })
        .eq('id', agendamentoLink.id)

      if (error) throw error
      setAgendamentoLink(null)
    } catch (error) {
      console.error('Erro ao desativar link:', error)
      alert('Erro ao desativar link')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Lead não encontrado</h2>
          <p className="text-gray-500 mb-6">O lead solicitado não foi localizado ou foi removido.</p>
          <button
            onClick={() => router.push('/leads')}
            className="bg-[#059669] hover:bg-[#047857] text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Voltar aos Leads
          </button>
        </div>
      </div>
    )
  }

  const tipoCallPermitido = lead.valor_vendido && lead.valor_vendido >= 5000 ? 'ambos' : 'vendas'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push('/leads')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar aos Leads
            </button>
          </div>

          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center text-white font-bold text-xl">
              {lead.nome_completo.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Link de Agendamento
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{lead.nome_completo}</span>
                </div>
                {lead.empresa && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span>{lead.empresa}</span>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{lead.email}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  lead.status === 'vendido' ? 'bg-green-100 text-green-700' :
                  lead.status === 'qualificado' ? 'bg-blue-100 text-blue-700' :
                  lead.status === 'contactado' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                </div>

                {tipoCallPermitido === 'ambos' && (
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    Elegível para Call Estratégica
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuração do Link */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[#059669]" />
              Configurar Link
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Link
                </label>
                <input
                  type="text"
                  value={linkConfig.titulo_personalizado}
                  onChange={(e) => setLinkConfig(prev => ({ ...prev, titulo_personalizado: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-colors"
                  placeholder="Título personalizado..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição do Link
                </label>
                <textarea
                  value={linkConfig.descricao_personalizada}
                  onChange={(e) => setLinkConfig(prev => ({ ...prev, descricao_personalizada: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-colors resize-none"
                  placeholder="Mensagem personalizada para o lead..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor do Tema
                  </label>
                  <input
                    type="color"
                    value={linkConfig.cor_tema}
                    onChange={(e) => setLinkConfig(prev => ({ ...prev, cor_tema: e.target.value }))}
                    className="w-full h-12 border border-gray-200 rounded-xl cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expirar em
                  </label>
                  <input
                    type="datetime-local"
                    value={linkConfig.expira_em}
                    onChange={(e) => setLinkConfig(prev => ({ ...prev, expira_em: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="uso_unico"
                  checked={linkConfig.uso_unico}
                  onChange={(e) => setLinkConfig(prev => ({ ...prev, uso_unico: e.target.checked }))}
                  className="w-5 h-5 text-[#059669] border-gray-300 rounded focus:ring-[#059669]"
                />
                <label htmlFor="uso_unico" className="text-sm text-gray-700 cursor-pointer">
                  Link de uso único (desativa após primeiro agendamento)
                </label>
              </div>

              <button
                onClick={criarOuAtualizarLink}
                disabled={creating}
                className="w-full bg-[#059669] hover:bg-[#047857] text-white px-6 py-4 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    {agendamentoLink ? 'Atualizando...' : 'Gerando...'}
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5" />
                    {agendamentoLink ? 'Atualizar Link' : 'Gerar Link'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Link Gerado */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ExternalLink className="w-6 h-6 text-[#059669]" />
              Link Gerado
            </h2>

            {agendamentoLink ? (
              <div className="space-y-6">
                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {agendamentoLink.total_visualizacoes}
                    </div>
                    <div className="text-sm text-blue-600">Visualizações</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {agendamentoLink.total_agendamentos}
                    </div>
                    <div className="text-sm text-green-600">Agendamentos</div>
                  </div>
                </div>

                {/* Link */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-sm text-gray-600 mb-2">Link de Agendamento:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded-lg text-sm border font-mono text-[#059669] break-all">
                      {`${window.location.origin}/agendar/${agendamentoLink.token_link}`}
                    </code>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">Link ativo e funcional</span>
                  {agendamentoLink.expira_em && (
                    <span className="text-gray-500">
                      • Expira em {new Date(agendamentoLink.expira_em).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                {/* Calls Disponíveis */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Calls Disponíveis:</div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full text-xs font-medium text-blue-700">
                      <Briefcase className="w-3 h-3" />
                      Call Comercial (60min)
                    </div>
                    {tipoCallPermitido === 'ambos' && (
                      <div className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full text-xs font-medium text-purple-700">
                        <Heart className="w-3 h-3" />
                        Call Estratégica (30min)
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="space-y-3">
                  <button
                    onClick={copyLink}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copiar Link
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={abrirLink}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Testar
                    </button>
                    <button
                      onClick={desativarLink}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Desativar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum link gerado</h3>
                <p className="text-gray-500">
                  Configure e gere um link de agendamento personalizado para este lead.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}