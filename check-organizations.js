const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkOrganizations() {
  try {
    console.log('🏢 Verificando organizações existentes...\n')

    // Buscar todas as organizações
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at')

    if (orgError) {
      console.error('❌ Erro ao buscar organizações:', orgError.message)
      return
    }

    console.log(`📊 Total de organizações: ${organizations.length}\n`)

    // Listar organizações
    for (const org of organizations) {
      console.log(`🏢 ${org.name}`)
      console.log(`   📧 Owner: ${org.owner_email}`)
      console.log(`   🆔 ID: ${org.id}`)
      console.log(`   📅 Criada: ${new Date(org.created_at).toLocaleString()}`)
      console.log(`   ✅ Ativa: ${org.is_active !== false ? 'Sim' : 'Não'}`)

      // Buscar usuários desta organização
      const { data: orgUsers } = await supabase
        .from('organization_users')
        .select('*')
        .eq('organization_id', org.id)

      console.log(`   👥 Usuários: ${orgUsers?.length || 0}`)
      if (orgUsers && orgUsers.length > 0) {
        orgUsers.forEach(user => {
          console.log(`      - ${user.email || 'Email não definido'} (${user.role})`)
        })
      }

      // Contar dados desta organização
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', org.id)

      const { data: mentorados } = await supabase
        .from('mentorados')
        .select('id')
        .eq('organization_id', org.id)

      console.log(`   📊 Dados: ${leads?.length || 0} leads, ${mentorados?.length || 0} mentorados`)
      console.log('')
    }

    // Verificar se existe organização do admin@admin.com
    const adminOrg = organizations.find(org => org.owner_email === 'admin@admin.com')
    const newAdminOrg = organizations.find(org => org.owner_email === 'gabrielmaia@gmail.com')

    if (adminOrg && newAdminOrg) {
      console.log('🔄 OPÇÕES DISPONÍVEIS:')
      console.log('1. Manter organizações separadas (dados isolados)')
      console.log('2. Transferir todos os dados da organização antiga para a nova')
      console.log('3. Adicionar novo usuário como owner da organização antiga')
      console.log('')
      console.log('💡 Se quiser transferir dados, posso criar um script para isso!')
    }

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

checkOrganizations()