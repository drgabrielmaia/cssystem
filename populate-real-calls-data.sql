-- ========================================
-- POPULAR DADOS REAIS DE CALLS - OUTUBRO 2025
-- ========================================

-- Primeiro, limpar dados antigos se necessário
-- DELETE FROM calendar_events WHERE lead_id IS NOT NULL;
-- DELETE FROM leads;

-- Inserir os leads baseados nas calls reais
INSERT INTO leads (nome_completo, email, telefone, empresa, cargo, origem, status, valor_potencial, observacoes, data_primeiro_contato) VALUES
('Renata Santos Teixeira', 'renata.santos@email.com', '(11) 99999-0101', null, 'Empresária', 'instagram', 'cliente', 8500.00, 'Fechou mentoria - Instagram Ativo', '2025-10-01'),
('Glaycon Michels', 'glaycon.michels@email.com', '(11) 99999-0102', null, 'Empreendedor', 'instagram', 'cliente', 7200.00, 'Fechou mentoria - Instagram Ativo', '2025-10-02'),
('Lidio Barros', 'lidio.barros@email.com', '(11) 99999-0103', null, 'Consultor', 'instagram', 'nao_vendida', 6500.00, 'Não fechou - Instagram Ativo', '2025-10-03'),
('Beatriz Gurgel', 'beatriz.gurgel@email.com', '(11) 99999-0104', null, 'Coach', 'instagram', 'cliente', 9100.00, 'Fechou mentoria - Instagram Ativo', '2025-10-03'),
('Leonardo Trinta', 'leonardo.trinta@email.com', '(11) 99999-0105', null, 'Empresário', 'instagram', 'nao_vendida', 5800.00, 'Não fechou - Instagram Ativo', '2025-10-03'),
('Nathalia Gomes', 'nathalia.gomes@email.com', '(11) 99999-0106', null, 'Empreendedora', 'instagram', 'cliente', 7800.00, 'Fechou mentoria - Instagram Ativo', '2025-10-08'),
('Lucas Vilarinho', 'lucas.vilarinho@email.com', '(11) 99999-0107', null, 'Consultor', 'instagram', 'cliente', 8200.00, 'Fechou mentoria - Instagram Ativo', '2025-10-08'),
('Vithoria Giacheto', 'vithoria.giacheto@email.com', '(11) 99999-0108', null, 'Profissional Liberal', 'formulario', 'nao_vendida', 4500.00, 'Não fechou - Formulário Linkbio', '2025-10-09'),
('Aguinaldo Filho', 'aguinaldo.filho@email.com', '(11) 99999-0109', null, 'Empresário', 'indicacao', 'cliente', 9500.00, 'Fechou mentoria - Indicação de mentorado', '2025-10-10'),
('Kathy', 'kathy@email.com', '(11) 99999-0110', null, 'Profissional', 'formulario', 'call_agendada', 6000.00, 'Formulário VD3 - Aguardando definição', '2025-10-10')
ON CONFLICT DO NOTHING;

-- Agora criar os eventos de call para cada lead
WITH lead_calls AS (
  SELECT
    l.id as lead_id,
    l.nome_completo,
    CASE l.nome_completo
      WHEN 'Renata Santos Teixeira' THEN '2025-10-01 14:00:00'
      WHEN 'Glaycon Michels' THEN '2025-10-02 15:30:00'
      WHEN 'Lidio Barros' THEN '2025-10-03 10:00:00'
      WHEN 'Beatriz Gurgel' THEN '2025-10-03 16:00:00'
      WHEN 'Leonardo Trinta' THEN '2025-10-03 11:30:00'
      WHEN 'Nathalia Gomes' THEN '2025-10-08 14:30:00'
      WHEN 'Lucas Vilarinho' THEN '2025-10-08 09:00:00'
      WHEN 'Vithoria Giacheto' THEN '2025-10-09 15:00:00'
      WHEN 'Aguinaldo Filho' THEN '2025-10-10 10:30:00'
      WHEN 'Kathy' THEN '2025-10-10 16:30:00'
    END::timestamp with time zone as call_datetime,
    CASE l.status
      WHEN 'cliente' THEN 'vendida'
      WHEN 'nao_vendida' THEN 'nao_vendida'
      WHEN 'call_agendada' THEN 'agendada'
      ELSE 'realizada'
    END as call_status,
    CASE l.status
      WHEN 'cliente' THEN l.valor_potencial
      ELSE NULL
    END as sale_value
  FROM leads l
  WHERE l.nome_completo IN (
    'Renata Santos Teixeira', 'Glaycon Michels', 'Lidio Barros',
    'Beatriz Gurgel', 'Leonardo Trinta', 'Nathalia Gomes',
    'Lucas Vilarinho', 'Vithoria Giacheto', 'Aguinaldo Filho', 'Kathy'
  )
)
INSERT INTO calendar_events (
  title,
  description,
  start_datetime,
  end_datetime,
  lead_id,
  call_status,
  sale_value,
  result_notes,
  all_day
)
SELECT
  'Call Comercial - ' || nome_completo,
  'Call de vendas com ' || nome_completo || ' - Canal: ' ||
  CASE
    WHEN nome_completo IN ('Renata Santos Teixeira', 'Glaycon Michels', 'Lidio Barros', 'Beatriz Gurgel', 'Leonardo Trinta', 'Nathalia Gomes', 'Lucas Vilarinho')
    THEN 'Instagram Ativo'
    WHEN nome_completo = 'Vithoria Giacheto' THEN 'Formulário Linkbio'
    WHEN nome_completo = 'Aguinaldo Filho' THEN 'Indicação de mentorado'
    WHEN nome_completo = 'Kathy' THEN 'Formulário VD3'
  END,
  call_datetime,
  call_datetime + INTERVAL '1 hour',
  lead_id,
  call_status,
  sale_value,
  'Call real registrada - ' ||
  CASE call_status
    WHEN 'vendida' THEN 'Mentoria fechada'
    WHEN 'nao_vendida' THEN 'Não fechou'
    WHEN 'agendada' THEN 'Aguardando definição'
    ELSE 'Call realizada'
  END,
  false
FROM lead_calls
ON CONFLICT DO NOTHING;

-- Mostrar estatísticas das calls criadas
SELECT
  'Calls de vendas criadas com sucesso!' as status,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE call_status = 'vendida') as vendidas,
  COUNT(*) FILTER (WHERE call_status = 'nao_vendida') as nao_vendidas,
  COUNT(*) FILTER (WHERE call_status = 'agendada') as agendadas,
  SUM(sale_value) as total_vendas
FROM calendar_events ce
JOIN leads l ON ce.lead_id = l.id
WHERE l.nome_completo IN (
  'Renata Santos Teixeira', 'Glaycon Michels', 'Lidio Barros',
  'Beatriz Gurgel', 'Leonardo Trinta', 'Nathalia Gomes',
  'Lucas Vilarinho', 'Vithoria Giacheto', 'Aguinaldo Filho', 'Kathy'
);

-- Verificar métricas do Social Seller
SELECT
  TO_CHAR(month_year, 'YYYY-MM') as mes,
  total_calls,
  calls_vendidas,
  calls_nao_vendidas,
  taxa_conversao,
  total_vendas
FROM social_seller_metrics
WHERE month_year >= '2025-10-01'
ORDER BY month_year DESC;