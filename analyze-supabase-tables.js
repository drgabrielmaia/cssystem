import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'
const supabase = supabaseCreateClient(supabaseUrl, supabaseKey)

async function analyzeTables() {
  console.log('🔍 Analisando estrutura do Supabase...\n')

  // 1. Verificar tabelas de vídeos existentes
  console.log('📹 TABELAS DE VÍDEOS:')
  try {
    const { data: modules } = await supabase.from('video_modules').select('*').limit(1)
    const { data: lessons } = await supabase.from('video_lessons').select('*').limit(1)
    const { data: progress } = await supabase.from('lesson_progress').select('*').limit(1)

    console.log('✅ video_modules:', modules ? 'EXISTS' : 'NOT FOUND')
    console.log('✅ video_lessons:', lessons ? 'EXISTS' : 'NOT FOUND')
    console.log('✅ lesson_progress:', progress ? 'EXISTS' : 'NOT FOUND')
  } catch (e) {
    console.log('❌ Erro ao verificar tabelas de vídeo:', e.message)
  }

  // 2. Verificar tabelas de mentorados
  console.log('\n👥 TABELAS DE MENTORADOS:')
  try {
    const { data: mentorados } = await supabase.from('mentorados').select('*').limit(1)
    console.log('✅ mentorados:', mentorados ? 'EXISTS' : 'NOT FOUND')
  } catch (e) {
    console.log('❌ Erro ao verificar mentorados:', e.message)
  }

  // 3. Verificar sistema de metas atual
  console.log('\n🎯 SISTEMA DE METAS:')
  try {
    const { data: metas } = await supabase.from('metas').select('*').limit(1)
    const { data: objetivos } = await supabase.from('objetivos').select('*').limit(1)
    console.log('✅ metas:', metas ? 'EXISTS' : 'NOT FOUND')
    console.log('✅ objetivos:', objetivos ? 'EXISTS' : 'NOT FOUND')
  } catch (e) {
    console.log('❌ Erro ao verificar metas:', e.message)
  }

  // 4. Verificar formulários existentes
  console.log('\n📝 SISTEMA DE FORMULÁRIOS:')
  try {
    const { data: forms } = await supabase.from('formularios').select('*').limit(1)
    const { data: responses } = await supabase.from('respostas_formulario').select('*').limit(1)
    console.log('✅ formularios:', forms ? 'EXISTS' : 'NOT FOUND')
    console.log('✅ respostas_formulario:', responses ? 'EXISTS' : 'NOT FOUND')
  } catch (e) {
    console.log('❌ Erro ao verificar formulários:', e.message)
  }

  // 5. Verificar onboarding atual
  console.log('\n🚀 SISTEMA DE ONBOARDING:')
  try {
    const { data: onboarding } = await supabase.from('onboarding').select('*').limit(1)
    const { data: mindmap } = await supabase.from('mindmap_nodes').select('*').limit(1)
    console.log('✅ onboarding:', onboarding ? 'EXISTS' : 'NOT FOUND')
    console.log('✅ mindmap_nodes:', mindmap ? 'EXISTS' : 'NOT FOUND')
  } catch (e) {
    console.log('❌ Erro ao verificar onboarding:', e.message)
  }

  // 6. Buscar estruturas das tabelas principais
  console.log('\n📋 ESTRUTURAS DETALHADAS:')

  // Video Modules
  try {
    const { data } = await supabase.from('video_modules').select('*').limit(1)
    if (data && data[0]) {
      console.log('📹 video_modules columns:', Object.keys(data[0]))
    }
  } catch (e) {}

  // Video Lessons
  try {
    const { data } = await supabase.from('video_lessons').select('*').limit(1)
    if (data && data[0]) {
      console.log('🎓 video_lessons columns:', Object.keys(data[0]))
    }
  } catch (e) {}

  // Lesson Progress
  try {
    const { data } = await supabase.from('lesson_progress').select('*').limit(1)
    if (data && data[0]) {
      console.log('📊 lesson_progress columns:', Object.keys(data[0]))
    }
  } catch (e) {}

  // Mentorados
  try {
    const { data } = await supabase.from('mentorados').select('*').limit(1)
    if (data && data[0]) {
      console.log('👥 mentorados columns:', Object.keys(data[0]))
    }
  } catch (e) {}

  console.log('\n✅ Análise completa!')
}

analyzeTables().catch(console.error)