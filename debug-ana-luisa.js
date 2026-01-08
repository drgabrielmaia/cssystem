// Script para debugar dados da Ana Luísa Brito
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAnaLuisa() {
  try {
    console.log('🔍 Investigando Ana Luísa Brito...')

    // 1. Verificar se Ana Luísa existe na tabela mentorados
    console.log('\n1. Verificando tabela mentorados:')
    const { data: mentorados, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('*')
      .ilike('nome_completo', '%ana%luisa%')

    if (mentoradosError) {
      console.error('❌ Erro ao buscar mentorados:', mentoradosError)
    } else {
      console.log(`📋 Encontrados ${mentorados?.length || 0} mentorados:`)
      mentorados?.forEach((m, index) => {
        console.log(`   ${index + 1}. ID: ${m.id}`)
        console.log(`      Nome: ${m.nome_completo}`)
        console.log(`      Email: ${m.email}`)
        console.log(`      Organization ID: ${m.organization_id || 'NULO'}`)
      })
    }

    // 2. Verificar se há dívidas para Ana Luísa
    console.log('\n2. Verificando tabela dividas:')
    const { data: dividas, error: dividasError } = await supabase
      .from('dividas')
      .select('*')
      .ilike('nome_cliente', '%ana%luisa%')

    if (dividasError) {
      console.error('❌ Erro ao buscar dívidas:', dividasError)
    } else {
      console.log(`💰 Encontradas ${dividas?.length || 0} dívidas:`)
      dividas?.forEach((d, index) => {
        console.log(`   ${index + 1}. ID: ${d.id}`)
        console.log(`      Cliente: ${d.nome_cliente}`)
        console.log(`      Valor: R$ ${d.valor}`)
        console.log(`      Organization ID: ${d.organization_id || 'NULO'}`)
        console.log(`      Status: ${d.status}`)
      })
    }

    // 3. Verificar organização do temp2@admin.com
    console.log('\n3. Verificando organização do temp2@admin.com:')
    const { data: orgUser, error: orgError } = await supabase
      .from('organization_users')
      .select(`
        *,
        organizations (*)
      `)
      .eq('email', 'temp2@admin.com')

    if (orgError) {
      console.error('❌ Erro ao buscar organização:', orgError)
    } else {
      console.log(`🏢 Organizações do temp2@admin.com:`)
      orgUser?.forEach((org, index) => {
        console.log(`   ${index + 1}. Org ID: ${org.organization_id}`)
        console.log(`      Nome: ${org.organizations?.name}`)
        console.log(`      Role: ${org.role}`)
      })
    }

    // 4. Verificar se existem dívidas sem organization_id
    console.log('\n4. Verificando dívidas sem organization_id:')
    const { data: dividasSemOrg, error: semOrgError } = await supabase
      .from('dividas')
      .select('*')
      .is('organization_id', null)
      .limit(10)

    if (semOrgError) {
      console.error('❌ Erro ao buscar dívidas sem org:', semOrgError)
    } else {
      console.log(`💸 Encontradas ${dividasSemOrg?.length || 0} dívidas sem organization_id`)
      dividasSemOrg?.forEach((d, index) => {
        console.log(`   ${index + 1}. Cliente: ${d.nome_cliente} - Valor: R$ ${d.valor}`)
      })
    }

    // 5. Verificar estrutura da tabela dividas
    console.log('\n5. Verificando se tabela dividas tem coluna organization_id:')
    const { data: tableInfo, error: tableError } = await supabase
      .from('dividas')
      .select('*')
      .limit(1)

    if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Colunas disponíveis na tabela dividas:')
      console.log(Object.keys(tableInfo[0]).join(', '))
    }

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

debugAnaLuisa()