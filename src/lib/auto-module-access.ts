/**
 * Função para automaticamente liberar todos os módulos para um novo mentorado
 * CHEGA DE LOUCURA! Todo mundo tem acesso a tudo!
 */

import { supabase } from '@/lib/supabase'

export async function liberarTodosModulosParaMentorado(mentoradoId: string, organizationId: string) {
  try {
    console.log('🚀 Liberando TODOS os módulos para mentorado:', mentoradoId)
    
    // Buscar todos os módulos ativos da organização
    const { data: modules, error: modulesError } = await supabase
      .from('video_modules')
      .select('id, title')
      .eq('is_active', true)
      .eq('organization_id', organizationId)

    if (modulesError) {
      console.error('❌ Erro ao buscar módulos:', modulesError)
      return false
    }

    if (!modules || modules.length === 0) {
      console.log('⚠️ Nenhum módulo encontrado para a organização')
      return true // Não é erro, só não tem módulos
    }

    console.log(`📚 Encontrados ${modules.length} módulos para liberar`)

    // Criar acessos para todos os módulos
    const accessRecords = modules.map(module => ({
      mentorado_id: mentoradoId,
      module_id: module.id,
      has_access: true,
      granted_at: new Date().toISOString(),
      granted_by: 'auto_new_mentorado',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Inserir todos os acessos
    const { error: insertError } = await supabase
      .from('video_access_control')
      .insert(accessRecords)

    if (insertError) {
      console.error('❌ Erro ao criar acessos automáticos:', insertError)
      return false
    }

    console.log(`✅ ${modules.length} módulos liberados automaticamente!`)
    modules.forEach(m => console.log(`  ✓ ${m.title}`))

    return true

  } catch (error) {
    console.error('💥 Erro na liberação automática de módulos:', error)
    return false
  }
}

/**
 * Função para liberar todos os módulos para TODOS os mentorados existentes (uso admin)
 */
export async function liberarTodosModulosParaTodos() {
  try {
    console.log('🚀 LIBERAÇÃO UNIVERSAL - ACABOU A LOUCURA!')
    
    // Implementation já foi feita anteriormente via script
    // Esta função é um placeholder para uso futuro
    
    return true
  } catch (error) {
    console.error('💥 Erro na liberação universal:', error)
    return false
  }
}