const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createSamplePendencias() {
  try {
    // Fazer login
    const { data: loginData } = await supabase.auth.signInWithPassword({
      email: 'temp2@admin.com',
      password: '123@Admin'
    })

    console.log('✅ Login realizado')

    const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b'

    // Buscar alguns mentorados para criar dívidas
    const { data: mentorados } = await supabase
      .from('mentorados')
      .select('id, nome_completo')
      .eq('organization_id', orgId)
      .limit(5)

    console.log(`👥 Encontrados ${mentorados?.length || 0} mentorados`)

    if (mentorados && mentorados.length > 0) {
      // 1. CRIAR DÍVIDAS DE TESTE
      console.log('\n💰 CRIANDO DÍVIDAS DE TESTE...')

      const datas = [
        { mes: '01', valor: 500 },
        { mes: '02', valor: 750 },
        { mes: '03', valor: 600 },
        { mes: '12', valor: 800 }, // Atraso
        { mes: '01', valor: 400 }, // Próximo vencimento
      ]

      const dividas = []
      for (let i = 0; i < Math.min(3, mentorados.length); i++) {
        const mentorado = mentorados[i]

        datas.forEach((data, index) => {
          const ano = data.mes === '12' ? '2024' : '2025' // 2024 para simular atraso
          dividas.push({
            mentorado_id: mentorado.id,
            mentorado_nome: mentorado.nome_completo,
            valor: data.valor + (i * 50),
            data_vencimento: `${ano}-${data.mes}-15`,
            status: 'pendente'
            // Não incluir organization_id porque a tabela não tem essa coluna
          })
        })
      }

      console.log(`📝 Tentando inserir ${dividas.length} dívidas...`)

      // Inserir uma por vez para identificar erros específicos
      let sucessos = 0
      let erros = 0

      for (const divida of dividas) {
        try {
          const { data, error } = await supabase
            .from('dividas')
            .insert(divida)
            .select()

          if (error) {
            console.log(`❌ Erro: ${error.message}`)
            erros++
          } else {
            console.log(`✅ Dívida criada: ${divida.mentorado_nome} - R$ ${divida.valor}`)
            sucessos++
          }
        } catch (err) {
          console.log(`❌ Erro: ${err.message}`)
          erros++
        }
      }

      console.log(`\n📊 Resultado: ${sucessos} sucessos, ${erros} erros`)

      // 2. CRIAR COMISSÕES DE TESTE
      console.log('\n💼 CRIANDO COMISSÕES DE TESTE...')

      const comissoes = []
      for (let i = 0; i < Math.min(2, mentorados.length); i++) {
        const mentorado = mentorados[i]
        comissoes.push({
          mentorado_id: mentorado.id,
          valor_comissao: 200 + (i * 100),
          percentual_comissao: 10 + (i * 5),
          status_pagamento: 'pendente'
          // Não incluir organization_id porque a tabela não tem essa coluna
        })
      }

      console.log(`📝 Tentando inserir ${comissoes.length} comissões...`)

      // Inserir comissões
      let sucessosComissoes = 0
      let errosComissoes = 0

      for (const comissao of comissoes) {
        try {
          const { data, error } = await supabase
            .from('comissoes')
            .insert(comissao)
            .select()

          if (error) {
            console.log(`❌ Comissão erro: ${error.message}`)
            errosComissoes++
          } else {
            console.log(`✅ Comissão criada: R$ ${comissao.valor_comissao}`)
            sucessosComissoes++
          }
        } catch (err) {
          console.log(`❌ Comissão erro: ${err.message}`)
          errosComissoes++
        }
      }

      console.log(`\n📊 Comissões: ${sucessosComissoes} sucessos, ${errosComissoes} erros`)

    } else {
      console.log('❌ Nenhum mentorado encontrado')
    }

    // 3. VERIFICAR RESULTADOS FINAIS
    console.log('\n📊 VERIFICAÇÃO FINAL...')

    const { data: totalDividas } = await supabase.from('dividas').select('*')
    const { data: totalComissoes } = await supabase.from('comissoes').select('*')

    console.log(`💰 Total de dívidas: ${totalDividas?.length || 0}`)
    console.log(`💼 Total de comissões: ${totalComissoes?.length || 0}`)

    if (totalDividas && totalDividas.length > 0) {
      console.log('\n📋 Algumas dívidas criadas:')
      totalDividas.slice(0, 3).forEach(d => {
        console.log(`   - ${d.mentorado_nome}: R$ ${d.valor} (${d.data_vencimento})`)
      })
    }

    await supabase.auth.signOut()

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

createSamplePendencias()