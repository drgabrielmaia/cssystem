'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { debounce } from 'lodash'
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
  turma: z.string().min(1, 'Turma é obrigatória'),
  estado_entrada: z.string().optional().default('novo'),
  estado_atual: z.string().optional().default('novo')
})

type MentoradoFormData = z.infer<typeof mentoradoSchema>

interface AddMentoradoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddMentoradoModal({ isOpen, onClose, onSuccess }: AddMentoradoModalProps) {
  const [loading, setLoading] = useState(false)
  const [tempMentoradoId, setTempMentoradoId] = useState<string | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)

  const form = useForm<MentoradoFormData>({
    // resolver: zodResolver(mentoradoSchema),
    defaultValues: {
      nome_completo: '',
      email: '',
      telefone: '',
      turma: '',
      estado_entrada: 'novo',
      estado_atual: 'novo'
    }
  })

  // Função para criar um mentorado temporário no banco
  const createTempMentorado = useCallback(async () => {
    if (tempMentoradoId) return tempMentoradoId

    try {
      // Gerar email único para evitar conflitos
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)

      const { data, error } = await supabase
        .from('mentorados')
        .insert([{
          nome_completo: `Lead em preenchimento ${timestamp}`,
          email: `temp_${timestamp}_${randomId}@leadtemp.com`,
          telefone: '',
          turma: '',
          estado_entrada: 'novo',
          estado_atual: 'novo'
        }])
        .select('id')
        .single()

      if (error) throw error

      const newId = data.id
      setTempMentoradoId(newId)
      console.log('✅ Mentorado temporário criado:', newId)
      return newId
    } catch (error) {
      console.error('❌ Erro ao criar mentorado temporário:', error)
      return null
    }
  }, [tempMentoradoId])

  // Função para auto-salvar dados no banco
  const autoSaveToDatabase = useCallback(debounce(async (data: Partial<MentoradoFormData>) => {
    console.log('🚀 Auto-save iniciado com dados:', data)

    if (!isOpen) {
      console.log('❌ Modal não está aberto, cancelando auto-save')
      return
    }

    setIsAutoSaving(true)
    try {
      let mentoradoId = tempMentoradoId

      // Criar mentorado temporário se não existir
      if (!mentoradoId) {
        console.log('📝 Criando mentorado temporário...')
        mentoradoId = await createTempMentorado()
        if (!mentoradoId) {
          console.log('❌ Falhou ao criar mentorado temporário')
          return
        }
      }

      // Usar os dados como estão (permitir campos vazios)
      const dataToUpdate = data

      console.log('📊 Dados para update:', dataToUpdate)

      if (Object.keys(dataToUpdate).length === 0) {
        console.log('⚠️ Nenhum dado para atualizar')
        return
      }

      console.log(`💾 Salvando no mentorado ID ${mentoradoId}...`)

      const { data: updateResult, error } = await supabase
        .from('mentorados')
        .update(dataToUpdate)
        .eq('id', mentoradoId)
        .select()

      if (error) {
        console.error('❌ Erro no auto-save:', error)
        console.error('📊 Dados que causaram erro:', dataToUpdate)
        console.error('🆔 ID do mentorado:', mentoradoId)
      } else {
        console.log('✅ Auto-save realizado com sucesso!')
        console.log('📊 Dados salvos:', dataToUpdate)
        console.log('🔄 Resultado da atualização:', updateResult)
      }
    } catch (error) {
      console.error('💥 Erro geral no auto-save:', error)
    } finally {
      setIsAutoSaving(false)
    }
  }, 800), [tempMentoradoId, isOpen, createTempMentorado])

  const onSubmit = async (data: MentoradoFormData) => {
    setLoading(true)

    try {
      let result

      if (tempMentoradoId) {
        // Atualizar mentorado existente
        const updateResult = await supabase
          .from('mentorados')
          .update(data)
          .eq('id', tempMentoradoId)
          .select()

        if (updateResult.error) throw updateResult.error
        result = updateResult.data
      } else {
        // Criar novo mentorado
        const insertResult = await supabase
          .from('mentorados')
          .insert([data])
          .select()

        if (insertResult.error) throw insertResult.error
        result = insertResult.data
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
      setTempMentoradoId(null)

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao adicionar mentorado:', error)
      alert('Erro ao adicionar mentorado')
    } finally {
      setLoading(false)
    }
  }


  // Função para salvar quando mudar de campo (onChange + onBlur)
  const handleFieldChange = useCallback((fieldName: keyof MentoradoFormData, value: any) => {
    if (!isOpen) {
      console.log('⚠️ Modal não está aberto, auto-save cancelado')
      return
    }

    // Salva qualquer valor, mesmo se vazio
    console.log(`🔄 AUTO-SAVE ACIONADO [${fieldName.toUpperCase()}]:`, value)
    console.log(`📝 Tipo de evento: onBlur (saiu do campo)`)
    const fieldData = { [fieldName]: value || '' }
    autoSaveToDatabase(fieldData)
  }, [isOpen, autoSaveToDatabase])

  // Função de debounce mais rápida para onChange
  const handleFieldChangeInstant = useCallback(debounce((fieldName: keyof MentoradoFormData, value: any) => {
    if (!isOpen) {
      console.log('⚠️ Modal não está aberto, auto-save cancelado')
      return
    }

    console.log(`⚡ AUTO-SAVE ONCHANGE [${fieldName.toUpperCase()}]:`, value)
    console.log(`⏱️ Tipo de evento: onChange (digitou e parou por 500ms)`)
    const fieldData = { [fieldName]: value || '' }
    autoSaveToDatabase(fieldData)
  }, 500), [isOpen, autoSaveToDatabase])

  // Reset ao abrir modal
  useEffect(() => {
    if (isOpen) {
      console.log('🚀 MODAL ABERTO - Resetando formulário')
      form.reset()
      setTempMentoradoId(null)
      console.log('✅ Formulário resetado, pronto para auto-save')
    } else {
      console.log('❌ MODAL FECHADO')
    }
  }, [isOpen, form])

  // Limpar dados temporários
  const handleClose = async () => {
    if (tempMentoradoId) {
      // Verificar se o mentorado tem dados válidos antes de deletar
      const formValues = form.getValues()
      const hasValidData = Object.values(formValues).some(value =>
        value && value.toString().trim() !== '' &&
        !value.toString().includes('Lead em preenchimento') &&
        !value.toString().includes('@leadtemp.com')
      )

      if (!hasValidData) {
        // Só deleta se não tem nenhum dado válido preenchido
        console.log('🗑️ Deletando mentorado temporário vazio...')
        await supabase
          .from('mentorados')
          .delete()
          .eq('id', tempMentoradoId)
        console.log('✅ Mentorado temporário deletado')
      } else {
        console.log('💾 Mantendo mentorado temporário com dados:', formValues)
      }
    }
    form.reset()
    setTempMentoradoId(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Mentorado</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Preencha os dados do novo mentorado. Os dados são salvos automaticamente quando você vai para o próximo campo.
            {isAutoSaving && (
              <span className="text-blue-600 text-xs flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Salvando...
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Nome</FormLabel>
                <FormField
                  control={form.control}
                  name="nome_completo"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            console.log(`⌨️ DIGITANDO [NOME]:`, e.target.value)
                            field.onChange(e)
                            handleFieldChangeInstant('nome_completo', e.target.value)
                          }}
                          onBlur={() => {
                            console.log(`👋 SAIU DO CAMPO [NOME]:`, field.value)
                            handleFieldChange('nome_completo', field.value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Email</FormLabel>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          onChange={(e) => {
                            console.log(`⌨️ DIGITANDO [EMAIL]:`, e.target.value)
                            field.onChange(e)
                            handleFieldChangeInstant('email', e.target.value)
                          }}
                          onBlur={() => {
                            console.log(`👋 SAIU DO CAMPO [EMAIL]:`, field.value)
                            handleFieldChange('email', field.value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Telefone</FormLabel>
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            console.log(`⌨️ DIGITANDO [TELEFONE]:`, e.target.value)
                            field.onChange(e)
                            handleFieldChangeInstant('telefone', e.target.value)
                          }}
                          onBlur={() => {
                            console.log(`👋 SAIU DO CAMPO [TELEFONE]:`, field.value)
                            handleFieldChange('telefone', field.value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Turma</FormLabel>
                <FormField
                  control={form.control}
                  name="turma"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            console.log(`📋 SELECIONOU [TURMA]:`, value)
                            field.onChange(value)
                            handleFieldChange('turma', value)
                          }}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar turma" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Turma A">Turma A</SelectItem>
                            <SelectItem value="Turma B">Turma B</SelectItem>
                            <SelectItem value="Turma C">Turma C</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel className="text-right">Estado</FormLabel>
                <FormField
                  control={form.control}
                  name="estado_atual"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            console.log(`🎯 SELECIONOU [ESTADO]:`, value)
                            field.onChange(value)
                            handleFieldChange('estado_atual', value)
                          }}
                          value={field.value}
                        >
                          <SelectTrigger>
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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