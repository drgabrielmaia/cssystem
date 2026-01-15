import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function fixThiagoAccess() {
  console.log('🔧 CORRIGINDO ACESSO DO THIAGO MEDINA');
  console.log('='.repeat(50));

  try {
    // 1. Verificar estado atual
    console.log('🔍 1. Verificando estado atual...');
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email,excluido,status_login,estado_atual&email=eq.thiago.codarin@hotmail.com`,
      { headers }
    );

    if (!checkResponse.ok) {
      console.error('❌ Erro ao verificar mentorado:', checkResponse.status);
      return;
    }

    const checkData = await checkResponse.json();
    if (checkData.length === 0) {
      console.error('❌ Mentorado Thiago não encontrado');
      return;
    }

    const thiago = checkData[0];
    console.log(`📧 Email: ${thiago.email}`);
    console.log(`❌ Excluído: ${thiago.excluido ? 'SIM (PROBLEMA!)' : 'NÃO'}`);
    console.log(`🔑 Status login: ${thiago.status_login}`);
    console.log(`📊 Estado: ${thiago.estado_atual}`);

    // 2. Corrigir o acesso
    console.log('\n🔧 2. Corrigindo acesso...');
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?id=eq.${thiago.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          excluido: false,              // ✅ Permitir acesso
          status_login: 'ativo',        // ✅ Login ativo
          estado_atual: 'ativo',        // ✅ Estado ativo
          data_exclusao: null,          // ✅ Remover data de exclusão
          motivo_exclusao: null         // ✅ Remover motivo de exclusão
        })
      }
    );

    if (updateResponse.ok) {
      const updatedData = await updateResponse.json();
      console.log('✅ Acesso corrigido com sucesso!');

      // 3. Verificar correção
      console.log('\n🔍 3. Verificando correção...');
      const verifyResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/mentorados?select=*&email=eq.thiago.codarin@hotmail.com`,
        { headers }
      );

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const updatedThiago = verifyData[0];

        console.log('📋 ESTADO APÓS CORREÇÃO:');
        console.log(`✅ Excluído: ${updatedThiago.excluido ? 'SIM' : 'NÃO (CORRIGIDO!)'}`);
        console.log(`✅ Status login: ${updatedThiago.status_login}`);
        console.log(`✅ Estado atual: ${updatedThiago.estado_atual}`);
        console.log(`✅ Data exclusão: ${updatedThiago.data_exclusao || 'Null (correto)'}`);
        console.log(`✅ Motivo exclusão: ${updatedThiago.motivo_exclusao || 'Null (correto)'}`);

        console.log('\n🎉 SUCESSO!');
        console.log('🔑 Thiago Medina agora pode acessar o sistema!');
        console.log('📱 Credenciais de acesso:');
        console.log(`   Email: ${updatedThiago.email}`);
        console.log(`   Portal: Sistema de Mentorados`);
        console.log(`   Organização: temp2@admin.com`);
      }

    } else {
      const errorText = await updateResponse.text();
      console.error('❌ Erro ao atualizar:', updateResponse.status, errorText);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n' + '='.repeat(50));
}

// Executar correção
fixThiagoAccess();