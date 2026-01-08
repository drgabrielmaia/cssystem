const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testPendenciasData() {
  try {
    // Fazer login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'temp2@admin.com',
      password: '123@Admin'
    })

    if (loginError) {
      console.error('❌ Erro no login:', loginError.message)
      return
    }

    console.log('✅ Login realizado')
    const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b'

    // 1. TESTAR DÍVIDAS
    console.log('\n💰 TESTANDO DÍVIDAS...')

    // Primeiro, verificar se tabela dividas tem organization_id
    const { data: dividasAll, error: dividasAllError } = await supabase
      .from('dividas')
      .select('*')
      .limit(3)

    console.log('📊 Amostra de dívidas (primeiras 3):')
    console.log('Error:', dividasAllError?.message || 'Nenhum')
    console.log('Data:', dividasAll)

    // Testar com filtro de organização
    const { data: dividasOrg, error: dividasOrgError } = await supabase
      .from('dividas')
      .select('*')
      .eq('organization_id', orgId)
      .limit(3)

    console.log('\n📊 Dívidas da organização:')
    console.log('Error:', dividasOrgError?.message || 'Nenhum')
    console.log('Data:', dividasOrg)

    // 2. TESTAR COMISSÕES
    console.log('\n💼 TESTANDO COMISSÕES...')

    const { data: comissoesAll, error: comissoesAllError } = await supabase
      .from('comissoes')
      .select('*')
      .limit(3)

    console.log('📊 Amostra de comissões (primeiras 3):')
    console.log('Error:', comissoesAllError?.message || 'Nenhum')
    console.log('Data:', comissoesAll)

    // Testar pendentes
    const { data: comissoesPendentes, error: comissoesPendError } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente')
      .limit(3)

    console.log('\n📊 Comissões pendentes:')
    console.log('Error:', comissoesPendError?.message || 'Nenhum')
    console.log('Data:', comissoesPendentes)

    // 3. TESTAR MENTORADOS
    console.log('\n👥 TESTANDO MENTORADOS...')

    const { data: mentoradosOrg, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('*')
      .eq('organization_id', orgId)
      .limit(3)

    console.log('📊 Mentorados da organização (primeiros 3):')
    console.log('Error:', mentoradosError?.message || 'Nenhum')
    console.log('Count:', mentoradosOrg?.length || 0)

    await supabase.auth.signOut()

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

testPendenciasData()