import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

async function analyzeVideoPlatformSchema() {
  console.log('=' .repeat(80));
  console.log('ANÁLISE DO SCHEMA DA PLATAFORMA DE VÍDEOS');
  console.log('=' .repeat(80));
  console.log();

  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  // Tabelas conhecidas relacionadas à plataforma de vídeos
  const videoTables = [
    'video_modules',
    'video_lessons',
    'video_access_control',
    'lesson_progress',
    'lesson_exercises',
    'exercise_responses',
    'module_covers',  // Possível tabela para covers
    'module_ratings', // Possível tabela para NPS
    'nps_respostas',  // Tabela existente de NPS
    'metas',          // Tabela de metas existente
    'goals',          // Possível tabela de goals
    'goal_checkpoints' // Possível tabela para checkpoints
  ];

  const tableInfo = {};

  console.log('📋 VERIFICANDO EXISTÊNCIA E ESTRUTURA DAS TABELAS:');
  console.log('-' .repeat(80));

  for (const tableName of videoTables) {
    console.log(`\n🔍 Analisando: ${tableName}`);

    try {
      // Primeiro, verificar se a tabela existe
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`,
        { headers }
      );

      if (response.status === 200) {
        console.log(`  ✅ Tabela existe`);

        // Tentar obter dados de exemplo para entender a estrutura
        const data = await response.json();

        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`  📊 Colunas detectadas: ${columns.join(', ')}`);

          // Armazenar informações
          tableInfo[tableName] = {
            exists: true,
            columns: columns,
            sampleData: data[0]
          };
        } else {
          // Tabela existe mas está vazia, tentar outra abordagem
          console.log(`  ⚠️ Tabela vazia, tentando obter estrutura...`);

          // Fazer uma query que retorna headers mesmo vazia
          const schemaResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=0`,
            {
              headers: {
                ...headers,
                'Prefer': 'count=exact'
              }
            }
          );

          tableInfo[tableName] = {
            exists: true,
            columns: [],
            empty: true
          };
        }
      } else if (response.status === 404) {
        console.log(`  ❌ Tabela não existe`);
        tableInfo[tableName] = { exists: false };
      } else if (response.status === 401) {
        console.log(`  🔒 Sem permissão de acesso`);
        tableInfo[tableName] = { exists: 'unknown', accessDenied: true };
      } else {
        console.log(`  ⚠️ Status: ${response.status}`);
        const text = await response.text();
        if (text.includes('infinite recursion')) {
          console.log(`  ⚠️ Erro de recursão nas políticas RLS`);
          tableInfo[tableName] = { exists: 'unknown', rlsError: true };
        }
      }
    } catch (error) {
      console.log(`  ❌ Erro: ${error.message}`);
      tableInfo[tableName] = { exists: 'unknown', error: error.message };
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log('ANÁLISE DETALHADA DAS TABELAS EXISTENTES');
  console.log('=' .repeat(80));

  // Analisar tabelas que existem
  const existingTables = Object.entries(tableInfo).filter(([_, info]) => info.exists === true);

  if (existingTables.length > 0) {
    console.log('\n✅ TABELAS EXISTENTES:');
    for (const [table, info] of existingTables) {
      console.log(`\n📦 ${table}`);
      if (info.columns && info.columns.length > 0) {
        console.log('   Colunas:');
        info.columns.forEach(col => {
          const value = info.sampleData ? info.sampleData[col] : null;
          const type = value !== null ? typeof value : 'unknown';
          console.log(`     - ${col} (${type})`);
        });
      }
    }
  }

  // Tabelas que não existem
  const missingTables = Object.entries(tableInfo).filter(([_, info]) => info.exists === false);

  if (missingTables.length > 0) {
    console.log('\n❌ TABELAS NÃO ENCONTRADAS:');
    missingTables.forEach(([table]) => {
      console.log(`   - ${table}`);
    });
  }

  // Tabelas com problemas
  const problematicTables = Object.entries(tableInfo).filter(([_, info]) => info.exists === 'unknown');

  if (problematicTables.length > 0) {
    console.log('\n⚠️ TABELAS COM PROBLEMAS DE ACESSO:');
    problematicTables.forEach(([table, info]) => {
      if (info.rlsError) {
        console.log(`   - ${table}: Erro de recursão nas políticas RLS`);
      } else if (info.accessDenied) {
        console.log(`   - ${table}: Acesso negado`);
      } else {
        console.log(`   - ${table}: ${info.error || 'Erro desconhecido'}`);
      }
    });
  }

  console.log('\n' + '=' .repeat(80));
  console.log('ANÁLISE DE FUNCIONALIDADES PARA PLATAFORMA NETFLIX-STYLE');
  console.log('=' .repeat(80));

  console.log('\n1️⃣ MÓDULOS E AULAS (video_modules, video_lessons):');
  if (tableInfo['video_modules']?.exists) {
    console.log('   ✅ Tabela de módulos existe');
    if (tableInfo['video_modules'].columns?.includes('cover_image')) {
      console.log('   ✅ Já possui coluna cover_image');
    } else {
      console.log('   ⚠️ Precisa adicionar coluna cover_image para thumbnails');
    }
  } else {
    console.log('   ❌ Tabela video_modules não encontrada');
  }

  console.log('\n2️⃣ CONTROLE DE ACESSO (video_access_control):');
  if (tableInfo['video_access_control']?.exists) {
    console.log('   ✅ Tabela existe');
  } else {
    console.log('   ❌ Tabela não encontrada - necessário criar');
  }

  console.log('\n3️⃣ PROGRESSO E EXERCÍCIOS:');
  if (tableInfo['lesson_progress']?.exists) {
    console.log('   ✅ Tabela lesson_progress existe');
  } else {
    console.log('   ❌ Tabela lesson_progress não encontrada');
  }

  if (tableInfo['lesson_exercises']?.exists) {
    console.log('   ✅ Tabela lesson_exercises existe');
  } else {
    console.log('   ❌ Tabela lesson_exercises não encontrada');
  }

  console.log('\n4️⃣ SISTEMA DE AVALIAÇÃO NPS:');
  if (tableInfo['nps_respostas']?.exists) {
    console.log('   ✅ Tabela nps_respostas existe (pode ser adaptada)');
  }
  if (tableInfo['module_ratings']?.exists) {
    console.log('   ✅ Tabela module_ratings existe');
  } else {
    console.log('   ⚠️ Considerar criar tabela module_ratings específica');
  }

  console.log('\n5️⃣ SISTEMA DE METAS E CHECKPOINTS:');
  if (tableInfo['metas']?.exists) {
    console.log('   ✅ Tabela metas existe');
    if (tableInfo['metas'].columns?.includes('checkpoints')) {
      console.log('   ✅ Já possui coluna checkpoints');
    } else {
      console.log('   ⚠️ Precisa adicionar sistema de checkpoints');
    }
  } else {
    console.log('   ❌ Tabela metas não encontrada');
  }

  console.log('\n' + '=' .repeat(80));
  console.log('RECOMENDAÇÕES PARA IMPLEMENTAÇÃO NETFLIX-STYLE');
  console.log('=' .repeat(80));

  console.log('\n📋 COMPONENTES NECESSÁRIOS:');
  console.log('\n1. COVERS DOS MÓDULOS (Thumbnails Netflix-style):');
  console.log('   - Adicionar coluna cover_image na tabela video_modules');
  console.log('   - Adicionar coluna thumbnail_url para preview');
  console.log('   - Adicionar coluna preview_video_url para vídeo de preview');

  console.log('\n2. SISTEMA NPS PARA MÓDULOS:');
  console.log('   - Criar tabela module_ratings ou adaptar nps_respostas');
  console.log('   - Campos: module_id, user_id, rating (0-10), feedback, created_at');
  console.log('   - Adicionar agregação de ratings na view dos módulos');

  console.log('\n3. SISTEMA DE METAS COM CHECKPOINTS:');
  console.log('   - Criar tabela goal_checkpoints linkada com metas');
  console.log('   - Campos: id, goal_id, title, description, target_date, completed, progress');
  console.log('   - Adicionar tracking de progresso por checkpoint');

  console.log('\n4. MELHORIAS NA EXPERIÊNCIA:');
  console.log('   - Adicionar campo "continue_watching" para tracking');
  console.log('   - Criar sistema de recomendações baseado em progresso');
  console.log('   - Adicionar categorização e tags nos módulos');

  console.log('\n✅ Análise completa!');

  // Retornar informações estruturadas
  return tableInfo;
}

// Executar análise
analyzeVideoPlatformSchema()
  .then(result => {
    console.log('\n📊 Resultado da análise salvo em tableInfo');
  })
  .catch(console.error);