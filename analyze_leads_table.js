const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeLeadsTable() {
  console.log('=== ANÁLISE DETALHADA DA TABELA LEADS ===\n');
  
  try {
    // Buscar um sample de leads
    const { data: sample, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .limit(5);
    
    console.log(`📊 Total de leads: ${count}\n`);
    
    if (sample && sample.length > 0) {
      const fields = Object.keys(sample[0]);
      
      console.log('🔍 ESTRUTURA COMPLETA DA TABELA LEADS:\n');
      
      // Categorizar campos
      const categories = {
        'IDENTIFICAÇÃO': ['id', 'nome_completo', 'email', 'telefone', 'empresa', 'cargo'],
        'SCORING E PRIORIZAÇÃO': ['lead_score', 'lead_score_detalhado', 'temperatura', 'temperatura_calculada', 'prioridade', 'prioridade_nivel', 'probabilidade_compra', 'urgencia_compra', 'nivel_interesse'],
        'ATRIBUIÇÃO CLOSERS': ['closer_id', 'closer_atribuido_em', 'closer_tipo', 'closer_observacoes'],
        'ATRIBUIÇÃO SDR': ['sdr_id', 'sdr_atribuido_em', 'sdr_qualificado_em', 'sdr_observacoes'],
        'STATUS E PROGRESSO': ['status', 'status_updated_at', 'convertido_em', 'desistiu', 'motivo_nao_fechou'],
        'VALORES FINANCEIROS': ['valor_potencial', 'valor_estimado', 'valor_vendido', 'valor_arrecadado', 'orcamento_disponivel', 'valor_venda'],
        'DATAS E FOLLOW-UP': ['created_at', 'updated_at', 'data_primeiro_contato', 'data_prevista_fechamento', 'data_venda', 'data_fechamento', 'last_interaction_date', 'next_followup_date', 'follow_up_data', 'proxima_acao'],
        'ORIGEM E TRACKING': ['origem', 'origem_detalhada', 'fonte_detalhada', 'fonte_referencia', 'utm_source', 'utm_medium', 'utm_campaign', 'campanha_origem', 'tracking_data'],
        'QUALIFICAÇÃO': ['dor_principal', 'objetivo_principal', 'objecoes_principais', 'produto_interesse', 'concorrente', 'perfil_comportamental', 'qualification_details'],
        'COMUNICAÇÃO': ['canal_preferido', 'periodo_melhor_contato', 'call_details', 'call_history', 'observacoes'],
        'COMISSÃO E REFERÊNCIA': ['referral_id', 'indicado_por', 'mentorado_indicador_id', 'comissao_id', 'possui_comissao', 'commission_paid'],
        'ORGANIZAÇÃO': ['organization_id'],
        'OUTROS': ['tags', 'responsavel_vendas', 'decisor_principal', 'follow_up_status', 'follow_up_observacoes', 'sales_details', 'pix_key', 'pix_paid', 'pix_paid_at']
      };
      
      // Imprimir campos por categoria
      for (const [category, categoryFields] of Object.entries(categories)) {
        const existingFields = categoryFields.filter(f => fields.includes(f));
        if (existingFields.length > 0) {
          console.log(`\n${category}:`);
          existingFields.forEach(field => {
            const value = sample[0][field];
            let info = '';
            if (value !== null && value !== undefined) {
              if (typeof value === 'boolean') info = ` (boolean: ${value})`;
              else if (typeof value === 'number') info = ' (number)';
              else if (typeof value === 'string' && value.length > 0) info = ' (text)';
              else if (typeof value === 'object') info = ' (jsonb)';
            } else {
              info = ' (null)';
            }
            console.log(`  ✓ ${field}${info}`);
          });
        }
      }
      
      // Análise de campos preenchidos
      console.log('\n\n=== ANÁLISE DE PREENCHIMENTO DOS CAMPOS ===\n');
      
      const scoringFields = ['lead_score', 'temperatura', 'prioridade', 'lead_score_detalhado', 'temperatura_calculada', 'prioridade_nivel'];
      const closerFields = ['closer_id', 'closer_atribuido_em', 'closer_tipo'];
      const sdrFields = ['sdr_id', 'sdr_atribuido_em'];
      
      // Verificar quantos leads têm scoring
      const leadsWithScore = sample.filter(lead => 
        lead.lead_score !== null || lead.temperatura !== null || lead.prioridade !== null
      );
      console.log(`📊 Leads com algum tipo de scoring: ${leadsWithScore.length}/${sample.length}`);
      
      // Verificar quantos têm closer atribuído
      const leadsWithCloser = sample.filter(lead => lead.closer_id !== null);
      console.log(`👤 Leads com closer atribuído: ${leadsWithCloser.length}/${sample.length}`);
      
      // Verificar quantos têm SDR atribuído
      const leadsWithSDR = sample.filter(lead => lead.sdr_id !== null);
      console.log(`👥 Leads com SDR atribuído: ${leadsWithSDR.length}/${sample.length}`);
      
      // Verificar status distribution
      const statusCount = {};
      sample.forEach(lead => {
        const status = lead.status || 'sem_status';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      console.log('\n📈 Distribuição de status no sample:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`  • ${status}: ${count}`);
      });
      
      // Verificar valores de temperatura
      const tempCount = {};
      sample.forEach(lead => {
        const temp = lead.temperatura || 'não_definida';
        tempCount[temp] = (tempCount[temp] || 0) + 1;
      });
      console.log('\n🌡️ Distribuição de temperatura no sample:');
      Object.entries(tempCount).forEach(([temp, count]) => {
        console.log(`  • ${temp}: ${count}`);
      });
      
      // Mostrar exemplos de lead_score_detalhado
      console.log('\n📊 Exemplos de lead_score_detalhado:');
      sample.forEach((lead, index) => {
        if (lead.lead_score_detalhado) {
          console.log(`  Lead ${index + 1}:`, JSON.stringify(lead.lead_score_detalhado).substring(0, 100) + '...');
        }
      });
      
      console.log('\n\n=== ANÁLISE DE GAPS PARA SISTEMA COMPLETO ===\n');
      
      console.log('✅ PONTOS POSITIVOS:');
      console.log('  • Tabela leads já possui estrutura completa de scoring');
      console.log('  • Campos de temperatura e priorização já existem');
      console.log('  • Sistema de atribuição para closers já implementado');
      console.log('  • Sistema de atribuição para SDRs já implementado');
      console.log('  • Tracking completo de origem e UTMs');
      console.log('  • Campos de follow-up e próximas ações');
      
      console.log('\n⚠️ PONTOS DE ATENÇÃO:');
      
      // Verificar se os campos estão sendo usados
      const unusedScoring = scoringFields.filter(field => 
        !sample.some(lead => lead[field] !== null)
      );
      if (unusedScoring.length > 0) {
        console.log(`  • Campos de scoring não utilizados: ${unusedScoring.join(', ')}`);
      }
      
      const unusedCloser = closerFields.filter(field => 
        !sample.some(lead => lead[field] !== null)
      );
      if (unusedCloser.length > 0) {
        console.log(`  • Campos de closer não utilizados: ${unusedCloser.join(', ')}`);
      }
      
      console.log('\n❌ O QUE AINDA FALTA:');
      console.log('  1. SISTEMA DE AGENDA:');
      console.log('     • Criar tabela appointments para agendamentos');
      console.log('     • Criar tabela closer_availability para disponibilidade');
      console.log('     • Integrar com calendários externos');
      
      console.log('\n  2. AUTOMAÇÃO DE SCORING:');
      console.log('     • Criar função calculate_lead_score()');
      console.log('     • Implementar triggers para recalcular automaticamente');
      console.log('     • Definir regras de pontuação baseadas nos campos existentes');
      
      console.log('\n  3. DISTRIBUIÇÃO AUTOMÁTICA:');
      console.log('     • Criar função auto_assign_to_closer()');
      console.log('     • Considerar capacidade dos closers');
      console.log('     • Balancear distribuição por score e especialização');
      
      console.log('\n  4. INTEGRAÇÃO COM CLOSERS:');
      console.log('     • Verificar relação entre leads.closer_id e closers.id');
      console.log('     • Implementar tracking de capacidade');
      console.log('     • Dashboard de performance por closer');
      
      // Verificar relação com closers
      console.log('\n\n=== VERIFICANDO INTEGRAÇÃO COM TABELA CLOSERS ===\n');
      
      const { data: closers } = await supabase
        .from('closers')
        .select('id, nome_completo, total_leads_atendidos, meta_mensal, tipo_closer')
        .limit(5);
      
      if (closers && closers.length > 0) {
        console.log('📋 Closers existentes:');
        closers.forEach(closer => {
          console.log(`  • ${closer.nome_completo} (${closer.tipo_closer || 'tipo não definido'})`);
          console.log(`    ID: ${closer.id}`);
          console.log(`    Leads atendidos: ${closer.total_leads_atendidos || 0}`);
          console.log(`    Meta mensal: ${closer.meta_mensal || 'não definida'}`);
        });
        
        // Verificar se há leads atribuídos a esses closers
        for (const closer of closers) {
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('closer_id', closer.id);
          
          console.log(`\n    → Leads atribuídos a ${closer.nome_completo}: ${count || 0}`);
        }
      }
      
    } else {
      console.log('❌ Não foi possível obter dados da tabela leads');
    }
    
  } catch (error) {
    console.error('Erro na análise:', error.message);
  }
}

// Executar análise
analyzeLeadsTable();