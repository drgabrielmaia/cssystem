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
import { useDraggable } from '@/hooks/use-draggable'
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

interface AddMentoradoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddMentoradoModal({ isOpen, onClose, onSuccess }: AddMentoradoModalProps) {
  const [loading, setLoading] = useState(false)
  const { ref: draggableRef, isDragging } = useDraggable({
    enabled: isOpen,
    handle: '[data-drag-handle="mentorado-modal"]'
  })

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
      // Criar novo mentorado
      const { data: result, error } = await supabase
        .from('mentorados')
        .insert([data])
        .select()

      if (error) throw error

      // Automatically grant access to all video modules
      if (result && result[0]) {
        try {
          const newMentorado = result[0]

          // Get all active modules from the organization
          const { data: modules, error: modulesError } = await supabase
            .from('video_modules')
            .select('id')
            .eq('organization_id', newMentorado.organization_id)
            .eq('is_active', true)

          if (!modulesError && modules && modules.length > 0) {
            // Create access records for all modules
            const accessRecords = modules.map(module => ({
              mentorado_id: newMentorado.id,
              module_id: module.id,
              has_access: true,
              granted_at: new Date().toISOString(),
              granted_by: 'auto_grant_on_creation',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))

            const { error: accessError } = await supabase
              .from('video_access_control')
              .insert(accessRecords)

            if (accessError) {
              console.warn('⚠️ Erro ao criar acessos aos módulos:', accessError.message)
            } else {
              console.log('✅ Acessos aos módulos criados automaticamente para', newMentorado.nome_completo)
            }
          }
        } catch (moduleAccessError) {
          console.warn('⚠️ Erro ao processar acesso aos módulos:', moduleAccessError)
        }
      }

      // Send welcome message via WhatsApp if phone number is provided
      if (data.telefone && result && result[0]) {
        try {
          const welcomeMessage = `👋 Seja muito bem-vindo(a) à mentoria!

Parabéns pela decisão de estar aqui. Você acabou de dar um passo que muitos adiam — e que pode mudar completamente a forma como você atua, pensa e constrói seus resultados daqui pra frente.

A nossa jornada é estratégica, direta ao ponto e personalizada. Mas, pra garantir que você aproveite o melhor do processo, precisamos fazer um alinhamento inicial.

Por isso, quero que a gente agende seu onboarding 1:1 — é nessa conversa que você vai entender o caminho que vamos percorrer juntos, e eu vou te direcionar com base no seu momento atual.

👉 Me avisa aqui qual melhor dia/horário nos próximos dias, e já deixo reservado.

Vamos com tudo. 🔥`

          const { whatsappService } = await import('@/lib/whatsapp-core-service')
          const success = await whatsappService.sendMessage(data.telefone, welcomeMessage)

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
      form.reset()
      alert('Mentorado criado com sucesso!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao adicionar mentorado:', error)
      alert('Erro ao adicionar mentorado')
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        ref={draggableRef}
        className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isDragging ? 'select-none' : ''}`}
      >
        <DialogHeader>
          <DialogTitle
            data-drag-handle="mentorado-modal"
            className="cursor-move flex items-center gap-2"
          >
            <span className="text-gray-400">⋮⋮</span>
            Adicionar Novo Mentorado
          </DialogTitle>
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

              <FormField
                control={form.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="000.000.000-00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RG</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="00.000.000-0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="crm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CRM</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="CRM/UF 000000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Endereço completo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="origem_conhecimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Como conheceu</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Como conheceu a mentoria" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_inicio_mentoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Início Mentoria</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_entrada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Entrada na Mentoria</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
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