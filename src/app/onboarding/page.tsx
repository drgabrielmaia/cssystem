'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase, type Mentorado } from '@/lib/supabase'
import { Brain, User, Target, Plus, Share2, Settings, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ModernMindMap } from '@/components/modern-mind-map'

export default function OnboardingPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [selectedMentorado, setSelectedMentorado] = useState<Mentorado | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGoalsConfig, setShowGoalsConfig] = useState(false)
  const [goals, setGoals] = useState({
    financeira: '',
    pessoal: '',
    profissional: '',
    saude: '',
    relacionamentos: '',
    aprendizado: ''
  })
  const [savingGoals, setSavingGoals] = useState(false)

  useEffect(() => {
    fetchMentorados()
  }, [])

  const fetchMentorados = async () => {
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo', { ascending: true })

      if (error) throw error
      setMentorados(data || [])
    } catch (error) {
      console.error('Erro ao buscar mentorados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMentoradoSelect = (mentoradoId: string) => {
    const mentorado = mentorados.find(m => m.id === mentoradoId)
    setSelectedMentorado(mentorado || null)
    setShowGoalsConfig(false)
    loadExistingGoals(mentoradoId)
  }

  const loadExistingGoals = async (mentoradoId: string) => {
    try {
      const { data, error } = await supabase
        .from('mentorado_metas')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .single()

      if (data && !error) {
        setGoals({
          financeira: data.meta_financeira || '',
          pessoal: data.meta_pessoal || '',
          profissional: data.meta_profissional || '',
          saude: data.meta_saude || '',
          relacionamentos: data.meta_relacionamentos || '',
          aprendizado: data.meta_aprendizado || ''
        })
      }
    } catch (error) {
      console.log('Nenhuma meta existente encontrada')
    }
  }

  const saveGoals = async () => {
    if (!selectedMentorado) return

    setSavingGoals(true)
    try {
      const { error } = await supabase
        .from('mentorado_metas')
        .upsert({
          mentorado_id: selectedMentorado.id,
          meta_financeira: goals.financeira,
          meta_pessoal: goals.pessoal,
          meta_profissional: goals.profissional,
          meta_saude: goals.saude,
          meta_relacionamentos: goals.relacionamentos,
          meta_aprendizado: goals.aprendizado,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      alert('Metas salvas com sucesso!')
      setShowGoalsConfig(false)
    } catch (error) {
      console.error('Erro ao salvar metas:', error)
      alert('Erro ao salvar metas')
    } finally {
      setSavingGoals(false)
    }
  }

  if (loading) {
    return (
      <PageLayout
        title="Onboarding"
        subtitle="Mapa mental de metas dos mentorados"
      >
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Onboarding"
      subtitle="Mapa mental de metas e acompanhamento de evolução pessoal"
    >
      <div className="space-y-6">
        {/* Seletor de Mentorado */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <User className="h-5 w-5" />
              Selecionar Mentorado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-blue-700 mb-2 block">
                  Escolha o mentorado para visualizar/criar o mapa mental:
                </label>
                <Select onValueChange={handleMentoradoSelect}>
                  <SelectTrigger className="bg-white border-blue-200">
                    <SelectValue placeholder="Selecione um mentorado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mentorados.map((mentorado) => (
                      <SelectItem key={mentorado.id} value={mentorado.id}>
                        <div className="flex items-center gap-2">
                          <span>{mentorado.nome_completo}</span>
                          <span className="text-xs text-gray-500">({mentorado.turma})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedMentorado && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowGoalsConfig(!showGoalsConfig)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar Metas
                  </Button>
                  <Button
                    onClick={() => window.open(`/mindmap/${selectedMentorado.id}`, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Visualizar Mapa Mental
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/mindmap/${selectedMentorado.id}`
                      navigator.clipboard.writeText(shareUrl)
                      alert('Link de compartilhamento copiado!')
                    }}
                    className="border-blue-200"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações do Mentorado Selecionado */}
        {selectedMentorado && (
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Target className="h-5 w-5" />
                {selectedMentorado.nome_completo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-700">Turma:</span>
                  <p className="text-green-600">{selectedMentorado.turma}</p>
                </div>
                <div>
                  <span className="font-medium text-green-700">Status:</span>
                  <p className="text-green-600">{selectedMentorado.estado_atual}</p>
                </div>
                <div>
                  <span className="font-medium text-green-700">Data de Entrada:</span>
                  <p className="text-green-600">
                    {new Date(selectedMentorado.data_entrada).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuração de Metas */}
        {selectedMentorado && showGoalsConfig && (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Target className="h-5 w-5" />
                Configurar Metas para {selectedMentorado.nome_completo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="financeira" className="text-purple-700 font-medium">Meta Financeira</Label>
                  <Textarea
                    id="financeira"
                    placeholder="Ex: Aumentar renda em 50% até dezembro..."
                    value={goals.financeira}
                    onChange={(e) => setGoals(prev => ({ ...prev, financeira: e.target.value }))}
                    className="mt-1 border-purple-200"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="pessoal" className="text-purple-700 font-medium">Meta Pessoal</Label>
                  <Textarea
                    id="pessoal"
                    placeholder="Ex: Praticar exercícios 3x por semana..."
                    value={goals.pessoal}
                    onChange={(e) => setGoals(prev => ({ ...prev, pessoal: e.target.value }))}
                    className="mt-1 border-purple-200"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="profissional" className="text-purple-700 font-medium">Meta Profissional</Label>
                  <Textarea
                    id="profissional"
                    placeholder="Ex: Conseguir promoção ou mudar de carreira..."
                    value={goals.profissional}
                    onChange={(e) => setGoals(prev => ({ ...prev, profissional: e.target.value }))}
                    className="mt-1 border-purple-200"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="saude" className="text-purple-700 font-medium">Meta de Saúde</Label>
                  <Textarea
                    id="saude"
                    placeholder="Ex: Perder 10kg, parar de fumar..."
                    value={goals.saude}
                    onChange={(e) => setGoals(prev => ({ ...prev, saude: e.target.value }))}
                    className="mt-1 border-purple-200"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="relacionamentos" className="text-purple-700 font-medium">Meta de Relacionamentos</Label>
                  <Textarea
                    id="relacionamentos"
                    placeholder="Ex: Melhorar comunicação familiar..."
                    value={goals.relacionamentos}
                    onChange={(e) => setGoals(prev => ({ ...prev, relacionamentos: e.target.value }))}
                    className="mt-1 border-purple-200"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="aprendizado" className="text-purple-700 font-medium">Meta de Aprendizado</Label>
                  <Textarea
                    id="aprendizado"
                    placeholder="Ex: Aprender inglês, fazer curso de..."
                    value={goals.aprendizado}
                    onChange={(e) => setGoals(prev => ({ ...prev, aprendizado: e.target.value }))}
                    className="mt-1 border-purple-200"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowGoalsConfig(false)}
                  className="border-purple-200"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveGoals}
                  disabled={savingGoals}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingGoals ? 'Salvando...' : 'Salvar Metas'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        {selectedMentorado && !showGoalsConfig ? (
          <Card className="bg-gradient-to-r from-green-50 to-yellow-50 border-green-200">
            <CardContent className="p-6 text-center">
              <Brain className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                Mapa Mental Configurado!
              </h3>
              <p className="text-green-700 mb-4">
                O mapa mental para <strong>{selectedMentorado.nome_completo}</strong> está pronto.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => window.open(`/mindmap/${selectedMentorado.id}`, '_blank')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Abrir Mapa Mental
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/mindmap/${selectedMentorado.id}`
                    navigator.clipboard.writeText(shareUrl)
                    alert('Link copiado! Você pode compartilhar este mapa mental.')
                  }}
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="min-h-[400px] flex items-center justify-center">
            <CardContent className="text-center py-12">
              <Brain className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                Selecione um mentorado
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Escolha um mentorado acima para configurar seu mapa mental
                de metas e acompanhar sua evolução pessoal.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => (document.querySelector('[data-select-trigger]') as HTMLElement)?.click()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Selecionar Mentorado
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  )
}