'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
  Phone,
  PhoneOff,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  Target
} from 'lucide-react'

interface CallStatusControlProps {
  eventId: string
  currentStatus?: string
  currentValue?: number
  currentNotes?: string
  isCall: boolean
  onUpdate: () => void
}

export function CallStatusControl({
  eventId,
  currentStatus,
  currentValue,
  currentNotes,
  isCall,
  onUpdate
}: CallStatusControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState(currentStatus || 'agendada')
  const [saleValue, setSaleValue] = useState(currentValue?.toString() || '')
  const [notes, setNotes] = useState(currentNotes || '')
  const [loading, setLoading] = useState(false)

  const handleQuickStatus = async (newStatus: string) => {
    try {
      setLoading(true)

      const updateData: any = { call_status: newStatus }

      // Se mudou para vendida, solicitar valor
      if (newStatus === 'vendida' && !currentValue) {
        const value = prompt('Valor da venda (R$):')
        if (value) {
          updateData.sale_value = parseFloat(value.replace(',', '.'))
        }
      }

      // Se mudou para não vendida, limpar valor
      if (newStatus === 'nao_vendida') {
        updateData.sale_value = null
      }

      const { error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', eventId)

      if (error) throw error

      onUpdate()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status da call')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)

      const updateData: any = {
        call_status: status,
        result_notes: notes || null,
        sale_value: status === 'vendida' && saleValue
          ? parseFloat(saleValue.replace(',', '.'))
          : null
      }

      const { error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', eventId)

      if (error) throw error

      setIsOpen(false)
      onUpdate()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar informações')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'agendada': { label: 'Agendada', className: 'bg-gray-100 text-gray-800', icon: Calendar },
      'realizada': { label: 'Realizada', className: 'bg-blue-100 text-blue-800', icon: Phone },
      'no_show': { label: 'No-Show', className: 'bg-orange-100 text-orange-800', icon: PhoneOff },
      'vendida': { label: 'Vendida', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      'nao_vendida': { label: 'Não Vendida', className: 'bg-red-100 text-red-800', icon: XCircle },
      'aguardando_resposta': { label: 'Aguardando', className: 'bg-yellow-100 text-yellow-800', icon: Clock }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.agendada
    const Icon = config.icon

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (!isCall) {
    return null
  }

  return (
    <div className="space-y-2">
      {/* Status atual */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Status:</span>
        {getStatusBadge(currentStatus || 'agendada')}
      </div>

      {/* Valor da venda (se houver) */}
      {currentValue && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Valor:</span>
          <span className="font-medium text-green-600">
            {formatCurrency(currentValue)}
          </span>
        </div>
      )}

      {/* Botões de ação rápida */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickStatus('realizada')}
          disabled={loading}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <Phone className="w-3 h-3 mr-1" />
          Realizada
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickStatus('no_show')}
          disabled={loading}
          className="text-orange-600 border-orange-200 hover:bg-orange-50"
        >
          <PhoneOff className="w-3 h-3 mr-1" />
          No-Show
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickStatus('vendida')}
          disabled={loading}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Vendida
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickStatus('nao_vendida')}
          disabled={loading}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <XCircle className="w-3 h-3 mr-1" />
          Não Vendida
        </Button>
      </div>

      {/* Botão para controle detalhado */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Target className="w-3 h-3 mr-1" />
            Controle Detalhado
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controle da Call</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Status da Call</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                  <SelectItem value="no_show">No-Show</SelectItem>
                  <SelectItem value="vendida">Vendida</SelectItem>
                  <SelectItem value="nao_vendida">Não Vendida</SelectItem>
                  <SelectItem value="aguardando_resposta">Aguardando Resposta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === 'vendida' && (
              <div>
                <Label>Valor da Venda (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Adicione observações sobre a call..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}