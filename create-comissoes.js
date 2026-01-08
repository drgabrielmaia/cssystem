const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createComissoes() {
  try {
    // Fazer login
    const { data: loginData } = await supabase.auth.signInWithPassword({
      email: 'temp2@admin.com',
      password: '123@Admin'
    })

    console.log('✅ Login realizado')

    const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b'

    // Buscar alguns leads para associar às comissões
    const { data: leads } = await supabase
      .from('leads')
      .select('id, nome_completo')
      .eq('organization_id', orgId)
      .limit(3)

    console.log(`🎯 Leads encontrados: ${leads?.length || 0}`)

    if (leads && leads.length > 0) {
      const comissoes = []

      leads.forEach((lead, index) => {
        comissoes.push({
          lead_id: lead.id,
          valor_comissao: 300 + (index * 150),
          percentual_comissao: 10 + (index * 5),
          status_pagamento: 'pendente'
        })
      })

      console.log(`💼 Criando ${comissoes.length} comissões...`)

      let sucessos = 0
      for (const comissao of comissoes) {
        try {
          const { data, error } = await supabase
            .from('comissoes')
            .insert(comissao)
            .select()

          if (error) {
            console.log(`❌ Erro: ${error.message}`)
          } else {
            console.log(`✅ Comissão criada: R$ ${comissao.valor_comissao}`)
            sucessos++
          }
        } catch (err) {
          console.log(`❌ Erro: ${err.message}`)
        }
      }

      console.log(`📊 ${sucessos} comissões criadas com sucesso!`)
    } else {
      console.log('❌ Nenhum lead encontrado. Vamos criar alguns leads primeiro...')

      // Criar alguns leads para depois criar comissões
      const mentorados = await supabase
        .from('mentorados')
        .select('id, nome_completo, email')
        .eq('organization_id', orgId)
        .limit(3)

      if (mentorados.data && mentorados.data.length > 0) {
        console.log('📝 Criando leads baseados nos mentorados...')

        const leadsToCreate = mentorados.data.slice(0, 2).map(mentorado => ({
          nome_completo: mentorado.nome_completo,
          email: mentorado.email,
          telefone: '11999999999',
          organization_id: orgId,
          status: 'novo',
          origem: 'sistema'
        }))

        let leadsCreated = 0
        for (const lead of leadsToCreate) {
          try {
            const { data: leadData, error } = await supabase
              .from('leads')
              .insert(lead)
              .select()

            if (!error && leadData[0]) {
              console.log(`✅ Lead criado: ${lead.nome_completo}`)
              leadsCreated++

              // Criar comissão para este lead
              const { data: comissaoData, error: comissaoError } = await supabase
                .from('comissoes')
                .insert({
                  lead_id: leadData[0].id,
                  valor_comissao: 400 + (leadsCreated * 100),
                  percentual_comissao: 15,
                  status_pagamento: 'pendente'
                })
                .select()

              if (!comissaoError) {
                console.log(`✅ Comissão criada para ${lead.nome_completo}: R$ ${400 + (leadsCreated * 100)}`)
              } else {
                console.log(`❌ Erro na comissão: ${comissaoError.message}`)
              }
            }
          } catch (err) {
            console.log(`❌ Erro ao criar lead: ${err.message}`)
          }
        }
      }
    }

    // Verificar totais finais
    const { data: totalComissoes } = await supabase
      .from('comissoes')
      .select('*')
      .eq('status_pagamento', 'pendente')

    console.log(`\n📊 Total de comissões pendentes: ${totalComissoes?.length || 0}`)

    await supabase.auth.signOut()

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

createComissoes()