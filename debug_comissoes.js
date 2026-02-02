require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugComissoes() {
  try {
    console.log('🔍 Analisando estrutura da tabela comissoes...\n')

    // 1. Verificar se a tabela existe e buscar algumas comissões
    console.log('1. Buscando comissões existentes...')
    const { data: comissoes, error: comissoesError } = await supabase
      .from('comissoes')
      .select('*')
      .limit(5)

    if (comissoesError) {
      console.error('❌ Erro ao buscar comissões:', comissoesError)
      return
    }

    console.log(`✅ Encontradas ${comissoes?.length || 0} comissões`)
    
    if (comissoes && comissoes.length > 0) {
      console.log('\n📋 Estrutura da primeira comissão:')
      console.log(JSON.stringify(comissoes[0], null, 2))
      
      // Verificar se tem a coluna percentual_comissao
      if (comissoes[0].percentual_comissao !== undefined) {
        console.log('✅ Coluna percentual_comissao existe!')
      } else {
        console.log('❌ Coluna percentual_comissao NÃO existe!')
      }
    }

    // 2. Verificar joins com mentorados e leads
    console.log('\n2. Testando joins com mentorados e leads...')
    const { data: comissoesComJoins, error: joinsError } = await supabase
      .from('comissoes')
      .select(`
        *,
        mentorados:mentorado_id (
          nome_completo,
          email
        ),
        leads:lead_id (
          nome_completo,
          empresa
        )
      `)
      .limit(3)

    if (joinsError) {
      console.error('❌ Erro nos joins:', joinsError)
    } else {
      console.log('✅ Joins funcionando!')
      if (comissoesComJoins && comissoesComJoins.length > 0) {
        console.log('\n📋 Primeira comissão com joins:')
        console.log(JSON.stringify(comissoesComJoins[0], null, 2))
      }
    }

    // 3. Testar uma atualização simples
    if (comissoes && comissoes.length > 0) {
      const primeiraComissao = comissoes[0]
      console.log(`\n3. Testando atualização da comissão ${primeiraComissao.id}...`)
      
      const { data: updateData, error: updateError } = await supabase
        .from('comissoes')
        .update({
          percentual_comissao: 5.0,
          updated_at: new Date().toISOString()
        })
        .eq('id', primeiraComissao.id)
        .select()

      if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError)
      } else {
        console.log('✅ Atualização bem-sucedida!')
        console.log('Resultado:', updateData)
      }
    }

    // 4. Verificar permissões RLS
    console.log('\n4. Verificando permissões...')
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('❌ Usuário não autenticado - isso pode causar problemas!')
    } else {
      console.log('✅ Usuário autenticado:', user.email)
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

debugComissoes()