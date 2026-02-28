"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useMentoradoAuth } from "@/contexts/mentorado-auth";
import PostEditor from "@/components/posts/PostEditor";
import type { PostSlide } from "@/types";
import {
  Send,
  User,
  X,
  Copy,
  ChevronDown,
  ChevronRight,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Heart,
  Target,
  MessageSquare,
  BookOpen,
  Lightbulb,
  Instagram,
  FileText,
  Stethoscope,
  Check,
  Camera,
  Users,
  Brain,
  ShieldQuestion,
  MessageCircle,
  Save,
  Eye,
  Palette,
  Paperclip,
  Image as ImageIcon,
  Phone,
  Download,
} from "lucide-react";

// ========================
// HELPERS
// ========================

async function ensureJpeg(file: File): Promise<File> {
  const isHeic = file.type === "image/heic" || file.type === "image/heif" || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
  if (!isHeic) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    const blob = Array.isArray(result) ? result[0] : result;
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
  } catch (err) {
    console.warn("heic2any falhou, tentando usar original:", err);
    return file;
  }
}

// ========================
// TYPES
// ========================

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  contentType?: string;
  imageUrl?: string;
}

interface PersonaData {
  nome_ficticio: string;
  idade: number | null;
  genero: string[];
  estado_civil: string[];
  profissao: string;
  nivel_escolaridade: string[];
  cidade_estado: string;
  classe_social: string[];
  rotina_diaria: string;
  redes_sociais_usa: string[];
  marcas_admira: string;
  conteudo_consome: string;
  mora_com: string[];
  tem_filhos_animais: string;
  principais_problemas: string;
  tentativas_resolucao: string;
  por_que_nao_resolveu: string;
  sentimento_diario: string;
  desejo_6_meses: string;
  sonhos_longo_prazo: string;
  realizacao_pessoal: string;
  vida_ideal: string;
  objecoes_compra: string;
  medos_tratamento: string;
  experiencias_ruins: string;
  acredita_solucao: string;
  expectativas_servico: string;
  transformacao_buscada: string;
  como_se_ver_3_meses: string;
  tom_voz_preferido: string[];
  frases_tipicas: string;
  lugares_frequenta: string;
  eventos_comunidades: string;
  influenciadores_segue: string;
  resumo_persona: string;
}

interface ProfileData {
  instagram: string;
  avatar_url: string;
}

// ========================
// CONSTANTS
// ========================

const CONTENT_MODES = [
  { id: "chat", label: "Chat Livre", icon: MessageSquare, description: "Conversa livre com a IA" },
  { id: "motivacional", label: "Post Motivacional", icon: Heart, description: "Inspire sua audiencia" },
  { id: "educativo", label: "Post Educativo", icon: BookOpen, description: "Ensine algo valioso" },
  { id: "pessoal", label: "Post Pessoal", icon: User, description: "Mostre seu lado humano" },
  { id: "stories", label: "Stories", icon: Instagram, description: "Conteudo para stories" },
  { id: "carrossel", label: "Carrossel", icon: FileText, description: "Post em carrossel" },
  { id: "secretaria", label: "Secretaria", icon: Phone, description: "Atendimento de pacientes" },
  { id: "imagem", label: "Gerar Imagem", icon: ImageIcon, description: "Crie imagens com IA" },
] as const;

const IMAGE_TEMPLATES = [
  { id: "the-cover", label: "Capa de Revista", prompt: "Fotografia editorial hiper-realista de corpo inteiro em estúdio de alta moda. POSE EXATA: pessoa de pé com pernas afastadas na largura dos ombros, peso distribuído no pé esquerdo com quadril levemente deslocado, mão direita dentro do bolso do blazer com apenas o polegar para fora tocando o tecido, mão esquerda solta ao lado do corpo com dedos relaxados e levemente curvados — veias sutis visíveis no dorso da mão. ROUPA COM TEXTURA: terno slim fit em lã fria italiana azul marinho com micro-textura herringbone visível de perto, lapela notch estreita de 7cm com costura pick-stitch visível à mão, camisa branca de algodão egípcio 140 fios com colarinho cutaway aberto revelando a clavícula, sem gravata, punhos franceses com abotoaduras de ouro fosco, cinto de couro cognac com fivela de metal escovado, sapato oxford de couro polido marrom com brilho de cera, relógio de aço escovado no pulso esquerdo com mostrador azul. EXPRESSÃO: olhar direto penetrante para a câmera com microexpressão de confiança — canto dos olhos levemente contraídos (orbicular), sobrancelha esquerda 2mm mais elevada que a direita, sorriso fechado assimétrico com canto direito dos lábios 3mm mais alto, mandíbula relaxada mas definida, pele hiper-real com poros visíveis na zona T, leve sombra de barba de 12 horas no maxilar. CENÁRIO: estúdio com cyclorama infinito cinza grafite, chão de acrílico preto espelhado refletindo 40% da silhueta. ILUMINAÇÃO: key light softbox octogonal 150cm a 45° lateral direita, fill bounce -2EV no lado oposto, hair light Fresnel com grid de 20° a 60° atrás. CÂMERA: Canon EOS R5 Mark II, lente RF 24-70mm f/2.8L em 50mm, f/4.0, ISO 100, resolução 8K, color grading cinematográfico estilo capa GQ ou Forbes 30 Under 30", icon: "📸" },
  { id: "golden-empire", label: "Hora Dourada", prompt: "Fotografia cinematográfica hiper-realista de corpo inteiro ao ar livre no exato momento do golden hour (sol a 8° do horizonte). POSE EXATA: pessoa caminhando com passada longa e confiante em calçadão de madeira clara à beira-mar, pé direito à frente, braço esquerdo em balanço natural, tronco ereto com ombros abertos, cabeça levemente virada para a câmera mantendo olhar lateral magnético. ROUPA COM TEXTURA: camisa de linho branco off-white com textura de fibra visível e leves vincos naturais, botões de madrepérola com 3 botões abertos, mangas dobradas até meio do antebraço mostrando bronzeado natural, calça de alfaiataria bege areia, mocassim de camurça bege sem meias, pulseira de couro trançado fino, óculos de sol aviador dourados. EXPRESSÃO: sorriso genuíno relaxado com dentes levemente visíveis, olhos semicerrados pelo sol, pele bronzeada com brilho sutil. CENÁRIO DETALHADO: calçadão de deck à beira-mar, oceano ao fundo com ondas quebrando em espuma branca, céu em gradiente laranja-âmbar, rosa-coral, violeta-índigo com cirrus em ouro, coqueiros no horizonte, gaivotas em voo distante. ILUMINAÇÃO: sol como backlight criando rim light dourado intenso, lens flare anamórfico sutil. CÂMERA: Sony A7RV, lente FE 135mm f/1.8 GM, f/2.0, ISO 200, bokeh cremoso dourado, color grading warm cinematic", icon: "🌅" },
  { id: "dark-luxury", label: "Luxo Noturno", prompt: "Fotografia cinematográfica hiper-realista em ambiente de luxo noturno com iluminação low-key. POSE EXATA: pessoa sentada em poltrona Chesterfield de couro marrom envelhecido com capitonê profundo, corpo reclinado a 15° com confiança, perna direita cruzada sobre a esquerda, braço esquerdo apoiado no braço da poltrona com dedos relaxados, mão direita segurando copo de cristal Glencairn com whisky amber dourado — reflexo de chama ondulando. ROUPA COM TEXTURA: blazer de veludo verde-escuro sobre turtleneck de cashmere preta com textura de tricô fino visível, calça de lã cinza carvão com vinco central perfeito, relógio com pulseira de couro marrom. EXPRESSÃO: olhar direto intenso controlado, pálpebras a 70%, lábios fechados com canto elevado (quase sorriso), mandíbula definida. CENÁRIO DETALHADO: biblioteca particular com estantes de mogno do chão ao teto repletas de livros encadernados em couro, lareira de mármore acesa com chamas criando dança de sombras, tapete persa vintage, decanter de cristal e luminária Tiffany âmbar. ILUMINAÇÃO: chiaroscuro dramático — lareira como backlight quente, luminária Tiffany como key light criando triângulo Rembrandt no rosto. CÂMERA: Hasselblad X2D 100C, lente XCD 65mm f/2.8, f/2.8, ISO 400, resolução 100MP, color grading estilo David Fincher", icon: "🖤" },
  { id: "main-stage", label: "Palco Principal", prompt: "Fotografia de evento hiper-realista capturada em congresso internacional. POSE EXATA: pessoa de pé no centro do palco principal, corpo levemente angulado a 20° da câmera, mão direita erguida na altura do ombro com palma aberta em gesto enfático, mão esquerda segurando microfone preto sem fio, pé direito à frente criando dinamismo. ROUPA COM TEXTURA: blazer azul-petróleo slim em lã tropical, lapela com pin dourado, camisa branca de popeline sem gravata, calça cinza grafite de alfaiataria, sapato derby preto fosco. EXPRESSÃO: momento exato de fala apaixonada — boca aberta, sobrancelhas elevadas e franzidas (expressão de ênfase), olhos brilhantes focados na plateia, rugas de expressão dinâmicas, leve brilho de suor na testa. CENÁRIO DETALHADO: palco moderno com piso preto refletivo, tela LED de 12 metros ao fundo com gráfico desfocado, plateia com 500+ pessoas — primeiras filas visíveis, traseiras em silhueta com celulares fotografando. ILUMINAÇÃO: 4 spots fresnel quentes, 2 moving heads criando rim light azulado, haze leve tornando feixes de luz visíveis. CÂMERA: Canon EOS R3, lente RF 70-200mm f/2.8L em 135mm, f/2.8, ISO 4000, color grading dourado quente vs azul frio", icon: "🎤" },
  { id: "penthouse-view", label: "Vista da Cobertura", prompt: "Fotografia editorial hiper-realista em cobertura de luxo com vista panorâmica noturna da cidade. POSE EXATA: pessoa de pé a 50cm do vidro piso-teto de 4 metros, corpo a 30° da câmera, mão esquerda no bolso com polegar para fora, mão direita segurando taça de vinho tinto na altura do peito com reflexo do skyline no vidro, cabeça virada para a câmera com olhar direto por cima do ombro. ROUPA COM TEXTURA: suéter de cashmere cinza com gola V rasa sobre camiseta branca, textura do tricô visível, calça de alfaiataria preta com caimento perfeito, pés descalços no piso (detalhe íntimo e casual), relógio dress watch. EXPRESSÃO: olhar de cumplicidade, sorriso genuíno de canto com vincos de sorriso, pele natural com barba por fazer de 24h. CENÁRIO DETALHADO: penthouse minimalista — piso de mármore Calacatta, sofá de couro cognac, mesa com livro de arte e vela aromática acesa, luminária Arco, planta Monstera, vista do skyline — arranha-céus com janelas iluminadas, ponte ao fundo, céu crepuscular azul-royal a coral. ILUMINAÇÃO: 3 fontes — luminária Arco quente, vela como accent, skyline como background luminoso filtrado pelo vidro com reflexo fantasma (dupla exposição natural). CÂMERA: Leica SL2-S, Summilux-SL 35mm f/1.4, f/2.0, ISO 400, color grading noturno quente interior vs azul frio urbano exterior", icon: "🏙️" },
  { id: "nature-reset", label: "Topo da Montanha", prompt: "Fotografia de lifestyle hiper-realista em cenário natural espetacular durante magic hour. POSE EXATA: pessoa de corpo inteiro de pé na beira de mirante rochoso no topo de montanha, pé direito na borda com joelho flexionado, braços abertos em V sutil na altura dos ombros com palmas para frente como quem abraça a vista, cabeça levemente inclinada para trás contemplando a vastidão. ROUPA COM TEXTURA: jaqueta puffer leve verde-oliva com costuras acolchoadas visíveis, zíper semiaberto revelando camiseta cinza mescla, calça cargo slim marrom terroso, tênis de trilha cinza e laranja com sola enlameada, mochila técnica preta, óculos de sol espelhados na gola. EXPRESSÃO: êxtase silencioso — boca levemente entreaberta, olhos semicerrados pelo vento e luz, testa relaxada, bochechas rosadas pelo frio. CENÁRIO DETALHADO: mirante de granito com musgos, vista panorâmica 270° — vale com floresta atlântica em 50 tons de verde, rio serpenteando no fundo, cadeia de montanhas em camadas recuando com perspectiva atmosférica, névoa branca nos vales, nuvens cumulus dramáticas com 3 raios crepusculares (god rays) atingindo o vale como spotlights dourados. ILUMINAÇÃO: magic hour lateral com sol a 12° do horizonte criando rim light dourado em todo o contorno. CÂMERA: Fujifilm GFX 100S, lente GF 32-64mm f/4 em 40mm, f/8.0, ISO 200, resolução 100MP, simulação Fuji Velvia 50 com saturação +15%", icon: "🏔️" },
] as const;

const EMPTY_PERSONA: PersonaData = {
  nome_ficticio: "", idade: null, genero: [], estado_civil: [], profissao: "",
  nivel_escolaridade: [], cidade_estado: "", classe_social: [], rotina_diaria: "",
  redes_sociais_usa: [], marcas_admira: "", conteudo_consome: "", mora_com: [],
  tem_filhos_animais: "", principais_problemas: "", tentativas_resolucao: "",
  por_que_nao_resolveu: "", sentimento_diario: "", desejo_6_meses: "",
  sonhos_longo_prazo: "", realizacao_pessoal: "", vida_ideal: "", objecoes_compra: "",
  medos_tratamento: "", experiencias_ruins: "", acredita_solucao: "",
  expectativas_servico: "", transformacao_buscada: "", como_se_ver_3_meses: "",
  tom_voz_preferido: [], frases_tipicas: "", lugares_frequenta: "",
  eventos_comunidades: "", influenciadores_segue: "", resumo_persona: "",
};

const GENERO_OPTIONS = ["Masculino", "Feminino", "Nao-binario", "Outro"];
const ESTADO_CIVIL_OPTIONS = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viuvo(a)", "Uniao Estavel"];
const ESCOLARIDADE_OPTIONS = ["Fundamental", "Medio", "Superior", "Pos-graduacao", "Mestrado", "Doutorado"];
const CLASSE_SOCIAL_OPTIONS = ["A", "B", "C", "D", "E"];
const REDES_SOCIAIS_OPTIONS = ["Instagram", "TikTok", "YouTube", "Facebook", "LinkedIn", "Twitter/X", "Pinterest"];
const MORA_COM_OPTIONS = ["Sozinho(a)", "Familia", "Conjuge", "Amigos", "Pais"];
const TOM_VOZ_OPTIONS = ["Formal", "Casual", "Tecnico", "Inspiracional", "Humoristico", "Empatico", "Direto"];

// ========================
// MAIN COMPONENT
// ========================

export default function EnhancedAIChat() {
  const { mentorado } = useMentoradoAuth();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contentMode, setContentMode] = useState("chat");
  const [showContentMenu, setShowContentMenu] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"perfil" | "persona" | "audiencia">("perfil");
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basico: true, comportamento: false, dores_frustracoes: false,
    desejos_sonhos: false, objecoes: false, expectativas: false, comunicacao: false,
  });

  // Profile state
  const [profile, setProfile] = useState<ProfileData>({ instagram: "", avatar_url: "" });
  const [editableName, setEditableName] = useState("");
  const [uploading, setUploading] = useState(false);

  // Persona state
  const [persona, setPersona] = useState<PersonaData>(EMPTY_PERSONA);

  // Dores & Desejos state
  const [dores, setDores] = useState<string[]>(Array(20).fill(""));
  const [desejos, setDesejos] = useState<string[]>(Array(20).fill(""));

  // Post editor state
  const [postEditorOpen, setPostEditorOpen] = useState(false);
  const [postEditorSlides, setPostEditorSlides] = useState<PostSlide[] | undefined>(undefined);

  // Chat image attachment
  const [chatImage, setChatImage] = useState<string | null>(null);
  const chatImageRef = useRef<HTMLInputElement>(null);

  // Image generation state
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templatePrompt, setTemplatePrompt] = useState<string | null>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  // Usage tracking
  const [aiUsage, setAiUsage] = useState<{ images_generated: number; chat_messages_sent: number; limits: { maxImages: number; maxChatMessages: number } } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Load data from Supabase ----
  useEffect(() => {
    if (!mentorado?.id) return;

    const load = async () => {
      // Load profile (dados_pessoais)
      const { data: mData } = await supabase
        .from("mentorados")
        .select("dados_pessoais")
        .eq("id", mentorado.id)
        .single();
      if (mData?.dados_pessoais) {
        const dp = mData.dados_pessoais as Record<string, string>;
        setProfile({ instagram: dp.instagram || "", avatar_url: dp.avatar_url || "" });
      }

      // Load persona
      const { data: pData } = await supabase
        .from("persona_form_responses")
        .select("*")
        .eq("mentorado_id", mentorado.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (pData) {
        const { id, mentorado_id, organization_id, created_at, updated_at, ...rest } = pData;
        setPersona((prev) => ({ ...prev, ...rest }));
      }

      // Load dores & desejos
      const { data: pdData } = await supabase
        .from("persona_pains_desires")
        .select("*")
        .eq("mentorado_id", mentorado.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (pdData) {
        const loadedDores = Array.from({ length: 20 }, (_, i) => pdData[`dor_${i + 1}`] || "");
        const loadedDesejos = Array.from({ length: 20 }, (_, i) => pdData[`desejo_${i + 1}`] || "");
        setDores(loadedDores);
        setDesejos(loadedDesejos);
      }

      // Load AI usage
      try {
        const usageRes = await fetch(`/api/chat-gemini?mentoradoId=${mentorado.id}`);
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          if (usageData.usage) setAiUsage(usageData.usage);
        }
      } catch {}

      // Load chat history
      try {
        const { data: chatData } = await supabase
          .from("ai_chat_history")
          .select("*")
          .eq("mentorado_id", mentorado.id)
          .order("created_at", { ascending: true })
          .limit(100);
        if (chatData && chatData.length > 0) {
          const loadedMessages: ChatMessage[] = chatData.map((m: any) => ({
            id: m.id.toString(),
            text: m.content,
            isUser: m.role === "user",
            timestamp: new Date(m.created_at),
            contentType: m.content_mode !== "chat" ? m.content_mode : undefined,
            imageUrl: m.has_image && m.image_thumb ? m.image_thumb : undefined,
          }));
          setMessages(loadedMessages);
        }
      } catch {}
    };

    load();
    setEditableName(mentorado.nome_completo || "");
  }, [mentorado?.id]);

  // Scroll & auto-resize
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`; }
  }, [message]);

  // ---- Save functions ----
  const saveProfile = useCallback(async () => {
    if (!mentorado?.id) return;
    setSaving(true);
    await supabase
      .from("mentorados")
      .update({
        nome_completo: editableName || mentorado.nome_completo,
        dados_pessoais: { instagram: profile.instagram, avatar_url: profile.avatar_url },
      })
      .eq("id", mentorado.id);
    setSaving(false);
  }, [mentorado?.id, profile, editableName]);

  const savePersona = useCallback(async () => {
    if (!mentorado?.id) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from("persona_form_responses")
      .select("id")
      .eq("mentorado_id", mentorado.id)
      .limit(1)
      .single();

    if (existing) {
      await supabase.from("persona_form_responses").update({ ...persona, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("persona_form_responses").insert({ ...persona, mentorado_id: mentorado.id });
    }
    setSaving(false);
  }, [mentorado?.id, persona]);

  const saveDoresDesejos = useCallback(async () => {
    if (!mentorado?.id) return;
    setSaving(true);
    const payload: Record<string, string> = {};
    dores.forEach((d, i) => { payload[`dor_${i + 1}`] = d; });
    desejos.forEach((d, i) => { payload[`desejo_${i + 1}`] = d; });

    const { data: existing } = await supabase
      .from("persona_pains_desires")
      .select("id")
      .eq("mentorado_id", mentorado.id)
      .limit(1)
      .single();

    if (existing) {
      await supabase.from("persona_pains_desires").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("persona_pains_desires").insert({ ...payload, mentorado_id: mentorado.id });
    }
    setSaving(false);
  }, [mentorado?.id, dores, desejos]);

  // ---- Photo upload (with compression) ----
  const compressAvatar = useCallback((file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 400;
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.8);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const uploadAvatar = useCallback(async (rawFile: File) => {
    if (!mentorado?.id) return;
    setUploading(true);
    try {
      const file = await ensureJpeg(rawFile);
      const compressed = await compressAvatar(file);
      const path = `${mentorado.id}/avatar.jpg`;

      await supabase.storage.from("avatars").upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl + "?t=" + Date.now();

      setProfile((prev) => ({ ...prev, avatar_url: url }));
      await supabase.from("mentorados").update({ dados_pessoais: { ...profile, avatar_url: url } }).eq("id", mentorado.id);
    } finally {
      setUploading(false);
    }
  }, [mentorado?.id, profile, compressAvatar]);

  // ---- Chat image compression ----
  const compressChatImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.onload = () => {
        const img = new window.Image();
        img.onerror = () => reject(new Error("Formato de imagem não suportado"));
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let w = img.width, h = img.height;
          const maxSize = 800;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleChatImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    e.target.value = "";
    const file = await ensureJpeg(rawFile);
    const compressed = await compressChatImage(file);
    setChatImage(compressed);
  }, [compressChatImage]);

  const fileToDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleRefImagesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    e.target.value = "";

    const results: string[] = [];
    for (const f of fileList.slice(0, 5)) {
      try {
        const converted = await ensureJpeg(f);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(converted);
        });
        results.push(dataUrl);
      } catch (err) {
        console.error("Erro ao processar imagem:", f.name, err);
      }
    }
    if (results.length > 0) {
      setReferenceImages((prev) => [...prev, ...results].slice(0, 5));
    }
  };

  const removeRefImage = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ---- Persona updaters ----
  const updatePersona = useCallback((field: keyof PersonaData, value: any) => {
    setPersona((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleArrayField = useCallback((field: keyof PersonaData, value: string) => {
    setPersona((prev) => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // ---- Chat ----
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text.replace(/\*\*(.*?)\*\*/g, "$1"));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const sendMessage = useCallback(async () => {
    const isContent = contentMode !== "chat" && contentMode !== "secretaria" && contentMode !== "imagem";
    const isSecretaria = contentMode === "secretaria";
    const isImageGen = contentMode === "imagem";

    // Para imagem: usa templatePrompt por trás + message extra do user
    const effectiveMsg = isImageGen
      ? [templatePrompt, message.trim()].filter(Boolean).join(". Instrução adicional: ") || ""
      : message;

    if ((!effectiveMsg.trim() && !chatImage && !(isImageGen && referenceImages.length > 0)) || isLoading) return;

    const attachedImage = chatImage;
    const templateLabel = isImageGen && selectedTemplate
      ? IMAGE_TEMPLATES.find(t => t.id === selectedTemplate)?.label || ""
      : "";

    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      text: isImageGen ? (message.trim() ? message : `Gerar: ${templateLabel}`) : effectiveMsg,
      isUser: true, timestamp: new Date(),
      contentType: contentMode !== "chat" ? contentMode : undefined,
      imageUrl: attachedImage || undefined,
    }]);
    setMessage("");
    setChatImage(null);
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const apiMsg = isImageGen
        ? (effectiveMsg.trim() || "Gere uma foto profissional de estúdio para marketing médico.")
        : isSecretaria
        ? (effectiveMsg.trim() || "Analise a imagem da conversa e sugira a melhor resposta.")
        : isContent
          ? `Gere um post para Instagram do tipo ${contentMode}. Contexto: ${effectiveMsg}`
          : effectiveMsg;
      const filledDores = dores.filter(Boolean);
      const filledDesejos = desejos.filter(Boolean);

      const res = await fetch("/api/chat-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: apiMsg,
          userEmail: mentorado?.email,
          mentoradoId: mentorado?.id,
          imageBase64: attachedImage || undefined,
          generateImage: isImageGen || undefined,
          referenceImages: isImageGen && referenceImages.length > 0 ? referenceImages : undefined,
          context: {
            nome: mentorado?.nome_completo,
            especialidade: mentorado?.especialidade,
            persona: persona.resumo_persona,
            publicoAlvo: persona.profissao ? `${persona.nome_ficticio}, ${persona.idade} anos, ${persona.profissao}` : undefined,
            doresDesejos: [...filledDores, ...filledDesejos],
            tipoPost: isSecretaria ? "secretaria" : isContent ? contentMode : undefined,
            tomComunicacao: persona.tom_voz_preferido?.join(", "),
            problemasAudiencia: persona.principais_problemas,
            desejoAudiencia: persona.desejo_6_meses,
            transformacao: persona.transformacao_buscada,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("[chat] API error:", res.status, errData);
        throw new Error(errData.error || "Erro na API");
      }
      const data = await res.json();

      // Update usage from API response
      if (data.usage) setAiUsage(data.usage);

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), text: data.message, isUser: false,
        timestamp: new Date(), contentType: contentMode !== "chat" ? contentMode : undefined,
        imageUrl: data.generatedImage || undefined,
      }]);

      // Save messages to DB (fire & forget)
      if (mentorado?.id) {
        const userText = isImageGen ? (message.trim() ? message : `Gerar: ${templateLabel}`) : effectiveMsg;
        supabase.from("ai_chat_history").insert([
          { mentorado_id: mentorado.id, role: "user", content: (userText || "").substring(0, 2000), content_mode: contentMode, has_image: !!attachedImage },
          { mentorado_id: mentorado.id, role: "assistant", content: (data.message || "").substring(0, 2000), content_mode: contentMode, has_image: !!data.generatedImage },
        ]).then(() => {});
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "Desculpe, ocorreu um erro. Tente novamente.",
        isUser: false, timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [message, isLoading, contentMode, persona, dores, desejos, mentorado, chatImage, referenceImages, templatePrompt, selectedTemplate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  // Parse AI response into slides
  const parseAISlides = useCallback((text: string): PostSlide[] => {
    // Try structured format: [SLIDE] TITULO: ... TEXTO: ... [/SLIDE]
    const slideRegex = /\[SLIDE\]\s*TITULO:\s*(.*?)\s*TEXTO:\s*([\s\S]*?)\s*\[\/SLIDE\]/gi;
    const slides: PostSlide[] = [];
    let match;
    while ((match = slideRegex.exec(text)) !== null) {
      slides.push({ title: match[1].trim(), body: match[2].trim() });
    }
    if (slides.length > 0) return slides;

    // Try "Slide N" format
    const slideNumRegex = /(?:Slide|Cartao|Card)\s*(\d+)[:\s]*\n+(?:(?:T[ií]tulo|Chamada|Capa)[:\s]*(.+?)\n+)?(?:(?:Texto|Descri[cç][aã]o|Conte[uú]do|Corpo)[:\s]*)?([\s\S]*?)(?=(?:Slide|Cartao|Card)\s*\d|$)/gi; // eslint-disable-line
    while ((match = slideNumRegex.exec(text)) !== null) {
      const title = (match[2] || '').trim();
      const body = (match[3] || '').trim();
      if (body) slides.push({ title, body });
    }
    if (slides.length > 0) return slides;

    // Fallback: clean text and make single slide
    let clean = text;
    clean = clean.replace(/\*\*(.*?)\*\*/g, "$1");
    clean = clean.replace(/\n*Hashtags?[\s\S]*$/gi, "").trim();
    clean = clean.replace(/^.*?[Tt][ií]tulo.*?:.*?\n+/gm, "").trim();
    clean = clean.replace(/^Texto:\s*\n*/gm, "").trim();
    clean = clean.replace(/^(Claro!?|Com certeza!?|Aqui est[aá]!?|Vamos l[aá]!?).*?\n+/gi, "").trim();
    return [{ title: '', body: clean }];
  }, []);

  // Open post editor with AI-generated text
  const openPostEditor = useCallback((text: string) => {
    const slides = parseAISlides(text);
    setPostEditorSlides(slides);
    setPostEditorOpen(true);
  }, [parseAISlides]);

  // Open post editor manually (no AI)
  const openPostEditorManual = useCallback(() => {
    setPostEditorSlides(undefined);
    setPostEditorOpen(true);
  }, []);

  // === AUTH CHECK (after all hooks) ===
  if (!mentorado || mentorado.email !== "emersonbljr2802@gmail.com") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0c]">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-red-500/20">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Acesso Restrito</h1>
          <p className="text-[#6a6a6f]">Esta funcionalidade esta disponivel apenas para usuarios autorizados.</p>
        </div>
      </div>
    );
  }

  const currentMode = CONTENT_MODES.find((m) => m.id === contentMode) || CONTENT_MODES[0];
  const avatarUrl = profile.avatar_url;

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-white overflow-hidden relative">
      {/* ======================== SIDEBAR ======================== */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={cn(
        "bg-[#111114] border-r border-white/[0.06] flex flex-col transition-all duration-300 overflow-hidden flex-shrink-0",
        // Mobile: fixed overlay drawer
        "fixed md:relative z-40 md:z-auto h-full",
        sidebarOpen ? "w-[300px] md:w-[340px]" : "w-0"
      )}>
        <div className="min-w-[300px] md:min-w-[340px] flex flex-col h-full">
          {/* Header with avatar */}
          <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
            <div
              className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
              {uploading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadAvatar(e.target.files[0]); e.target.value = ""; }} />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm text-white truncate">{mentorado.nome_completo}</h2>
              <p className="text-[11px] text-[#5a5a5f] truncate">{profile.instagram || mentorado.especialidade || "Configure seu perfil"}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            {([
              { key: "perfil" as const, label: "Perfil", icon: User },
              { key: "persona" as const, label: "Persona", icon: Users },
              { key: "audiencia" as const, label: "Dores", icon: Heart },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 py-2.5 text-[11px] font-medium transition-colors relative flex items-center justify-center gap-1.5",
                  activeTab === tab.key ? "text-blue-400" : "text-[#5a5a5f] hover:text-white"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {activeTab === tab.key && <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-blue-400 rounded-full" />}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* ======== PERFIL TAB ======== */}
            {activeTab === "perfil" && (
              <div className="p-3 space-y-3">
                <SidebarField label="Instagram @" value={profile.instagram} onChange={(v) => setProfile((p) => ({ ...p, instagram: v }))} placeholder="@drjoaosilva" />
                <SidebarField label="Nome Completo" value={editableName} onChange={(v) => setEditableName(v)} placeholder="Seu nome completo" />
                <SidebarField label="Email" value={mentorado.email} onChange={() => {}} placeholder="" disabled />
                <SidebarField label="Especialidade" value={mentorado.especialidade || ""} onChange={() => {}} placeholder="" disabled />
                <SaveButton onClick={saveProfile} saving={saving} />
              </div>
            )}

            {/* ======== PERSONA TAB ======== */}
            {activeTab === "persona" && (
              <div className="p-3 space-y-2">
                {/* Dados Basicos */}
                <CollapsibleSection title="Dados Basicos" icon={<User className="w-4 h-4" />} expanded={expandedSections.basico} onToggle={() => toggleSection("basico")}>
                  <SidebarField label="Nome Ficticio da Persona" value={persona.nome_ficticio} onChange={(v) => updatePersona("nome_ficticio", v)} placeholder="Ex: Maria, a Paciente Ideal" />
                  <SidebarField label="Idade" value={persona.idade?.toString() || ""} onChange={(v) => updatePersona("idade", v ? parseInt(v) : null)} placeholder="35" type="number" />
                  <ChipSelector label="Genero" options={GENERO_OPTIONS} selected={persona.genero} onToggle={(v) => toggleArrayField("genero", v)} />
                  <ChipSelector label="Estado Civil" options={ESTADO_CIVIL_OPTIONS} selected={persona.estado_civil} onToggle={(v) => toggleArrayField("estado_civil", v)} />
                  <SidebarField label="Profissao" value={persona.profissao} onChange={(v) => updatePersona("profissao", v)} placeholder="Empresaria, Advogada..." />
                  <ChipSelector label="Escolaridade" options={ESCOLARIDADE_OPTIONS} selected={persona.nivel_escolaridade} onToggle={(v) => toggleArrayField("nivel_escolaridade", v)} />
                  <SidebarField label="Cidade / Estado" value={persona.cidade_estado} onChange={(v) => updatePersona("cidade_estado", v)} placeholder="Sao Paulo / SP" />
                  <ChipSelector label="Classe Social" options={CLASSE_SOCIAL_OPTIONS} selected={persona.classe_social} onToggle={(v) => toggleArrayField("classe_social", v)} />
                </CollapsibleSection>

                {/* Comportamento */}
                <CollapsibleSection title="Comportamento" icon={<Brain className="w-4 h-4" />} expanded={expandedSections.comportamento} onToggle={() => toggleSection("comportamento")}>
                  <SidebarField label="Rotina Diaria" value={persona.rotina_diaria} onChange={(v) => updatePersona("rotina_diaria", v)} placeholder="Como e o dia a dia dessa pessoa?" multiline />
                  <ChipSelector label="Redes Sociais que Usa" options={REDES_SOCIAIS_OPTIONS} selected={persona.redes_sociais_usa} onToggle={(v) => toggleArrayField("redes_sociais_usa", v)} />
                  <SidebarField label="Marcas que Admira" value={persona.marcas_admira} onChange={(v) => updatePersona("marcas_admira", v)} placeholder="Apple, Nike..." multiline />
                  <SidebarField label="Conteudo que Consome" value={persona.conteudo_consome} onChange={(v) => updatePersona("conteudo_consome", v)} placeholder="Que tipo de conteudo essa pessoa consome?" multiline />
                  <ChipSelector label="Mora Com" options={MORA_COM_OPTIONS} selected={persona.mora_com} onToggle={(v) => toggleArrayField("mora_com", v)} />
                  <SidebarField label="Filhos / Animais" value={persona.tem_filhos_animais} onChange={(v) => updatePersona("tem_filhos_animais", v)} placeholder="2 filhos, 1 cachorro..." />
                </CollapsibleSection>

                {/* Dores & Frustracoes */}
                <CollapsibleSection title="Dores & Frustracoes" icon={<Heart className="w-4 h-4" />} expanded={expandedSections.dores_frustracoes} onToggle={() => toggleSection("dores_frustracoes")}>
                  <SidebarField label="Principais Problemas" value={persona.principais_problemas} onChange={(v) => updatePersona("principais_problemas", v)} placeholder="O que mais incomoda essa pessoa?" multiline rows={3} />
                  <SidebarField label="O que ja Tentou pra Resolver?" value={persona.tentativas_resolucao} onChange={(v) => updatePersona("tentativas_resolucao", v)} placeholder="Tratamentos, produtos, servicos..." multiline />
                  <SidebarField label="Por que Nao Resolveu?" value={persona.por_que_nao_resolveu} onChange={(v) => updatePersona("por_que_nao_resolveu", v)} placeholder="O que impediu?" multiline />
                  <SidebarField label="Como se Sente no Dia a Dia?" value={persona.sentimento_diario} onChange={(v) => updatePersona("sentimento_diario", v)} placeholder="Frustrada, ansiosa, insegura..." multiline />
                </CollapsibleSection>

                {/* Desejos & Sonhos */}
                <CollapsibleSection title="Desejos & Sonhos" icon={<Sparkles className="w-4 h-4" />} expanded={expandedSections.desejos_sonhos} onToggle={() => toggleSection("desejos_sonhos")}>
                  <SidebarField label="O que Deseja em 6 Meses?" value={persona.desejo_6_meses} onChange={(v) => updatePersona("desejo_6_meses", v)} placeholder="Resultado concreto que busca..." multiline />
                  <SidebarField label="Sonhos de Longo Prazo" value={persona.sonhos_longo_prazo} onChange={(v) => updatePersona("sonhos_longo_prazo", v)} placeholder="Onde quer estar em 5 anos?" multiline />
                  <SidebarField label="O que Significa Realizacao Pessoal?" value={persona.realizacao_pessoal} onChange={(v) => updatePersona("realizacao_pessoal", v)} placeholder="" multiline />
                  <SidebarField label="Como Seria a Vida Ideal?" value={persona.vida_ideal} onChange={(v) => updatePersona("vida_ideal", v)} placeholder="" multiline />
                </CollapsibleSection>

                {/* Objecoes & Medos */}
                <CollapsibleSection title="Objecoes & Medos" icon={<ShieldQuestion className="w-4 h-4" />} expanded={expandedSections.objecoes} onToggle={() => toggleSection("objecoes")}>
                  <SidebarField label="Objecoes de Compra" value={persona.objecoes_compra} onChange={(v) => updatePersona("objecoes_compra", v)} placeholder="Preco alto, nao confia, ja tentou antes..." multiline />
                  <SidebarField label="Medos sobre o Tratamento" value={persona.medos_tratamento} onChange={(v) => updatePersona("medos_tratamento", v)} placeholder="Dor, resultado ruim, exposicao..." multiline />
                  <SidebarField label="Experiencias Ruins Anteriores" value={persona.experiencias_ruins} onChange={(v) => updatePersona("experiencias_ruins", v)} placeholder="" multiline />
                  <SidebarField label="Acredita na Solucao?" value={persona.acredita_solucao} onChange={(v) => updatePersona("acredita_solucao", v)} placeholder="Sim, mas com ressalvas..." multiline />
                </CollapsibleSection>

                {/* Expectativas */}
                <CollapsibleSection title="Expectativas" icon={<Target className="w-4 h-4" />} expanded={expandedSections.expectativas} onToggle={() => toggleSection("expectativas")}>
                  <SidebarField label="Expectativas do Servico" value={persona.expectativas_servico} onChange={(v) => updatePersona("expectativas_servico", v)} placeholder="O que espera de voce?" multiline />
                  <SidebarField label="Transformacao Buscada" value={persona.transformacao_buscada} onChange={(v) => updatePersona("transformacao_buscada", v)} placeholder="Qual a transformacao que essa pessoa quer?" multiline />
                  <SidebarField label="Como se Ve em 3 Meses?" value={persona.como_se_ver_3_meses} onChange={(v) => updatePersona("como_se_ver_3_meses", v)} placeholder="" multiline />
                </CollapsibleSection>

                {/* Comunicacao */}
                <CollapsibleSection title="Comunicacao & Social" icon={<MessageCircle className="w-4 h-4" />} expanded={expandedSections.comunicacao} onToggle={() => toggleSection("comunicacao")}>
                  <ChipSelector label="Tom de Voz Preferido" options={TOM_VOZ_OPTIONS} selected={persona.tom_voz_preferido} onToggle={(v) => toggleArrayField("tom_voz_preferido", v)} />
                  <SidebarField label="Frases Tipicas que Fala" value={persona.frases_tipicas} onChange={(v) => updatePersona("frases_tipicas", v)} placeholder="'Nao tenho tempo', 'E muito caro'..." multiline />
                  <SidebarField label="Lugares que Frequenta" value={persona.lugares_frequenta} onChange={(v) => updatePersona("lugares_frequenta", v)} placeholder="Shopping, academia, salao..." multiline />
                  <SidebarField label="Eventos / Comunidades" value={persona.eventos_comunidades} onChange={(v) => updatePersona("eventos_comunidades", v)} placeholder="" multiline />
                  <SidebarField label="Influenciadores que Segue" value={persona.influenciadores_segue} onChange={(v) => updatePersona("influenciadores_segue", v)} placeholder="" multiline />
                </CollapsibleSection>

                {/* Resumo */}
                <div className="rounded-xl bg-[#151518] ring-1 ring-white/[0.04] p-3">
                  <SidebarField label="Resumo da Persona (IA usa isso como base)" value={persona.resumo_persona} onChange={(v) => updatePersona("resumo_persona", v)} placeholder="Descreva em poucas linhas quem e sua persona ideal..." multiline rows={4} />
                </div>

                <SaveButton onClick={savePersona} saving={saving} />
              </div>
            )}

            {/* ======== DORES & DESEJOS TAB ======== */}
            {activeTab === "audiencia" && (
              <div className="p-3 space-y-5">
                {/* Dores */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-400" /> Dores da Audiencia
                    </h3>
                    <span className="text-[11px] text-[#5a5a5f] font-mono">{dores.filter(Boolean).length}/20</span>
                  </div>
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                    {dores.map((dor, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-red-400/50 font-mono w-5 flex-shrink-0">{i + 1}.</span>
                        <input
                          value={dor}
                          onChange={(e) => setDores((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                          placeholder={`Dor ${i + 1}...`}
                          className="flex-1 px-2.5 py-1.5 bg-[#1a1a1e] border border-white/[0.04] rounded-lg text-[12px] text-white placeholder-[#2a2a2f] focus:outline-none focus:border-red-500/30 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/[0.06]" />

                {/* Desejos */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" /> Desejos da Audiencia
                    </h3>
                    <span className="text-[11px] text-[#5a5a5f] font-mono">{desejos.filter(Boolean).length}/20</span>
                  </div>
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                    {desejos.map((desejo, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-400/50 font-mono w-5 flex-shrink-0">{i + 1}.</span>
                        <input
                          value={desejo}
                          onChange={(e) => setDesejos((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                          placeholder={`Desejo ${i + 1}...`}
                          className="flex-1 px-2.5 py-1.5 bg-[#1a1a1e] border border-white/[0.04] rounded-lg text-[12px] text-white placeholder-[#2a2a2f] focus:outline-none focus:border-emerald-500/30 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <SaveButton onClick={saveDoresDesejos} saving={saving} />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ======================== MAIN CHAT ======================== */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/[0.06] flex items-center px-3 md:px-4 gap-2 md:gap-3 bg-[#0a0a0c]/80 backdrop-blur-xl flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all">
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight truncate">Medicos de Resultado</span>
          </div>
          <button onClick={openPostEditorManual}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-all ring-1 ring-emerald-500/20 flex-shrink-0">
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Criar Post</span>
          </button>
        </header>

        {/* Usage bar */}
        {aiUsage && (
          <div className="border-b border-white/[0.06] bg-[#0d0d10] px-3 md:px-4 py-2 flex-shrink-0">
            <div className="max-w-3xl mx-auto flex items-center gap-3 md:gap-5 text-[11px]">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ImageIcon className="w-3 h-3 text-purple-400 flex-shrink-0" />
                <div className="flex-1 h-1.5 bg-[#1a1a1e] rounded-full overflow-hidden max-w-[100px]">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min((aiUsage.images_generated / aiUsage.limits.maxImages) * 100, 100)}%`,
                    background: aiUsage.images_generated >= aiUsage.limits.maxImages ? '#ef4444' : 'linear-gradient(to right, #a855f7, #ec4899)',
                  }} />
                </div>
                <span className="text-white font-mono whitespace-nowrap">{Math.max(aiUsage.limits.maxImages - aiUsage.images_generated, 0)} img</span>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MessageSquare className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <div className="flex-1 h-1.5 bg-[#1a1a1e] rounded-full overflow-hidden max-w-[100px]">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min((aiUsage.chat_messages_sent / aiUsage.limits.maxChatMessages) * 100, 100)}%`,
                    background: aiUsage.chat_messages_sent >= aiUsage.limits.maxChatMessages ? '#ef4444' : 'linear-gradient(to right, #3b82f6, #22d3ee)',
                  }} />
                </div>
                <span className="text-white font-mono whitespace-nowrap">{Math.max(aiUsage.limits.maxChatMessages - aiUsage.chat_messages_sent, 0)} msg</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {contentMode === "imagem" ? (
            /* ===== IMAGE MODE: config panel + chat messages below ===== */
            <div className="h-full overflow-y-auto">
              {/* Config panel — collapsible */}
              <div className="border-b border-white/[0.06] bg-[#0d0d10]">
                <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                  {/* Reference Photos */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        Fotos de Referencia ({referenceImages.length}/5)
                      </h3>
                      {referenceImages.length > 0 && (
                        <button onClick={() => setReferenceImages([])} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">
                          Limpar
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {referenceImages.map((img, i) => (
                        <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden ring-1 ring-white/10 group flex-shrink-0">
                          <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const placeholder = document.createElement('div');
                            placeholder.className = 'w-full h-full flex flex-col items-center justify-center bg-[#1a1a2e] text-purple-300';
                            placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                            target.parentElement?.appendChild(placeholder);
                          }} />
                          <button onClick={() => removeRefImage(i)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ))}
                      {referenceImages.length < 5 && (
                        <button onClick={() => refImageInputRef.current?.click()}
                          className="w-12 h-12 rounded-lg border-2 border-dashed border-white/10 hover:border-purple-400/40 flex items-center justify-center text-[#5a5a5f] hover:text-purple-300 transition-all cursor-pointer flex-shrink-0">
                          <Camera className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <input ref={refImageInputRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={handleRefImagesSelect} />
                  </div>

                  {/* Style Templates — horizontal scroll */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Estilo
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {IMAGE_TEMPLATES.map((tmpl) => (
                        <button key={tmpl.id}
                          onClick={() => {
                            if (selectedTemplate === tmpl.id) {
                              setSelectedTemplate(null);
                              setTemplatePrompt(null);
                            } else {
                              setSelectedTemplate(tmpl.id);
                              setTemplatePrompt(tmpl.prompt);
                            }
                          }}
                          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
                            selectedTemplate === tmpl.id
                              ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-400/30"
                              : "bg-[#18181c] text-[#8a8a8f] hover:text-white ring-1 ring-white/[0.06] hover:ring-white/10"
                          )}>
                          <span>{tmpl.icon}</span>
                          <span>{tmpl.label}</span>
                          {selectedTemplate === tmpl.id && <Check className="w-3 h-3 text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              {messages.length > 0 ? (
                <div className="max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-3", msg.isUser && "flex-row-reverse")}>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden",
                        msg.isUser ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20" : "bg-[#18181c] ring-1 ring-white/[0.06]"
                      )}>
                        {msg.isUser ? (
                          avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-white" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      <div className={cn("max-w-[80%] rounded-2xl px-4 py-3",
                        msg.isUser ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10" : "bg-[#18181c] ring-1 ring-white/[0.06] text-gray-200"
                      )}>
                        {msg.imageUrl && (
                          <div className="mb-2">
                            <img src={msg.imageUrl} alt="" className={cn("rounded-lg object-cover", msg.isUser ? "max-w-[240px] max-h-[240px]" : "max-w-[400px] max-h-[400px]")} />
                            {!msg.isUser && msg.imageUrl && (
                              <a href={msg.imageUrl} download={`imagem-gerada-${msg.id}.png`}
                                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 text-xs font-medium hover:bg-blue-500/25 transition-colors ring-1 ring-blue-500/20">
                                <Download className="w-3.5 h-3.5" /> Baixar imagem
                              </a>
                            )}
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#18181c] ring-1 ring-white/[0.06] flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                      </div>
                      <div className="bg-[#18181c] ring-1 ring-white/[0.06] rounded-2xl px-5 py-4">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#3a3a3f] animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 rounded-full bg-[#3a3a3f] animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 rounded-full bg-[#3a3a3f] animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-12">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 blur-[80px] bg-gradient-to-r from-purple-500/20 via-pink-400/15 to-blue-500/20 rounded-full scale-[2.5]" />
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-2xl shadow-purple-500/25 ring-1 ring-white/10">
                      <ImageIcon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <p className="text-[#5a5a5f] text-sm text-center">Selecione um estilo e envie para gerar sua imagem</p>
                </div>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="relative mb-8">
                <div className="absolute inset-0 blur-[100px] bg-gradient-to-r from-blue-500/20 via-cyan-400/15 to-blue-600/20 rounded-full scale-[2.5]" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-blue-500/25 ring-1 ring-white/10">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center tracking-tight">
                Como posso ajudar <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">hoje</span>?
              </h1>
              <p className="text-[#5a5a5f] text-base mb-10 text-center max-w-md">
                Converse, crie conteudo ou peca estrategias personalizadas para seu perfil medico.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {[
                  { icon: Heart, text: "Gerar post motivacional", mode: "motivacional" },
                  { icon: BookOpen, text: "Criar conteudo educativo", mode: "educativo" },
                  { icon: Phone, text: "Secretaria de pacientes", mode: "secretaria" },
                  { icon: ImageIcon, text: "Gerar imagem com IA", mode: "imagem" },
                ].map((action, i) => (
                  <button key={i} onClick={() => { setContentMode(action.mode); textareaRef.current?.focus(); }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-[#111114]/80 hover:bg-[#18181c] text-[#7a7a7f] hover:text-white transition-all text-sm text-left group">
                    <action.icon className="w-4 h-4 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                    <span>{action.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3", msg.isUser && "flex-row-reverse")}>
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden",
                    msg.isUser ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20" : "bg-[#18181c] ring-1 ring-white/[0.06]"
                  )}>
                    {msg.isUser ? (
                      avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <div className={cn("max-w-[80%] rounded-2xl px-4 py-3",
                    msg.isUser ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10" : "bg-[#18181c] ring-1 ring-white/[0.06] text-gray-200"
                  )}>
                    {msg.contentType && !msg.isUser && (
                      <div className="mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-medium ring-1 ring-blue-500/20">
                          {CONTENT_MODES.find((m) => m.id === msg.contentType)?.label}
                        </span>
                      </div>
                    )}
                    {msg.imageUrl && (
                      <div className="relative group/img mb-2 inline-block">
                        <img src={msg.imageUrl} alt="" className={cn("rounded-lg object-cover", msg.isUser ? "max-w-[240px] max-h-[240px]" : "max-w-[400px] max-h-[400px]")} />
                        {!msg.isUser && (
                          <a href={msg.imageUrl} download={`imagem-${msg.id}.png`}
                            className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80">
                            <Download className="w-4 h-4 text-white" />
                          </a>
                        )}
                      </div>
                    )}
                    {msg.text && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                      />
                    )}
                    {!msg.isUser && (
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/[0.04]">
                        <button onClick={() => copyToClipboard(msg.text, msg.id)} className="flex items-center gap-1.5 text-[11px] text-[#5a5a5f] hover:text-white transition-colors">
                          {copied === msg.id ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copiado</span></> : <><Copy className="w-3 h-3" />Copiar</>}
                        </button>
                        {msg.contentType && msg.contentType !== "chat" && (
                          <button onClick={() => openPostEditor(msg.text)} className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors ml-2">
                            <Eye className="w-3 h-3" />
                            Gerar Post Visual
                          </button>
                        )}
                      </div>
                    )}
                    <p className={cn("text-[10px] mt-2", msg.isUser ? "text-blue-200/50" : "text-[#3a3a3f]")}>
                      {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#18181c] ring-1 ring-white/[0.06] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                  </div>
                  <div className="bg-[#18181c] ring-1 ring-white/[0.06] rounded-2xl px-5 py-4">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-[#3a3a3f] rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-[#3a3a3f] rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <div className="w-2 h-2 bg-[#3a3a3f] rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 md:p-4 pb-4 md:pb-6">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
              <div className="relative rounded-2xl bg-[#151518] ring-1 ring-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_4px_30px_rgba(0,0,0,0.5)]">
                {/* Chat image preview */}
                {chatImage && (
                  <div className="px-4 pt-3 pb-1">
                    <div className="relative inline-block">
                      <img src={chatImage} alt="" className="h-20 rounded-lg object-cover ring-1 ring-white/10" />
                      <button onClick={() => setChatImage(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-400 transition-colors">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                )}
                <textarea ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={contentMode === "imagem" ? "Descreva a imagem que deseja gerar..." : contentMode === "secretaria" ? "Cole o print ou descreva a conversa do paciente..." : contentMode !== "chat" ? `Descreva o contexto para ${currentMode.label.toLowerCase()}...` : "Pergunte qualquer coisa..."}
                  className="w-full resize-none bg-transparent text-[14px] md:text-[15px] text-white placeholder-[#3a3a3f] px-4 md:px-5 pt-4 md:pt-5 pb-2 md:pb-3 focus:outline-none min-h-[60px] md:min-h-[80px] max-h-[200px]"
                  style={{ height: "60px" }} />
                {/* Hidden file input for chat images */}
                <input ref={chatImageRef} type="file" accept="image/*" className="hidden" onChange={handleChatImageSelect} />
                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <button onClick={() => setShowContentMenu(!showContentMenu)}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95",
                          contentMode !== "chat" ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20 hover:bg-blue-500/25" : "text-[#5a5a5f] hover:text-white hover:bg-white/5"
                        )}>
                        <Lightbulb className="w-4 h-4" />
                        <span className="hidden sm:inline">{contentMode !== "chat" ? currentMode.label : "Criador de Conteudo"}</span>
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showContentMenu && "rotate-180")} />
                      </button>
                      {showContentMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowContentMenu(false)} />
                          <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[240px] bg-[#151518]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
                            <div className="p-1.5">
                              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a4f]">Tipo de Conteudo</div>
                              {CONTENT_MODES.map((mode) => {
                                const Icon = mode.icon;
                                return (
                                  <button key={mode.id} onClick={() => { setContentMode(mode.id); setShowContentMenu(false); }}
                                    className={cn("w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all duration-150",
                                      contentMode === mode.id ? "bg-white/10 text-white" : "text-[#8a8a8f] hover:bg-white/5 hover:text-white"
                                    )}>
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium block">{mode.label}</span>
                                      <span className="text-[11px] text-[#5a5a5f]">{mode.description}</span>
                                    </div>
                                    {contentMode === mode.id && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={() => chatImageRef.current?.click()}
                    className="p-2 rounded-full text-[#5a5a5f] hover:text-white hover:bg-white/5 transition-all" title="Anexar imagem">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button onClick={sendMessage} disabled={(!message.trim() && !chatImage && !(contentMode === "imagem" && (referenceImages.length > 0 || templatePrompt))) || isLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_20px_rgba(20,136,252,0.25)]">
                    <span className="hidden sm:inline">Enviar</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-center text-[11px] text-[#3a3a3f] mt-3">Medicos de Resultado pode cometer erros. Verifique informacoes importantes.</p>
          </div>
        </div>
      </main>

      {/* ======================== POST EDITOR ======================== */}
      <PostEditor
        open={postEditorOpen}
        onClose={() => setPostEditorOpen(false)}
        initialSlides={postEditorSlides}
        profileName={editableName || mentorado.nome_completo}
        profileHandle={profile.instagram || `@${(editableName || mentorado.nome_completo).toLowerCase().replace(/\s+/g, ".")}`}
        avatarUrl={profile.avatar_url || undefined}
      />
    </div>
  );
}

// ========================
// HELPER COMPONENTS
// ========================

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 mt-3"
    >
      <Save className="w-4 h-4" />
      {saving ? "Salvando..." : "Salvar"}
    </button>
  );
}

function CollapsibleSection({ title, icon, expanded, onToggle, children }: {
  title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[#151518] ring-1 ring-white/[0.04] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-white hover:bg-white/[0.03] transition-colors">
        <span className="text-[#5a5a5f]">{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        <ChevronRight className={cn("w-4 h-4 text-[#4a4a4f] transition-transform duration-200", expanded && "rotate-90")} />
      </button>
      {expanded && <div className="px-3 pb-3 space-y-1 border-t border-white/[0.04]">{children}</div>}
    </div>
  );
}

function SidebarField({ label, value, onChange, placeholder, type = "text", multiline = false, rows = 2, disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; multiline?: boolean; rows?: number; disabled?: boolean;
}) {
  const cls = cn(
    "w-full px-3 py-2 bg-[#0f0f11] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder-[#2a2a2f] focus:outline-none focus:border-blue-500/40 transition-colors",
    disabled && "opacity-50 cursor-not-allowed"
  );
  return (
    <div className="pt-2">
      <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-1 uppercase tracking-wider">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled} className={cn(cls, "resize-none")} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className={cls} />
      )}
    </div>
  );
}

function ChipSelector({ label, options, selected, onToggle }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div className="pt-2">
      <label className="block text-[10px] font-semibold text-[#5a5a5f] mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
              selected.includes(opt)
                ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
                : "bg-[#1a1a1e] text-[#5a5a5f] hover:text-white ring-1 ring-white/[0.04]"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
