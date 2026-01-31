// Configuração para geração estática dos formulários mais comuns
export const STATIC_FORMS = [
  'liberdade',
  'consultoria',
  'mentoria',
  'contato',
  'newsletter'
]

// Função para gerar parâmetros estáticos
export async function generateStaticParams() {
  // Retornar apenas formulários mais utilizados para SSG
  return STATIC_FORMS.map((slug) => ({
    slug
  }))
}