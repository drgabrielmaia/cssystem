-- =====================================================
-- SISTEMA AUTOMÁTICO DE SCORING E REDIRECIONAMENTO
-- Implementa scoring baseado nas respostas do formulário médico
-- =====================================================

-- 1. CRIAR FUNÇÃO PARA CALCULAR SCORE DO FORMULÁRIO MÉDICO
CREATE OR REPLACE FUNCTION calculate_medical_form_score(submission_data JSONB)
RETURNS TABLE(score INTEGER, temperatura VARCHAR(20), prioridade VARCHAR(20)) AS $$
DECLARE
    total_score INTEGER := 0;
    renda_score INTEGER := 0;
    investimento_score INTEGER := 0;
    situacao_score INTEGER := 0;
    urgencia_score INTEGER := 0;
    experiencia_score INTEGER := 0;
    desafio_score INTEGER := 0;
    objetivo_score INTEGER := 0;
    mentoria_score INTEGER := 0;
    final_temperatura VARCHAR(20);
    final_prioridade VARCHAR(20);
BEGIN
    -- RENDA MENSAL (peso alto - 25 pontos)
    CASE submission_data->>'renda_mensal'
        WHEN 'Acima de R$ 120.000' THEN renda_score := 25;
        WHEN 'De R$ 80.001 a R$ 120.000' THEN renda_score := 20;
        WHEN 'De R$ 50.001 a R$ 80.000' THEN renda_score := 15;
        WHEN 'De R$ 30.001 a R$ 50.000' THEN renda_score := 10;
        WHEN 'De R$ 15.001 a R$ 30.000' THEN renda_score := 5;
        WHEN 'Até R$ 15.000' THEN renda_score := 0;
    END CASE;
    
    -- CAPACIDADE DE INVESTIMENTO (peso alto - 25 pontos)
    CASE submission_data->>'capacidade_investimento'
        WHEN 'Acima de R$ 80.000' THEN investimento_score := 25;
        WHEN 'R$ 50.001 a R$ 80.000' THEN investimento_score := 20;
        WHEN 'R$ 30.001 a R$ 50.000' THEN investimento_score := 15;
        WHEN 'R$ 15.001 a R$ 30.000' THEN investimento_score := 10;
        WHEN 'R$ 5.001 a R$ 15.000' THEN investimento_score := 5;
        WHEN 'Até R$ 5.000' THEN investimento_score := 2;
        WHEN 'Não tenho capacidade de investimento no momento' THEN investimento_score := -10; -- NEGATIVAÇÃO
    END CASE;
    
    -- SITUAÇÃO DE TRABALHO (peso médio - 15 pontos)
    CASE submission_data->>'situacao_trabalho'
        WHEN 'Sócio de clínica/hospital' THEN situacao_score := 15;
        WHEN 'Tenho consultório próprio' THEN situacao_score := 12;
        WHEN 'Trabalho em múltiplos locais' THEN situacao_score := 10;
        WHEN 'Funcionário CLT em hospital/clínica' THEN situacao_score := 8;
        WHEN 'Concursado público' THEN situacao_score := 8;
        WHEN 'Exclusivamente telemedicina' THEN situacao_score := 6;
        WHEN 'Atualmente desempregado' THEN situacao_score := -5; -- NEGATIVAÇÃO
    END CASE;
    
    -- URGÊNCIA (peso alto - 20 pontos)
    CASE submission_data->>'urgencia_mudanca'
        WHEN 'Extremamente urgente - preciso de resultados já' THEN urgencia_score := 20;
        WHEN 'Muito urgente - prazo de 3-6 meses' THEN urgencia_score := 15;
        WHEN 'Moderadamente urgente - prazo de 6-12 meses' THEN urgencia_score := 10;
        WHEN 'Posso esperar mais de 1 ano' THEN urgencia_score := 5;
        WHEN 'Não tenho pressa, é mais curiosidade' THEN urgencia_score := -3; -- NEGATIVAÇÃO
    END CASE;
    
    -- EXPERIÊNCIA (peso baixo - 10 pontos)
    CASE submission_data->>'experiencia_anos'
        WHEN 'Mais de 20 anos' THEN experiencia_score := 10;
        WHEN '16 a 20 anos' THEN experiencia_score := 8;
        WHEN '11 a 15 anos' THEN experiencia_score := 8;
        WHEN '6 a 10 anos' THEN experiencia_score := 6;
        WHEN '2 a 5 anos' THEN experiencia_score := 4;
        WHEN 'Menos de 2 anos' THEN experiencia_score := 2;
    END CASE;
    
    -- MAIOR DESAFIO (peso médio - 10 pontos)
    CASE submission_data->>'maior_desafio'
        WHEN 'Aumentar minha renda mensal' THEN desafio_score := 10;
        WHEN 'Expandir/abrir meu próprio consultório' THEN desafio_score := 9;
        WHEN 'Desenvolver outras fontes de renda' THEN desafio_score := 8;
        WHEN 'Conseguir mais pacientes/clientes' THEN desafio_score := 7;
        WHEN 'Planejamento financeiro e investimentos' THEN desafio_score := 7;
        WHEN 'Migrar para medicina estética/procedimentos' THEN desafio_score := 6;
        WHEN 'Desenvolver habilidades de liderança' THEN desafio_score := 5;
        WHEN 'Melhorar gestão do meu tempo' THEN desafio_score := 4;
    END CASE;
    
    -- OBJETIVO 12 MESES (peso médio - 10 pontos)
    CASE submission_data->>'objetivo_12_meses'
        WHEN 'Conquistar independência financeira' THEN objetivo_score := 10;
        WHEN 'Dobrar minha renda atual' THEN objetivo_score := 9;
        WHEN 'Abrir meu próprio consultório' THEN objetivo_score := 8;
        WHEN 'Sair do emprego CLT e ter autonomia' THEN objetivo_score := 8;
        WHEN 'Diversificar minhas fontes de renda' THEN objetivo_score := 7;
        WHEN 'Desenvolver um negócio paralelo' THEN objetivo_score := 7;
        WHEN 'Melhorar minha qualidade de vida' THEN objetivo_score := 5;
        WHEN 'Ainda não tenho clareza sobre meus objetivos' THEN objetivo_score := -2; -- NEGATIVAÇÃO
    END CASE;
    
    -- EXPERIÊNCIA COM MENTORIA (peso baixo - 5 pontos)
    CASE submission_data->>'ja_investiu_mentoria'
        WHEN 'Sim, várias vezes e tive bons resultados' THEN mentoria_score := 5;
        WHEN 'Sim, algumas vezes com resultados mistos' THEN mentoria_score := 3;
        WHEN 'Não, esta seria minha primeira vez' THEN mentoria_score := 2;
        WHEN 'Sim, mas não tive os resultados esperados' THEN mentoria_score := 1;
        WHEN 'Não, e ainda tenho receio de investir' THEN mentoria_score := -3; -- NEGATIVAÇÃO
    END CASE;
    
    -- CALCULAR SCORE TOTAL
    total_score := renda_score + investimento_score + situacao_score + urgencia_score + 
                   experiencia_score + desafio_score + objetivo_score + mentoria_score;
    
    -- DETERMINAR TEMPERATURA (baseado no score)
    IF total_score >= 70 THEN
        final_temperatura := 'quente';
        final_prioridade := 'alta';
    ELSIF total_score >= 40 THEN
        final_temperatura := 'morno';
        final_prioridade := 'media';
    ELSE
        final_temperatura := 'frio';
        final_prioridade := 'baixa';
    END IF;
    
    -- RETORNAR RESULTADO
    RETURN QUERY SELECT total_score, final_temperatura, final_prioridade;
END;
$$ LANGUAGE plpgsql;

-- 2. CRIAR TRIGGER PARA PROCESSAR SUBMISSIONS AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION process_medical_form_submission()
RETURNS TRIGGER AS $$
DECLARE
    score_result RECORD;
    lead_id_created UUID;
    agendamento_token TEXT;
BEGIN
    -- Só processar se for o formulário médico
    IF NEW.template_slug = 'qualificacao-medica' THEN
        -- Calcular score
        SELECT * INTO score_result FROM calculate_medical_form_score(NEW.submission_data);
        
        -- Buscar ou criar lead
        IF NEW.lead_id IS NOT NULL THEN
            lead_id_created := NEW.lead_id;
            
            -- Atualizar lead com scoring
            UPDATE leads SET
                lead_score_detalhado = score_result.score,
                temperatura_calculada = score_result.final_temperatura,
                prioridade_nivel = score_result.final_prioridade,
                tracking_data = jsonb_build_object(
                    'form_score', score_result.score,
                    'form_temperatura', score_result.final_temperatura,
                    'form_responses', NEW.submission_data,
                    'scored_at', NOW()
                ),
                updated_at = NOW()
            WHERE id = lead_id_created;
        ELSE
            -- Criar novo lead com os dados básicos + scoring
            INSERT INTO leads (
                nome_completo,
                email,
                telefone,
                origem,
                status,
                lead_score_detalhado,
                temperatura_calculada,
                prioridade_nivel,
                tracking_data,
                organization_id,
                data_primeiro_contato,
                created_at,
                updated_at
            ) VALUES (
                NEW.submission_data->>'nome_completo',
                NEW.submission_data->>'email',
                NEW.submission_data->>'telefone',
                'formulario_medico',
                'novo',
                score_result.score,
                score_result.final_temperatura,
                score_result.final_prioridade,
                jsonb_build_object(
                    'form_score', score_result.score,
                    'form_temperatura', score_result.final_temperatura,
                    'form_responses', NEW.submission_data,
                    'scored_at', NOW()
                ),
                NEW.organization_id,
                NOW(),
                NOW(),
                NOW()
            ) RETURNING id INTO lead_id_created;
            
            -- Atualizar form_submission com lead_id criado
            UPDATE form_submissions SET lead_id = lead_id_created WHERE id = NEW.id;
        END IF;
        
        -- Criar agendamento_link automaticamente
        agendamento_token := encode(gen_random_bytes(16), 'base64url');
        
        INSERT INTO agendamento_links (
            token_link,
            lead_id,
            titulo_personalizado,
            descricao_personalizada,
            cor_tema,
            tipo_call_permitido,
            ativo,
            organization_id,
            created_at,
            updated_at
        ) VALUES (
            agendamento_token,
            lead_id_created,
            CONCAT('Agendamento de Call - ', NEW.submission_data->>'nome_completo'),
            CONCAT('Olá ', NEW.submission_data->>'nome_completo', '! Baseado no seu perfil, você foi qualificado para nossa mentoria. Escolha o melhor horário para nossa call.'),
            CASE score_result.final_temperatura 
                WHEN 'quente' THEN '#EF4444'  -- Vermelho para quente
                WHEN 'morno' THEN '#F59E0B'   -- Laranja para morno  
                ELSE '#6B7280'                -- Cinza para frio
            END,
            CASE score_result.final_temperatura
                WHEN 'quente' THEN 'ambos'    -- Call comercial + estratégica
                ELSE 'vendas'                 -- Só call comercial
            END,
            true,
            NEW.organization_id,
            NOW(),
            NOW()
        );
        
        -- Atualizar submission com token de agendamento
        UPDATE form_submissions SET 
            submission_data = submission_data || jsonb_build_object(
                'agendamento_token', agendamento_token,
                'lead_score', score_result.score,
                'lead_temperatura', score_result.final_temperatura
            )
        WHERE id = NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger
DROP TRIGGER IF EXISTS trigger_process_medical_form ON form_submissions;
CREATE TRIGGER trigger_process_medical_form
    AFTER INSERT ON form_submissions
    FOR EACH ROW
    EXECUTE FUNCTION process_medical_form_submission();

-- 3. FUNÇÃO PARA VERIFICAR DISPONIBILIDADE NO CALENDÁRIO
CREATE OR REPLACE FUNCTION check_calendar_availability(
    organization_id_param UUID,
    start_datetime_param TIMESTAMPTZ,
    end_datetime_param TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
    conflicts_count INTEGER;
BEGIN
    -- Verificar se há conflitos no horário solicitado
    SELECT COUNT(*) INTO conflicts_count
    FROM calendar_events
    WHERE organization_id = organization_id_param
    AND (
        (start_datetime <= start_datetime_param AND end_datetime > start_datetime_param) OR
        (start_datetime < end_datetime_param AND end_datetime >= end_datetime_param) OR
        (start_datetime >= start_datetime_param AND end_datetime <= end_datetime_param)
    );
    
    -- Retorna TRUE se não há conflitos (disponível)
    RETURN conflicts_count = 0;
END;
$$ LANGUAGE plpgsql;

-- 4. ATUALIZAR FORM TEMPLATE COM REDIRECIONAMENTO
UPDATE form_templates 
SET fields = fields || jsonb_build_object(
    'redirect_after_submit', '/agenda/agendar/{{agendamento_token}}',
    'scoring_enabled', true,
    'auto_create_scheduling', true
)
WHERE slug = 'qualificacao-medica';

-- Verificação final
SELECT 
    'SCORING SYSTEM IMPLEMENTED' as status,
    'Medical form now has automatic lead scoring and scheduling redirect' as message;