'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, Stethoscope, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface GeneroEspecialidadeModalProps {
  isOpen: boolean
  onClose: () => void
  mentoradoId: string
  mentoradoNome: string
  onUpdate: () => void
}

export function GeneroEspecialidadeModal({
  isOpen,
  onClose,
  mentoradoId,
  mentoradoNome,
  onUpdate
}: GeneroEspecialidadeModalProps) {
  const [genero, setGenero] = useState<string>('')
  const [especialidade, setEspecialidade] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Lista de especialidades médicas comuns
  const especialidadesSugeridas = [
    'Cardiologia',
    'Dermatologia',
    'Endocrinologia',
    'Ginecologia',
    'Neurologia',
    'Oftalmologia',
    'Ortopedia',
    'Pediatria',
    'Psiquiatria',
    'Urologia',
    'Anestesiologia',
    'Cirurgia Geral',
    'Clínica Médica',
    'Medicina de Família',
    'Radiologia',
    'Patologia',
    'Medicina do Trabalho',
    'Medicina Preventiva',
    'Geriatria',
    'Hematologia',
    'Infectologia',
    'Nefrologia',
    'Oncologia',
    'Pneumologia',
    'Reumatologia',
    'Medicina Intensiva',
    'Medicina Nuclear',
    'Medicina Física e Reabilitação',
    'Cirurgia Plástica',
    'Cirurgia Vascular',
    'Neurocirurgia',
    'Cirurgia Cardíaca',
    'Cirurgia Pediátrica',
    'Medicina Esportiva',
    'Homeopatia',
    'Acupuntura',
    'Nutrologia',
    'Medicina Estética',
    'Outro'
  ]

  const handleSubmit = async () => {
    if (!genero) {
      setError('Por favor, selecione seu gênero')
      return
    }

    if (!especialidade.trim()) {
      setError('Por favor, informe sua especialidade')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Primeiro, tentar sem updated_at
      const updateData: any = {
        genero: genero,
        especialidade: especialidade.trim()
      }

      const { error: updateError } = await supabase
        .from('mentorados')
        .update(updateData)
        .eq('id', mentoradoId)

      if (updateError) {
        throw updateError
      }

      // Sucesso - atualizar os dados e fechar modal
      onUpdate()
      onClose()
    } catch (error: any) {
      console.error('Erro ao atualizar dados:', error)
      console.error('Detalhes do erro:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })

      // Mensagem mais específica
      if (error.code === '42703' || error.code === 'PGRST204') {
        setError('❌ Campos não encontrados no banco. Execute o SQL add-genero-especialidade-fields.sql primeiro.')
      } else if (error.code === '23514') {
        setError('❌ Valor inválido para gênero. Use: masculino, feminino, outro ou nao_informado.')
      } else if (error.message?.includes('updated_at')) {
        setError('❌ Campo updated_at não existe. Execute o SQL add-genero-especialidade-fields.sql no Supabase.')
      } else if (error.message?.includes('genero') || error.message?.includes('especialidade')) {
        setError('❌ Campos genero/especialidade não existem. Execute o SQL add-genero-especialidade-fields.sql no Supabase.')
      } else {
        setError(`❌ Erro ao salvar: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEspecialidadeSelect = (value: string) => {
    if (value === 'outro') {
      setEspecialidade('')
    } else {
      setEspecialidade(value)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] bg-white border-gray-200 p-0 flex flex-col">
        {/* Header Fixo */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-100">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl text-gray-900">
              Complete seu perfil
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
              Olá, <strong>{mentoradoNome?.split(' ')[0]}</strong>! Para melhor personalização
              da sua experiência e rankings por categoria, precisamos de algumas informações adicionais.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Conteúdo Scrollável */}
        <div className="flex-1 overflow-y-auto p-6">

        <div className="space-y-6">
          {/* Seleção de Gênero */}
          <div className="space-y-3">
            <Label htmlFor="genero" className="text-base font-medium text-gray-900">
              <User className="h-4 w-4 inline mr-2" />
              Gênero *
            </Label>
            <Select value={genero} onValueChange={setGenero}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione seu gênero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
                <SelectItem value="nao_informado">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Especialidade */}
          <div className="space-y-3">
            <Label htmlFor="especialidade" className="text-base font-medium text-gray-900">
              <Stethoscope className="h-4 w-4 inline mr-2" />
              Especialidade Médica *
            </Label>

            {/* Select para especialidades sugeridas */}
            <Select value={especialidade} onValueChange={handleEspecialidadeSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione sua especialidade" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {especialidadesSugeridas.map((esp) => (
                  <SelectItem key={esp} value={esp}>
                    {esp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Campo de input personalizado quando "Outro" for selecionado */}
            {(especialidade === '' || !especialidadesSugeridas.includes(especialidade)) && (
              <div className="mt-2">
                <Input
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                  placeholder="Digite sua especialidade"
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Informações sobre o uso dos dados */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Como usamos essas informações:</p>
                <ul className="space-y-1">
                  <li>• Rankings separados por gênero para competições mais justas</li>
                  <li>• Conteúdo personalizado para sua especialidade</li>
                  <li>• Networking com profissionais da mesma área</li>
                  <li>• Estatísticas e insights relevantes ao seu perfil</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Footer Fixo */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-100 bg-gray-50">
          {/* Botões */}
          <div className="flex gap-3 mb-3">
            <Button
              onClick={handleSubmit}
              disabled={loading || !genero || !especialidade.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white min-h-[48px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : (
                'Salvar e Continuar'
              )}
            </Button>
          </div>

          {/* Texto de campos obrigatórios */}
          <p className="text-xs text-gray-500 text-center">
            * Campos obrigatórios para continuar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}