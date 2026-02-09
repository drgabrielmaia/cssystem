import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Parse the request body to get options
    const body = await request.json().catch(() => ({}))
    const { force = false, dryRun = false } = body

    console.log('🚀 Iniciando processo de liberação de acesso universal aos módulos')
    console.log('🔧 Parâmetros:', { force, dryRun })

    // Get all active mentorados
    const { data: mentorados, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('id, nome_completo, organization_id, status_login')
      .eq('status_login', 'ativo')

    if (mentoradosError) {
      console.error('❌ Erro ao buscar mentorados:', mentoradosError)
      throw mentoradosError
    }

    if (!mentorados || mentorados.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum mentorado ativo encontrado'
      })
    }

    console.log(`👥 Encontrados ${mentorados.length} mentorados ativos`)

    // Get all active video modules
    const { data: modules, error: modulesError } = await supabase
      .from('video_modules')
      .select('id, title, organization_id')
      .eq('is_active', true)

    if (modulesError) {
      console.error('❌ Erro ao buscar módulos:', modulesError)
      throw modulesError
    }

    if (!modules || modules.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum módulo de vídeo ativo encontrado'
      })
    }

    console.log(`📚 Encontrados ${modules.length} módulos ativos`)

    // Get existing access controls
    const { data: existingAccess, error: accessError } = await supabase
      .from('video_access_control')
      .select('mentorado_id, module_id, has_access')

    if (accessError) {
      console.error('❌ Erro ao buscar controles de acesso:', accessError)
      throw accessError
    }

    console.log(`🔐 Encontrados ${existingAccess?.length || 0} registros de controle de acesso existentes`)

    // Create a map of existing access for quick lookup
    const existingAccessMap = new Map()
    existingAccess?.forEach(access => {
      const key = `${access.mentorado_id}-${access.module_id}`
      existingAccessMap.set(key, access)
    })

    // Prepare access records to create/update
    const accessRecordsToInsert: any[] = []
    const accessRecordsToUpdate: any[] = []
    let skippedRecords = 0

    for (const mentorado of mentorados) {
      // Filter modules for this mentorado's organization
      const mentoradoModules = modules.filter(module => 
        module.organization_id === mentorado.organization_id
      )

      for (const module of mentoradoModules) {
        const key = `${mentorado.id}-${module.id}`
        const existingAccess = existingAccessMap.get(key)

        if (existingAccess) {
          // If access exists but is revoked, update it to grant access
          if (!existingAccess.has_access || force) {
            accessRecordsToUpdate.push({
              mentorado_id: mentorado.id,
              module_id: module.id,
              has_access: true,
              granted_at: new Date().toISOString(),
              granted_by: 'admin_bulk_grant',
              updated_at: new Date().toISOString(),
              revoked_at: null,
              revoked_by: null
            })
          } else {
            skippedRecords++
          }
        } else {
          // Create new access record
          accessRecordsToInsert.push({
            mentorado_id: mentorado.id,
            module_id: module.id,
            has_access: true,
            granted_at: new Date().toISOString(),
            granted_by: 'admin_bulk_grant',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }
    }

    const totalToInsert = accessRecordsToInsert.length
    const totalToUpdate = accessRecordsToUpdate.length
    const totalProcessed = totalToInsert + totalToUpdate

    console.log(`📊 Estatísticas:`)
    console.log(`  - Novos registros a criar: ${totalToInsert}`)
    console.log(`  - Registros a atualizar: ${totalToUpdate}`)
    console.log(`  - Registros já com acesso (ignorados): ${skippedRecords}`)
    console.log(`  - Total a processar: ${totalProcessed}`)

    if (dryRun) {
      console.log('🧪 Modo de teste - nenhuma alteração será feita no banco de dados')
      return NextResponse.json({
        success: true,
        message: 'Simulação concluída com sucesso',
        dryRun: true,
        stats: {
          mentoradosProcessed: mentorados.length,
          modulesFound: modules.length,
          newAccessRecords: totalToInsert,
          accessRecordsToUpdate: totalToUpdate,
          skippedRecords: skippedRecords,
          totalProcessed: totalProcessed
        }
      })
    }

    // Execute the bulk operations
    let insertResult = null
    let updateResults: any[] = []
    let insertError = null
    let updateErrors: any[] = []

    // Insert new access records
    if (totalToInsert > 0) {
      console.log(`📝 Inserindo ${totalToInsert} novos registros de acesso...`)
      const { data: insertData, error: insertErr } = await supabase
        .from('video_access_control')
        .insert(accessRecordsToInsert)
        .select('id')

      if (insertErr) {
        console.error('❌ Erro ao inserir registros:', insertErr)
        insertError = insertErr
      } else {
        insertResult = insertData
        console.log(`✅ ${insertData?.length || 0} registros inseridos com sucesso`)
      }
    }

    // Update existing access records
    if (totalToUpdate > 0) {
      console.log(`🔄 Atualizando ${totalToUpdate} registros existentes...`)
      
      // Update records one by one for better error handling
      for (const record of accessRecordsToUpdate) {
        const { error: updateErr } = await supabase
          .from('video_access_control')
          .update({
            has_access: record.has_access,
            granted_at: record.granted_at,
            granted_by: record.granted_by,
            updated_at: record.updated_at,
            revoked_at: record.revoked_at,
            revoked_by: record.revoked_by
          })
          .eq('mentorado_id', record.mentorado_id)
          .eq('module_id', record.module_id)

        if (updateErr) {
          console.error(`❌ Erro ao atualizar registro ${record.mentorado_id}-${record.module_id}:`, updateErr)
          updateErrors.push({
            mentorado_id: record.mentorado_id,
            module_id: record.module_id,
            error: updateErr
          })
        } else {
          updateResults.push(record)
        }
      }
      
      console.log(`✅ ${updateResults.length} registros atualizados com sucesso`)
      if (updateErrors.length > 0) {
        console.warn(`⚠️ ${updateErrors.length} registros falharam na atualização`)
      }
    }

    const hasErrors = insertError || updateErrors.length > 0
    const finalStats = {
      mentoradosProcessed: mentorados.length,
      modulesFound: modules.length,
      newAccessRecordsCreated: insertResult?.length || 0,
      accessRecordsUpdated: updateResults.length,
      skippedRecords: skippedRecords,
      totalProcessed: (insertResult?.length || 0) + updateResults.length,
      errors: {
        insertError: insertError?.message || null,
        updateErrors: updateErrors.length
      }
    }

    console.log('🎉 Processo concluído!')
    console.log('📈 Estatísticas finais:', finalStats)

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors 
        ? `Processo concluído com alguns erros. ${finalStats.totalProcessed} registros processados com sucesso.`
        : `Acesso universal concedido com sucesso! ${finalStats.totalProcessed} registros processados.`,
      stats: finalStats
    })

  } catch (error: any) {
    console.error('💥 Erro fatal no processo:', error)
    return NextResponse.json({
      success: false,
      message: `Erro interno: ${error.message}`,
      error: error.message
    }, { status: 500 })
  }
}