'use client'

import { useState, useEffect } from 'react'
import { 
  Play, 
  FileText, 
  BookOpen, 
  Download, 
  Plus,
  X,
  Search,
  Upload,
  Clock,
  CheckCircle,
  Eye,
  Star
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface StudyMaterial {
  id: string
  title: string
  description: string
  material_type: 'video' | 'pdf' | 'link' | 'document'
  url?: string
  file_path?: string
  category_id?: string
  category_name?: string
  tags: string[]
  metadata: any
  created_at: string
}

interface MaterialCategory {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  display_order: number
}

interface MaterialProgress {
  material_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percentage: number
  last_accessed_at?: string
  completed_at?: string
}

interface StudyMaterialsProps {
  closerId: string
  isVisible: boolean
  onClose: () => void
}

export default function StudyMaterials({ closerId, isVisible, onClose }: StudyMaterialsProps) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [categories, setCategories] = useState<MaterialCategory[]>([])
  const [progress, setProgress] = useState<Record<string, MaterialProgress>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Form states
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    material_type: 'video' as 'video' | 'pdf' | 'link' | 'document',
    url: '',
    category_id: '',
    tags: ''
  })

  useEffect(() => {
    if (isVisible && closerId) {
      loadCategories()
      loadMaterials()
      loadProgress()
    }
  }, [isVisible, closerId])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('closer_material_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (!error && data) {
        setCategories(data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadMaterials = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('closer_study_materials')
        .select(`
          *,
          closer_material_categories!inner(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (!error && data) {
        const formattedMaterials = data.map(material => ({
          ...material,
          category_name: material.closer_material_categories?.name || 'Sem categoria'
        }))
        setMaterials(formattedMaterials)
      }
    } catch (error) {
      console.error('Error loading materials:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('closer_material_progress')
        .select('*')
        .eq('user_id', closerId)

      if (!error && data) {
        const progressMap = data.reduce((acc, prog) => {
          acc[prog.material_id] = prog
          return acc
        }, {} as Record<string, MaterialProgress>)
        setProgress(progressMap)
      }
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  const createMaterial = async () => {
    if (!newMaterial.title || (!newMaterial.url && newMaterial.material_type !== 'document')) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    try {
      setIsLoading(true)
      
      const materialData = {
        title: newMaterial.title,
        description: newMaterial.description,
        material_type: newMaterial.material_type,
        url: newMaterial.url || null,
        category_id: newMaterial.category_id || null,
        tags: newMaterial.tags ? newMaterial.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        created_by: closerId,
        metadata: {}
      }

      const { data, error } = await supabase
        .from('closer_study_materials')
        .insert([materialData])
        .select()

      if (error) {
        throw error
      }

      // Add default permission for all closers
      if (data && data[0]) {
        await supabase
          .from('closer_material_permissions')
          .insert([{
            material_id: data[0].id,
            role_type: 'all_closers',
            can_view: true,
            can_download: true,
            can_share: false
          }])
      }

      // Reset form
      setNewMaterial({
        title: '',
        description: '',
        material_type: 'video',
        url: '',
        category_id: '',
        tags: ''
      })
      setShowAddForm(false)
      
      // Reload materials
      await loadMaterials()
      
    } catch (error) {
      console.error('Error creating material:', error)
      alert('Erro ao adicionar material. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const logInteraction = async (materialId: string, actionType: 'view' | 'download' | 'share') => {
    try {
      await supabase
        .from('closer_material_interactions')
        .insert([{
          user_id: closerId,
          material_id: materialId,
          action_type: actionType
        }])
    } catch (error) {
      console.error('Error logging interaction:', error)
    }
  }

  const updateProgress = async (materialId: string, status: 'in_progress' | 'completed') => {
    try {
      const progressData = {
        user_id: closerId,
        material_id: materialId,
        status,
        progress_percentage: status === 'completed' ? 100 : 50,
        last_accessed_at: new Date().toISOString(),
        completed_at: status === 'completed' ? new Date().toISOString() : null
      }

      const { error } = await supabase
        .from('closer_material_progress')
        .upsert([progressData], {
          onConflict: 'user_id,material_id'
        })

      if (!error) {
        await loadProgress()
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const openMaterial = async (material: StudyMaterial) => {
    await logInteraction(material.id, 'view')
    await updateProgress(material.id, 'in_progress')
    
    if (material.url) {
      window.open(material.url, '_blank')
    }
  }

  const downloadMaterial = async (material: StudyMaterial) => {
    await logInteraction(material.id, 'download')
    // Implement actual download logic here
    console.log('Downloading:', material.title)
  }

  const filteredMaterials = materials.filter(material => {
    const matchesCategory = selectedCategory === 'all' || material.category_id === selectedCategory
    const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         material.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getProgressColor = (materialId: string) => {
    const prog = progress[materialId]
    if (!prog) return 'bg-gray-600'
    if (prog.status === 'completed') return 'bg-[#4ADE80]'
    if (prog.status === 'in_progress') return 'bg-[#FBBF24]'
    return 'bg-gray-600'
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'video': return <Play className="h-5 w-5" />
      case 'pdf': return <FileText className="h-5 w-5" />
      case 'document': return <BookOpen className="h-5 w-5" />
      default: return <BookOpen className="h-5 w-5" />
    }
  }

  const getColorForType = (type: string) => {
    switch (type) {
      case 'video': return 'text-[#4ADE80]'
      case 'pdf': return 'text-[#60A5FA]'
      case 'document': return 'text-[#FBBF24]'
      default: return 'text-[#A1A1AA]'
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-white text-xl font-bold">Material de Estudos</h2>
          <button 
            onClick={onClose}
            className="text-[#71717A] hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-white/10">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#71717A]" />
              <input
                type="text"
                placeholder="Buscar materiais..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0F0F0F] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-[#0F0F0F] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#4ADE80]"
            >
              <option value="all">Todas as categorias</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Add Material Button */}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#4ADE80] text-black rounded-lg hover:bg-[#10B981] transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Adicionar Material
            </button>
          </div>

          {/* Add Material Form */}
          {showAddForm && (
            <div className="mt-6 p-4 bg-[#0F0F0F] rounded-xl border border-white/10">
              <h3 className="text-white font-medium mb-4">Adicionar Novo Material</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input 
                  type="text"
                  placeholder="Título do material"
                  value={newMaterial.title}
                  onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  className="px-3 py-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80]"
                />
                
                <select
                  value={newMaterial.material_type}
                  onChange={(e) => setNewMaterial({ ...newMaterial, material_type: e.target.value as any })}
                  className="px-3 py-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#4ADE80]"
                >
                  <option value="video">Vídeo</option>
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                  <option value="document">Documento</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input 
                  type="url"
                  placeholder="URL do YouTube/PandaVideo"
                  value={newMaterial.url}
                  onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })}
                  className="px-3 py-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80]"
                />
                
                <select
                  value={newMaterial.category_id}
                  onChange={(e) => setNewMaterial({ ...newMaterial, category_id: e.target.value })}
                  className="px-3 py-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#4ADE80]"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <textarea
                  placeholder="Descrição do material"
                  value={newMaterial.description}
                  onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80] resize-none"
                />
              </div>

              <div className="mb-4">
                <input 
                  type="text"
                  placeholder="Tags (separadas por vírgula)"
                  value={newMaterial.tags}
                  onChange={(e) => setNewMaterial({ ...newMaterial, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80]"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={createMaterial}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#4ADE80] text-black rounded-lg hover:bg-[#10B981] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Adicionando...' : 'Adicionar Material'}
                </button>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-[#1E1E1E] text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Materials Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4ADE80]"></div>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-[#71717A]">
              <div className="text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum material encontrado</p>
                <p className="text-sm mt-2">Adicione novos materiais ou ajuste os filtros</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map(material => {
                const materialProgress = progress[material.id]
                
                return (
                  <div key={material.id} className="bg-[#0F0F0F] rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                    {/* Progress bar */}
                    <div className="w-full h-1 bg-gray-700 rounded-full mb-3 overflow-hidden">
                      <div 
                        className={`h-full ${getProgressColor(material.id)} transition-all duration-300`}
                        style={{ width: `${materialProgress?.progress_percentage || 0}%` }}
                      />
                    </div>

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`${getColorForType(material.material_type)}`}>
                        {getIconForType(material.material_type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-sm line-clamp-1">{material.title}</h4>
                        <p className="text-[#71717A] text-xs">{material.category_name}</p>
                      </div>
                      {materialProgress?.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                      )}
                    </div>

                    {/* Description */}
                    {material.description && (
                      <p className="text-[#A1A1AA] text-sm mb-4 line-clamp-2">
                        {material.description}
                      </p>
                    )}

                    {/* Tags */}
                    {material.tags && material.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {material.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-1 bg-[#1E1E1E] text-[#71717A] text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openMaterial(material)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-colors ${
                          material.material_type === 'video' 
                            ? 'bg-[#4ADE80]/10 text-[#4ADE80] hover:bg-[#4ADE80]/20'
                            : material.material_type === 'pdf'
                            ? 'bg-[#60A5FA]/10 text-[#60A5FA] hover:bg-[#60A5FA]/20'
                            : 'bg-[#FBBF24]/10 text-[#FBBF24] hover:bg-[#FBBF24]/20'
                        }`}
                      >
                        <Eye className="h-3 w-3" />
                        {material.material_type === 'video' ? 'Assistir' : 'Abrir'}
                      </button>
                      
                      {material.material_type === 'pdf' && (
                        <button 
                          onClick={() => downloadMaterial(material)}
                          className="flex items-center gap-1 px-3 py-2 bg-[#1E1E1E] text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Progress status */}
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#71717A]">
                          {materialProgress?.status === 'completed' ? 'Concluído' :
                           materialProgress?.status === 'in_progress' ? 'Em andamento' : 'Não iniciado'}
                        </span>
                        {materialProgress?.last_accessed_at && (
                          <span className="text-[#71717A]">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(materialProgress.last_accessed_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}