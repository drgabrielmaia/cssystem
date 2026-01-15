import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Lista de mentorados fornecida
const mentoradosData = `2026/01/12 10:48:08 PM GMT-3    Mariana Cardoso Fernandes     maricf1993@gmail.com
2026/01/12 10:48:24 PM GMT-3    Nathalia Dutra Naves    nathalianavesmed@gmail.com
2026/01/12 10:48:25 PM GMT-3    Ana Luísa Brito de Carvalho     analubdcped@gmail.com
2026/01/12 10:48:33 PM GMT-3    Daniella Alencar Silva     danialencar0@gmail.com
2026/01/12 10:48:40 PM GMT-3    Gustavo Denuncio    xaviermwind@gmail.com
2026/01/12 10:48:43 PM GMT-3    Caio Da Macena Barbosa    caionutrologo@gmail.com
2026/01/12 10:49:43 PM GMT-3    Luiz Augusto de Araujo Pereira Junior    luizaugustojr7@gmail.com
2026/01/12 10:50:14 PM GMT-3    Tatiane Castro    Tati_castro0@hotmail.com
2026/01/12 10:51:01 PM GMT-3    Matheus Gomes Diniz e Silva     Matheusdiniz6@hotmail.com
2026/01/12 10:52:12 PM GMT-3    RUBENS CLEYTON DA SILVA MENDES     rubens.ws@gmail.com
2026/01/12 10:53:36 PM GMT-3    Fernanda Maria Carvalho Possani    fernandamcpossani@hotmail.com
2026/01/12 10:57:36 PM GMT-3    Paulo Vitor de Freitas Fernandes     paulovitorrn@hotmail.com
2026/01/12 10:59:26 PM GMT-3    PEDRO PAULO ASSUNÇÃO DA SILVA    pedroassuncaopaulo@gmail.com
2026/01/12 11:00:00 PM GMT-3    Isabella Gonçalves Andrade     draisabellagandrade@gmail.com
2026/01/12 11:08:48 PM GMT-3    Bruno Angelo Silva    brunoangelo06@gmail.com
2026/01/12 11:18:44 PM GMT-3    Mariana Alves Pineze    mapineze@hotmail.com
2026/01/12 11:19:47 PM GMT-3    Jefferson Venicius Andrade Pontes     jeffpontes1328@gmail.com
2026/01/12 11:19:55 PM GMT-3    Márcia de Britto da Rocha     dramarcia1969@gmail.com
2026/01/12 11:24:16 PM GMT-3    Larissa Lopes    lari.lopes@hotmail.com
2026/01/13 2:41:21 AM GMT-3    Camila Aquino     Kmilaaquino3@gmail.com
2026/01/13 4:18:33 AM GMT-3    Aguinaldo José Soares Filho    draguinaldofilho@gmail.com
2026/01/13 4:28:27 AM GMT-3    Camila Teixeira Amaro Vieira     camilateixeiraav@hotmail.com
2026/01/13 5:32:49 AM GMT-3    Thiago Medina     Thiago.codarin@hotmail.com
2026/01/13 5:36:20 AM GMT-3    Jessica Sztajn Bittencourt     jsztajn@gmail.com
2026/01/13 6:22:12 AM GMT-3    Débora de Souza Ferreira    deborarxt@gmail.com
2026/01/13 6:46:47 AM GMT-3    Ton Jeferson da Cunha Carvalho    tonjeferson@gmail.com
2026/01/13 7:29:20 AM GMT-3    Dionline Borges Paulo     dionlineborges19@gmail.com
2026/01/13 7:31:31 AM GMT-3    Lucas ferreira vilarinho     lucfvil@gmail.com
2026/01/13 7:34:05 AM GMT-3    Karina Ferreira     kari.ferreira@yahoo.com.br
2026/01/13 9:10:16 AM GMT-3    Rafael Faria Gil     rafaelfariagil@gmail.com
2026/01/13 9:20:22 AM GMT-3    Mila Cruz     milacruz787@gmail.com
2026/01/13 10:11:10 AM GMT-3    Ana Flávia Assis Silva    anafas2010@gmail.com
2026/01/13 10:40:14 AM GMT-3    Marcela Mascaro Fachini    ma_mascaro@hotmail.com
2026/01/13 10:45:37 AM GMT-3    Julia Rios     julia_rios22@hotmail.com
2026/01/13 10:51:59 AM GMT-3    Ruan Mathias Sousa Dias     ruanmathiassousa@gmail.com
2026/01/13 11:36:23 AM GMT-3    Raissa Campelo Esteves Maranha     raissacampelo@msn.com
2026/01/13 11:54:20 AM GMT-3    Andressa Ferreira     andressa.fbaf@hotmail.com
2026/01/13 12:44:54 PM GMT-3    BEATRIZ VIEIRA GURGEL    beatrizvieiragurgel@gmail.com
2026/01/13 2:23:40 PM GMT-3    Marcus Da Silva Sardinha    marcussardinha67@gmail.com
2026/01/13 4:43:35 PM GMT-3    Ana Christina Ferreira Costa    ana.chris05@hotmail.com
2026/01/13 6:51:22 PM GMT-3    Guilherme Cézar Soares     guilhermecezarsoares@gmail.com
2026/01/13 6:51:44 PM GMT-3    João Paulo Guimarães Pena    jpgpena2014@gmail.com
2026/01/13 6:59:15 PM GMT-3    Bruna Menin    brumenin@hotmail.com
2026/01/13 8:10:37 PM GMT-3    Lidiane     123.lc96@gmail.com
2026/01/13 8:41:27 PM GMT-3     Caroline Dutra     Caroline.Dutrac@hotmail.com
2026/01/13 8:57:26 PM GMT-3    Paloma Fernandes de Oliveira    palomafernandesmedica@gmail.com
2026/01/13 9:00:56 PM GMT-3    Laura Mittmann Reis    lauramittmannreis@gmail.com
2026/01/14 8:31:24 AM GMT-3    Michel Furtado     mrodriguesfurtado05@gmail.com
2026/01/14 8:33:12 AM GMT-3    ISABELA KLAUTAU LEITE CHAVES BORGES    isabelaklchaves@gmail.com
2026/01/14 8:37:39 AM GMT-3    Keila possmoser    med.keilapossmoser@hotmail.com
2026/01/14 8:47:43 AM GMT-3    Thaís da Costa Siqueira de Oliveira     thais_csiqueira@hotmail.com
2026/01/14 8:57:18 AM GMT-3    Sara Campos de Oliveira     saracamposmed@outlook.com
2026/01/14 11:24:09 AM GMT-3    Analu lessa     Lalulessa@hotmail.com
2026/01/14 11:45:41 AM GMT-3    Luiz Fernando Cambraia Gatti    lfcgatti@hotmail.com
2026/01/14 12:46:18 PM GMT-3    Diogo Machado Amaral     diogotelex1@gmail.com
2026/01/14 12:47:43 PM GMT-3    Maria Vitória Coutinho    dramariavitoriacoutinho@hotmail.com
2026/01/14 1:32:53 PM GMT-3    Ewerton Vignolli Correa     ewertonvignolli@gmail.com
2026/01/14 1:52:38 PM GMT-3    Nathalia Dutra Naves    nathalianavesmed@gmail.com
2026/01/14 3:31:25 PM GMT-3    Icaro de Azevedo Alexandre    icaroazevedo10@hotmail.com
2026/01/14 3:31:44 PM GMT-3    Laura Mittmann Reis    lauramittmannreis@gmail.com
2026/01/14 6:06:16 PM GMT-3    Darlan Correia do Carmo     darlancorreia@gmail.com
2026/01/14 6:26:58 PM GMT-3    Felipe Carega    dr.felipecarega@gmail.com
2026/01/14 6:28:36 PM GMT-3    Saulo Souza Silva     saulosouzasilva16@gmail.com
2026/01/14 6:35:26 PM GMT-3    Guilherme Miranzi    guimiranzi@hotmail.com
2026/01/14 6:37:31 PM GMT-3    Andréa Silva dos Santos     dra.andrea_santos@hotmail.com
2026/01/14 7:00:57 PM GMT-3    Jeany Cury     j-cuey0806@hotmail.com
2026/01/14 7:13:11 PM GMT-3    Caroline Accorsi Berardi Chaibub    carolineberardi@hotmail.com
2026/01/14 7:37:32 PM GMT-3    Larissa Lopes    lari.lopes@hotmail.com
2026/01/14 7:58:53 PM GMT-3    Kamilla Moreira     kamilla.ci.pb@gmail.com
2026/01/14 8:00:47 PM GMT-3    Camila Aquino     Kmilaaquino3@gmail.com
2026/01/14 10:44:20 PM GMT-3    Rafael Faria Gil     rafaelfariagil@gmail.com
2026/01/15 7:13:16 AM GMT-3    Débora Ferreira     deborarxt@gmail.com
2026/01/15 8:22:01 AM GMT-3    Taillan Almeida     Taillanalmeida06@gmail.com
2026/01/15 9:45:23 AM GMT-3    Dr Kauê Seabra    drkaueseabra@hotmail.com
2026/01/15 10:21:53 AM GMT-3    Thiago Medina     thiago.codarin@hotmail.com`;

function parseDate(dateString) {
  // Converter formato "2026/01/12 10:48:08 PM GMT-3" para ISO
  const cleanDate = dateString.replace(' GMT-3', '');
  const date = new Date(cleanDate + ' GMT-0300');
  return date.toISOString();
}

function normalizeName(name) {
  // Normalizar nomes removendo espaços extras e capitalizando corretamente
  return name
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseData() {
  const lines = mentoradosData.trim().split('\n');
  const parsed = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s{2,}/); // Split por 2+ espaços
    if (parts.length >= 3) {
      const dateTime = parts[0];
      const name = normalizeName(parts[1]);
      const email = parts[2].trim().toLowerCase();

      // Validação básica de email
      if (email.includes('@') && email.includes('.')) {
        parsed.push({
          dateTime: parseDate(dateTime),
          name,
          email
        });
      } else {
        console.warn('❌ Email inválido ignorado:', email, 'para', name);
      }
    }
  }

  return parsed;
}

async function getOrganizationId() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=id&owner_email=eq.temp2@admin.com`,
      { headers }
    );

    const data = await response.json();
    if (data && data.length > 0) {
      console.log('✅ Organização encontrada:', data[0].id);
      return data[0].id;
    } else {
      console.error('❌ Organização não encontrada para temp2@admin.com');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao buscar organização:', error);
    return null;
  }
}

async function checkExistingMentorado(email) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email&email=eq.${encodeURIComponent(email)}`,
      { headers }
    );

    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('❌ Erro ao verificar mentorado existente:', error);
    return null;
  }
}

async function createOrUpdateMentorado(mentoradoData, organizationId) {
  const { name, email, dateTime } = mentoradoData;

  try {
    // Verificar se já existe
    const existing = await checkExistingMentorado(email);

    const mentoradoPayload = {
      nome_completo: name,
      email: email,
      organization_id: organizationId,
      data_entrada: dateTime,
      estado_atual: 'ativo',
      status_login: 'permitido',
      excluido: false,
      created_at: new Date().toISOString()
    };

    if (existing) {
      // Atualizar existente
      console.log(`🔄 Atualizando mentorado: ${name} (${email})`);

      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/mentorados?id=eq.${existing.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            nome_completo: name,
            organization_id: organizationId,
            data_entrada: dateTime,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (updateResponse.ok) {
        console.log(`✅ Mentorado atualizado: ${name}`);
        return { success: true, action: 'updated', id: existing.id };
      } else {
        const error = await updateResponse.text();
        console.error(`❌ Erro ao atualizar ${name}:`, error);
        return { success: false, error };
      }

    } else {
      // Criar novo
      console.log(`➕ Criando novo mentorado: ${name} (${email})`);

      const createResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/mentorados`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(mentoradoPayload)
        }
      );

      if (createResponse.ok) {
        const created = await createResponse.json();
        console.log(`✅ Mentorado criado: ${name}`);
        return { success: true, action: 'created', data: created };
      } else {
        const error = await createResponse.text();
        console.error(`❌ Erro ao criar ${name}:`, error);
        return { success: false, error };
      }
    }

  } catch (error) {
    console.error(`❌ Erro processar ${name}:`, error);
    return { success: false, error: error.message };
  }
}

async function removeDuplicates(parsedData) {
  // Remover duplicatas baseado no email
  const uniqueEmails = new Map();

  for (const item of parsedData) {
    if (!uniqueEmails.has(item.email)) {
      uniqueEmails.set(item.email, item);
    } else {
      // Se tem duplicata, manter o mais recente
      const existing = uniqueEmails.get(item.email);
      if (new Date(item.dateTime) > new Date(existing.dateTime)) {
        uniqueEmails.set(item.email, item);
      }
    }
  }

  return Array.from(uniqueEmails.values());
}

async function main() {
  console.log('🚀 INICIANDO PROCESSAMENTO DE MENTORADOS');
  console.log('=' .repeat(60));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log('=' .repeat(60));

  // 1. Parse dos dados
  console.log('\n📊 1. PARSING DOS DADOS...');
  const parsedData = parseData();
  console.log(`✅ ${parsedData.length} registros processados inicialmente`);

  // 2. Remover duplicatas
  console.log('\n🔄 2. REMOVENDO DUPLICATAS...');
  const uniqueData = await removeDuplicates(parsedData);
  console.log(`✅ ${uniqueData.length} registros únicos (removidas ${parsedData.length - uniqueData.length} duplicatas)`);

  // 3. Buscar organização
  console.log('\n🏢 3. BUSCANDO ORGANIZAÇÃO...');
  const organizationId = await getOrganizationId();
  if (!organizationId) {
    console.error('❌ Não foi possível encontrar a organização. Abortando...');
    return;
  }

  // 4. Processar mentorados
  console.log('\n👥 4. PROCESSANDO MENTORADOS...');

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < uniqueData.length; i++) {
    const mentorado = uniqueData[i];
    console.log(`\n[${i + 1}/${uniqueData.length}] ${mentorado.name}`);

    const result = await createOrUpdateMentorado(mentorado, organizationId);

    if (result.success) {
      if (result.action === 'created') created++;
      if (result.action === 'updated') updated++;
    } else {
      errors++;
    }

    // Pequena pausa para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 5. Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(60));
  console.log(`📝 Total de registros processados: ${uniqueData.length}`);
  console.log(`✅ Mentorados criados: ${created}`);
  console.log(`🔄 Mentorados atualizados: ${updated}`);
  console.log(`❌ Erros: ${errors}`);
  console.log(`🏢 Organização: temp2@admin.com (${organizationId})`);

  if (errors === 0) {
    console.log('\n🎉 PROCESSAMENTO CONCLUÍDO COM SUCESSO!');
  } else {
    console.log('\n⚠️ Processamento concluído com alguns erros.');
  }

  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. 🔑 Verificar se todos têm acesso ao portal de vídeos');
  console.log('2. 📧 Considerar envio de emails de boas-vindas');
  console.log('3. 🎯 Configurar metas iniciais se necessário');
}

// Executar o script
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});