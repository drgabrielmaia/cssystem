'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Calendar, DollarSign, Target, TrendingUp, Heart, Award, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { MentoradoInfoFormData } from '@/types/commission'

interface MentoradoInfoModalProps {
  isOpen: boolean
  onClose: () => void
  mentoradoId: string
  mentoradoNome: string
}

const TEMPO_MENTORIA_OPTIONS = [
  { value: 'este_mes', label: 'Este mês (primeira vez)' },
  { value: 'ultimos_3_meses', label: 'Últimos 3 meses' },
  { value: 'ultimos_6_meses', label: 'Últimos 6 meses' },  
  { value: 'ultimos_12_meses', label: 'Últimos 12 meses' },
  { value: 'mais_de_1_ano', label: 'Mais de 1 ano' }
]

const SATISFACAO_LABELS = [
  'Muito insatisfeito',
  'Insatisfeito', 
  'Neutro',
  'Satisfeito',
  'Muito satisfeito'
]

export default function MentoradoInfoModal({ 
  isOpen, 
  onClose, 
  mentoradoId,
  mentoradoNome 
}: MentoradoInfoModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<MentoradoInfoFormData>({
    tempo_mentoria: 'este_mes',
    faturamento_antes: 0,
    faturamento_atual: 0,
    maior_conquista: '',
    principal_dificuldade: '',
    expectativas_futuras: '',
    recomendaria_mentoria: true,
    nota_satisfacao: 5,
    sugestoes_melhoria: '',
    objetivos_proximos_meses: ''
  })

  const totalSteps = 4

  const handleInputChange = (field: keyof MentoradoInfoFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('mentorado_info')
        .upsert({
          mentorado_id: mentoradoId,
          ...formData,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Informações salvas com sucesso! Obrigado pelo feedback.')
      onClose()

    } catch (error: any) {
      console.error('Erro ao salvar informações:', error)
      toast.error('Erro ao salvar informações. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const progressPercentage = (currentStep / totalSteps) * 100

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            🎯 Queremos te conhecer melhor!
          </DialogTitle>
          <div className="text-center text-gray-600 mb-4">
            Olá, {mentoradoNome}! Suas respostas nos ajudam a melhorar ainda mais.
          </div>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Etapa {currentStep} de {totalSteps}</span>
              <span>{Math.round(progressPercentage)}% completo</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </DialogHeader>

        {/* Step 1: Timeline e Faturamento */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Sua Jornada na Mentoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="tempo_mentoria" className="text-base font-medium">
                  Há quanto tempo você está na mentoria? *
                </Label>
                <Select 
                  value={formData.tempo_mentoria} 
                  onValueChange={(value) => handleInputChange('tempo_mentoria', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPO_MENTORIA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="faturamento_antes" className="text-base font-medium">
                    Quanto você faturava ANTES da mentoria? (mensal) *
                  </Label>
                  <Input
                    id="faturamento_antes"
                    type="number"
                    placeholder="0"
                    value={formData.faturamento_antes}
                    onChange={(e) => handleInputChange('faturamento_antes', Number(e.target.value) || 0)}
                    className="mt-2"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {formatCurrency(formData.faturamento_antes)}
                  </div>
                </div>

                <div>
                  <Label htmlFor="faturamento_atual" className="text-base font-medium">
                    Quanto você fatura AGORA? (mensal) *
                  </Label>
                  <Input
                    id="faturamento_atual"
                    type="number"
                    placeholder="0"
                    value={formData.faturamento_atual}
                    onChange={(e) => handleInputChange('faturamento_atual', Number(e.target.value) || 0)}
                    className="mt-2"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {formatCurrency(formData.faturamento_atual)}
                  </div>
                </div>
              </div>

              {/* Growth Indicator */}
              {formData.faturamento_antes > 0 && formData.faturamento_atual > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Seu Crescimento</span>
                  </div>
                  
                  {formData.faturamento_atual > formData.faturamento_antes ? (
                    <div className="text-green-700">
                      📈 Crescimento de {formatCurrency(formData.faturamento_atual - formData.faturamento_antes)} ({((formData.faturamento_atual / formData.faturamento_antes - 1) * 100).toFixed(1)}%)
                    </div>
                  ) : formData.faturamento_atual === formData.faturamento_antes ? (
                    <div className="text-yellow-700">
                      🔄 Manteve o mesmo patamar
                    </div>
                  ) : (
                    <div className="text-red-700">
                      📉 Variação de {formatCurrency(formData.faturamento_atual - formData.faturamento_antes)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Conquistas e Dificuldades */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Sua Experiência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="maior_conquista" className="text-base font-medium">
                  Qual foi sua maior conquista durante a mentoria? 🏆
                </Label>
                <Textarea
                  id="maior_conquista"
                  placeholder="Ex: Consegui meu primeiro cliente, aumentei minha confiança, estruturei meu negócio..."
                  value={formData.maior_conquista}
                  onChange={(e) => handleInputChange('maior_conquista', e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="principal_dificuldade" className="text-base font-medium">
                  Qual sua principal dificuldade hoje? 🤔
                </Label>
                <Textarea
                  id="principal_dificuldade"
                  placeholder="Ex: Gerar leads, precificar serviços, organizar o tempo..."
                  value={formData.principal_dificuldade}
                  onChange={(e) => handleInputChange('principal_dificuldade', e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="expectativas_futuras" className="text-base font-medium">
                  Quais são suas expectativas para os próximos meses? 🚀
                </Label>
                <Textarea
                  id="expectativas_futuras"
                  placeholder="Ex: Atingir 50k/mês, contratar funcionários, expandir para novos mercados..."
                  value={formData.expectativas_futuras}
                  onChange={(e) => handleInputChange('expectativas_futuras', e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Satisfação */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Sua Avaliação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-4 block">
                  Você recomendaria nossa mentoria para outros empreendedores? *
                </Label>
                <div className="flex gap-4">
                  <Button
                    variant={formData.recomendaria_mentoria ? "default" : "outline"}
                    onClick={() => handleInputChange('recomendaria_mentoria', true)}
                    className="flex-1"
                  >
                    👍 Sim, recomendaria
                  </Button>
                  <Button
                    variant={!formData.recomendaria_mentoria ? "default" : "outline"}
                    onClick={() => handleInputChange('recomendaria_mentoria', false)}
                    className="flex-1"
                  >
                    👎 Não recomendaria
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium mb-4 block">
                  De 1 a 5, qual sua nota de satisfação geral? *
                </Label>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant={formData.nota_satisfacao === rating ? "default" : "outline"}
                        onClick={() => handleInputChange('nota_satisfacao', rating)}
                        className="w-16 h-16 text-lg"
                      >
                        {rating}⭐
                      </Button>
                    ))}
                  </div>
                  <div className="text-center text-gray-600">
                    {SATISFACAO_LABELS[formData.nota_satisfacao - 1]}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="sugestoes_melhoria" className="text-base font-medium">
                  Como podemos melhorar ainda mais? 💡
                </Label>
                <Textarea
                  id="sugestoes_melhoria"
                  placeholder="Suas sugestões são muito valiosas para nós..."
                  value={formData.sugestoes_melhoria}
                  onChange={(e) => handleInputChange('sugestoes_melhoria', e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Objetivos */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Seus Próximos Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="objetivos_proximos_meses" className="text-base font-medium">
                  Quais são seus principais objetivos para os próximos 3-6 meses? 🎯
                </Label>
                <Textarea
                  id="objetivos_proximos_meses"
                  placeholder="Ex: Atingir 30k/mês, sistematizar processos, contratar primeiro funcionário..."
                  value={formData.objetivos_proximos_meses}
                  onChange={(e) => handleInputChange('objetivos_proximos_meses', e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">
                      Obrigado por compartilhar! 💙
                    </h4>
                    <p className="text-blue-700 text-sm leading-relaxed">
                      Suas respostas nos ajudam a entender melhor sua jornada e a criar 
                      conteúdos e estratégias ainda mais direcionadas para seu sucesso. 
                      Continue firme na sua trajetória! 🚀
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Anterior
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>
              Próximo
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Salvando...' : '✅ Finalizar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}