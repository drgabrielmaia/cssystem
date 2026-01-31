'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { supabase } from '@/lib/supabase'

const mentoradoSchema = z.object({
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  estado_entrada: z.string().optional(),
  estado_atual: z.string().optional(),
  data_nascimento: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  endereco: z.string().optional(),
  crm: z.string().optional(),
  origem_conhecimento: z.string().optional(),
  data_inicio_mentoria: z.string().optional(),
  data_entrada: z.string().optional()
})

type MentoradoFormData = z.infer<typeof mentoradoSchema>

interface AddMentoradoModalSafeProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  organizationId?: string | null
}

export function AddMentoradoModalSafe({ isOpen, onClose, onSuccess, organizationId }: AddMentoradoModalSafeProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<MentoradoFormData>({
    resolver: zodResolver(mentoradoSchema),
    defaultValues: {
      nome_completo: '',
      email: '',
      telefone: '',
      estado_entrada: '',
      estado_atual: '',
      data_nascimento: '',
      cpf: '',
      rg: '',
      endereco: '',
      crm: '',
      origem_conhecimento: '',
      data_inicio_mentoria: '',
      data_entrada: ''
    }
  })

  const onSubmit = async (data: MentoradoFormData) => {
    setLoading(true)

    try {
      if (!organizationId) {
        throw new Error('Organization ID não encontrado')
      }

      // Criar novo mentorado com organization_id
      const mentoradoData = {
        ...data,
        organization_id: organizationId,
        data_entrada: data.data_entrada || new Date().toISOString().split('T')[0],
        estado_atual: data.estado_atual || 'ativo'
      }

      console.log('📝 Criando mentorado:', mentoradoData)

      const { data: result, error } = await supabase
        .from('mentorados')
        .insert([mentoradoData])
        .select()

      if (error) {
        console.error('❌ Erro ao criar mentorado:', error)
        throw error
      }

      console.log('✅ Mentorado criado:', result)

      // Send welcome message via WhatsApp if phone number is provided
      if (data.telefone && result && result[0]) {
        try {
          console.log('📱 Tentando enviar mensagem de boas-vindas...')

          const welcomeMessage = `👋 Seja muito bem-vindo(a) à mentoria!

Parabéns pela decisão de estar aqui. Você acabou de dar um passo que muitos adiam — e que pode mudar completamente a forma como você atua, pensa e constrói seus resultados daqui pra frente.

A nossa jornada é estratégica, direta ao ponto e personalizada. Mas, pra garantir que você aproveite o melhor do processo, precisamos fazer um alinhamento inicial.

Por isso, quero que a gente agende seu onboarding 1:1 — é nessa conversa que você vai entender o caminho que vamos percorrer juntos, e eu vou te direcionar com base no seu momento atual.

👉 Me avisa aqui qual melhor dia/horário nos próximos dias, e já deixo reservado.

Vamos com tudo. 🔥`

          try {
            const { whatsappService } = await import('@/lib/whatsapp-core-service')
            const success = await whatsappService.sendMessage(data.telefone, welcomeMessage)

            if (success) {
              console.log('✅ Mensagem de boas-vindas enviada com sucesso!')
            } else {
              console.warn('⚠️ Não foi possível enviar mensagem de boas-vindas')
            }
          } catch (importError) {
            console.warn('⚠️ Erro ao carregar serviço WhatsApp:', importError)
          }
        } catch (whatsappError) {
          console.warn('⚠️ Erro ao enviar mensagem de boas-vindas:', whatsappError)
        }
      }

      // Reset form
      form.reset()
      alert('Mentorado criado com sucesso!')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('💥 Erro ao adicionar mentorado:', error)
      alert(error?.message || 'Erro ao adicionar mentorado')
    } finally {
      setLoading(false)
    }
  }

  // Reset ao abrir modal
  useEffect(() => {
    if (isOpen) {
      form.reset()
    }
  }, [isOpen, form])

  const handleClose = () => {
    form.reset()
    onClose()
  }

  if (!organizationId) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Erro de Configuração</DialogTitle>
            <DialogDescription>
              Organization ID não encontrado. Faça login novamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Mentorado</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo mentorado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome completo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@exemplo.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(11) 99999-9999" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado_atual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado Atual</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar estado" />
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}