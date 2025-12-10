'use client'

import { Search, Filter } from 'lucide-react'

interface Column {
  header: string
  key?: string
  render?: (row: any) => React.ReactNode
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  title: string
}

export const DataTable = ({ columns, data, title }: DataTableProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgb(0_0_0_/_0.08)] border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-[#0F172A]">{title}</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-10 pr-4 py-2 bg-[#F1F5F9] border border-gray-200 rounded-xl text-sm w-full sm:w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>
            <button className="px-4 py-2 bg-[#F1F5F9] hover:bg-gray-200 rounded-xl text-sm font-medium text-[#475569] flex items-center justify-center gap-2 transition-colors">
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F1F5F9]">
              {columns.map((col, i) => (
                <th key={i} className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-[#F1F5F9] transition-colors">
                {columns.map((col, j) => (
                  <td key={j} className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-[#0F172A]">
                    {col.render ? col.render(row) : row[col.key || '']}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs sm:text-sm text-[#94A3B8] text-center sm:text-left">
            {data.length === 0
              ? 'Nenhum resultado encontrado'
              : `Mostrando ${Math.min(data.length, 10)} de ${data.length} resultado${data.length !== 1 ? 's' : ''}`
            }
          </p>
          <div className="flex items-center justify-center gap-2">
            <button className="px-3 sm:px-4 py-2 bg-[#F1F5F9] hover:bg-gray-200 rounded-xl text-xs sm:text-sm font-medium text-[#475569] transition-colors">
              Anterior
            </button>
            <button className="px-3 sm:px-4 py-2 bg-[#059669] hover:bg-[#047857] rounded-xl text-xs sm:text-sm font-medium text-white transition-colors">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}