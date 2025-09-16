-- ===================================
-- 🔓 DESABILITAR AUTENTICAÇÃO PARA FORMULÁRIOS
-- ===================================
-- Execute este script para garantir que os formulários funcionem sem login

-- Desabilitar RLS em todas as tabelas relacionadas a formulários
ALTER TABLE formularios_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE nps_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iv_vendas_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_iii_gestao_marketing_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_ii_posicionamento_digital_respostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_capacitacao_tecnica_respostas DISABLE ROW LEVEL SECURITY;

-- Garantir que a tabela mentorados permite leitura pública (para buscar dados do mentorado no formulário)
ALTER TABLE mentorados DISABLE ROW LEVEL SECURITY;

-- Verificar o status atual de RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'formularios_respostas', 
    'nps_respostas', 
    'modulo_iv_vendas_respostas',
    'modulo_iii_gestao_marketing_respostas',
    'mentorados'
);

-- ✅ Sucesso! 
-- Agora os formulários podem ser preenchidos sem necessidade de login