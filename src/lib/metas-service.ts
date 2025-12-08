/**
 * SERVIÇO DE METAS - Customer Success
 * Serviços para consumir dados de metas e performance via Supabase
 */

import { supabase } from './supabase'

// ========================================
// INTERFACES / TYPES
// ========================================

export interface MetaAnual {
  id: string
  ano: number
  meta_faturamento_bruto: number
  meta_faturamento_liquido: number
  ticket_medio_referencia: number
  margem_liquida_target: number
  ativo: boolean
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface MetaMensal {
  id: string
  fk_meta_anual: string
  ano: number
  mes: number
  meta_faturamento_bruto: number
  meta_faturamento_liquido: number
  meta_vendas: number
  meta_leads_gerados: number
  meta_ticket_medio: number
  meta_conversao_percent: number
  ativo: boolean
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface PerformanceVsMeta {
  ano: number
  mes: number
  mes_nome: string
  // Metas
  meta_faturamento_bruto: number
  meta_faturamento_liquido: number
  meta_vendas: number
  meta_leads_gerados: number
  meta_ticket_medio: number
  meta_conversao_percent: number
  // Realizado
  faturamento_real_bruto: number
  faturamento_real_liquido: number
  vendas_realizadas: number
  leads_gerados: number
  ticket_medio_real: number
  conversao_real_percent: number
  // Custos
  total_comissoes: number
  // Performance (%)
  percent_meta_faturamento: number
  percent_meta_vendas: number
  percent_meta_leads: number
  // Análise
  margem_liquida_real: number
  status_meta: 'ATINGIDA' | 'PRÓXIMA' | 'DISTANTE'
}

export interface PerformanceAnual {
  ano: number
  meta_faturamento_anual: number
  meta_vendas_anual: number
  faturamento_real_anual: number
  vendas_real_anual: number
  percent_meta_anual_faturamento: number
  percent_meta_anual_vendas: number
  total_comissoes_anual: number
  margem_liquida_anual: number
  ticket_medio_anual: number
  status_meta_anual: 'ATINGIDA' | 'PRÓXIMA' | 'DISTANTE'
}

// ========================================
// SERVIÇOS - CONSULTAS BÁSICAS
// ========================================

/**
 * Buscar todas as metas anuais
 */
export async function getMetasAnuais(): Promise<MetaAnual[]> {
  const { data, error } = await supabase
    .from('metas_anuais')
    .select('*')
    .eq('ativo', true)
    .order('ano', { ascending: false })

  if (error) {
    console.error('Erro ao buscar metas anuais:', error)
    throw new Error(`Erro ao carregar metas anuais: ${error.message}`)
  }

  return data || []
}

/**
 * Buscar metas mensais de um ano específico
 */
export async function getMetasMensais(ano: number): Promise<MetaMensal[]> {
  const { data, error } = await supabase
    .from('metas_mensais')
    .select('*')
    .eq('ano', ano)
    .eq('ativo', true)
    .order('mes', { ascending: true })

  if (error) {
    console.error('Erro ao buscar metas mensais:', error)
    throw new Error(`Erro ao carregar metas mensais: ${error.message}`)
  }

  return data || []
}

/**
 * Buscar meta anual específica
 */
export async function getMetaAnual(ano: number): Promise<MetaAnual | null> {
  const { data, error } = await supabase
    .from('metas_anuais')
    .select('*')
    .eq('ano', ano)
    .eq('ativo', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return null
    }
    console.error('Erro ao buscar meta anual:', error)
    throw new Error(`Erro ao carregar meta anual: ${error.message}`)
  }

  return data
}

// ========================================
// SERVIÇOS - DASHBOARD E PERFORMANCE
// ========================================

/**
 * Buscar dados de performance vs metas mensais
 * Usa a VIEW vw_performance_vs_meta
 */
export async function getDashboardMetas(ano?: number): Promise<PerformanceVsMeta[]> {
  let query = supabase
    .from('vw_performance_vs_meta')
    .select('*')

  if (ano) {
    query = query.eq('ano', ano)
  }

  query = query.order('ano', { ascending: false })
                .order('mes', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar dashboard de metas:', error)
    throw new Error(`Erro ao carregar dashboard: ${error.message}`)
  }

  return data || []
}

/**
 * Buscar resumo anual de performance
 * Usa a VIEW vw_performance_anual
 */
export async function getResumoAnual(ano?: number): Promise<PerformanceAnual[]> {
  let query = supabase
    .from('vw_performance_anual')
    .select('*')

  if (ano) {
    query = query.eq('ano', ano)
  }

  query = query.order('ano', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar resumo anual:', error)
    throw new Error(`Erro ao carregar resumo anual: ${error.message}`)
  }

  return data || []
}

// ========================================
// SERVIÇOS - FUNÇÕES RPC (OTIMIZADAS)
// ========================================

/**
 * Buscar dados mensais via função RPC (mais rápido)
 */
export async function getDashboardMetasMensaisRPC(ano?: number) {
  const { data, error } = await supabase
    .rpc('get_dashboard_metas_mensais', { p_ano: ano })

  if (error) {
    console.error('Erro na função RPC metas mensais:', error)
    throw new Error(`Erro ao carregar dados mensais: ${error.message}`)
  }

  return data || []
}

/**
 * Buscar resumo anual via função RPC (mais rápido)
 */
export async function getDashboardResumoAnualRPC(ano?: number) {
  const { data, error } = await supabase
    .rpc('get_dashboard_resumo_anual', { p_ano: ano })

  if (error) {
    console.error('Erro na função RPC resumo anual:', error)
    throw new Error(`Erro ao carregar resumo anual: ${error.message}`)
  }

  return data || []
}

// ========================================
// SERVIÇOS - QUERIES ESPECÍFICAS
// ========================================

/**
 * Buscar performance do mês atual
 */
export async function getPerformanceMesAtual(): Promise<PerformanceVsMeta | null> {
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() + 1

  const { data, error } = await supabase
    .from('vw_performance_vs_meta')
    .select('*')
    .eq('ano', anoAtual)
    .eq('mes', mesAtual)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Não há dados para o mês atual
    }
    console.error('Erro ao buscar performance do mês atual:', error)
    throw new Error(`Erro ao carregar performance atual: ${error.message}`)
  }

  return data
}

/**
 * Buscar os 3 melhores meses do ano
 */
export async function getTopMesesDoAno(ano: number): Promise<PerformanceVsMeta[]> {
  const { data, error } = await supabase
    .from('vw_performance_vs_meta')
    .select('*')
    .eq('ano', ano)
    .order('percent_meta_faturamento', { ascending: false })
    .limit(3)

  if (error) {
    console.error('Erro ao buscar top meses:', error)
    throw new Error(`Erro ao carregar melhores meses: ${error.message}`)
  }

  return data || []
}

/**
 * Calcular projeção para final do ano
 */
export async function getProjecaoAnual(ano: number): Promise<{
  projecao_faturamento: number
  meta_anual: number
  percentual_projetado: number
  meses_restantes: number
}> {
  const hoje = new Date()
  const mesAtual = hoje.getFullYear() === ano ? hoje.getMonth() + 1 : 12

  // Buscar dados dos meses já realizados
  const { data: dadosRealizados, error: errorRealizados } = await supabase
    .from('vw_performance_vs_meta')
    .select('faturamento_real_bruto')
    .eq('ano', ano)
    .gt('faturamento_real_bruto', 0)

  if (errorRealizados) {
    throw new Error(`Erro ao calcular projeção: ${errorRealizados.message}`)
  }

  // Buscar meta anual
  const { data: metaAnual, error: errorMeta } = await supabase
    .from('metas_anuais')
    .select('meta_faturamento_bruto')
    .eq('ano', ano)
    .single()

  if (errorMeta) {
    throw new Error(`Erro ao buscar meta anual: ${errorMeta.message}`)
  }

  // Calcular projeção
  const faturamentoAtual = dadosRealizados?.reduce((acc, item) => acc + item.faturamento_real_bruto, 0) || 0
  const mediamensal = dadosRealizados?.length ? faturamentoAtual / dadosRealizados.length : 0
  const mesesRestantes = Math.max(0, 12 - mesAtual)
  const projecaoFaturamento = faturamentoAtual + (mediamensal * mesesRestantes)

  return {
    projecao_faturamento: projecaoFaturamento,
    meta_anual: metaAnual.meta_faturamento_bruto,
    percentual_projetado: metaAnual.meta_faturamento_bruto > 0
      ? (projecaoFaturamento / metaAnual.meta_faturamento_bruto) * 100
      : 0,
    meses_restantes: mesesRestantes
  }
}

// ========================================
// SERVIÇOS - CRUD DE METAS
// ========================================

/**
 * Criar nova meta anual
 */
export async function criarMetaAnual(meta: Omit<MetaAnual, 'id' | 'created_at' | 'updated_at'>): Promise<MetaAnual> {
  const { data, error } = await supabase
    .from('metas_anuais')
    .insert(meta)
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar meta anual:', error)
    throw new Error(`Erro ao criar meta anual: ${error.message}`)
  }

  return data
}

/**
 * Atualizar meta anual
 */
export async function atualizarMetaAnual(
  id: string,
  updates: Partial<Omit<MetaAnual, 'id' | 'created_at' | 'updated_at'>>
): Promise<MetaAnual> {
  const { data, error } = await supabase
    .from('metas_anuais')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar meta anual:', error)
    throw new Error(`Erro ao atualizar meta anual: ${error.message}`)
  }

  return data
}

/**
 * Criar meta mensal
 */
export async function criarMetaMensal(meta: Omit<MetaMensal, 'id' | 'created_at' | 'updated_at'>): Promise<MetaMensal> {
  const { data, error } = await supabase
    .from('metas_mensais')
    .insert(meta)
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar meta mensal:', error)
    throw new Error(`Erro ao criar meta mensal: ${error.message}`)
  }

  return data
}

/**
 * Atualizar meta mensal
 */
export async function atualizarMetaMensal(
  id: string,
  updates: Partial<Omit<MetaMensal, 'id' | 'created_at' | 'updated_at'>>
): Promise<MetaMensal> {
  const { data, error } = await supabase
    .from('metas_mensais')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar meta mensal:', error)
    throw new Error(`Erro ao atualizar meta mensal: ${error.message}`)
  }

  return data
}

// ========================================
// UTILITÁRIOS
// ========================================

/**
 * Formatar valores monetários em Real
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
}

/**
 * Formatar percentual
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value || 0).toFixed(decimals)}%`
}

/**
 * Obter cor/status baseado na performance
 */
export function getPerformanceStatus(percentual: number): {
  status: 'success' | 'warning' | 'danger'
  label: string
  color: string
} {
  if (percentual >= 100) {
    return {
      status: 'success',
      label: 'Meta Atingida',
      color: '#10B981' // green-500
    }
  } else if (percentual >= 80) {
    return {
      status: 'warning',
      label: 'Próximo à Meta',
      color: '#F59E0B' // yellow-500
    }
  } else {
    return {
      status: 'danger',
      label: 'Distante da Meta',
      color: '#EF4444' // red-500
    }
  }
}

/**
 * Obter nome do mês em português
 */
export function getNomeMes(mes: number): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  return meses[mes - 1] || ''
}

// ========================================
// EXEMPLO DE USO NO COMPONENTE
// ========================================

/*
// Exemplo de uso em um componente React

import { useEffect, useState } from 'react'
import {
  getDashboardMetasMensaisRPC,
  getDashboardResumoAnualRPC,
  getPerformanceMesAtual,
  formatCurrency,
  formatPercent,
  getPerformanceStatus
} from '@/lib/metas-service'

export function DashboardMetas() {
  const [metasMensais, setMetasMensais] = useState([])
  const [resumoAnual, setResumoAnual] = useState(null)
  const [performanceMesAtual, setPerformanceMesAtual] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        const [mensais, anual, mesAtual] = await Promise.all([
          getDashboardMetasMensaisRPC(2026),
          getDashboardResumoAnualRPC(2026),
          getPerformanceMesAtual()
        ])

        setMetasMensais(mensais)
        setResumoAnual(anual[0])
        setPerformanceMesAtual(mesAtual)

      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="dashboard-metas">
      {resumoAnual && (
        <div className="resumo-anual">
          <h2>Resumo Anual 2026</h2>
          <p>Meta: {formatCurrency(resumoAnual.meta_faturamento_anual)}</p>
          <p>Realizado: {formatCurrency(resumoAnual.faturamento_real_anual)}</p>
          <p>Performance: {formatPercent(resumoAnual.percent_meta_anual_faturamento)}</p>
        </div>
      )}

      {performanceMesAtual && (
        <div className="mes-atual">
          <h3>Performance do Mês Atual</h3>
          <p>Meta: {formatCurrency(performanceMesAtual.meta_faturamento_bruto)}</p>
          <p>Realizado: {formatCurrency(performanceMesAtual.faturamento_real_bruto)}</p>

          {(() => {
            const status = getPerformanceStatus(performanceMesAtual.percent_meta_faturamento)
            return (
              <div style={{ color: status.color }}>
                {status.label}: {formatPercent(performanceMesAtual.percent_meta_faturamento)}
              </div>
            )
          })()}
        </div>
      )}

      <div className="tabela-metas">
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th>Meta</th>
              <th>Realizado</th>
              <th>Performance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {metasMensais.map((meta) => {
              const status = getPerformanceStatus(meta.percent_meta_faturamento)
              return (
                <tr key={`${meta.ano}-${meta.mes}`}>
                  <td>{meta.mes_nome}</td>
                  <td>{formatCurrency(meta.meta_faturamento)}</td>
                  <td>{formatCurrency(meta.faturamento_real)}</td>
                  <td>{formatPercent(meta.percent_faturamento)}</td>
                  <td style={{ color: status.color }}>{status.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

*/