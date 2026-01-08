const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkTableStructure(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('organization_id')
      .limit(1);

    if (error) {
      if (error.message.includes('column "organization_id" does not exist')) {
        return { exists: true, hasOrgId: false, error: 'Missing organization_id column' };
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return { exists: false, hasOrgId: false, error: 'Table does not exist' };
      } else {
        return { exists: true, hasOrgId: 'unknown', error: error.message };
      }
    }

    return { exists: true, hasOrgId: true, error: null };
  } catch (err) {
    return { exists: 'unknown', hasOrgId: 'unknown', error: err.message };
  }
}

async function checkRLS(tableName) {
  try {
    // Tentar acessar sem autenticação
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);

    if (error && error.message.includes('Row Level Security')) {
      return { enabled: true, working: true };
    } else if (!error) {
      // Se conseguiu acessar, RLS pode estar desativado ou permitindo acesso
      return { enabled: 'partial', working: false };
    } else {
      return { enabled: 'unknown', working: false, error: error.message };
    }
  } catch (err) {
    return { enabled: 'error', working: false, error: err.message };
  }
}

async function verifyMultiTenantStatus() {
  log('\n════════════════════════════════════════════════════════════', 'bright');
  log('     VERIFICAÇÃO COMPLETA DO SISTEMA MULTI-TENANT', 'cyan');
  log('════════════════════════════════════════════════════════════\n', 'bright');

  const report = {
    organizations: { total: 0, active: 0 },
    users: { total: 0, withOrg: 0 },
    tables: { total: 0, withOrgId: 0, withRLS: 0 },
    issues: [],
    recommendations: []
  };

  // 1. VERIFICAR ESTRUTURA DE ORGANIZAÇÕES
  log('📊 1. ESTRUTURA DE ORGANIZAÇÕES', 'blue');
  log('─'.repeat(50));

  try {
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*');

    if (orgsError) {
      log(`  ❌ Erro ao acessar organizations: ${orgsError.message}`, 'red');
      report.issues.push('Tabela organizations não acessível');
    } else {
      report.organizations.total = orgs?.length || 0;
      report.organizations.active = orgs?.filter(o => o.is_active !== false).length || 0;
      log(`  ✅ Organizations: ${report.organizations.total} total, ${report.organizations.active} ativas`, 'green');

      if (orgs && orgs.length > 0) {
        log('\n  📋 Organizações encontradas:');
        orgs.slice(0, 3).forEach(org => {
          log(`     • ${org.name} (${org.owner_email})`);
        });
        if (orgs.length > 3) {
          log(`     ... e mais ${orgs.length - 3} organizações`);
        }
      }
    }

    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('organization_users')
      .select('*');

    if (orgUsersError) {
      log(`  ❌ Erro ao acessar organization_users: ${orgUsersError.message}`, 'red');
      report.issues.push('Tabela organization_users não acessível');
    } else {
      report.users.total = orgUsers?.length || 0;
      report.users.withOrg = orgUsers?.filter(u => u.user_id).length || 0;
      log(`  ✅ Usuários: ${report.users.total} cadastrados, ${report.users.withOrg} vinculados`, 'green');

      // Análise de roles
      if (orgUsers && orgUsers.length > 0) {
        const roleCount = orgUsers.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});

        log('\n  👥 Distribuição de roles:');
        Object.entries(roleCount).forEach(([role, count]) => {
          log(`     • ${role}: ${count} usuário(s)`);
        });
      }
    }
  } catch (err) {
    log(`  ❌ Erro geral: ${err.message}`, 'red');
    report.issues.push('Erro ao verificar estrutura de organizações');
  }

  // 2. VERIFICAR TABELAS COM organization_id
  log('\n📋 2. ANÁLISE DE TABELAS', 'blue');
  log('─'.repeat(50));

  const tables = [
    // Tabelas principais
    { name: 'leads', required: true },
    { name: 'mentorados', required: true },
    { name: 'metas', required: true },
    { name: 'formularios_respostas', required: true },
    { name: 'form_submissions', required: true },

    // Módulos de vídeo
    { name: 'video_modules', required: true },
    { name: 'video_lessons', required: true },
    { name: 'lesson_progress', required: true },

    // Financeiro
    { name: 'despesas_mensais', required: true },

    // Instagram
    { name: 'instagram_automations', required: false },
    { name: 'instagram_funnels', required: false },
    { name: 'instagram_funnel_steps', required: false }
  ];

  const tableResults = [];

  for (const table of tables) {
    const structure = await checkTableStructure(table.name);
    const rls = await checkRLS(table.name);

    const status = {
      name: table.name,
      required: table.required,
      ...structure,
      rls: rls.enabled
    };

    tableResults.push(status);
    report.tables.total++;

    // Formatar output
    let statusSymbol = '❓';
    let statusColor = 'yellow';

    if (structure.exists && structure.hasOrgId && rls.enabled === true) {
      statusSymbol = '✅';
      statusColor = 'green';
      report.tables.withOrgId++;
      report.tables.withRLS++;
    } else if (structure.exists && structure.hasOrgId) {
      statusSymbol = '⚠️';
      statusColor = 'yellow';
      report.tables.withOrgId++;
      if (!table.required) statusColor = 'cyan';
    } else if (!structure.exists && !table.required) {
      statusSymbol = '➖';
      statusColor = 'cyan';
    } else {
      statusSymbol = '❌';
      statusColor = 'red';
      if (table.required) {
        report.issues.push(`Tabela ${table.name} precisa de organization_id`);
      }
    }

    const statusText = [
      structure.exists ? 'Existe' : 'Não existe',
      structure.hasOrgId ? 'Com org_id' : 'Sem org_id',
      rls.enabled === true ? 'RLS ativo' : 'RLS inativo'
    ].filter(s => structure.exists || s === 'Não existe').join(' | ');

    log(`  ${statusSymbol} ${table.name.padEnd(25)} ${statusText}`, statusColor);
  }

  // 3. ANÁLISE DE SEGURANÇA (RLS)
  log('\n🔒 3. ANÁLISE DE SEGURANÇA (RLS)', 'blue');
  log('─'.repeat(50));

  const rlsStatus = tableResults.filter(t => t.exists).map(t => ({
    name: t.name,
    rls: t.rls
  }));

  const rlsActive = rlsStatus.filter(t => t.rls === true).length;
  const rlsInactive = rlsStatus.filter(t => t.rls !== true).length;

  log(`  📊 Status geral:`, 'cyan');
  log(`     • RLS Ativo: ${rlsActive} tabelas`);
  log(`     • RLS Inativo/Parcial: ${rlsInactive} tabelas`);

  if (rlsInactive > 0) {
    log(`\n  ⚠️  Tabelas sem RLS completo:`, 'yellow');
    rlsStatus.filter(t => t.rls !== true).forEach(t => {
      log(`     • ${t.name}`);
    });
    report.issues.push(`${rlsInactive} tabelas sem RLS completo`);
  }

  // 4. VERIFICAÇÕES FUNCIONAIS
  log('\n🔧 4. VERIFICAÇÕES FUNCIONAIS', 'blue');
  log('─'.repeat(50));

  // Verificar se consegue chamar funções
  try {
    // Tentar verificar o setup (se a função existir)
    const { data, error } = await supabase.rpc('verify_multi_tenant_setup');

    if (!error) {
      log('  ✅ Função verify_multi_tenant_setup existe', 'green');
      if (data) {
        log('  📋 Resultado da verificação:');
        if (data.setup_complete) {
          log('     • Setup completo: SIM', 'green');
        }
        if (data.triggers_created) {
          log(`     • Triggers criados: ${data.triggers_created.length}`, 'green');
        }
        if (data.functions_created) {
          log(`     • Funções criadas: ${data.functions_created.length}`, 'green');
        }
      }
    } else {
      log('  ⚠️  Função verify_multi_tenant_setup não encontrada', 'yellow');
      report.recommendations.push('Execute o script SQL de setup completo');
    }
  } catch (err) {
    log('  ❌ Erro ao verificar funções: ' + err.message, 'red');
  }

  // 5. RESUMO E RECOMENDAÇÕES
  log('\n📊 5. RESUMO FINAL', 'blue');
  log('═'.repeat(50));

  const score = Math.round(
    ((report.tables.withOrgId / report.tables.total) * 50) +
    ((report.tables.withRLS / report.tables.total) * 30) +
    ((report.organizations.total > 0 ? 10 : 0)) +
    ((report.users.withOrg > 0 ? 10 : 0))
  );

  log(`\n  🎯 Score Multi-Tenant: ${score}/100`, score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red');

  log('\n  📈 Estatísticas:', 'cyan');
  log(`     • Organizações: ${report.organizations.total}`);
  log(`     • Usuários: ${report.users.total}`);
  log(`     • Tabelas com org_id: ${report.tables.withOrgId}/${report.tables.total}`);
  log(`     • Tabelas com RLS: ${report.tables.withRLS}/${report.tables.total}`);

  if (report.issues.length > 0) {
    log('\n  ⚠️  Problemas Encontrados:', 'yellow');
    report.issues.forEach(issue => {
      log(`     • ${issue}`, 'yellow');
    });
  }

  // Recomendações baseadas na análise
  if (report.tables.withOrgId < report.tables.total) {
    report.recommendations.push('Adicionar organization_id nas tabelas faltantes');
  }
  if (report.tables.withRLS < report.tables.total) {
    report.recommendations.push('Ativar RLS em todas as tabelas com dados sensíveis');
  }
  if (report.organizations.total === 0) {
    report.recommendations.push('Criar uma organização de teste');
  }
  if (report.users.total === 0) {
    report.recommendations.push('Criar usuários de teste para validar o sistema');
  }

  if (report.recommendations.length > 0) {
    log('\n  💡 Recomendações:', 'cyan');
    report.recommendations.forEach(rec => {
      log(`     • ${rec}`);
    });
  }

  // Status final
  log('\n' + '═'.repeat(50), 'bright');

  if (score >= 80) {
    log('✅ SISTEMA MULTI-TENANT OPERACIONAL!', 'green');
    log('   Pronto para uso em produção.', 'green');
  } else if (score >= 50) {
    log('⚠️  SISTEMA MULTI-TENANT PARCIALMENTE CONFIGURADO', 'yellow');
    log('   Execute o script SQL de setup completo.', 'yellow');
  } else {
    log('❌ SISTEMA MULTI-TENANT NÃO CONFIGURADO', 'red');
    log('   Execute as instruções em setup-multi-tenant-instructions.md', 'red');
  }

  log('═'.repeat(50) + '\n', 'bright');

  return report;
}

// Executar verificação
if (require.main === module) {
  verifyMultiTenantStatus().catch(console.error);
}

module.exports = { verifyMultiTenantStatus, checkTableStructure, checkRLS };