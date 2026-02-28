'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface Lead {
  id: string
  nome_completo: string
  email: string | null
  telefone: string | null
  empresa: string | null
  cargo: string | null
  origem: string | null
  status: string
  temperatura?: string | null
  prioridade?: string | null
  observacoes: string | null
  valor_potencial?: number | null
  valor_vendido: number | null
  valor_arrecadado: number | null
  data_primeiro_contato: string
  data_venda: string | null
  desistiu?: boolean | null
  lead_score?: number | null
  convertido_em?: string | null
  status_updated_at?: string | null
  next_followup_date?: string | null
  created_at: string
  updated_at: string
  mentorado_indicador_id?: string | null
  fonte_referencia?: string | null
  closer_email?: string | null
}

interface EditLeadModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onSuccess: () => void
}

export function EditLeadModal({ isOpen, onClose, lead, onSuccess }: EditLeadModalProps) {
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    empresa: '',
    cargo: '',
    origem: '',
    status: '',
    temperatura: '',
    prioridade: '',
    observacoes: '',
    valor_vendido: '',
    valor_potencial: '',
    data_venda: '',
    next_followup_date: '',
    desistiu: false,
    indicado_por: '',
    closer_email: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [closers, setClosers] = useState<{email: string; role: string}[]>([])

  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        nome_completo: lead.nome_completo || '',
        email: lead.email || '',
        telefone: lead.telefone || '',
        empresa: lead.empresa || '',
        cargo: lead.cargo || '',
        origem: lead.origem || '',
        status: lead.status || '',
        temperatura: lead.temperatura || '',
        prioridade: lead.prioridade || '',
        observacoes: lead.observacoes || '',
        valor_vendido: lead.valor_vendido?.toString() || '',
        valor_potencial: lead.valor_potencial?.toString() || '',
        data_venda: lead.data_venda ? new Date(lead.data_venda).toISOString().split('T')[0] : '',
        next_followup_date: lead.next_followup_date ? new Date(lead.next_followup_date).toISOString().split('T')[0] : '',
        desistiu: lead.desistiu || false,
        indicado_por: (lead as any).indicado_por || '',
        closer_email: lead.closer_email || ''
      })
      setMessage(null)
      loadClosers()
    }
  }, [lead, isOpen])

  const loadClosers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_users')
        .select('email, role')
        .in('role', ['closer', 'admin', 'owner'])
        .order('email')

      if (error) throw error
      setClosers(data || [])
    } catch (error) {
      console.error('Erro ao carregar closers:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead) return

    setLoading(true)
    setMessage(null)

    try {
      const previousIndicadoPor = (lead as any).indicado_por
      const newIndicadoPor = formData.indicado_por

      const updateData: any = {
        nome_completo: formData.nome_completo,
        email: formData.email || null,
        telefone: formData.telefone || null,
        empresa: formData.empresa || null,
        cargo: formData.cargo || null,
        origem: formData.origem || null,
        status: formData.status,
        temperatura: formData.temperatura || null,
        prioridade: formData.prioridade || null,
        observacoes: formData.observacoes || null,
        valor_vendido: formData.valor_vendido ? parseFloat(formData.valor_vendido) : null,
        valor_potencial: formData.valor_potencial ? parseFloat(formData.valor_potencial) : null,
        data_venda: formData.data_venda || null,
        next_followup_date: formData.next_followup_date || null,
        desistiu: formData.desistiu,
        indicado_por: formData.indicado_por || null,
        closer_email: formData.closer_email || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id)

      if (error) throw error

      // Verificar se indicado_por foi adicionado e processar pontos
      if (!previousIndicadoPor && newIndicadoPor) {
        try {
          const response = await fetch('/api/indicacao-pontos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: lead.id,
              indicado_por_id: newIndicadoPor
            })
          })
          const result = await response.json()
          if (result.success) {
            setMessage({ type: 'success', text: `Lead atualizado com sucesso! ${result.message}` })
          } else {
            setMessage({ type: 'success', text: 'Lead atualizado com sucesso!' })
          }
        } catch (error) {
          console.log('❌ Erro ao processar pontos de indicação:', error)
          setMessage({ type: 'success', text: 'Lead atualizado com sucesso!' })
        }
      } else {
        setMessage({ type: 'success', text: 'Lead atualizado com sucesso!' })
      }

      onSuccess()

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Erro ao atualizar lead:', error)
      setMessage({ type: 'error', text: 'Erro ao atualizar lead. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = [
    { value: 'novo', label: 'Novo' },
    { value: 'contato_inicial', label: 'Contato Inicial' },
    { value: 'qualificado', label: 'Qualificado' },
    { value: 'proposta', label: 'Proposta' },
    { value: 'negociacao', label: 'Negociação' },
    { value: 'vendido', label: 'Vendido' },
    { value: 'perdido', label: 'Perdido' },
    { value: 'vazado', label: 'Vazado' },
    { value: 'churn', label: 'Churn' },
    { value: 'churnzinho', label: 'Churnzinho' }
  ]

  if (!lead) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Lead
            <Badge variant="outline" className="ml-2">
              ID: {lead.id}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-md ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Informações Básicas</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome_completo">Nome Completo *</Label>
                <Input
                  id="nome_completo"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="empresa">Empresa</Label>
                <Input
                  id="empresa"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="origem">Origem</Label>
                <Input
                  id="origem"
                  value={formData.origem}
                  onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="indicado_por">Indicado por (ID do mentorado)</Label>
              <Input
                id="indicado_por"
                value={formData.indicado_por}
                onChange={(e) => setFormData({ ...formData, indicado_por: e.target.value })}
                placeholder="ID ou nome do mentorado que indicou"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ao adicionar um indicador, será automaticamente creditado 1 ponto para o mentorado
              </p>
            </div>
          </div>

          {/* Status e Vendas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Status e Vendas</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="closer_email">Closer Responsável</Label>
                <Select value={formData.closer_email} onValueChange={(value) => setFormData({ ...formData, closer_email: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um closer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não atribuído</SelectItem>
                    {closers.map((closer) => (
                      <SelectItem key={closer.email} value={closer.email}>
                        {closer.email} ({closer.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="temperatura">Temperatura do Lead</Label>
                <select
                  id="temperatura"
                  value={formData.temperatura}
                  onChange={(e) => setFormData({ ...formData, temperatura: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a temperatura</option>
                  <option value="frio">❄️ Frio</option>
                  <option value="morno">🌤️ Morno</option>
                  <option value="quente">🔥 Quente</option>
                  <option value="elite">💎 Elite</option>
                </select>
              </div>

              <div>
                <Label htmlFor="prioridade">Prioridade</Label>
                <select
                  id="prioridade"
                  value={formData.prioridade}
                  onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a prioridade</option>
                  <option value="baixa">🟢 Baixa</option>
                  <option value="media">🟡 Média</option>
                  <option value="alta">🟠 Alta</option>
                  <option value="urgente">🔴 Urgente</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valor_potencial">Valor Potencial (R$)</Label>
                <Input
                  id="valor_potencial"
                  type="number"
                  step="0.01"
                  value={formData.valor_potencial}
                  onChange={(e) => setFormData({ ...formData, valor_potencial: e.target.value })}
                  placeholder="0,00"
                />
              </div>

              <div>
                <Label htmlFor="valor_vendido">Valor Vendido (R$)</Label>
                <Input
                  id="valor_vendido"
                  type="number"
                  step="0.01"
                  value={formData.valor_vendido}
                  onChange={(e) => setFormData({ ...formData, valor_vendido: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_venda">Data da Venda</Label>
                <Input
                  id="data_venda"
                  type="date"
                  value={formData.data_venda}
                  onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="next_followup_date">Próximo Follow-up</Label>
                <Input
                  id="next_followup_date"
                  type="date"
                  value={formData.next_followup_date}
                  onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="desistiu"
                  checked={formData.desistiu}
                  onChange={(e) => setFormData({ ...formData, desistiu: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="desistiu" className="text-sm font-medium">
                  Lead desistiu da mentoria
                </Label>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
              placeholder="Observações adicionais sobre o lead..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}