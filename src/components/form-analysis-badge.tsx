/**
 * 🤖 Badge de Análise de Formulários com Gemma3:1b
 * Exibe análise completa com emoção, riscos, persona e oportunidades
 */

'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  User, 
  Target,
  Sparkles,
  X,
  RefreshCw,
  CheckCircle
} from 'lucide-react'

interface FormAnalysisResult {
  emocao: 'positivo' | 'neutro' | 'negativo' | 'critico'
  indicacoes: string[]
  riscos: string[]
  persona: string
  oportunidades: string[]
  situacao_geral: string
  nivel_satisfacao: number
  probabilidade_churn: number
  acoes_imediatas: string[]
}

interface FormAnalysisBadgeProps {
  respostaId: string
  compact?: boolean
  autoLoad?: boolean
}

export function FormAnalysisBadge({ respostaId, compact = false, autoLoad = true }: FormAnalysisBadgeProps) {
  const [analysis, setAnalysis] = useState<FormAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (autoLoad) {
      loadAnalysis()
    }
  }, [respostaId, autoLoad])

  const loadAnalysis = async () => {
    if (!respostaId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/routes/analyze-form?respostaId=${respostaId}`)
      const result = await response.json()

      if (result.success) {
        setAnalysis(result.data)
      } else {
        setError(result.error || 'Erro na análise')
      }
    } catch (err) {
      setError('Erro de conexão')
      console.error('Erro ao carregar análise:', err)
    } finally {
      setLoading(false)
    }
  }

  const getEmocaoColor = (emocao: string) => {
    switch (emocao) {
      case 'positivo': return 'bg-green-100 text-green-700 border-green-300'
      case 'negativo': return 'bg-red-100 text-red-700 border-red-300'
      case 'critico': return 'bg-red-200 text-red-800 border-red-400'
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    }
  }

  const getChurnColor = (churn: number) => {
    if (churn >= 70) return 'text-red-600'
    if (churn >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-300">
        <Sparkles className="h-3 w-3 mr-1 animate-spin" />
        Analisando...
      </Badge>
    )
  }

  if (error) {
    return (
      <Badge className="bg-gray-100 text-gray-700 border-gray-300 cursor-pointer" onClick={loadAnalysis}>
        <RefreshCw className="h-3 w-3 mr-1" />
        {compact ? 'Erro' : 'Tentar novamente'}
      </Badge>
    )
  }

  if (!analysis) {
    return (
      <Button variant="ghost" size="sm" onClick={loadAnalysis} className="h-6 px-2 text-xs">
        <Brain className="h-3 w-3 mr-1" />
        Analisar IA
      </Button>
    )
  }

  if (compact) {
    return (
      <Badge 
        className={`${getEmocaoColor(analysis.emocao)} cursor-pointer`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <Brain className="h-3 w-3 mr-1" />
        {analysis.emocao} • {analysis.nivel_satisfacao}%
        {showDetails && <DetailsModal analysis={analysis} onClose={() => setShowDetails(false)} />}
      </Badge>
    )
  }

  return (
    <div className="space-y-2">
      <Badge 
        className={`${getEmocaoColor(analysis.emocao)} cursor-pointer`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <Brain className="h-3 w-3 mr-1" />
        {analysis.emocao} • Satisfação {analysis.nivel_satisfacao}%
      </Badge>

      {showDetails && (
        <DetailsModal 
          analysis={analysis} 
          onClose={() => setShowDetails(false)} 
        />
      )}
    </div>
  )
}

function DetailsModal({ analysis, onClose }: { analysis: FormAnalysisResult, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span>Análise Gemma3:1b</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Geral */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{analysis.nivel_satisfacao}%</div>
              <div className="text-xs text-gray-600">Satisfação</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className={`text-2xl font-bold ${analysis.probabilidade_churn >= 50 ? 'text-red-600' : 'text-green-600'}`}>
                {analysis.probabilidade_churn}%
              </div>
              <div className="text-xs text-gray-600">Risco Churn</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Badge className={getEmocaoColor(analysis.emocao)}>
                {analysis.emocao}
              </Badge>
            </div>
          </div>

          {/* Persona */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">Persona</h3>
            </div>
            <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">{analysis.persona}</p>
          </div>

          {/* Situação Geral */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Situação Geral</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{analysis.situacao_geral}</p>
          </div>

          {/* Ações Imediatas */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold">Ações Imediatas</h3>
            </div>
            <ul className="space-y-1">
              {analysis.acoes_imediatas.map((acao, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-700">{acao}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Indicações */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">Indicações</h3>
            </div>
            <ul className="space-y-1">
              {analysis.indicacoes.map((indicacao, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="text-gray-700">{indicacao}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Riscos */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h3 className="font-semibold">Riscos Identificados</h3>
            </div>
            <ul className="space-y-1">
              {analysis.riscos.map((risco, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-gray-700">{risco}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Oportunidades */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold">Oportunidades</h3>
            </div>
            <ul className="space-y-1">
              {analysis.oportunidades.map((oportunidade, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span className="text-gray-700">{oportunidade}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              ⚡ Análise gerada por Gemma3:1b • Customer Success AI
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getEmocaoColor(emocao: string) {
  switch (emocao) {
    case 'positivo': return 'bg-green-100 text-green-700 border-green-300'
    case 'negativo': return 'bg-red-100 text-red-700 border-red-300'
    case 'critico': return 'bg-red-200 text-red-800 border-red-400'
    default: return 'bg-yellow-100 text-yellow-700 border-yellow-300'
  }
}