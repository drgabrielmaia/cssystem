import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Read the reset SQL file
    const sqlPath = path.join(process.cwd(), '../../../RESET-FINANCEIRO-COMPLETO.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Execute the reset
    const { data, error } = await supabase.rpc('reset_financeiro_completo', {
      sql_content: sqlContent
    })

    if (error) {
      console.error('Error resetting financeiro:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '✅ Sistema financeiro resetado e reorganizado com sucesso!',
      data
    })

  } catch (error) {
    console.error('Error in reset-financeiro API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}