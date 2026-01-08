const fetch = require('node-fetch')

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

// Lista expandida de tabelas possíveis
const possibleTables = [
  // Tabelas de usuários e autenticação
  'mentorados',
  'usuarios',
  'users',
  'profiles',

  // Tabelas de vendas e financeiro
  'vendas',
  'sales',
  'transactions',
  'despesas',
  'expenses',
  'comissoes',
  'commissions',
  'faturas',
  'invoices',
  'pagamentos',
  'payments',
  'recebimentos',
  'receivables',
  'financeiro',
  'finance',
  'contas_bancarias',
  'bank_accounts',
  'categorias_financeiras',
  'financial_categories',
  'transacoes',
  'pix_payments',

  // Tabelas de conteúdo educacional
  'video_modules',
  'video_lessons',
  'lesson_progress',
  'modules',
  'lessons',
  'courses',
  'progress',

  // Tabelas de formulários e respostas
  'form_submissions',
  'formularios_respostas',
  'forms',
  'submissions',
  'responses',

  // Tabelas de comunicação
  'whatsapp_conversations',
  'whatsapp_messages',
  'instagram_messages',
  'messages',
  'conversations',
  'chats',

  // Tabelas de metas e acompanhamento
  'metas',
  'goals',
  'metas_vendedores',
  'seller_goals',
  'followup_records',
  'followup_configurations',
  'followups',

  // Tabelas de relacionamento
  'vendas_mentorados',
  'user_sales',
  'user_courses',

  // Outras tabelas possíveis
  'leads',
  'contacts',
  'activities',
  'events',
  'logs',
  'settings',
  'configurations'
]

async function testTable(tableName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=1`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    })

    if (response.status === 404 || response.status === 406) {
      return null
    }

    if (response.status === 401 || response.status === 403) {
      return {
        name: tableName,
        exists: true,
        accessible: false,
        reason: 'Sem permissão (precisa autenticação ou RLS bloqueando)'
      }
    }

    const totalCount = response.headers.get('content-range')
    const data = await response.json()

    if (response.ok) {
      let count = 0
      if (totalCount) {
        const match = totalCount.match(/\d+-\d+\/(\d+)/)
        if (match) count = parseInt(match[1])
      }

      return {
        name: tableName,
        exists: true,
        accessible: true,
        recordCount: count || data.length,
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        sampleData: data[0] || null
      }
    }

    return null
  } catch (error) {
    return null
  }
}

async function analyzeDatabase() {
  console.log('='.repeat(80))
  console.log('🔍 ANÁLISE COMPLETA DA ESTRUTURA DO BANCO SUPABASE')
  console.log('='.repeat(80))
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`)
  console.log(`🌐 URL: ${SUPABASE_URL}`)
  console.log(`🔑 Usando: Anonymous Key`)
  console.log('='.repeat(80))

  const found = {
    accessible: [],
    restricted: [],
    multiTenant: [],
    global: []
  }

  console.log('\n🔎 DESCOBRINDO TABELAS EXISTENTES...\n')

  for (const table of possibleTables) {
    process.stdout.write(`  Testando: ${table.padEnd(30)}`)

    const result = await testTable(table)

    if (!result) {
      console.log('❌ Não existe')
    } else if (!result.accessible) {
      console.log(`🔒 Existe mas está protegida`)
      found.restricted.push(result)
    } else {
      console.log(`✅ Acessível (${result.recordCount} registros)`)
      found.accessible.push(result)

      // Verificar se é multi-tenant
      const userColumns = ['user_id', 'owner_id', 'created_by', 'mentorado_id', 'vendedor_id', 'usuario_id']
      const hasUserColumn = result.columns.some(col => userColumns.includes(col.toLowerCase()))

      if (hasUserColumn) {
        found.multiTenant.push(result)
      } else {
        found.global.push(result)
      }
    }
  }

  // RELATÓRIO FINAL
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 RELATÓRIO FINAL DA ESTRUTURA DO BANCO')
  console.log('='.repeat(80))

  console.log('\n✅ TABELAS ACESSÍVEIS:')
  console.log('-'.repeat(60))

  if (found.accessible.length === 0) {
    console.log('  Nenhuma tabela acessível encontrada')
  } else {
    found.accessible.forEach(table => {
      console.log(`\n  📋 ${table.name}`)
      console.log(`     - Registros: ${table.recordCount}`)
      console.log(`     - Colunas: ${table.columns.join(', ')}`)

      // Identificar colunas importantes
      const idColumns = table.columns.filter(col => col.includes('_id'))
      if (idColumns.length > 0) {
        console.log(`     - Possíveis FKs: ${idColumns.join(', ')}`)
      }

      const userColumns = table.columns.filter(col =>
        ['user_id', 'owner_id', 'created_by', 'mentorado_id', 'vendedor_id'].includes(col.toLowerCase())
      )
      if (userColumns.length > 0) {
        console.log(`     - 🔑 Colunas de usuário: ${userColumns.join(', ')}`)
      }
    })
  }

  console.log('\n\n🔒 TABELAS PROTEGIDAS (existem mas não são acessíveis):')
  console.log('-'.repeat(60))

  if (found.restricted.length === 0) {
    console.log('  Nenhuma tabela protegida encontrada')
  } else {
    found.restricted.forEach(table => {
      console.log(`  - ${table.name}: ${table.reason}`)
    })
  }

  console.log('\n\n' + '='.repeat(80))
  console.log('💡 ANÁLISE DE MULTI-TENANCY')
  console.log('='.repeat(80))

  console.log('\n📊 ESTATÍSTICAS:')
  console.log(`  - Total de tabelas encontradas: ${found.accessible.length + found.restricted.length}`)
  console.log(`  - Tabelas acessíveis: ${found.accessible.length}`)
  console.log(`  - Tabelas protegidas: ${found.restricted.length}`)
  console.log(`  - Tabelas com isolamento por usuário: ${found.multiTenant.length}`)
  console.log(`  - Tabelas globais (sem isolamento): ${found.global.length}`)

  if (found.multiTenant.length > 0) {
    console.log('\n✅ TABELAS COM ESTRUTURA MULTI-TENANT:')
    found.multiTenant.forEach(table => {
      const userCols = table.columns.filter(col =>
        ['user_id', 'owner_id', 'created_by', 'mentorado_id', 'vendedor_id'].includes(col.toLowerCase())
      )
      console.log(`  - ${table.name}: [${userCols.join(', ')}]`)
    })
  }

  if (found.global.length > 0) {
    console.log('\n⚠️  TABELAS GLOBAIS (precisam de isolamento):')
    found.global.forEach(table => {
      console.log(`  - ${table.name}`)
    })
  }

  // CONCLUSÃO
  console.log('\n\n' + '='.repeat(80))
  console.log('📝 CONCLUSÃO SOBRE O ESTADO ATUAL DO SISTEMA')
  console.log('='.repeat(80))

  const totalAccessible = found.accessible.length
  const percentMultiTenant = totalAccessible > 0
    ? ((found.multiTenant.length / totalAccessible) * 100).toFixed(1)
    : 0

  if (percentMultiTenant < 20) {
    console.log('\n🔴 SISTEMA PREDOMINANTEMENTE GLOBAL')
    console.log(`   Apenas ${percentMultiTenant}% das tabelas possuem isolamento por usuário.`)
    console.log('   O sistema NÃO está configurado como multi-tenant.')
    console.log('   Todos os usuários compartilham os mesmos dados.')
  } else if (percentMultiTenant > 80) {
    console.log('\n✅ SISTEMA PREDOMINANTEMENTE MULTI-TENANT')
    console.log(`   ${percentMultiTenant}% das tabelas possuem isolamento por usuário.`)
    console.log('   O sistema está bem configurado para multi-tenancy.')
  } else {
    console.log('\n⚠️  SISTEMA PARCIALMENTE MULTI-TENANT')
    console.log(`   ${percentMultiTenant}% das tabelas possuem isolamento por usuário.`)
    console.log('   Algumas áreas do sistema são isoladas, outras são globais.')
  }

  console.log('\n🔧 PRÓXIMOS PASSOS RECOMENDADOS:')
  console.log('-'.repeat(60))

  if (found.global.length > 0) {
    console.log('\n1. Para tabelas globais, adicionar coluna de isolamento:')
    console.log('   ALTER TABLE nome_tabela ADD COLUMN user_id UUID REFERENCES auth.users(id);')

    console.log('\n2. Criar índices para performance:')
    console.log('   CREATE INDEX idx_nome_tabela_user_id ON nome_tabela(user_id);')

    console.log('\n3. Implementar RLS (Row Level Security):')
    console.log('   ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;')

    console.log('\n4. Criar políticas de segurança:')
    console.log('   CREATE POLICY "Users see own data" ON nome_tabela')
    console.log('     FOR ALL USING (user_id = auth.uid());')
  }

  if (found.restricted.length > 0) {
    console.log('\n5. Para acessar tabelas protegidas:')
    console.log('   - Obter a service_role key no painel do Supabase')
    console.log('   - Ou criar um usuário autenticado para teste')
  }

  console.log('\n\n✅ ANÁLISE COMPLETA!')
  console.log('='.repeat(80))

  // Salvar resultado em arquivo JSON
  const report = {
    date: new Date().toISOString(),
    url: SUPABASE_URL,
    statistics: {
      total: found.accessible.length + found.restricted.length,
      accessible: found.accessible.length,
      restricted: found.restricted.length,
      multiTenant: found.multiTenant.length,
      global: found.global.length,
      percentMultiTenant: percentMultiTenant
    },
    tables: {
      accessible: found.accessible,
      restricted: found.restricted,
      multiTenant: found.multiTenant.map(t => t.name),
      global: found.global.map(t => t.name)
    }
  }

  const fs = require('fs')
  fs.writeFileSync('database_analysis_report.json', JSON.stringify(report, null, 2))
  console.log('\n📄 Relatório salvo em: database_analysis_report.json')
}

// Executar análise
analyzeDatabase().catch(console.error)