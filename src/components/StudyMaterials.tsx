'use client'

import { useState, useEffect } from 'react'
import {
  Play,
  FileText,
  BookOpen,
  Download,
  Plus,
  X,
  Search,
  Upload,
  Clock,
  CheckCircle,
  Eye,
  Star,
  ExternalLink,
  Target,
  Shield,
  Users,
  MessageCircle,
  Brain,
  TrendingUp,
  Zap,
  Filter
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ============================================================
// MATERIAIS DE ESTUDO REAIS - Recursos verificados e uteis
// ============================================================

interface DefaultMaterial {
  id: string
  title: string
  description: string
  url: string
  category: string
  type: 'video' | 'article' | 'pdf' | 'course'
  author?: string
  tags: string[]
}

const STUDY_CATEGORIES = [
  { id: 'fechamento', name: 'Tecnicas de Fechamento', icon: Target, color: '#4ADE80', description: 'Domine as tecnicas para fechar mais vendas' },
  { id: 'objecoes', name: 'Contorno de Objecoes', icon: Shield, color: '#60A5FA', description: 'Aprenda a contornar qualquer objecao' },
  { id: 'rapport', name: 'Rapport e Conexao', icon: Users, color: '#F472B6', description: 'Crie conexoes genuinas com seus leads' },
  { id: 'qualificacao', name: 'Qualificacao de Leads', icon: Filter, color: '#FBBF24', description: 'Qualifique leads com eficiencia' },
  { id: 'followup', name: 'Follow-up Inteligente', icon: MessageCircle, color: '#A78BFA', description: 'Estrategias de acompanhamento que convertem' },
  { id: 'mindset', name: 'Mindset de Vendas', icon: Brain, color: '#FB923C', description: 'Desenvolva a mentalidade de um closer de elite' },
  { id: 'metodologias', name: 'Metodologias de Vendas', icon: TrendingUp, color: '#34D399', description: 'SPIN Selling, Challenger Sale, BANT e mais' },
  { id: 'scripts', name: 'Scripts e Modelos', icon: Zap, color: '#F87171', description: 'Scripts prontos e modelos de abordagem' },
]

const DEFAULT_MATERIALS: DefaultMaterial[] = [
  // ===== TECNICAS DE FECHAMENTO =====
  {
    id: 'default-1',
    title: 'Flavio Augusto - Aprenda a Vender na Pratica',
    description: 'Episodio completo onde Flavio Augusto ensina suas tecnicas de fechamento e negociacao usadas para construir o grupo Wise Up.',
    url: 'https://open.spotify.com/episode/0IxKmFfXLT5vohQyt4gD54',
    category: 'fechamento',
    type: 'video',
    author: 'Flavio Augusto',
    tags: ['fechamento', 'negociacao', 'pratica']
  },
  {
    id: 'default-2',
    title: 'VENDE-C PRO - A Maior Escola de Vendas do Brasil',
    description: 'Programa criado por Flavio Augusto, Caio Carneiro e Joel Jota com mais de 100 horas sobre negociacao, fechamento e persuasao.',
    url: 'https://vende-c.com/pro/',
    category: 'fechamento',
    type: 'course',
    author: 'Flavio Augusto, Caio Carneiro, Joel Jota',
    tags: ['curso', 'fechamento', 'completo']
  },
  {
    id: 'default-3',
    title: '13 Tecnicas de Fechamento de Vendas - Guia Completo',
    description: 'Artigo detalhado com 13 tecnicas praticas de fechamento para aplicar imediatamente nas suas reunioes. Inclui exemplos reais.',
    url: 'https://crmpiperun.com/blog/fechamento-de-vendas/',
    category: 'fechamento',
    type: 'article',
    author: 'PipeRun',
    tags: ['tecnicas', 'pratico', 'exemplos']
  },
  {
    id: 'default-4',
    title: 'Closer em Vendas: Guia Completo para Especialistas em Fechamento',
    description: 'Tudo que voce precisa saber para se tornar um closer de elite. Desde conceitos basicos ate tecnicas avancadas de fechamento.',
    url: 'https://isaacmartins.com.br/closer-em-vendas-o-guia-completo-para-ser-um-especialista-em-fechamento/',
    category: 'fechamento',
    type: 'article',
    author: 'Instituto Isaac Martins',
    tags: ['closer', 'guia', 'especialista']
  },
  {
    id: 'default-5',
    title: 'Negocie como um Lobo - Tecnicas de Vendas (Gratis)',
    description: 'Curso gratuito na Udemy baseado nas tecnicas do Jordan Belfort. Aprenda o metodo Straight Line para fechar vendas de forma reta e eficiente.',
    url: 'https://www.udemy.com/course/negocie-como-um-lobo/',
    category: 'fechamento',
    type: 'course',
    author: 'Udemy',
    tags: ['jordan belfort', 'straight line', 'gratis']
  },

  // ===== CONTORNO DE OBJECOES =====
  {
    id: 'default-6',
    title: 'Como Contornar Objecoes - VENDE-C',
    description: 'Guia oficial do VENDE-C com as melhores tecnicas para contornar objecoes. Metodo usado por mais de 65.000 alunos.',
    url: 'https://vende-c.com/contornar-objecoes/',
    category: 'objecoes',
    type: 'article',
    author: 'VENDE-C',
    tags: ['objecoes', 'metodo', 'comprovado']
  },
  {
    id: 'default-7',
    title: '15 Objecoes de Vendas e Como Contorna-las - Neil Patel',
    description: 'Neil Patel explica as 15 objecoes mais comuns em vendas e apresenta scripts prontos para cada uma delas.',
    url: 'https://neilpatel.com/br/blog/objecoes-de-vendas/',
    category: 'objecoes',
    type: 'article',
    author: 'Neil Patel',
    tags: ['objecoes', 'scripts', '15 exemplos']
  },
  {
    id: 'default-8',
    title: '3 Tecnicas Infaliveis para Contornar Objecoes - Reev',
    description: 'Artigo focado em 3 tecnicas comprovadas para lidar com objecoes em vendas consultivas. Inclui framework pratico.',
    url: 'https://reev.co/tecnicas-para-objecoes-em-vendas/',
    category: 'objecoes',
    type: 'article',
    author: 'Reev',
    tags: ['tecnicas', 'consultiva', 'framework']
  },
  {
    id: 'default-9',
    title: 'Contornando Objecoes no WhatsApp - 25 Exemplos',
    description: '25 respostas tecnicas prontas para contornar objecoes pelo WhatsApp. Ideal para closers que vendem por mensagem.',
    url: 'https://omnismart.com.br/blog/tecnicas-de-vendas/contornando-objecoes-no-whatsapp-25-exemplos-de-respostas-tecnicas-para-vendedores-eficientes/',
    category: 'objecoes',
    type: 'article',
    author: 'OmniSmart',
    tags: ['whatsapp', 'scripts', '25 modelos']
  },
  {
    id: 'default-10',
    title: '5 Tecnicas Infaliveis para Lidar com Objecoes - Agendor',
    description: 'O Agendor apresenta 5 tecnicas testadas e comprovadas que tornam qualquer negociacao de venda mais eficaz.',
    url: 'https://www.agendor.com.br/blog/objecoes-em-vendas/',
    category: 'objecoes',
    type: 'article',
    author: 'Agendor',
    tags: ['objecoes', 'negociacao', 'eficaz']
  },

  // ===== RAPPORT E CONEXAO =====
  {
    id: 'default-11',
    title: 'Rapport em Vendas - Salesforce Brasil',
    description: 'A Salesforce explica como criar rapport para vender mais. Tecnicas usadas pelas maiores empresas do mundo.',
    url: 'https://www.salesforce.com/br/blog/rapport/',
    category: 'rapport',
    type: 'article',
    author: 'Salesforce',
    tags: ['rapport', 'salesforce', 'global']
  },
  {
    id: 'default-12',
    title: 'Tecnicas de Rapport em Vendas - Agendor',
    description: 'Guia completo com tecnicas de rapport para vendas. Espelhamento, escuta ativa, linguagem corporal e mais.',
    url: 'https://www.agendor.com.br/blog/tecnicas-de-rapport-em-vendas/',
    category: 'rapport',
    type: 'article',
    author: 'Agendor',
    tags: ['espelhamento', 'escuta ativa', 'linguagem corporal']
  },
  {
    id: 'default-13',
    title: '7 Tecnicas de Rapport para Criar Conexao com Clientes',
    description: 'Artigo com 7 tecnicas simples e eficientes para criar conexao genuina entre voce e seu futuro cliente.',
    url: 'https://ziptime.com.br/rapport-7-tecnicas-simples-e-eficientes-para-criar-conexao/',
    category: 'rapport',
    type: 'article',
    author: 'ZipTime',
    tags: ['conexao', 'empatia', '7 tecnicas']
  },
  {
    id: 'default-14',
    title: 'Rapport: Como Usar Empatia para Aumentar Conversao',
    description: 'Rock Content explica como usar rapport e empatia para aumentar sua taxa de conversao. Artigo com dados e exemplos praticos.',
    url: 'https://rockcontent.com/br/blog/rapport/',
    category: 'rapport',
    type: 'article',
    author: 'Rock Content',
    tags: ['empatia', 'conversao', 'dados']
  },

  // ===== QUALIFICACAO DE LEADS =====
  {
    id: 'default-15',
    title: 'Metodologia BANT - Guia Completo de Qualificacao',
    description: 'Entenda Budget, Authority, Need e Timing. Framework criado pela IBM para qualificar leads e priorizar os contatos certos.',
    url: 'https://neilpatel.com/br/blog/bant/',
    category: 'qualificacao',
    type: 'article',
    author: 'Neil Patel',
    tags: ['BANT', 'IBM', 'framework']
  },
  {
    id: 'default-16',
    title: 'BANT e MEDDIC - Metodologias de Qualificacao de Leads',
    description: 'Comparacao entre BANT e MEDDIC. Descubra qual metodologia funciona melhor para o seu processo de vendas.',
    url: 'https://www.lbcompany.com.br/post/bant-e-meddic-as-metodologias-de-qualificacao-de-leads',
    category: 'qualificacao',
    type: 'article',
    author: 'LB Company',
    tags: ['BANT', 'MEDDIC', 'comparacao']
  },
  {
    id: 'default-17',
    title: 'Qualificacao de Leads na Pratica - Processo de Vendas',
    description: 'Como construir um processo de qualificacao que gera conversao de verdade. Guia pratico com exemplos reais.',
    url: 'https://processodevendas.com/qualificacao-de-leads-na-pratica/',
    category: 'qualificacao',
    type: 'article',
    author: 'Processo de Vendas',
    tags: ['qualificacao', 'pratico', 'conversao']
  },
  {
    id: 'default-18',
    title: 'Closer de Vendas: Como Dominar essa Tecnica',
    description: 'Guia sobre o papel do closer na qualificacao e fechamento. O que faz, como atua e como dominar a tecnica.',
    url: 'https://prospectagram.com.br/closer-vendas-o-que-e-como-aplicar/',
    category: 'qualificacao',
    type: 'article',
    author: 'Prospectagram',
    tags: ['closer', 'papel', 'dominar']
  },

  // ===== FOLLOW-UP INTELIGENTE =====
  {
    id: 'default-19',
    title: 'Follow-up de Vendas: Guia Completo com Modelos - Pipedrive',
    description: 'Pipedrive apresenta guia completo com modelos prontos de follow-up. Templates de email, WhatsApp e ligacao.',
    url: 'https://www.pipedrive.com/pt/blog/follow-up-de-vendas',
    category: 'followup',
    type: 'article',
    author: 'Pipedrive',
    tags: ['modelos', 'templates', 'pipedrive']
  },
  {
    id: 'default-20',
    title: 'Follow-up de Vendas: Estrategias para Aumentar Conversoes',
    description: 'Exact Sales explica estrategias de follow-up que realmente funcionam. 80% das vendas precisam de pelo menos 5 follow-ups.',
    url: 'https://www.exactsales.com.br/o-que-e-follow-up-de-vendas/',
    category: 'followup',
    type: 'article',
    author: 'Exact Sales',
    tags: ['estrategias', 'conversao', 'dados']
  },
  {
    id: 'default-21',
    title: 'Como Fazer Follow-up: Melhores Tecnicas - Agendor',
    description: 'Agendor ensina as melhores tecnicas de follow-up com exemplos praticos. Timing, abordagem e frequencia ideal.',
    url: 'https://www.agendor.com.br/blog/como-fazer-follow-up-tecnicas/',
    category: 'followup',
    type: 'article',
    author: 'Agendor',
    tags: ['tecnicas', 'timing', 'frequencia']
  },
  {
    id: 'default-22',
    title: 'O que e Follow-up e Por Que e Vital - PipeRun',
    description: 'PipeRun detalha a importancia do follow-up no processo de vendas. Inclui framework e cadencia ideal.',
    url: 'https://crmpiperun.com/blog/follow-up/',
    category: 'followup',
    type: 'article',
    author: 'PipeRun',
    tags: ['vital', 'cadencia', 'processo']
  },

  // ===== MINDSET DE VENDAS =====
  {
    id: 'default-23',
    title: 'Como Ter um Mindset de Vendas de Alta Performance em 8 Passos',
    description: 'Growth Machine ensina 8 passos para construir a mentalidade de um vendedor de alta performance. Mindset antes de tecnica.',
    url: 'https://blog.growthmachine.com.br/como-construir-um-mindset-de-vendas/',
    category: 'mindset',
    type: 'article',
    author: 'Growth Machine',
    tags: ['8 passos', 'alta performance', 'mentalidade']
  },
  {
    id: 'default-24',
    title: 'Dominando o Mindset de Vendas - Nectar CRM',
    description: 'Libere seu potencial para alto desempenho. Estrategias para desenvolver a mentalidade que separa os top performers dos demais.',
    url: 'https://blog.nectarcrm.com.br/dominando-o-mindset-de-vendas-libere-seu-potencial-para-alto-desempenho/',
    category: 'mindset',
    type: 'article',
    author: 'Nectar CRM',
    tags: ['potencial', 'top performer', 'desempenho']
  },
  {
    id: 'default-25',
    title: '4 Insights do Livro Mindset para Vendedores - Agendor',
    description: 'Os melhores insights do livro Mindset de Carol Dweck aplicados ao universo de vendas. Mentalidade fixa vs. de crescimento.',
    url: 'https://www.agendor.com.br/blog/livro-mindset/',
    category: 'mindset',
    type: 'article',
    author: 'Agendor',
    tags: ['Carol Dweck', 'crescimento', 'insights']
  },
  {
    id: 'default-26',
    title: 'Mindset de Vendas: Dicas para Ser um Vendedor de Sucesso',
    description: 'Alfredo Bravo compartilha as principais dicas para desenvolver um mindset de vendas vencedor. Resiliencia e foco em resultados.',
    url: 'https://alfredobravo.com.br/mindset-de-vendas-quais-sao-as-principais-dicas-para-ser-um-vendedor-de-sucesso/',
    category: 'mindset',
    type: 'article',
    author: 'Alfredo Bravo',
    tags: ['dicas', 'resiliencia', 'resultados']
  },

  // ===== METODOLOGIAS DE VENDAS =====
  {
    id: 'default-27',
    title: 'SPIN Selling: Resumo Completo - Reev',
    description: 'O melhor resumo de SPIN Selling em portugues. Situacao, Problema, Implicacao e Necessidade - o metodo que mudou as vendas.',
    url: 'https://reev.co/spin-selling-resumo/',
    category: 'metodologias',
    type: 'article',
    author: 'Reev',
    tags: ['SPIN Selling', 'Neil Rackham', 'resumo']
  },
  {
    id: 'default-28',
    title: 'SPIN Selling na Pratica - Playbook PDF Gratuito',
    description: 'Playbook gratuito em PDF para aplicar SPIN Selling no dia a dia. Perguntas prontas e framework de qualificacao.',
    url: 'https://leads2b.com/blog/wp-content/uploads/2020/07/Spin-Selling-Marketing.pdf',
    category: 'metodologias',
    type: 'pdf',
    author: 'Leads2b',
    tags: ['SPIN Selling', 'PDF', 'playbook']
  },
  {
    id: 'default-29',
    title: 'E-book SPIN Selling Completo - PDF Gratuito',
    description: 'Guia completo sobre SPIN Selling em PDF. Aborda todas as etapas do metodo com exemplos praticos e roteiros.',
    url: 'https://www.clientarcrm.com.br/wp-content/uploads/2022/07/Ebook_SPIN-Selling.pdf',
    category: 'metodologias',
    type: 'pdf',
    author: 'Clientar CRM',
    tags: ['SPIN Selling', 'ebook', 'completo']
  },
  {
    id: 'default-30',
    title: 'Challenger Sale: Tecnicas em 10 Minutos - Reev',
    description: 'Resumo rapido do metodo Challenger Sale. Ensine, customize e controle - as 3 habilidades dos melhores vendedores.',
    url: 'https://reev.co/tecnicas-de-vendas-challenger-sales/',
    category: 'metodologias',
    type: 'article',
    author: 'Reev',
    tags: ['Challenger Sale', 'rapido', '10 min']
  },
  {
    id: 'default-31',
    title: 'Challenger Sale: Habilidades do Vendedor Desafiador - RD Station',
    description: 'RD Station detalha o perfil do vendedor desafiador. Baseado na pesquisa com 6.000 vendedores de 90 empresas.',
    url: 'https://www.rdstation.com/blog/vendas/challenger-sale/',
    category: 'metodologias',
    type: 'article',
    author: 'RD Station',
    tags: ['Challenger Sale', 'perfil', 'pesquisa']
  },
  {
    id: 'default-32',
    title: 'Closer, Hunter e Farmer - Estrategias Avancadas (Udemy)',
    description: 'Curso sobre os 3 papeis em vendas: Closer, Hunter e Farmer. Entenda como cada um contribui para o sucesso comercial.',
    url: 'https://www.udemy.com/course/estrategia-comercial/',
    category: 'metodologias',
    type: 'course',
    author: 'Udemy',
    tags: ['closer', 'hunter', 'farmer']
  },

  // ===== SCRIPTS E MODELOS =====
  {
    id: 'default-33',
    title: 'Jordan Belfort: Sistema Straight Line + Tecnicas',
    description: 'Guia completo do metodo Straight Line de Jordan Belfort. Leve o cliente do ponto A ao fechamento em linha reta.',
    url: 'https://blog.growthmachine.com.br/jordan-belfort-lobo-wall-street-tecnicas-vendas-sistema-straight-line/',
    category: 'scripts',
    type: 'article',
    author: 'Growth Machine',
    tags: ['Jordan Belfort', 'Straight Line', 'sistema']
  },
  {
    id: 'default-34',
    title: 'Os Segredos do Lobo - Tecnica de Vendas Infalivel',
    description: 'Resumo do livro "Way of the Wolf" com os scripts e tecnicas exatas usadas por Jordan Belfort para vender qualquer coisa.',
    url: 'https://escolaexchange.com.br/vendas/os-segredos-do-lobo-livro-sobre-tecnica-de-vendas/',
    category: 'scripts',
    type: 'article',
    author: 'Escola Exchange',
    tags: ['Lobo', 'scripts', 'persuasao']
  },
  {
    id: 'default-35',
    title: 'Vendas Outbound: Segredo do Lobo de Wall Street - Reev',
    description: 'Reev adapta as tecnicas do Lobo de Wall Street para vendas outbound. Tons de voz, roteiros e abordagem.',
    url: 'https://reev.co/vendas-outbound-lobo-wall-street/',
    category: 'scripts',
    type: 'article',
    author: 'Reev',
    tags: ['outbound', 'tom de voz', 'roteiro']
  },
  {
    id: 'default-36',
    title: '10 Tecnicas de Fechamento com Exemplos Praticos',
    description: 'Monday.com apresenta 10 tecnicas de fechamento com scripts e exemplos prontos para usar. Pratico e direto ao ponto.',
    url: 'https://monday.com/blog/crm-and-sales/sales-closing/',
    category: 'scripts',
    type: 'article',
    author: 'Monday.com',
    tags: ['10 tecnicas', 'scripts', 'exemplos']
  },
  {
    id: 'default-37',
    title: '10 Dicas para Contornar Objecoes - RD Station',
    description: 'RD Station compartilha 10 dicas praticas com modelos de respostas para as objecoes mais comuns em vendas.',
    url: 'https://www.rdstation.com/blog/vendas/contornar-objecoes-de-vendas/',
    category: 'scripts',
    type: 'article',
    author: 'RD Station',
    tags: ['10 dicas', 'modelos', 'respostas']
  },
  {
    id: 'default-38',
    title: 'SPIN Selling PDF - Alcancando Excelencia em Vendas',
    description: 'PDF completo do livro SPIN Selling de Neil Rackham em portugues. Pesquisa de 12 anos com 35.000 ligacoes analisadas.',
    url: 'https://edisciplinas.usp.br/pluginfile.php/5431419/mod_resource/content/1/Spin-Selling-Alcancando-Excelencia-Em-Vendas-2.pdf',
    category: 'metodologias',
    type: 'pdf',
    author: 'Neil Rackham',
    tags: ['SPIN Selling', 'livro completo', 'PDF']
  },
  {
    id: 'default-39',
    title: 'Caio Carneiro - YouTube (429K+ inscritos)',
    description: 'Canal do Caio Carneiro com mais de 1.000 videos sobre lideranca, disciplina e escalabilidade em vendas. Co-fundador do VENDE-C.',
    url: 'https://www.youtube.com/@caiocarneiro',
    category: 'mindset',
    type: 'video',
    author: 'Caio Carneiro',
    tags: ['YouTube', 'lideranca', 'vendas']
  },
  {
    id: 'default-40',
    title: 'Jota Jota Podcast - Joel Jota',
    description: 'Podcast de Joel Jota com entrevistas sobre negocios, carreira, mentalidade e decisoes de alto impacto. Essencial para closers.',
    url: 'https://open.spotify.com/show/555262',
    category: 'mindset',
    type: 'video',
    author: 'Joel Jota',
    tags: ['podcast', 'negocios', 'mentalidade']
  },
]

// ============================================================
// COMPONENT
// ============================================================

interface StudyMaterial {
  id: string
  title: string
  description: string
  material_type: 'video' | 'pdf' | 'link' | 'document'
  url?: string
  file_path?: string
  category_id?: string
  category_name?: string
  tags: string[]
  metadata: any
  created_at: string
}

interface MaterialCategory {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  display_order: number
}

interface MaterialProgress {
  material_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percentage: number
  last_accessed_at?: string
  completed_at?: string
}

interface StudyMaterialsProps {
  closerId: string
  isVisible: boolean
  onClose: () => void
}

export default function StudyMaterials({ closerId, isVisible, onClose }: StudyMaterialsProps) {
  const [dbMaterials, setDbMaterials] = useState<StudyMaterial[]>([])
  const [categories, setCategories] = useState<MaterialCategory[]>([])
  const [progress, setProgress] = useState<Record<string, MaterialProgress>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set())

  // Form states
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    material_type: 'video' as 'video' | 'pdf' | 'link' | 'document',
    url: '',
    category_id: '',
    tags: ''
  })

  useEffect(() => {
    if (isVisible && closerId) {
      loadCategories()
      loadDbMaterials()
      loadProgress()
      loadCompletedFromLocal()
    }
  }, [isVisible, closerId])

  const loadCompletedFromLocal = () => {
    try {
      const saved = localStorage.getItem(`study_completed_${closerId}`)
      if (saved) {
        setCompletedItems(new Set(JSON.parse(saved)))
      }
    } catch { /* ignore */ }
  }

  const toggleCompleted = (materialId: string) => {
    setCompletedItems(prev => {
      const updated = new Set(prev)
      if (updated.has(materialId)) {
        updated.delete(materialId)
      } else {
        updated.add(materialId)
      }
      try {
        localStorage.setItem(`study_completed_${closerId}`, JSON.stringify(Array.from(updated)))
      } catch { /* ignore */ }
      return updated
    })
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('closer_material_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (!error && data) {
        setCategories(data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadDbMaterials = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('closer_study_materials')
        .select(`
          *,
          closer_material_categories!inner(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (!error && data) {
        const formattedMaterials = data.map((material: any) => ({
          ...material,
          category_name: material.closer_material_categories?.name || 'Sem categoria'
        }))
        setDbMaterials(formattedMaterials)
      }
    } catch (error) {
      console.error('Error loading materials:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('closer_material_progress')
        .select('*')
        .eq('user_id', closerId)

      if (!error && data) {
        const progressMap = data.reduce((acc: Record<string, MaterialProgress>, prog: any) => {
          acc[prog.material_id] = prog
          return acc
        }, {} as Record<string, MaterialProgress>)
        setProgress(progressMap)
      }
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  const createMaterial = async () => {
    if (!newMaterial.title || (!newMaterial.url && newMaterial.material_type !== 'document')) {
      alert('Por favor, preencha todos os campos obrigatorios')
      return
    }

    try {
      setIsLoading(true)

      const materialData = {
        title: newMaterial.title,
        description: newMaterial.description,
        material_type: newMaterial.material_type,
        url: newMaterial.url || null,
        category_id: newMaterial.category_id || null,
        tags: newMaterial.tags ? newMaterial.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        created_by: closerId,
        metadata: {}
      }

      const { data, error } = await supabase
        .from('closer_study_materials')
        .insert([materialData])
        .select()

      if (error) {
        throw error
      }

      if (data && data[0]) {
        await supabase
          .from('closer_material_permissions')
          .insert([{
            material_id: data[0].id,
            role_type: 'all_closers',
            can_view: true,
            can_download: true,
            can_share: false
          }])
      }

      setNewMaterial({
        title: '',
        description: '',
        material_type: 'video',
        url: '',
        category_id: '',
        tags: ''
      })
      setShowAddForm(false)

      await loadDbMaterials()

    } catch (error) {
      console.error('Error creating material:', error)
      alert('Erro ao adicionar material. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const logInteraction = async (materialId: string, actionType: 'view' | 'download' | 'share') => {
    try {
      await supabase
        .from('closer_material_interactions')
        .insert([{
          user_id: closerId,
          material_id: materialId,
          action_type: actionType
        }])
    } catch (error) {
      console.error('Error logging interaction:', error)
    }
  }

  const updateProgress = async (materialId: string, status: 'in_progress' | 'completed') => {
    try {
      const progressData = {
        user_id: closerId,
        material_id: materialId,
        status,
        progress_percentage: status === 'completed' ? 100 : 50,
        last_accessed_at: new Date().toISOString(),
        completed_at: status === 'completed' ? new Date().toISOString() : null
      }

      const { error } = await supabase
        .from('closer_material_progress')
        .upsert([progressData], {
          onConflict: 'user_id,material_id'
        })

      if (!error) {
        await loadProgress()
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const openMaterial = (url: string) => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  const openDbMaterial = async (material: StudyMaterial) => {
    await logInteraction(material.id, 'view')
    await updateProgress(material.id, 'in_progress')

    if (material.url) {
      window.open(material.url, '_blank')
    }
  }

  // Filter default materials
  const filteredDefaults = DEFAULT_MATERIALS.filter(material => {
    const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory
    const matchesSearch = searchQuery === '' ||
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (material.author && material.author.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  // Filter db materials
  const filteredDbMaterials = dbMaterials.filter(material => {
    const matchesCategory = selectedCategory === 'all' || material.category_id === selectedCategory
    const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         material.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getIconForType = (type: string) => {
    switch (type) {
      case 'video': return <Play className="h-4 w-4" />
      case 'pdf': return <FileText className="h-4 w-4" />
      case 'article': return <BookOpen className="h-4 w-4" />
      case 'course': return <Star className="h-4 w-4" />
      case 'document': return <BookOpen className="h-4 w-4" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video'
      case 'pdf': return 'PDF'
      case 'article': return 'Artigo'
      case 'course': return 'Curso'
      case 'document': return 'Documento'
      case 'link': return 'Link'
      default: return 'Material'
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30'
      case 'pdf': return 'bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30'
      case 'article': return 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30'
      case 'course': return 'bg-[#A78BFA]/15 text-[#A78BFA] border-[#A78BFA]/30'
      default: return 'bg-white/10 text-[#A1A1AA] border-white/20'
    }
  }

  // Calculate stats
  const totalMaterials = DEFAULT_MATERIALS.length
  const completedCount = completedItems.size
  const progressPercentage = totalMaterials > 0 ? Math.round((completedCount / totalMaterials) * 100) : 0

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-[#111111] rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-[#111111]">
          <div className="flex-1">
            <h2 className="text-white text-xl sm:text-2xl font-bold">Central de Estudos</h2>
            <p className="text-[#71717A] text-sm mt-1">Recursos selecionados para closers de alta performance</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress indicator */}
            <div className="hidden sm:flex items-center gap-3 bg-[#1A1A1A] rounded-xl px-4 py-2 border border-white/10">
              <div className="w-24 h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4ADE80] to-[#10B981] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-[#4ADE80] text-sm font-medium">{completedCount}/{totalMaterials}</span>
            </div>
            <button
              onClick={onClose}
              className="text-[#71717A] hover:text-white transition-colors p-1"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Category Pills + Search */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-[#111111]">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#71717A]" />
              <input
                type="text"
                placeholder="Buscar por titulo, autor ou tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-white/10 rounded-xl text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80] transition-colors"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#4ADE80] text-black rounded-xl hover:bg-[#10B981] transition-colors text-sm font-medium whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Adicionar Material
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#4ADE80] text-black'
                  : 'bg-[#1A1A1A] text-[#A1A1AA] hover:bg-[#1E1E1E] border border-white/10'
              }`}
            >
              Todos
              <span className={`px-1.5 py-0.5 rounded-md text-xs ${
                selectedCategory === 'all' ? 'bg-black/20' : 'bg-white/10'
              }`}>
                {DEFAULT_MATERIALS.length}
              </span>
            </button>
            {STUDY_CATEGORIES.map(cat => {
              const Icon = cat.icon
              const count = DEFAULT_MATERIALS.filter(m => m.category === cat.id).length
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'text-black'
                      : 'bg-[#1A1A1A] text-[#A1A1AA] hover:bg-[#1E1E1E] border border-white/10'
                  }`}
                  style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.name}
                  <span className={`px-1.5 py-0.5 rounded-md text-xs ${
                    selectedCategory === cat.id ? 'bg-black/20' : 'bg-white/10'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Add Material Form */}
          {showAddForm && (
            <div className="mt-4 p-4 bg-[#1A1A1A] rounded-xl border border-white/10">
              <h3 className="text-white font-medium mb-4">Adicionar Novo Material</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Titulo do material"
                  value={newMaterial.title}
                  onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  className="px-3 py-2 bg-[#0F0F0F] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80]"
                />

                <select
                  value={newMaterial.material_type}
                  onChange={(e) => setNewMaterial({ ...newMaterial, material_type: e.target.value as any })}
                  className="px-3 py-2 bg-[#0F0F0F] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#4ADE80]"
                >
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                  <option value="document">Documento</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="url"
                  placeholder="URL do YouTube/PandaVideo"
                  value={newMaterial.url}
                  onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })}
                  className="px-3 py-2 bg-[#0F0F0F] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80]"
                />

                <select
                  value={newMaterial.category_id}
                  onChange={(e) => setNewMaterial({ ...newMaterial, category_id: e.target.value })}
                  className="px-3 py-2 bg-[#0F0F0F] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#4ADE80]"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <textarea
                  placeholder="Descricao do material"
                  value={newMaterial.description}
                  onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80] resize-none"
                />
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Tags (separadas por virgula)"
                  value={newMaterial.tags}
                  onChange={(e) => setNewMaterial({ ...newMaterial, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createMaterial}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#4ADE80] text-black rounded-lg hover:bg-[#10B981] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Adicionando...' : 'Adicionar Material'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-[#1E1E1E] text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4ADE80]"></div>
            </div>
          ) : (
            <>
              {/* Category description banner */}
              {selectedCategory !== 'all' && (
                <div className="mb-6">
                  {STUDY_CATEGORIES.filter(c => c.id === selectedCategory).map(cat => {
                    const Icon = cat.icon
                    return (
                      <div key={cat.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10" style={{ backgroundColor: `${cat.color}10` }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}25` }}>
                          <Icon className="h-5 w-5" style={{ color: cat.color }} />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{cat.name}</h3>
                          <p className="text-[#A1A1AA] text-sm">{cat.description}</p>
                        </div>
                        <div className="ml-auto hidden sm:block">
                          <span className="text-sm font-medium" style={{ color: cat.color }}>
                            {filteredDefaults.length} {filteredDefaults.length === 1 ? 'recurso' : 'recursos'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Default Materials Grid */}
              {filteredDefaults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                  {filteredDefaults.map(material => {
                    const isCompleted = completedItems.has(material.id)
                    const catInfo = STUDY_CATEGORIES.find(c => c.id === material.category)

                    return (
                      <div
                        key={material.id}
                        className={`group bg-[#1A1A1A] rounded-xl border transition-all duration-200 hover:border-white/20 ${
                          isCompleted ? 'border-[#4ADE80]/30 bg-[#4ADE80]/5' : 'border-white/10'
                        }`}
                      >
                        {/* Card header with type badge */}
                        <div className="p-4 pb-3">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${getTypeBadgeColor(material.type)}`}>
                                {getIconForType(material.type)}
                                {getTypeLabel(material.type)}
                              </span>
                              {catInfo && (
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: catInfo.color }}
                                  title={catInfo.name}
                                />
                              )}
                            </div>
                            <button
                              onClick={() => toggleCompleted(material.id)}
                              className={`p-1 rounded-lg transition-all ${
                                isCompleted
                                  ? 'text-[#4ADE80] bg-[#4ADE80]/10'
                                  : 'text-[#3F3F46] hover:text-[#71717A] hover:bg-white/5'
                              }`}
                              title={isCompleted ? 'Marcar como nao concluido' : 'Marcar como concluido'}
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                          </div>

                          {/* Title */}
                          <h4 className={`font-semibold text-sm mb-1.5 line-clamp-2 ${
                            isCompleted ? 'text-[#A1A1AA]' : 'text-white'
                          }`}>
                            {material.title}
                          </h4>

                          {/* Author */}
                          {material.author && (
                            <p className="text-[#4ADE80] text-xs font-medium mb-2">{material.author}</p>
                          )}

                          {/* Description */}
                          <p className="text-[#71717A] text-xs leading-relaxed line-clamp-3 mb-3">
                            {material.description}
                          </p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {material.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-[#0F0F0F] text-[#71717A] text-xs rounded-md border border-white/5">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Card footer */}
                        <div className="px-4 pb-4">
                          <button
                            onClick={() => openMaterial(material.url)}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              material.type === 'video'
                                ? 'bg-[#4ADE80]/10 text-[#4ADE80] hover:bg-[#4ADE80]/20 border border-[#4ADE80]/20'
                                : material.type === 'pdf'
                                ? 'bg-[#60A5FA]/10 text-[#60A5FA] hover:bg-[#60A5FA]/20 border border-[#60A5FA]/20'
                                : material.type === 'course'
                                ? 'bg-[#A78BFA]/10 text-[#A78BFA] hover:bg-[#A78BFA]/20 border border-[#A78BFA]/20'
                                : 'bg-[#FBBF24]/10 text-[#FBBF24] hover:bg-[#FBBF24]/20 border border-[#FBBF24]/20'
                            }`}
                          >
                            <ExternalLink className="h-4 w-4" />
                            {material.type === 'video' ? 'Assistir' :
                             material.type === 'pdf' ? 'Baixar PDF' :
                             material.type === 'course' ? 'Acessar Curso' : 'Ler Artigo'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Database Materials Section */}
              {filteredDbMaterials.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-white/10" />
                    <h3 className="text-[#71717A] text-xs uppercase tracking-wider font-medium">Materiais Adicionados</h3>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredDbMaterials.map(material => {
                      const materialProgress = progress[material.id]

                      return (
                        <div key={material.id} className="bg-[#1A1A1A] rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                          <div className="w-full h-1 bg-[#1E1E1E] rounded-full mb-3 overflow-hidden">
                            <div
                              className={`h-full ${
                                materialProgress?.status === 'completed' ? 'bg-[#4ADE80]' :
                                materialProgress?.status === 'in_progress' ? 'bg-[#FBBF24]' :
                                'bg-[#3F3F46]'
                              } transition-all duration-300`}
                              style={{ width: `${materialProgress?.progress_percentage || 0}%` }}
                            />
                          </div>

                          <div className="flex items-center gap-3 mb-3">
                            <div className={`${
                              material.material_type === 'video' ? 'text-[#4ADE80]' :
                              material.material_type === 'pdf' ? 'text-[#60A5FA]' :
                              'text-[#FBBF24]'
                            }`}>
                              {getIconForType(material.material_type)}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-medium text-sm line-clamp-1">{material.title}</h4>
                              <p className="text-[#71717A] text-xs">{material.category_name}</p>
                            </div>
                            {materialProgress?.status === 'completed' && (
                              <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                            )}
                          </div>

                          {material.description && (
                            <p className="text-[#A1A1AA] text-sm mb-4 line-clamp-2">
                              {material.description}
                            </p>
                          )}

                          {material.tags && material.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {material.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-2 py-1 bg-[#0F0F0F] text-[#71717A] text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => openDbMaterial(material)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-colors ${
                                material.material_type === 'video'
                                  ? 'bg-[#4ADE80]/10 text-[#4ADE80] hover:bg-[#4ADE80]/20'
                                  : material.material_type === 'pdf'
                                  ? 'bg-[#60A5FA]/10 text-[#60A5FA] hover:bg-[#60A5FA]/20'
                                  : 'bg-[#FBBF24]/10 text-[#FBBF24] hover:bg-[#FBBF24]/20'
                              }`}
                            >
                              <Eye className="h-3 w-3" />
                              {material.material_type === 'video' ? 'Assistir' : 'Abrir'}
                            </button>

                            {material.material_type === 'pdf' && (
                              <button
                                onClick={() => logInteraction(material.id, 'download')}
                                className="flex items-center gap-1 px-3 py-2 bg-[#1E1E1E] text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-white/5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#71717A]">
                                {materialProgress?.status === 'completed' ? 'Concluido' :
                                 materialProgress?.status === 'in_progress' ? 'Em andamento' : 'Nao iniciado'}
                              </span>
                              {materialProgress?.last_accessed_at && (
                                <span className="text-[#71717A]">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {new Date(materialProgress.last_accessed_at).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {filteredDefaults.length === 0 && filteredDbMaterials.length === 0 && (
                <div className="flex items-center justify-center h-64 text-[#71717A]">
                  <div className="text-center">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-white font-medium">Nenhum material encontrado</p>
                    <p className="text-sm mt-2">Tente buscar por outro termo ou categoria</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
