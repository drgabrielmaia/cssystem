'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Users, ArrowLeft, Briefcase, Calendar } from 'lucide-react'
import { MentoradoAuthProvider, useMentoradoAuth } from '@/contexts/mentorado-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface TeamMember {
  nome_completo: string
  funcao: string
  ano_nascimento: number | null
  foto_perfil: string | null
}

function EquipeContent() {
  const { mentorado, loading: authLoading } = useMentoradoAuth()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTeam = async () => {
      try {
        // Buscar a org do mentorado
        const orgId = mentorado?.organization_id || '9c8c0033-15ea-4e33-a55f-28d81a19693b'

        const { data, error } = await supabase
          .from('organization_users')
          .select('nome_completo, funcao, ano_nascimento, foto_perfil')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .eq('profile_completed', true)
          .order('nome_completo')

        if (!error && data) {
          setTeam(data.filter(m => m.nome_completo))
        }
      } catch (err) {
        console.error('Erro ao carregar equipe:', err)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) loadTeam()
  }, [mentorado, authLoading])

  const getAge = (year: number | null) => {
    if (!year) return null
    return new Date().getFullYear() - year
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/mentorado" className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#FFD700]/10">
              <Users className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Conheça a Equipe</h1>
              <p className="text-xs text-gray-500">{team.length} membro{team.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {team.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum membro da equipe encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map((member, i) => (
              <Card key={i} className="bg-[#141418] border-white/[0.06] overflow-hidden hover:border-[#D4AF37]/30 transition-all duration-300 group">
                <div className="p-6 flex flex-col items-center text-center">
                  {/* Avatar */}
                  {member.foto_perfil ? (
                    <img
                      src={member.foto_perfil}
                      alt={member.nome_completo}
                      className="w-24 h-24 rounded-full object-cover ring-2 ring-white/[0.08] group-hover:ring-[#D4AF37]/40 transition-all duration-300 mb-4"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#FFD700] flex items-center justify-center ring-2 ring-white/[0.08] group-hover:ring-[#D4AF37]/40 transition-all duration-300 mb-4">
                      <span className="text-2xl font-bold text-gray-900">
                        {member.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Name */}
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {member.nome_completo}
                  </h3>

                  {/* Role */}
                  {member.funcao && (
                    <div className="flex items-center gap-1.5 text-sm text-[#D4AF37] mb-3">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>{member.funcao}</span>
                    </div>
                  )}

                  {/* Age */}
                  {member.ano_nascimento && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{getAge(member.ano_nascimento)} anos</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EquipePage() {
  return (
    <MentoradoAuthProvider>
      <EquipeContent />
    </MentoradoAuthProvider>
  )
}
