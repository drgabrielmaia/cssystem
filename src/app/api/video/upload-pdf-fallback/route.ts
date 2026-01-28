import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Iniciando upload de PDF fallback')
    const formData = await request.formData()
    const file = formData.get('file') as File
    const lessonId = formData.get('id') as string

    // Validar dados obrigatórios
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo PDF é obrigatório' },
        { status: 400 }
      )
    }

    if (!lessonId) {
      return NextResponse.json(
        { error: 'ID da aula é obrigatório' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Apenas arquivos PDF são permitidos' },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo (máximo 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo permitido: 50MB' },
        { status: 400 }
      )
    }

    // Verificar se a aula existe
    const { data: lessonData, error: lessonError } = await supabase
      .from('video_lessons')
      .select('id, title, pdf_url')
      .eq('id', lessonId)
      .single()

    if (lessonError) {
      console.error('Error fetching lesson:', lessonError)
      return NextResponse.json(
        { error: 'Aula não encontrada' },
        { status: 404 }
      )
    }

    // Converter file para buffer
    const fileBuffer = await file.arrayBuffer()
    const fileName = `lesson-pdfs/${lessonId}-${Date.now()}-${file.name}`

    // Upload usando o cliente padrão (com anon key)
    console.log('🔄 Tentando upload do arquivo:', fileName)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lesson-materials')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      return NextResponse.json(
        { error: 'Erro ao fazer upload do PDF', details: uploadError.message },
        { status: 500 }
      )
    }

    // Obter URL pública do arquivo
    const { data: publicUrlData } = supabase.storage
      .from('lesson-materials')
      .getPublicUrl(fileName)

    const pdfUrl = publicUrlData.publicUrl

    // Atualizar a aula com os dados do PDF
    const updateData = {
      pdf_url: pdfUrl,
      pdf_filename: file.name,
      pdf_size_bytes: file.size,
      pdf_uploaded_at: new Date().toISOString()
    }

    const { data: updateResult, error: updateError } = await supabase
      .from('video_lessons')
      .update(updateData)
      .eq('id', lessonId)

    if (updateError) {
      console.error('Error updating lesson with PDF data:', updateError)

      // Se falhar ao atualizar, tentar deletar o arquivo enviado
      await supabase.storage
        .from('lesson-materials')
        .remove([fileName])

      return NextResponse.json(
        { error: 'Erro ao atualizar aula com dados do PDF', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `PDF "${file.name}" enviado com sucesso para a aula "${lessonData.title}"`,
      data: {
        lesson_id: lessonId,
        lesson_title: lessonData.title,
        pdf_url: pdfUrl,
        pdf_filename: file.name,
        pdf_size_bytes: file.size,
        upload_path: fileName,
        replaced_previous: !!lessonData.pdf_url
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Endpoint para remover PDF de uma aula
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lesson_id')

    if (!lessonId) {
      return NextResponse.json(
        { error: 'ID da aula é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar dados atuais da aula
    const { data: lessonData, error: fetchError } = await supabase
      .from('video_lessons')
      .select('pdf_url')
      .eq('id', lessonId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Aula não encontrada', details: fetchError.message },
        { status: 404 }
      )
    }

    // Se há um PDF, tentar removê-lo do storage
    if (lessonData.pdf_url) {
      // Extrair nome do arquivo da URL
      const urlParts = lessonData.pdf_url.split('/')
      const fileName = urlParts[urlParts.length - 1]

      if (fileName.startsWith('lesson-pdfs/')) {
        await supabase.storage
          .from('lesson-materials')
          .remove([fileName])
      }
    }

    // Remover dados do PDF da aula
    const { error: updateError } = await supabase
      .from('video_lessons')
      .update({
        pdf_url: null,
        pdf_filename: null,
        pdf_size_bytes: null,
        pdf_uploaded_at: null
      })
      .eq('id', lessonId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Erro ao remover PDF da aula', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'PDF removido com sucesso da aula'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}