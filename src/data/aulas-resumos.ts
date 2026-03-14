/**
 * Base de conhecimento das aulas da mentoria.
 *
 * COMO ADICIONAR NOVAS AULAS:
 * 1. Adicione um novo objeto no array `aulasResumos`
 * 2. Preencha titulo, categoria e conteudo
 * 3. O conteudo sera injetado automaticamente no system prompt da IA na area do aluno
 *
 * CATEGORIAS DISPONIVEIS:
 * - 'imagem' (Consultoria de Imagem)
 * - 'gestao' (Gestao de Alta Performance)
 * - 'vendas' (Vendas e Comercial)
 * - 'marketing' (Marketing e Posicionamento)
 * - 'mindset' (Mentalidade e Desenvolvimento)
 * - 'financeiro' (Gestao Financeira)
 * - 'outro' (Outros)
 */

export interface AulaResumo {
  titulo: string
  categoria: 'imagem' | 'gestao' | 'vendas' | 'marketing' | 'mindset' | 'financeiro' | 'outro'
  conteudo: string
}

export const aulasResumos: AulaResumo[] = [
  // ══════════════════════════════════════════════════════════════
  // CONSULTORIA DE IMAGEM
  // ══════════════════════════════════════════════════════════════
  {
    titulo: 'Consultoria de Imagem',
    categoria: 'imagem',
    conteudo: `
As Regras Inegociaveis (Acoes de Comando Direto)

A Regra do Apple Watch: O Apple Watch e exclusivo para a pratica esportiva. Fora da academia, ele e o "Crocs do braco" e destroi a percepcao de credibilidade. Use relogios analogicos com maquinario pesado (aco ou couro).

A Regra da Alfaiataria (Ajuste Obrigatorio): Roupas de loja nao servem perfeitamente em corpos humanos. O ajuste e obrigatorio. E expressamente proibido usar calcas fazendo "sanfona" em cima do sapato. A calca deve terminar na altura do osso do pe (maleolo).

A Regra do Punho: Ao usar blazer, deve aparecer exatamente 1 centimetro da manga da camisa por baixo.

A Regra da Barbearia: Abandone cortes com degrades genericos nas laterais que achatam o formato da cabeca. O corte deve ser tratado em salao, na tesoura, respeitando as caracteristicas naturais do cabelo (liso, ondulado, cacheado ou crespo).

A Regra do Vermelho: O vermelho e a cor para fechar negocios, mas agride o olhar. Deve ser usado estritamente em pequenos detalhes (gravatas, pedras de joias, solas de sapato ou detalhes de equipamentos).

---

Frameworks Estrategicos (A Logica Operacional)

O Framework dos 57%: O publico high ticket avalia o profissional silenciosamente antes de ouvir uma unica palavra. 57% da comunicacao e visual e nao-verbal. Apenas 7% e o conteudo falado.

O Framework do Visagismo (Os 3 Tercos do Rosto):
- Terco Superior (Testa): Representa o intelecto. Nunca deve ser escondido por franjas, pois profissionais de autoridade precisam mostrar inteligencia e raciocinio.
- Terco Medio (Olhos/Nariz): Representa as emocoes.
- Terco Inferior (Queixo/Maxilar): Representa vontade e expressao. Linhas retas e maxilar marcado trazem autoridade; homens que escondem muito essa area (barbas excessivas) passam a imagem de quem nao quer se expressar.

O Framework da Psicologia das Cores:
- Azul Marinho & Chumbo: Estabilidade, confianca e autoridade neutra.
- Tons Terrosos / Areia: Acolhimento profundo (ideal para profissionais de saude recebendo pacientes com traumas passados).
- Verde Musgo: Calma e foco para ouvir.
- Bordo (Vinho): Sofisticacao e paixao nao-agressiva.

O Framework do Posicionamento dos Aneis:
- Dedo Polegar: Transmite heranca, forca de vontade e alta autoestima.
- Dedo Indicador: Transmite autoridade, direcao, posicionamento (e o dedo de quem ensina).
- Dedo Mindinho: Comunicacao avancada e seguranca.

---

Frases de Efeito e Metaforas (Para calibrar o tom de voz)
- "A roupa nao define o seu carater, mas define a leitura que o outro vai fazer sobre voce."
- "A beleza nao e algo estatico, e a forma como voce harmoniza tudo em cima de voce."
- "O Apple Watch no ramo da moda e a Crocs do braco."
- "O degrade muito raspado so deixa voce sendo mais um andando nas ruas com a mesma cabeca."
- "A natureza e o guia perfeito. Pense num pe de caju: tronco marrom, folhas verdes e caju amarelo. Tudo e harmonico."
`,
  },

  // ══════════════════════════════════════════════════════════════
  // MANUAL DE GESTAO DE ALTA PERFORMANCE
  // ══════════════════════════════════════════════════════════════
  {
    titulo: 'Manual de Gestao de Alta Performance',
    categoria: 'gestao',
    conteudo: `
Pilares da Gestao de Alta Performance

Experiencia sobre Teoria: O conhecimento tecnico (resultado) e commodity (80% dos profissionais entregam). O que cria fidelidade e retem o paciente e o impacto na satisfacao/experiencia (o "cafe com nome", o acolhimento).

O "Ponto de Corte" do Funcionario: Para trabalhar com high ticket, nao existe meio-termo. O candidato precisa saber falar, escrever e se portar. Se falta um desses tres, e ponto de corte imediato.

Contratacao Estrategica: Nao procure um secretario; procure um vendedor. Voce ensina um vendedor a ser secretario, mas raramente consegue transformar um secretario passivo em um vendedor nato.

Cultura e o que acontece na sua ausencia: A cultura da clinica e definida pelo que sua equipe faz quando voce nao esta la. Se voce nao e o exemplo de pontualidade e postura, sua equipe nunca sera.

Hiring: Nao contrate secretarias, contrate vendedores. E mais facil ensinar processos administrativos a um vendedor do que ensinar "sangue nos olhos" para fechamento a um administrativo.

Comunicacao em Circuito Fechado: Como em uma reanimacao cardiaca (PCR), a gestao deve ser clara e direta. Delege a tarefa e exija o retorno da confirmacao. Se voce nao e claro, a culpa do erro e sua, nao da equipe.

O Aluguel do Sucesso: A cultura da empresa e o que sua equipe faz quando voce nao esta. Se voce nao e o exemplo de disciplina, sua equipe sera desleixada.

Indicadores (KPIs): Voce precisa saber: Numero de interessados (leads), taxa de agendamento e taxa de conversao. 80% do seu faturamento deve vir da reativacao de pacientes antigos e nao apenas de novos leads.

Financas e Tizerpatida: Cuidado com o fluxo de caixa de medicamentos caros. Nunca gaste o valor total; separe o custo da reposicao imediatamente para nao criar uma divida de centenas de milhares em poucos meses.

---

O Framework do Atendimento Premium

Follow-up (O dinheiro esta na reativacao): Nao tente desbravar terreno novo o tempo todo. 80% do faturamento vem de reativacao e pacientes da base. O ciclo de follow-up (tentativas de contato) deve seguir um cronograma rigoroso: 24h/72h, depois 5 dias, 7, 10, ate chegar a 30 dias.

Tolerancia de Agenda: Tolerancia maxima de 15 minutos, para ambos os lados. Se o paciente atrasar, reagende. Isso mantem o respeito pelo tempo e o posicionamento de autoridade.

Cenario (Fator Uau): Tenha um elemento fisico na clinica (como uma parede para fotos ou um mural de conquistas dos pacientes) desenhado intencionalmente para gerar prova social e postagens organicas no Instagram.

---

Gestao Financeira e Riscos (A "Dureza" do Negocio)

Regra de Ouro da Tesouraria: Nunca misture o dinheiro do seu lucro com o dinheiro do custo operacional (ex: compra de medicacao como Tizerpatida). Tenha uma reserva de caixa fixa separada para boletos recorrentes.

O "Nao" ao Fiado: Paciente high ticket que da trabalho para pagar e um risco. Se for necessario abrir excecoes (apenas com pacientes de longa data), estabeleca limites crescentes e nao tenha vergonha de cobrar. A cobranca e uma funcao da empresa, nao uma ofensa pessoal.

Cuidado com o Custo Fixo: O objetivo nao e ter a clinica mais luxuosa do mundo, mas a mais lucrativa. Clinicas gigantescas com custos fixos inchados sao uma armadilha.

---

Frases de Efeito (A "Mentalidade Guto/Gabriel")
- "O combinado nao sai caro."
- "O vendedor sempre se paga."
- "Quem veio de cara emburrada (para trabalhar) da meia volta. Ou abre o sorriso ou nao trabalha."
- "Nao existe bom pagador sem dinheiro. Se ele se enrola para pagar, ele nao tem o dinheiro, nao se iluda."
- "Se voce ja reclamou da mesma coisa tres vezes e o funcionario continua fazendo, demita. O cartao amarelo e um, dois, tres e expulso."

---

Ponto-chave: Gestao e comunicacao. O gestor e um comunicador de circuito fechado (como em uma sala de emergencia medica). Se a mensagem nao e clara, direta e objetiva, a equipe vai falhar.
`,
  },

  // ══════════════════════════════════════════════════════════════
  // EXPERIENCIA DO PACIENTE - MODELO DISNEY
  // ══════════════════════════════════════════════════════════════
  {
    titulo: 'Experiencia do Paciente - Modelo Disney e Jornada',
    categoria: 'vendas',
    conteudo: `
O resultado clinico e o basico. O que retem o publico High-Ticket e a experiencia sensorial.

Marketing Sensorial (Os 5 Sentidos):
- Olfato: Ter um cheiro exclusivo na clinica (piramide olfativa com notas de base amadeiradas para fixacao).
- Visao: Cenarios "instagramaveis" (cimento queimado, iluminacao estrategica).
- Paladar: Cafe personalizado, agua de qualidade.
- Audicao: Musica ambiente adequada ao perfil do paciente.
- Tato: Texturas premium em mobiliario e materiais de contato.

Jornada do Paciente: O atendimento comeca no primeiro contato do WhatsApp (que deve ser humano e rapido) e vai ate o pos-venda (follow-up).

Follow-up Agressivo: Um "nao" hoje e um "talvez" amanha. O sistema deve cobrar o paciente de forma elegante em intervalos de 2, 5, 7 e 15 dias. Quem nao cobra, nao vende.

Erros Fatais na Experiencia:
- Demorar para demitir: Se um funcionario errou o mesmo processo tres vezes apos o feedback, rua. Um funcionario desalinhado destroi a experiencia de 50 pacientes.
- Focar so em novos pacientes: O lucro real esta em vender novos protocolos para quem ja e seu paciente ou reativar quem sumiu.
`,
  },

  // ══════════════════════════════════════════════════════════════
  // POSICIONAMENTO DIGITAL - AUTORIDADE E ESCALA
  // ══════════════════════════════════════════════════════════════
  {
    titulo: 'Posicionamento Digital - Autoridade e Escala',
    categoria: 'marketing',
    conteudo: `
O Instagram e seu programa de TV. O objetivo e criar relacionamento e autoridade percebida.

O Aluguel e Diario: Conteudo deve ser postado todo dia. Se voce nao aparece, voce nao e lembrado.

Funil de Conteudo:
- Topo (70%): Videos rapidos, frases de impacto, lifestyle (mostrando que voce vive o que prega).
- Meio: Conteudo tecnico denso que justifica o preco do seu protocolo.
- Fundo: Provas sociais (depoimentos) e chamada para acao (CTA).

Inteligencia Artificial: Use o ChatGPT (versao paga) para criar as headlines (titulos) e legendas. Nao perca tempo sendo redator; seja o estrategista.

Autoridade Percebida vs. Declarada: Nao use o jaleco para "gritar" que e medico. Use sua imagem, seu lifestyle e seu conhecimento para que as pessoas concluam sozinhas que voce e o melhor. O jaleco entra apenas como acessorio de procedimento.

Trafego Pago: Organico e bom, mas o trafego segmentado e que coloca o seu anuncio na cara da pessoa de 50 anos com libido baixa e dinheiro no bolso (Persona especifica). Nunca subestime o trafego pago.
`,
  },

  // ══════════════════════════════════════════════════════════════
  // ERROS FATAIS QUE DEVEM SER EVITADOS
  // ══════════════════════════════════════════════════════════════
  {
    titulo: 'Erros Fatais que Devem ser Evitados',
    categoria: 'mindset',
    conteudo: `
Demorar para demitir: Se um funcionario errou o mesmo processo tres vezes apos o feedback, rua. Um funcionario desalinhado destroi a experiencia de 50 pacientes.

Focar so em novos pacientes: O lucro real esta em vender novos protocolos para quem ja e seu paciente ou reativar quem sumiu.

Ser um personagem: A imagem deve ser sua melhor versao, nao uma mentira. Se voce nao sustenta o estilo na padaria, o paciente percebera que voce e "fake" no consultorio.

Subestimar o Trafego Pago: Organico e bom, mas o trafego segmentado e que coloca o seu anuncio na cara da pessoa de 50 anos com libido baixa e dinheiro no bolso (Persona especifica).

Conclusao de Gabriel Maia: Gerir uma clinica de sucesso e dominar a ciencia medica e a arte da persuasao visual e operacional. O sucesso e o resultado de pequenos detalhes ajustados: da barra da calca ao delay da resposta no WhatsApp.
`,
  },
]

/**
 * Monta o texto completo dos resumos para injetar no system prompt.
 * Chamado pelo /api/chat-gemini quando o request vem de um mentorado.
 */
export function buildAulasPrompt(): string {
  if (aulasResumos.length === 0) return ''

  let prompt = `\n\n=== BASE DE CONHECIMENTO DAS AULAS DA MENTORIA ===\n`
  prompt += `Voce tem acesso ao conteudo das aulas abaixo. Use essas informacoes para fundamentar suas respostas, dar conselhos praticos e referenciar os frameworks e regras ensinados na mentoria. Quando o mentorado perguntar algo relacionado, cite os conceitos pelo nome (ex: "Regra do Apple Watch", "Framework dos 57%", "Regra de Ouro da Tesouraria").\n\n`

  for (const aula of aulasResumos) {
    prompt += `--- AULA: ${aula.titulo.toUpperCase()} (${aula.categoria}) ---\n`
    prompt += aula.conteudo.trim()
    prompt += `\n\n`
  }

  prompt += `=== FIM DA BASE DE CONHECIMENTO ===\n`
  return prompt
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  imagem: ['imagem', 'roupa', 'vestuário', 'vestuario', 'look', 'blazer', 'visual', 'estilo', 'aparência', 'aparencia', 'sapato', 'terno', 'moda', 'visagismo', 'consultoria'],
  gestao: ['gestão', 'gestao', 'equipe', 'time', 'liderança', 'lideranca', 'clínica', 'clinica', 'processo', 'sistema', 'delegação', 'delegacao', 'operacional', 'agenda clínica'],
  vendas: ['vend', 'preço', 'preco', 'paciente', 'consulta', 'objeção', 'objecao', 'fechamento', 'negociação', 'negociacao', 'proposta', 'script', 'atendimento', 'high ticket', 'honorário'],
  marketing: ['marketing', 'instagram', 'post', 'conteúdo', 'conteudo', 'redes sociais', 'digital', 'posicionamento', 'autoridade', 'seguidores', 'engajamento', 'stories', 'reels', 'carrossel', 'caption', 'bio'],
  mindset: ['mindset', 'mentalidade', 'motivação', 'motivacao', 'sucesso', 'disciplina', 'hábito', 'habito', 'crescimento', 'desenvolvimento', 'foco', 'produtividade', 'rotina', 'burnout'],
  financeiro: ['financeiro', 'dinheiro', 'investimento', 'renda', 'faturamento', 'receita', 'lucro', 'tesouraria', 'fluxo de caixa', 'precificação', 'precificacao', 'retorno', 'custos'],
}

/**
 * Versão filtrada: injeta apenas as aulas relevantes à mensagem do usuário.
 * Retorna string vazia se nenhuma categoria for relevante.
 */
export function buildFilteredAulasPrompt(message: string): string {
  if (aulasResumos.length === 0) return ''
  const msgLower = message.toLowerCase()

  const relevantCategories = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, kws]) => kws.some(kw => msgLower.includes(kw)))
    .map(([cat]) => cat)

  if (relevantCategories.length === 0) return ''

  const relevant = aulasResumos.filter(a => relevantCategories.includes(a.categoria))
  if (relevant.length === 0) return ''

  let prompt = `\n\n=== AULAS RELEVANTES DA MENTORIA (cite os frameworks pelo nome) ===\n`
  for (const aula of relevant) {
    prompt += `--- ${aula.titulo.toUpperCase()} ---\n${aula.conteudo.trim()}\n\n`
  }
  prompt += `=== FIM ===\n`
  return prompt
}
