import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { postContent, tipo, userEmail, title, persona, doresDesejos } = await request.json()

    if (!postContent || !tipo || !userEmail) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: postContent, tipo, userEmail' },
        { status: 400 }
      )
    }

    // Por enquanto, vamos simular a geração de imagem
    // Em produção, você pode integrar com APIs como DALL-E, Midjourney, etc.
    const mockImageUrl = `https://via.placeholder.com/1080x1080/4F46E5/FFFFFF?text=${encodeURIComponent(
      tipo.charAt(0).toUpperCase() + tipo.slice(1)
    )}`

    // Salvar o post no banco
    const { data: savedPost, error } = await supabase
      .from('saved_posts')
      .insert({
        user_email: userEmail,
        title: title || `Post ${tipo}`,
        content: postContent,
        tipo_post: tipo,
        persona,
        dores_desejos: doresDesejos,
        image_url: mockImageUrl
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
      post: savedPost,
      imageUrl: mockImageUrl
    })

  } catch (error: any) {
    console.error('Erro na API de geração de imagem:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
  }
}