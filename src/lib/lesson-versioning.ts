// Sistema de Versionamento de Aulas
// Funções para gerenciar versões de aulas

import { createClient } from '@/lib/supabase'

export interface VideoLesson {
  id: string
  title: string
  description: string | null
  module_id: string
  is_current: boolean
  version: string
  archived_at: string | null
  replaced_by: string | null
  archive_reason: string | null
  is_active: boolean
  order_index: number
  created_at: string
  updated_at: string
}

// Buscar aulas atuais para mentorados
export async function getCurrentLessons(moduleId?: string) {
  const supabase = createClient()
  
  let query = supabase
    .from('video_lessons')
    .select('*')
    .eq('is_current', true)
    .eq('is_active', true)
    .order('order_index', { ascending: true })
  
  if (moduleId) {
    query = query.eq('module_id', moduleId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Erro ao buscar aulas atuais:', error)
    return null
  }
  
  return data as VideoLesson[]
}

// Buscar todas as versões de aulas (para admins)
export async function getAllLessonVersions(moduleId?: string) {
  const supabase = createClient()
  
  let query = supabase
    .from('video_lessons')
    .select(`
      *,
      replaced_lesson:replaced_by (
        id,
        title,
        version
      )
    `)
    .order('created_at', { ascending: false })
  
  if (moduleId) {
    query = query.eq('module_id', moduleId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Erro ao buscar todas as versões:', error)
    return null
  }
  
  return data as VideoLesson[]
}

// Arquivar uma aula
export async function archiveLesson(
  lessonId: string, 
  reason?: string, 
  replacementId?: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('video_lessons')
    .update({
      is_current: false,
      archived_at: new Date().toISOString(),
      archive_reason: reason,
      replaced_by: replacementId
    })
    .eq('id', lessonId)
    .select()
    .single()
  
  if (error) {
    console.error('Erro ao arquivar aula:', error)
    return { success: false, error }
  }
  
  return { success: true, data }
}

// Restaurar uma aula arquivada
export async function restoreLesson(lessonId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('video_lessons')
    .update({
      is_current: true,
      archived_at: null,
      archive_reason: null
    })
    .eq('id', lessonId)
    .select()
    .single()
  
  if (error) {
    console.error('Erro ao restaurar aula:', error)
    return { success: false, error }
  }
  
  return { success: true, data }
}

// Criar nova versão de uma aula
export async function createLessonVersion(
  originalLessonId: string,
  updates: {
    title?: string
    description?: string
    panda_video_embed_url?: string
    duration_minutes?: number
  }
) {
  const supabase = createClient()
  
  try {
    // 1. Buscar aula original
    const { data: originalLesson, error: fetchError } = await supabase
      .from('video_lessons')
      .select('*')
      .eq('id', originalLessonId)
      .single()
    
    if (fetchError || !originalLesson) {
      return { success: false, error: 'Aula original não encontrada' }
    }
    
    // 2. Arquivar versão atual
    await archiveLesson(originalLessonId, 'Nova versão criada')
    
    // 3. Calcular nova versão
    const currentVersion = parseFloat(originalLesson.version.replace('v', ''))
    const newVersion = `v${(currentVersion + 0.1).toFixed(1)}`
    
    // 4. Criar nova versão
    const { data: newLesson, error: createError } = await supabase
      .from('video_lessons')
      .insert({
        module_id: originalLesson.module_id,
        title: updates.title || originalLesson.title,
        description: updates.description || originalLesson.description,
        panda_video_embed_url: updates.panda_video_embed_url || originalLesson.panda_video_embed_url,
        duration_minutes: updates.duration_minutes || originalLesson.duration_minutes,
        order_index: originalLesson.order_index,
        is_active: true,
        organization_id: originalLesson.organization_id,
        is_current: true,
        version: newVersion
      })
      .select()
      .single()
    
    if (createError) {
      return { success: false, error: createError }
    }
    
    // 5. Atualizar aula arquivada com referência à nova
    await supabase
      .from('video_lessons')
      .update({ replaced_by: newLesson.id })
      .eq('id', originalLessonId)
    
    return { success: true, data: newLesson, version: newVersion }
    
  } catch (error) {
    console.error('Erro ao criar nova versão:', error)
    return { success: false, error }
  }
}

// Obter estatísticas de versionamento
export async function getLessonStats() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('video_lessons')
    .select('is_current, version, archived_at')
  
  if (error) {
    return { success: false, error }
  }
  
  const stats = {
    total: data.length,
    current: data.filter(l => l.is_current).length,
    archived: data.filter(l => !l.is_current && l.archived_at).length,
    versions: Array.from(new Set(data.map(l => l.version))).length
  }
  
  return { success: true, stats }
}