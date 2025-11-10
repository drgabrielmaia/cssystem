// Script para verificar e corrigir dados da tabela despesas_mensais
import { createClient } from '@supabase/supabase-js'

// Configure suas variáveis do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndFixDespesas() {
  try {
    console.log('🔍 Verificando tabela despesas_mensais...')

    // 1. Buscar todos os registros
    const { data: despesas, error } = await supabase
      .from('despesas_mensais')
      .select('*')
      .order('nome, ano')

    if (error) {
      console.error('❌ Erro ao buscar despesas:', error)
      return
    }

    console.log(`📊 Total de registros encontrados: ${despesas?.length}`)

    // 2. Verificar registros sem data_vencimento
    const semDataVencimento = despesas?.filter(d => !d.data_vencimento) || []
    console.log(`⚠️ Registros sem data_vencimento: ${semDataVencimento.length}`)

    // 3. Mostrar estatísticas por mentorado
    const porMentorado = new Map()
    despesas?.forEach(despesa => {
      if (!porMentorado.has(despesa.nome)) {
        porMentorado.set(despesa.nome, [])
      }
      porMentorado.get(despesa.nome).push(despesa)
    })

    console.log('\n📋 Resumo por mentorado:')
    porMentorado.forEach((registros, nome) => {
      const anos = registros.map(r => r.ano).join(', ')
      const datas = [...new Set(registros.map(r => r.data_vencimento))].join(', ')
      const temDividas = registros.some(r =>
        r.janeiro > 0 || r.fevereiro > 0 || r.marco > 0 || r.abril > 0 ||
        r.maio > 0 || r.junho > 0 || r.julho > 0 || r.agosto > 0 ||
        r.setembro > 0 || r.outubro > 0 || r.novembro > 0 || r.dezembro > 0
      )

      if (temDividas) {
        console.log(`  👤 ${nome}:`)
        console.log(`     📅 Anos: ${anos}`)
        console.log(`     🗓️ Datas vencimento: ${datas}`)

        // Contar meses com dívidas
        let totalMesesComDividas = 0
        registros.forEach(registro => {
          const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
                        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

          meses.forEach(mes => {
            if (registro[mes] && registro[mes] > 0) {
              totalMesesComDividas++
            }
          })
        })
        console.log(`     💰 Total de meses com dívidas: ${totalMesesComDividas}`)
      }
    })

    // 4. Corrigir registros sem data_vencimento
    if (semDataVencimento.length > 0) {
      console.log('\n🔧 Corrigindo registros sem data_vencimento...')

      for (const registro of semDataVencimento) {
        const dataVencimento = `${registro.ano}-01-15`

        const { error: updateError } = await supabase
          .from('despesas_mensais')
          .update({ data_vencimento: dataVencimento })
          .eq('id', registro.id)

        if (updateError) {
          console.error(`❌ Erro ao atualizar ${registro.nome}:`, updateError)
        } else {
          console.log(`✅ Atualizado ${registro.nome} (${registro.ano}): ${dataVencimento}`)
        }
      }
    }

    // 5. Verificação final
    const { data: despesasAtualizadas } = await supabase
      .from('despesas_mensais')
      .select('*')

    const aindaSemData = despesasAtualizadas?.filter(d => !d.data_vencimento) || []

    console.log('\n📊 Estatísticas finais:')
    console.log(`  Total de registros: ${despesasAtualizadas?.length}`)
    console.log(`  Com data_vencimento: ${(despesasAtualizadas?.length || 0) - aindaSemData.length}`)
    console.log(`  Sem data_vencimento: ${aindaSemData.length}`)
    console.log(`  Mentorados únicos: ${porMentorado.size}`)

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAndFixDespesas()
}

export default checkAndFixDespesas