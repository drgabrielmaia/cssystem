const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createTestDividas() {
  try {
    // Fazer login
    const { data: loginData } = await supabase.auth.signInWithPassword({
      email: 'temp2@admin.com',
      password: '123@Admin'
    })

    console.log('✅ Login realizado')

    // Buscar alguns mentorados para criar dívidas
    const { data: mentorados } = await supabase
      .from('mentorados')
      .select('id, nome_completo')
      .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
      .limit(5)

    console.log(`📊 Encontrados ${mentorados?.length || 0} mentorados`)

    if (mentorados && mentorados.length > 0) {
      // Criar dívidas de teste
      const testDividas = []

      for (let i = 0; i < Math.min(3, mentorados.length); i++) {
        const mentorado = mentorados[i]

        // Criar dívidas para diferentes meses
        const dividas = [
          {
            mentorado_id: mentorado.id,
            mentorado_nome: mentorado.nome_completo,
            valor: 500.00 + (i * 100),
            data_vencimento: `2025-${String(i + 1).padStart(2, '0')}-15`,
            status: 'pendente'
          },
          {
            mentorado_id: mentorado.id,
            mentorado_nome: mentorado.nome_completo,
            valor: 750.00 + (i * 50),
            data_vencimento: `2025-${String(i + 2).padStart(2, '0')}-15`,
            status: 'pendente'
          }
        ]

        testDividas.push(...dividas)
      }

      console.log(`💰 Criando ${testDividas.length} dívidas de teste...`)

      const { data: dividasData, error: dividasError } = await supabase
        .from('dividas')
        .insert(testDividas)
        .select()

      if (dividasError) {
        console.error('❌ Erro ao criar dívidas:', dividasError.message)
      } else {
        console.log(`✅ ${dividasData.length} dívidas criadas com sucesso!`)

        console.log('\n📋 Dívidas criadas:')
        dividasData.forEach(divida => {
          console.log(`   - ${divida.mentorado_nome}: R$ ${divida.valor} (${divida.data_vencimento})`)
        })
      }
    } else {
      console.log('❌ Nenhum mentorado encontrado para criar dívidas')
    }

    // Verificar total de dívidas
    const { data: totalDividas } = await supabase
      .from('dividas')
      .select('*')

    console.log(`\n📊 Total de dívidas no sistema: ${totalDividas?.length || 0}`)

    await supabase.auth.signOut()

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

createTestDividas()