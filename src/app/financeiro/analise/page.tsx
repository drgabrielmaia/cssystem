'use client'

import { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Activity
} from 'lucide-react'

interface CategoryData {
  name: string
  value: number
  color: string
}

interface TrendData {
  month: string
  entradas: number
  saidas: number
  liquido: number
}

export default function FinanceiroAnalise() {
  const [timeRange, setTimeRange] = useState('12m')
  const [loading, setLoading] = useState(true)

  // Dados de exemplo para os gráficos
  const categoriesData: CategoryData[] = [
    { name: 'Marketing', value: 25000, color: '#3B82F6' },
    { name: 'Infraestrutura', value: 18000, color: '#10B981' },
    { name: 'Pessoal', value: 32000, color: '#F59E0B' },
    { name: 'Tecnologia', value: 15000, color: '#EF4444' },
    { name: 'Administrativo', value: 12000, color: '#8B5CF6' },
    { name: 'Outros', value: 8000, color: '#6B7280' }
  ]

  const trendData: TrendData[] = [
    { month: 'Jan', entradas: 85000, saidas: 45000, liquido: 40000 },
    { month: 'Fev', entradas: 92000, saidas: 48000, liquido: 44000 },
    { month: 'Mar', entradas: 88000, saidas: 52000, liquido: 36000 },
    { month: 'Abr', entradas: 96000, saidas: 49000, liquido: 47000 },
    { month: 'Mai', entradas: 102000, saidas: 55000, liquido: 47000 },
    { month: 'Jun', entradas: 98000, saidas: 51000, liquido: 47000 },
    { month: 'Jul', entradas: 105000, saidas: 58000, liquido: 47000 },
    { month: 'Ago', entradas: 112000, saidas: 62000, liquido: 50000 },
    { month: 'Set', entradas: 108000, saidas: 59000, liquido: 49000 },
    { month: 'Out', entradas: 115000, saidas: 64000, liquido: 51000 },
    { month: 'Nov', entradas: 120000, saidas: 67000, liquido: 53000 },
    { month: 'Dez', entradas: 125000, saidas: 70000, liquido: 55000 }
  ]

  const monthlyData = [
    { name: 'Jan', receitas: 85000, despesas: 45000 },
    { name: 'Fev', receitas: 92000, despesas: 48000 },
    { name: 'Mar', receitas: 88000, despesas: 52000 },
    { name: 'Abr', receitas: 96000, despesas: 49000 },
    { name: 'Mai', receitas: 102000, despesas: 55000 },
    { name: 'Jun', receitas: 98000, despesas: 51000 }
  ]

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200">
          <p className="font-medium text-slate-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-lg border-b border-white/20 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Análise Financeira</h1>
            <p className="text-slate-600">Insights detalhados e tendências dos seus dados financeiros</p>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-white rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="3m">Últimos 3 meses</option>
              <option value="6m">Últimos 6 meses</option>
              <option value="12m">Últimos 12 meses</option>
              <option value="custom">Período customizado</option>
            </select>

            <button className="px-4 py-2 bg-white rounded-2xl border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </button>

            <button className="p-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <span className="text-xs text-[#B8860B] bg-[#D4AF37]/10 px-2 py-1 rounded-full">+12.5%</span>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">Crescimento Mensal</h3>
            <p className="text-2xl font-bold text-slate-800">8.2%</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#DAA520]/10 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-[#DAA520]" />
              </div>
              <span className="text-xs text-[#B8860B] bg-[#D4AF37]/10 px-2 py-1 rounded-full">+5.2%</span>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">Margem Líquida</h3>
            <p className="text-2xl font-bold text-slate-800">42.1%</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#CD853F]/10 rounded-2xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-[#CD853F]" />
              </div>
              <span className="text-xs text-[#CD853F] bg-[#CD853F]/10 px-2 py-1 rounded-full">-2.1%</span>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">Burn Rate</h3>
            <p className="text-2xl font-bold text-slate-800">R$ 67k</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#B8860B]/10 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#B8860B]" />
              </div>
              <span className="text-xs text-[#B8860B] bg-[#D4AF37]/10 px-2 py-1 rounded-full">+3 meses</span>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">Runway</h3>
            <p className="text-2xl font-bold text-slate-800">18 meses</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gráfico de Pizza - Despesas por Categoria */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Despesas por Categoria</h3>
              <PieChartIcon className="w-5 h-5 text-slate-400" />
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoriesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              {categoriesData.map((category, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{category.name}</p>
                    <p className="text-xs text-slate-600">{formatCurrency(category.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico de Barras - Receitas vs Despesas */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Receitas vs Despesas</h3>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="receitas" name="Receitas" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="#CD853F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gráfico de Linha - Tendência Anual */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Tendência Anual</h3>
            <div className="flex space-x-2">
              {['entradas', 'saidas', 'liquido'].map((type) => (
                <button
                  key={type}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors capitalize"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="entradas"
                  stackId="1"
                  stroke="#D4AF37"
                  fill="#D4AF37"
                  fillOpacity={0.1}
                  name="Entradas"
                />
                <Area
                  type="monotone"
                  dataKey="saidas"
                  stackId="2"
                  stroke="#CD853F"
                  fill="#CD853F"
                  fillOpacity={0.1}
                  name="Saídas"
                />
                <Line
                  type="monotone"
                  dataKey="liquido"
                  stroke="#DAA520"
                  strokeWidth={3}
                  name="Resultado Líquido"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cards de Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-[#D4AF37]/5 to-[#FFD700]/5 rounded-3xl p-6 border border-[#D4AF37]/20">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center mr-3">
                <ArrowUpRight className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h4 className="font-semibold text-slate-800">Oportunidade</h4>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Marketing está 15% acima do orçado. Considere realocar verba para áreas com melhor ROI.
            </p>
            <button className="text-sm font-medium text-[#D4AF37] hover:text-[#B8860B] transition-colors">
              Ver detalhes →
            </button>
          </div>

          <div className="bg-gradient-to-r from-[#DAA520]/5 to-[#B8860B]/5 rounded-3xl p-6 border border-[#DAA520]/20">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#DAA520]/10 rounded-2xl flex items-center justify-center mr-3">
                <TrendingUp className="w-5 h-5 text-[#DAA520]" />
              </div>
              <h4 className="font-semibold text-slate-800">Crescimento</h4>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Receitas cresceram 12.5% no último trimestre. Tendência positiva consolidada.
            </p>
            <button className="text-sm font-medium text-[#DAA520] hover:text-[#B8860B] transition-colors">
              Ver projeção →
            </button>
          </div>

          <div className="bg-gradient-to-r from-[#CD853F]/5 to-[#D2691E]/5 rounded-3xl p-6 border border-[#CD853F]/20">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#CD853F]/10 rounded-2xl flex items-center justify-center mr-3">
                <ArrowDownRight className="w-5 h-5 text-[#CD853F]" />
              </div>
              <h4 className="font-semibold text-slate-800">Atenção</h4>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Contas a pagar vencendo em 7 dias: R$ 12.400. Verificar fluxo de caixa.
            </p>
            <button className="text-sm font-medium text-[#CD853F] hover:text-[#A0522D] transition-colors">
              Ver pendências →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}