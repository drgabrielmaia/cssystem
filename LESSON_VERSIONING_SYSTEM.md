# Sistema de Versionamento de Aulas

## 🎯 Objetivo
Criar um banco de dados completo de aulas mantendo apenas as versões atuais visíveis para os mentorados, enquanto preserva o histórico completo para administradores.

## 🏗️ Arquitetura

### Campos Adicionados à Tabela `video_lessons`
- `is_current` (boolean) - Indica se é a versão atual da aula
- `version` (text) - Versão da aula (v1.0, v1.1, v2.0, etc)
- `archived_at` (timestamp) - Quando a aula foi arquivada
- `replaced_by` (uuid) - ID da aula que substituiu esta versão
- `archive_reason` (text) - Motivo do arquivamento

## 📊 Como Funciona

### Para Mentorados
```sql
-- Query usada na interface dos mentorados
SELECT * FROM video_lessons 
WHERE is_current = true AND is_active = true
ORDER BY module_id, order_index;
```

**Resultado:**
- ✅ Veem apenas aulas atuais
- ✅ Interface limpa, sem duplicatas
- ✅ Sempre conteúdo mais recente

### Para Administradores
```sql
-- Query usada na interface admin
SELECT * FROM video_lessons 
ORDER BY created_at DESC;
```

**Resultado:**
- 📊 Veem todas as versões (histórico completo)
- 🔧 Podem gerenciar versões
- 📈 Estatísticas de versionamento

## 🚀 Como Implementar

### 1. Execute o SQL no Supabase
```sql
-- Execute este arquivo no SQL Editor do Supabase
sql/add-lesson-versioning-system.sql
```

### 2. Use os Componentes React

#### Para Tela de Mentorados
```tsx
import { MentoradoLessonsCurrent } from '@/components/mentorado-lessons-current'

export default function MentoradoPage() {
  return (
    <div>
      <MentoradoLessonsCurrent 
        moduleId="uuid-do-modulo" 
        showOnlyActive={true} 
      />
    </div>
  )
}
```

#### Para Painel Admin
```tsx
import { AdminLessonVersions } from '@/components/admin-lesson-versions'

export default function AdminPage() {
  return (
    <div>
      <AdminLessonVersions moduleId="uuid-do-modulo" />
    </div>
  )
}
```

### 3. Use as Funções de Gerenciamento
```tsx
import { 
  getCurrentLessons,
  archiveLesson,
  restoreLesson,
  createLessonVersion 
} from '@/lib/lesson-versioning'

// Buscar aulas atuais
const lessons = await getCurrentLessons(moduleId)

// Arquivar uma aula
await archiveLesson(lessonId, 'Conteúdo desatualizado')

// Criar nova versão
await createLessonVersion(originalId, {
  title: 'Nova versão da aula',
  description: 'Conteúdo atualizado'
})
```

## 🔄 Fluxos de Trabalho

### Cenário 1: Atualizar Conteúdo de uma Aula
1. Admin identifica aula que precisa ser atualizada
2. Usa `createLessonVersion()` para criar nova versão
3. Sistema automaticamente:
   - Arquiva versão atual (`is_current = false`)
   - Cria nova versão (`is_current = true`)
   - Mantém histórico completo

### Cenário 2: Remover Aula Temporariamente
1. Admin usa `archiveLesson()` com motivo
2. Aula sai da visualização dos mentorados
3. Histórico é preservado para possível restauração

### Cenário 3: Restaurar Aula Arquivada
1. Admin vê aula na lista de arquivadas
2. Usa `restoreLesson()` para reativar
3. Aula volta a aparecer para mentorados

## 📈 Benefícios

### Para Mentorados
- **Interface Limpa**: Sem aulas duplicadas ou antigas
- **Conteúdo Atual**: Sempre a versão mais recente
- **Performance**: Queries mais rápidas (menos dados)

### Para Administradores
- **Controle Total**: Gerenciar todas as versões
- **Histórico Completo**: Rastrear mudanças ao longo do tempo
- **Flexibilidade**: Arquivar, restaurar, versionar

### Para o Sistema
- **Escalabilidade**: Banco organizado mesmo com muitas versões
- **Auditoria**: Histórico completo para compliance
- **Manutenção**: Fácil identificar e corrigir problemas

## 🎛️ Painel de Controle Admin

O painel admin oferece:

- 📊 **Estatísticas**: Total, atuais, arquivadas, versões
- 📝 **Lista Completa**: Todas as versões com status
- 🔧 **Ações Rápidas**: Arquivar, restaurar, nova versão
- 📅 **Histórico**: Quando foi criada/arquivada cada versão
- 💬 **Motivos**: Por que cada aula foi arquivada

## 🔍 Queries Úteis

### Ver estatísticas gerais
```sql
SELECT 
  COUNT(*) as total_lessons,
  COUNT(*) FILTER (WHERE is_current = true) as current_lessons,
  COUNT(*) FILTER (WHERE archived_at IS NOT NULL) as archived_lessons,
  COUNT(DISTINCT version) as unique_versions
FROM video_lessons;
```

### Encontrar aulas com múltiplas versões
```sql
SELECT title, COUNT(*) as versions
FROM video_lessons 
GROUP BY title 
HAVING COUNT(*) > 1
ORDER BY versions DESC;
```

### Ver histórico de uma aula específica
```sql
SELECT title, version, is_current, created_at, archived_at
FROM video_lessons 
WHERE title ILIKE '%nome-da-aula%'
ORDER BY created_at;
```

## 🚦 Status dos Dados

Após implementação, todas as aulas existentes ficam:
- `is_current = true` (visíveis para mentorados)
- `version = 'v1.0'` (versão inicial)
- `archived_at = null` (não arquivadas)

Isso garante que nada quebre e o sistema continue funcionando normalmente.

## 💡 Próximos Passos

1. **Execute o SQL** no Supabase para adicionar os campos
2. **Integre os componentes** nas telas relevantes  
3. **Teste o fluxo** criando uma nova versão de uma aula
4. **Monitore o sistema** usando as estatísticas do painel admin

---

**🎉 Com este sistema, você tem controle total sobre o versionamento de aulas, mantendo a interface dos mentorados limpa enquanto preserva todo o histórico para administração!**