import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase-service'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nome_completo,
      email,
      telefone,
      empresa,
      cargo,
      temperatura,
      nivel_interesse,
      orcamento_disponivel,
      decisor_principal,
      dor_principal,
      preferred_datetime,
      organization_id
    } = body

    // Validate required fields
    if (!nome_completo || !email || !telefone) {
      return NextResponse.json(
        { success: false, error: 'Nome, email e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    // Use the correct organization ID
    const orgId = organization_id || '9c8c0033-15ea-4e33-a55f-28d81a19693b'

    // Create Supabase client with service role for this operation
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    console.log('🎯 Processing lead qualification v2:', { nome_completo, email, temperatura, nivel_interesse })

    // 1. Create the lead directly
    const leadData = {
      nome_completo,
      email,
      telefone,
      empresa: empresa || null,
      cargo: cargo || null,
      temperatura: temperatura || 'morno',
      nivel_interesse: typeof nivel_interesse === 'string' ? nivel_interesse : String(nivel_interesse || 2),
      orcamento_disponivel: orcamento_disponivel || 0,
      decisor_principal: decisor_principal || false,
      dor_principal: dor_principal || null,
      organization_id: orgId,
      origem: 'formulario_qualificacao_v2',
      status: 'agendado',
      data_primeiro_contato: new Date().toISOString()
    }

    const { data: createdLead, error: leadError } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single()

    if (leadError) {
      console.error('❌ Error creating lead:', leadError)
      return NextResponse.json(
        { success: false, error: 'Erro ao criar lead', details: leadError.message },
        { status: 500 }
      )
    }

    console.log('✅ Lead created:', createdLead.id)

    // 2. Get active scoring configuration
    const { data: scoringConfig, error: configError } = await supabase
      .from('scoring_configurations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (configError || !scoringConfig) {
      console.log('⚠️  No scoring config found, using default scoring')
      // Default scoring logic
      let defaultScore = 0
      defaultScore += telefone ? 10 : 0
      defaultScore += email ? 10 : 0
      defaultScore += empresa ? 15 : 0
      defaultScore += cargo ? 10 : 0
      defaultScore += temperatura === 'quente' ? 20 : (temperatura === 'morno' ? 10 : 0)
      defaultScore += nivel_interesse === '3' ? 15 : (nivel_interesse === '2' ? 10 : 5)
      defaultScore += orcamento_disponivel > 0 ? 10 : 0
      defaultScore += decisor_principal ? 10 : 0
      defaultScore += dor_principal ? 10 : 0

      // Update lead with score
      await supabase
        .from('leads')
        .update({ lead_score: defaultScore })
        .eq('id', createdLead.id)

      return NextResponse.json({
        success: true,
        lead_id: createdLead.id,
        score_result: {
          total_score: defaultScore,
          threshold: 60,
          config_used: 'default',
          details: 'Default scoring (no config found)'
        },
        assignment_result: {
          success: false,
          reason: 'No scoring configuration available'
        },
        appointment_result: {
          appointment_scheduled: false
        }
      })
    }

    // 3. Calculate score based on configuration
    let totalScore = 0
    let scoreDetails = []

    if (telefone) {
      totalScore += scoringConfig.telefone_score
      scoreDetails.push({ field: 'telefone', score: scoringConfig.telefone_score })
    }

    if (email) {
      totalScore += scoringConfig.email_score
      scoreDetails.push({ field: 'email', score: scoringConfig.email_score })
    }

    if (empresa) {
      totalScore += scoringConfig.empresa_score
      scoreDetails.push({ field: 'empresa', score: scoringConfig.empresa_score })
    }

    if (cargo) {
      totalScore += scoringConfig.cargo_score
      scoreDetails.push({ field: 'cargo', score: scoringConfig.cargo_score })
    }

    // Temperature scoring
    if (temperatura === 'quente') {
      totalScore += scoringConfig.temperatura_quente_score
      scoreDetails.push({ field: 'temperatura_quente', score: scoringConfig.temperatura_quente_score })
    } else if (temperatura === 'morno') {
      totalScore += scoringConfig.temperatura_morno_score || 0
      scoreDetails.push({ field: 'temperatura_morno', score: scoringConfig.temperatura_morno_score || 0 })
    }

    // Interest level scoring
    if (nivel_interesse === '3' || nivel_interesse === 'alto') {
      totalScore += scoringConfig.nivel_interesse_alto_score
      scoreDetails.push({ field: 'nivel_interesse_alto', score: scoringConfig.nivel_interesse_alto_score })
    } else if (nivel_interesse === '2' || nivel_interesse === 'medio') {
      totalScore += scoringConfig.nivel_interesse_medio_score || 0
      scoreDetails.push({ field: 'nivel_interesse_medio', score: scoringConfig.nivel_interesse_medio_score || 0 })
    } else if (nivel_interesse === '1' || nivel_interesse === 'baixo') {
      totalScore += scoringConfig.nivel_interesse_baixo_score || 0
      scoreDetails.push({ field: 'nivel_interesse_baixo', score: scoringConfig.nivel_interesse_baixo_score || 0 })
    }

    if (orcamento_disponivel > 0) {
      totalScore += scoringConfig.orcamento_disponivel_score
      scoreDetails.push({ field: 'orcamento_disponivel', score: scoringConfig.orcamento_disponivel_score })
    }

    if (decisor_principal) {
      totalScore += scoringConfig.decisor_principal_score
      scoreDetails.push({ field: 'decisor_principal', score: scoringConfig.decisor_principal_score })
    }

    if (dor_principal) {
      totalScore += scoringConfig.dor_principal_score
      scoreDetails.push({ field: 'dor_principal', score: scoringConfig.dor_principal_score })
    }

    console.log('🧮 Calculated score:', totalScore, 'threshold:', scoringConfig.low_score_threshold)

    // 4. Update lead with calculated score
    await supabase
      .from('leads')
      .update({
        lead_score: totalScore,
        lead_score_detalhado: { details: scoreDetails, total: totalScore }
      })
      .eq('id', createdLead.id)

    // 5. Assign closer based on score using scoring configuration
    const isHighScore = totalScore >= scoringConfig.low_score_threshold
    let assignmentResult: {
      success: boolean
      reason: string
      closer_id?: string
      closer_name?: string
      assignment_type?: string
    } = { success: false, reason: 'No closers configured' }

    console.log('🎯 Assignment logic: score =', totalScore, 'threshold =', scoringConfig.low_score_threshold, 'isHighScore =', isHighScore)
    console.log('🎯 Configured closers: high =', scoringConfig.high_score_closer_id, 'low =', scoringConfig.low_score_closer_id)

    // Use the configured closers from scoring configuration
    let targetCloserId = null
    let assignmentType = ''

    if (isHighScore && scoringConfig.high_score_closer_id) {
      targetCloserId = scoringConfig.high_score_closer_id
      assignmentType = 'high_score'
    } else if (!isHighScore && scoringConfig.low_score_closer_id) {
      targetCloserId = scoringConfig.low_score_closer_id
      assignmentType = 'low_score'
    }

    if (targetCloserId) {
      // Get closer details using service client to bypass RLS
      const { data: closerDataArray, error: closerError } = await serviceClient
        .from('closers')
        .select('id, nome_completo, ativo')
        .eq('id', targetCloserId)
        .eq('organization_id', orgId)
        .eq('ativo', true)
        .limit(1)
      
      const closerData = closerDataArray?.[0]
      console.log('🔍 Closer lookup result:', { 
        closerDataArray, 
        closerError, 
        targetCloserId, 
        orgId,
        queryUsed: `id=${targetCloserId}, organization_id=${orgId}, ativo=true`
      })

      if (!closerError && closerData) {
        // Assign the closer using service client to bypass RLS
        const { error: assignError } = await serviceClient
          .from('leads')
          .update({ closer_id: targetCloserId })
          .eq('id', createdLead.id)

        if (!assignError) {
          assignmentResult = {
            success: true,
            closer_id: targetCloserId,
            closer_name: closerData.nome_completo,
            assignment_type: assignmentType,
            reason: `Score ${totalScore} → ${assignmentType} closer (${closerData.nome_completo})`
          }
          console.log('✅ Closer assigned successfully:', assignmentResult)
        } else {
          console.error('❌ Error assigning closer:', assignError)
          assignmentResult.reason = `Error assigning closer: ${assignError.message || 'Unknown error'}`
        }
      } else {
        console.error('❌ Closer not found or inactive:', closerError)
        assignmentResult.reason = 'Configured closer not available'
      }
    } else {
      console.log('⚠️ No closer configured for this score range')
      assignmentResult.reason = 'No closer configured for this score range'
    }

    // 6. Handle appointment scheduling with internal system
    let appointmentResult: {
      appointment_scheduled: boolean
      appointment_token?: string
      scheduled_date?: string
      closer_id?: string
      appointment_link?: string
    } = { appointment_scheduled: false }
    
    if (preferred_datetime && assignmentResult.success) {
      try {
        // Generate appointment token
        const appointmentToken = 'qual-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)

        // Create appointment link
        const { error: linkError } = await supabase
          .from('agendamento_links')
          .insert([{
            token_link: appointmentToken,
            lead_id: createdLead.id,
            closer_id: assignmentResult.closer_id,
            tipo_call_permitido: 'vendas',
            titulo_personalizado: `Agendamento - ${nome_completo}`,
            descricao_personalizada: `Olá ${nome_completo}! Agendamento automático baseado na sua qualificação.`,
            cor_tema: '#3b82f6',
            ativo: true,
            uso_unico: true,
            organization_id: orgId
          }])

        if (!linkError) {
          // Create internal appointment link
          const appointmentLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cssystem.com.br'}/agendar/${appointmentToken}`

          appointmentResult = {
            appointment_scheduled: true,
            appointment_token: appointmentToken,
            scheduled_date: preferred_datetime,
            closer_id: assignmentResult.closer_id,
            appointment_link: appointmentLink
          }
        }
      } catch (error) {
        console.log('⚠️  Appointment scheduling failed:', error)
      }
    }

    // Always add appointment_link if closer was assigned and no link exists
    if (assignmentResult.success && !appointmentResult.appointment_link) {
      // Generate token for immediate appointment booking
      const appointmentToken = 'lead-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
      
      // Create appointment link for this lead
      const { error: linkError } = await serviceClient
        .from('agendamento_links')
        .insert([{
          token_link: appointmentToken,
          lead_id: createdLead.id,
          closer_id: assignmentResult.closer_id,
          tipo_call_permitido: 'vendas',
          titulo_personalizado: `Agendamento - ${nome_completo}`,
          descricao_personalizada: `Olá ${nome_completo}! Link de agendamento baseado na sua qualificação.`,
          cor_tema: '#3b82f6',
          ativo: true,
          uso_unico: false,
          organization_id: orgId
        }])

      if (!linkError) {
        appointmentResult.appointment_link = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cssystem.com.br'}/agendar/${appointmentToken}`
      }
    }

    console.log('✅ Lead qualification completed successfully')

    return NextResponse.json({
      success: true,
      lead_id: createdLead.id,
      score_result: {
        total_score: totalScore,
        threshold: scoringConfig.low_score_threshold,
        config_used: scoringConfig.name,
        details: scoreDetails
      },
      assignment_result: assignmentResult,
      appointment_result: appointmentResult,
      message: 'Lead qualified and processed successfully'
    })

  } catch (error) {
    console.error('❌ Unexpected error in qualification v2:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}