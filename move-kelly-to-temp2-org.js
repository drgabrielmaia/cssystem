// Script para mover kelly para organização do temp2@admin.com
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function moveKellyToTemp2Org() {
  try {
    console.log('🔄 Movendo kellybsantoss@icloud.com para organização do temp2@admin.com...')

    // 1. Buscar usuário kelly
    const { data: kellyUser, error: kellyError } = await supabase.auth.admin.listUsers()

    const kelly = kellyUser?.users?.find(u => u.email === 'kellybsantoss@icloud.com')

    if (!kelly) {
      console.log('❌ Usuário kelly não encontrado')
      return
    }

    if (kellyError) {
      console.error('❌ Erro ao buscar usuário kelly:', kellyError)
      return
    }

    if (!kellyUser) {
      console.log('❌ Usuário kelly não encontrado')
      return
    }

    console.log('✅ Kelly encontrada:', kellyUser)

    // 2. Buscar usuário temp2@admin.com
    const { data: temp2User, error: temp2Error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'temp2@admin.com')
      .single()

    if (temp2Error) {
      console.error('❌ Erro ao buscar usuário temp2:', temp2Error)
      return
    }

    if (!temp2User) {
      console.log('❌ Usuário temp2@admin.com não encontrado')
      return
    }

    console.log('✅ Temp2 encontrado:', temp2User)

    // 3. Buscar organização do temp2
    const { data: temp2OrgUser, error: temp2OrgError } = await supabase
      .from('organization_users')
      .select('organization_id, organizations(*)')
      .eq('user_id', temp2User.id)
      .single()

    if (temp2OrgError) {
      console.error('❌ Erro ao buscar organização do temp2:', temp2OrgError)
      return
    }

    const temp2OrgId = temp2OrgUser.organization_id
    console.log('✅ Organização do temp2:', temp2OrgId)

    // 4. Verificar se kelly já está em alguma organização
    const { data: kellyOrgUsers, error: kellyOrgError } = await supabase
      .from('organization_users')
      .select('*')
      .eq('user_id', kellyUser.id)

    if (kellyOrgError) {
      console.error('❌ Erro ao buscar organizações da kelly:', kellyOrgError)
      return
    }

    console.log(`📋 Kelly está em ${kellyOrgUsers.length} organização(ões)`)

    // 5. Remover kelly de todas as organizações atuais
    if (kellyOrgUsers.length > 0) {
      console.log('🗑️ Removendo kelly das organizações atuais...')

      for (const orgUser of kellyOrgUsers) {
        const { error: deleteError } = await supabase
          .from('organization_users')
          .delete()
          .eq('id', orgUser.id)

        if (deleteError) {
          console.error('❌ Erro ao remover da organização:', deleteError)
          return
        }

        console.log(`✅ Removida da organização: ${orgUser.organization_id}`)
      }
    }

    // 6. Adicionar kelly na organização do temp2
    console.log('➕ Adicionando kelly na organização do temp2...')

    const { data: newOrgUser, error: addError } = await supabase
      .from('organization_users')
      .insert([{
        organization_id: temp2OrgId,
        user_id: kellyUser.id,
        email: kellyUser.email,
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

    // 7. Verificar o resultado final
    console.log('\n🔍 Verificando resultado final...')

    const { data: finalCheck, error: finalError } = await supabase
      .from('organization_users')
      .select('organization_id, role, organizations(name, owner_email)')
      .eq('user_id', kellyUser.id)

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
    })

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

moveKellyToTemp2Org()