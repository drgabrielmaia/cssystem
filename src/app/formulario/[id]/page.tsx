'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  Heart,
  CheckCircle,
  ArrowRight,
  Send,
  ThumbsUp,
  Target,
  TrendingUp,
  Award,
  Sparkles,
  Globe,
  BookOpen
} from 'lucide-react'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  turma: string
}

const FORMULARIOS_CONFIG = {
  'nps': {
    titulo: '🌟 Avaliação da Mentoria',
    subtitulo: 'Queremos saber como está sendo sua experiência!',
    cor: 'from-purple-500 to-pink-500',
    icone: <Star className="h-8 w-8" />,
    perguntas: [
      {
        id: 'nota_nps',
        tipo: 'nps',
        pergunta: 'Em uma escala de 0 a 10, o quanto você recomendaria nossa mentoria para um amigo?',
        obrigatorio: true
      },
      // Perguntas condicionais baseadas na nota NPS serão renderizadas dinamicamente
    ]
  },
  'vendas': {
    titulo: '💰 Módulo IV - Vendas',
    subtitulo: 'Como foi sua experiência com vendas e qualificação?',
    cor: 'from-emerald-500 to-teal-500',
    icone: <TrendingUp className="h-8 w-8" />,
    perguntas: [
      {
        id: 'qualificacao_pacientes',
        tipo: 'escala',
        pergunta: 'Como você avalia seu aprendizado em qualificação de pacientes?',
        escala: { min: 1, max: 5, labels: ['Muito Fraco', 'Fraco', 'Regular', 'Bom', 'Excelente'] },
        obrigatorio: true
      },
      {
        id: 'spin_selling',
        tipo: 'multipla',
        pergunta: 'Você consegue aplicar a técnica SPIN Selling?',
        opcoes: ['sim', 'parcialmente', 'nao'],
        labels: ['Sim, totalmente', 'Parcialmente', 'Não consegui ainda'],
        obrigatorio: true
      },
      {
        id: 'venda_consultiva',
        tipo: 'multipla',
        pergunta: 'Como está sua aplicação da venda consultiva?',
        opcoes: ['sim', 'parcialmente', 'nao'],
        labels: ['Domino completamente', 'Estou praticando', 'Preciso melhorar'],
        obrigatorio: true
      },
      {
        id: 'taxa_fechamento',
        tipo: 'escala',
        pergunta: 'Como você avalia sua taxa de fechamento atual?',
        escala: { min: 1, max: 5, labels: ['Muito Baixa', 'Baixa', 'Regular', 'Boa', 'Excelente'] }
      },
      {
        id: 'feedback_preco',
        tipo: 'textarea',
        pergunta: 'Algum feedback sobre precificação e apresentação de preços?',
        placeholder: 'Como tem sido sua experiência com preços...'
      },
      {
        id: 'nps',
        tipo: 'nps',
        pergunta: 'Nota geral para este módulo (0-10)',
        obrigatorio: true
      }
    ]
  },
  'gestao': {
    titulo: '🎯 Módulo III - Gestão e Marketing',
    subtitulo: 'Feedback sobre jornada do paciente e estratégias',
    cor: 'from-blue-500 to-indigo-500',
    icone: <Target className="h-8 w-8" />,
    perguntas: [
      {
        id: 'jornada_paciente',
        tipo: 'multipla',
        pergunta: 'Você conseguiu estruturar a jornada do paciente?',
        opcoes: ['sim', 'parcialmente', 'nao'],
        labels: ['Sim, está clara', 'Estou trabalhando nisso', 'Preciso de mais ajuda'],
        obrigatorio: true
      },
      {
        id: 'modelo_disney',
        tipo: 'multipla',
        pergunta: 'Como está a aplicação do modelo Disney na sua prática?',
        opcoes: ['sim', 'parcialmente', 'nao'],
        labels: ['Já implementei', 'Em implementação', 'Ainda vou implementar'],
        obrigatorio: true
      },
      {
        id: 'neuromarketing',
        tipo: 'multipla',
        pergunta: 'Está conseguindo aplicar conceitos de neuromarketing?',
        opcoes: ['sim', 'parcialmente', 'nao'],
        labels: ['Sim, uso regularmente', 'Às vezes aplico', 'Ainda estudando'],
        obrigatorio: true
      },
      {
        id: 'reduzir_noshow',
        tipo: 'escala',
        pergunta: 'Como avalia sua evolução em reduzir no-shows?',
        escala: { min: 1, max: 5, labels: ['Nenhuma melhora', 'Pouca melhora', 'Alguma melhora', 'Boa melhora', 'Grande melhora'] },
        obrigatorio: true
      },
      {
        id: 'estruturar_processos',
        tipo: 'multipla',
        pergunta: 'Conseguiu estruturar melhor seus processos operacionais?',
        opcoes: ['sim', 'parcialmente', 'nao'],
        labels: ['Totalmente estruturado', 'Em estruturação', 'Preciso estruturar'],
        obrigatorio: true
      },
      {
        id: 'feedback_operacao',
        tipo: 'textarea',
        pergunta: 'Algum feedback sobre operação e gestão?',
        placeholder: 'Como tem sido sua experiência operacional...'
      },
      {
        id: 'nps',
        tipo: 'nps',
        pergunta: 'Nota geral para este módulo (0-10)',
        obrigatorio: true
      }
    ]
  },
  'digital': {
    titulo: '🚀 Módulo II - Posicionamento Digital',
    subtitulo: 'Breve avaliação de feedback sobre o conteúdo consumido',
    cor: 'from-purple-500 to-pink-500',
    icone: <Globe className="h-8 w-8" />,
    perguntas: [
      {
        id: 'proposta_valor',
        tipo: 'escala',
        pergunta: 'Sua proposta de valor (Pra quem você vai falar /Como quer ser visto/por quê) ficou clara?',
        escala: { min: 1, max: 5, labels: ['1', '2', '3', '4', '5'] },
        obrigatorio: true
      },
      {
        id: 'bio_cta',
        tipo: 'escala',
        pergunta: 'Sua bio + CTA hoje comunica valor e próximo passo?',
        escala: { min: 1, max: 5, labels: ['1', '2', '3', '4', '5'] },
        obrigatorio: true
      },
      {
        id: 'funil_editorial',
        tipo: 'multipla',
        pergunta: 'Você sabe estruturar um funil editorial de 7 dias pronto para postar?',
        opcoes: ['sim', 'nao'],
        labels: ['Sim', 'Não'],
        obrigatorio: true
      },
      {
        id: 'formatos_aprendidos',
        tipo: 'textarea',
        pergunta: 'Quais formatos você aprendeu a usar de maneira intencional?',
        placeholder: 'Liste os formatos que você aprendeu a usar...',
        obrigatorio: true
      },
      {
        id: 'confianca_publicar',
        tipo: 'escala',
        pergunta: 'O conteúdo do módulo te deixou mais confiante para publicar com constância?',
        escala: { min: 1, max: 5, labels: ['1', '2', '3', '4', '5'] },
        obrigatorio: true
      },
      {
        id: 'bloqueio_consistencia',
        tipo: 'textarea',
        pergunta: 'Principal bloqueio para consistência (tempo, ideias, câmera, haters, outra)?',
        placeholder: 'Descreva seus principais bloqueios...',
        obrigatorio: true
      },
      {
        id: 'nps',
        tipo: 'nps',
        pergunta: 'NPS do módulo digital (Recomendaria a um colega?)',
        obrigatorio: true
      }
    ]
  },
  'posicionamento-digital': {
    titulo: '🎨 Módulo II - Posicionamento Digital',
    subtitulo: 'Feedback sobre proposta de valor e presença digital',
    cor: 'from-cyan-500 to-blue-500',
    icone: <Sparkles className="h-8 w-8" />,
    perguntas: [
      {
        id: 'proposta_valor',
        tipo: 'escala',
        pergunta: 'Como você avalia sua clareza na proposta de valor?',
        escala: { min: 1, max: 5, labels: ['Muito Confusa', 'Confusa', 'Regular', 'Clara', 'Muito Clara'] },
        obrigatorio: true
      },
      {
        id: 'bio_cta',
        tipo: 'escala',
        pergunta: 'Como está sua bio e CTA nas redes sociais?',
        escala: { min: 1, max: 5, labels: ['Muito Fraca', 'Fraca', 'Regular', 'Boa', 'Excelente'] },
        obrigatorio: true
      },
      {
        id: 'funil_editorial',
        tipo: 'multipla',
        pergunta: 'Você conseguiu criar seu funil editorial?',
        opcoes: ['sim', 'nao'],
        labels: ['Sim, está funcionando', 'Ainda estou criando'],
        obrigatorio: true
      },
      {
        id: 'formatos_aprendidos',
        tipo: 'multipla_escolha',
        pergunta: 'Quais formatos você já domina?',
        opcoes: ['stories', 'reels', 'carrossel', 'estatico'],
        labels: ['Stories', 'Reels', 'Carrossel', 'Post Estático'],
        multipla: true
      },
      {
        id: 'confianca_publicar',
        tipo: 'escala',
        pergunta: 'Qual seu nível de confiança para publicar?',
        escala: { min: 1, max: 5, labels: ['Muito Inseguro', 'Inseguro', 'Neutro', 'Confiante', 'Muito Confiante'] },
        obrigatorio: true
      },
      {
        id: 'bloqueio_consistencia',
        tipo: 'textarea',
        pergunta: 'Qual seu maior bloqueio para ser consistente?',
        placeholder: 'Descreva seus principais desafios...',
        obrigatorio: true
      },
      {
        id: 'nps',
        tipo: 'nps',
        pergunta: 'Nota geral para este módulo (0-10)',
        obrigatorio: true
      }
    ]
  },
  'capacitacao': {
    titulo: '💡 Módulo - Capacitação técnica',
    subtitulo: 'Breve avaliação de feedback sobre o conteúdo consumido',
    cor: 'from-amber-500 to-orange-500',
    icone: <BookOpen className="h-8 w-8" />,
    perguntas: [
      {
        id: 'clareza_tratamentos',
        tipo: 'escala',
        pergunta: 'Quão claro ficou o passo a passo dos tratamentos apresentado?',
        escala: { min: 1, max: 5, labels: ['1', '2', '3', '4', '5'] },
        obrigatorio: true
      },
      {
        id: 'nivel_seguranca',
        tipo: 'escala',
        pergunta: 'Após a aula, qual seu nível de segurança para aplicar o conteúdo?',
        escala: { min: 1, max: 5, labels: ['1', '2', '3', '4', '5'] },
        obrigatorio: true
      },
      {
        id: 'parte_tecnica_mais_ajudou',
        tipo: 'textarea',
        pergunta: 'Qual parte técnica mais ajudou no resultado (ex.: fenótipo/perfil alimentar, adesão, ajustes)?',
        placeholder: 'Ex.: fenótipo/perfil alimentar, adesão, ajustes...',
        obrigatorio: true
      },
      {
        id: 'faltou_seguranca',
        tipo: 'textarea',
        pergunta: 'O que faltou para você se sentir 5/5 em segurança clínica?',
        placeholder: 'Digite sua resposta aqui...',
        obrigatorio: true
      },
      {
        id: 'barreira_implementar',
        tipo: 'textarea',
        pergunta: 'Maior barreira hoje para implementar (tempo, casos, materiais, equipe, local)?',
        placeholder: 'Digite sua resposta aqui...',
        obrigatorio: true
      },
      {
        id: 'nps',
        tipo: 'nps',
        pergunta: 'NPS do módulo técnico (recomendaria a um colega?)',
        obrigatorio: true
      }
    ]
  },
  'capacitacao-tecnica': {
    titulo: '🔬 Módulo - Capacitação técnica',
    subtitulo: 'Breve avaliação de feedback sobre o conteúdo consumido',
    cor: 'from-indigo-500 to-purple-500',
    icone: <Award className="h-8 w-8" />,
    perguntas: [
      {
        id: 'clareza_tratamentos',
        tipo: 'escala',
        pergunta: 'Quão claro ficou o passo a passo dos tratamentos apresentado?',
        escala: { min: 1, max: 5, labels: ['1', '2', '3', '4', '5'] },
        obrigatorio: true
      },
      {
        id: 'nivel_seguranca',
        tipo: 'escala',
        pergunta: 'Após a aula, qual seu nível de segurança para aplicar o conteúdo?',
        escala: { min: 1, max: 5, labels: ['1', '2', '3', '4', '5'] },
        obrigatorio: true
      },
      {
        id: 'parte_tecnica_mais_ajudou',
        tipo: 'textarea',
        pergunta: 'Qual parte técnica mais ajudou no resultado (ex.: fenótipo/perfil alimentar, adesão, ajustes)?',
        placeholder: 'Ex.: fenótipo/perfil alimentar, adesão, ajustes...',
        obrigatorio: true
      },
      {
        id: 'faltou_seguranca',
        tipo: 'textarea',
        pergunta: 'O que faltou para você se sentir 5/5 em segurança clínica?',
        placeholder: 'Digite sua resposta aqui...',
        obrigatorio: true
      },
      {
        id: 'barreira_implementar',
        tipo: 'textarea',
        pergunta: 'Maior barreira hoje para implementar (tempo, casos, materiais, equipe, local)?',
        placeholder: 'Digite sua resposta aqui...',
        obrigatorio: true
      },
      {
        id: 'nps',
        tipo: 'nps',
        pergunta: 'NPS do módulo técnico (recomendaria a um colega?)',
        obrigatorio: true
      }
    ]
  }
}

export default function FormularioPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const formularioId = params.id as string
  const mentoradoId = searchParams.get('mentorado_id')
  
  const [mentorado, setMentorado] = useState<Mentorado | null>(null)
  const [respostas, setRespostas] = useState<any>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(true)

  const formulario = FORMULARIOS_CONFIG[formularioId as keyof typeof FORMULARIOS_CONFIG]

  useEffect(() => {
    console.log('🔍 Formulário ID:', formularioId)
    console.log('🔍 Formulário encontrado:', !!formulario)
    console.log('🔍 Mentorado ID capturado:', mentoradoId)

    if (mentoradoId) {
      loadMentorado()
    } else {
      console.log('⚠️ Nenhum mentorado_id encontrado na URL')
      setLoading(false)
    }
  }, [mentoradoId])

  const loadMentorado = async () => {
    try {
      const { data } = await supabase
        .from('mentorados')
        .select('id, nome_completo, email, turma')
        .eq('id', mentoradoId)
        .single()
      
      if (data) {
        setMentorado(data)
      }
    } catch (error) {
      console.error('Erro ao carregar mentorado:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (perguntaId: string, valor: any) => {
    setRespostas((prev: any) => ({
      ...prev,
      [perguntaId]: valor
    }))
  }

  // Função para gerar perguntas dinâmicas baseadas na nota NPS
  const getPerguntasNPS = (notaNPS: number) => {
    const perguntasBase = [
      {
        id: 'nota_nps',
        tipo: 'nps',
        pergunta: 'Em uma escala de 0 a 10, o quanto você recomendaria nossa mentoria para um amigo?',
        obrigatorio: true
      }
    ]

    if (notaNPS >= 0 && notaNPS <= 6) {
      // DETRATORES (0-6) - Perguntas sobre problemas
      perguntasBase.push(
        {
          id: 'o_que_impediu_experiencia_9_10',
          tipo: 'textarea',
          pergunta: 'O que impediu que sua experiência fosse nota 9 ou 10?',
          placeholder: 'Conte-nos o que não funcionou bem...',
          obrigatorio: true
        } as any,
        {
          id: 'o_que_mudar_para_melhorar',
          tipo: 'textarea',
          pergunta: 'O que devemos mudar para melhorar a mentoria?',
          placeholder: 'Suas sugestões são muito importantes...',
          obrigatorio: true
        } as any,
        {
          id: 'ajuste_simples_maior_impacto',
          tipo: 'textarea',
          pergunta: 'Qual ajuste simples teria o maior impacto positivo?',
          placeholder: 'Uma mudança específica que faria toda diferença...'
        } as any,
        {
          id: 'pode_contatar',
          tipo: 'boolean',
          pergunta: 'Podemos entrar em contato para entender melhor sua experiência?',
          obrigatorio: false
        }
      )
    } else if (notaNPS >= 7 && notaNPS <= 8) {
      // NEUTROS (7-8) - Perguntas sobre o que faltou
      perguntasBase.push(
        {
          id: 'o_que_faltou_para_9_10',
          tipo: 'textarea',
          pergunta: 'O que faltou para dar nota 9 ou 10?',
          placeholder: 'Como podemos melhorar ainda mais...',
          obrigatorio: true
        } as any,
        {
          id: 'ajuste_simples_maior_impacto',
          tipo: 'textarea',
          pergunta: 'Qual ajuste simples teria o maior impacto positivo?',
          placeholder: 'Uma pequena mudança que faria grande diferença...',
          obrigatorio: false
        } as any,
        {
          id: 'autoriza_depoimento',
          tipo: 'boolean',
          pergunta: 'Você autoriza que usemos seu feedback como depoimento?',
          obrigatorio: false
        },
        {
          id: 'pode_contatar',
          tipo: 'boolean',
          pergunta: 'Podemos entrar em contato para mais feedback?',
          obrigatorio: false
        }
      )
    } else if (notaNPS >= 9 && notaNPS <= 10) {
      // PROMOTORES (9-10) - Perguntas sobre pontos positivos
      perguntasBase.push(
        {
          id: 'o_que_surpreendeu_positivamente',
          tipo: 'textarea',
          pergunta: 'O que mais te surpreendeu positivamente na mentoria?',
          placeholder: 'Conte-nos o que foi incrível...',
          obrigatorio: true
        } as any,
        {
          id: 'depoimento',
          tipo: 'textarea',
          pergunta: 'Deixe seu depoimento sobre a mentoria',
          placeholder: 'Seu depoimento inspira outros mentorados...',
          obrigatorio: true
        } as any,
        {
          id: 'autoriza_depoimento',
          tipo: 'boolean',
          pergunta: 'Você autoriza que usemos seu depoimento publicamente?',
          obrigatorio: false
        },
        {
          id: 'pode_contatar',
          tipo: 'boolean',
          pergunta: 'Podemos entrar em contato para um case de sucesso?',
          obrigatorio: false
        }
      )
    }

    return perguntasBase
  }

  // Gerar perguntas dinâmicas para NPS
  const perguntasFormulario = formularioId === 'nps'
    ? getPerguntasNPS(respostas.nota_nps)
    : (formulario && formulario.perguntas) ? formulario.perguntas : []

  const validarFormulario = () => {
    const perguntasObrigatorias = perguntasFormulario.filter(p => p.obrigatorio)
    
    for (const pergunta of perguntasObrigatorias) {
      if (!respostas[pergunta.id] && respostas[pergunta.id] !== 0) {
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validarFormulario()) {
      alert('Por favor, preencha todos os campos obrigatórios!')
      return
    }

    setEnviando(true)

    try {
      // Validar se mentoradoId é um UUID válido (se fornecido)
      if (mentoradoId && mentoradoId.length !== 36) {
        throw new Error('ID do mentorado inválido')
      }

      console.log('📝 Dados para inserção:', {
        mentorado_id: mentoradoId,
        formulario: formularioId,
        resposta_json: respostas
      })

      // Verificar se temos um mentorado_id válido ou usar um padrão
      if (!mentoradoId) {
        throw new Error('É necessário um ID de mentorado para salvar o formulário')
      }

      // Limpar dados vazios ou undefined
      const dadosLimpos = {
        mentorado_id: mentoradoId,
        formulario: formularioId,
        resposta_json: JSON.parse(JSON.stringify(respostas)) // Remove undefined/functions
      }

      console.log('🧹 Dados limpos:', dadosLimpos)

      // Sempre salvar na tabela genérica para garantir compatibilidade
      const { error } = await supabase
        .from('formularios_respostas')
        .insert(dadosLimpos)
      
      if (error) {
        throw error
      }

      setEnviado(true)
    } catch (error) {
      console.error('Erro ao enviar formulário:', error)
      alert(`Erro ao enviar formulário: ${JSON.stringify(error)}`)
    } finally {
      setEnviando(false)
    }
  }

  const renderPergunta = (pergunta: any) => {
    const valor = respostas[pergunta.id]

    switch (pergunta.tipo) {
      case 'nps':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>De jeito nenhum</span>
              <span>Recomendaria Muito</span>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {[...Array(10)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handleInputChange(pergunta.id, i + 1)}
                  className={`
                    h-12 rounded-lg border-2 font-semibold transition-all
                    ${valor === i + 1
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }
                  `}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )

      case 'escala':
        return (
          <div className="space-y-3">
            {pergunta.escala.labels.map((label: string, i: number) => (
              <button
                key={i}
                onClick={() => handleInputChange(pergunta.id, i + 1)}
                className={`
                  w-full p-4 text-left rounded-xl border-2 transition-all
                  ${valor === i + 1
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{label}</span>
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, starIndex) => (
                      <Star 
                        key={starIndex}
                        className={`h-4 w-4 ${
                          starIndex < i + 1 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )

      case 'multipla':
        return (
          <div className="space-y-3">
            {pergunta.opcoes.map((opcao: string, i: number) => (
              <button
                key={opcao}
                onClick={() => handleInputChange(pergunta.id, opcao)}
                className={`
                  w-full p-4 text-left rounded-xl border-2 transition-all
                  ${valor === opcao
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${valor === opcao ? 'border-green-500 bg-green-500' : 'border-gray-300'}
                  `}>
                    {valor === opcao && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  <span className="font-medium">{pergunta.labels[i]}</span>
                </div>
              </button>
            ))}
          </div>
        )

      case 'multipla_escolha':
        return (
          <div className="space-y-3">
            {pergunta.opcoes.map((opcao: string, i: number) => {
              const isSelected = Array.isArray(valor) ? valor.includes(opcao) : false
              return (
                <button
                  key={opcao}
                  onClick={() => {
                    const currentValues = Array.isArray(valor) ? valor : []
                    const newValues = isSelected
                      ? currentValues.filter(v => v !== opcao)
                      : [...currentValues, opcao]
                    handleInputChange(pergunta.id, newValues)
                  }}
                  className={`
                    w-full p-4 text-left rounded-xl border-2 transition-all
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center
                      ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                    `}>
                      {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                    <span className="font-medium">{pergunta.labels[i]}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )

      case 'boolean':
        return (
          <div className="grid grid-cols-2 gap-4">
            {[
              { valor: true, label: 'Sim', cor: 'green' },
              { valor: false, label: 'Não', cor: 'red' }
            ].map(({ valor: val, label, cor }) => (
              <button
                key={String(val)}
                onClick={() => handleInputChange(pergunta.id, val)}
                className={`
                  p-4 rounded-xl border-2 font-medium transition-all
                  ${valor === val
                    ? `border-${cor}-500 bg-${cor}-50 text-${cor}-700`
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        )

      case 'texto':
        return (
          <Input
            value={valor || ''}
            onChange={(e) => handleInputChange(pergunta.id, e.target.value)}
            placeholder={pergunta.placeholder}
            className="text-lg p-4 rounded-xl border-2 focus:border-blue-500"
          />
        )

      case 'textarea':
        return (
          <textarea
            value={valor || ''}
            onChange={(e) => handleInputChange(pergunta.id, e.target.value)}
            placeholder={pergunta.placeholder}
            rows={4}
            className="w-full text-lg p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 focus:outline-none resize-none"
          />
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-4" />
          <p className="text-gray-600">Carregando formulário...</p>
        </div>
      </div>
    )
  }

  if (!formulario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Formulário não encontrado</h1>
            <p className="text-gray-600">O formulário que você está procurando não existe.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="p-12 text-center">
            <div className="text-8xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Obrigado pelo seu feedback!</h1>
            <p className="text-xl text-gray-600 mb-6">
              Suas respostas são muito importantes para continuarmos melhorando.
            </p>
            {mentorado && (
              <p className="text-lg text-gray-500">
                Até breve, <span className="font-semibold text-gray-700">{mentorado.nome_completo}</span>! 👋
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${formulario.cor} to-opacity-20`}>
      <div className="min-h-screen bg-white bg-opacity-90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <Card className="mb-8 border-0 shadow-xl">
              <CardHeader className={`bg-gradient-to-r ${formulario.cor} text-white rounded-t-lg`}>
                <div className="flex items-center space-x-4">
                  <div className="bg-white bg-opacity-20 p-3 rounded-full">
                    {formulario.icone}
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">{formulario.titulo}</CardTitle>
                    <p className="text-lg text-white text-opacity-90 mt-1">{formulario.subtitulo}</p>
                  </div>
                </div>
              </CardHeader>
              
              {mentorado && (
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Heart className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Olá, {mentorado.nome_completo}!</p>
                      <p className="text-gray-600">{mentorado.turma} • {mentorado.email}</p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Perguntas */}
            <div className="space-y-8">
              {perguntasFormulario.map((pergunta, index) => (
                <Card key={pergunta.id} className="border-0 shadow-lg">
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <div className="flex items-start space-x-4">
                        <Badge className="bg-blue-100 text-blue-700 text-lg px-3 py-1 shrink-0">
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {pergunta.pergunta}
                            {pergunta.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                          </h3>
                          {pergunta.tipo === 'nps' && (
                            <p className="text-gray-600 mb-4">
                              Sendo 1 "de jeito nenhum" e 10 "recomendaria muito"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {renderPergunta(pergunta)}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Botão de Envio */}
            <Card className="mt-12 border-0 shadow-xl">
              <CardContent className="p-8">
                <Button
                  onClick={handleSubmit}
                  disabled={enviando || !validarFormulario()}
                  className={`
                    w-full text-lg py-6 rounded-xl font-semibold transition-all
                    bg-gradient-to-r ${formulario.cor} hover:shadow-lg hover:scale-105
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  `}
                >
                  {enviando ? (
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 animate-spin" />
                      <span>Enviando suas respostas...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Send className="h-5 w-5" />
                      <span>Enviar Respostas</span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>
                
                {!validarFormulario() && (
                  <p className="text-center text-red-600 mt-4">
                    ⚠️ Preencha todos os campos obrigatórios para enviar
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}