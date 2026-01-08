// Script simples para mover kelly para organização do temp2@admin.com
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function moveKellyToTemp2Org() {
  try {
    console.log('🔄 Movendo kellybsantoss@icloud.com para organização do temp2@admin.com...')

    // 1. Buscar organização onde temp2@admin.com é owner
    const { data: temp2Org, error: temp2OrgError } = await supabase
      .from('organizations')
      .select('id, name, owner_email')
      .eq('owner_email', 'temp2@admin.com')
      .single()

    if (temp2OrgError) {
      console.error('❌ Erro ao buscar organização do temp2:', temp2OrgError)
      return
    }

    if (!temp2Org) {
      console.log('❌ Organização do temp2@admin.com não encontrada')
      return
    }

    console.log('✅ Organização do temp2 encontrada:', temp2Org)

    // 2. Verificar se kelly já está em organizações
    const { data: kellyOrgUsers, error: kellyOrgError } = await supabase
      .from('organization_users')
      .select('*')
      .eq('email', 'kellybsantoss@icloud.com')

    if (kellyOrgError) {
      console.error('❌ Erro ao buscar registros da kelly:', kellyOrgError)
      return
    }

    console.log(`📋 Kelly está em ${kellyOrgUsers.length} organização(ões)`)

    // 3. Remover kelly de todas as organizações atuais
    if (kellyOrgUsers.length > 0) {
      console.log('🗑️ Removendo kelly das organizações atuais...')

      for (const orgUser of kellyOrgUsers) {
        const { error: deleteError } = await supabase
          .from('organization_users')
          .delete()
          .eq('id', orgUser.id)

        if (deleteError) {
          console.error(`❌ Erro ao remover da organização ${orgUser.organization_id}:`, deleteError)
        } else {
          console.log(`✅ Removida da organização: ${orgUser.organization_id}`)
        }
      }
    }

    // 4. Verificar se kelly tem user_id (está registrada no sistema)
    const kellyUserId = kellyOrgUsers.length > 0 ? kellyOrgUsers[0].user_id : null

    // 5. Adicionar kelly na organização do temp2
    console.log('➕ Adicionando kelly na organização do temp2...')

    const { data: newOrgUser, error: addError } = await supabase
      .from('organization_users')
      .insert([{
        organization_id: temp2Org.id,
        user_id: kellyUserId, // Manter o user_id se existir
        email: 'kellybsantoss@icloud.com',
        role: 'manager' // Definindo como manager
      }])
      .select()
      .single()

    if (addError) {
      console.error('❌ Erro ao adicionar kelly na organização do temp2:', addError)
      return
    }

    console.log('✅ Kelly adicionada com sucesso na organização do temp2!')
    console.log('📊 Novo registro:', newOrgUser)

    // 6. Verificar o resultado final
    console.log('\n🔍 Verificando resultado final...')

    const { data: finalCheck, error: finalError } = await supabase
      .from('organization_users')
      .select('organization_id, role, email, user_id, organizations(name, owner_email)')
      .eq('email', 'kellybsantoss@icloud.com')

    if (finalError) {
      console.error('❌ Erro na verificação final:', finalError)
      return
    }

    console.log('✅ Estado final da kelly:')
    finalCheck.forEach(orgUser => {
      console.log(`   - Organização: ${orgUser.organization_id}`)
      console.log(`   - Nome: ${orgUser.organizations?.name}`)
      console.log(`   - Owner: ${orgUser.organizations?.owner_email}`)
      console.log(`   - Role da kelly: ${orgUser.role}`)
      console.log(`   - User ID: ${orgUser.user_id || 'null (convite pendente)'}`)
    })

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

moveKellyToTemp2Org()