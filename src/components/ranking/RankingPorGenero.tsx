'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Trophy, Medal, RefreshCw, Users, TrendingUp } from 'lucide-react'
import { useRankingPontuacao } from '@/hooks/use-ranking-pontuacao'

interface RankingPorGeneroProps {
  showOnlyTop3?: boolean
  enableAutoRefresh?: boolean
  className?: string
  mentoradoId?: string // Para destacar o mentorado logado
}

interface RankingItemProps {
  mentorado: any
  index: number
  isCurrentMentorado?: boolean
  genero: 'masculino' | 'feminino'
}

function RankingItem({ mentorado, index, isCurrentMentorado, genero }: RankingItemProps) {
  const isTop3 = index < 3
  const medalColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : 'text-amber-500'
  const bgColor = genero === 'masculino'
    ? (index === 0 ? 'from-blue-600/20 to-blue-800/20 border-blue-400/30' : 'bg-[#2A2A2A]')
    : (index === 0 ? 'from-pink-600/20 to-pink-800/20 border-pink-400/30' : 'bg-[#2A2A2A]')

  return (
    <div
      className={`flex items-center p-3 rounded-lg transition-all ${
        isCurrentMentorado
          ? 'ring-2 ring-yellow-400 ring-opacity-50 bg-yellow-400/10'
          : isTop3
          ? `bg-gradient-to-r ${bgColor} border`
          : 'bg-[#2A2A2A] hover:bg-[#3A3A3A]'
      }`}
    >
      <div className="flex items-center justify-center w-8 h-8 mr-3">
        {index < 3 ? (
          <Medal className={`w-6 h-6 ${medalColor}`} />
        ) : (
          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {index + 1}
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className={`font-medium text-sm truncate ${isCurrentMentorado ? 'text-yellow-300' : 'text-white'}`}>
          {mentorado.nome_completo}
          {isCurrentMentorado && ' (Você)'}
        </div>
        <div className="text-gray-400 text-xs flex items-center gap-2">
          <span>{mentorado.pontuacao_total} pontos</span>
          {mentorado.especialidade && (
            <>
              <span>•</span>
              <span className="text-gray-500">{mentorado.especialidade}</span>
            </>
          )}
        </div>
      </div>

      <div className={`text-lg font-bold ${
        index === 0 ? (genero === 'masculino' ? 'text-blue-400' : 'text-pink-400') :
        index === 1 ? 'text-gray-400' :
        index === 2 ? 'text-amber-500' :
        'text-white'
      }`}>
        {mentorado.pontuacao_total}
      </div>
    </div>
  )
}

export function RankingPorGenero({
  showOnlyTop3 = false,
  enableAutoRefresh = true,
  className = "",
  mentoradoId
}: RankingPorGeneroProps) {
  const [showFullRankingModal, setShowFullRankingModal] = useState(false)
  const [showRanking, setShowRanking] = useState(true)

  const {
    ranking,
    stats,
    loading,
    error,
    refetch,
    isStale,
    getAverageScore,
    findMentoradoPosition
  } = useRankingPontuacao(enableAutoRefresh ? 60000 : 0)

  // Se não há dados de ranking, não mostrar nada
  if (loading && ranking.masculino.length === 0 && ranking.feminino.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
              <div>
                <div className="h-6 bg-gray-700 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-600 rounded w-48"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[#1A1A1A] rounded-lg p-6">
                <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center p-3 bg-[#2A2A2A] rounded-lg">
                      <div className="w-8 h-8 bg-gray-600 rounded mr-3"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-600 rounded w-32 mb-1"></div>
                        <div className="h-3 bg-gray-700 rounded w-20"></div>
                      </div>
                      <div className="h-6 bg-gray-600 rounded w-12"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <Trophy className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar ranking</h3>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={refetch}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  // Se não há ranking para mostrar
  if (ranking.masculino.length === 0 && ranking.feminino.length === 0) {
    return null
  }

  const displayMasculino = showOnlyTop3 ? ranking.masculino.slice(0, 3) : ranking.masculino
  const displayFeminino = showOnlyTop3 ? ranking.feminino.slice(0, 3) : ranking.feminino

  return (
    <div className={`${className}`}>
      {/* Rankings de Pontuação por Gênero */}
      {showRanking && (displayMasculino.length > 0 || displayFeminino.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  🏆 Ranking de Pontuação por Categoria
                  {isStale && (
                    <RefreshCw className="w-5 h-5 text-orange-400 animate-spin" />
                  )}
                </h2>
                <p className="text-gray-400">Competição por pontos: indicações, metas e participações!</p>

                {/* Stats rápidas */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {stats.total_mentorados} competidores
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {stats.total_pontos.toLocaleString()} pontos total
                  </span>
                  <span>♂ {stats.total_masculino} • ♀ {stats.total_feminino}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refetch}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Atualizar ranking"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowRanking(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking Masculino */}
            {displayMasculino.length > 0 && (
              <div className="bg-[#1A1A1A] rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">♂</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">Ranking Masculino</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>({stats.total_masculino} competidores)</span>
                      <span>Média: {getAverageScore('masculino')} pts</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {displayMasculino.map((mentoradoRank, index) => (
                    <RankingItem
                      key={mentoradoRank.mentorado_id}
                      mentorado={mentoradoRank}
                      index={index}
                      isCurrentMentorado={mentoradoId === mentoradoRank.mentorado_id}
                      genero="masculino"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ranking Feminino */}
            {displayFeminino.length > 0 && (
              <div className="bg-[#1A1A1A] rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">♀</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">Ranking Feminino</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>({stats.total_feminino} competidores)</span>
                      <span>Média: {getAverageScore('feminino')} pts</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {displayFeminino.map((mentoradoRank, index) => (
                    <RankingItem
                      key={mentoradoRank.mentorado_id}
                      mentorado={mentoradoRank}
                      index={index}
                      isCurrentMentorado={mentoradoId === mentoradoRank.mentorado_id}
                      genero="feminino"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botão Ver Ranking Completo */}
          {showOnlyTop3 && (ranking.masculino.length > 3 || ranking.feminino.length > 3) && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowFullRankingModal(true)}
                className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white px-6 py-3 rounded-lg font-medium transition-colors border border-gray-600 hover:border-gray-500"
              >
                Ver rankings completos (♂ {ranking.masculino.length} • ♀ {ranking.feminino.length})
              </button>
            </div>
          )}
        </section>
      )}

      {/* Botão para mostrar ranking quando escondido */}
      {!showRanking && (
        <div className="mb-6">
          <button
            onClick={() => setShowRanking(true)}
            className="flex items-center space-x-3 bg-[#1A1A1A] p-4 rounded-lg border border-gray-700 hover:bg-[#2A2A2A] transition-colors w-full"
          >
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h3 className="text-lg font-bold text-white">Mostrar Ranking de Pontuação</h3>
              <p className="text-gray-400 text-sm">Clique para ver o ranking por pontos</p>
            </div>
          </button>
        </div>
      )}

      {/* Modal de Rankings Completos */}
      {showOnlyTop3 && (
        <Dialog open={showFullRankingModal} onOpenChange={setShowFullRankingModal}>
          <DialogContent className="sm:max-w-[900px] sm:max-h-[90vh] bg-[#181818] border-gray-800 text-white overflow-hidden">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                  <div>
                    <h3 className="text-2xl font-bold">🏆 Rankings Completos por Categoria</h3>
                    <p className="text-gray-400">
                      Competições separadas: ♂ {ranking.masculino.length} • ♀ {ranking.feminino.length} • {stats.total_pontos.toLocaleString()} pts total
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFullRankingModal(false)}
                  className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[600px]">
                {/* Ranking Masculino Completo */}
                {ranking.masculino.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 sticky top-0 bg-[#181818] py-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">♂</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white">Ranking Masculino</h4>
                        <p className="text-xs text-gray-400">Média: {getAverageScore('masculino')} pts</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {ranking.masculino.map((mentoradoRank, index) => (
                        <div
                          key={mentoradoRank.mentorado_id}
                          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                            mentoradoId === mentoradoRank.mentorado_id
                              ? 'ring-2 ring-yellow-400 ring-opacity-50 bg-yellow-400/10'
                              : index < 3
                              ? 'bg-gradient-to-r from-blue-700/30 to-blue-800/30 border border-blue-500/30'
                              : 'bg-[#1A1A1A] hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-blue-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-black' :
                              index === 2 ? 'bg-amber-500 text-black' :
                              'bg-gray-600 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className={`font-medium text-sm ${
                                mentoradoId === mentoradoRank.mentorado_id ? 'text-yellow-300' : 'text-white'
                              }`}>
                                {mentoradoRank.nome_completo}
                                {mentoradoId === mentoradoRank.mentorado_id && ' (Você)'}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {mentoradoRank.pontuacao_total} pontos
                                {mentoradoRank.especialidade && ` • ${mentoradoRank.especialidade}`}
                              </div>
                            </div>
                          </div>
                          <div className={`font-semibold ${
                            index === 0 ? 'text-blue-400' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-amber-400' :
                            'text-white'
                          }`}>
                            {mentoradoRank.pontuacao_total}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ranking Feminino Completo */}
                {ranking.feminino.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 sticky top-0 bg-[#181818] py-2">
                      <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">♀</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white">Ranking Feminino</h4>
                        <p className="text-xs text-gray-400">Média: {getAverageScore('feminino')} pts</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {ranking.feminino.map((mentoradoRank, index) => (
                        <div
                          key={mentoradoRank.mentorado_id}
                          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                            mentoradoId === mentoradoRank.mentorado_id
                              ? 'ring-2 ring-yellow-400 ring-opacity-50 bg-yellow-400/10'
                              : index < 3
                              ? 'bg-gradient-to-r from-pink-700/30 to-pink-800/30 border border-pink-500/30'
                              : 'bg-[#1A1A1A] hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-pink-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-black' :
                              index === 2 ? 'bg-amber-500 text-black' :
                              'bg-gray-600 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className={`font-medium text-sm ${
                                mentoradoId === mentoradoRank.mentorado_id ? 'text-yellow-300' : 'text-white'
                              }`}>
                                {mentoradoRank.nome_completo}
                                {mentoradoId === mentoradoRank.mentorado_id && ' (Você)'}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {mentoradoRank.pontuacao_total} pontos
                                {mentoradoRank.especialidade && ` • ${mentoradoRank.especialidade}`}
                              </div>
                            </div>
                          </div>
                          <div className={`font-semibold ${
                            index === 0 ? 'text-pink-400' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-amber-400' :
                            'text-white'
                          }`}>
                            {mentoradoRank.pontuacao_total}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-700 text-center">
                <p className="text-sm text-gray-400">
                  🏆 Prêmios para 1º lugar de cada categoria • Competição justa e equilibrada
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}