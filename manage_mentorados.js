const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://udzmlnnztzzwrphhizol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'
)

const mentoradosData = [
  { nome: 'Mariana Cardoso Fernandes', email: 'maricf1993@gmail.com' },
  { nome: 'Nathalia Dutra Naves', email: 'nathalianavesmed@gmail.com' },
  { nome: 'Ana Luísa Brito de Carvalho', email: 'analubdcped@gmail.com' },
  { nome: 'Daniella Alencar Silva', email: 'danialencar0@gmail.com' },
  { nome: 'Gustavo Denuncio', email: 'xaviermwind@gmail.com' },
  { nome: 'Caio Da Macena Barbosa', email: 'caionutrologo@gmail.com' },
  { nome: 'Luiz Augusto de Araujo Pereira Junior', email: 'luizaugustojr7@gmail.com' },
  { nome: 'Tatiane Castro', email: 'Tati_castro0@hotmail.com' },
  { nome: 'Matheus Gomes Diniz e Silva', email: 'Matheusdiniz6@hotmail.com' },
  { nome: 'RUBENS CLEYTON DA SILVA MENDES', email: 'rubens.ws@gmail.com' },
  { nome: 'Fernanda Maria Carvalho Possani', email: 'fernandamcpossani@hotmail.com' },
  { nome: 'Paulo Vitor de Freitas Fernandes', email: 'paulovitorrn@hotmail.com' },
  { nome: 'PEDRO PAULO ASSUNÇÃO DA SILVA', email: 'pedroassuncaopaulo@gmail.com' },
  { nome: 'Isabella Gonçalves Andrade', email: 'draisabellagandrade@gmail.com' },
  { nome: 'Bruno Angelo Silva', email: 'brunoangelo06@gmail.com' },
  { nome: 'Mariana Alves Pineze', email: 'mapineze@hotmail.com' },
  { nome: 'Jefferson Venicius Andrade Pontes', email: 'jeffpontes1328@gmail.com' },
  { nome: 'Márcia de Britto da Rocha', email: 'dramarcia1969@gmail.com' },
  { nome: 'Larissa Lopes', email: 'lari.lopes@hotmail.com' },
  { nome: 'Camila Aquino', email: 'Kmilaaquino3@gmail.com' },
  { nome: 'Aguinaldo José Soares Filho', email: 'draguinaldofilho@gmail.com' },
  { nome: 'Camila Teixeira Amaro Vieira', email: 'camilateixeiraav@hotmail.com' },
  { nome: 'Thiago Medina', email: 'Thiago.codarin@hotmail.com' },
  { nome: 'Jessica Sztajn Bittencourt', email: 'jsztajn@gmail.com' },
  { nome: 'Débora de Souza Ferreira', email: 'deborarxt@gmail.com' },
  { nome: 'Ton Jeferson da Cunha Carvalho', email: 'tonjeferson@gmail.com' },
  { nome: 'Dionline Borges Paulo', email: 'dionlineborges19@gmail.com' },
  { nome: 'Lucas ferreira vilarinho', email: 'lucfvil@gmail.com' },
  { nome: 'Karina Ferreira', email: 'kari.ferreira@yahoo.com.br' },
  { nome: 'Rafael Faria Gil', email: 'rafaelfariagil@gmail.com' },
  { nome: 'Mila Cruz', email: 'milacruz787@gmail.com' },
  { nome: 'Ana Flávia Assis Silva', email: 'anafas2010@gmail.com' },
  { nome: 'Marcela Mascaro Fachini', email: 'ma_mascaro@hotmail.com' },
  { nome: 'Julia Rios', email: 'julia_rios22@hotmail.com' },
  { nome: 'Ruan Mathias Sousa Dias', email: 'ruanmathiassousa@gmail.com' },
  { nome: 'Raissa Campelo Esteves Maranha', email: 'raissacampelo@msn.com' },
  { nome: 'Andressa Ferreira', email: 'andressa.fbaf@hotmail.com' },
  { nome: 'BEATRIZ VIEIRA GURGEL', email: 'beatrizvieiragurgel@gmail.com' },
  { nome: 'Marcus Da Silva Sardinha', email: 'marcussardinha67@gmail.com' },
  { nome: 'Ana Christina Ferreira Costa', email: 'ana.chris05@hotmail.com' },
  { nome: 'Guilherme Cézar Soares', email: 'guilhermecezarsoares@gmail.com' },
  { nome: 'João Paulo Guimarães Pena', email: 'jpgpena2014@gmail.com' },
  { nome: 'Bruna Menin', email: 'brumenin@hotmail.com' },
  { nome: 'Lidiane', email: '123.lc96@gmail.com' },
  { nome: 'Caroline Dutra', email: 'Caroline.Dutrac@hotmail.com' },
  { nome: 'Paloma Fernandes de Oliveira', email: 'palomafernandesmedica@gmail.com' },
  { nome: 'Laura Mittmann Reis', email: 'lauramittmannreis@gmail.com' },
  { nome: 'Michel Furtado', email: 'mrodriguesfurtado05@gmail.com' },
  { nome: 'ISABELA KLAUTAU LEITE CHAVES BORGES', email: 'isabelaklchaves@gmail.com' },
  { nome: 'Keila possmoser', email: 'med.keilapossmoser@hotmail.com' },
  { nome: 'Thaís da Costa Siqueira de Oliveira', email: 'thais_csiqueira@hotmail.com' },
  { nome: 'Sara Campos de Oliveira', email: 'saracamposmed@outlook.com' },
  { nome: 'Analu lessa', email: 'Lalulessa@hotmail.com' },
  { nome: 'Luiz Fernando Cambraia Gatti', email: 'lfcgatti@hotmail.com' },
  { nome: 'Diogo Machado Amaral', email: 'diogotelex1@gmail.com' },
  { nome: 'Maria Vitória Coutinho', email: 'dramariavitoriacoutinho@hotmail.com' },
  { nome: 'Ewerton Vignolli Correa', email: 'ewertonvignolli@gmail.com' },
  { nome: 'Icaro de Azevedo Alexandre', email: 'icaroazevedo10@hotmail.com' }
]

async function manageMentorados() {
  console.log('🔍 Verificando mentorados existentes...')

  // Buscar mentorados existentes
  const { data: existing, error: fetchError } = await supabase
    .from('mentorados')
    .select('id, nome_completo, email')

  if (fetchError) {
    console.error('❌ Erro ao buscar mentorados:', fetchError)
    return
  }

  console.log(`✅ ${existing.length} mentorados encontrados no banco`)

  for (const mentorado of mentoradosData) {
    const existingMentorado = existing.find(m =>
      m.nome_completo.toLowerCase().trim() === mentorado.nome.toLowerCase().trim()
    )

    if (existingMentorado) {
      // Verificar se email precisa ser atualizado
      if (existingMentorado.email !== mentorado.email) {
        console.log(`🔧 Atualizando email de ${mentorado.nome}: ${existingMentorado.email} → ${mentorado.email}`)

        const { error: updateError } = await supabase
          .from('mentorados')
          .update({ email: mentorado.email })
          .eq('id', existingMentorado.id)

        if (updateError) {
          console.error(`❌ Erro ao atualizar ${mentorado.nome}:`, updateError)
        } else {
          console.log(`✅ Email atualizado para ${mentorado.nome}`)
        }
      } else {
        console.log(`✓ ${mentorado.nome} já existe com email correto`)
      }
    } else {
      // Criar novo mentorado
      console.log(`➕ Criando novo mentorado: ${mentorado.nome}`)

      const { error: insertError } = await supabase
        .from('mentorados')
        .insert({
          nome_completo: mentorado.nome,
          email: mentorado.email,
          password_hash: 'medicosderesultado',
          status_login: 'ativo',
          estado_entrada: 'ativo',
          estado_atual: 'ativo',
          data_entrada: new Date().toISOString()
        })

      if (insertError) {
        console.error(`❌ Erro ao criar ${mentorado.nome}:`, insertError)
      } else {
        console.log(`✅ Criado: ${mentorado.nome}`)
      }
    }
  }

  console.log('🎉 Processamento concluído!')
}

manageMentorados().catch(console.error)