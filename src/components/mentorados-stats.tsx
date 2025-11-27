'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type Mentorado } from '@/lib/supabase'
import { Users, TrendingUp, Clock, Star } from 'lucide-react'

interface MentoradosStatsProps {
  mentorados: Mentorado[]
}

export function MentoradosStats({ mentorados }: MentoradosStatsProps) {
  const calculateAge = (birthDate: string): number => {
    const today = new Date()
    const birth = new Date(birthDate + 'T00:00:00')
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const getAgeRangeStats = () => {
    const mentoradosWithAge = mentorados.filter(m => m.data_nascimento)
    if (mentoradosWithAge.length === 0) return null

    const ages = mentoradosWithAge.map(m => calculateAge(m.data_nascimento!))
    const avgAge = Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)

    return {
      avgAge,
      total: mentoradosWithAge.length
    }
  }


  const getRecentStats = () => {
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const recent = mentorados.filter(m =>
      new Date(m.data_entrada) > fourteenDaysAgo
    ).length

    return { recent }
  }

  const ageStats = getAgeRangeStats()
  const recentStats = getRecentStats()

  if (mentorados.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Estatísticas Gerais */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">
            Total de Mentorados
          </CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-800">{mentorados.length}</div>
          <p className="text-xs text-blue-600 mt-1">
            mentorados cadastrados
          </p>
        </CardContent>
      </Card>

      {/* Idade Média */}
      {ageStats && (
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Idade Média
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{ageStats.avgAge} anos</div>
            <p className="text-xs text-green-600 mt-1">
              baseado em {ageStats.total} mentorados
            </p>
          </CardContent>
        </Card>
      )}

      {/* Novos Mentorados */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-700">
            Últimos 14 Dias
          </CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-800">{recentStats.recent}</div>
          <p className="text-xs text-orange-600 mt-1">
            novos mentorados cadastrados
          </p>
        </CardContent>
      </Card>
    </div>
  )
}