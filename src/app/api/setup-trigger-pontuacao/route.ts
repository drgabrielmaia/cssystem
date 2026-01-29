import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('🔧 Configurando trigger automático de pontuação...')

    // Criar a função de processamento de pontos
    const createFunction = `
      CREATE OR REPLACE FUNCTION processar_pontos_indicacao()
      RETURNS TRIGGER AS $$
      DECLARE
          indicador_id UUID;
          existing_points INTEGER;
          total_points INTEGER;
      BEGIN
          -- Só processar se tiver indicado_por preenchido
          IF NEW.indicado_por IS NOT NULL AND NEW.indicado_por != '' THEN
              -- Verificar se já existe pontuação para esta indicação
              SELECT COUNT(*) INTO existing_points
              FROM pontuacao_mentorados
              WHERE tipo_acao = 'indicacao'
              AND (meta_data->>'lead_id')::uuid = NEW.id;

              -- Se não existe pontuação para este lead, processar
              IF existing_points = 0 THEN
                  -- Buscar o mentorado indicador por ID
                  SELECT id INTO indicador_id
                  FROM mentorados
                  WHERE id::text = NEW.indicado_por
                  LIMIT 1;

                  -- Se não encontrou por ID, buscar por nome
                  IF indicador_id IS NULL THEN
                      SELECT id INTO indicador_id
                      FROM mentorados
                      WHERE nome_completo ILIKE '%' || NEW.indicado_por || '%'
                      LIMIT 1;
                  END IF;

                  -- Se encontrou o indicador, adicionar ponto
                  IF indicador_id IS NOT NULL THEN
                      -- Inserir pontuação
                      INSERT INTO pontuacao_mentorados (
                          mentorado_id,
                          tipo_acao,
                          pontos,
                          descricao,
                          data_acao,
                          criado_por,
                          meta_data
                      ) VALUES (
                          indicador_id,
                          'indicacao',
                          1,
                          'Indicação automática: ' || COALESCE(NEW.nome_completo, 'Lead'),
                          CURRENT_DATE,
                          'trigger_automatico',
                          jsonb_build_object(
                              'lead_id', NEW.id,
                              'lead_nome', NEW.nome_completo,
                              'processed_at', NOW()
                          )
                      );

                      -- Atualizar pontuação total do mentorado
                      SELECT COALESCE(SUM(pontos), 0) INTO total_points
                      FROM pontuacao_mentorados
                      WHERE mentorado_id = indicador_id;

                      UPDATE mentorados
                      SET pontuacao_total = total_points
                      WHERE id = indicador_id;
                  END IF;
              END IF;
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `

    // Remover trigger existente
    const dropTrigger = `DROP TRIGGER IF EXISTS trigger_pontos_indicacao ON leads;`

    // Criar trigger
    const createTrigger = `
      CREATE TRIGGER trigger_pontos_indicacao
          AFTER INSERT OR UPDATE OF indicado_por
          ON leads
          FOR EACH ROW
          WHEN (NEW.indicado_por IS NOT NULL AND NEW.indicado_por != '')
          EXECUTE FUNCTION processar_pontos_indicacao();
    `

    // Executar comandos sequencialmente
    const { error: funcError } = await supabase.rpc('exec_sql', { query: createFunction })
    if (funcError) {
      console.error('Erro ao criar função:', funcError)
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar função: ' + funcError.message,
        step: 'create_function'
      })
    }

    const { error: dropError } = await supabase.rpc('exec_sql', { query: dropTrigger })
    if (dropError) {
      console.log('Warning ao remover trigger (normal se não existir):', dropError)
    }

    const { error: triggerError } = await supabase.rpc('exec_sql', { query: createTrigger })
    if (triggerError) {
      console.error('Erro ao criar trigger:', triggerError)
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar trigger: ' + triggerError.message,
        step: 'create_trigger'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Trigger automático de pontuação configurado com sucesso!',
      details: 'Agora, sempre que um lead for criado com indicado_por preenchido, automaticamente será adicionado 1 ponto para o mentorado indicador.'
    })

  } catch (error) {
    console.error('Erro geral:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}