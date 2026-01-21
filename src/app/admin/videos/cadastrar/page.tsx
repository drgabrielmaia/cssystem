'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Upload, Video, FileText, CheckCircle, AlertCircle, Save, Eye } from 'lucide-react'
import Link from 'next/link'

interface VideoModule {
  id: string
  title: string
  description: string
}

export default function CadastrarAulaPage() {
  const [modules, setModules] = useState<VideoModule[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  // Dados da aula
  const [lessonData, setLessonData] = useState({
    module_id: '',
    title: '',
    description: '',
    panda_video_embed_url: '',
    duration_minutes: 0,
    order_index: 1
  })

  // PDF
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)

  // Estados de sucesso/erro
  const [lessonCreated, setLessonCreated] = useState(false)
  const [lessonId, setLessonId] = useState<string | null>(null)

  useEffect(() => {
    loadModules()
  }, [])

  const loadModules = async () => {
    try {
      const { data } = await supabase
        .from('video_modules')
        .select('id, title, description')
        .eq('is_active', true)
        .order('order_index')

      if (data) {
        setModules(data)
        if (data.length > 0) {
          setLessonData(prev => ({ ...prev, module_id: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar módulos:', error)
    }
  }

  const handleCreateLesson = async () => {
    if (!lessonData.title.trim() || !lessonData.module_id) {
      alert('Preencha pelo menos o título e selecione um módulo')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('video_lessons')
        .insert([{
          ...lessonData,
          is_active: true
        }])
        .select()

      if (error) throw error

      if (data && data[0]) {
        setLessonId(data[0].id)
        setLessonCreated(true)
        setStep(3)
      }
    } catch (error) {
      console.error('Erro ao criar aula:', error)
      alert('Erro ao criar aula')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadPdf = async () => {
    if (!selectedFile || !lessonId) return

    try {
      setUploadingPdf(true)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('lesson_id', lessonId)

      const response = await fetch('/api/video/upload-pdf', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        alert('PDF anexado com sucesso! ✅')
        setStep(4)
      } else {
        alert(`Erro ao anexar PDF: ${result.error}`)
      }
    } catch (error) {
      console.error('Erro no upload do PDF:', error)
      alert('Erro ao anexar PDF')
    } finally {
      setUploadingPdf(false)
    }
  }

  const resetForm = () => {
    setLessonData({
      module_id: modules[0]?.id || '',
      title: '',
      description: '',
      panda_video_embed_url: '',
      duration_minutes: 0,
      order_index: 1
    })
    setSelectedFile(null)
    setLessonCreated(false)
    setLessonId(null)
    setStep(1)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/videos"
            className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#1A1A1A] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Vídeos
          </Link>

          <h1 className="text-3xl font-bold text-[#1A1A1A]">
            Cadastrar Nova Aula
          </h1>
          <p className="text-[#64748B] mt-2">
            Processo simples em {step < 3 ? '3' : '4'} etapas
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  step >= stepNumber
                    ? 'bg-[#22C55E] border-[#22C55E] text-white'
                    : step + 1 === stepNumber && lessonCreated
                    ? 'bg-[#E879F9] border-[#E879F9] text-white'
                    : 'border-[#E2E8F0] text-[#64748B]'
                }`}>
                  {step > stepNumber ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    stepNumber
                  )}
                </div>

                {stepNumber < 4 && (
                  <div className={`w-16 h-1 mx-2 transition-all ${
                    step > stepNumber ? 'bg-[#22C55E]' : 'bg-[#E2E8F0]'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-[#64748B]">
              {step === 1 && 'Informações Básicas'}
              {step === 2 && 'Configurações do Vídeo'}
              {step === 3 && 'Material de Apoio (Opcional)'}
              {step === 4 && 'Aula Criada com Sucesso!'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-8">

          {/* Step 1: Informações Básicas */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#E879F9] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-[#E879F9]" />
                </div>
                <h2 className="text-2xl font-semibold text-[#1A1A1A] mb-2">
                  Vamos começar com o básico
                </h2>
                <p className="text-[#64748B]">
                  Título e descrição da sua aula
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-3">
                  Módulo da Aula
                </label>
                <select
                  value={lessonData.module_id}
                  onChange={(e) => setLessonData(prev => ({ ...prev, module_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A] text-lg"
                >
                  {modules.map(module => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-3">
                  Título da Aula *
                </label>
                <input
                  type="text"
                  value={lessonData.title}
                  onChange={(e) => setLessonData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A] text-lg"
                  placeholder="Ex: Como configurar sua primeira campanha"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-3">
                  Descrição da Aula
                </label>
                <textarea
                  value={lessonData.description}
                  onChange={(e) => setLessonData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A] resize-none"
                  placeholder="Explique brevemente o que será ensinado nesta aula..."
                  rows={3}
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!lessonData.title.trim()}
                className="w-full py-4 bg-[#E879F9] text-white rounded-xl font-semibold text-lg hover:bg-[#D865E8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar →
              </button>
            </div>
          )}

          {/* Step 2: Configurações do Vídeo */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#3B82F6] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-[#3B82F6]" />
                </div>
                <h2 className="text-2xl font-semibold text-[#1A1A1A] mb-2">
                  Agora o vídeo da aula
                </h2>
                <p className="text-[#64748B]">
                  Link do Panda Video e configurações
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-3">
                  URL do Vídeo (Panda Video) *
                </label>
                <input
                  type="url"
                  value={lessonData.panda_video_embed_url}
                  onChange={(e) => setLessonData(prev => ({ ...prev, panda_video_embed_url: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A]"
                  placeholder="https://player.pandavideo.com.br/embed/?v=..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-3">
                    Duração (minutos)
                  </label>
                  <input
                    type="number"
                    value={lessonData.duration_minutes}
                    onChange={(e) => setLessonData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A]"
                    placeholder="Ex: 45"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-3">
                    Ordem/Posição
                  </label>
                  <input
                    type="number"
                    value={lessonData.order_index}
                    onChange={(e) => setLessonData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A]"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 border-2 border-[#E2E8F0] text-[#64748B] rounded-xl font-semibold hover:bg-[#F8FAFC] transition-colors"
                >
                  ← Voltar
                </button>

                <button
                  onClick={handleCreateLesson}
                  disabled={loading || !lessonData.title.trim() || !lessonData.panda_video_embed_url.trim()}
                  className="flex-1 py-4 bg-[#E879F9] text-white rounded-xl font-semibold hover:bg-[#D865E8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Criar Aula
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Upload de PDF (Opcional) */}
          {step === 3 && lessonCreated && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#22C55E] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-[#22C55E]" />
                </div>
                <h2 className="text-2xl font-semibold text-[#1A1A1A] mb-2">
                  Aula criada! 🎉
                </h2>
                <p className="text-[#64748B]">
                  Quer anexar um PDF com material de apoio?
                </p>
              </div>

              <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-8 text-center">
                {!selectedFile ? (
                  <div>
                    <Upload className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
                    <p className="text-[#64748B] mb-4">
                      Arraste um PDF aqui ou clique para selecionar
                    </p>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="pdf-upload-step3"
                    />
                    <label
                      htmlFor="pdf-upload-step3"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Selecionar PDF
                    </label>
                    <p className="text-xs text-[#64748B] mt-3">
                      Máximo 50MB • Apenas arquivos PDF
                    </p>
                  </div>
                ) : (
                  <div>
                    <FileText className="w-12 h-12 text-[#22C55E] mx-auto mb-4" />
                    <p className="font-medium text-[#1A1A1A] mb-2">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-[#64748B] mb-6">
                      {Math.round(selectedFile.size / 1024)} KB
                    </p>

                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="px-4 py-2 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#F8FAFC] transition-colors"
                      >
                        Trocar arquivo
                      </button>

                      <button
                        onClick={handleUploadPdf}
                        disabled={uploadingPdf}
                        className="px-6 py-2 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {uploadingPdf ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Anexar PDF
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep(4)}
                className="w-full py-4 border-2 border-[#E2E8F0] text-[#64748B] rounded-xl font-semibold hover:bg-[#F8FAFC] transition-colors"
              >
                Pular esta etapa →
              </button>
            </div>
          )}

          {/* Step 4: Sucesso */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-[#22C55E] bg-opacity-20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-[#22C55E]" />
              </div>

              <div>
                <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4">
                  Aula criada com sucesso! 🎉
                </h2>
                <p className="text-[#64748B] text-lg">
                  "{lessonData.title}" está agora disponível para os mentorados
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Link
                  href="/admin/videos"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 border border-[#E2E8F0] text-[#64748B] rounded-xl hover:bg-[#F8FAFC] transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver todas
                </Link>

                <button
                  onClick={resetForm}
                  className="flex-1 py-3 px-6 bg-[#E879F9] text-white rounded-xl hover:bg-[#D865E8] transition-colors"
                >
                  Criar outra aula
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}