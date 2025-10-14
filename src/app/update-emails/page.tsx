'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const emailUpdates = [
  { nome: 'Ana paula albino guedes', email: 'anapaula-albino@hotmail.com' },
  { nome: 'Guilherme cezar soares', email: 'guilhermecezarsoares@gmail.com' },
  { nome: 'Lorena torrico iriarte', email: 'lti_9@hotmail.com' },
  { nome: 'Sandra de Souza Anadao Possmoser', email: 'sandrapossmoser30@hotmail.com' },
  { nome: 'Darlan Correia do Carmo', email: 'darlancorreia@gmail.com' },
  { nome: 'Guilherme Miranzi de Almeida Martins da Costa', email: 'guimiranzi@hotmail.com' },
  { nome: 'Debora camargo nardy de freitas salgado', email: 'deboranardy@yahoo.com.br' },
  { nome: 'THAIS CHRISTINA SOUSA MADEIRA', email: 'thaiscsmadeira@gmail.com' },
  { nome: 'Marcela Filgueiras Mendes Vilhena', email: 'marcelafilgueiras@gmail.com' },
  { nome: 'Larissa Luana Castro Matias', email: 'larissa.luana.matias@hotmail.com' },
  { nome: 'Mariana Alves Pineze', email: 'mapineze@hotmail.com' },
  { nome: 'Jessica Sztajn Bittencourt', email: 'jsztajn@gmail.com' },
  { nome: 'Michel Rodrigues Furtado', email: 'mrodriguesfurtado@icloud.com' },
  { nome: 'LIDIANE CRISTINA DOS SANTOS', email: '123.lc96@gmail.com' },
  { nome: 'Caroline dutra da costa', email: 'caroline.dutrac@hotmail.com' },
  { nome: 'Carine Marinho Dutra Vilarindo', email: 'carine-marinho@hotmail.com' },
  { nome: 'Rogério de lima Rogério', email: 'rogeriod.l.r1989@gmail.com' },
  { nome: 'Andréa Silva dos Santos', email: 'dra.andrea_santos@hotmail.com' },
  { nome: 'Andressa Fernanda Biscaino de Alcântara Ferreira', email: 'andressa.fbaf@hotmail.com' },
  { nome: 'Amanda Pinheiro Santos', email: 'amandapinheiro3112@gmail.com' },
  { nome: 'Nathalia Prezoutto Venancio Rodrigues', email: 'nathaliaprezoutto@hotmail.com' },
  { nome: 'Felipe Ferreira Carega', email: 'dr.felipecarega@gmail.com' },
  { nome: 'Aluno teste', email: 'alyssonkeys91@gmail.com' },
  { nome: 'Débora de Souza Ferreira', email: 'deborarxt@gmail.com' },
  { nome: 'Fernanda Silva da Silveira Pinto', email: 'fernandasspinto96@gmail.com' },
  { nome: 'KRISTIAN SOLART DE FREITAS', email: 'kristiansolartdefreitas@gmail.com' },
  { nome: 'Marcelo Vieira de Sousa', email: 'drvieiramarcelo10@gmail.com' },
  { nome: 'Eduardo Brusiquesi Martins', email: 'eduardo_brusiquese@hotmail.com' },
  { nome: 'Bruno Angelo Silva', email: 'brunoangelo06@hotmail.com' },
  { nome: 'Alyson Paiva de Souza', email: 'testenovoaluno@gmail.com' },
  { nome: 'Gutemberg de Sousa Dantas Segundo', email: 'segundogutemberg@gmail.com' },
  { nome: 'Bruna Evellyn Freitas de Oliveira', email: 'brunaevellyn@icloud.com' },
  { nome: 'Ton Jeferson da cunha Carvalho', email: 'tonjeferson@gmail.com' },
  { nome: 'Ivonildes Fernandes de Melo Neta', email: 'ivonildesmelo@hotmail.com' },
  { nome: 'Bernardo Alencar Wanderley Estanislau da Costa', email: 'bawec@hotmail.com' },
  { nome: 'Thiago Pereira Guimarães', email: 'thiagopgrio@gmail.com' },
  { nome: 'Diogo machado amaral', email: 'diogotelex1@gmail.com' },
  { nome: 'Ana Luiza Lacerda Mari', email: 'aninhallacerda@hotmail.com' },
  { nome: 'Gustavo Henrique Xavier Denuncio', email: 'xaviermwind@gmail.com' },
  { nome: 'Leonardo Moraes', email: 'drleonardomoraescir@gmail.com' },
  { nome: 'Rebeca Mendes Preres', email: 'rebecamendes12@gmail.com' },
  { nome: 'Rubens cleyton da silva mendes', email: 'rubens.ws@gmail.com' },
  { nome: 'MARCELO MARI DE CASTRO', email: 'marcelomaricastro@gmail.com' },
  { nome: 'João Paulo Guimarães Pena', email: 'jpgpena2014@gmail.com' },
  { nome: 'Ali Rena Roman KERDY', email: 'ali.roman.kerdy@gmail.com' },
  { nome: 'Karina dos Santos Rocha Ferreira', email: 'kari.ferreira@yahoo.com.br' },
  { nome: 'Jhordan Soares de Moura', email: 'jhordan.gv@hotmail.com' },
  { nome: 'Rafael Faria Gil', email: 'rafaelfariagil@gmail.com' },
  { nome: 'Taillan fernandes de almeida', email: 'taillanalmeida06@gmail.com' },
  { nome: 'Renan Alves Garcia', email: 'remedgarcia@outlook.com' },
  { nome: 'thiago medina', email: 'thiago.codarin@hotmail.com' },
  { nome: 'Camila Teixeira Amaro Vieira', email: 'camilateixeiraav@hotmail.com' },
  { nome: 'Thaisa Suckow Custodio', email: 'thatasc@hotmail.com' },
  { nome: 'Natália Fernandes Ribeiro', email: 'natyfernds@gmail.com' },
  { nome: 'Rafael Franco Raso', email: 'rasorafa@gmail.com' },
  { nome: 'Thais Favaro Zavan', email: 'thais_zavan@yahoo.com.br' },
  { nome: 'Jeany Das Graças Cury Santos', email: 'j-cury0806@hotmail.com' },
  { nome: 'Marcus Da Silva Sardinha', email: 'marcussardinha67@gmail.com' },
  { nome: 'Lilian Martins Lacerda', email: 'lilian.cirurgia@hotmail.com' },
  { nome: 'Raissa Campelo Esteves Maranha', email: 'raissacampelo@msn.com' },
  { nome: 'Rafael Brito Mitzcu', email: 'rafaelmitzcun@gmail.com' },
  { nome: 'Dionline Borges Paulo', email: 'dionlineborges19@gmail.com' },
  { nome: 'Fernanda Maria Carvalho Possani', email: 'fernandamcpossani@hotmail.com' },
  { nome: 'Carlos Eduardo de Sousa Martins', email: 'eduardo.martins@firmadeadvogados.com.br' },
  { nome: 'Isabella Gonçalves Andrade', email: 'draisabellagandrade@gmail.com' },
  { nome: 'Jonas Ferro da Silva Neto', email: 'jonas.netto@hotmail.com' },
  { nome: 'Marcela Mascaro Fachini', email: 'ma_mascaro@hotmail.com' },
  { nome: 'CAROLINE BERARDI CHAIBUB', email: 'carolineberardi@hotmail.com' },
  { nome: 'Núbia Mesquita Fiorese', email: 'fioresenubia@gmail.com' },
  { nome: 'Kauê Queiroz de Seabra', email: 'kaueqs@hotmail.com' },
  { nome: 'Hayssa Duarte dos Santos Oliveira', email: 'hayssa84@gmail.com' },
  { nome: 'Julia Ranielly de Oliveira Rios', email: 'julia_rios22@hotmail.com' },
  { nome: 'PEDRO PAULO ASSUNÇÃO DA SILVA', email: 'pedroassuncaopaulo@gmail.com' },
  { nome: 'Ewerton Vignolli Correa', email: 'ewertonvignolli@gmail.com' },
  { nome: 'Mariana cardoso fernandes', email: 'maricf1993@gmail.com' },
  { nome: 'Rodrigo mendes zaqueo', email: 'rodrigozaqueo19@gmail.com' },
  { nome: 'Nathalia Cavalcante Sales', email: 'nathmed@icloud.com' },
  { nome: 'Glaycon michels', email: 'drglaycon@hotmail.com' },
  { nome: 'Renata Santos Teixeira', email: 'drarenatateixeira@gmail.com' },
  { nome: 'Emerson Barbosa de Lira Junior', email: 'emersonbljr2802@gmail.com' },
  { nome: 'LUCAS FERREIRA VILARINHO', email: 'lucfvil@gmail.com' },
  { nome: 'Beatriz vieira Gurgel', email: 'beatrizvieiragurgel@gmail.com' },
  { nome: 'Aguinaldo José Soares Filho', email: 'aguinaldojsfilho@gmail.com' }
]

export default function UpdateEmailsPage() {
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<{ nome: string; email: string; status: 'success' | 'error' | 'not_found'; message?: string }[]>([])
  const [stats, setStats] = useState({ atualizados: 0, erros: 0, naoEncontrados: 0 })

  const atualizarEmails = async () => {
    setProcessing(true)
    setResults([])
    setStats({ atualizados: 0, erros: 0, naoEncontrados: 0 })

    const supabase = createClient()
    const newResults: typeof results = []
    let atualizados = 0, erros = 0, naoEncontrados = 0

    for (const { nome, email } of emailUpdates) {
      try {
        const { data, error } = await supabase
          .from('mentorados')
          .update({ email })
          .eq('nome_completo', nome)
          .select()

        if (error) {
          newResults.push({ nome, email, status: 'error', message: error.message })
          erros++
        } else if (data && data.length > 0) {
          newResults.push({ nome, email, status: 'success' })
          atualizados++
        } else {
          newResults.push({ nome, email, status: 'not_found' })
          naoEncontrados++
        }
      } catch (error) {
        newResults.push({ nome, email, status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' })
        erros++
      }

      setResults([...newResults])
      setStats({ atualizados, erros, naoEncontrados })
    }

    setProcessing(false)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔄 Atualização de Emails dos Mentorados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600 mb-4">
                Esta ferramenta irá atualizar {emailUpdates.length} emails de mentorados no banco de dados.
              </p>

              {results.length > 0 && (
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">✅ Atualizados: {stats.atualizados}</span>
                  <span className="text-red-600">❌ Erros: {stats.erros}</span>
                  <span className="text-yellow-600">⚠️ Não encontrados: {stats.naoEncontrados}</span>
                </div>
              )}
            </div>

            <Button
              onClick={atualizarEmails}
              disabled={processing}
              className="min-w-[200px]"
            >
              {processing ? 'Processando...' : 'Iniciar Atualização'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Resultados da Atualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border-l-4 mb-2 ${
                    result.status === 'success'
                      ? 'border-green-500 bg-green-50'
                      : result.status === 'error'
                      ? 'border-red-500 bg-red-50'
                      : 'border-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{result.nome}</p>
                      <p className="text-sm text-gray-600">{result.email}</p>
                      {result.message && (
                        <p className="text-xs text-red-600">{result.message}</p>
                      )}
                    </div>
                    <span className="text-sm">
                      {result.status === 'success' && '✅'}
                      {result.status === 'error' && '❌'}
                      {result.status === 'not_found' && '⚠️'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}