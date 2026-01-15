const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'OK' : 'MISSING')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkOrganizationsStructure() {
  console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA ORGANIZATIONS...\n')

  try {
    // 1. Verificar estrutura da tabela organizations
    console.log('1️⃣ ESTRUTURA DA TABELA ORGANIZATIONS:')
    const { data: tableStructure, error: structureError } = await supabase
      .rpc('get_table_columns', { table_name: 'organizations' })

    if (structureError) {
      console.log('❌ Erro ao buscar estrutura da tabela (tentando método alternativo):', structureError.message)

      // Método alternativo: buscar um registro para ver as colunas
      const { data: sampleData, error: sampleError } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)

      if (sampleError) {
        console.error('❌ Erro ao buscar dados da tabela:', sampleError.message)
        return
      }

      if (sampleData && sampleData.length > 0) {
        console.log('📋 Colunas disponíveis na tabela organizations:')
        Object.keys(sampleData[0]).forEach((column, index) => {
          console.log(`   ${index + 1}. ${column}: ${typeof sampleData[0][column]}`)
        })
      }
    } else {
      console.log('📋 Estrutura da tabela:', tableStructure)
    }

    console.log('\n2️⃣ DADOS DAS ORGANIZAÇÕES:')

    // 2. Buscar todas as organizações
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

    console.log(`✅ Encontradas ${organizations.length} organizações:\n`)

    organizations.forEach((org, index) => {
      console.log(`📊 ORGANIZAÇÃO ${index + 1}:`)
      console.log(`   🆔 ID: ${org.id}`)
      console.log(`   📛 Nome: ${org.name}`)
      console.log(`   📧 Owner Email: ${org.owner_email}`)
      console.log(`   📞 Admin Phone: ${org.admin_phone || 'NÃO DEFINIDO'}`)
      console.log(`   📅 Criada em: ${new Date(org.created_at).toLocaleString('pt-BR')}`)
      if (org.updated_at) {
        console.log(`   🔄 Atualizada em: ${new Date(org.updated_at).toLocaleString('pt-BR')}`)
      }
      if (org.comissao_fixa_indicacao) {
        console.log(`   💰 Comissão Fixa: R$ ${org.comissao_fixa_indicacao}`)
      }
      console.log('   ---')
    })

    // 3. Verificar organizações com admin_phone preenchido
    console.log('\n3️⃣ ORGANIZAÇÕES COM ADMIN_PHONE:')
    const orgsWithPhone = organizations.filter(org => org.admin_phone && org.admin_phone.trim() !== '')

    if (orgsWithPhone.length === 0) {
      console.log('⚠️ Nenhuma organização tem admin_phone preenchido!')
    } else {
      console.log(`✅ ${orgsWithPhone.length} organizações têm admin_phone:`)
      orgsWithPhone.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.name} - ${org.admin_phone}`)
      })
    }

    // 4. Verificar organizações sem admin_phone
    console.log('\n4️⃣ ORGANIZAÇÕES SEM ADMIN_PHONE:')
    const orgsWithoutPhone = organizations.filter(org => !org.admin_phone || org.admin_phone.trim() === '')

    if (orgsWithoutPhone.length === 0) {
      console.log('✅ Todas as organizações têm admin_phone!')
    } else {
      console.log(`⚠️ ${orgsWithoutPhone.length} organizações sem admin_phone:`)
      orgsWithoutPhone.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.name} (${org.owner_email})`)
      })
    }

    // 5. Estatísticas para implementação
    console.log('\n5️⃣ ESTATÍSTICAS PARA IMPLEMENTAÇÃO:')
    console.log(`📊 Total de organizações: ${organizations.length}`)
    console.log(`✅ Com admin_phone: ${orgsWithPhone.length}`)
    console.log(`❌ Sem admin_phone: ${orgsWithoutPhone.length}`)
    console.log(`📱 Organizações válidas para envio: ${orgsWithPhone.length}`)

    // 6. Exemplo de estrutura para o código
    console.log('\n6️⃣ ESTRUTURA PARA O CÓDIGO:')
    if (orgsWithPhone.length > 0) {
      console.log('📋 Exemplo de organização válida:')
      const example = orgsWithPhone[0]
      console.log(JSON.stringify({
        id: example.id,
        name: example.name,
        admin_phone: example.admin_phone,
        owner_email: example.owner_email
      }, null, 2))
    }

    // 7. Verificar formato dos telefones
    console.log('\n7️⃣ VERIFICAÇÃO DE FORMATO DOS TELEFONES:')
    if (orgsWithPhone.length > 0) {
      console.log('📞 Análise dos formatos de telefone:')
      orgsWithPhone.forEach((org, index) => {
        const phone = org.admin_phone
        const hasCountryCode = phone.startsWith('+55')
        const onlyNumbers = phone.replace(/\D/g, '')

        console.log(`   ${index + 1}. ${org.name}:`)
        console.log(`      📞 Original: ${phone}`)
        console.log(`      🌍 Com código país: ${hasCountryCode ? 'SIM' : 'NÃO'}`)
        console.log(`      🔢 Apenas números: ${onlyNumbers}`)
        console.log(`      📏 Tamanho: ${onlyNumbers.length} dígitos`)

        // Verificar se está no formato correto para WhatsApp
        if (hasCountryCode && onlyNumbers.length === 13) {
          console.log(`      ✅ Formato válido para WhatsApp`)
        } else {
          console.log(`      ⚠️ Pode precisar de formatação`)
        }
        console.log('')
      })
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar
checkOrganizationsStructure()
  .then(() => {
    console.log('\n✅ Verificação concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })