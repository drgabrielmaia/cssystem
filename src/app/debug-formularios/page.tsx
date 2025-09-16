'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugFormulariosPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      console.log('🔍 Iniciando busca de dados...')

      const { data: formularios, error } = await supabase
        .from('formularios_respostas')
        .select('*')
        .limit(10)

      if (error) {
        console.error('❌ Erro ao buscar:', error)
        return
      }

      console.log('✅ Dados encontrados:', formularios?.length || 0)
      console.log('📋 Primeiros dados:', formularios?.[0])

      setData(formularios || [])

    } catch (error) {
      console.error('💥 Erro geral:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Debug Formulários</h1>

      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="border p-4 rounded">
            <h3 className="font-bold">Item {index + 1}</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded mt-2">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      {data.length === 0 && (
        <p>Nenhum dado encontrado na tabela formularios_respostas</p>
      )}
    </div>
  )
}