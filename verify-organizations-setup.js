const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyOrganizationsSetup() {
  console.log('🔍 VERIFICAÇÃO FINAL DO SETUP DAS ORGANIZAÇÕES\n')

  try {
    // 1. Testar função de organizações para agenda
    console.log('1️⃣ ORGANIZAÇÕES VÁLIDAS PARA ENVIO DE AGENDA:')

    try {
      const { data: validOrgs, error: validError } = await supabase
        .rpc('get_organizations_for_agenda')

      if (validError) {
        console.log('❌ Erro ao chamar função (pode ser que ainda não foi criada):', validError.message)
      } else if (validOrgs && validOrgs.length > 0) {
        console.log(`✅ ${validOrgs.length} organizações válidas encontradas:\n`)

        validOrgs.forEach((org, index) => {
          console.log(`📊 ${index + 1}. ${org.organization_name}`)
          console.log(`   🆔 ID: ${org.organization_id}`)
          console.log(`   📱 Telefone: ${org.normalized_phone}`)
          console.log(`   📧 Admin: ${org.owner_email}`)
          console.log(`   🔔 Notificações: ${org.enable_notifications ? 'ATIVADAS' : 'DESATIVADAS'}`)
          console.log(`   ⏰ Horário: ${org.notification_time}`)
          console.log(`   🌍 Timezone: ${org.timezone}`)
          console.log(`   💬 Template: "${org.agenda_template}"`)
          console.log('')
        })

        console.log('📋 DADOS PARA IMPLEMENTAÇÃO:')
        console.log('```javascript')
        console.log('const organizationsForAgenda = [')
        validOrgs.forEach((org, index) => {
          console.log('  {')
          console.log(`    id: "${org.organization_id}",`)
          console.log(`    name: "${org.organization_name}",`)
          console.log(`    phone: "${org.normalized_phone}",`)
          console.log(`    email: "${org.owner_email}",`)
          console.log(`    enabled: ${org.enable_notifications},`)
          console.log(`    time: "${org.notification_time}",`)
          console.log(`    timezone: "${org.timezone}",`)
          console.log(`    template: "${org.agenda_template}"`)
          console.log(`  }${index < validOrgs.length - 1 ? ',' : ''}`)
        })
        console.log(']')
        console.log('```\n')
      } else {
        console.log('⚠️ Nenhuma organização válida encontrada')
      }
    } catch (funcError) {
      console.log('⚠️ Função get_organizations_for_agenda não disponível ainda')
    }

    // 2. Verificar telefones atualizados
    console.log('2️⃣ VERIFICAÇÃO DOS TELEFONES:')

    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, owner_email, admin_phone')
      .order('name')

    if (orgsError) {
      console.error('❌ Erro ao buscar organizações:', orgsError.message)
      return
    }

    console.log(`📱 Status dos telefones (${orgs.length} organizações):\n`)

    orgs.forEach((org, index) => {
      const hasPhone = org.admin_phone && org.admin_phone.trim() !== ''
      const phoneStatus = hasPhone ? '✅' : '❌'

      console.log(`${phoneStatus} ${index + 1}. ${org.name}`)
      console.log(`   📞 Telefone: ${org.admin_phone || 'NÃO DEFINIDO'}`)
      console.log(`   📧 Admin: ${org.owner_email}`)
      console.log('')
    })

    // 3. Verificar configurações
    console.log('3️⃣ VERIFICAÇÃO DAS CONFIGURAÇÕES:')

    try {
      const { data: settings, error: settingsError } = await supabase
        .from('organization_settings')
        .select(`
          organization_id,
          enable_daily_agenda,
          notification_time,
          timezone,
          agenda_template,
          whatsapp_enabled,
          organizations(name)
        `)

      if (settingsError) {
        console.log('❌ Tabela organization_settings não encontrada:', settingsError.message)
      } else if (settings && settings.length > 0) {
        console.log(`✅ ${settings.length} configurações encontradas:\n`)

        settings.forEach((setting, index) => {
          console.log(`⚙️ ${index + 1}. ${setting.organizations?.name || 'N/A'}`)
          console.log(`   🔔 Agenda diária: ${setting.enable_daily_agenda ? 'ATIVADA' : 'DESATIVADA'}`)
          console.log(`   📱 WhatsApp: ${setting.whatsapp_enabled ? 'ATIVADO' : 'DESATIVADO'}`)
          console.log(`   ⏰ Horário: ${setting.notification_time}`)
          console.log(`   🌍 Timezone: ${setting.timezone}`)
          console.log(`   💬 Template: "${setting.agenda_template}"`)
          console.log('')
        })
      } else {
        console.log('⚠️ Nenhuma configuração encontrada')
      }
    } catch (settingsErr) {
      console.log('⚠️ Erro ao verificar configurações:', settingsErr.message)
    }

    // 4. Testar função de normalização de telefone
    console.log('4️⃣ TESTE DA FUNÇÃO DE NORMALIZAÇÃO:')

    const testPhones = [
      '+5583996910414',
      '+558396910414',
      '5583996910414',
      '83996910414',
      '(83) 99691-0414',
      '8399691414'
    ]

    try {
      for (const phone of testPhones) {
        const { data, error } = await supabase
          .rpc('normalize_phone_number', { phone_input: phone })

        if (error) {
          console.log(`❌ ${phone} -> ERRO: ${error.message}`)
        } else {
          console.log(`📞 ${phone} -> ${data || 'INVÁLIDO'}`)
        }
      }
    } catch (normalizeError) {
      console.log('⚠️ Função normalize_phone_number não disponível ainda')
    }

    // 5. Verificar logs (se existirem)
    console.log('\n5️⃣ VERIFICAÇÃO DOS LOGS:')

    try {
      const { data: logs, error: logsError } = await supabase
        .from('agenda_notifications_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (logsError) {
        console.log('❌ Tabela agenda_notifications_log não encontrada:', logsError.message)
      } else {
        console.log(`📋 ${logs.length} registros de log encontrados`)
        if (logs.length === 0) {
          console.log('✅ Sistema pronto para registrar logs de envio')
        }
      }
    } catch (logsErr) {
      console.log('⚠️ Erro ao verificar logs:', logsErr.message)
    }

    // 6. Resumo final
    console.log('\n6️⃣ RESUMO FINAL:')

    const validPhones = orgs.filter(org => org.admin_phone && org.admin_phone.trim() !== '').length
    const totalOrgs = orgs.length

    console.log('📊 ESTATÍSTICAS:')
    console.log(`   📈 Total de organizações: ${totalOrgs}`)
    console.log(`   ✅ Com telefone: ${validPhones}`)
    console.log(`   ❌ Sem telefone: ${totalOrgs - validPhones}`)
    console.log(`   📱 Taxa de cobertura: ${((validPhones / totalOrgs) * 100).toFixed(1)}%`)

    console.log('\n🎯 STATUS DO SISTEMA:')
    console.log(`   ✅ Tabela organizations: OK`)
    console.log(`   ✅ Campo admin_phone: OK`)
    console.log(`   ${validPhones > 0 ? '✅' : '❌'} Telefones válidos: ${validPhones > 0 ? 'OK' : 'PENDENTE'}`)

    console.log('\n💡 PRÓXIMOS PASSOS:')
    if (totalOrgs - validPhones > 0) {
      console.log(`   1. Adicionar telefones para ${totalOrgs - validPhones} organizações`)
    }
    console.log('   2. Executar SQL setup-organizations-for-agenda.sql no Supabase')
    console.log('   3. Implementar código de envio de agenda')
    console.log('   4. Configurar cron job para envio automático')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar
verifyOrganizationsSetup()
  .then(() => {
    console.log('\n✅ Verificação concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })