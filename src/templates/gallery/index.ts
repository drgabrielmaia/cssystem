import type { TemplateDefinition, TemplateField } from '../../types';
import { TestimonialTemplate } from './TestimonialTemplate';
import { ComparisonTemplate } from './ComparisonTemplate';
import { MotivationalTemplate } from './MotivationalTemplate';
import { QuoteTweetTemplate } from './QuoteTweetTemplate';
import { CTATemplate } from './CTATemplate';

export const TEMPLATE_GALLERY: TemplateDefinition[] = [
  {
    id: 'testimonial',
    name: 'Depoimento',
    description: 'Print de chat com headline impactante',
    category: 'testimonial',
    component: TestimonialTemplate,
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'Ela disse que eu dei um golpe nela' },
      { key: 'highlightWord', label: 'Palavra em destaque', type: 'text', placeholder: 'golpe' },
      { key: 'chatMessages', label: 'Mensagens do chat', type: 'chat-messages' },
      { key: 'footerText', label: 'Texto rodape', type: 'text', placeholder: 'E na mesma semana...' },
    ],
    defaultValues: {
      headline: 'Ela disse que eu dei um golpe nela',
      highlightWord: 'golpe',
      chatMessages: [
        {
          text: 'Gente, so queria dizer que esse golpe foi o melhor que cai na vida! 30k essa manha, foi meu mes de plantao em uma manha haha',
          isUser: false,
          senderName: 'Mentorada',
          senderTag: 'mentorada',
        },
      ],
      footerText: 'E na mesma semana escreveu isso no grupo...',
    },
  },
  {
    id: 'comparison',
    name: 'Comparacao',
    description: 'Dois lados comparando opcoes com imagens',
    category: 'comparison',
    component: ComparisonTemplate,
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'Dois medicos.' },
      { key: 'subheadline', label: 'Subheadline (bold)', type: 'text', placeholder: 'Mesma formacao.' },
      { key: 'leftTitle', label: 'Titulo esquerda', type: 'text', required: true, placeholder: 'Plantonista' },
      { key: 'leftSubtitle', label: 'Subtitulo esquerda', type: 'text', placeholder: 'Fatura entre R$5k-15k/mes' },
      { key: 'leftImageUrl', label: 'Imagem esquerda', type: 'image' },
      { key: 'leftItems', label: 'Itens esquerda', type: 'list', placeholder: 'Ex: Trabalha 24h seguidas' },
      { key: 'rightTitle', label: 'Titulo direita', type: 'text', required: true, placeholder: 'Empreendedor' },
      { key: 'rightSubtitle', label: 'Subtitulo direita', type: 'text', placeholder: 'Fatura entre R$100k-400k/mes' },
      { key: 'rightImageUrl', label: 'Imagem direita', type: 'image' },
      { key: 'rightItems', label: 'Itens direita', type: 'list', placeholder: 'Ex: Trabalha quando quer' },
      { key: 'leftColor', label: 'Cor esquerda', type: 'color' },
      { key: 'rightColor', label: 'Cor direita', type: 'color' },
      { key: 'footerText', label: 'Texto rodape', type: 'text', placeholder: 'Resultados completamente diferentes...' },
    ],
    defaultValues: {
      headline: 'Dois medicos.',
      subheadline: 'Mesma formacao.',
      leftTitle: 'Plantonista',
      leftSubtitle: 'Fatura entre R$5k-R$15k',
      rightTitle: 'Empreendedor',
      rightSubtitle: 'Fatura entre R$100k-R$400k',
      leftColor: '#EF4444',
      rightColor: '#16A34A',
      leftImageUrl: '',
      rightImageUrl: '',
      leftItems: ['Trabalha 24h seguidas', 'Depende de plantao', 'Sem previsibilidade'],
      rightItems: ['Trabalha quando quer', 'Renda recorrente', 'Liberdade financeira'],
      footerText: 'Resultados completamente diferentes...',
    },
  },
  {
    id: 'motivational',
    name: 'Motivacional',
    description: 'Texto grande com palavras coloridas',
    category: 'motivational',
    component: MotivationalTemplate,
    fields: [
      { key: 'text', label: 'Texto principal', type: 'textarea', required: true, placeholder: 'E assim que comeca uma mudanca silenciosa dentro da profissao.' },
      { key: 'highlights', label: 'Palavras em destaque', type: 'highlights' },
      { key: 'fontStyle', label: 'Estilo da fonte', type: 'select', options: [
        { value: 'serif', label: 'Elegante (Playfair)' },
        { value: 'sans', label: 'Moderna (Montserrat)' },
      ]},
      { key: 'ctaText', label: 'Texto CTA (rodape)', type: 'text', placeholder: 'Comente LIBERDADE se voce quer fazer parte...' },
    ],
    defaultValues: {
      text: 'E assim que comeca uma mudanca silenciosa dentro da profissao.',
      highlights: [{ word: 'mudanca silenciosa', color: '#C5A55A' }],
      fontStyle: 'serif',
      fontSize: 64,
      ctaText: '',
    },
  },
  {
    id: 'quote',
    name: 'Quote / Post',
    description: 'Estilo post de rede social com foto',
    category: 'quote',
    component: QuoteTweetTemplate,
    fields: [
      { key: 'tweetText', label: 'Texto do post', type: 'textarea', required: true, placeholder: '"Voce precisa trabalhar 15 horas por dia..."' },
      { key: 'imageUrl', label: 'Imagem (opcional)', type: 'image' },
    ],
    defaultValues: {
      tweetText: '"Voce precisa trabalhar 15 horas por dia para ganhar bem na medicina."\n\nFoi isso que quase todo medico ouviu.\n\nMas como disse Warren Buffett:\n\n"Se voce nao encontra uma forma de ganhar dinheiro enquanto dorme, trabalhara ate morrer."\n\nNa medicina, o verdadeiro avanco e parar de depender apenas das proprias horas.',
      imageUrl: '',
    },
  },
  {
    id: 'cta',
    name: 'CTA',
    description: 'Chamada para acao com botao',
    category: 'cta',
    component: CTATemplate,
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'Quer transformar sua carreira?' },
      { key: 'subtext', label: 'Subtexto', type: 'textarea', placeholder: 'Descubra como medicos estao faturando...' },
      { key: 'ctaButtonText', label: 'Texto do botao', type: 'text', placeholder: 'QUERO SABER MAIS' },
      { key: 'ctaColor', label: 'Cor do botao', type: 'color' },
      { key: 'engagementPrompt', label: 'Prompt de engajamento', type: 'text', placeholder: 'Comente EU QUERO para receber o link' },
      { key: 'emoji', label: 'Emoji central', type: 'text', placeholder: '🚀' },
    ],
    defaultValues: {
      headline: 'Quer transformar sua carreira?',
      subtext: 'Descubra como medicos estao saindo do plantao e faturando 6 digitos por mes.',
      ctaButtonText: 'QUERO SABER MAIS',
      ctaColor: '#16A34A',
      engagementPrompt: 'Comente EU QUERO para receber o link',
      emoji: '🚀',
    },
  },
];

export { TestimonialTemplate } from './TestimonialTemplate';
export { ComparisonTemplate } from './ComparisonTemplate';
export { MotivationalTemplate } from './MotivationalTemplate';
export { QuoteTweetTemplate } from './QuoteTweetTemplate';
export { CTATemplate } from './CTATemplate';
