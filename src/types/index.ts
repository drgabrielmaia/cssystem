export interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  estado_entrada: string
  estado_atual: string
  data_entrada: string
  data_nascimento?: string
  endereco?: string
  crm?: string
  cpf?: string
  rg?: string
  origem_conhecimento?: string
  data_inicio_mentoria?: string
  password_hash?: string
  status_login?: string
  pontuacao_total?: number
  genero?: string
  especialidade?: string
  porcentagem_comissao?: number
  motivo_exclusao?: string
  data_exclusao?: string
  excluido?: boolean
  lead_id?: string
  organization_id?: string
  turma?: string
  updated_at?: string
  created_at: string
}

export interface FormularioResposta {
  id: string
  mentorado_id: string
  formulario: string
  resposta_json: Record<string, any>
  data_envio: string
}

export interface KPI {
  label: string
  value: number | string
  change?: number
  changeType?: 'increase' | 'decrease'
}

export interface TurmaStats {
  turma: string  // Campo mantido para compatibilidade, mas não existe na tabela
  total_mentorados: number
  ativos: number
  inativos: number
  ultima_atividade: string
}

export type FormularioTipo =
  | 'avaliacao-inicial'
  | 'progresso-mensal'
  | 'feedback-sessao'
  | 'avaliacao-final'
  | 'observacoes-gerais'

// Interface para sistema de pontuação
export interface PontuacaoMentorado {
  id: string
  mentorado_id: string
  tipo_acao: 'indicacao' | 'aula_completa' | 'meta_atingida' | 'participacao_evento' | 'custom'
  pontos: number
  descricao: string
  data_acao: string
  criado_por?: string // ID do admin que adicionou
  meta_data?: Record<string, any> // Dados extras como ID da indicação, etc.
  mentorado?: { nome_completo: string } // Quando incluído via select
  created_at: string
}

// Interface para ranking atualizada
export interface RankingMentorado {
  mentorado_id: string
  nome_completo: string
  pontuacao_total: number
  total_indicacoes: number // Manter para compatibilidade
  genero: string
  especialidade?: string
  posicao?: number
}

export interface DespesaMensal {
  id: string
  nome: string
  agosto: number
  setembro: number
  outubro: number
  novembro: number
  dezembro: number
  janeiro: number
  fevereiro: number
  marco: number
  abril: number
  maio: number
  junho: number
  julho: number
  ano: number
  created_at: string
  updated_at: string
}

// ============================================================
// SISTEMA DE POSTS - Canvas/HTML to Image
// ============================================================

export type FontStyle = 'modern' | 'elegant' | 'bold' | 'minimal';

// Legacy - kept for backward compat with test page
export interface PostData {
  template: 'dark' | 'light';
  text: string;
  fontSize?: number;
  fontStyle?: FontStyle;
  highlightWord?: string;
  author?: string;
  profileName?: string;
  profileHandle?: string;
  avatarUrl?: string;
  imageUrl?: string;
  imageOpacity?: number;
}

// New carousel system
export interface PostSlide {
  title: string;
  body: string;
  inlineImageUrl?: string; // Rounded image inside the post
}

export interface PostConfig {
  slides: PostSlide[];
  backgroundColor: string; // Hex color
  backgroundImageUrl?: string;
  backgroundImageOpacity?: number;
  titleFontStyle: FontStyle;
  bodyFontStyle: FontStyle;
  titleFontSize: number;
  bodyFontSize: number;
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
  profilePosition: 'top' | 'bottom';
  accentColor: string;
}

// ============================================================
// POST CREATION SYSTEM V2 - 3-Mode Architecture
// ============================================================

export type PostCreationMode = 'template-gallery' | 'visual-editor' | 'ai-auto';
export type TemplateCategory = 'testimonial' | 'comparison' | 'motivational' | 'quote' | 'cta' | 'storytelling' | 'data-story' | 'dark-narrative';

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'image' | 'select' | 'highlights' | 'chat-messages' | 'list';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  component: React.FC<TemplateRenderProps>;
  fields: TemplateField[];
  defaultValues: Record<string, any>;
}

export interface TemplateRenderProps {
  data: Record<string, any>;
  profileName: string;
  profileHandle: string;
  avatarUrl?: string;
  accentColor: string;
  backgroundColor: string;
}

// Visual Editor types
export type EditorBlockType = 'text' | 'image' | 'chat' | 'shape' | 'highlighted-text';

export interface EditorBlock {
  id: string;
  type: EditorBlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  data: TextBlockData | ImageBlockData | ChatBlockData | ShapeBlockData | HighlightedTextData;
}

export interface TextBlockData {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

export interface ImageBlockData {
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
  borderRadius: number;
  opacity: number;
}

export interface ChatBlockData {
  messages: Array<{ text: string; isUser: boolean; timestamp?: string }>;
  style: 'whatsapp' | 'imessage';
  bubbleColor: string;
}

export interface ShapeBlockData {
  shape: 'rectangle' | 'circle' | 'line' | 'divider';
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface HighlightedTextData {
  segments: Array<{ text: string; color?: string; bold?: boolean }>;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  baseColor: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

export interface EditorBackground {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  gradient?: { from: string; to: string; angle: number };
  imageUrl?: string;
  imageOpacity?: number;
}

export interface AIAutoPostResponse {
  template: TemplateCategory;
  templateData: Record<string, any>;
  suggestedBackground: string;
  suggestedAccentColor: string;
}