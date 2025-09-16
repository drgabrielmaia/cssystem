'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Smile, Meh, Frown, Brain, Loader2 } from 'lucide-react'
import { gemmaFormsAnalyzer } from '@/lib/gemma-forms-analyzer'

interface SentimentBadgeProps {
  respostaId: string
  npsScore?: number
  feedbackText?: string
  compact?: boolean
}

interface QuickSentiment {
  sentiment: 'positivo' | 'neutro' | 'negativo'
  confidence: number
  riskLevel: 'baixo' | 'medio' | 'alto' | 'critico'
}

export function SentimentBadge({ respostaId, npsScore, feedbackText = '', compact = false }: SentimentBadgeProps) {
  const [analysis, setAnalysis] = useState<QuickSentiment | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  const analyzeQuick = async () => {
    if (analyzed || loading) return

    setLoading(true)
    try {
      // USAR GEMMA3:1B DIRETAMENTE - SEM A IA MERDA ANTIGA
      const result = await gemmaFormsAnalyzer.analyzeForm(
        { nota_nps: npsScore, feedback: feedbackText },
        'nps',
        null
      )
      
      setAnalysis({
        sentiment: result.emocao === 'critico' ? 'negativo' : result.emocao,
        confidence: Math.round((100 - result.probabilidade_churn) * 0.8 + 20), // Converter churn em confiança
        riskLevel: result.probabilidade_churn >= 70 ? 'critico' : 
                   result.probabilidade_churn >= 50 ? 'alto' :
                   result.probabilidade_churn >= 30 ? 'medio' : 'baixo'
      })
      
    } catch (error) {
      console.error('Erro no Gemma3:1b:', error)
      // Fallback simples baseado em NPS
      setAnalysis({
        sentiment: npsScore && npsScore <= 3 ? 'negativo' : npsScore && npsScore >= 8 ? 'positivo' : 'neutro',
        confidence: 60,
        riskLevel: npsScore && npsScore <= 3 ? 'critico' : npsScore && npsScore <= 6 ? 'alto' : 'baixo'
      })
    } finally {
      setAnalyzed(true)
      setLoading(false)
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positivo': return <Smile className="h-3 w-3" />
      case 'negativo': return <Frown className="h-3 w-3" />
      default: return <Meh className="h-3 w-3" />
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positivo': return 'bg-green-100 text-green-700 border-green-300'
      case 'negativo': return 'bg-red-100 text-red-700 border-red-300'
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'baixo': return 'bg-green-50 text-green-600'
      case 'alto': return 'bg-red-50 text-red-600'
      case 'critico': return 'bg-red-100 text-red-700'
      default: return 'bg-yellow-50 text-yellow-600'
    }
  }

  if (!analyzed && !loading) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={analyzeQuick}
        className="h-6 px-2 text-xs text-gray-500 hover:text-blue-600"
      >
        <Brain className="h-3 w-3 mr-1" />
        Gemma3 IA
      </Button>
    )
  }

  if (loading) {
    return (
      <Badge variant="outline" className="text-xs">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Gemma3...
      </Badge>
    )
  }

  if (!analysis) return null

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        <Badge className={`text-xs ${getSentimentColor(analysis.sentiment)}`}>
          {getSentimentIcon(analysis.sentiment)}
          <span className="ml-1 capitalize">{analysis.sentiment}</span>
        </Badge>
        {analysis.riskLevel !== 'baixo' && (
          <Badge variant="outline" className={`text-xs ${getRiskColor(analysis.riskLevel)}`}>
            Risco {analysis.riskLevel}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center space-x-2">
        <Badge className={`text-xs ${getSentimentColor(analysis.sentiment)}`}>
          {getSentimentIcon(analysis.sentiment)}
          <span className="ml-1 capitalize">{analysis.sentiment}</span>
        </Badge>
        <span className="text-xs text-gray-500">({analysis.confidence}% confiança)</span>
      </div>
      {analysis.riskLevel !== 'baixo' && (
        <Badge variant="outline" className={`text-xs w-fit ${getRiskColor(analysis.riskLevel)}`}>
          🚨 Risco {analysis.riskLevel}
        </Badge>
      )}
    </div>
  )
}