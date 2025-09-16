# Sistema Customer Success

Sistema completo para gestão de mentorados, acompanhamento de progresso e formulários de avaliação.

## 🚀 Características

- **Dashboard interativo** com KPIs e métricas em tempo real
- **Gestão de turmas** e mentorados
- **Sistema de formulários flexível** com 5 tipos diferentes
- **Interface profissional** inspirada no design Silicon Valley
- **Totalmente responsivo** para desktop e mobile
- **Integração com Supabase** para armazenamento de dados

## 🛠️ Tecnologias

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes de UI
- **Supabase** - Backend e banco de dados
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de dados
- **Recharts** - Gráficos interativos
- **Lucide React** - Ícones

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase
- yarn ou npm

## ⚙️ Configuração

### 1. Instalar dependências
```bash
yarn install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o script SQL em `supabase-schema.sql` no SQL Editor
3. Copie as credenciais do projeto

### 3. Configurar variáveis de ambiente

Renomeie `.env.local` e adicione suas credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 4. Executar o projeto

```bash
yarn dev
```

Acesse `http://localhost:3000`

## 📊 Funcionalidades

### Dashboard
- KPIs de mentorados ativos, total e novos do mês
- Gráfico de engajamento por turma
- Timeline de atividades recentes
- Métricas de performance

### Gestão de Turmas
- Visão geral de todas as turmas
- Estatísticas por turma (total, ativos, engajamento)
- Acesso rápido aos mentorados de cada turma

### Gestão de Mentorados
- Lista completa com filtros e busca
- Perfil detalhado de cada mentorado
- Histórico de atividades e formulários
- Estados de progresso (inicial vs atual)

### Sistema de Formulários
Formulários pré-configurados:

1. **Avaliação Inicial** - Para novos mentorados
2. **Progresso Mensal** - Acompanhamento mensal
3. **Feedback de Sessão** - Após cada mentoria
4. **Avaliação Final** - Encerramento do programa
5. **Observações Gerais** - Anotações comportamentais

### Características dos Formulários
- Validação em tempo real com Zod
- Salvamento automático de rascunhos
- Campos dinâmicos (texto, select, radio, checkbox)
- Histórico completo de respostas

## 🗄️ Estrutura do Banco

### Tabela `mentorados`
```sql
- id (UUID, PK)
- nome (TEXT)
- email (TEXT, UNIQUE)
- telefone (TEXT)
- turma (TEXT)
- estado_entrada (TEXT)
- estado_atual (TEXT)
- data_entrada (DATE)
- created_at (TIMESTAMP)
```

### Tabela `formularios_respostas`
```sql
- id (UUID, PK)
- mentorado_id (UUID, FK)
- formulario (TEXT)
- resposta_json (JSONB)
- data_envio (TIMESTAMP)
```

## 🎨 Design System

### Cores
- **Fundo**: #F9FAFB (light) / #0F1117 (dark)
- **Cards**: #FFFFFF / #1A1C22
- **Primary**: #3B82F6 (azul)
- **Success**: #10B981 (verde)
- **Warning**: #F59E0B (amarelo)
- **Destructive**: #EF4444 (vermelho)

### Tipografia
- **Fonte**: Inter (Google Fonts)
- **Títulos**: text-2xl font-bold
- **Corpo**: text-base
- **Legendas**: text-sm text-muted-foreground

### Componentes
- Cards com `rounded-2xl` e `shadow-md`
- Botões com transições suaves
- Badges coloridos por contexto
- Layout responsivo com grid system

## 📱 Responsividade

- **Mobile**: Sidebar colapsável, layout em stack
- **Tablet**: Grid de 2 colunas para cards
- **Desktop**: Grid de 3-4 colunas, sidebar expandida

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# Build e deploy
vercel --prod
```

### Docker

```bash
# Build da imagem
docker build -t customer-success .

# Executar container
docker run -p 3000:3000 customer-success
```

## 📝 Scripts Disponíveis

- `yarn dev` - Desenvolvimento
- `yarn build` - Build de produção
- `yarn start` - Servidor de produção
- `yarn lint` - Linting do código

## 🤝 Contribuindo

1. Fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.