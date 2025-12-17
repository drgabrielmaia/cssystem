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
    <div className="bg-gray-800 rounded-2xl shadow-[0_4px_20px_-2px_rgb(0_0_0_/_0.3)] border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white w-full sm:w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
              />
            </div>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors">
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
            <tr className="bg-gray-700">
              {columns.map((col, i) => (
                <th key={i} className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-700 transition-colors">
                {columns.map((col, j) => (
                  <td key={j} className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-white">
                    {col.render ? col.render(row) : row[col.key || '']}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
            {data.length === 0
              ? 'Nenhum resultado encontrado'
              : `Mostrando ${Math.min(data.length, 10)} de ${data.length} resultado${data.length !== 1 ? 's' : ''}`
            }
          </p>
          <div className="flex items-center justify-center gap-2">
            <button className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs sm:text-sm font-medium text-white transition-colors">
              Anterior
            </button>
            <button className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs sm:text-sm font-medium text-white transition-colors">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}