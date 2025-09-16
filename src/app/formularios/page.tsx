'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { FileText, Users, BarChart3, ArrowRight, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FormularioInfo {
  tipo: string
  total_respostas: number
  ultima_resposta: string | null
  primeira_resposta: string | null
  mentorados_unicos: number
}

export default function FormulariosPage() {
  const [formularios, setFormularios] = useState<FormularioInfo[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchFormularios()
  }, [])

  const fetchFormularios = async () => {
    try {
      console.log('🔍 Buscando formulários...')

      const { data, error } = await supabase
        .from('formularios_respostas')
        .select(`
          formulario,
          data_envio,
          mentorado_id
        `)
        .order('data_envio', { ascending: false })

      if (error) {
        console.error('Erro ao buscar formulários:', error)
        return
      }

      // Agrupar por tipo de formulário
      const grouped = data?.reduce((acc, item) => {
        const tipo = item.formulario

        if (!acc[tipo]) {
          acc[tipo] = {
            tipo,
            respostas: [],
            mentorados: new Set()
          }
        }

        acc[tipo].respostas.push(item.data_envio)
        acc[tipo].mentorados.add(item.mentorado_id)

        return acc
      }, {} as Record<string, any>) || {}

      // Transformar em array com estatísticas
      const formulariosInfo = Object.values(grouped).map((group: any) => ({
        tipo: group.tipo,
        total_respostas: group.respostas.length,
        mentorados_unicos: group.mentorados.size,
        primeira_resposta: group.respostas[group.respostas.length - 1],
        ultima_resposta: group.respostas[0]
      }))

      console.log('📊 Formulários encontrados:', formulariosInfo.length)
      setFormularios(formulariosInfo)

    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFormularioIcon = (tipo: string) => {
    if (tipo.includes('nps')) return '📊'
    if (tipo.includes('vendas')) return '💰'
    if (tipo.includes('marketing')) return '📢'
    return '📋'
  }

  const getFormularioNome = (tipo: string) => {
    const nomes: Record<string, string> = {
      'nps_geral': 'NPS Geral',
      'modulo_iv_vendas': 'Módulo IV - Vendas',
      'modulo_iii_gestao_marketing': 'Módulo III - Gestão e Marketing',
      'formularios_respostas': 'Formulários Gerais'
    }
    return nomes[tipo] || tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getFormularioDescricao = (tipo: string) => {
    const descricoes: Record<string, string> = {
      'nps_geral': 'Pesquisa de satisfação e Net Promoter Score',
      'modulo_iv_vendas': 'Avaliação do módulo de vendas e estratégias comerciais',
      'modulo_iii_gestao_marketing': 'Feedback sobre gestão e marketing digital',
      'formularios_respostas': 'Formulários diversos e feedback geral'
    }
    return descricoes[tipo] || 'Respostas de formulário personalizado'
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header
          title="📋 Formulários"
          subtitle="Gerenciar formulários e análises"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando formulários...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="📋 Formulários"
        subtitle={`${formularios.length} tipos de formulários disponíveis`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Estatísticas gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tipos de Formulários</p>
                  <p className="text-2xl font-bold">{formularios.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Respostas</p>
                  <p className="text-2xl font-bold">
                    {formularios.reduce((sum, f) => sum + f.total_respostas, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Mentorados Participantes</p>
                  <p className="text-2xl font-bold">
                    {formularios.reduce((sum, f) => sum + f.mentorados_unicos, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Última Resposta</p>
                  <p className="text-sm font-bold">
                    {formularios.length > 0
                      ? new Date(Math.max(...formularios.map(f =>
                          new Date(f.ultima_resposta || 0).getTime()
                        ))).toLocaleDateString('pt-BR')
                      : 'Nenhuma'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de formulários */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formularios.map((formulario) => (
            <Card key={formulario.tipo} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getFormularioIcon(formulario.tipo)}</span>
                    <span className="text-lg">{getFormularioNome(formulario.tipo)}</span>
                  </div>
                  <Badge variant="secondary">
                    {formulario.total_respostas} respostas
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  {getFormularioDescricao(formulario.tipo)}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Mentorados únicos:</span>
                    <span className="font-medium">{formulario.mentorados_unicos}</span>
                  </div>

                  {formulario.ultima_resposta && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Última resposta:</span>
                      <span className="font-medium">
                        {new Date(formulario.ultima_resposta).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => router.push(`/formularios/${encodeURIComponent(formulario.tipo)}`)}
                  className="w-full"
                  variant="default"
                >
                  Ver Respostas e Análises
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {formularios.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum formulário encontrado
              </h3>
              <p className="text-gray-500">
                Não há formulários respondidos no sistema ainda.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}