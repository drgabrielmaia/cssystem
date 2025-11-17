'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Filter } from 'lucide-react'
import { DateFilter } from '@/hooks/useDateFilters'

interface DateFiltersProps {
  filtroTempo: DateFilter['filtroTempo']
  dataInicio: string
  dataFim: string
  setFiltroTempo: (filter: DateFilter['filtroTempo']) => void
  setDataInicio: (date: string) => void
  setDataFim: (date: string) => void
  resetFilters: () => void
}

export function DateFilters({
  filtroTempo,
  dataInicio,
  dataFim,
  setFiltroTempo,
  setDataInicio,
  setDataFim,
  resetFilters
}: DateFiltersProps) {
  return (
    <div className="glass-card p-4 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filtros por Período</span>
      </div>

      {/* Filtros de Período Rápido */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filtroTempo === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setFiltroTempo('todos')
            setDataInicio('')
            setDataFim('')
          }}
          className="text-xs"
        >
          📅 Todos
        </Button>
        <Button
          variant={filtroTempo === 'semana_atual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setFiltroTempo('semana_atual')
            setDataInicio('')
            setDataFim('')
          }}
          className="text-xs"
        >
          📆 Semana Atual
        </Button>
        <Button
          variant={filtroTempo === 'ultima_semana' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setFiltroTempo('ultima_semana')
            setDataInicio('')
            setDataFim('')
          }}
          className="text-xs"
        >
          📆 Última Semana
        </Button>
        <Button
          variant={filtroTempo === 'mes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setFiltroTempo('mes')
            setDataInicio('')
            setDataFim('')
          }}
          className="text-xs"
        >
          📅 Mês Atual
        </Button>
        <Button
          variant={filtroTempo === 'ano' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setFiltroTempo('ano')
            setDataInicio('')
            setDataFim('')
          }}
          className="text-xs"
        >
          📄 Ano Atual
        </Button>
      </div>

      {/* Filtro por Datas Personalizadas */}
      <div className="border-t pt-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-600">De:</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value)
                setFiltroTempo('todos')
              }}
              className="text-xs w-36 glass-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-600">Até:</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value)
                setFiltroTempo('todos')
              }}
              className="text-xs w-36 glass-input"
            />
          </div>
          {(dataInicio || dataFim || filtroTempo !== 'todos') && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="text-xs"
            >
              ✖️ Limpar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}