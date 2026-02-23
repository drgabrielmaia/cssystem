'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Phone,
  Mail,
  MessageCircle,
  UserPlus,
  ExternalLink,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  PieChart,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface LeadDistributionData {
  origem: string
  total_leads: number
  percentage: number
  leads_this_month: number
  leads_last_month: number
  growth_rate: number
  conversion_rate: number
  avg_time_to_contact: number
}

interface LeadsByPeriod {
  date: string
  instagram: number
  whatsapp: number
  indicacao: number
  direct: number
  trafego: number
  outros: number
}

interface ChannelPerformance {
  channel: string
  leads_count: number
  conversions: number
  revenue: number
  cost_per_lead: number
  roi: number
}

export default function LeadDistributionDashboard() {
  const [distributionData, setDistributionData] = useState<LeadDistributionData[]>([])
  const [periodData, setPeriodData] = useState<LeadsByPeriod[]>([])
  const [performanceData, setPerformanceData] = useState<ChannelPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [totalLeads, setTotalLeads] = useState(0)

  useEffect(() => {
    loadDashboardData()
  }, [selectedPeriod])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadDistributionData(),
        loadPeriodData(),
        loadPerformanceData()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDistributionData = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('origem, created_at, status')
        .not('origem', 'is', null)

      if (error) throw error

      // Process data for distribution
      const channelCounts = data.reduce((acc, lead) => {
        const channel = lead.origem || 'outros'
        acc[channel] = (acc[channel] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const total = Object.values(channelCounts).reduce((sum, count) => sum + count, 0)
      setTotalLeads(total)

      // Calculate growth rates (mock data for now)
      const formattedData: LeadDistributionData[] = Object.entries(channelCounts).map(([origem, count]) => {
        const percentage = (count / total) * 100
        const mockGrowthRate = Math.random() * 40 - 20 // -20% to +20%
        
        return {
          origem,
          total_leads: count,
          percentage: Math.round(percentage * 100) / 100,
          leads_this_month: Math.floor(count * 0.7), // Mock this month
          leads_last_month: Math.floor(count * 0.6), // Mock last month
          growth_rate: Math.round(mockGrowthRate * 100) / 100,
          conversion_rate: Math.random() * 15 + 5, // 5-20%
          avg_time_to_contact: Math.floor(Math.random() * 120) + 30 // 30-150 minutes
        }
      }).sort((a, b) => b.total_leads - a.total_leads)

      setDistributionData(formattedData)
    } catch (error) {
      console.error('Error loading distribution data:', error)
    }
  }

  const loadPeriodData = async () => {
    try {
      // Mock data for period chart - this would be a more complex query in production
      const mockPeriodData: LeadsByPeriod[] = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (29 - i))
        
        return {
          date: date.toISOString().split('T')[0],
          instagram: Math.floor(Math.random() * 25) + 5,
          whatsapp: Math.floor(Math.random() * 10) + 2,
          indicacao: Math.floor(Math.random() * 8) + 1,
          direct: Math.floor(Math.random() * 5) + 1,
          trafego: Math.floor(Math.random() * 6) + 1,
          outros: Math.floor(Math.random() * 3) + 1
        }
      })

      setPeriodData(mockPeriodData)
    } catch (error) {
      console.error('Error loading period data:', error)
    }
  }

  const loadPerformanceData = async () => {
    try {
      // Mock performance data
      const mockPerformance: ChannelPerformance[] = [
        {
          channel: 'Instagram',
          leads_count: 633,
          conversions: 127,
          revenue: 254000,
          cost_per_lead: 15.50,
          roi: 4.2
        },
        {
          channel: 'WhatsApp',
          leads_count: 87,
          conversions: 23,
          revenue: 46000,
          cost_per_lead: 8.30,
          roi: 6.4
        },
        {
          channel: 'Indicação',
          leads_count: 33,
          conversions: 12,
          revenue: 24000,
          cost_per_lead: 0,
          roi: 999
        },
        {
          channel: 'Direto',
          leads_count: 17,
          conversions: 5,
          revenue: 10000,
          cost_per_lead: 0,
          roi: 999
        },
        {
          channel: 'Tráfego Pago',
          leads_count: 13,
          conversions: 2,
          revenue: 4000,
          cost_per_lead: 45.00,
          roi: 0.7
        }
      ]

      setPerformanceData(mockPerformance)
    } catch (error) {
      console.error('Error loading performance data:', error)
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'instagram':
        return <MessageCircle className="h-5 w-5" />
      case 'whatsapp':
        return <Phone className="h-5 w-5" />
      case 'indicacao':
        return <UserPlus className="h-5 w-5" />
      case 'direct':
      case 'direto':
        return <ExternalLink className="h-5 w-5" />
      case 'trafego':
      case 'tráfego pago':
        return <Target className="h-5 w-5" />
      case 'email':
        return <Mail className="h-5 w-5" />
      default:
        return <Activity className="h-5 w-5" />
    }
  }

  const getChannelColor = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'instagram':
        return 'bg-gradient-to-r from-purple-500 to-pink-500'
      case 'whatsapp':
        return 'bg-gradient-to-r from-green-500 to-green-600'
      case 'indicacao':
        return 'bg-gradient-to-r from-blue-500 to-blue-600'
      case 'direct':
      case 'direto':
        return 'bg-gradient-to-r from-gray-500 to-gray-600'
      case 'trafego':
      case 'tráfego pago':
        return 'bg-gradient-to-r from-orange-500 to-red-500'
      case 'email':
        return 'bg-gradient-to-r from-indigo-500 to-purple-500'
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500'
    }
  }

  const formatChannelName = (channel: string) => {
    const nameMap: Record<string, string> = {
      'instagram': 'Instagram',
      'whatsapp': 'WhatsApp',
      'indicacao': 'Indicação',
      'direct': 'Acesso Direto',
      'trafego': 'Tráfego Pago',
      'social-seller': 'Social Seller',
      'outros': 'Outros',
      'formulario_seguro': 'Form. Seguro',
      'formulario_qualificacao_v2': 'Form. Qualificação'
    }
    return nameMap[channel] || channel.charAt(0).toUpperCase() + channel.slice(1)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-gray-600">Carregando dados...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Distribuição de Leads</h1>
              <p className="mt-2 text-gray-600">
                Análise completa dos canais de aquisição de leads
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="1y">Último ano</option>
              </select>
              
              <button
                onClick={loadDashboardData}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Atualizar</span>
              </button>
              
              <button className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <Download className="h-4 w-4" />
                <span>Exportar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Leads</p>
                <p className="text-2xl font-bold text-gray-900">{totalLeads.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">+12.5%</span>
                  <span className="text-sm text-gray-500 ml-2">vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Canais Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{distributionData.length}</p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">+2</span>
                  <span className="text-sm text-gray-500 ml-2">novos canais</span>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa Conversão Média</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(distributionData.reduce((acc, item) => acc + item.conversion_rate, 0) / distributionData.length || 0).toFixed(1)}%
                </p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">+3.2%</span>
                  <span className="text-sm text-gray-500 ml-2">vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tempo Médio Resposta</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(distributionData.reduce((acc, item) => acc + item.avg_time_to_contact, 0) / distributionData.length || 0)}min
                </p>
                <div className="flex items-center mt-2">
                  <ArrowDownRight className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">-15min</span>
                  <span className="text-sm text-gray-500 ml-2">melhoria</span>
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-full">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Channel Distribution Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Distribuição por Canal</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <PieChart className="h-4 w-4" />
                  <span>Últimos {selectedPeriod === '7d' ? '7 dias' : selectedPeriod === '30d' ? '30 dias' : selectedPeriod === '90d' ? '90 dias' : 'ano'}</span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Distribution Bars */}
              <div className="space-y-4">
                {distributionData.map((item, index) => (
                  <div key={item.origem} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getChannelColor(item.origem)} text-white`}>
                          {getChannelIcon(item.origem)}
                        </div>
                        <span className="font-medium text-gray-900">
                          {formatChannelName(item.origem)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900">
                          {item.total_leads.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({item.percentage}%)
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full ${getChannelColor(item.origem)} transition-all duration-500 ease-out`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    
                    {/* Growth Indicator */}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500">
                          Este mês: {item.leads_this_month}
                        </span>
                        <span className="text-gray-500">
                          Mês anterior: {item.leads_last_month}
                        </span>
                      </div>
                      <div className={`flex items-center ${item.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.growth_rate >= 0 ? 
                          <ArrowUpRight className="h-3 w-3" /> : 
                          <ArrowDownRight className="h-3 w-3" />
                        }
                        <span className="font-medium">
                          {Math.abs(item.growth_rate)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Channel Performance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Performance por Canal</h3>
              <p className="text-sm text-gray-600 mt-1">Métricas de conversão e ROI</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {performanceData.map((channel) => (
                  <div key={channel.channel} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getChannelIcon(channel.channel)}
                        <span className="font-medium text-gray-900">
                          {channel.channel}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {channel.leads_count} leads
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Conversões:</span>
                        <div className="font-semibold text-gray-900">
                          {channel.conversions} ({((channel.conversions / channel.leads_count) * 100).toFixed(1)}%)
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Receita:</span>
                        <div className="font-semibold text-gray-900">
                          R$ {(channel.revenue / 1000).toFixed(0)}k
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Custo/Lead:</span>
                        <div className="font-semibold text-gray-900">
                          {channel.cost_per_lead === 0 ? 'Grátis' : `R$ ${channel.cost_per_lead.toFixed(2)}`}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">ROI:</span>
                        <div className={`font-semibold ${channel.roi > 2 ? 'text-green-600' : channel.roi > 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {channel.roi === 999 ? '∞' : `${channel.roi.toFixed(1)}x`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Period Analysis Chart */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Evolução Temporal</h3>
            <p className="text-sm text-gray-600 mt-1">Leads por canal ao longo do tempo</p>
          </div>
          
          <div className="p-6">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Gráfico de evolução temporal</p>
                <p className="text-sm text-gray-400">Implementação do gráfico em desenvolvimento</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}