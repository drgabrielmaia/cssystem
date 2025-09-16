'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase, type Mentorado } from '@/lib/supabase'

interface EditMentoradoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mentorado: Mentorado | null
}

export function EditMentoradoModal({ isOpen, onClose, onSuccess, mentorado }: EditMentoradoModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    turma: '',
    estado_entrada: '',
    estado_atual: '',
    data_nascimento: '',
    cpf: '',
    rg: '',
    endereco: '',
    crm: '',
    origem_conhecimento: '',
    data_inicio_mentoria: ''
  })

  useEffect(() => {
    if (mentorado) {
      setFormData({
        nome_completo: mentorado.nome_completo || '',
        email: mentorado.email || '',
        telefone: mentorado.telefone || '',
        turma: mentorado.turma || '',
        estado_entrada: mentorado.estado_entrada || '',
        estado_atual: mentorado.estado_atual || '',
        data_nascimento: mentorado.data_nascimento || '',
        cpf: mentorado.cpf || '',
        rg: mentorado.rg || '',
        endereco: mentorado.endereco || '',
        crm: mentorado.crm || '',
        origem_conhecimento: mentorado.origem_conhecimento || '',
        data_inicio_mentoria: mentorado.data_inicio_mentoria || ''
      })
    }
  }, [mentorado])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mentorado) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('mentorados')
        .update(formData)
        .eq('id', mentorado.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar mentorado:', error)
      alert('Erro ao atualizar mentorado')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Mentorado</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome Completo *</Label>
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => handleChange('nome_completo', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="turma">Turma *</Label>
              <Select value={formData.turma} onValueChange={(value) => handleChange('turma', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Turma A">Turma A</SelectItem>
                  <SelectItem value="Turma B">Turma B</SelectItem>
                  <SelectItem value="Turma C">Turma C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado_entrada">Estado de Entrada</Label>
              <Select value={formData.estado_entrada} onValueChange={(value) => handleChange('estado_entrada', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado de entrada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="interessado">Interessado</SelectItem>
                  <SelectItem value="engajado">Engajado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado_atual">Estado Atual</Label>
              <Select value={formData.estado_atual} onValueChange={(value) => handleChange('estado_atual', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado atual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="engajado">Engajado</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => handleChange('data_nascimento', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_inicio_mentoria">Data Início Mentoria</Label>
              <Input
                id="data_inicio_mentoria"
                type="date"
                value={formData.data_inicio_mentoria}
                onChange={(e) => handleChange('data_inicio_mentoria', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => handleChange('cpf', e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={formData.rg}
                onChange={(e) => handleChange('rg', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="crm">CRM</Label>
              <Input
                id="crm"
                value={formData.crm}
                onChange={(e) => handleChange('crm', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="origem_conhecimento">Origem do Conhecimento</Label>
              <Input
                id="origem_conhecimento"
                value={formData.origem_conhecimento}
                onChange={(e) => handleChange('origem_conhecimento', e.target.value)}
                placeholder="Como conheceu o programa"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={formData.endereco}
              onChange={(e) => handleChange('endereco', e.target.value)}
              placeholder="Endereço completo"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
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