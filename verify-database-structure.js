import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyDatabaseStructure() {
  console.log('=' .repeat(80))
  console.log('VERIFICAÇÃO COMPLETA DA ESTRUTURA DO BANCO DE DADOS SUPABASE')
  console.log('=' .repeat(80))
  console.log()

  // Lista de tabelas esperadas no sistema
  const tablesToCheck = [
    // Tabelas de organização e usuários
    'organizations',
    'organization_users',
    'users',
    'mentorados',

    // Tabelas de formulários
    'formularios',
    'formularios_respostas',
    'form_submissions',
    'respostas_formulario',

    // Tabelas de NPS e módulos
    'nps_respostas',
    'modulo_iv_vendas_respostas',
    'modulo_iii_gestao_marketing_respostas',

    // Tabelas de vídeos
    'video_modules',
    'video_lessons',
    'lesson_progress',

    // Tabelas de metas
    'metas',
    'objetivos',

    // Outras tabelas
    'onboarding',
    'mindmap_nodes',
    'financial_categories',
    'financial_transactions',
    'notifications',
    'user_preferences'
  ]

  const tablesWithOrgId = []
  const tablesWithoutOrgId = []
  const tablesNotFound = []
  const tableStructures = {}

  console.log('🔍 VERIFICANDO CADA TABELA...')
  console.log('-' .repeat(80))

  for (const tableName of tablesToCheck) {
    console.log(`\n📋 Verificando tabela: ${tableName}`)

    try {
      // Tenta buscar um registro para obter a estrutura
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log(`   ❌ TABELA NÃO EXISTE`)
          tablesNotFound.push(tableName)
        } else {
          console.log(`   ⚠️ Erro ao acessar: ${error.message}`)
          // Ainda assim marca como existente mas sem detalhes
          tableStructures[tableName] = { error: error.message }
        }
      } else {
        console.log(`   ✅ Tabela existe`)

        // Se tem dados, analisa as colunas
        if (data && data.length > 0) {
          const columns = Object.keys(data[0])
          console.log(`   📊 Colunas encontradas: ${columns.join(', ')}`)

          tableStructures[tableName] = {
            exists: true,
            columns: columns,
            hasOrganizationId: columns.includes('organization_id')
          }

          if (columns.includes('organization_id')) {
            console.log(`   ✅ TEM organization_id`)
            tablesWithOrgId.push(tableName)
          } else {
            console.log(`   ❌ NÃO TEM organization_id`)
            tablesWithoutOrgId.push(tableName)
          }
        } else {
          // Tabela existe mas está vazia
          console.log(`   ⚠️ Tabela vazia - não foi possível determinar colunas`)
          tableStructures[tableName] = {
            exists: true,
            empty: true
          }
        }
      }
    } catch (err) {
      console.log(`   ❌ Erro inesperado: ${err.message}`)
      tableStructures[tableName] = { error: err.message }
    }
  }

  // Relatório Final
  console.log('\n' + '=' .repeat(80))
  console.log('RELATÓRIO FINAL')
  console.log('=' .repeat(80))

  console.log('\n✅ TABELAS COM organization_id:')
  if (tablesWithOrgId.length > 0) {
    tablesWithOrgId.forEach(t => console.log(`   - ${t}`))
  } else {
    console.log('   Nenhuma tabela encontrada com organization_id')
  }

  console.log('\n❌ TABELAS SEM organization_id:')
  if (tablesWithoutOrgId.length > 0) {
    tablesWithoutOrgId.forEach(t => console.log(`   - ${t}`))
  } else {
    console.log('   Nenhuma tabela sem organization_id')
  }

  console.log('\n⚠️ TABELAS NÃO ENCONTRADAS:')
  if (tablesNotFound.length > 0) {
    tablesNotFound.forEach(t => console.log(`   - ${t}`))
  } else {
    console.log('   Todas as tabelas esperadas foram encontradas')
  }

  // Detalhes das estruturas
  console.log('\n' + '=' .repeat(80))
  console.log('ESTRUTURAS DETALHADAS DAS TABELAS EXISTENTES')
  console.log('=' .repeat(80))

  for (const [tableName, structure] of Object.entries(tableStructures)) {
    if (structure.columns) {
      console.log(`\n📊 ${tableName}:`)
      console.log(`   Colunas: [${structure.columns.join(', ')}]`)
      console.log(`   organization_id: ${structure.hasOrganizationId ? '✅ SIM' : '❌ NÃO'}`)
    }
  }

  // Gerar SQL para adicionar organization_id onde está faltando
  console.log('\n' + '=' .repeat(80))
  console.log('SQL PARA CORRIGIR TABELAS SEM organization_id')
  console.log('=' .repeat(80))

  if (tablesWithoutOrgId.length > 0) {
    console.log('\n-- Adicionar coluna organization_id onde está faltando:')
    tablesWithoutOrgId.forEach(tableName => {
      console.log(`
-- Adicionar organization_id na tabela ${tableName}
ALTER TABLE ${tableName}
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_${tableName}_organization_id
ON ${tableName}(organization_id);
`)
    })
  } else {
    console.log('\nNenhuma correção necessária!')
  }

  console.log('\n✅ Verificação completa!')
}

// Executar verificação
verifyDatabaseStructure().catch(console.error)