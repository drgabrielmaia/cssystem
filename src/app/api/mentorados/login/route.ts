import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Buscar mentorado por email (case-insensitive)
    const { data: mentoradoData, error: fetchError } = await supabase
      .from('mentorados')
      .select('*')
      .ilike('email', email)
      .single()

    if (fetchError || !mentoradoData) {
      // Tentar busca exata se a case-insensitive falhou
      const { data: exactData, error: exactError } = await supabase
        .from('mentorados')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()

      if (exactError || !exactData) {
        return NextResponse.json(
          { error: 'Email ou senha incorretos' },
          { status: 401 }
        )
      }
      // Usar dados da busca exata
      return await processLogin(exactData, password)
    }

    // Usar dados da busca case-insensitive
    return await processLogin(mentoradoData, password)

  } catch (error) {
    console.error('Erro na API de login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function processLogin(mentoradoData: any, password: string) {
  // Verificar se deve ter acesso bloqueado
  const accessCheck = shouldBlockAccess(mentoradoData)
  if (accessCheck.blocked) {
    return NextResponse.json(
      { error: accessCheck.reason || 'Acesso bloqueado' },
      { status: 403 }
    )
  }

  // Verificar senha
  if (!mentoradoData.password_hash) {
    // Usuário sem senha configurada - permitir qualquer senha
    console.log('Usuario sem senha configurada - permitindo acesso')
  } else {
    // Verificar senha com suporte a migração bcrypt
    try {
      const { PasswordSecurity } = await import('@/lib/password-security')
      const passwordCheck = await PasswordSecurity.migratePlainTextPassword(password, mentoradoData.password_hash)
      
      if (!passwordCheck.isValid) {
        return NextResponse.json(
          { error: 'Email ou senha incorretos' },
          { status: 401 }
        )
      }

      // Se a senha foi migrada de texto plano, atualizar o hash
      if (passwordCheck.newHash) {
        console.log('Migrando senha para hash bcrypt...')
        try {
          const cookieStore = await cookies()
          const supabase = createClient(cookieStore)
          await supabase
            .from('mentorados')
            .update({ password_hash: passwordCheck.newHash })
            .eq('id', mentoradoData.id)
        } catch (error) {
          console.warn('Falha ao atualizar hash da senha:', error)
          // Continue com login mesmo que atualização do hash falhe
        }
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  }

  // Login bem-sucedido - retornar dados do mentorado
  return NextResponse.json({
    success: true,
    mentorado: {
      id: mentoradoData.id,
      nome_completo: mentoradoData.nome_completo,
      email: mentoradoData.email,
      telefone: mentoradoData.telefone,
      estado_atual: mentoradoData.estado_atual,
      status_login: mentoradoData.status_login,
      organization_id: mentoradoData.organization_id
    }
  })
}

function shouldBlockAccess(mentoradoData: any): { blocked: boolean, reason?: string } {
  // 1. Verificar se foi marcado como churn ou excluído
  if (mentoradoData.estado_atual === 'churn') {
    return { blocked: true, reason: 'Conta marcada como churn' }
  }

  // 2. Verificar se completou 12 meses desde a data de entrada
  if (mentoradoData.data_entrada) {
    const dataEntrada = new Date(mentoradoData.data_entrada)
    const agora = new Date()
    const diferencaEmMeses = (agora.getFullYear() - dataEntrada.getFullYear()) * 12 + (agora.getMonth() - dataEntrada.getMonth())

    if (diferencaEmMeses >= 12) {
      return { blocked: true, reason: 'Período de acesso expirado (12 meses)' }
    }
  }

  // 3. Verificar se status_login está inativo
  if (mentoradoData.status_login !== 'ativo') {
    return { blocked: true, reason: 'Status de login inativo' }
  }

  return { blocked: false }
}