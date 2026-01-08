// Script para associar Ana Luísa à organização correta
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAnaLuisaOrganization() {
  try {
    console.log('🔧 Corrigindo organização da Ana Luísa...')

    // 1. Buscar a organização do temp2@admin.com
    const { data: orgUser, error: orgError } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('email', 'temp2@admin.com')
      .eq('role', 'owner')
      .single()

    if (orgError || !orgUser) {
      console.error('❌ Erro ao buscar organização:', orgError)
      return
    }

    const organizationId = orgUser.organization_id
    console.log(`✅ Organização encontrada: ${organizationId}`)

    // 2. Atualizar Ana Luísa para ter esta organização
    const { data: updateResult, error: updateError } = await supabase
      .from('mentorados')
      .update({
        organization_id: organizationId
      })
      .eq('nome_completo', 'Ana Luisa Brito')
      .select()

    if (updateError) {
      console.error('❌ Erro ao atualizar:', updateError)
      return
    }

    console.log('✅ Ana Luísa atualizada com sucesso!')
    console.log(`📊 Registros atualizados: ${updateResult?.length || 0}`)

    // 3. Verificar se há dívidas para ela
    console.log('\n🔍 Verificando dívidas da Ana Luísa...')
    const { data: dividas, error: dividasError } = await supabase
      .from('dividas')
      .select('*')
      .or('mentorado_nome.ilike.%ana%luisa%, mentorado_nome.ilike.%ana%luísa%')

    if (dividasError) {
      console.error('❌ Erro ao buscar dívidas:', dividasError)
    } else {
      console.log(`💰 Dívidas encontradas: ${dividas?.length || 0}`)
      dividas?.forEach((d, index) => {
        console.log(`   ${index + 1}. Cliente: ${d.mentorado_nome}`)
        console.log(`      Valor: R$ ${d.valor}`)
        console.log(`      Status: ${d.status}`)
        console.log(`      Vencimento: ${d.data_vencimento}`)
      })
    }

    // 4. Verificar todos os mentorados sem organização
    console.log('\n🔍 Verificando outros mentorados sem organização...')
    const { data: semOrg, error: semOrgError } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email')
      .is('organization_id', null)

    if (semOrgError) {
      console.error('❌ Erro ao buscar mentorados sem org:', semOrgError)
    } else {
      console.log(`👥 Mentorados sem organização: ${semOrg?.length || 0}`)
      semOrg?.forEach((m, index) => {
        console.log(`   ${index + 1}. ${m.nome_completo} (${m.email})`)
      })

      if (semOrg && semOrg.length > 0) {
        console.log('\n❓ Deseja associar todos à mesma organização? (y/N)')
        console.log(`   Organização: ${organizationId}`)
      }
    }

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

fixAnaLuisaOrganization()