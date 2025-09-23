'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'

interface AddMentoradoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddMentoradoModal({ isOpen, onClose, onSuccess }: AddMentoradoModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    turma: '',
    estado_entrada: 'novo',
    estado_atual: 'novo'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('mentorados')
        .insert([formData])
        .select()

      if (error) throw error

      // Send welcome message via WhatsApp if phone number is provided
      if (formData.telefone && data && data[0]) {
        try {
          const welcomeMessage = `👋 Seja muito bem-vindo(a) à mentoria!

Parabéns pela decisão de estar aqui. Você acabou de dar um passo que muitos adiam — e que pode mudar completamente a forma como você atua, pensa e constrói seus resultados daqui pra frente.

A nossa jornada é estratégica, direta ao ponto e personalizada. Mas, pra garantir que você aproveite o melhor do processo, precisamos fazer um alinhamento inicial.

Por isso, quero que a gente agende seu onboarding 1:1 — é nessa conversa que você vai entender o caminho que vamos percorrer juntos, e eu vou te direcionar com base no seu momento atual.

👉 Me avisa aqui qual melhor dia/horário nos próximos dias, e já deixo reservado.

Vamos com tudo. 🔥`

          const { whatsappService } = await import('@/lib/whatsapp-core-service')
          const success = await whatsappService.sendMessage(formData.telefone, welcomeMessage)

          if (success) {
            console.log('✅ Mensagem de boas-vindas enviada com sucesso!')
          } else {
            console.warn('⚠️ Não foi possível enviar mensagem de boas-vindas')
          }
        } catch (whatsappError) {
          console.warn('⚠️ Erro ao enviar mensagem de boas-vindas:', whatsappError)
        }
      }

      // Reset form
      setFormData({
        nome_completo: '',
        email: '',
        telefone: '',
        turma: '',
        estado_entrada: 'novo',
        estado_atual: 'novo'
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao adicionar mentorado:', error)
      alert('Erro ao adicionar mentorado')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Mentorado</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo mentorado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome_completo" className="text-right">
                Nome
              </Label>
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => handleChange('nome_completo', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="telefone" className="text-right">
                Telefone
              </Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="turma" className="text-right">
                Turma
              </Label>
              <Select onValueChange={(value) => handleChange('turma', value)} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecionar turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Turma A">Turma A</SelectItem>
                  <SelectItem value="Turma B">Turma B</SelectItem>
                  <SelectItem value="Turma C">Turma C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="estado" className="text-right">
                Estado
              </Label>
              <Select onValueChange={(value) => handleChange('estado_atual', value)} defaultValue="novo">
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="interessado">Interessado</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="engajado">Engajado</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}