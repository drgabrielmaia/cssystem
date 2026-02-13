#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLeadScoringSystem() {
  console.log('🧪 Testing Lead Scoring System\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Get some recent leads to test
    console.log('📋 Fetching recent leads...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, nome_completo, email, telefone, temperatura, origem, status, lead_score, closer_id')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return;
    }
    
    console.log(`Found ${leads?.length || 0} leads\n`);
    
    if (!leads || leads.length === 0) {
      console.log('No leads found. Please create some leads first.');
      return;
    }
    
    // 2. Test score calculation for each lead
    console.log('🎯 Testing Score Calculation\n');
    console.log('-'.repeat(60));
    
    for (const lead of leads.slice(0, 5)) {
      console.log(`\n📊 Lead: ${lead.nome_completo || lead.email || lead.telefone}`);
      console.log(`   Current Score: ${lead.lead_score || 0}`);
      console.log(`   Temperature: ${lead.temperatura || 'not set'}`);
      console.log(`   Origin: ${lead.origem || 'not set'}`);
      console.log(`   Status: ${lead.status || 'not set'}`);
      
      // Calculate score using the function
      const { data: scoreResult, error: scoreError } = await supabase
        .rpc('calculate_lead_score', { lead_id: lead.id });
      
      if (scoreError) {
        console.log(`   ❌ Error calculating score: ${scoreError.message}`);
      } else {
        console.log(`   ✅ New Score: ${scoreResult?.total_score || 'N/A'}`);
        if (scoreResult) {
          console.log(`   Details:`);
          console.log(`     - Temperature Score: ${scoreResult.temperature_score}`);
          console.log(`     - Origin Score: ${scoreResult.origin_score}`);
          console.log(`     - Interaction Score: ${scoreResult.interaction_score}`);
          console.log(`     - Recency Score: ${scoreResult.recency_score}`);
        }
      }
    }
    
    // 3. Test auto-assignment for hot leads
    console.log('\n\n🤝 Testing Auto-Assignment for Hot Leads\n');
    console.log('-'.repeat(60));
    
    // Find unassigned hot leads or high-score leads
    const hotLeads = leads.filter(l => 
      !l.closer_id && 
      (l.temperatura === 'quente' || (l.lead_score && l.lead_score >= 60))
    );
    
    if (hotLeads.length === 0) {
      console.log('No hot/high-score unassigned leads found.');
      
      // Try with any unassigned lead for testing
      const unassignedLeads = leads.filter(l => !l.closer_id);
      if (unassignedLeads.length > 0) {
        console.log('\nTesting with unassigned leads instead...');
        
        const testLead = unassignedLeads[0];
        console.log(`\n🔄 Testing assignment for: ${testLead.nome_completo || testLead.email}`);
        
        const { data: assignResult, error: assignError } = await supabase
          .rpc('auto_assign_lead_to_closer', { p_lead_id: testLead.id });
        
        if (assignError) {
          console.log(`   ❌ Error: ${assignError.message}`);
        } else {
          console.log(`   Result: ${JSON.stringify(assignResult, null, 2)}`);
        }
      }
    } else {
      for (const lead of hotLeads.slice(0, 3)) {
        console.log(`\n🔄 Assigning: ${lead.nome_completo || lead.email}`);
        console.log(`   Score: ${lead.lead_score}, Temperature: ${lead.temperatura}`);
        
        const { data: assignResult, error: assignError } = await supabase
          .rpc('auto_assign_lead_to_closer', { p_lead_id: lead.id });
        
        if (assignError) {
          console.log(`   ❌ Error: ${assignError.message}`);
        } else {
          if (assignResult?.success) {
            console.log(`   ✅ Assigned to: ${assignResult.closer_name}`);
            console.log(`   Reason: ${assignResult.reason}`);
          } else {
            console.log(`   ⚠️  Not assigned: ${assignResult?.reason}`);
          }
        }
      }
    }
    
    // 4. Check closers' workload
    console.log('\n\n📈 Checking Closers Workload\n');
    console.log('-'.repeat(60));
    
    const { data: stats, error: statsError } = await supabase
      .rpc('get_lead_distribution_stats');
    
    if (statsError) {
      console.log('Error getting stats:', statsError.message);
    } else if (stats && stats.length > 0) {
      console.log('\nCloser Distribution:');
      stats.forEach(s => {
        console.log(`\n${s.closer_name}:`);
        console.log(`  Active Leads: ${s.active_leads}/${s.capacity || 50}`);
        console.log(`  Utilization: ${s.utilization_percent || 0}%`);
        console.log(`  Hot: ${s.hot_leads}, Warm: ${s.warm_leads}, Cold: ${s.cold_leads}`);
        console.log(`  Avg Score: ${s.avg_score ? s.avg_score.toFixed(1) : 'N/A'}`);
      });
    } else {
      console.log('No closer statistics available.');
    }
    
    // 5. Check lead history
    console.log('\n\n📜 Recent Lead History\n');
    console.log('-'.repeat(60));
    
    const { data: history, error: historyError } = await supabase
      .from('lead_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (historyError) {
      console.log('Lead history table might not exist yet.');
    } else if (history && history.length > 0) {
      history.forEach(h => {
        const details = h.details || {};
        console.log(`\n[${new Date(h.created_at).toLocaleString('pt-BR')}]`);
        console.log(`  Action: ${h.action}`);
        console.log(`  Lead ID: ${h.lead_id}`);
        if (details.closer_name) {
          console.log(`  Closer: ${details.closer_name}`);
        }
        if (details.reason) {
          console.log(`  Reason: ${details.reason}`);
        }
      });
    } else {
      console.log('No history records found yet.');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run tests
console.log('=' .repeat(60));
console.log('LEAD SCORING SYSTEM TEST SUITE');
console.log('=' .repeat(60));
console.log(`Supabase URL: ${supabaseUrl}\n`);

testLeadScoringSystem()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✨ Test suite completed!');
    console.log('='.repeat(60));
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });