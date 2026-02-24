"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMentoradoAuth, MentoradoAuthProvider } from '@/contexts/mentorado-auth';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  Heart, 
  Brain, 
  User, 
  CheckCircle, 
  ArrowRight, 
  Sparkles,
  Target,
  MessageCircle,
  Save,
  RefreshCw
} from 'lucide-react';
import RuixenMoonChat from '@/components/ui/ruixen-moon-chat';

interface PersonaFormData {
  // Informações Gerais da Persona
  nome_ficticio: string;
  idade: number;
  genero: string[];
  estado_civil: string[];
  profissao: string;
  nivel_escolaridade: string[];
  cidade_estado: string;
  classe_social: string[];
  
  // Rotina e Estilo de Vida
  rotina_diaria: string;
  redes_sociais_usa: string[];
  marcas_admira: string;
  conteudo_consome: string;
  mora_com: string[];
  tem_filhos_animais: string;
  
  // Dores e Frustrações
  principais_problemas: string;
  tentativas_resolucao: string;
  por_que_nao_resolveu: string;
  sentimento_diario: string;
  
  // Desejos e Sonhos
  desejo_6_meses: string;
  sonhos_longo_prazo: string;
  realizacao_pessoal: string;
  vida_ideal: string;
  
  // Objeções e Barreiras
  objecoes_compra: string;
  medos_tratamento: string;
  experiencias_ruins: string;
  acredita_solucao: string;
  
  // Transformação Desejada
  expectativas_servico: string;
  transformacao_buscada: string;
  como_se_ver_3_meses: string;
  
  // Tom de Voz Ideal
  tom_voz_preferido: string[];
  
  // Frases que ela diria
  frases_tipicas: string;
  
  // Onde encontrar
  lugares_frequenta: string;
  eventos_comunidades: string;
  influenciadores_segue: string;
  
  // Resumo
  resumo_persona: string;
}

interface DoresDesejosData {
  dores: string[];
  desejos: string[];
}

function AreaDoAlunoPageContent() {
  const { mentorado, loading: authLoading } = useMentoradoAuth();
  const [activeStep, setActiveStep] = useState<'persona' | 'dores-desejos' | 'chat'>('persona');
  const [personaForm, setPersonaForm] = useState<PersonaFormData>({
    nome_ficticio: '', idade: 0, genero: [], estado_civil: [], profissao: '',
    nivel_escolaridade: [], cidade_estado: '', classe_social: [],
    rotina_diaria: '', redes_sociais_usa: [], marcas_admira: '', conteudo_consome: '',
    mora_com: [], tem_filhos_animais: '', principais_problemas: '', tentativas_resolucao: '',
    por_que_nao_resolveu: '', sentimento_diario: '', desejo_6_meses: '', sonhos_longo_prazo: '',
    realizacao_pessoal: '', vida_ideal: '', objecoes_compra: '', medos_tratamento: '',
    experiencias_ruins: '', acredita_solucao: '', expectativas_servico: '', transformacao_buscada: '',
    como_se_ver_3_meses: '', tom_voz_preferido: [], frases_tipicas: '', lugares_frequenta: '',
    eventos_comunidades: '', influenciadores_segue: '', resumo_persona: ''
  });
  
  const [doresDesejosForm, setDoresDesejosForm] = useState<DoresDesejosData>({
    dores: Array(20).fill(''),
    desejos: Array(20).fill('')
  });
  
  const [personaCompleted, setPersonaCompleted] = useState(false);
  const [doresDesejosCompleted, setDoresDesejosCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mentorado) {
      loadExistingData();
    }
  }, [mentorado]);

  const loadExistingData = async () => {
    if (!mentorado?.id) return;

    try {
      console.log('Carregando dados existentes para:', mentorado.id);

      // Carregar dados da persona
      const { data: personaData, error: personaError } = await supabase
        .from('persona_form_responses')
        .select('*')
        .eq('mentorado_id', mentorado.id)
        .single();

      if (personaError && personaError.code !== 'PGRST116') {
        console.error('Erro ao carregar persona:', personaError);
      } else if (personaData) {
        console.log('Dados da persona carregados:', personaData);
        setPersonaForm(personaData);
        setPersonaCompleted(true);
      }

      // Carregar dados das dores e desejos
      const { data: doresDesejosData, error: doresDesejosError } = await supabase
        .from('persona_pains_desires')
        .select('*')
        .eq('mentorado_id', mentorado.id)
        .single();

      if (doresDesejosError && doresDesejosError.code !== 'PGRST116') {
        console.error('Erro ao carregar dores e desejos:', doresDesejosError);
      } else if (doresDesejosData) {
        console.log('Dados de dores e desejos carregados:', doresDesejosData);
        
        // Montar arrays das dores e desejos
        const dores = [];
        const desejos = [];
        
        for (let i = 1; i <= 20; i++) {
          dores.push(doresDesejosData[`dor_${i}`] || '');
          desejos.push(doresDesejosData[`desejo_${i}`] || '');
        }
        
        setDoresDesejosForm({ dores, desejos });
        setDoresDesejosCompleted(true);
      }
    } catch (error) {
      console.error('Erro ao carregar dados existentes:', error);
    }
  };

  const savePersonaForm = async () => {
    if (!mentorado) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('persona_form_responses')
        .upsert({
          mentorado_id: mentorado.id,
          organization_id: mentorado.organization_id,
          ...personaForm,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setPersonaCompleted(true);
      alert('✅ Formulário de Persona salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar persona:', error);
      alert('❌ Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const saveDoresDesejosForm = async () => {
    if (!mentorado) return;
    
    setLoading(true);
    try {
      const doresDesejosData = {
        mentorado_id: mentorado.id,
        organization_id: mentorado.organization_id,
        ...doresDesejosForm.dores.reduce((acc, dor, index) => ({ ...acc, [`dor_${index + 1}`]: dor }), {}),
        ...doresDesejosForm.desejos.reduce((acc, desejo, index) => ({ ...acc, [`desejo_${index + 1}`]: desejo }), {}),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('persona_pains_desires')
        .upsert(doresDesejosData);

      if (error) throw error;
      
      setDoresDesejosCompleted(true);
      alert('✅ Dores e Desejos salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar dores e desejos:', error);
      alert('❌ Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Brain className="w-10 h-10 text-blue-400" />
            Área do Aluno
          </h1>
          <p className="text-xl text-blue-200">
            Complete os formulários abaixo para personalizar sua experiência com a IA
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-black/30 backdrop-blur-md rounded-full p-2 flex space-x-2">
            <Button
              onClick={() => setActiveStep('persona')}
              variant={activeStep === 'persona' ? 'default' : 'ghost'}
              className={`rounded-full px-6 ${activeStep === 'persona' ? 'bg-blue-600 text-white' : 'text-white/70 hover:text-white'}`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Formulário Persona
              {personaCompleted && <CheckCircle className="w-4 h-4 ml-2 text-green-400" />}
            </Button>
            
            <Button
              onClick={() => setActiveStep('dores-desejos')}
              variant={activeStep === 'dores-desejos' ? 'default' : 'ghost'}
              className={`rounded-full px-6 ${activeStep === 'dores-desejos' ? 'bg-pink-600 text-white' : 'text-white/70 hover:text-white'}`}
            >
              <Heart className="w-4 h-4 mr-2" />
              Dores & Desejos
              {doresDesejosCompleted && <CheckCircle className="w-4 h-4 ml-2 text-green-400" />}
            </Button>

            {mentorado?.email === 'emersonbljr2802@gmail.com' && (
              <Button
                onClick={() => setActiveStep('chat')}
                variant={activeStep === 'chat' ? 'default' : 'ghost'}
                className={`rounded-full px-6 ${activeStep === 'chat' ? 'bg-green-600 text-white' : 'text-white/70 hover:text-white'}`}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat IA Exclusivo
                <Sparkles className="w-4 h-4 ml-2 text-yellow-400" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {activeStep === 'persona' && (
          <PersonaFormSection 
            formData={personaForm} 
            setFormData={setPersonaForm}
            onSave={savePersonaForm}
            loading={loading}
            completed={personaCompleted}
          />
        )}

        {activeStep === 'dores-desejos' && (
          <DoresDesejosSection 
            formData={doresDesejosForm}
            setFormData={setDoresDesejosForm}
            onSave={saveDoresDesejosForm}
            loading={loading}
            completed={doresDesejosCompleted}
          />
        )}

        {activeStep === 'chat' && mentorado?.email === 'emersonbljr2802@gmail.com' && (
          <ChatSection />
        )}
      </div>
    </div>
  );
}

// Componente do Formulário de Persona
function PersonaFormSection({ formData, setFormData, onSave, loading, completed }: {
  formData: PersonaFormData;
  setFormData: (data: PersonaFormData) => void;
  onSave: () => void;
  loading: boolean;
  completed: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          🎯 Formulário de Construção de Persona
        </h2>
        <p className="text-blue-200 text-lg">
          Objetivo: Entender com profundidade quem é o público-alvo ideal da sua comunicação no Instagram. 
          Preencha com o máximo de sinceridade e riqueza de detalhes possível.
        </p>
      </div>

      {/* Seção 1: Informações Gerais */}
      <Card className="bg-black/20 backdrop-blur-md border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <User className="w-6 h-6 text-blue-400" />
            1. Informações Gerais da Persona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Nome fictício da persona:</label>
              <Input 
                value={formData.nome_ficticio}
                onChange={(e) => setFormData({...formData, nome_ficticio: e.target.value})}
                placeholder="Ex: Maria da Silva"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Idade:</label>
              <Input 
                type="number"
                value={formData.idade}
                onChange={(e) => setFormData({...formData, idade: parseInt(e.target.value)})}
                placeholder="Ex: 35"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Gênero: (pode selecionar múltiplos)</label>
              <div className="space-y-2">
                {['Feminino', 'Masculino', 'Não-binário', 'Outro'].map((genero) => (
                  <label key={genero} className="flex items-center space-x-2 text-white">
                    <input
                      type="checkbox"
                      checked={formData.genero.includes(genero)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, genero: [...formData.genero, genero]})
                        } else {
                          setFormData({...formData, genero: formData.genero.filter(g => g !== genero)})
                        }
                      }}
                      className="text-blue-500 rounded"
                    />
                    <span>{genero}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Estado civil: (pode selecionar múltiplos)</label>
              <div className="space-y-2">
                {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável'].map((estado) => (
                  <label key={estado} className="flex items-center space-x-2 text-white">
                    <input
                      type="checkbox"
                      checked={formData.estado_civil.includes(estado)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, estado_civil: [...formData.estado_civil, estado]})
                        } else {
                          setFormData({...formData, estado_civil: formData.estado_civil.filter(e => e !== estado)})
                        }
                      }}
                      className="text-blue-500 rounded"
                    />
                    <span>{estado}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Profissão:</label>
              <Input 
                value={formData.profissao}
                onChange={(e) => setFormData({...formData, profissao: e.target.value})}
                placeholder="Ex: Advogada, Empresária, Professora"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Nível de escolaridade: (pode selecionar múltiplos)</label>
              <div className="space-y-2">
                {['Ensino Fundamental', 'Ensino Médio', 'Técnico', 'Ensino Superior', 'Pós-graduação', 'Mestrado', 'Doutorado'].map((nivel) => (
                  <label key={nivel} className="flex items-center space-x-2 text-white">
                    <input
                      type="checkbox"
                      checked={formData.nivel_escolaridade.includes(nivel)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, nivel_escolaridade: [...formData.nivel_escolaridade, nivel]})
                        } else {
                          setFormData({...formData, nivel_escolaridade: formData.nivel_escolaridade.filter(n => n !== nivel)})
                        }
                      }}
                      className="text-blue-500 rounded"
                    />
                    <span>{nivel}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Cidade/Estado em que mora:</label>
              <Input 
                value={formData.cidade_estado}
                onChange={(e) => setFormData({...formData, cidade_estado: e.target.value})}
                placeholder="Ex: São Paulo/SP"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Classe social: (pode selecionar múltiplos)</label>
              <div className="space-y-2">
                {['Classe A', 'Classe B', 'Classe C', 'Classe D'].map((classe) => (
                  <label key={classe} className="flex items-center space-x-2 text-white">
                    <input
                      type="checkbox"
                      checked={formData.classe_social.includes(classe)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, classe_social: [...formData.classe_social, classe]})
                        } else {
                          setFormData({...formData, classe_social: formData.classe_social.filter(c => c !== classe)})
                        }
                      }}
                      className="text-blue-500 rounded"
                    />
                    <span>{classe}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 2: Rotina e Estilo de Vida */}
      <Card className="bg-black/20 backdrop-blur-md border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <Target className="w-6 h-6 text-purple-400" />
            2. Rotina e Estilo de Vida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Como é a rotina dela (manhã, tarde e noite)?</label>
            <Textarea 
              value={formData.rotina_diaria}
              onChange={(e) => setFormData({...formData, rotina_diaria: e.target.value})}
              placeholder="Descreva detalhadamente como é o dia a dia desta persona..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50 min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Quais redes sociais ela mais usa? (pode selecionar múltiplos)</label>
              <div className="space-y-2">
                {['Instagram', 'Facebook', 'TikTok', 'YouTube', 'WhatsApp', 'LinkedIn', 'Twitter/X', 'Pinterest', 'Telegram'].map((rede) => (
                  <label key={rede} className="flex items-center space-x-2 text-white">
                    <input
                      type="checkbox"
                      checked={formData.redes_sociais_usa.includes(rede)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, redes_sociais_usa: [...formData.redes_sociais_usa, rede]})
                        } else {
                          setFormData({...formData, redes_sociais_usa: formData.redes_sociais_usa.filter(r => r !== rede)})
                        }
                      }}
                      className="text-blue-500 rounded"
                    />
                    <span>{rede}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Quais marcas ela admira ou consome?</label>
              <Input 
                value={formData.marcas_admira}
                onChange={(e) => setFormData({...formData, marcas_admira: e.target.value})}
                placeholder="Ex: Apple, Natura, Nike..."
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Que tipo de conteúdo ela consome online?</label>
            <Textarea 
              value={formData.conteudo_consome}
              onChange={(e) => setFormData({...formData, conteudo_consome: e.target.value})}
              placeholder="Ex: vídeos de saúde, bastidores, dicas, desabafos, memes..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Com quem ela mora? (pode selecionar múltiplos)</label>
              <div className="space-y-2">
                {['Sozinha', 'Com cônjuge/parceiro', 'Com filhos', 'Com pais', 'Com familiares', 'Com amigos/colegas', 'Com pets'].map((situacao) => (
                  <label key={situacao} className="flex items-center space-x-2 text-white">
                    <input
                      type="checkbox"
                      checked={formData.mora_com.includes(situacao)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, mora_com: [...formData.mora_com, situacao]})
                        } else {
                          setFormData({...formData, mora_com: formData.mora_com.filter(m => m !== situacao)})
                        }
                      }}
                      className="text-blue-500 rounded"
                    />
                    <span>{situacao}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Tem filhos? Animais?</label>
              <Input 
                value={formData.tem_filhos_animais}
                onChange={(e) => setFormData({...formData, tem_filhos_animais: e.target.value})}
                placeholder="Ex: 2 filhos adolescentes, 1 cachorro..."
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 3: Dores e Frustrações */}
      <Card className="bg-black/20 backdrop-blur-md border-red-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            😰 3. Dores e Frustrações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Quais são os principais problemas que ela enfrenta hoje?</label>
            <Textarea 
              value={formData.principais_problemas}
              onChange={(e) => setFormData({...formData, principais_problemas: e.target.value})}
              placeholder="Na saúde, estética, emocional, ou na vida como um todo..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50 min-h-[100px]"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">O que ela já tentou para resolver esses problemas?</label>
            <Textarea 
              value={formData.tentativas_resolucao}
              onChange={(e) => setFormData({...formData, tentativas_resolucao: e.target.value})}
              placeholder="Tratamentos, dietas, terapias, medicações..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Por que ela ainda não conseguiu resolver?</label>
            <Textarea 
              value={formData.por_que_nao_resolveu}
              onChange={(e) => setFormData({...formData, por_que_nao_resolveu: e.target.value})}
              placeholder="Falta de tempo, dinheiro, conhecimento, motivação..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">O que ela sente todos os dias por ainda não ter vencido esse desafio?</label>
            <Textarea 
              value={formData.sentimento_diario}
              onChange={(e) => setFormData({...formData, sentimento_diario: e.target.value})}
              placeholder="Frustração, tristeza, ansiedade, baixa autoestima..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Seção 4: Desejos e Sonhos */}
      <Card className="bg-black/20 backdrop-blur-md border-green-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            ✨ 4. Desejos e Sonhos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">O que essa pessoa mais deseja para os próximos 6 meses?</label>
            <Textarea 
              value={formData.desejo_6_meses}
              onChange={(e) => setFormData({...formData, desejo_6_meses: e.target.value})}
              placeholder="Objetivos de curto prazo..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Quais são os sonhos de médio e longo prazo dela?</label>
            <Textarea 
              value={formData.sonhos_longo_prazo}
              onChange={(e) => setFormData({...formData, sonhos_longo_prazo: e.target.value})}
              placeholder="Sonhos para os próximos anos..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">O que faria ela se sentir realizada?</label>
            <Textarea 
              value={formData.realizacao_pessoal}
              onChange={(e) => setFormData({...formData, realizacao_pessoal: e.target.value})}
              placeholder="O que traria verdadeira satisfação..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Como ela imagina a vida ideal?</label>
            <Textarea 
              value={formData.vida_ideal}
              onChange={(e) => setFormData({...formData, vida_ideal: e.target.value})}
              placeholder="Descreva como seria o dia perfeito dela..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Seção 5: Objeções e Barreiras */}
      <Card className="bg-black/20 backdrop-blur-md border-yellow-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            🚧 5. Objeções e Barreiras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">O que faria ela não comprar um serviço ou consulta sua?</label>
            <Textarea 
              value={formData.objecoes_compra}
              onChange={(e) => setFormData({...formData, objecoes_compra: e.target.value})}
              placeholder="Preço, desconfiança, falta de tempo..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Quais são os medos dela com relação ao tratamento?</label>
            <Textarea 
              value={formData.medos_tratamento}
              onChange={(e) => setFormData({...formData, medos_tratamento: e.target.value})}
              placeholder="Efeitos colaterais, dor, não funcionar..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Ela já teve experiências ruins com outros profissionais?</label>
            <Textarea 
              value={formData.experiencias_ruins}
              onChange={(e) => setFormData({...formData, experiencias_ruins: e.target.value})}
              placeholder="Relatos de experiências anteriores..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Ela acredita que seu problema tem solução?</label>
            <select 
              value={formData.acredita_solucao}
              onChange={(e) => setFormData({...formData, acredita_solucao: e.target.value})}
              className="w-full bg-white/10 border border-white/30 text-white rounded-md px-3 py-2"
            >
              <option value="">Selecione...</option>
              <option value="sim_totalmente">Sim, totalmente</option>
              <option value="sim_parcialmente">Sim, parcialmente</option>
              <option value="duvida">Tem dúvidas</option>
              <option value="nao_acredita">Não acredita</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Seção 6: Transformação Desejada */}
      <Card className="bg-black/20 backdrop-blur-md border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            🦋 6. Transformação Desejada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Se ela contratasse seu serviço, o que ela espera alcançar?</label>
            <Textarea 
              value={formData.expectativas_servico}
              onChange={(e) => setFormData({...formData, expectativas_servico: e.target.value})}
              placeholder="Resultados esperados..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Qual transformação física, emocional ou social ela busca?</label>
            <Textarea 
              value={formData.transformacao_buscada}
              onChange={(e) => setFormData({...formData, transformacao_buscada: e.target.value})}
              placeholder="Mudanças desejadas..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Como ela gostaria de se ver daqui a 3 meses?</label>
            <Textarea 
              value={formData.como_se_ver_3_meses}
              onChange={(e) => setFormData({...formData, como_se_ver_3_meses: e.target.value})}
              placeholder="Visão de futuro próximo..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Seção 7: Tom de Voz Ideal */}
      <Card className="bg-black/20 backdrop-blur-md border-pink-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            🗣️ 7. Tom de Voz Ideal para Falar com Ela
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white text-sm mb-4">Como você acredita que essa persona prefere ser abordada? (pode selecionar múltiplos)</p>
          <div className="space-y-2">
            {[
              'Formal',
              'Informal',
              'Carinhosa e acolhedora',
              'Direta e objetiva',
              'Técnica e com autoridade',
              'Inspiradora e motivacional'
            ].map((tom) => (
              <label key={tom} className="flex items-center space-x-2 text-white">
                <input
                  type="checkbox"
                  checked={formData.tom_voz_preferido.includes(tom)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({...formData, tom_voz_preferido: [...formData.tom_voz_preferido, tom]})
                    } else {
                      setFormData({...formData, tom_voz_preferido: formData.tom_voz_preferido.filter(t => t !== tom)})
                    }
                  }}
                  className="text-pink-500 rounded"
                />
                <span>{tom}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seção 8: Frases típicas */}
      <Card className="bg-black/20 backdrop-blur-md border-orange-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            💬 8. Frases que ela provavelmente diria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block text-white text-sm font-medium mb-2">
            Preencha com falas reais que esse tipo de paciente costuma falar ou pensar:
          </label>
          <Textarea 
            value={formData.frases_tipicas}
            onChange={(e) => setFormData({...formData, frases_tipicas: e.target.value})}
            placeholder='Ex: "Já tentei de tudo e nada funciona", "Não tenho tempo para me cuidar"...'
            className="bg-white/10 border-white/30 text-white placeholder:text-white/50 min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Seção 9: Onde encontrar */}
      <Card className="bg-black/20 backdrop-blur-md border-indigo-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            📍 9. Onde encontrar essa persona?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Ela frequenta quais lugares?</label>
            <Textarea 
              value={formData.lugares_frequenta}
              onChange={(e) => setFormData({...formData, lugares_frequenta: e.target.value})}
              placeholder="Academias, shopping, clínicas, eventos..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Participa de quais eventos ou comunidades?</label>
            <Textarea 
              value={formData.eventos_comunidades}
              onChange={(e) => setFormData({...formData, eventos_comunidades: e.target.value})}
              placeholder="Grupos no Facebook, associações, workshops..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Segue quais influenciadores ou páginas?</label>
            <Textarea 
              value={formData.influenciadores_segue}
              onChange={(e) => setFormData({...formData, influenciadores_segue: e.target.value})}
              placeholder="@fulano, @ciclano, canais do YouTube..."
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Seção 10: Resumo */}
      <Card className="bg-black/20 backdrop-blur-md border-violet-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            📝 10. Resumo da Persona em 3 linhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block text-white text-sm font-medium mb-2">
            Escreva um pequeno resumo descritivo da sua persona com base em tudo que você respondeu acima:
          </label>
          <Textarea 
            value={formData.resumo_persona}
            onChange={(e) => setFormData({...formData, resumo_persona: e.target.value})}
            placeholder="Ex: Maria, 35 anos, advogada casada que luta contra o sobrepeso há anos. Busca uma solução definitiva que se adeque à sua rotina corrida. Valoriza profissionalismo e resultados comprovados..."
            className="bg-white/10 border-white/30 text-white placeholder:text-white/50 min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Botão de salvar */}
      <div className="text-center">
        <Button
          onClick={onSave}
          disabled={loading}
          className={`px-8 py-4 text-lg font-semibold rounded-full ${
            completed 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
          ) : completed ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          {completed ? 'Formulário Completo!' : 'Salvar Formulário'}
        </Button>
      </div>
    </div>
  );
}

// Componente das Dores e Desejos
function DoresDesejosSection({ formData, setFormData, onSave, loading, completed }: {
  formData: DoresDesejosData;
  setFormData: (data: DoresDesejosData) => void;
  onSave: () => void;
  loading: boolean;
  completed: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          💗 Suas 20 Dores e 20 Desejos
        </h2>
        <p className="text-pink-200 text-lg">
          Compartilhe suas principais frustrações e maiores sonhos. 
          Isso ajudará a IA a entender profundamente suas necessidades e aspirações.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dores */}
        <Card className="bg-red-900/20 backdrop-blur-md border-red-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              😰 Suas 20 Principais Dores/Frustrações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.dores.map((dor, index) => (
              <div key={index}>
                <label className="block text-white text-sm font-medium mb-1">
                  Dor #{index + 1}:
                </label>
                <Textarea 
                  value={dor}
                  onChange={(e) => {
                    const newDores = [...formData.dores];
                    newDores[index] = e.target.value;
                    setFormData({...formData, dores: newDores});
                  }}
                  placeholder={`Descreva uma frustração ou problema que te incomoda...`}
                  className="bg-white/10 border-red-300/30 text-white placeholder:text-white/50 min-h-[80px]"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Desejos */}
        <Card className="bg-green-900/20 backdrop-blur-md border-green-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              ✨ Seus 20 Maiores Desejos/Sonhos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.desejos.map((desejo, index) => (
              <div key={index}>
                <label className="block text-white text-sm font-medium mb-1">
                  Desejo #{index + 1}:
                </label>
                <Textarea 
                  value={desejo}
                  onChange={(e) => {
                    const newDesejos = [...formData.desejos];
                    newDesejos[index] = e.target.value;
                    setFormData({...formData, desejos: newDesejos});
                  }}
                  placeholder={`Descreva um sonho ou objetivo que você quer alcançar...`}
                  className="bg-white/10 border-green-300/30 text-white placeholder:text-white/50 min-h-[80px]"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Botão de salvar */}
      <div className="text-center">
        <Button
          onClick={onSave}
          disabled={loading}
          className={`px-8 py-4 text-lg font-semibold rounded-full ${
            completed 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-pink-600 hover:bg-pink-700'
          } text-white`}
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
          ) : completed ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          {completed ? 'Dores e Desejos Salvos!' : 'Salvar Dores e Desejos'}
        </Button>
      </div>
    </div>
  );
}

// Componente do Chat (apenas para usuário específico)
function ChatSection() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          🤖 Chat IA Personalizada (Exclusivo)
        </h2>
        <p className="text-green-200 text-lg">
          Converse com a IA que conhece seu perfil, dores e desejos baseado nos formulários preenchidos.
        </p>
      </div>

      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-green-500/30 overflow-hidden">
        <RuixenMoonChat />
      </div>
    </div>
  );
}

export default function AreaDoAlunoPage() {
  return (
    <MentoradoAuthProvider>
      <AreaDoAlunoPageContent />
    </MentoradoAuthProvider>
  );
}