#!/usr/bin/env node
// ============================================================
// Script para exportar TODOS os dados do Supabase para SQL
// Gera arquivo seed_data.sql com INSERT statements
// ============================================================

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, '..', 'seed_data.sql');

// Tabelas para exportar (ordem respeita foreign keys)
const TABLES = [
  { name: 'organizations', columns: null }, // null = all columns
  { name: 'organization_users', columns: null },
  { name: 'mentorados', columns: null },
  { name: 'video_modules', columns: null },
  { name: 'video_lessons', columns: null },
  { name: 'leads', columns: null },
  { name: 'lead_notes', columns: null },
  { name: 'closers', columns: null },
  { name: 'calendar_events', columns: null },
  { name: 'notifications', columns: null },
  { name: 'despesas_mensais', columns: null },
  { name: 'pontuacao_mentorados', columns: null },
  { name: 'referrals', columns: null },
  { name: 'referral_links', columns: null },
  { name: 'commission_rules', columns: null },
  { name: 'commissions', columns: null },
  { name: 'withdrawals', columns: null },
  { name: 'social_sellers', columns: null },
  { name: 'form_templates', columns: null },
  { name: 'kanban_boards', columns: null },
  { name: 'kanban_columns', columns: null },
  { name: 'kanban_tasks', columns: null },
  { name: 'continue_watching', columns: null },
  { name: 'module_ratings', columns: null },
  { name: 'goal_checkpoints', columns: null },
  { name: 'mentorado_atividades', columns: null },
  { name: 'mentorado_metas', columns: null },
  { name: 'mentorado_evolucao_financeira', columns: null },
  { name: 'whatsapp_conversations', columns: null },
];

function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // JSON/JSONB
    const json = JSON.stringify(value);
    return `'${json.replace(/'/g, "''")}'::jsonb`;
  }
  // String
  const str = String(value);
  return `'${str.replace(/'/g, "''")}'`;
}

async function fetchTable(tableName, pageSize = 1000) {
  const allRows = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
        'Prefer': 'count=exact',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  ERRO ao buscar ${tableName}: ${res.status} ${errText}`);
      return allRows;
    }

    const rows = await res.json();
    allRows.push(...rows);

    if (rows.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return allRows;
}

function generateInserts(tableName, rows) {
  if (rows.length === 0) return `-- ${tableName}: vazio (0 registros)\n`;

  const columns = Object.keys(rows[0]);
  const colList = columns.map(c => `"${c}"`).join(', ');

  let sql = `-- ${tableName}: ${rows.length} registros\n`;

  for (const row of rows) {
    const values = columns.map(col => escapeSQL(row[col])).join(', ');
    sql += `INSERT INTO "${tableName}" (${colList}) VALUES (${values});\n`;
  }

  return sql;
}

async function main() {
  console.log('=== Exportando dados do Supabase ===\n');

  let fullSQL = `-- ============================================================
-- SEED DATA - Exportado do Supabase (cssystem)
-- Data: ${new Date().toISOString()}
-- ============================================================

-- Desabilitar triggers temporariamente para performance
SET session_replication_role = 'replica';

`;

  let totalRows = 0;

  for (const table of TABLES) {
    process.stdout.write(`Buscando ${table.name}...`);

    try {
      const rows = await fetchTable(table.name);
      console.log(` ${rows.length} registros`);

      if (rows.length > 0) {
        fullSQL += `\n-- ============================================================\n`;
        fullSQL += `-- ${table.name.toUpperCase()}\n`;
        fullSQL += `-- ============================================================\n`;
        fullSQL += generateInserts(table.name, rows);
        fullSQL += '\n';
        totalRows += rows.length;
      }
    } catch (err) {
      console.log(` ERRO: ${err.message}`);
      fullSQL += `-- ERRO ao exportar ${table.name}: ${err.message}\n\n`;
    }
  }

  fullSQL += `
-- Reabilitar triggers
SET session_replication_role = 'origin';

-- Atualizar sequences
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.relname AS seq_name, t.relname AS table_name, a.attname AS col_name
    FROM pg_class c
    JOIN pg_depend d ON d.objid = c.oid
    JOIN pg_class t ON d.refobjid = t.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    WHERE c.relkind = 'S'
  ) LOOP
    EXECUTE format('SELECT setval(%L, COALESCE(MAX(%I), 1)) FROM %I', r.seq_name, r.col_name, r.table_name);
  END LOOP;
END $$;

-- FIM DO SEED
`;

  writeFileSync(OUTPUT_FILE, fullSQL, 'utf-8');
  console.log(`\n=== Pronto! ${totalRows} registros exportados para seed_data.sql ===`);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
