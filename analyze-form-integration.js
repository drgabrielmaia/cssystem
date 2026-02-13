#!/usr/bin/env node

/**
 * Analyze Form-Builder and Scoring System Integration
 * Identifies gaps and current implementation state
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeFormIntegration() {
  console.log('🔍 Analyzing Form-Builder and Scoring System Integration...\n')

  const analysis = {
    form_builder: {
      status: 'unknown',
      features: [],
      gaps: []
    },
    scoring_system: {
      status: 'unknown',
      configs: 0,
      gaps: []
    },
    integration: {
      status: 'unknown',
      working_features: [],
      missing_features: []
    },
    calendar: {
      status: 'unknown',
      booking_links: 0,
      gaps: []
    },
    recommendations: []
  }

  try {
    // 1. Analyze Form Templates
    console.log('📋 Analyzing Form Templates...')
    const { data: templates, error: templatesError } = await supabase
      .from('form_templates')
      .select('*')

    if (templatesError) {
      console.log('❌ Form templates not accessible:', templatesError.message)
      analysis.form_builder.status = 'error'
      analysis.form_builder.gaps.push('Cannot access form_templates table due to RLS policy')
    } else {
      analysis.form_builder.status = 'working'
      analysis.form_builder.features.push(`${templates.length} form templates exist`)
      
      if (templates.length > 0) {
        const sampleTemplate = templates[0]
        console.log('   Sample template structure:')
        console.log('   - Name:', sampleTemplate.name)
        console.log('   - Slug:', sampleTemplate.slug)
        console.log('   - Type:', sampleTemplate.form_type)
        console.log('   - Fields:', sampleTemplate.fields?.length || 0)
        
        // Check if templates have scoring integration
        const hasScoring = templates.some(t => t.scoring_config_id || t.organization_id)
        if (hasScoring) {
          analysis.form_builder.features.push('Templates have organization/scoring references')
        } else {
          analysis.form_builder.gaps.push('Templates missing scoring configuration references')
        }
      }
    }

    // 2. Analyze Form Submissions
    console.log('\n📤 Analyzing Form Submissions...')
    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (submissionsError) {
      console.log('❌ Form submissions not accessible:', submissionsError.message)
      analysis.integration.missing_features.push('Form submission processing broken')
    } else {
      console.log(`✅ Found ${submissions.length} recent form submissions`)
      analysis.integration.working_features.push('Form submission collection working')
      
      if (submissions.length > 0) {
        const recentSubmission = submissions[0]
        console.log('   Recent submission:')
        console.log('   - Template:', recentSubmission.template_slug)
        console.log('   - Lead ID:', recentSubmission.lead_id || 'Not created')
        console.log('   - Source:', recentSubmission.source_url)
        console.log('   - Fields submitted:', Object.keys(recentSubmission.submission_data || {}).length)

        // Check lead integration
        const leadsCreated = submissions.filter(s => s.lead_id).length
        if (leadsCreated > 0) {
          analysis.integration.working_features.push(`Lead creation from forms (${leadsCreated}/${submissions.length} submissions)`)
        } else {
          analysis.integration.missing_features.push('Form submissions not creating leads automatically')
        }
      }
    }

    // 3. Analyze Scoring System
    console.log('\n🎯 Analyzing Scoring System...')
    const { data: scoringConfigs, error: scoringError } = await supabase
      .from('scoring_configurations')
      .select('*')

    if (scoringError) {
      console.log('❌ Scoring configurations not accessible:', scoringError.message)
      analysis.scoring_system.status = 'error'
    } else {
      analysis.scoring_system.status = 'working'
      analysis.scoring_system.configs = scoringConfigs.length
      console.log(`✅ Found ${scoringConfigs.length} scoring configurations`)
      
      if (scoringConfigs.length > 0) {
        const activeConfigs = scoringConfigs.filter(c => c.is_active)
        console.log(`   Active configurations: ${activeConfigs.length}`)
        
        if (activeConfigs.length > 0) {
          const config = activeConfigs[0]
          console.log('   Sample config:', config.name)
          console.log('   - Threshold:', config.low_score_threshold)
          console.log('   - Email score:', config.email_score)
          console.log('   - Phone score:', config.telefone_score)
          console.log('   - Low score closer:', config.low_score_closer_id || 'Not set')
          console.log('   - High score closer:', config.high_score_closer_id || 'Not set')
        }
      }
    }

    // 4. Analyze Lead Creation and Scoring
    console.log('\n👤 Analyzing Lead Creation and Scoring...')
    const { data: recentLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, nome_completo, email, lead_score, status, closer_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (leadsError) {
      console.log('❌ Leads not accessible:', leadsError.message)
    } else {
      console.log(`✅ Found ${recentLeads.length} recent leads`)
      
      const scoredLeads = recentLeads.filter(l => l.lead_score > 0).length
      const assignedLeads = recentLeads.filter(l => l.closer_id).length
      
      console.log(`   Scored leads: ${scoredLeads}/${recentLeads.length}`)
      console.log(`   Assigned leads: ${assignedLeads}/${recentLeads.length}`)
      
      if (scoredLeads > 0) {
        analysis.integration.working_features.push('Lead scoring system functional')
      } else {
        analysis.integration.missing_features.push('Lead scoring not working or not triggered')
      }
      
      if (assignedLeads > 0) {
        analysis.integration.working_features.push('Lead assignment working')
      } else {
        analysis.integration.missing_features.push('Automatic lead assignment not working')
      }
    }

    // 5. Analyze Calendar Integration
    console.log('\n📅 Analyzing Calendar Integration...')
    const { data: bookingLinks, error: bookingError } = await supabase
      .from('agendamento_links')
      .select('*')
      .limit(10)

    if (bookingError) {
      console.log('❌ Booking links not accessible:', bookingError.message)
      analysis.calendar.status = 'error'
    } else {
      analysis.calendar.status = 'working'
      analysis.calendar.booking_links = bookingLinks.length
      console.log(`✅ Found ${bookingLinks.length} booking links`)
      
      if (bookingLinks.length > 0) {
        const activeLinks = bookingLinks.filter(l => l.ativo).length
        console.log(`   Active links: ${activeLinks}`)
        analysis.integration.working_features.push('Calendar booking system available')
      }
    }

    // 6. Check Closers Configuration
    console.log('\n👥 Analyzing Closers Configuration...')
    const { data: closers, error: closersError } = await supabase
      .from('closers')
      .select('*')

    if (closersError) {
      console.log('❌ Closers not accessible:', closersError.message)
      analysis.integration.missing_features.push('Closers management system not accessible')
    } else {
      console.log(`✅ Found ${closers.length} closers`)
      if (closers.length === 0) {
        analysis.integration.missing_features.push('No closers configured for assignment')
        analysis.recommendations.push('Configure closers in the system for automatic assignment')
      } else {
        const activeClosers = closers.filter(c => c.status_contrato === 'ativo').length
        console.log(`   Active closers: ${activeClosers}`)
        analysis.integration.working_features.push(`${activeClosers} active closers available`)
      }
    }

    // 7. Check API Endpoints
    console.log('\n🌐 Checking API Endpoints...')
    try {
      const response = await fetch('http://localhost:3000/api/leads/qualification-form', {
        method: 'OPTIONS'
      })
      if (response.ok) {
        analysis.integration.working_features.push('Lead qualification API endpoint accessible')
        console.log('✅ Lead qualification API working')
      }
    } catch (error) {
      console.log('⚠️  Lead qualification API not accessible')
      analysis.integration.missing_features.push('Lead qualification API not accessible')
    }

    // 8. File Structure Analysis
    console.log('\n📁 Analyzing File Structure...')
    const formBuilderPath = './src/app/form-builder/page.tsx'
    const formsPath = './src/app/forms/[slug]/page.tsx'
    const qualificationFormPath = './src/components/lead-qualification-form.tsx'

    if (fs.existsSync(formBuilderPath)) {
      analysis.form_builder.features.push('Form builder UI exists')
      console.log('✅ Form builder page found')
    } else {
      analysis.form_builder.gaps.push('Form builder UI missing')
    }

    if (fs.existsSync(formsPath)) {
      analysis.form_builder.features.push('Dynamic form display exists')
      console.log('✅ Dynamic form display found')
    } else {
      analysis.form_builder.gaps.push('Dynamic form display missing')
    }

    if (fs.existsSync(qualificationFormPath)) {
      analysis.integration.working_features.push('Lead qualification component exists')
      console.log('✅ Lead qualification component found')
    } else {
      analysis.integration.missing_features.push('Lead qualification component missing')
    }

    // Generate Final Analysis
    console.log('\n' + '='.repeat(60))
    console.log('📊 COMPREHENSIVE ANALYSIS RESULTS')
    console.log('='.repeat(60))

    console.log('\n🏗️  FORM BUILDER STATUS:', analysis.form_builder.status.toUpperCase())
    if (analysis.form_builder.features.length > 0) {
      console.log('   Working Features:')
      analysis.form_builder.features.forEach(f => console.log(`   ✅ ${f}`))
    }
    if (analysis.form_builder.gaps.length > 0) {
      console.log('   Gaps Found:')
      analysis.form_builder.gaps.forEach(g => console.log(`   ❌ ${g}`))
    }

    console.log('\n🎯 SCORING SYSTEM STATUS:', analysis.scoring_system.status.toUpperCase())
    console.log(`   Configurations: ${analysis.scoring_system.configs}`)
    if (analysis.scoring_system.gaps.length > 0) {
      analysis.scoring_system.gaps.forEach(g => console.log(`   ❌ ${g}`))
    }

    console.log('\n🔗 INTEGRATION STATUS')
    if (analysis.integration.working_features.length > 0) {
      console.log('   Working Features:')
      analysis.integration.working_features.forEach(f => console.log(`   ✅ ${f}`))
    }
    if (analysis.integration.missing_features.length > 0) {
      console.log('   Missing Features:')
      analysis.integration.missing_features.forEach(f => console.log(`   ❌ ${f}`))
    }

    console.log('\n📅 CALENDAR INTEGRATION STATUS:', analysis.calendar.status.toUpperCase())
    console.log(`   Booking Links: ${analysis.calendar.booking_links}`)

    // Generate Recommendations
    console.log('\n💡 RECOMMENDATIONS')
    console.log('==================')

    if (analysis.form_builder.gaps.includes('Cannot access form_templates table due to RLS policy')) {
      console.log('1. 🔒 Fix RLS policies for form_templates table to allow proper access')
    }

    if (analysis.integration.missing_features.includes('Form submissions not creating leads automatically')) {
      console.log('2. 🔄 Implement automatic lead creation trigger on form submission')
    }

    if (analysis.integration.missing_features.includes('Lead scoring not working or not triggered')) {
      console.log('3. 🎯 Implement automatic scoring trigger when leads are created from forms')
    }

    if (analysis.integration.missing_features.includes('No closers configured for assignment')) {
      console.log('4. 👥 Configure closers in the system for automatic lead assignment')
    }

    if (!analysis.integration.working_features.some(f => f.includes('scoring configuration references'))) {
      console.log('5. 🔗 Add scoring configuration selection to form builder')
    }

    console.log('6. 📊 Add real-time score preview in form builder')
    console.log('7. 📅 Enhance calendar integration with automatic booking after form submission')
    console.log('8. 🎨 Add visual scoring preview in forms for better user experience')

    console.log('\n🎯 PRIORITY IMPLEMENTATION ORDER')
    console.log('===============================')
    console.log('1. Fix database permissions (RLS policies)')
    console.log('2. Implement form → lead → scoring → assignment workflow')
    console.log('3. Add scoring configuration to form builder')
    console.log('4. Enhance calendar integration')
    console.log('5. Add real-time previews and better UX')

  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
  }
}

// Run the analysis
analyzeFormIntegration()