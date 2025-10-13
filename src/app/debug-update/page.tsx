'use client'

import { useState, useEffect } from 'react'
import { supabase, type Mentorado } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function DebugUpdatePage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [selectedMentorado, setSelectedMentorado] = useState<Mentorado | null>(null)
  const [testName, setTestName] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchMentorados()
  }, [])

  const fetchMentorados = async () => {
    const { data } = await supabase
      .from('mentorados')
      .select('*')
      .limit(5)

    if (data) {
      setMentorados(data)
    }
  }

  const testUpdate = async () => {
    if (!selectedMentorado || !testName.trim()) {
      alert('Selecione um mentorado e digite um nome de teste')
      return
    }

    setLoading(true)
    setResult('')

    try {
      console.log('🔍 Testando atualização...')
      console.log('👤 Mentorado selecionado:', selectedMentorado.id)
      console.log('📝 Nome de teste:', testName)

      // Verificar sessão primeiro
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔐 Sessão:', session ? 'Ativa' : 'Inativa')

      // Fazer o update
      const { data, error } = await supabase
        .from('mentorados')
        .update({ nome_completo: testName })
        .eq('id', selectedMentorado.id)
        .select()

      if (error) {
        console.error('❌ Erro:', error)
        setResult(`ERRO: ${error.message}\nCódigo: ${error.code}\nHint: ${error.hint || 'N/A'}\nDetalhes: ${error.details || 'N/A'}`)
      } else {
        console.log('✅ Sucesso:', data)
        setResult(`SUCESSO!\nDados atualizados: ${JSON.stringify(data, null, 2)}`)

        // Atualizar a lista local
        fetchMentorados()
      }
    } catch (err) {
      console.error('💥 Erro geral:', err)
      setResult(`ERRO GERAL: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const resetName = async () => {
    if (!selectedMentorado) return

    setLoading(true)
    try {
      const originalName = selectedMentorado.nome_completo

      const { error } = await supabase
        .from('mentorados')
        .update({ nome_completo: originalName })
        .eq('id', selectedMentorado.id)

      if (error) {
        console.error('❌ Erro ao resetar:', error)
        setResult(`ERRO AO RESETAR: ${error.message}`)
      } else {
        console.log('✅ Nome resetado com sucesso')
        setResult('✅ Nome resetado para o valor original')
        fetchMentorados()
      }
    } catch (err) {
      setResult(`ERRO GERAL AO RESETAR: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug - Teste de Atualização de Mentorados</h1>

      <div className="space-y-6">
        {/* Lista de Mentorados */}
        <div>
          <Label className="text-lg font-semibold">Selecionar Mentorado para Teste:</Label>
          <div className="mt-2 space-y-2">
            {mentorados.map(mentorado => (
              <div key={mentorado.id} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={mentorado.id}
                  name="mentorado"
                  onChange={() => setSelectedMentorado(mentorado)}
                  className="w-4 h-4"
                />
                <label htmlFor={mentorado.id} className="flex-1 cursor-pointer">
                  <strong>{mentorado.nome_completo}</strong> - {mentorado.email}
                  <br />
                  <small className="text-gray-500">ID: {mentorado.id}</small>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Campo de teste */}
        {selectedMentorado && (
          <div>
            <Label htmlFor="testName">Nome de Teste:</Label>
            <Input
              id="testName"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Digite um nome para testar a atualização"
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              Nome atual: <strong>{selectedMentorado.nome_completo}</strong>
            </p>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex space-x-4">
          <Button
            onClick={testUpdate}
            disabled={loading || !selectedMentorado || !testName.trim()}
          >
            {loading ? 'Testando...' : 'Testar Atualização'}
          </Button>

          <Button
            variant="outline"
            onClick={resetName}
            disabled={loading || !selectedMentorado}
          >
            {loading ? 'Resetando...' : 'Resetar Nome Original'}
          </Button>

          <Button
            variant="secondary"
            onClick={fetchMentorados}
            disabled={loading}
          >
            Recarregar Lista
          </Button>
        </div>

        {/* Resultado */}
        {result && (
          <div className="mt-6 p-4 bg-gray-100 rounded border">
            <h3 className="font-bold text-lg mb-2">Resultado do Teste:</h3>
            <pre className="whitespace-pre-wrap text-sm font-mono">{result}</pre>
          </div>
        )}

        {/* Informações de debug */}
        <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200">
          <h3 className="font-bold text-blue-800">Informações de Debug:</h3>
          <ul className="mt-2 space-y-1 text-sm text-blue-700">
            <li>• URL Supabase: {process.env.NEXT_PUBLIC_SUPABASE_URL}</li>
            <li>• Chave Anon presente: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Sim' : 'Não'}</li>
            <li>• Mentorados carregados: {mentorados.length}</li>
            <li>• Mentorado selecionado: {selectedMentorado?.nome_completo || 'Nenhum'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}