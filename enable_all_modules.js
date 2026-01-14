const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://udzmlnnztzzwrphhizol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'
)

async function enableAllModules() {
  console.log('🔍 Buscando todos os mentorados...')

  // Buscar todos os mentorados ativos
  const { data: mentorados, error: mentoradosError } = await supabase
    .from('mentorados')
    .select('id, nome_completo')
    .eq('status_login', 'ativo')

  if (mentoradosError) {
    console.error('❌ Erro ao buscar mentorados:', mentoradosError)
    return
  }

  console.log(`✅ ${mentorados.length} mentorados encontrados`)

  // Buscar todos os módulos ativos
  const { data: modules, error: modulesError } = await supabase
    .from('video_modules')
    .select('id, title')
    .eq('is_active', true)

  if (modulesError) {
    console.error('❌ Erro ao buscar módulos:', modulesError)
    return
  }

  console.log(`✅ ${modules.length} módulos encontrados`)

  // Buscar acessos existentes
  const { data: existingAccess, error: accessError } = await supabase
    .from('video_access_control')
    .select('mentorado_id, module_id')

  if (accessError) {
    console.error('❌ Erro ao buscar acessos existentes:', accessError)
    return
  }

  console.log(`✅ ${existingAccess.length} acessos existentes encontrados`)

  // Criar mapa de acessos existentes para verificação rápida
  const existingAccessMap = new Set()
  existingAccess.forEach(access => {
    existingAccessMap.add(`${access.mentorado_id}_${access.module_id}`)
  })

  // Preparar inserções
  const accessesToCreate = []

  for (const mentorado of mentorados) {
    for (const module of modules) {
      const accessKey = `${mentorado.id}_${module.id}`

      if (!existingAccessMap.has(accessKey)) {
        accessesToCreate.push({
          mentorado_id: mentorado.id,
          module_id: module.id,
          has_access: true,
          granted_at: new Date().toISOString()
        })
      }
    }
  }

  console.log(`📝 ${accessesToCreate.length} novos acessos serão criados`)

  if (accessesToCreate.length > 0) {
    // Inserir em lotes para evitar timeout
    const batchSize = 100
    let processed = 0

    for (let i = 0; i < accessesToCreate.length; i += batchSize) {
      const batch = accessesToCreate.slice(i, i + batchSize)

      console.log(`🔄 Processando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(accessesToCreate.length/batchSize)} (${batch.length} registros)`)

      const { error: insertError } = await supabase
        .from('video_access_control')
        .insert(batch)

      if (insertError) {
        console.error(`❌ Erro ao inserir lote ${Math.floor(i/batchSize) + 1}:`, insertError)
      } else {
        processed += batch.length
        console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} inserido com sucesso`)
      }
    }

    console.log(`🎉 Processamento concluído! ${processed} acessos criados`)
  } else {
    console.log('✅ Todos os mentorados já têm acesso a todos os módulos!')
  }
}

enableAllModules().catch(console.error)