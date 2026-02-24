import { supabase } from './supabase'

// ========================================
// TIPOS DE DADOS
// ========================================

export interface FormularioAula {
  id: string
  mentorado_id: string
  lesson_id: string
  module_id?: string
  tipo: 'pos_aula' | 'pos_modulo' | 'nps'
  nps_score?: number
  feedback: string
  duvidas?: string
  sugestoes?: string
  created_at: string
}

export interface MetaAluno {
  id: string
  mentorado_id: string
  titulo: string
  descricao: string
  prazo: 'curto' | 'medio' | 'longo' | 'grande'
  status: 'ativo' | 'concluido' | 'pausado'
  criado_por: 'admin' | 'aluno'
  data_meta: string
  data_conclusao?: string
  module_relacionado?: string
  lesson_relacionada?: string
}

export interface AnotacaoAula {
  id: string
  mentorado_id: string
  lesson_id: string
  timestamp_video: number
  conteudo: string
  tipo: 'anotacao' | 'duvida' | 'importante' | 'resumo'
  created_at: string
}

export interface ConquistaAluno {
  id: string
  mentorado_id: string
  tipo: 'primeira_aula' | 'modulo_completo' | 'meta_alcancada' | 'streak_7_dias' | 'nps_alto'
  titulo: string
  descricao: string
  pontos: number
  conquistada_em: string
}

// ========================================
// SERVIÇO DE FORMULÁRIOS
// ========================================

export const formularioService = {
  // Salvar resposta de formulário pós-aula
  async salvarFormularioAula(dados: Omit<FormularioAula, 'id' | 'created_at'>, organizationId?: string) {
    // Buscar organization_id do mentorado se não foi fornecido
    let orgId = organizationId
    if (!orgId) {
      const { data: mentorado } = await supabase
        .from('mentorados')
        .select('organization_id')
        .eq('id', dados.mentorado_id)
        .single()
      
      orgId = mentorado?.organization_id
    }

    const resposta = {
      mentorado_id: dados.mentorado_id,
      organization_id: orgId,
      formulario: dados.tipo,
      resposta_json: {
        lesson_id: dados.lesson_id,
        module_id: dados.module_id,
        nps_score: dados.nps_score,
        feedback: dados.feedback,
        duvidas: dados.duvidas,
        sugestoes: dados.sugestoes,
        timestamp: new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('formularios_respostas')
      .insert([resposta])
      .select()

    if (error) {
      console.error('Erro ao salvar formulário:', error)
      throw error
    }
    return data[0]
  },

  // Buscar formulários de um mentorado
  async buscarFormularios(mentorado_id: string) {
    const { data, error } = await supabase
      .from('formularios_respostas')
      .select('*')
      .eq('mentorado_id', mentorado_id)
      .order('data_envio', { ascending: false })

    if (error) throw error
    return data
  },

  // Buscar formulários por aula
  async buscarFormulariosPorAula(lesson_id: string) {
    const { data, error } = await supabase
      .from('formularios_respostas')
      .select('*')
      .contains('resposta_json', { lesson_id })
      .order('data_envio', { ascending: false })

    if (error) throw error
    return data
  }
}

// ========================================
// SERVIÇO DE METAS (usando formularios_respostas)
// ========================================

export const metasService = {
  // Criar nova meta
  async criarMeta(meta: Omit<MetaAluno, 'id'>) {
    const metaData = {
      mentorado_id: meta.mentorado_id,
      formulario: 'meta',
      resposta_json: {
        titulo: meta.titulo,
        descricao: meta.descricao,
        prazo: meta.prazo,
        status: meta.status,
        criado_por: meta.criado_por,
        data_meta: meta.data_meta,
        module_relacionado: meta.module_relacionado,
        lesson_relacionada: meta.lesson_relacionada,
        tipo: 'criacao_meta'
      }
    }

    const { data, error } = await supabase
      .from('formularios_respostas')
      .insert([metaData])
      .select()

    if (error) throw error
    return data[0]
  },

  // Atualizar status da meta
  async atualizarMeta(meta_id: string, updates: Partial<MetaAluno>) {
    // Buscar meta atual
    const { data: metaAtual, error: fetchError } = await supabase
      .from('formularios_respostas')
      .select('*')
      .eq('id', meta_id)
      .single()

    if (fetchError) throw fetchError

    // Atualizar dados
    const dadosAtualizados = {
      ...metaAtual.resposta_json,
      ...updates,
      ultima_atualizacao: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('formularios_respostas')
      .update({ resposta_json: dadosAtualizados })
      .eq('id', meta_id)
      .select()

    if (error) throw error
    return data[0]
  },

  // Buscar metas do aluno
  async buscarMetas(mentorado_id: string) {
    const { data, error } = await supabase
      .from('formularios_respostas')
      .select('*')
      .eq('mentorado_id', mentorado_id)
      .eq('formulario', 'meta')
      .order('data_envio', { ascending: false })

    if (error) throw error
    return data
  }
}

// ========================================
// SERVIÇO DE ANOTAÇÕES (usando formularios_respostas)
// ========================================

export const anotacoesService = {
  // Salvar anotação durante a aula
  async salvarAnotacao(anotacao: Omit<AnotacaoAula, 'id' | 'created_at'>, organizationId?: string) {
    // Buscar organization_id do mentorado se não foi fornecido
    let orgId = organizationId
    if (!orgId) {
      const { data: mentorado } = await supabase
        .from('mentorados')
        .select('organization_id')
        .eq('id', anotacao.mentorado_id)
        .single()
      
      orgId = mentorado?.organization_id
    }

    const anotacaoData = {
      mentorado_id: anotacao.mentorado_id,
      organization_id: orgId,
      formulario: 'anotacao',
      resposta_json: {
        lesson_id: anotacao.lesson_id,
        timestamp_video: anotacao.timestamp_video,
        conteudo: anotacao.conteudo,
        tipo: anotacao.tipo,
        criado_em: new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('formularios_respostas')
      .insert([anotacaoData])
      .select()

    if (error) {
      console.error('Erro ao salvar anotação:', error)
      throw error
    }
    return data[0]
  },

  // Buscar anotações de uma aula
  async buscarAnotacoesDaAula(lesson_id: string, mentorado_id: string) {
    const { data, error } = await supabase
      .from('formularios_respostas')
      .select('*')
      .eq('mentorado_id', mentorado_id)
      .eq('formulario', 'anotacao')
      .contains('resposta_json', { lesson_id })
      .order('data_envio', { ascending: true })

    if (error) throw error
    return data
  },

  // Buscar todas anotações do aluno
  async buscarAnotacoes(mentorado_id: string) {
    const { data, error } = await supabase
      .from('formularios_respostas')
      .select('*')
      .eq('mentorado_id', mentorado_id)
      .eq('formulario', 'anotacao')
      .order('data_envio', { ascending: false })

    if (error) throw error
    return data
  }
}

// ========================================
// SERVIÇO DE CONQUISTAS (usando formularios_respostas)
// ========================================

export const conquistasService = {
  // Registrar nova conquista
  async registrarConquista(conquista: Omit<ConquistaAluno, 'id'>) {
    const conquistaData = {
      mentorado_id: conquista.mentorado_id,
      formulario: 'conquista',
      resposta_json: {
        tipo: conquista.tipo,
        titulo: conquista.titulo,
        descricao: conquista.descricao,
        pontos: conquista.pontos,
        conquistada_em: conquista.conquistada_em
      }
    }

    const { data, error } = await supabase
      .from('formularios_respostas')
      .insert([conquistaData])
      .select()

    if (error) throw error
    return data[0]
  },

  // Buscar conquistas do aluno
  async buscarConquistas(mentorado_id: string) {
    const { data, error } = await supabase
      .from('formularios_respostas')
      .select('*')
      .eq('mentorado_id', mentorado_id)
      .eq('formulario', 'conquista')
      .order('data_envio', { ascending: false })

    if (error) throw error
    return data
  },

  // Verificar se aluno já tem conquista específica
  async verificarConquista(mentorado_id: string, tipo: string) {
    const { data, error } = await supabase
      .from('formularios_respostas')
      .select('*')
      .eq('mentorado_id', mentorado_id)
      .eq('formulario', 'conquista')
      .contains('resposta_json', { tipo })

    if (error) throw error
    return data.length > 0
  }
}

// ========================================
// SERVIÇO DE ONBOARDING (usando formularios_respostas)
// ========================================

export const onboardingService = {
  // Iniciar onboarding
  async iniciarOnboarding(mentorado_id: string, dadosIniciais: any) {
    const onboardingData = {
      mentorado_id,
      formulario: 'onboarding',
      resposta_json: {
        step_atual: 1,
        total_steps: 5,
        progresso: 20,
        dados_coletados: dadosIniciais,
        iniciado_em: new Date().toISOString(),
        status: 'em_andamento'
      }
    }

    const { data, error } = await supabase
      .from('formularios_respostas')
      .insert([onboardingData])
      .select()

    if (error) throw error
    return data[0]
  },

  // Atualizar progresso do onboarding
  async atualizarProgresso(onboarding_id: string, step: number, novosDados: any) {
    const { data: onboardingAtual } = await supabase
      .from('formularios_respostas')
      .select('*')
      .eq('id', onboarding_id)
      .single()

    const dadosAtualizados = {
      ...onboardingAtual?.resposta_json,
      step_atual: step,
      progresso: (step / 5) * 100,
      dados_coletados: {
        ...onboardingAtual?.resposta_json.dados_coletados,
        ...novosDados
      },
      atualizado_em: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('formularios_respostas')
      .update({ resposta_json: dadosAtualizados })
      .eq('id', onboarding_id)
      .select()

    if (error) throw error
    return data[0]
  },

  // Buscar onboarding do aluno
  async buscarOnboarding(mentorado_id: string) {
    const { data, error } = await supabase
      .from('formularios_respostas')
      .select('*')
      .eq('mentorado_id', mentorado_id)
      .eq('formulario', 'onboarding')
      .order('data_envio', { ascending: false })
      .limit(1)

    if (error) throw error
    return data[0]
  }
}

// ========================================
// SERVIÇO DE DASHBOARD/ANALYTICS
// ========================================

export const dashboardService = {
  // Buscar estatísticas do aluno
  async buscarEstatisticasAluno(mentorado_id: string) {
    const [formularios, metas, anotacoes, conquistas] = await Promise.all([
      formularioService.buscarFormularios(mentorado_id),
      metasService.buscarMetas(mentorado_id),
      anotacoesService.buscarAnotacoes(mentorado_id),
      conquistasService.buscarConquistas(mentorado_id)
    ])

    return {
      total_formularios: formularios.length,
      total_metas: metas.length,
      metas_concluidas: metas.filter(m => m.resposta_json.status === 'concluido').length,
      total_anotacoes: anotacoes.length,
      total_conquistas: conquistas.length,
      pontos_total: conquistas.reduce((acc, c) => acc + (c.resposta_json.pontos || 0), 0)
    }
  },

  // Buscar dados para o admin dashboard
  async buscarDadosAdmin() {
    const { data, error } = await supabase
      .from('formularios_respostas')
      .select(`
        *,
        mentorados(nome_completo, email)
      `)
      .order('data_envio', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }
}