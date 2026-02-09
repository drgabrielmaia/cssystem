const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifySupabaseStructure() {
  console.log('🔍 Verificando estrutura completa do Supabase...\n')
  
  try {
    // Verificar todas as tabelas através de uma query SQL
    console.log('📋 TODAS AS TABELAS:')
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info')
      .then(() => {
        // Se RPC não existe, vamos tentar listar tabelas manualmente
        return Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('mentorados').select('*', { count: 'exact', head: true }),
          supabase.from('leads').select('*', { count: 'exact', head: true }),
          supabase.from('closers').select('*', { count: 'exact', head: true }),
          supabase.from('organizations').select('*', { count: 'exact', head: true }),
          supabase.from('organization_users').select('*', { count: 'exact', head: true }),
          supabase.from('forms').select('*', { count: 'exact', head: true }),
          supabase.from('form_responses').select('*', { count: 'exact', head: true }),
          supabase.from('lead_qualifications').select('*', { count: 'exact', head: true }),
          supabase.from('commission_rules').select('*', { count: 'exact', head: true }),
          supabase.from('commissions').select('*', { count: 'exact', head: true }),
          supabase.from('mentorado_info').select('*', { count: 'exact', head: true }),
          supabase.from('instagram_automations').select('*', { count: 'exact', head: true }),
          supabase.from('instagram_funnels').select('*', { count: 'exact', head: true }),
        ])
      })
      .catch(async () => {
        // Fallback - tentar acessar cada tabela
        const tableChecks = [
          'users', 'mentorados', 'leads', 'closers', 'organizations', 'organization_users',
          'forms', 'form_responses', 'lead_qualifications', 'commission_rules', 
          'commissions', 'mentorado_info', 'instagram_automations', 'instagram_funnels',
          'activities', 'calendar_events', 'despesas', 'followups', 'kpis', 'pontuacao',
          'turmas', 'videos', 'video_notes', 'video_nps', 'whatsapp_instances'
        ]
        
        const results = []
        for (const table of tableChecks) {
          try {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
            if (!error) {
              results.push({ table, count, status: 'exists' })
            }
          } catch (e) {
            results.push({ table, count: 0, status: 'not_found', error: e.message })
          }
        }
        return results
      })

    // Sistema de Comissão
    console.log('\n💰 SISTEMA DE COMISSÃO:')
    const { data: commissionRules, error: crError } = await supabase
      .from('commission_rules')
      .select('*')
      .limit(5)
    
    if (!crError && commissionRules) {
      console.log(`✅ commission_rules: ${commissionRules.length} registros`)
      if (commissionRules.length > 0) {
        console.log('Estrutura:', Object.keys(commissionRules[0]))
      }
    } else {
      console.log(`❌ commission_rules: ${crError?.message || 'Não encontrada'}`)
    }

    const { data: commissions, error: cError } = await supabase
      .from('commissions')
      .select('*')
      .limit(5)
    
    if (!cError && commissions) {
      console.log(`✅ commissions: ${commissions.length} registros`)
      if (commissions.length > 0) {
        console.log('Estrutura:', Object.keys(commissions[0]))
      }
    } else {
      console.log(`❌ commissions: ${cError?.message || 'Não encontrada'}`)
    }

    // Sistema de Lead Qualification
    console.log('\n📋 SISTEMA DE LEAD QUALIFICATION:')
    const { data: leadQual, error: lqError } = await supabase
      .from('lead_qualifications')
      .select('*')
      .limit(5)
    
    if (!lqError && leadQual) {
      console.log(`✅ lead_qualifications: ${leadQual.length} registros`)
      if (leadQual.length > 0) {
        console.log('Estrutura:', Object.keys(leadQual[0]))
      }
    } else {
      console.log(`❌ lead_qualifications: ${lqError?.message || 'Não encontrada'}`)
    }

    // Sistema de Forms
    console.log('\n📝 SISTEMA DE FORMULÁRIOS:')
    const { data: forms, error: fError } = await supabase
      .from('forms')
      .select('*')
      .limit(5)
    
    if (!fError && forms) {
      console.log(`✅ forms: ${forms.length} registros`)
      if (forms.length > 0) {
        console.log('Estrutura:', Object.keys(forms[0]))
      }
    } else {
      console.log(`❌ forms: ${fError?.message || 'Não encontrada'}`)
    }

    const { data: formResponses, error: frError } = await supabase
      .from('form_responses')
      .select('*')
      .limit(5)
    
    if (!frError && formResponses) {
      console.log(`✅ form_responses: ${formResponses.length} registros`)
      if (formResponses.length > 0) {
        console.log('Estrutura:', Object.keys(formResponses[0]))
      }
    } else {
      console.log(`❌ form_responses: ${frError?.message || 'Não encontrada'}`)
    }

    // Tabelas de Usuários
    console.log('\n👥 SISTEMA DE USUÁRIOS:')
    const { data: mentorados, error: mError } = await supabase
      .from('mentorados')
      .select('*')
      .limit(3)
    
    if (!mError && mentorados) {
      console.log(`✅ mentorados: ${mentorados.length} registros`)
      if (mentorados.length > 0) {
        console.log('Estrutura:', Object.keys(mentorados[0]))
      }
    } else {
      console.log(`❌ mentorados: ${mError?.message || 'Não encontrada'}`)
    }

    const { data: mentoradoInfo, error: miError } = await supabase
      .from('mentorado_info')
      .select('*')
      .limit(3)
    
    if (!miError && mentoradoInfo) {
      console.log(`✅ mentorado_info: ${mentoradoInfo.length} registros`)
      if (mentoradoInfo.length > 0) {
        console.log('Estrutura:', Object.keys(mentoradoInfo[0]))
      }
    } else {
      console.log(`❌ mentorado_info: ${miError?.message || 'Não encontrada'}`)
    }

    // SDRs/Closers
    console.log('\n🎯 SISTEMA SDR/CLOSERS:')
    const { data: closers, error: clError } = await supabase
      .from('closers')
      .select('*')
      .limit(3)
    
    if (!clError && closers) {
      console.log(`✅ closers: ${closers.length} registros`)
      if (closers.length > 0) {
        console.log('Estrutura:', Object.keys(closers[0]))
      }
    } else {
      console.log(`❌ closers: ${clError?.message || 'Não encontrada'}`)
    }

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(3)
    
    if (!leadsError && leads) {
      console.log(`✅ leads: ${leads.length} registros`)
      if (leads.length > 0) {
        console.log('Estrutura:', Object.keys(leads[0]))
      }
    } else {
      console.log(`❌ leads: ${leadsError?.message || 'Não encontrada'}`)
    }

    console.log('\n✅ Verificação completa finalizada!')

  } catch (error) {
    console.error('❌ Erro durante verificação:', error)
  }
}

verifySupabaseStructure()