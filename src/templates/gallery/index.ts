import type { TemplateDefinition } from '../../types';
import { TestimonialTemplate } from './TestimonialTemplate';
import { ComparisonTemplate } from './ComparisonTemplate';
import { MotivationalTemplate } from './MotivationalTemplate';
import { QuoteTweetTemplate } from './QuoteTweetTemplate';
import { CTATemplate } from './CTATemplate';
import { StorytellingTemplate } from './StorytellingTemplate';
import { DataStoryTemplate } from './DataStoryTemplate';
import { DarkNarrativeTemplate } from './DarkNarrativeTemplate';
import { EditorialSlideTemplate } from './EditorialSlideTemplate';
import { CoverOverlayTemplate } from './CoverOverlayTemplate';
import { PureEditorialTemplate } from './PureEditorialTemplate';

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
    description: 'Chamada editorial com texto impactante',
    category: 'cta',
    component: CTATemplate,
    fields: [
      { key: 'headline', label: 'Headline', type: 'textarea', required: true, placeholder: 'Alguem com 27 anos de carreira nao desistiu e esta rompendo agora. {E voce?}' },
      { key: 'bodyText', label: 'Texto corpo', type: 'textarea', placeholder: 'Se voce tem uma *marca brasileira* e quer torna-la das *mais fortes e desejadas* do Brasil.' },
      { key: 'ctaText', label: 'Texto CTA', type: 'text', placeholder: 'Comente **LIBERDADE** ou me chama no Direct.' },
      { key: 'highlightColor', label: 'Cor do destaque', type: 'color' },
      { key: 'imageUrl', label: 'Imagem de fundo', type: 'image' },
      { key: 'textAlign', label: 'Alinhamento', type: 'select', options: [
        { value: 'left', label: 'Esquerda' },
        { value: 'center', label: 'Centro' },
      ]},
    ],
    defaultValues: {
      headline: 'Alguem com 27 anos de carreira nao desistiu e esta rompendo agora. {E voce?}',
      bodyText: '',
      ctaText: 'Comente **LIBERDADE** ou me chama no Direct.',
      highlightColor: '#EF4444',
      imageUrl: '',
      textAlign: 'left',
    },
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    description: 'Texto narrativo com imagem lateral',
    category: 'storytelling',
    component: StorytellingTemplate,
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'E nao sao so as pequenas.' },
      { key: 'bodyText', label: 'Texto narrativo', type: 'textarea', placeholder: 'Varig, a maior companhia aerea da America Latina, morreu...' },
      { key: 'highlightText', label: 'Texto em destaque (barra lateral)', type: 'textarea', placeholder: 'So no primeiro quadrimestre de 2023, 737 mil empresas fecharam...' },
      { key: 'highlightStyle', label: 'Estilo do destaque', type: 'select', options: [
        { value: 'bold', label: 'Negrito' },
        { value: 'italic', label: 'Italico' },
      ]},
      { key: 'statNumber', label: 'Numero/Estatistica', type: 'text', placeholder: '737 mil' },
      { key: 'statLabel', label: 'Legenda do numero', type: 'text', placeholder: 'empresas fecharam as portas' },
      { key: 'imageUrl', label: 'Imagem lateral', type: 'image' },
      { key: 'footerText', label: 'Texto de impacto (rodape)', type: 'text', placeholder: 'E a explicacao vai muito alem do que parece.' },
      { key: 'sourceText', label: 'Fonte (opcional)', type: 'text', placeholder: 'Mapa de Empresas' },
    ],
    defaultValues: {
      headline: 'E nao sao so as pequenas.',
      bodyText: 'Varig, a maior companhia aerea da America Latina, morreu. Mappin, icone de geracoes em Sao Paulo, morreu. Mesbla, com 180 lojas no pais inteiro, morreu. Bamerindus, Arapua, Lobras... todas desapareceram.',
      highlightText: 'So no primeiro quadrimestre de 2023, 737 mil empresas fecharam as portas no Brasil, aumento de 34% em relacao ao ano anterior.',
      highlightStyle: 'italic',
      statNumber: '',
      statLabel: '',
      imageUrl: '',
      footerText: 'E a explicacao vai muito alem do que parece.',
      sourceText: 'Mapa de Empresas',
    },
  },
  {
    id: 'data-story',
    name: 'Dados / Estatistica',
    description: 'Headline + imagem + dados impactantes',
    category: 'data-story',
    component: DataStoryTemplate,
    fields: [
      { key: 'headline', label: 'Headline com dados', type: 'text', required: true, placeholder: 'A vida media de uma empresa no Brasil e de apenas 4 a 5 anos, segundo o IBGE.' },
      { key: 'imageUrl', label: 'Imagem central', type: 'image' },
      { key: 'bodyText', label: 'Texto com estatisticas', type: 'textarea', placeholder: '6 em cada 10 negocios brasileiros fecham antes de completar 5 anos de vida...' },
      { key: 'highlightText', label: 'Texto em destaque (italico)', type: 'text', placeholder: 'e apenas 22,9% das empresas nascidas em 2009 ainda existiam uma decada depois.' },
      { key: 'sourceText', label: 'Fonte (opcional)', type: 'text', placeholder: 'IBGE' },
    ],
    defaultValues: {
      headline: 'A vida media de uma empresa no Brasil e de apenas 4 a 5 anos, segundo o IBGE.',
      imageUrl: '',
      bodyText: '6 em cada 10 negocios brasileiros fecham antes de completar 5 anos de vida,',
      highlightText: 'e apenas 22,9% das empresas nascidas em 2009 ainda existiam uma decada depois.',
      sourceText: 'IBGE',
    },
  },
  {
    id: 'dark-narrative',
    name: 'Narrativa Escura',
    description: 'Imagem de fundo com texto sobreposto',
    category: 'dark-narrative',
    component: DarkNarrativeTemplate,
    fields: [
      { key: 'headline', label: 'Headline principal', type: 'text', required: true, placeholder: 'Ao longo da sua historia, o Japao construiu mais de 33 mil empresas centenarias' },
      { key: 'midText', label: 'Texto central (destaque)', type: 'text', placeholder: 'Esses negocios eram chamados de "shinise".' },
      { key: 'midSubtext', label: 'Subtexto central', type: 'textarea', placeholder: 'Porque sobreviveram a guerras, pandemias e ate a quedas de imperios inteiros...' },
      { key: 'footerText', label: 'Texto de impacto (rodape)', type: 'text', placeholder: 'Mas, no Brasil, a historia e brutalmente diferente...' },
      { key: 'imageUrl', label: 'Imagem de fundo', type: 'image' },
    ],
    defaultValues: {
      headline: 'Ao longo da sua historia, o Japao construiu mais de 33 mil empresas centenarias',
      midText: 'Esses negocios eram chamados de "shinise".',
      midSubtext: 'Porque sobreviveram a guerras, pandemias e ate a quedas de imperios inteiros, passando de geracao em geracao.',
      footerText: 'Mas, no Brasil, a historia e brutalmente diferente...',
      imageUrl: '',
    },
  },
  {
    id: 'editorial-slide',
    name: 'Editorial Slide',
    description: 'Imagem + texto com contador de pagina',
    category: 'editorial-slide',
    component: EditorialSlideTemplate,
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'Por que a faculdade perdeu o prestígio?' },
      { key: 'bodyText', label: 'Subtexto', type: 'text', placeholder: 'A nova geracao nao quer estabilidade.' },
      { key: 'imageUrl', label: 'Imagem', type: 'image' },
      { key: 'pageNum', label: 'Numero da pagina', type: 'text', placeholder: '01' },
      { key: 'totalPages', label: 'Total de paginas', type: 'text', placeholder: '10' },
      { key: 'ctaText', label: 'Texto do botao', type: 'text', placeholder: 'Deslize' },
    ],
    defaultValues: {
      headline: 'Por que a faculdade perdeu o prestígio, e a CLT, o respeito?',
      bodyText: 'A nova geracao nao quer estabilidade.',
      imageUrl: '',
      pageNum: '01',
      totalPages: '10',
      ctaText: 'Deslize',
    },
  },
  {
    id: 'cover-overlay',
    name: 'Cover / Capa',
    description: 'Imagem de fundo com texto imenso sobreposto',
    category: 'cover-overlay',
    component: CoverOverlayTemplate,
    fields: [
      { key: 'headline', label: 'Headline (MAIUSCULO)', type: 'textarea', required: true, placeholder: 'Por que a corrida virou o novo cigarro dos ansiosos?' },
      { key: 'imageUrl', label: 'Imagem de fundo', type: 'image' },
      { key: 'bodyText', label: 'Texto complementar', type: 'textarea', placeholder: 'A corrida virou o ritual de quem escolheu transformar...' },
      { key: 'footerText', label: 'Rodape branded', type: 'text', placeholder: 'Powered by @perfil' },
      { key: 'textAlign', label: 'Alinhamento', type: 'select', options: [
        { value: 'left', label: 'Esquerda' },
        { value: 'center', label: 'Centro' },
      ]},
      { key: 'textPosition', label: 'Posicao do texto', type: 'select', options: [
        { value: 'bottom', label: 'Baixo' },
        { value: 'center', label: 'Centro' },
      ]},
      { key: 'imageOpacity', label: 'Opacidade imagem (0-1)', type: 'text', placeholder: '0.75' },
    ],
    defaultValues: {
      headline: 'Por que a corrida virou o novo cigarro dos ansiosos?',
      imageUrl: '',
      bodyText: '',
      footerText: '',
      textAlign: 'left',
      textPosition: 'bottom',
      imageOpacity: 0.75,
    },
  },
  {
    id: 'pure-editorial',
    name: 'Editorial Puro',
    description: 'Estilo jornalistico com header e rodape',
    category: 'pure-editorial',
    component: PureEditorialTemplate,
    fields: [
      { key: 'headline', label: 'Headline', type: 'textarea', required: true, placeholder: 'Sua mae foi sua primeira mentora. Sua primeira investidora.' },
      { key: 'bodyText', label: 'Texto complementar', type: 'textarea', placeholder: 'O unico sistema capaz de detectar genialidade onde o mundo so via falha.' },
      { key: 'imageUrl', label: 'Imagem (opcional)', type: 'image' },
      { key: 'headerLabel', label: 'Label central do header', type: 'text', placeholder: 'IA para conteudo' },
      { key: 'headerRight', label: 'Texto direito do header', type: 'text', placeholder: 'Copyright 2025' },
      { key: 'ctaText', label: 'Texto CTA (rodape direita)', type: 'text', placeholder: 'Arrasta para o lado >' },
    ],
    defaultValues: {
      headline: 'Sua mae foi sua primeira mentora. Sua primeira investidora.',
      bodyText: 'O unico sistema capaz de detectar genialidade onde o mundo so via falha. Ela foi o algoritmo que o mundo nao tinha.',
      imageUrl: '',
      headerLabel: 'IA para conteudo',
      headerRight: 'Copyright © 2025',
      ctaText: 'Arrasta para o lado >',
    },
  },
];

export { TestimonialTemplate } from './TestimonialTemplate';
export { ComparisonTemplate } from './ComparisonTemplate';
export { MotivationalTemplate } from './MotivationalTemplate';
export { QuoteTweetTemplate } from './QuoteTweetTemplate';
export { CTATemplate } from './CTATemplate';
export { StorytellingTemplate } from './StorytellingTemplate';
export { DataStoryTemplate } from './DataStoryTemplate';
export { DarkNarrativeTemplate } from './DarkNarrativeTemplate';
export { EditorialSlideTemplate } from './EditorialSlideTemplate';
export { CoverOverlayTemplate } from './CoverOverlayTemplate';
export { PureEditorialTemplate } from './PureEditorialTemplate';
