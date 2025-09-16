'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function TestSupabasePage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    try {
      console.log('🔍 Testando conexão Supabase...')

      const { data, error } = await supabase
        .from('mentorados')
        .select('id, nome_completo')
        .limit(1)

      if (error) {
        console.error('❌ Erro:', error)
        setResult(`Erro: ${JSON.stringify(error, null, 2)}`)
      } else {
        console.log('✅ Sucesso:', data)
        setResult(`Sucesso: ${JSON.stringify(data, null, 2)}`)
      }
    } catch (error) {
      console.error('💥 Erro geral:', error)
      setResult(`Erro geral: ${JSON.stringify(error, null, 2)}`)
    } finally {
      setLoading(false)
    }
  }

  const testInsert = async () => {
    setLoading(true)
    try {
      console.log('🔍 Testando inserção...')

      const { error } = await supabase
        .from('formularios_respostas')
        .insert({
          mentorado_id: 'fa5e7db0-fcb9-4a24-bb3b-f684f124a009',
          formulario: 'test',
          resposta_json: { teste: 'valor' }
        })

      if (error) {
        console.error('❌ Erro inserção:', error)
        setResult(`Erro inserção: ${JSON.stringify(error, null, 2)}`)
      } else {
        console.log('✅ Inserção bem-sucedida')
        setResult('✅ Inserção bem-sucedida')
      }
    } catch (error) {
      console.error('💥 Erro geral inserção:', error)
      setResult(`Erro geral inserção: ${JSON.stringify(error, null, 2)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste Supabase</h1>

      <div className="space-y-4">
        <Button onClick={testConnection} disabled={loading}>
          {loading ? 'Testando...' : 'Testar Conexão (SELECT)'}
        </Button>

        <Button onClick={testInsert} disabled={loading}>
          {loading ? 'Testando...' : 'Testar Inserção (INSERT)'}
        </Button>
      </div>

      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Resultado:</h3>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}
    </div>
  )
}