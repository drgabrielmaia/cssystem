// Script para configurar Emerson Barbosa como mentorado de teste
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupEmersonTest() {
  try {
    console.log('🧪 Configurando Emerson Barbosa como mentorado de teste...')

    // 1. Verificar se Emerson já existe na tabela mentorados
    const { data: existing, error: existError } = await supabase
      .from('mentorados')
      .select('*')
      .or('nome_completo.ilike.%emerson%, email.ilike.%emerson%')

    if (existError) {
      console.error('❌ Erro ao buscar Emerson:', existError)
      return
    }

    console.log(`📋 Registros encontrados: ${existing?.length || 0}`)

    let emersonMentorado = null

    if (existing && existing.length > 0) {
      console.log('✅ Emerson encontrado:')
      existing.forEach((m, index) => {
        console.log(`   ${index + 1}. Nome: ${m.nome_completo}`)
        console.log(`      Email: ${m.email}`)
        console.log(`      ID: ${m.id}`)
        console.log(`      Organização: ${m.organization_id}`)
      })
      emersonMentorado = existing[0]
    } else {
      // Buscar organização do temp2@admin.com
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

      console.log('🏢 Organização encontrada:', orgUser.organization_id)

      // Criar Emerson como mentorado
      const testEmerson = {
        nome: 'Emerson',
        nome_completo: 'Emerson Barbosa',
        email: 'emerson@teste.com',
        telefone: '(85) 98888-8888',
        estado_entrada: 'CE',
        estado_atual: 'Em progresso',
        data_entrada: '2026-01-08',
        password_hash: 'teste123',
        status_login: 'ativo',
        organization_id: orgUser.organization_id
      }

      const { data: newEmerson, error: createError } = await supabase
        .from('mentorados')
        .insert([testEmerson])
        .select()
        .single()

      if (createError) {
        console.error('❌ Erro ao criar Emerson:', createError)
        return
      }

      console.log('✅ Emerson criado como mentorado!')
      emersonMentorado = newEmerson
    }

    // 2. Verificar se Emerson tem mapa mental existente
    console.log('\n🗺️ Verificando mapa mental do Emerson...')
    const { data: mindMap, error: mapError } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('mentorado_id', emersonMentorado.id)

    if (mapError) {
      console.error('❌ Erro ao buscar mapa mental:', mapError)
    } else {
      console.log(`📊 Mapas mentais encontrados: ${mindMap?.length || 0}`)
      if (mindMap && mindMap.length > 0) {
        mindMap.forEach((map, index) => {
          console.log(`   ${index + 1}. Título: ${map.title}`)
          console.log(`      Nós: ${map.nodes?.length || 0}`)
          console.log(`      Última atualização: ${map.updated_at}`)
        })
      }
    }

    // 3. Mostrar credenciais de teste
    console.log('\n🎯 CREDENCIAIS DE TESTE:')
    console.log('┌─────────────────────────────────────┐')
    console.log('│  PORTAL DO MENTORADO - TESTE        │')
    console.log('├─────────────────────────────────────┤')
    console.log(`│  Email: ${emersonMentorado.email.padEnd(24)} │`)
    console.log(`│  Senha: teste123                   │`)
    console.log('│  URL: http://localhost:3000/mentorado │')
    console.log('└─────────────────────────────────────┘')

    console.log('\n📋 COMO TESTAR:')
    console.log('1. Acesse http://localhost:3000/mentorado')
    console.log('2. Faça login com as credenciais acima')
    console.log('3. Clique em "Meu Onboarding" no menu')
    console.log('4. Teste editar nós: CLIQUE em um nó para editar')
    console.log('5. Teste mover nós: ARRASTE um nó para mover')
    console.log('6. Teste adicionar: Clique no + verde')
    console.log('7. Verifique o console do navegador para logs')

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

setupEmersonTest()