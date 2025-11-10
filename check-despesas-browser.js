// Script para executar no console do navegador para verificar despesas_mensais
// Cole este código no console da página de pendências

async function verificarDespesas() {
  try {
    console.log('🔍 Verificando dados de despesas...')

    // Usar o supabase já disponível na página
    const { data: despesas, error } = await supabase
      .from('despesas_mensais')
      .select('*')
      .order('nome, ano')

    if (error) {
      console.error('❌ Erro:', error)
      return
    }

    console.log(`📊 Total registros: ${despesas.length}`)

    // Verificar registros sem data_vencimento
    const semData = despesas.filter(d => !d.data_vencimento)
    console.log(`⚠️ Sem data_vencimento: ${semData.length}`)

    if (semData.length > 0) {
      console.log('📋 Registros sem data:', semData.map(d => d.nome))
    }

    // Estatísticas por mentorado
    const grupos = {}
    despesas.forEach(d => {
      if (!grupos[d.nome]) grupos[d.nome] = []
      grupos[d.nome].push(d)
    })

    console.log('\n👥 Por mentorado:')
    Object.entries(grupos).forEach(([nome, registros]) => {
      const anos = registros.map(r => r.ano)
      const datas = [...new Set(registros.map(r => r.data_vencimento))]

      // Verificar se tem dívidas
      const temDividas = registros.some(r =>
        r.janeiro > 0 || r.fevereiro > 0 || r.marco > 0 || r.abril > 0 ||
        r.maio > 0 || r.junho > 0 || r.julho > 0 || r.agosto > 0 ||
        r.setembro > 0 || r.outubro > 0 || r.novembro > 0 || r.dezembro > 0
      )

      if (temDividas) {
        console.log(`  ${nome}: Anos[${anos}] Datas[${datas}]`)
      }
    })

    return { total: despesas.length, semData: semData.length, grupos }

  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

async function corrigirDespesasSemData() {
  try {
    console.log('🔧 Corrigindo registros sem data_vencimento...')

    // Buscar registros sem data
    const { data: semData } = await supabase
      .from('despesas_mensais')
      .select('*')
      .is('data_vencimento', null)

    console.log(`🎯 Encontrados ${semData?.length || 0} registros para corrigir`)

    if (semData && semData.length > 0) {
      for (const registro of semData) {
        const novaData = `${registro.ano}-01-15`

        const { error } = await supabase
          .from('despesas_mensais')
          .update({ data_vencimento: novaData })
          .eq('id', registro.id)

        if (error) {
          console.error(`❌ Erro em ${registro.nome}:`, error)
        } else {
          console.log(`✅ ${registro.nome} (${registro.ano}) -> ${novaData}`)
        }
      }

      console.log('🎉 Correção concluída! Recarregue a página para ver as mudanças.')
    } else {
      console.log('✅ Todos os registros já têm data_vencimento!')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

// Exportar para uso no console
window.verificarDespesas = verificarDespesas
window.corrigirDespesasSemData = corrigirDespesasSemData

console.log('🚀 Funções carregadas! Execute:')
console.log('  verificarDespesas() - para ver estatísticas')
console.log('  corrigirDespesasSemData() - para corrigir dados')