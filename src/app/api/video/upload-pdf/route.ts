import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 === INÍCIO UPLOAD PDF ===')
    console.log('📊 Headers da requisição:', Object.fromEntries(request.headers.entries()))
    console.log('🌐 URL da requisição:', request.url)

    const formData = await request.formData()
    const file = formData.get('file') as File
    const lessonId = formData.get('id') as string

    console.log('📝 Dados recebidos:')
    console.log('  - lesson_id:', lessonId)
    console.log('  - file name:', file?.name)
    console.log('  - file size:', file?.size)
    console.log('  - file type:', file?.type)
    console.log('  - FormData keys:', Array.from(formData.keys()))
    console.log('  - Todos os valores do FormData:')
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        console.log(`    ${key}: "${value}"`)
      } else {
        console.log(`    ${key}: [File] ${value.name}`)
      }
    })

    // Validar dados obrigatórios
    if (!file) {
      console.log('❌ Erro: Arquivo PDF é obrigatório')
      return NextResponse.json(
        { error: 'Arquivo PDF é obrigatório' },
        { status: 400 }
      )
    }

    if (!lessonId) {
      console.log('❌ Erro: ID da aula é obrigatório')
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

    // Converter file para buffer
    const fileBuffer = await file.arrayBuffer()
    const fileName = `lesson-pdfs/${lessonId}-${Date.now()}-${file.name}`

    // Debug: Verificar variáveis de ambiente
    console.log('🔍 Verificando env vars:')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'EXISTE' : 'NÃO EXISTE')
    console.log('Todas as env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')))

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL não definida')
      return NextResponse.json({ error: 'Configuração do Supabase URL não encontrada' }, { status: 500 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida')
      return NextResponse.json({ error: 'Configuração do Supabase Service Key não encontrada' }, { status: 500 })
    }

    // Fazer upload para o Supabase Storage usando service role
    const { createClient } = await import('@supabase/supabase-js')
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar se a aula existe e buscar dados atuais
    console.log('🔍 Buscando aula no banco...')
    console.log('  - Buscando aula com ID:', lessonId)
    console.log('  - Tipo do ID:', typeof lessonId)

    const { data: lessonData, error: lessonError } = await serviceClient
      .from('video_lessons')
      .select('id, title, pdf_url')
      .eq('id', lessonId)
      .single()

    console.log('📋 Resultado da busca:')
    console.log('  - Dados encontrados:', lessonData)
    console.log('  - Erro:', lessonError)

    if (lessonError) {
      console.error('❌ Error fetching lesson:', lessonError)
      console.error('  - Mensagem:', lessonError.message)
      console.error('  - Código:', lessonError.code)
      return NextResponse.json(
        { error: 'Aula não encontrada', debug: { lessonId, lessonError } },
        { status: 404 }
      )
    }

    console.log('✅ Aula encontrada:', lessonData.title)

    // Se já existe um PDF, remover o anterior do storage
    if (lessonData.pdf_url) {
      try {
        const oldFileName = lessonData.pdf_url.split('/').pop()
        if (oldFileName && oldFileName.includes('lesson-pdfs')) {
          await serviceClient.storage
            .from('lesson-materials')
            .remove([`lesson-pdfs/${oldFileName}`])
          console.log('Arquivo PDF anterior removido:', oldFileName)
        }
      } catch (removeError) {
        console.warn('Aviso: Não foi possível remover PDF anterior:', removeError)
      }
    }

    console.log('📤 Iniciando upload:', fileName)

    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('lesson-materials')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Permite sobrescrever se arquivo já existe
        cacheControl: '3600'
      })

    console.log('📤 Resultado upload:', {
      data: uploadData,
      error: uploadError,
      errorMessage: uploadError?.message || null
    })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      console.error('Full error object:', JSON.stringify(uploadError, null, 2))
      return NextResponse.json(
        {
          error: 'Erro ao fazer upload do PDF',
          details: uploadError.message,
          fullError: uploadError
        },
        { status: 500 }
      )
    }

    // Obter URL pública do arquivo
    const { data: publicUrlData } = serviceClient.storage
      .from('lesson-materials')
      .getPublicUrl(fileName)

    console.log('🔗 URL pública gerada:', publicUrlData.publicUrl)

    const pdfUrl = publicUrlData.publicUrl

    // Atualizar a aula com os dados do PDF
    const updateData = {
      pdf_url: pdfUrl,
      pdf_filename: file.name,
      pdf_size_bytes: file.size,
      pdf_uploaded_at: new Date().toISOString()
    }

    console.log('💾 Atualizando aula com dados do PDF:', updateData)

    const { data: updateResult, error: updateError } = await serviceClient
      .from('video_lessons')
      .update(updateData)
      .eq('id', lessonId)

    console.log('💾 Resultado da atualização:', { data: updateResult, error: updateError })

    if (updateError) {
      console.error('Error updating lesson with PDF data:', updateError)

      // Se falhar ao atualizar, tentar deletar o arquivo enviado
      await serviceClient.storage
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

    const { createClient } = await import('@supabase/supabase-js')
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar dados atuais da aula
    const { data: lessonData, error: fetchError } = await serviceClient
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
        await serviceClient.storage
          .from('lesson-materials')
          .remove([fileName])
      }
    }

    // Remover dados do PDF da aula
    const { error: updateError } = await serviceClient
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