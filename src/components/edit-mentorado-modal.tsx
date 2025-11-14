'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { supabase, type Mentorado } from '@/lib/supabase'

const editMentoradoSchema = z.object({
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  turma: z.string().min(1, 'Turma é obrigatória'),
  estado_entrada: z.string().optional(),
  estado_atual: z.string().optional(),
  data_nascimento: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  endereco: z.string().optional(),
  crm: z.string().optional(),
  origem_conhecimento: z.string().optional(),
  data_inicio_mentoria: z.string().optional()
})

type EditMentoradoFormData = z.infer<typeof editMentoradoSchema>

interface EditMentoradoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mentorado: Mentorado | null
}

export function EditMentoradoModal({ isOpen, onClose, onSuccess, mentorado }: EditMentoradoModalProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<EditMentoradoFormData>({
    resolver: zodResolver(editMentoradoSchema),
    defaultValues: {
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
    }
  })

  // Função para converter data para formato YYYY-MM-DD sem problemas de timezone
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return '';

    try {
      // Se já está no formato YYYY-MM-DD, retorna como está
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }

      // Para datas ISO, pegar apenas a parte da data (YYYY-MM-DD)
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      // Usar UTC para evitar problemas de timezone
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return '';
    }
  };

  // Carregar dados do localStorage ou mentorado
  useEffect(() => {
    if (isOpen) {
      const storageKey = mentorado ? `edit-mentorado-form-${mentorado.id}` : 'edit-mentorado-form'
      const savedData = localStorage.getItem(storageKey)

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          form.reset(parsed)
          return
        } catch (e) {
          console.warn('Erro ao carregar dados salvos:', e)
        }
      }

      if (mentorado) {
        form.reset({
          nome_completo: mentorado.nome_completo || '',
          email: mentorado.email || '',
          telefone: mentorado.telefone || '',
          turma: mentorado.turma || '',
          estado_entrada: mentorado.estado_entrada || '',
          estado_atual: mentorado.estado_atual || '',
          data_nascimento: formatDateForInput(mentorado.data_nascimento),
          cpf: mentorado.cpf || '',
          rg: mentorado.rg || '',
          endereco: mentorado.endereco || '',
          crm: mentorado.crm || '',
          origem_conhecimento: mentorado.origem_conhecimento || '',
          data_inicio_mentoria: formatDateForInput(mentorado.data_inicio_mentoria)
        })
      }
    }
  }, [mentorado, isOpen, form])

  // Salvar dados no localStorage sempre que houver mudanças
  const watchedValues = form.watch()
  useEffect(() => {
    if (isOpen && mentorado) {
      const storageKey = `edit-mentorado-form-${mentorado.id}`
      localStorage.setItem(storageKey, JSON.stringify(watchedValues))
    }
  }, [watchedValues, isOpen, mentorado])

  const onSubmit = async (data: EditMentoradoFormData) => {
    if (!mentorado) return

    setLoading(true)
    try {
      console.log('🔍 Iniciando atualização do mentorado:', mentorado.id)
      console.log('📋 Dados a serem atualizados:', data)

      // Verificar sessão de autenticação
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔐 Sessão de autenticação:', session ? 'Ativa' : 'Inativa')

      // Filtrar dados vazios e nulos para evitar problemas
      const dataToUpdate = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      )

      console.log('📋 Dados filtrados para atualização:', dataToUpdate)

      const { data: result, error } = await supabase
        .from('mentorados')
        .update(dataToUpdate)
        .eq('id', mentorado.id)
        .select()

      if (error) {
        console.error('❌ Erro do Supabase:', error)
        console.error('📋 Detalhes do erro:', {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        })
        throw error
      }

      console.log('✅ Mentorado atualizado com sucesso:', result)
      alert('Mentorado atualizado com sucesso!')

      // Limpar localStorage após sucesso
      const storageKey = `edit-mentorado-form-${mentorado.id}`
      localStorage.removeItem(storageKey)

      onSuccess()
      onClose()
    } catch (error) {
      console.error('💥 Erro ao atualizar mentorado:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert(`Erro ao atualizar mentorado: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (mentorado) {
      const storageKey = `edit-mentorado-form-${mentorado.id}`
      localStorage.removeItem(storageKey)
    }
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Mentorado</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Os dados são salvos automaticamente conforme você digita.
          </p>
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
                      <Input {...field} />
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
                      <Input type="email" {...field} />
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
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="turma"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turma *</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a turma" />
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

              <FormField
                control={form.control}
                name="estado_entrada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de Entrada</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado de entrada" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="novo">Novo</SelectItem>
                          <SelectItem value="interessado">Interessado</SelectItem>
                          <SelectItem value="engajado">Engajado</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Input type="date" {...field} />
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
                      <Input type="date" {...field} />
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
                      <Input placeholder="000.000.000-00" {...field} />
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                    <FormLabel>Origem do Conhecimento</FormLabel>
                    <FormControl>
                      <Input placeholder="Como conheceu o programa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Endereço completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}