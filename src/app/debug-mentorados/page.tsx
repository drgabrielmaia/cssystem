'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugMentoradosPage() {
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const testQueries = async () => {
      try {
        console.log('🔍 Testing mentorados table...')
        
        // Test 1: Basic select all
        console.log('Test 1: SELECT *')
        const { data: allData, error: allError } = await supabase
          .from('mentorados')
          .select('*')
          .limit(5)
        
        if (allError) {
          console.error('Error in SELECT *:', allError)
          setError(`SELECT * error: ${allError.message}`)
          return
        }
        
        console.log('✅ SELECT * successful:', allData)
        
        // Test 2: Check available columns
        if (allData && allData.length > 0) {
          console.log('Available columns:', Object.keys(allData[0]))
        }
        
        // Test 3: Try with nome
        console.log('Test 2: SELECT with nome')
        const { data: nomeData, error: nomeError } = await supabase
          .from('mentorados')
          .select('id, nome, email, turma')
          .limit(5)
        
        if (nomeError) {
          console.error('Error with nome:', nomeError)
          
          // Test 4: Try with nome_completo
          console.log('Test 3: SELECT with nome_completo')
          const { data: nomeCompletoData, error: nomeCompletoError } = await supabase
            .from('mentorados')
            .select('id, nome_completo, email, turma')
            .limit(5)
          
          if (nomeCompletoError) {
            console.error('Error with nome_completo:', nomeCompletoError)
            setError(`Both nome and nome_completo failed: ${nomeError.message} | ${nomeCompletoError.message}`)
            return
          } else {
            console.log('✅ nome_completo works:', nomeCompletoData)
            setData(nomeCompletoData)
          }
        } else {
          console.log('✅ nome works:', nomeData)
          setData(nomeData)
        }
        
      } catch (err) {
        console.error('Unexpected error:', err)
        setError(`Unexpected error: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    testQueries()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Mentorados</h1>
        <p>Testing database connection...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Mentorados</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Data Found:</h2>
        <p>Count: {data.length}</p>
      </div>
      
      {data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                {Object.keys(data[0]).map(key => (
                  <th key={key} className="px-4 py-2 border-b font-semibold text-left">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 5).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {Object.values(item).map((value, i) => (
                    <td key={i} className="px-4 py-2 border-b">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}