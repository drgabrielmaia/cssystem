'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase, type Mentorado } from '@/lib/supabase'
import { Brain, User, Target, Plus, Share2 } from 'lucide-react'
import { ModernMindMap } from '@/components/modern-mind-map'

export default function OnboardingPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [selectedMentorado, setSelectedMentorado] = useState<Mentorado | null>(null)
  const [loading, setLoading] = useState(true)

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
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Onboarding" subtitle="Mapa mental de metas dos mentorados" />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="Onboarding"
        subtitle="Mapa mental de metas e acompanhamento de evolução pessoal"
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6">
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
                  <Button className="bg-blue-600 hover:bg-blue-700">
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

        {/* Instruções */}
        {selectedMentorado ? (
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
      </main>
    </div>
  )
}