'use client'

type StatusType = 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'new' | 'contacted' | 'scheduled' | 'hot' | 'converted' | 'lost'

interface StatusBadgeProps {
  status: StatusType
  label?: string
}

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const statusConfig = {
    confirmed: { label: 'Confirmado', bg: 'bg-[#DCFCE7]', text: 'text-[#22C55E]', dot: 'bg-[#22C55E]' },
    pending: { label: 'Pendente', bg: 'bg-[#FEF3C7]', text: 'text-[#F59E0B]', dot: 'bg-[#F59E0B]' },
    cancelled: { label: 'Cancelado', bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]', dot: 'bg-[#EF4444]' },
    completed: { label: 'Concluído', bg: 'bg-[#DBEAFE]', text: 'text-[#3B82F6]', dot: 'bg-[#3B82F6]' },
    new: { label: 'Novo', bg: 'bg-[#DBEAFE]', text: 'text-[#3B82F6]', dot: 'bg-[#3B82F6]' },
    contacted: { label: 'Contactado', bg: 'bg-[#FEF3C7]', text: 'text-[#F59E0B]', dot: 'bg-[#F59E0B]' },
    scheduled: { label: 'Agendado', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    hot: { label: 'Quente', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    converted: { label: 'Convertido', bg: 'bg-[#DCFCE7]', text: 'text-[#22C55E]', dot: 'bg-[#22C55E]' },
    lost: { label: 'Perdido', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label || config.label}
    </span>
  )
}