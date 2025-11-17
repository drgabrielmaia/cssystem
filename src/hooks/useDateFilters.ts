'use client'

import { useState } from 'react'

export interface DateFilter {
  filtroTempo: 'todos' | 'semana_atual' | 'ultima_semana' | 'mes' | 'ano'
  dataInicio: string
  dataFim: string
}

export const useDateFilters = () => {
  const [filtroTempo, setFiltroTempo] = useState<DateFilter['filtroTempo']>('mes')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const getDateFilter = () => {
    const now = new Date()

    switch (filtroTempo) {
      case 'semana_atual':
        // Segunda-feira da semana atual até domingo
        const mondayThisWeek = new Date(now)
        const dayOfWeekCurrent = mondayThisWeek.getDay()
        const daysToSubtractCurrent = dayOfWeekCurrent === 0 ? 6 : dayOfWeekCurrent - 1
        mondayThisWeek.setDate(now.getDate() - daysToSubtractCurrent)
        mondayThisWeek.setHours(0, 0, 0, 0)

        const sundayThisWeek = new Date(mondayThisWeek)
        sundayThisWeek.setDate(mondayThisWeek.getDate() + 6)
        sundayThisWeek.setHours(23, 59, 59, 999)

        return {
          start: mondayThisWeek.toISOString(),
          end: sundayThisWeek.toISOString()
        }

      case 'ultima_semana':
        // Segunda-feira da semana passada até domingo
        const mondayLastWeek = new Date(now)
        const dayOfWeekLast = mondayLastWeek.getDay()
        const daysToSubtractLast = dayOfWeekLast === 0 ? 6 : dayOfWeekLast - 1
        mondayLastWeek.setDate(now.getDate() - daysToSubtractLast - 7)
        mondayLastWeek.setHours(0, 0, 0, 0)

        const sundayLastWeek = new Date(mondayLastWeek)
        sundayLastWeek.setDate(mondayLastWeek.getDate() + 6)
        sundayLastWeek.setHours(23, 59, 59, 999)

        return {
          start: mondayLastWeek.toISOString(),
          end: sundayLastWeek.toISOString()
        }

      case 'mes':
        // Primeiro dia do mês atual
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        firstDayOfMonth.setHours(0, 0, 0, 0)

        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        lastDayOfMonth.setHours(23, 59, 59, 999)

        return {
          start: firstDayOfMonth.toISOString(),
          end: lastDayOfMonth.toISOString()
        }

      case 'ano':
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
        firstDayOfYear.setHours(0, 0, 0, 0)

        const lastDayOfYear = new Date(now.getFullYear(), 11, 31)
        lastDayOfYear.setHours(23, 59, 59, 999)

        return {
          start: firstDayOfYear.toISOString(),
          end: lastDayOfYear.toISOString()
        }

      default:
        if (dataInicio || dataFim) {
          const start = dataInicio ? new Date(dataInicio + 'T00:00:00') : null
          const end = dataFim ? new Date(dataFim + 'T23:59:59') : null

          return {
            start: start?.toISOString() || null,
            end: end?.toISOString() || null
          }
        }
        return null
    }
  }

  const resetFilters = () => {
    setFiltroTempo('todos')
    setDataInicio('')
    setDataFim('')
  }

  const setDateRange = (inicio: string, fim: string) => {
    setDataInicio(inicio)
    setDataFim(fim)
    setFiltroTempo('todos') // Reset period filter when using custom dates
  }

  return {
    // States
    filtroTempo,
    dataInicio,
    dataFim,

    // Actions
    setFiltroTempo,
    setDataInicio,
    setDataFim,
    setDateRange,
    resetFilters,

    // Computed
    getDateFilter,

    // UI helpers
    hasActiveFilter: filtroTempo !== 'todos' || dataInicio || dataFim
  }
}