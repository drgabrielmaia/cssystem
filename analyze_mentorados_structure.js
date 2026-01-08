const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, anonKey)

async function analyzeMentoradosTable() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 ANÁLISE DETALHADA DA TABELA MENTORADOS')
  console.log('='.repeat(80))
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`)
  console.log('='.repeat(80))

  try {
    // 1. Buscar alguns registros para analisar estrutura
    console.log('\n1️⃣ Buscando registros de mentorados...')
    const { data: mentorados, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('*')
      .limit(5)

    if (mentoradosError) {
      console.error('❌ Erro ao acessar tabela mentorados:', mentoradosError)
      return
    }

    if (!mentorados || mentorados.length === 0) {
      console.log('⚠️  Tabela mentorados está vazia ou inacessível')

      // Tentar criar um registro de teste para descobrir a estrutura
      console.log('\n2️⃣ Tentando inserir registro de teste para descobrir estrutura...')
      const testData = {
        nome_completo: 'Teste Estrutura',
        email: 'teste@estrutura.com',
        organization_id: 'test-org-id'
      }

      const { error: insertError } = await supabase
        .from('mentorados')
        .insert(testData)

      if (insertError) {
        console.log('ℹ️ Erro esperado (mostra campos obrigatórios):', insertError.message)
      }

      return
    }

    // 2. Analisar estrutura das colunas
    console.log('\n2️⃣ ESTRUTURA DA TABELA MENTORADOS:')
    console.log('-'.repeat(60))

    const columns = Object.keys(mentorados[0])
    console.log('📋 Colunas encontradas:')
    columns.forEach(col => {
      const sampleValue = mentorados[0][col]
      const type = sampleValue === null ? 'null' : typeof sampleValue
      console.log(`   - ${col}: ${type} (exemplo: ${JSON.stringify(sampleValue)?.substring(0, 50)})`)
    })

    // 3. Verificar especificamente por coluna turma ou similar
    console.log('\n3️⃣ ANÁLISE DE COLUNAS RELACIONADAS A TURMA/GRUPO:')
    console.log('-'.repeat(60))

    const turmaRelatedColumns = columns.filter(col =>
      col.toLowerCase().includes('turma') ||
      col.toLowerCase().includes('grupo') ||
      col.toLowerCase().includes('class') ||
      col.toLowerCase().includes('batch') ||
      col.toLowerCase().includes('cohort') ||
      col.toLowerCase().includes('team')
    )

    if (turmaRelatedColumns.length > 0) {
      console.log('✅ Colunas relacionadas a turma encontradas:')
      turmaRelatedColumns.forEach(col => {
        const uniqueValues = [...new Set(mentorados.map(m => m[col]))].filter(Boolean)
        console.log(`   - ${col}: ${uniqueValues.join(', ') || 'sem valores'}`)
      })
    } else {
      console.log('❌ Nenhuma coluna "turma" ou similar encontrada')
      console.log('   Possíveis alternativas:')

      // Verificar se turma está em outra tabela
      console.log('\n   Verificando se turma está em tabela separada...')
    }

    // 4. Verificar valores únicos em cada coluna relevante
    console.log('\n4️⃣ VALORES ÚNICOS EM CAMPOS IMPORTANTES:')
    console.log('-'.repeat(60))

    const importantColumns = ['organization_id', 'status', 'tipo', 'categoria', 'nivel', 'stage']

    for (const col of importantColumns) {
      if (columns.includes(col)) {
        const uniqueValues = [...new Set(mentorados.map(m => m[col]))].filter(Boolean)
        if (uniqueValues.length > 0) {
          console.log(`   ${col}: ${uniqueValues.join(', ')}`)
        }
      }
    }

    // 5. Mostrar exemplo completo de um registro
    console.log('\n5️⃣ EXEMPLO DE REGISTRO COMPLETO:')
    console.log('-'.repeat(60))
    console.log(JSON.stringify(mentorados[0], null, 2))

    // 6. Verificar relacionamentos com outras tabelas
    console.log('\n6️⃣ VERIFICANDO TABELAS RELACIONADAS:')
    console.log('-'.repeat(60))

    // Verificar se existe tabela turmas
    const { data: turmas, error: turmasError } = await supabase
      .from('turmas')
      .select('*')
      .limit(5)

    if (!turmasError && turmas) {
      console.log('✅ Tabela "turmas" encontrada!')
      console.log('   Estrutura:', Object.keys(turmas[0] || {}))

      // Verificar relação
      const { data: mentoradosComTurma } = await supabase
        .from('mentorados')
        .select('*, turmas(*)')
        .limit(1)

      if (mentoradosComTurma && mentoradosComTurma[0]?.turmas) {
        console.log('   ✅ Relacionamento com turmas confirmado!')
      }
    } else {
      console.log('❌ Tabela "turmas" não encontrada ou inacessível')
    }

    // Verificar tabela grupos
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos')
      .select('*')
      .limit(5)

    if (!gruposError && grupos) {
      console.log('✅ Tabela "grupos" encontrada!')
      console.log('   Estrutura:', Object.keys(grupos[0] || {}))
    }

    // 7. Sugestões de consulta
    console.log('\n7️⃣ SUGESTÕES DE CONSULTA:')
    console.log('-'.repeat(60))

    if (columns.includes('turma')) {
      console.log('✅ A coluna "turma" existe. Use:')
      console.log(`   mentorados!inner(nome_completo, email, turma)`)
    } else if (turmaRelatedColumns.length > 0) {
      console.log(`✅ Use a coluna "${turmaRelatedColumns[0]}":`)
      console.log(`   mentorados!inner(nome_completo, email, ${turmaRelatedColumns[0]})`)
    } else {
      console.log('⚠️  Sem coluna de turma direta. Possíveis soluções:')
      console.log('   1. Adicionar coluna turma na tabela mentorados')
      console.log('   2. Criar relacionamento com tabela turmas')
      console.log('   3. Usar outro campo para agrupar (ex: organization_id, created_at)')
    }

    // 8. Teste de query com join
    console.log('\n8️⃣ TESTANDO QUERIES COM JOINS:')
    console.log('-'.repeat(60))

    // Teste 1: Query simples
    const { data: test1, error: error1 } = await supabase
      .from('formularios_respostas')
      .select('*, mentorados!inner(*)')
      .limit(1)

    if (!error1) {
      console.log('✅ Query com join completo funciona')
      if (test1 && test1[0]) {
        console.log('   Campos do mentorado disponíveis:', Object.keys(test1[0].mentorados || {}))
      }
    } else {
      console.log('❌ Erro no join completo:', error1.message)
    }

    // Teste 2: Query com campos específicos
    const fieldsToTest = columns.filter(c =>
      c.includes('nome') || c.includes('email') || c.includes('turma')
    ).join(', ')

    const { data: test2, error: error2 } = await supabase
      .from('formularios_respostas')
      .select(`*, mentorados!inner(${fieldsToTest})`)
      .limit(1)

    if (!error2) {
      console.log(`✅ Query com campos específicos funciona: ${fieldsToTest}`)
    } else {
      console.log('❌ Erro com campos específicos:', error2.message)
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 ANÁLISE CONCLUÍDA')
  console.log('='.repeat(80))
}

// Executar análise
analyzeMentoradosTable().catch(console.error)