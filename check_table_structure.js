const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, anonKey)

async function checkTableStructure() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 VERIFICANDO ESTRUTURA DAS TABELAS')
  console.log('='.repeat(80))

  try {
    // 1. Testar query direta em formularios_respostas
    console.log('\n1️⃣ Testando query em formularios_respostas...')
    const { data: respostas1, error: error1 } = await supabase
      .from('formularios_respostas')
      .select('id, formulario, data_envio')
      .limit(2)

    if (error1) {
      console.log('❌ Erro:', error1.message)
    } else {
      console.log('✅ Query básica funciona. Registros:', respostas1?.length || 0)
    }

    // 2. Testar query com join usando diferentes sintaxes
    console.log('\n2️⃣ Testando joins com mentorados...')

    // Teste A: Join simples
    console.log('\n   A) Join simples (mentorados):')
    const { data: testA, error: errorA } = await supabase
      .from('formularios_respostas')
      .select('*, mentorados(*)')
      .limit(1)

    if (errorA) {
      console.log('   ❌ Erro:', errorA.message)
    } else if (testA && testA[0]) {
      console.log('   ✅ Funciona!')
      if (testA[0].mentorados) {
        const campos = Object.keys(testA[0].mentorados)
        console.log('   Campos disponíveis:', campos.join(', '))

        // Verificar se turma existe
        if (campos.includes('turma')) {
          console.log('   ✅ Campo "turma" EXISTE!')
        } else {
          console.log('   ❌ Campo "turma" NÃO existe')
          console.log('   Campos similares:', campos.filter(c =>
            c.toLowerCase().includes('grup') ||
            c.toLowerCase().includes('class') ||
            c.toLowerCase().includes('batch') ||
            c.toLowerCase().includes('cohort')
          ))
        }
      }
    }

    // Teste B: Join com campos específicos (sem turma)
    console.log('\n   B) Join com campos específicos (sem turma):')
    const { data: testB, error: errorB } = await supabase
      .from('formularios_respostas')
      .select('*, mentorados!inner(id, nome_completo, email)')
      .limit(1)

    if (errorB) {
      console.log('   ❌ Erro:', errorB.message)
    } else {
      console.log('   ✅ Funciona sem o campo turma!')
    }

    // Teste C: Tentar com turma
    console.log('\n   C) Join incluindo turma:')
    const { data: testC, error: errorC } = await supabase
      .from('formularios_respostas')
      .select('*, mentorados!inner(nome_completo, email, turma)')
      .limit(1)

    if (errorC) {
      console.log('   ❌ Erro com turma:', errorC.message)
      console.log('   ➡️ Isso confirma que o campo "turma" não existe na tabela mentorados')
    } else {
      console.log('   ✅ Funciona com turma!')
    }

    // 3. Verificar estrutura via RPC ou função
    console.log('\n3️⃣ Tentando descobrir estrutura real da tabela mentorados...')

    // Buscar um mentorado diretamente
    const { data: mentorado, error: mentoradoError } = await supabase
      .from('mentorados')
      .select('*')
      .limit(1)
      .single()

    if (!mentoradoError && mentorado) {
      console.log('✅ Estrutura da tabela mentorados:')
      const campos = Object.keys(mentorado)
      campos.forEach(campo => {
        const valor = mentorado[campo]
        const tipo = valor === null ? 'null' : Array.isArray(valor) ? 'array' : typeof valor
        console.log(`   - ${campo}: ${tipo}`)
      })

      // Identificar campo que pode substituir turma
      console.log('\n4️⃣ ANÁLISE - Possíveis substitutos para "turma":')

      const possiveisCampos = campos.filter(c => {
        const valorExemplo = mentorado[c]
        return (
          typeof valorExemplo === 'string' &&
          valorExemplo.length > 0 &&
          valorExemplo.length < 50 && // Não muito longo
          !c.includes('id') &&
          !c.includes('email') &&
          !c.includes('phone') &&
          !c.includes('created') &&
          !c.includes('updated')
        )
      })

      if (possiveisCampos.length > 0) {
        console.log('   Campos candidatos:')
        possiveisCampos.forEach(campo => {
          console.log(`   - ${campo}: "${mentorado[campo]}"`)
        })
      }

      // Verificar se organization_id pode ser usado
      if (campos.includes('organization_id')) {
        console.log('\n   ℹ️ Campo organization_id existe - pode ser usado para agrupar')
      }

    } else if (mentoradoError) {
      console.log('❌ Erro ao acessar mentorados diretamente:', mentoradoError.message)

      if (mentoradoError.message.includes('infinite recursion')) {
        console.log('\n⚠️  PROBLEMA DETECTADO: Recursão infinita nas políticas RLS')
        console.log('   Isso indica um problema de configuração no Supabase')
        console.log('   Solução: Revisar as políticas de segurança da tabela')
      }
    }

    // 5. Solução alternativa
    console.log('\n5️⃣ SOLUÇÕES PROPOSTAS:')
    console.log('-'.repeat(60))
    console.log('1. ADICIONAR CAMPO TURMA (recomendado):')
    console.log('   ALTER TABLE mentorados ADD COLUMN turma TEXT;')
    console.log('   UPDATE mentorados SET turma = \'Turma 1\' WHERE turma IS NULL;')
    console.log('\n2. USAR CAMPO EXISTENTE:')
    console.log('   Modificar queries para usar um campo que já existe')
    console.log('\n3. CRIAR TABELA TURMAS:')
    console.log('   CREATE TABLE turmas (id uuid, nome text, ...);')
    console.log('   ALTER TABLE mentorados ADD COLUMN turma_id uuid REFERENCES turmas(id);')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 VERIFICAÇÃO CONCLUÍDA')
  console.log('='.repeat(80))
}

// Executar verificação
checkTableStructure().catch(console.error)
