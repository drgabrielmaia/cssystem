'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, Camera, AlertCircle, Briefcase, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import Image from 'next/image'

const funcoes = [
  'Proprietário',
  'Diretor',
  'Gerente',
  'Closer',
  'SDR',
  'Social Seller',
  'Administrativo',
  'Financeiro',
  'Marketing',
  'Suporte',
  'Desenvolvedor',
  'Outro',
]

export function ProfileCompletionModal() {
  const { user, orgUser, organizationId, refreshAuth } = useAuth()
  const [nomeCompleto, setNomeCompleto] = useState(orgUser?.nome_completo || '')
  const [anoNascimento, setAnoNascimento] = useState(orgUser?.ano_nascimento?.toString() || '')
  const [funcao, setFuncao] = useState(orgUser?.funcao || '')
  const [fotoPerfil, setFotoPerfil] = useState(orgUser?.foto_perfil || '')
  const [fotoPreview, setFotoPreview] = useState(orgUser?.foto_perfil || '')
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const needsCompletion = !orgUser?.profile_completed

  if (!needsCompletion || !user || !orgUser) return null

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB')
      return
    }

    setUploadingPhoto(true)
    setError('')

    try {
      // Preview local
      const reader = new FileReader()
      reader.onload = (ev) => setFotoPreview(ev.target?.result as string)
      reader.readAsDataURL(file)

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `profile_${user.id}_${Date.now()}.${fileExt}`
      const filePath = `profile-photos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // Fallback: store as base64 data URL
        console.warn('Storage upload failed, using base64:', uploadError)
        // fotoPreview already has the base64 from FileReader
        setFotoPerfil(fotoPreview)
      } else {
        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath)
        setFotoPerfil(urlData.publicUrl)
      }
    } catch (err: any) {
      console.error('Erro no upload:', err)
      setError('Erro ao enviar foto. Tente novamente.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = async () => {
    if (!nomeCompleto.trim()) {
      setError('Por favor, informe seu nome completo')
      return
    }
    if (!anoNascimento || isNaN(Number(anoNascimento)) || Number(anoNascimento) < 1940 || Number(anoNascimento) > 2010) {
      setError('Por favor, informe um ano de nascimento válido (1940-2010)')
      return
    }
    if (!funcao) {
      setError('Por favor, selecione sua função')
      return
    }
    if (!fotoPerfil && !fotoPreview) {
      setError('Por favor, adicione uma foto de perfil')
      return
    }

    setLoading(true)
    setError('')

    try {
      const photoUrl = fotoPerfil || fotoPreview

      const { error: updateError } = await supabase
        .from('organization_users')
        .update({
          nome_completo: nomeCompleto.trim(),
          ano_nascimento: Number(anoNascimento),
          funcao: funcao,
          foto_perfil: photoUrl,
          profile_completed: true,
        })
        .eq('email', user.email)
        .eq('organization_id', organizationId)

      if (updateError) throw updateError

      await refreshAuth()
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err)
      setError(`Erro ao salvar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const isValid = nomeCompleto.trim() && anoNascimento && funcao && (fotoPerfil || fotoPreview)

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[520px] max-h-[90vh] bg-gray-900 border-gray-700 p-0 flex flex-col [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-700">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#FFD700] rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-gray-900" />
            </div>
            <DialogTitle className="text-2xl text-white">
              Complete seu perfil
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-base">
              Para continuar, precisamos de algumas informações sobre você.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Photo upload */}
          <div className="flex flex-col items-center space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 hover:border-[#D4AF37] cursor-pointer flex items-center justify-center overflow-hidden transition-all group"
            >
              {fotoPreview ? (
                <Image
                  src={fotoPreview}
                  alt="Foto de perfil"
                  fill
                  className="object-cover"
                />
              ) : (
                <Camera className="h-8 w-8 text-gray-500 group-hover:text-[#D4AF37] transition-colors" />
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Label className="text-sm text-gray-400 cursor-pointer hover:text-[#D4AF37]" onClick={() => fileInputRef.current?.click()}>
              Clique para adicionar foto *
            </Label>
          </div>

          {/* Nome completo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">
              <User className="h-4 w-4 inline mr-2" />
              Nome completo *
            </Label>
            <Input
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              placeholder="Seu nome completo"
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 focus:border-[#D4AF37]"
            />
          </div>

          {/* Ano de nascimento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">
              <Calendar className="h-4 w-4 inline mr-2" />
              Ano de nascimento *
            </Label>
            <Input
              type="number"
              value={anoNascimento}
              onChange={(e) => setAnoNascimento(e.target.value)}
              placeholder="Ex: 1990"
              min={1940}
              max={2010}
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 focus:border-[#D4AF37]"
            />
          </div>

          {/* Função */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">
              <Briefcase className="h-4 w-4 inline mr-2" />
              Função na organização *
            </Label>
            <Select value={funcao} onValueChange={setFuncao}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Selecione sua função" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {funcoes.map((f) => (
                  <SelectItem key={f} value={f} className="text-white hover:bg-gray-700">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-700 bg-gray-800/50">
          <Button
            onClick={handleSubmit}
            disabled={loading || !isValid || uploadingPhoto}
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:from-[#B8960C] hover:to-[#D4AF37] text-gray-900 font-bold min-h-[48px] disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                Salvando...
              </div>
            ) : (
              'Salvar e Continuar'
            )}
          </Button>
          <p className="text-xs text-gray-500 text-center mt-3">
            * Todos os campos são obrigatórios
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
