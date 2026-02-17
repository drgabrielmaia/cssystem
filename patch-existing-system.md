# ✅ SOLUÇÃO INTELIGENTE: Integrar Versionamento no Sistema Existente

## 🎯 Estratégia
Modificar apenas as **queries existentes** nos painéis já funcionando, sem quebrar nada.

## 🔧 Modificações Necessárias

### 1. Execute o SQL primeiro
```sql
-- No Supabase SQL Editor
ALTER TABLE video_lessons 
ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS version text DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS replaced_by uuid,
ADD COLUMN IF NOT EXISTS archive_reason text;

UPDATE video_lessons 
SET is_current = true, version = 'v1.0' 
WHERE is_current IS NULL OR version IS NULL;
```

### 2. Modificações nos Arquivos

#### A) `/src/app/mentorado/videos/page.tsx`
**Linha ~100 (aproximadamente):**
```typescript
// ANTES:
.from('video_lessons')
.select('*')
.in('module_id', accessibleModuleIds.length > 0 ? accessibleModuleIds : [''])

// DEPOIS:
.from('video_lessons')
.select('*')
.eq('is_current', true)  // ✅ ADICIONAR ESTA LINHA
.in('module_id', accessibleModuleIds.length > 0 ? accessibleModuleIds : [''])
```

**Linha ~150 (aproximadamente):**
```typescript
// ANTES:
.from('video_lessons')
.select('*')
.in('module_id', moduleIds.length > 0 ? moduleIds : ['fallback'])

// DEPOIS:
.from('video_lessons')
.select('*')
.eq('is_current', true)  // ✅ ADICIONAR ESTA LINHA
.in('module_id', moduleIds.length > 0 ? moduleIds : ['fallback'])
```

#### B) `/src/app/mentorado/videos/netflix-style-page.tsx`
**Linha ~80 (aproximadamente):**
```typescript
// ANTES:
.from('video_lessons')
.select('*')
.in('module_id', accessibleModuleIds)

// DEPOIS:
.from('video_lessons')
.select('*')
.eq('is_current', true)  // ✅ ADICIONAR ESTA LINHA
.in('module_id', accessibleModuleIds)
```

**Linha ~90 (aproximadamente):**
```typescript
// ANTES:
.from('video_lessons')
.select('*')
.eq('is_active', true)

// DEPOIS:
.from('video_lessons')
.select('*')
.eq('is_current', true)  // ✅ ADICIONAR ESTA LINHA
.eq('is_active', true)
```

#### C) `/src/app/admin/videos/page.tsx`
**Para o admin, mantemos tudo igual** (eles veem todas as versões).

Opcional: adicionar um toggle para filtrar:
```typescript
// Adicionar estado
const [showOnlyCurrent, setShowOnlyCurrent] = useState(false)

// Na query:
let query = supabase.from('video_lessons').select('*')
if (showOnlyCurrent) {
  query = query.eq('is_current', true)
}
```

## 🎉 Resultado Final

### Para Mentorados:
- ✅ Veem apenas aulas com `is_current = true`
- ✅ Interface limpa, sem aulas antigas
- ✅ Zero mudanças visuais (mesmo painel)

### Para Admins:
- ✅ Veem todas as versões (como antes)
- ✅ Podem adicionar toggle para filtrar
- ✅ Controle total mantido

## 📝 Resumo das Mudanças
- **3 arquivos** para modificar (mentorado)
- **1 linha** a adicionar em cada query
- **Zero quebras** no sistema existente
- **Máximo resultado** com mínimo esforço

## 🚀 Como Implementar
1. Execute o SQL no Supabase
2. Adicione `.eq('is_current', true)` nas queries dos mentorados
3. Pronto! Sistema funcionando com versionamento

**💡 É a solução mais limpa e eficiente!**