# Instruções para Corrigir o Banco de Dados Supabase

## Problemas Identificados

1. **Campo `turma` não existe** na tabela `mentorados`
2. **Recursão infinita** nas políticas RLS (Row Level Security)

## Solução Passo a Passo

### Passo 1: Corrigir a Recursão Infinita nas Políticas RLS

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu lateral
4. Cole e execute o conteúdo do arquivo `fix_rls_recursion.sql`
5. Aguarde a confirmação de execução bem-sucedida

### Passo 2: Adicionar o Campo Turma

1. Ainda no **SQL Editor**
2. Cole e execute o conteúdo do arquivo `add_turma_field.sql`
3. Verifique se o campo foi adicionado e os dados foram agrupados corretamente

### Passo 3: Reverter as Correções no Código (Opcional)

Após adicionar o campo `turma` no banco, você pode reverter as alterações no código:

1. Restaure o campo `turma` na interface `Mentorado` em `src/types/index.ts`
2. Restaure as queries originais em:
   - `src/app/respostas/page.tsx`
   - `src/app/form-responses/page.tsx`
   - `src/hooks/use-mentorados.ts`
   - `src/hooks/use-turmas.ts`

### Passo 4: Testar o Sistema

1. Faça login na aplicação
2. Acesse a página de **Respostas dos Formulários**
3. Verifique se os dados são carregados corretamente
4. Teste outros recursos que dependem da tabela `mentorados`

## Scripts SQL Disponíveis

- **`fix_rls_recursion.sql`**: Corrige o problema de recursão infinita nas políticas RLS
- **`add_turma_field.sql`**: Adiciona o campo `turma` na tabela `mentorados`

## Observações Importantes

- **SEMPRE faça backup** do banco antes de executar scripts SQL em produção
- Os scripts foram projetados para serem **idempotentes** (podem ser executados múltiplas vezes)
- A correção da recursão RLS deve ser aplicada **antes** de adicionar o campo turma
- O campo turma será preenchido automaticamente com base na data de criação dos registros

## Suporte

Em caso de dúvidas ou problemas:
1. Verifique os logs do Supabase Dashboard
2. Teste as queries diretamente no SQL Editor
3. Revise as políticas RLS na aba Authentication > Policies

## Estado Atual do Código

O código foi **temporariamente modificado** para funcionar sem o campo `turma`:
- Referências ao campo foram comentadas ou removidas
- Um valor padrão "Turma Geral" é usado onde necessário
- Após aplicar os scripts SQL, o código original pode ser restaurado
