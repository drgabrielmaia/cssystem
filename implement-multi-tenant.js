const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function implementMultiTenant() {
  console.log('🚀 Starting Multi-Tenant Implementation...\n')

  try {
    // Step 1: Create organizations table
    console.log('Step 1: Creating organizations table...')
    const { error: orgError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          owner_email TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    })

    if (orgError && !orgError.message.includes('already exists')) {
      throw orgError
    }
    console.log('✅ Organizations table created/verified')

    // Step 2: Create organization_users table
    console.log('\nStep 2: Creating organization_users table...')
    const { error: orgUsersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS organization_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(organization_id, user_id),
          UNIQUE(organization_id, email)
        );
      `
    })

    if (orgUsersError && !orgUsersError.message.includes('already exists')) {
      throw orgUsersError
    }
    console.log('✅ Organization_users table created/verified')

    // Step 3: Get list of existing tables
    console.log('\nStep 3: Getting list of existing tables...')
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('organizations', 'organization_users')
        ORDER BY table_name;
      `
    })

    if (tablesError) throw tablesError

    const tableList = tables.map(t => t.table_name)
    console.log(`Found ${tableList.length} tables to modify`)

    // Step 4: Add organization_id to existing tables
    console.log('\nStep 4: Adding organization_id to existing tables...')
    const tablesToModify = [
      'mentorados',
      'video_modules',
      'video_lessons',
      'lesson_progress',
      'form_submissions',
      'formularios_respostas',
      'whatsapp_conversations',
      'comissoes'
    ]

    for (const tableName of tablesToModify) {
      if (tableList.includes(tableName)) {
        console.log(`  Adding organization_id to ${tableName}...`)

        // Check if column already exists
        const { data: columns, error: colError } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '${tableName}'
            AND column_name = 'organization_id';
          `
        })

        if (!colError && columns.length === 0) {
          const { error: alterError } = await supabase.rpc('exec_sql', {
            sql: `
              ALTER TABLE ${tableName}
              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

              CREATE INDEX IF NOT EXISTS idx_${tableName}_organization_id
              ON ${tableName}(organization_id);
            `
          })

          if (alterError) {
            console.log(`  ⚠️ Warning for ${tableName}: ${alterError.message}`)
          } else {
            console.log(`  ✅ ${tableName} modified`)
          }
        } else {
          console.log(`  ⏭️ ${tableName} already has organization_id`)
        }
      }
    }

    // Step 5: Create financial tables with multi-tenancy
    console.log('\nStep 5: Creating financial tables...')
    const financialTables = [
      {
        name: 'vendas',
        sql: `
          CREATE TABLE IF NOT EXISTS vendas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES organizations(id),
            mentorado_id UUID REFERENCES mentorados(id),
            valor DECIMAL(10,2) NOT NULL,
            data_venda DATE NOT NULL,
            status TEXT DEFAULT 'pendente',
            forma_pagamento TEXT,
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_vendas_organization_id ON vendas(organization_id);
        `
      },
      {
        name: 'despesas',
        sql: `
          CREATE TABLE IF NOT EXISTS despesas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES organizations(id),
            descricao TEXT NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            data_despesa DATE NOT NULL,
            categoria TEXT,
            status TEXT DEFAULT 'pendente',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_despesas_organization_id ON despesas(organization_id);
        `
      },
      {
        name: 'metas',
        sql: `
          CREATE TABLE IF NOT EXISTS metas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES organizations(id),
            mentorado_id UUID REFERENCES mentorados(id),
            titulo TEXT NOT NULL,
            descricao TEXT,
            data_inicio DATE,
            data_fim DATE,
            status TEXT DEFAULT 'pendente',
            progresso INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_metas_organization_id ON metas(organization_id);
        `
      },
      {
        name: 'faturas',
        sql: `
          CREATE TABLE IF NOT EXISTS faturas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES organizations(id),
            numero TEXT NOT NULL,
            cliente TEXT NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            data_emissao DATE NOT NULL,
            data_vencimento DATE NOT NULL,
            status TEXT DEFAULT 'pendente',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_faturas_organization_id ON faturas(organization_id);
        `
      },
      {
        name: 'pix_payments',
        sql: `
          CREATE TABLE IF NOT EXISTS pix_payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES organizations(id),
            chave_pix TEXT NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            pagador TEXT,
            data_pagamento TIMESTAMP NOT NULL,
            txid TEXT,
            status TEXT DEFAULT 'confirmado',
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pix_payments_organization_id ON pix_payments(organization_id);
        `
      },
      {
        name: 'contas_bancarias',
        sql: `
          CREATE TABLE IF NOT EXISTS contas_bancarias (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES organizations(id),
            nome TEXT NOT NULL,
            banco TEXT NOT NULL,
            agencia TEXT,
            conta TEXT,
            tipo TEXT DEFAULT 'corrente',
            saldo_atual DECIMAL(10,2) DEFAULT 0,
            ativo BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_contas_bancarias_organization_id ON contas_bancarias(organization_id);
        `
      },
      {
        name: 'categorias_financeiras',
        sql: `
          CREATE TABLE IF NOT EXISTS categorias_financeiras (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES organizations(id),
            nome TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
            cor TEXT,
            icone TEXT,
            ativo BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_categorias_financeiras_organization_id ON categorias_financeiras(organization_id);
        `
      },
      {
        name: 'transacoes',
        sql: `
          CREATE TABLE IF NOT EXISTS transacoes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES organizations(id),
            tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
            categoria_id UUID REFERENCES categorias_financeiras(id),
            conta_id UUID REFERENCES contas_bancarias(id),
            descricao TEXT NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            data_transacao DATE NOT NULL,
            status TEXT DEFAULT 'confirmado',
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_transacoes_organization_id ON transacoes(organization_id);
        `
      }
    ]

    for (const table of financialTables) {
      console.log(`  Creating ${table.name}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql })
      if (error && !error.message.includes('already exists')) {
        console.log(`  ⚠️ Warning for ${table.name}: ${error.message}`)
      } else {
        console.log(`  ✅ ${table.name} created/verified`)
      }
    }

    // Step 6: Create initial organizations
    console.log('\nStep 6: Creating initial organizations...')

    // Create Admin Organization
    const { data: adminOrg, error: adminOrgError } = await supabase
      .from('organizations')
      .insert([
        {
          name: 'Admin Organization',
          owner_email: 'admin@admin.com'
        }
      ])
      .select()
      .single()

    if (adminOrgError && !adminOrgError.message.includes('duplicate')) {
      console.log('  ⚠️ Admin org error:', adminOrgError.message)
    } else if (adminOrg) {
      console.log('  ✅ Admin Organization created')
    }

    // Create Kelly Organization
    const { data: kellyOrg, error: kellyOrgError } = await supabase
      .from('organizations')
      .insert([
        {
          name: 'Kelly Organization',
          owner_email: 'kellybsantoss@icloud.com'
        }
      ])
      .select()
      .single()

    if (kellyOrgError && !kellyOrgError.message.includes('duplicate')) {
      console.log('  ⚠️ Kelly org error:', kellyOrgError.message)
    } else if (kellyOrg) {
      console.log('  ✅ Kelly Organization created')
    }

    // Step 7: Get organization IDs
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, owner_email')

    const adminOrgId = orgs?.find(o => o.owner_email === 'admin@admin.com')?.id

    if (adminOrgId) {
      // Step 8: Migrate existing data
      console.log('\nStep 8: Migrating existing data to Admin Organization...')

      for (const tableName of tablesToModify) {
        if (tableList.includes(tableName)) {
          console.log(`  Migrating ${tableName}...`)
          const { error: migrateError } = await supabase.rpc('exec_sql', {
            sql: `
              UPDATE ${tableName}
              SET organization_id = '${adminOrgId}'
              WHERE organization_id IS NULL;
            `
          })

          if (migrateError) {
            console.log(`  ⚠️ Migration warning for ${tableName}: ${migrateError.message}`)
          } else {
            console.log(`  ✅ ${tableName} migrated`)
          }
        }
      }
    }

    // Step 9: Enable RLS and create policies
    console.log('\nStep 9: Implementing Row Level Security...')
    const allTablesToSecure = [...tablesToModify, ...financialTables.map(t => t.name)]

    for (const tableName of allTablesToSecure) {
      if (tableList.includes(tableName) || financialTables.some(t => t.name === tableName)) {
        console.log(`  Securing ${tableName}...`)

        const { error: rlsError } = await supabase.rpc('exec_sql', {
          sql: `
            ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "Organization isolation" ON ${tableName};

            CREATE POLICY "Organization isolation" ON ${tableName}
              FOR ALL
              USING (
                organization_id IN (
                  SELECT organization_id
                  FROM organization_users
                  WHERE user_id = auth.uid()
                )
              );
          `
        })

        if (rlsError) {
          console.log(`  ⚠️ RLS warning for ${tableName}: ${rlsError.message}`)
        } else {
          console.log(`  ✅ ${tableName} secured with RLS`)
        }
      }
    }

    // Step 10: Create helper functions
    console.log('\nStep 10: Creating helper functions...')

    const helperFunctions = [
      {
        name: 'get_user_organization_id',
        sql: `
          CREATE OR REPLACE FUNCTION get_user_organization_id()
          RETURNS UUID AS $$
          BEGIN
            RETURN (
              SELECT organization_id
              FROM organization_users
              WHERE user_id = auth.uid()
              LIMIT 1
            );
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      },
      {
        name: 'user_belongs_to_organization',
        sql: `
          CREATE OR REPLACE FUNCTION user_belongs_to_organization(org_id UUID)
          RETURNS BOOLEAN AS $$
          BEGIN
            RETURN EXISTS (
              SELECT 1
              FROM organization_users
              WHERE user_id = auth.uid()
              AND organization_id = org_id
            );
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      },
      {
        name: 'get_user_role_in_organization',
        sql: `
          CREATE OR REPLACE FUNCTION get_user_role_in_organization(org_id UUID)
          RETURNS TEXT AS $$
          BEGIN
            RETURN (
              SELECT role
              FROM organization_users
              WHERE user_id = auth.uid()
              AND organization_id = org_id
              LIMIT 1
            );
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      }
    ]

    for (const func of helperFunctions) {
      console.log(`  Creating function ${func.name}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: func.sql })
      if (error) {
        console.log(`  ⚠️ Function warning for ${func.name}: ${error.message}`)
      } else {
        console.log(`  ✅ ${func.name} created`)
      }
    }

    // Final report
    console.log('\n' + '='.repeat(60))
    console.log('📊 IMPLEMENTATION REPORT')
    console.log('='.repeat(60))

    // Count migrated records
    let totalMigrated = 0
    for (const tableName of tablesToModify) {
      if (tableList.includes(tableName)) {
        const { data: count } = await supabase
          .from(tableName)
          .select('id', { count: 'exact' })

        if (count) {
          console.log(`${tableName}: ${count.length} records`)
          totalMigrated += count.length
        }
      }
    }

    console.log(`\nTotal records migrated: ${totalMigrated}`)
    console.log('\n✅ Multi-tenant system implementation completed!')

  } catch (error) {
    console.error('❌ Error during implementation:', error)
    process.exit(1)
  }
}

// Run the implementation
implementMultiTenant()