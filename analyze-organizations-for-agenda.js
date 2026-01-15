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

// Função para normalizar número de telefone para formato WhatsApp
function normalizePhoneNumber(phone) {
  if (!phone) return null

  // Remove todos os caracteres não numéricos
  const onlyNumbers = phone.replace(/\D/g, '')

  // Se já tem 13 dígitos (55 + DDD + número), está correto
  if (onlyNumbers.length === 13 && onlyNumbers.startsWith('55')) {
    return `+${onlyNumbers}`
  }

  // Se tem 12 dígitos e não começa com 55, adiciona o 55
  if (onlyNumbers.length === 12) {
    return `+55${onlyNumbers}`
  }

  // Se tem 11 dígitos (DDD + número), adiciona o 55
  if (onlyNumbers.length === 11) {
    return `+55${onlyNumbers}`
  }

  // Se tem 10 dígitos (DDD + número sem 9), adiciona 55 e 9
  if (onlyNumbers.length === 10) {
    // Adiciona o 9 após o DDD
    const ddd = onlyNumbers.substring(0, 2)
    const numero = onlyNumbers.substring(2)
    return `+55${ddd}9${numero}`
  }

  return null // Formato não reconhecido
}

// Função para validar formato de telefone para WhatsApp
function isValidWhatsAppNumber(phone) {
  const normalized = normalizePhoneNumber(phone)
  if (!normalized) return false

  // Deve ter exatamente 13 dígitos após o +
  const numbers = normalized.replace('+', '')
  return numbers.length === 13 && numbers.startsWith('55')
}

async function analyzeOrganizationsForAgenda() {
  console.log('📋 ANÁLISE COMPLETA DAS ORGANIZAÇÕES PARA ENVIO DE AGENDA\n')

  try {
    // 1. Buscar todas as organizações
    console.log('1️⃣ BUSCANDO TODAS AS ORGANIZAÇÕES...')
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    if (orgsError) {
      console.error('❌ Erro ao buscar organizações:', orgsError.message)
      return
    }

    if (!organizations || organizations.length === 0) {
      console.log('⚠️ Nenhuma organização encontrada!')
      return
    }

    console.log(`✅ Encontradas ${organizations.length} organizações\n`)

    // 2. Analisar cada organização
    console.log('2️⃣ ANÁLISE DETALHADA POR ORGANIZAÇÃO:\n')

    const validOrganizations = []
    const invalidOrganizations = []

    organizations.forEach((org, index) => {
      console.log(`📊 ORGANIZAÇÃO ${index + 1}: ${org.name}`)
      console.log(`   🆔 ID: ${org.id}`)
      console.log(`   📧 Owner Email: ${org.owner_email}`)

      // Verificar admin_phone
      const hasPhone = org.admin_phone && org.admin_phone.trim() !== ''
      const isValidPhone = hasPhone ? isValidWhatsAppNumber(org.admin_phone) : false
      const normalizedPhone = hasPhone ? normalizePhoneNumber(org.admin_phone) : null

      console.log(`   📞 Admin Phone: ${org.admin_phone || 'NÃO DEFINIDO'}`)

      if (hasPhone) {
        console.log(`   📱 Telefone Normalizado: ${normalizedPhone || 'FORMATO INVÁLIDO'}`)
        console.log(`   ✅ Válido para WhatsApp: ${isValidPhone ? 'SIM' : 'NÃO'}`)
      }

      // Verificar outros campos relevantes
      console.log(`   💰 Comissão Fixa: ${org.comissao_fixa_indicacao ? `R$ ${org.comissao_fixa_indicacao}` : 'NÃO DEFINIDA'}`)
      console.log(`   📅 Criada em: ${new Date(org.created_at).toLocaleDateString('pt-BR')}`)

      // Determinar se é válida para envio
      const isValid = hasPhone && isValidPhone
      console.log(`   🎯 STATUS: ${isValid ? '✅ VÁLIDA PARA ENVIO' : '❌ INVÁLIDA PARA ENVIO'}`)

      if (isValid) {
        validOrganizations.push({
          ...org,
          normalized_phone: normalizedPhone
        })
      } else {
        invalidOrganizations.push({
          ...org,
          reason: !hasPhone ? 'Sem telefone definido' : 'Formato de telefone inválido'
        })
      }

      console.log('   ---\n')
    })

    // 3. Resumo para implementação
    console.log('3️⃣ RESUMO PARA IMPLEMENTAÇÃO:\n')
    console.log(`📊 Total de organizações: ${organizations.length}`)
    console.log(`✅ Válidas para envio: ${validOrganizations.length}`)
    console.log(`❌ Inválidas para envio: ${invalidOrganizations.length}`)
    console.log(`📈 Taxa de sucesso: ${((validOrganizations.length / organizations.length) * 100).toFixed(1)}%\n`)

    // 4. Lista de organizações válidas
    if (validOrganizations.length > 0) {
      console.log('4️⃣ ORGANIZAÇÕES VÁLIDAS PARA ENVIO:\n')
      validOrganizations.forEach((org, index) => {
        console.log(`${index + 1}. ${org.name}`)
        console.log(`   📱 Telefone: ${org.normalized_phone}`)
        console.log(`   🆔 ID: ${org.id}`)
        console.log(`   📧 Admin: ${org.owner_email}`)
        console.log('')
      })
    }

    // 5. Lista de organizações inválidas
    if (invalidOrganizations.length > 0) {
      console.log('5️⃣ ORGANIZAÇÕES INVÁLIDAS (PRECISAM DE CORREÇÃO):\n')
      invalidOrganizations.forEach((org, index) => {
        console.log(`${index + 1}. ${org.name}`)
        console.log(`   ❌ Motivo: ${org.reason}`)
        console.log(`   📞 Telefone atual: ${org.admin_phone || 'N/A'}`)
        console.log(`   📧 Admin: ${org.owner_email}`)
        console.log('')
      })
    }

    // 6. Verificar se existe tabela de configurações para notificações
    console.log('6️⃣ VERIFICANDO CONFIGURAÇÕES DE NOTIFICAÇÕES:\n')

    try {
      // Tentar buscar tabela organization_settings
      const { data: settings, error: settingsError } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)

      if (settingsError) {
        console.log('⚠️ Tabela organization_settings não encontrada ou não acessível')
        console.log('💡 RECOMENDAÇÃO: Criar tabela para configurações de notificações')
        console.log('   - Campo: enable_daily_agenda (boolean)')
        console.log('   - Campo: notification_time (time)')
        console.log('   - Campo: timezone (text)')
      } else {
        console.log('✅ Tabela organization_settings encontrada')
        console.log('📋 Configurações existentes:', settings)
      }
    } catch (settingsErr) {
      console.log('⚠️ Erro ao verificar configurações:', settingsErr.message)
    }

    // 7. Verificar estrutura necessária para o código
    console.log('\n7️⃣ ESTRUTURA NECESSÁRIA PARA O CÓDIGO:\n')

    if (validOrganizations.length > 0) {
      console.log('📋 Exemplo de estrutura de dados para o código:')
      console.log('```javascript')
      console.log('const organizationsForAgenda = [')

      validOrganizations.forEach((org, index) => {
        console.log('  {')
        console.log(`    id: "${org.id}",`)
        console.log(`    name: "${org.name}",`)
        console.log(`    admin_phone: "${org.normalized_phone}",`)
        console.log(`    owner_email: "${org.owner_email}"`)
        console.log(index < validOrganizations.length - 1 ? '  },' : '  }')
      })

      console.log(']')
      console.log('```\n')
    }

    // 8. Query SQL recomendada
    console.log('8️⃣ QUERY SQL RECOMENDADA PARA BUSCAR ORGANIZAÇÕES:\n')
    console.log('```sql')
    console.log(`SELECT
  id,
  name,
  admin_phone,
  owner_email,
  created_at,
  updated_at
FROM organizations
WHERE admin_phone IS NOT NULL
  AND trim(admin_phone) != ''
  AND admin_phone ~ '^\\+?[0-9]{10,15}$'
ORDER BY name ASC;`)
    console.log('```\n')

    // 9. Recomendações de implementação
    console.log('9️⃣ RECOMENDAÇÕES DE IMPLEMENTAÇÃO:\n')

    console.log('🔧 CAMPOS NECESSÁRIOS:')
    console.log('   ✅ id - Para usar como userID na API WhatsApp')
    console.log('   ✅ admin_phone - Número do administrador (DISPONÍVEL)')
    console.log('   ✅ name - Nome da organização (DISPONÍVEL)')
    console.log('   ❓ Campo para ativar/desativar notificações (CRIAR)')

    console.log('\n📱 FORMATAÇÃO DE TELEFONES:')
    console.log('   ✅ Normalizar para formato +5583999999999')
    console.log('   ✅ Validar antes do envio')
    console.log('   ⚠️ 1 organização precisa de correção no telefone')

    console.log('\n🏗️ ESTRUTURA RECOMENDADA:')
    console.log('   1. Criar tabela organization_settings para configurações')
    console.log('   2. Adicionar função de normalização de telefone')
    console.log('   3. Validar telefones antes do envio')
    console.log('   4. Implementar log de envios')

    console.log('\n💡 PRÓXIMOS PASSOS:')
    console.log('   1. Corrigir telefone da "Admin Organization"')
    console.log('   2. Adicionar telefone para "Organização Temp2"')
    console.log('   3. Criar sistema de configurações de notificações')
    console.log('   4. Implementar envio de agenda')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar
analyzeOrganizationsForAgenda()
  .then(() => {
    console.log('\n✅ Análise concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })