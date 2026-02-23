'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, UserX, FileX, Copy, TestTube, HelpCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'

interface ChurnModalProps {
  isOpen: boolean
  onClose: () => void
  mentorado: {
    id: string
    nome_completo: string
    email: string
    data_entrada: string
  } | null
  onChurnProcessed: () => void
}

const churnTypes = [
  { 
    value: 'churn', 
    label: 'Churn - Cliente desistiu',
    description: 'Cliente decidiu cancelar por insatisfação ou outros motivos',
    icon: UserX,
    color: 'text-red-500'
  },
  { 
    value: 'erro_cadastro', 
    label: 'Erro de Cadastro',
    description: 'Cadastro foi feito incorretamente ou por engano',
    icon: FileX,
    color: 'text-orange-500'
  },
  { 
    value: 'duplicata', 
    label: 'Cadastro Duplicado',
    description: 'Mentorado já existia no sistema',
    icon: Copy,
    color: 'text-blue-500'
  },
  { 
    value: 'teste', 
    label: 'Cadastro de Teste',
    description: 'Cadastro foi feito apenas para teste',
    icon: TestTube,
    color: 'text-purple-500'
  },
  { 
    value: 'outros', 
    label: 'Outros Motivos',
    description: 'Outros motivos não listados acima',
    icon: HelpCircle,
    color: 'text-gray-500'
  }
]

export function ChurnModal({ isOpen, onClose, mentorado, onChurnProcessed }: ChurnModalProps) {
  const { user, organizationId } = useAuth()
  const [tipoExclusao, setTipoExclusao] = useState<string>('')
  const [motivo, setMotivo] = useState<string>('')
  const [processing, setProcessing] = useState(false)

  const selectedType = churnTypes.find(type => type.value === tipoExclusao)

  const handleConfirm = async () => {
    if (!mentorado || !tipoExclusao) return

    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('process_mentorado_churn', {
        p_mentorado_id: mentorado.id,
        p_tipo_exclusao: tipoExclusao,
        p_motivo: motivo.trim() || null,
        p_excluido_por_email: user?.email || null,
        p_organization_id: organizationId
      })

      if (error) {
        console.error('Erro ao processar churn:', error)
        alert('Erro ao processar exclusão: ' + error.message)
        return
      }

      if (data && data[0]?.success) {
        alert('Exclusão processada com sucesso!')
        onChurnProcessed()
        handleClose()
      } else {
        alert('Erro ao processar exclusão: ' + (data?.[0]?.message || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao processar churn:', error)
      alert('Erro ao processar exclusão')
    } finally {
      setProcessing(false)
    }
  }

  const handleClose = () => {
    setTipoExclusao('')
    setMotivo('')
    onClose()
  }

  if (!mentorado) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Confirmar Exclusão de Mentorado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Mentorado */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold text-white mb-2">Mentorado a ser excluído:</h3>
            <div className="space-y-1 text-sm">
              <p className="text-white">
                <span className="font-medium">Nome:</span> {mentorado.nome_completo}
              </p>
              <p className="text-gray-400">
                <span className="font-medium">Email:</span> {mentorado.email}
              </p>
              <p className="text-gray-400">
                <span className="font-medium">Data de entrada:</span> {' '}
                {new Date(mentorado.data_entrada).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Tipo de Exclusão */}
          <div className="space-y-3">
            <Label className="text-white font-medium">
              Motivo da exclusão <span className="text-red-500">*</span>
            </Label>
            <Select value={tipoExclusao} onValueChange={setTipoExclusao}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Selecione o motivo da exclusão" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {churnTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <SelectItem 
                      key={type.value} 
                      value={type.value}
                      className="text-white hover:bg-gray-700 focus:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${type.color}`} />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            
            {selectedType && (
              <p className="text-sm text-gray-400 bg-gray-800 p-2 rounded border-l-4 border-gray-600">
                {selectedType.description}
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-3">
            <Label className="text-white font-medium">
              Observações adicionais (opcional)
            </Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva detalhes sobre o motivo da exclusão..."
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 min-h-[80px]"
            />
          </div>

          {/* Aviso sobre consequências */}
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-400 font-medium mb-1">Atenção:</p>
                <ul className="text-red-300 space-y-1 text-xs">
                  <li>• Esta ação não poderá ser desfeita facilmente</li>
                  <li>• O mentorado perderá acesso imediatamente</li>
                  <li>• Os dados serão mantidos para relatórios e auditoria</li>
                  <li>• Comissões e relacionamentos serão preservados</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!tipoExclusao || processing}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </div>
              ) : (
                'Confirmar Exclusão'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}