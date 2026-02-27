import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Listar posts salvos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('userEmail')
    const tipo = searchParams.get('tipo')

    if (!userEmail) {
      return NextResponse.json(
        { error: 'userEmail é obrigatório' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('saved_posts')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })

    if (tipo && tipo !== 'all') {
      query = query.eq('tipo_post', tipo)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('Erro ao buscar posts:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar posts' },
        { status: 500 }
      )
    }

    return NextResponse.json({ posts })

  } catch (error: any) {
    console.error('Erro na API de posts salvos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Salvar novo post
export async function POST(request: NextRequest) {
  try {
    const { userEmail, title, content, tipo, persona, doresDesejos, imageUrl } = await request.json()

    if (!userEmail || !title || !content || !tipo) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: userEmail, title, content, tipo' },
        { status: 400 }
      )
    }

    const { data: savedPost, error } = await supabase
      .from('saved_posts')
      .insert({
        user_email: userEmail,
        title,
        content,
        tipo_post: tipo,
        persona,
        dores_desejos: doresDesejos,
        image_url: imageUrl
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao salvar post:', error)
      return NextResponse.json(
        { error: 'Erro ao salvar post' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      post: savedPost
    })

  } catch (error: any) {
    console.error('Erro na API de salvar post:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Excluir post
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('id')
    const userEmail = searchParams.get('userEmail')

    if (!postId || !userEmail) {
      return NextResponse.json(
        { error: 'id e userEmail são obrigatórios' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('id', postId)
      .eq('user_email', userEmail)

    if (error) {
      console.error('Erro ao excluir post:', error)
      return NextResponse.json(
        { error: 'Erro ao excluir post' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Erro na API de excluir post:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
  }
}