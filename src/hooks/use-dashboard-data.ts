'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Mentorado, FormularioResposta, KPI } from '@/types'

interface DashboardData {
  kpis: KPI[]
  recentActivity: any[]
  engagementData: any[]
  loading: boolean
  error: string | null
}

export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    kpis: [],
    recentActivity: [],
    engagementData: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }))

        const { data: mentorados, error: mentoradosError } = await supabase
          .from('mentorados')
          .select('*')
          .order('created_at', { ascending: false })

        if (mentoradosError) throw mentoradosError

        const { data: formularios, error: formulariosError } = await supabase
          .from('formularios_respostas')
          .select(`
            *,
            mentorados (nome)
          `)
          .order('data_envio', { ascending: false })
          .limit(10)

        if (formulariosError) throw formulariosError

        const totalMentorados = mentorados?.length || 0
        const mentoradosAtivos = mentorados?.filter(m => m.estado_atual === 'ativo').length || 0
        const mentoradosEstesMes = mentorados?.filter(m => {
          const created = new Date(m.created_at)
          const thisMonth = new Date()
          return created.getMonth() === thisMonth.getMonth() && 
                 created.getFullYear() === thisMonth.getFullYear()
        }).length || 0

        const kpis: KPI[] = [
          {
            label: 'Mentorados Ativos',
            value: mentoradosAtivos,
            change: 12,
            changeType: 'increase'
          },
          {
            label: 'Total de Mentorados',
            value: totalMentorados,
            change: 8,
            changeType: 'increase'
          },
          {
            label: 'Novos este Mês',
            value: mentoradosEstesMes,
            change: -5,
            changeType: 'increase'
          },
          {
            label: 'Taxa de Engajamento',
            value: '87%',
            change: 3,
            changeType: 'increase'
          }
        ]

        const recentActivity = formularios?.map(f => ({
          id: f.id,
          type: 'form_submitted' as const,
          mentorado_nome: (f.mentorados as any)?.nome || 'Mentorado',
          formulario: f.formulario,
          timestamp: f.data_envio,
          details: ''
        })) || []

        const engagementData = [
          { turma: 'Turma A', engajamento: 85, mes: 'Jan' },
          { turma: 'Turma A', engajamento: 90, mes: 'Fev' },
          { turma: 'Turma A', engajamento: 87, mes: 'Mar' },
          { turma: 'Turma B', engajamento: 78, mes: 'Jan' },
          { turma: 'Turma B', engajamento: 82, mes: 'Fev' },
          { turma: 'Turma B', engajamento: 86, mes: 'Mar' },
        ]

        setData({
          kpis,
          recentActivity,
          engagementData,
          loading: false,
          error: null
        })

      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error)
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Erro ao carregar dados. Verifique se o Supabase está configurado.'
        }))
      }
    }

    fetchDashboardData()
  }, [])

  return data
}