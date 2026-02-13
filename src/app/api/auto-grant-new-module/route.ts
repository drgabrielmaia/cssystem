import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Endpoint para automaticamente dar acesso a um novo módulo para todos os mentorados
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { moduleId, organizationId } = await request.json()

    console.log('🚀 Auto-liberando novo módulo para todos os mentorados:', moduleId)

    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID é obrigatório' }, { status: 400 })
    }

    // Buscar todos os mentorados da organização
    const { data: mentorados, error: mentError } = await supabase
      .from('mentorados')
      .select('id, nome_completo, organization_id')
      .eq('organization_id', organizationId || '9c8c0033-15ea-4e33-a55f-28d81a19693b')

    if (mentError) {
      console.error('❌ Erro ao buscar mentorados:', mentError)
      return NextResponse.json({ error: mentError.message }, { status: 500 })
    }

    if (!mentorados || mentorados.length === 0) {
      console.log('⚠️ Nenhum mentorado encontrado para a organização')
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum mentorado encontrado para liberar o módulo' 
      })
    }

    console.log(`👥 Encontrados ${mentorados.length} mentorados para liberar o módulo`)

    // Verificar quais mentorados já têm acesso ao módulo
    const { data: existingAccess, error: accessError } = await supabase
      .from('video_access_control')
      .select('mentorado_id')
      .eq('module_id', moduleId)
      .eq('has_access', true)

    if (accessError) {
      console.error('❌ Erro ao verificar acessos existentes:', accessError)
      return NextResponse.json({ error: accessError.message }, { status: 500 })
    }

    const existingAccessSet = new Set(existingAccess?.map(a => a.mentorado_id) || [])

    // Filtrar mentorados que ainda não têm acesso
    const mentoradosParaLiberar = mentorados.filter(m => !existingAccessSet.has(m.id))

    if (mentoradosParaLiberar.length === 0) {
      console.log('✅ Todos os mentorados já têm acesso ao módulo')
      return NextResponse.json({ 
        success: true, 
        message: 'Todos os mentorados já têm acesso ao módulo' 
      })
    }

    console.log(`🎯 Liberando módulo para ${mentoradosParaLiberar.length} novos mentorados`)

    // Criar registros de acesso para os mentorados que não têm
    const accessRecords = mentoradosParaLiberar.map(mentorado => ({
      mentorado_id: mentorado.id,
      module_id: moduleId,
      has_access: true,
      granted_at: new Date().toISOString(),
      granted_by: 'auto_new_module',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Inserir acessos em batches
    const batchSize = 100
    let totalInseridos = 0

    for (let i = 0; i < accessRecords.length; i += batchSize) {
      const batch = accessRecords.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('video_access_control')
        .insert(batch)

      if (insertError) {
        console.error(`❌ Erro no batch ${Math.floor(i/batchSize) + 1}:`, insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      totalInseridos += batch.length
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} acessos criados`)
    }

    console.log(`🎉 SUCESSO! Módulo liberado para ${totalInseridos} mentorados`)

    return NextResponse.json({
      success: true,
      message: `Módulo liberado para ${totalInseridos} mentorados automaticamente`,
      stats: {
        mentoradosTotal: mentorados.length,
        mentoradosJaTinhamAcesso: existingAccess?.length || 0,
        mentoradosLiberados: totalInseridos
      }
    })

  } catch (error: any) {
    console.error('💥 Erro na liberação automática:', error)
    return NextResponse.json({ 
      error: `Erro interno: ${error.message}` 
    }, { status: 500 })
  }
}