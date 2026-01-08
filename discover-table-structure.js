import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

async function discoverTableStructure() {
  console.log('=' .repeat(80));
  console.log('DESCOBRINDO ESTRUTURA REAL DAS TABELAS');
  console.log('=' .repeat(80));
  console.log();

  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // Tentar fazer uma inserção inválida para obter as colunas no erro
  console.log('📋 TABELA: organization_users');
  console.log('-' .repeat(40));

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/organization_users`,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          invalid_column: 'test'
        })
      }
    );

    const text = await response.text();

    if (!response.ok) {
      // Analisar o erro para descobrir as colunas
      console.log('Resposta de erro (contém informações sobre a estrutura):');
      console.log(text);

      // Extrair informações sobre colunas do erro
      if (text.includes('column')) {
        console.log('\n🔍 Análise do erro:');

        // Procurar por menções de colunas
        const columnMatches = text.match(/column "[^"]+"/g);
        if (columnMatches) {
          console.log('Colunas mencionadas no erro:');
          columnMatches.forEach(match => {
            const column = match.replace('column "', '').replace('"', '');
            console.log(`  - ${column}`);
          });
        }
      }
    }
  } catch (error) {
    console.log('Erro na requisição:', error.message);
  }

  // Tentar fazer um SELECT com colunas específicas para ver o erro
  console.log('\n📋 Testando colunas conhecidas em organization_users:');
  console.log('-' .repeat(40));

  const possibleColumns = [
    'id',
    'organization_id',
    'user_id',
    'role',
    'is_active',
    'created_at',
    'updated_at',
    'email',
    'name',
    'status',
    'permissions'
  ];

  for (const column of possibleColumns) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/organization_users?select=${column}&limit=1`,
        { headers }
      );

      if (response.ok) {
        console.log(`  ✅ ${column} - EXISTS`);
      } else {
        const errorText = await response.text();
        if (errorText.includes('column') && errorText.includes('does not exist')) {
          console.log(`  ❌ ${column} - DOES NOT EXIST`);
        } else {
          console.log(`  ⚠️ ${column} - ${response.status}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ ${column} - Error: ${error.message}`);
    }
  }

  // Fazer o mesmo para organizations
  console.log('\n📋 TABELA: organizations');
  console.log('-' .repeat(40));

  const orgColumns = [
    'id',
    'name',
    'slug',
    'created_at',
    'updated_at',
    'is_active',
    'status',
    'settings',
    'domain',
    'logo_url'
  ];

  for (const column of orgColumns) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/organizations?select=${column}&limit=1`,
        { headers }
      );

      if (response.ok) {
        console.log(`  ✅ ${column} - EXISTS`);
      } else {
        const errorText = await response.text();
        if (errorText.includes('column') && errorText.includes('does not exist')) {
          console.log(`  ❌ ${column} - DOES NOT EXIST`);
        } else {
          console.log(`  ⚠️ ${column} - ${response.status}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ ${column} - Error: ${error.message}`);
    }
  }

  // Tentar um SELECT * para ver todas as colunas
  console.log('\n📋 Tentando SELECT * para obter todas as colunas:');
  console.log('-' .repeat(40));

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/organization_users?select=*&limit=0`,
      { headers }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('✅ SELECT * funcionou!');

      // Tentar obter schema através do OpenAPI
      const schemaResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: { 'apikey': ANON_KEY }
      });

      if (schemaResponse.ok) {
        const schemaText = await schemaResponse.text();
        if (schemaText.includes('swagger') || schemaText.includes('openapi')) {
          console.log('Schema OpenAPI disponível');
        }
      }
    } else {
      const errorText = await response.text();
      console.log('Erro no SELECT *:', errorText);
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }

  console.log('\n' + '=' .repeat(80));
  console.log('CONCLUSÃO');
  console.log('=' .repeat(80));
  console.log();
  console.log('Com base nos testes, as colunas existentes são marcadas com ✅');
  console.log('As colunas que NÃO existem são marcadas com ❌');
  console.log();
  console.log('📝 O erro "column is_active does not exist" indica que:');
  console.log('   - A coluna is_active NÃO existe na tabela organization_users');
  console.log('   - O script SQL precisa ser corrigido para remover esta referência');
  console.log('   - Ou a coluna precisa ser criada primeiro');
}

discoverTableStructure().catch(console.error);