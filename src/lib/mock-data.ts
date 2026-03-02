// ============================================================
// MOCK DATA - TEMPORÁRIO (Supabase em manutenção)
// Remover este arquivo quando o Supabase voltar
// ============================================================

export const MOCK_MODE = true // <-- Mudar para false quando Supabase voltar
export const MOCK_PASSWORD = 'medicosderesultado'

export interface MockModule {
  id: string
  title: string
  description: string
  order_index: number
  cover_image_url: string
  is_active: boolean
  featured?: boolean
  lessons: MockLesson[]
}

export interface MockLesson {
  id: string
  module_id: string
  title: string
  description: string
  panda_video_embed_url: string
  duration_minutes: number
  order_index: number
  is_active: boolean
}

export const MOCK_MODULES: MockModule[] = [
  {
    id: 'mod-pocket',
    title: 'Médicos de Resultado - Pocket',
    description: 'Protocolos práticos de obesidade, medicina funcional, hormônios, lipedema e mais.',
    order_index: 1,
    cover_image_url: 'https://medicosderesultado.com/wp-content/uploads/2024/10/modulo-2-1.png',
    is_active: true,
    featured: true,
    lessons: [
      { id: 'p1', module_id: 'mod-pocket', title: 'Obesidade na Prática', description: '', panda_video_embed_url: '9ce7fb86-d03f-4b64-acdb-77167f047f84', duration_minutes: 45, order_index: 1, is_active: true },
      { id: 'p2', module_id: 'mod-pocket', title: 'Protocolos Medicina Funcional Integrativa', description: '', panda_video_embed_url: 'ff1462ad-f2ee-4e33-89c5-504db4d01ae2', duration_minutes: 50, order_index: 2, is_active: true },
      { id: 'p3', module_id: 'mod-pocket', title: 'Reposição hormonal', description: '', panda_video_embed_url: '538e8373-6ba1-4978-8694-8d87194bb49a', duration_minutes: 40, order_index: 3, is_active: true },
      { id: 'p4', module_id: 'mod-pocket', title: 'Protocolos injetáveis IM', description: '', panda_video_embed_url: '21a75298-9726-4896-8145-00d50986d650', duration_minutes: 35, order_index: 4, is_active: true },
      { id: 'p5', module_id: 'mod-pocket', title: 'Protocolos injetáveis IV', description: '', panda_video_embed_url: '8ea5a13f-6adc-4b15-aa6c-1a238962db89', duration_minutes: 35, order_index: 5, is_active: true },
      { id: 'p6', module_id: 'mod-pocket', title: 'Protocolo Lipedema', description: '', panda_video_embed_url: '48e44a9b-680f-4960-96e4-4647988d4e02', duration_minutes: 30, order_index: 6, is_active: true },
      { id: 'p7', module_id: 'mod-pocket', title: 'Fenótipos da Obesidade', description: '', panda_video_embed_url: 'cc9680aa-e433-4689-900c-e5336920e3b8', duration_minutes: 40, order_index: 7, is_active: true },
      { id: 'p8', module_id: 'mod-pocket', title: 'Funcional integrativa na prática', description: '', panda_video_embed_url: '8b9a674c-c7b5-4d0a-a4ee-9ef23d9f36e2', duration_minutes: 45, order_index: 8, is_active: true },
      { id: 'p9', module_id: 'mod-pocket', title: 'Hormônios na Prática', description: '', panda_video_embed_url: '15fbe342-a9d1-47ee-b295-026ab6a09b7f', duration_minutes: 40, order_index: 9, is_active: true },
      { id: 'p10', module_id: 'mod-pocket', title: 'Implante hormonal - Procedimento prático', description: '', panda_video_embed_url: 'a843181e-a387-4276-8b88-3cc5ce61a86b', duration_minutes: 30, order_index: 10, is_active: true },
      { id: 'p11', module_id: 'mod-pocket', title: 'Lipedema na prática', description: '', panda_video_embed_url: '31a04972-60bd-4f26-8ecf-9a61a94a78d4', duration_minutes: 35, order_index: 11, is_active: true },
      { id: 'p12', module_id: 'mod-pocket', title: 'Intramusculares', description: '', panda_video_embed_url: '58092b76-e08d-48a4-9c96-460960c7c833', duration_minutes: 25, order_index: 12, is_active: true },
      { id: 'p13', module_id: 'mod-pocket', title: 'Protocolos Injetáveis Extra - Gordura localizada', description: '', panda_video_embed_url: '61bd94a8-4ef0-4a7d-8c47-1f57ef71dd20', duration_minutes: 30, order_index: 13, is_active: true },
      { id: 'p14', module_id: 'mod-pocket', title: 'Otimizando o seu tempo com IA', description: '', panda_video_embed_url: '623da9a5-2350-44b6-9926-c29761599838', duration_minutes: 25, order_index: 14, is_active: true },
      { id: 'p15', module_id: 'mod-pocket', title: 'Medicina de precisão', description: '', panda_video_embed_url: '3831777b-2f69-4c82-92a9-2b1f935724f1', duration_minutes: 40, order_index: 15, is_active: true },
      { id: 'p16', module_id: 'mod-pocket', title: 'Fenótipos da Obesidade', description: '', panda_video_embed_url: 'f76e64a3-f13a-4fa0-bdec-9217a61121d3', duration_minutes: 35, order_index: 16, is_active: true },
      { id: 'p17', module_id: 'mod-pocket', title: 'Condutas Funcional Integrativa + Emagrecimento', description: '', panda_video_embed_url: '50247b9a-ae95-4e8c-bea2-f579c5666d53', duration_minutes: 45, order_index: 17, is_active: true },
      { id: 'p18', module_id: 'mod-pocket', title: 'Reposição hormonal na prática', description: '', panda_video_embed_url: '3d7370ca-2645-478b-898e-23b66ef329ff', duration_minutes: 40, order_index: 18, is_active: true },
      { id: 'p19', module_id: 'mod-pocket', title: 'Intramusculares na prática', description: '', panda_video_embed_url: '6bc7a6bc-6b8a-42d2-a770-e224b7697ea9', duration_minutes: 30, order_index: 19, is_active: true },
      { id: 'p20', module_id: 'mod-pocket', title: 'Lipedema', description: '', panda_video_embed_url: '8be193a9-0de8-42b5-966a-d52a216de7da', duration_minutes: 35, order_index: 20, is_active: true },
      { id: 'p21', module_id: 'mod-pocket', title: 'Medicina capilar', description: '', panda_video_embed_url: 'a284ea86-dcb6-4410-ab11-b0f4fa049b5a', duration_minutes: 30, order_index: 21, is_active: true },
      { id: 'p22', module_id: 'mod-pocket', title: 'Procedimento capilar na prática', description: '', panda_video_embed_url: 'fc25faa0-1294-4cbb-a74f-5b8ea3ece5cb', duration_minutes: 25, order_index: 22, is_active: true },
    ]
  },
  {
    id: 'mod-posicionamento',
    title: 'Posicionamento Digital Estratégico e Intencional',
    description: 'Branding, estratégias digitais, oratória, Instagram, TikTok, YouTube e funis de conteúdo.',
    order_index: 2,
    cover_image_url: 'https://medicosderesultado.com/wp-content/uploads/2024/10/modulo-3.png',
    is_active: true,
    lessons: [
      { id: 'pos1', module_id: 'mod-posicionamento', title: 'Consultoria de imagem e estilo', description: '', panda_video_embed_url: '308b1466-637a-4488-9c1b-005e0e989f2e', duration_minutes: 40, order_index: 1, is_active: true },
      { id: 'pos2', module_id: 'mod-posicionamento', title: 'Construindo o seu branding', description: '', panda_video_embed_url: '5c969968-93cd-4e67-8e6f-114b3c1efa17', duration_minutes: 35, order_index: 2, is_active: true },
      { id: 'pos3', module_id: 'mod-posicionamento', title: 'Posicionamento Digital', description: '', panda_video_embed_url: '44168dd9-60d4-48a1-991f-c2be1f677e68', duration_minutes: 45, order_index: 3, is_active: true },
      { id: 'pos4', module_id: 'mod-posicionamento', title: 'Estratégias Digitais I', description: '', panda_video_embed_url: '9a838b4c-9e03-44f9-a94c-96a1ca1bc9dd', duration_minutes: 40, order_index: 4, is_active: true },
      { id: 'pos5', module_id: 'mod-posicionamento', title: 'Estratégias Digitais II', description: '', panda_video_embed_url: 'e86dabd4-6197-47b8-af4a-d26d2f63c10d', duration_minutes: 40, order_index: 5, is_active: true },
      { id: 'pos6', module_id: 'mod-posicionamento', title: 'Otimize o seu tempo e $ com IA', description: '', panda_video_embed_url: '08e2fb81-ade5-4cca-87fd-0dd05f8d1769', duration_minutes: 30, order_index: 6, is_active: true },
      { id: 'pos7', module_id: 'mod-posicionamento', title: 'Criando a sua marca pessoal', description: '', panda_video_embed_url: '47205b12-003f-46bc-8d47-3961b696c717', duration_minutes: 35, order_index: 7, is_active: true },
      { id: 'pos8', module_id: 'mod-posicionamento', title: 'Oratória no digital', description: '', panda_video_embed_url: '58e119c3-d99f-4de7-a271-25de8f0f8bf9', duration_minutes: 30, order_index: 8, is_active: true },
      { id: 'pos9', module_id: 'mod-posicionamento', title: 'Montando um instagram estratégico e intencional', description: '', panda_video_embed_url: 'ba146035-450c-48c8-9c2e-05d97b46f58b', duration_minutes: 45, order_index: 9, is_active: true },
      { id: 'pos10', module_id: 'mod-posicionamento', title: 'Posicionamento Digital Estratégico', description: '', panda_video_embed_url: 'ee27181d-0b54-4b22-ad13-fffd0fa32507', duration_minutes: 40, order_index: 10, is_active: true },
      { id: 'pos11', module_id: 'mod-posicionamento', title: 'Montando o seu Funil de conteúdo', description: '', panda_video_embed_url: 'f69fe2d8-5f9d-439f-b0aa-f9209f1a9c9d', duration_minutes: 35, order_index: 11, is_active: true },
      { id: 'pos12', module_id: 'mod-posicionamento', title: 'Posicionamento digital pt.1', description: '', panda_video_embed_url: 'b14be558-39a2-4148-8d11-11369dca4e59', duration_minutes: 40, order_index: 12, is_active: true },
      { id: 'pos13', module_id: 'mod-posicionamento', title: 'Posicionamento digital pt.2', description: '', panda_video_embed_url: '1f3bd9bd-a920-4f7e-8010-7bd0ce8c6753', duration_minutes: 40, order_index: 13, is_active: true },
      { id: 'pos14', module_id: 'mod-posicionamento', title: 'Tiktok', description: '', panda_video_embed_url: 'c7630e19-94df-4ef6-8bc2-5e2ac34590d0', duration_minutes: 25, order_index: 14, is_active: true },
      { id: 'pos15', module_id: 'mod-posicionamento', title: 'Análise de perfil', description: '', panda_video_embed_url: '6e891a3f-c85a-4050-bbef-61ff9950bd5c', duration_minutes: 30, order_index: 15, is_active: true },
      { id: 'pos16', module_id: 'mod-posicionamento', title: 'Youtube', description: '', panda_video_embed_url: 'fa318322-1e67-4849-95c0-75e1913117d6', duration_minutes: 30, order_index: 16, is_active: true },
      { id: 'pos17', module_id: 'mod-posicionamento', title: 'Oratória pro digital', description: '', panda_video_embed_url: '3aba6cf9-9beb-47d2-808c-9cb96f3c1aa5', duration_minutes: 35, order_index: 17, is_active: true },
      { id: 'pos18', module_id: 'mod-posicionamento', title: 'Funil de conteúdo I', description: '', panda_video_embed_url: '4b7f8e4b-280e-4839-a076-352253b7053b', duration_minutes: 35, order_index: 18, is_active: true },
      { id: 'pos19', module_id: 'mod-posicionamento', title: 'Funil de conteúdo II', description: '', panda_video_embed_url: '96836f99-5599-450e-b095-d9a0e1f662e3', duration_minutes: 35, order_index: 19, is_active: true },
      { id: 'pos20', module_id: 'mod-posicionamento', title: 'Funil de manychat', description: '', panda_video_embed_url: '2c7a327a-bb50-4276-988d-4e66a7b1fb49', duration_minutes: 30, order_index: 20, is_active: true },
    ]
  },
  {
    id: 'mod-atrai-encanta',
    title: 'Atrai & Encanta',
    description: 'Gestão de alta performance, IA, encantamento Disney, jornada do paciente e formação de equipe.',
    order_index: 3,
    cover_image_url: 'https://medicosderesultado.com/wp-content/uploads/2024/10/modulo-4.png',
    is_active: true,
    lessons: [
      { id: 'ae1', module_id: 'mod-atrai-encanta', title: 'Gestão de Alta Performance', description: '', panda_video_embed_url: '41e6783b-546f-48b0-acb1-025d42c19e11', duration_minutes: 45, order_index: 1, is_active: true },
      { id: 'ae2', module_id: 'mod-atrai-encanta', title: 'IA e ferramentas de Gestão', description: '', panda_video_embed_url: 'd163c603-6e2c-47a1-ab8d-cc6ed9877a20', duration_minutes: 35, order_index: 2, is_active: true },
      { id: 'ae3', module_id: 'mod-atrai-encanta', title: 'Encantamento Disney', description: '', panda_video_embed_url: '57dc2880-d400-406f-8112-5769cc777887', duration_minutes: 40, order_index: 3, is_active: true },
      { id: 'ae4', module_id: 'mod-atrai-encanta', title: 'Jornada do paciente', description: '', panda_video_embed_url: '4f6d3fb3-37db-491b-9140-112cb50f1bbf', duration_minutes: 35, order_index: 4, is_active: true },
      { id: 'ae5', module_id: 'mod-atrai-encanta', title: 'Criação de Processos', description: '', panda_video_embed_url: 'ee49f321-4428-458b-bcca-7aec4bdb857a', duration_minutes: 30, order_index: 5, is_active: true },
      { id: 'ae6', module_id: 'mod-atrai-encanta', title: 'Formação de Equipe', description: '', panda_video_embed_url: '1d80f8c2-395d-42f5-88a1-75ac258a0038', duration_minutes: 35, order_index: 6, is_active: true },
      { id: 'ae7', module_id: 'mod-atrai-encanta', title: 'Modelo Disney', description: '', panda_video_embed_url: 'c02c2226-a68c-4549-991c-76e9064e1b07', duration_minutes: 40, order_index: 7, is_active: true },
      { id: 'ae8', module_id: 'mod-atrai-encanta', title: 'Alta Performance na gestão', description: '', panda_video_embed_url: '29a87d52-4b70-4e1e-9b71-c3e3f43c6f3e', duration_minutes: 40, order_index: 8, is_active: true },
      { id: 'ae9', module_id: 'mod-atrai-encanta', title: 'Usando a IA na gestão', description: '', panda_video_embed_url: 'bda7939f-742c-4ad4-b682-3c336f08612d', duration_minutes: 30, order_index: 9, is_active: true },
      { id: 'ae10', module_id: 'mod-atrai-encanta', title: 'SWOT e 5W2H', description: '', panda_video_embed_url: '98144ff5-780e-42af-9e22-c47a3f7822e4', duration_minutes: 35, order_index: 10, is_active: true },
      { id: 'ae11', module_id: 'mod-atrai-encanta', title: 'Como pagar prestadores de serviços', description: '', panda_video_embed_url: '3ea602bb-f212-4ea5-917e-cc727bffc9f5', duration_minutes: 25, order_index: 11, is_active: true },
      { id: 'ae12', module_id: 'mod-atrai-encanta', title: 'Processos', description: '', panda_video_embed_url: 'fc0258f9-2910-4ada-9140-2cbb6a25da0f', duration_minutes: 30, order_index: 12, is_active: true },
      { id: 'ae13', module_id: 'mod-atrai-encanta', title: 'Jornada do paciente', description: '', panda_video_embed_url: '7c23ba8e-47bb-4bf9-b27a-55f3c3cdd810', duration_minutes: 35, order_index: 13, is_active: true },
      { id: 'ae14', module_id: 'mod-atrai-encanta', title: 'Modelo de encantamento Disney', description: '', panda_video_embed_url: '8b0fc36a-d168-4fd7-9e0b-7c1e9543faf1', duration_minutes: 40, order_index: 14, is_active: true },
      { id: 'ae15', module_id: 'mod-atrai-encanta', title: 'Como estruturar processos', description: '', panda_video_embed_url: '90bc0431-d9f9-40ad-a771-8649714f4e2f', duration_minutes: 30, order_index: 15, is_active: true },
      { id: 'ae16', module_id: 'mod-atrai-encanta', title: 'Prompts para IA na gestão', description: '', panda_video_embed_url: 'e01d3cd5-fc31-4235-9c73-11b4cce40260', duration_minutes: 25, order_index: 16, is_active: true },
      { id: 'ae17', module_id: 'mod-atrai-encanta', title: '5W2H & SWOT', description: '', panda_video_embed_url: 'b53c07c9-a509-4c1c-8490-4c11e08f697d', duration_minutes: 30, order_index: 17, is_active: true },
      { id: 'ae18', module_id: 'mod-atrai-encanta', title: 'Formação de Equipe', description: '', panda_video_embed_url: '778c7f30-1682-40bf-ba3a-aae25f80ba1a', duration_minutes: 35, order_index: 18, is_active: true },
      { id: 'ae19', module_id: 'mod-atrai-encanta', title: 'Gestão de Alta Performance', description: '', panda_video_embed_url: '2265ee3d-3e44-4c1f-83b5-61f796eec182', duration_minutes: 40, order_index: 19, is_active: true },
    ]
  },
  {
    id: 'mod-bonus',
    title: 'Bônus',
    description: 'Conteúdos bônus exclusivos para mentorados.',
    order_index: 4,
    cover_image_url: 'https://medicosderesultado.com/wp-content/uploads/2024/10/modulo-5.png',
    is_active: true,
    lessons: [
      { id: 'b1', module_id: 'mod-bonus', title: 'Aprenda tráfego pago do zero', description: '', panda_video_embed_url: 'c6c3cc69-59c0-4c93-92c1-924a3924807d', duration_minutes: 60, order_index: 1, is_active: true },
    ]
  },
  {
    id: 'mod-medicos-vendem',
    title: 'Médicos que Vendem',
    description: 'Venda consultiva, scripts, protocolos de alto valor, SPIN Selling, objeções e gatilhos mentais.',
    order_index: 5,
    cover_image_url: 'https://medicosderesultado.com/wp-content/uploads/2024/10/modulo-6.png',
    is_active: true,
    lessons: [
      { id: 'mv1', module_id: 'mod-medicos-vendem', title: 'Venda consultiva', description: '', panda_video_embed_url: '2547e4ff-d4d5-4b09-87e5-4a1b76f3eae3', duration_minutes: 45, order_index: 1, is_active: true },
      { id: 'mv2', module_id: 'mod-medicos-vendem', title: 'Script de venda', description: '', panda_video_embed_url: 'b428cccd-170c-47f8-9c57-95d23a3341f3', duration_minutes: 35, order_index: 2, is_active: true },
      { id: 'mv3', module_id: 'mod-medicos-vendem', title: 'Protocolos de alto valor', description: '', panda_video_embed_url: '2485f208-fb24-4430-a3f3-81de20953fa0', duration_minutes: 40, order_index: 3, is_active: true },
      { id: 'mv4', module_id: 'mod-medicos-vendem', title: 'Analisando protocolos de alto Valor I', description: '', panda_video_embed_url: '34e3fb69-264a-470c-809c-85574467ea6f', duration_minutes: 40, order_index: 4, is_active: true },
      { id: 'mv5', module_id: 'mod-medicos-vendem', title: 'Scripts de Whatsapp', description: '', panda_video_embed_url: 'c6c3cc69-59c0-4c93-92c1-924a3924807d', duration_minutes: 30, order_index: 5, is_active: true },
      { id: 'mv6', module_id: 'mod-medicos-vendem', title: 'Venda Consultiva II', description: '', panda_video_embed_url: '18c76310-9f8f-4edf-b058-9cee1eb3b208', duration_minutes: 40, order_index: 6, is_active: true },
      { id: 'mv7', module_id: 'mod-medicos-vendem', title: 'Montando protocolos de alto valor', description: '', panda_video_embed_url: 'bfc2bd50-ea5e-4709-8037-61b25850b402', duration_minutes: 45, order_index: 7, is_active: true },
      { id: 'mv8', module_id: 'mod-medicos-vendem', title: 'SPIN Selling', description: '', panda_video_embed_url: '1bad9ca5-4062-4ebd-ac21-69dc3065f17c', duration_minutes: 40, order_index: 8, is_active: true },
      { id: 'mv9', module_id: 'mod-medicos-vendem', title: 'Gatilhos Mentais', description: '', panda_video_embed_url: '765b035b-2ef6-4f4b-b6cc-fc4aee8b7150', duration_minutes: 35, order_index: 9, is_active: true },
      { id: 'mv10', module_id: 'mod-medicos-vendem', title: 'Objeções', description: '', panda_video_embed_url: 'bc0f0221-6b40-4e39-a5cd-17f9b1d08d18', duration_minutes: 35, order_index: 10, is_active: true },
      { id: 'mv11', module_id: 'mod-medicos-vendem', title: 'Crenças limitantes I', description: '', panda_video_embed_url: '44af3fc6-a4e5-4a2f-a1b5-77244678c2e1', duration_minutes: 30, order_index: 11, is_active: true },
      { id: 'mv12', module_id: 'mod-medicos-vendem', title: 'Como fazer dinheiro rápido', description: '', panda_video_embed_url: '8870578c-05c4-4d7b-8ccc-ded59f3c7c91', duration_minutes: 35, order_index: 12, is_active: true },
      { id: 'mv13', module_id: 'mod-medicos-vendem', title: 'Financiamento de Tratamento e alavancagem patrimonial', description: '', panda_video_embed_url: 'fd14b3bf-ccf7-4db2-aacb-aa47debe6537', duration_minutes: 40, order_index: 13, is_active: true },
      { id: 'mv14', module_id: 'mod-medicos-vendem', title: 'CRM - Extraindo o máximo do seu tráfego', description: '', panda_video_embed_url: '989aab8c-d4b5-4d04-b448-0b514b5d9126', duration_minutes: 35, order_index: 14, is_active: true },
      { id: 'mv15', module_id: 'mod-medicos-vendem', title: 'Montando protocolos de alto valor', description: '', panda_video_embed_url: 'd57e16cf-85cf-4b63-96cf-491cb39b9769', duration_minutes: 40, order_index: 15, is_active: true },
      { id: 'mv16', module_id: 'mod-medicos-vendem', title: 'Crenças limitantes II', description: '', panda_video_embed_url: '0ef40cd7-48cf-42e0-adf9-fc6b4ba178be', duration_minutes: 30, order_index: 16, is_active: true },
      { id: 'mv17', module_id: 'mod-medicos-vendem', title: 'Montando na prática protocolos de alto valor', description: '', panda_video_embed_url: 'e8aeca40-9f92-44b7-a29c-2690c4ba739b', duration_minutes: 45, order_index: 17, is_active: true },
      { id: 'mv18', module_id: 'mod-medicos-vendem', title: 'SPIN selling II', description: '', panda_video_embed_url: '85e64359-9ac0-431e-9980-c3db33ecd103', duration_minutes: 40, order_index: 18, is_active: true },
      { id: 'mv19', module_id: 'mod-medicos-vendem', title: 'Venda Consultiva II', description: '', panda_video_embed_url: '0f148198-c332-4a86-98a6-a54b3d1c178e', duration_minutes: 40, order_index: 19, is_active: true },
      { id: 'mv20', module_id: 'mod-medicos-vendem', title: 'Objeções II', description: '', panda_video_embed_url: '87332005-2973-49fc-b127-031ba6a39107', duration_minutes: 35, order_index: 20, is_active: true },
      { id: 'mv21', module_id: 'mod-medicos-vendem', title: 'Gatilhos Mentais II', description: '', panda_video_embed_url: '89588001-ae3e-4d2a-bf79-93684d6d5248', duration_minutes: 35, order_index: 21, is_active: true },
      { id: 'mv22', module_id: 'mod-medicos-vendem', title: 'Estratégias de negociação', description: '', panda_video_embed_url: '83d45c91-fb2d-41df-bfab-cccd5bd65725', duration_minutes: 40, order_index: 22, is_active: true },
    ]
  },
  {
    id: 'mod-hotseats',
    title: 'Hotseats',
    description: 'Hotseats ao vivo com análise de protocolos, funis, tráfego pago e direito médico.',
    order_index: 6,
    cover_image_url: 'https://medicosderesultado.com/wp-content/uploads/2024/11/modulo-7.png',
    is_active: true,
    lessons: [
      { id: 'hs1', module_id: 'mod-hotseats', title: 'Hotseat 01', description: '', panda_video_embed_url: 'e485f07e-975f-468c-87c3-74610d20a8f5', duration_minutes: 60, order_index: 1, is_active: true },
      { id: 'hs2', module_id: 'mod-hotseats', title: 'Hotseat 02', description: '', panda_video_embed_url: '9ab3f106-0d75-483b-919e-ba3bffded3d2', duration_minutes: 60, order_index: 2, is_active: true },
      { id: 'hs3', module_id: 'mod-hotseats', title: 'Hotseat 03', description: '', panda_video_embed_url: '797d06fe-ceca-4ec5-af02-d4889f351b96', duration_minutes: 60, order_index: 3, is_active: true },
      { id: 'hs4', module_id: 'mod-hotseats', title: 'Hotseat 04 - Protocolos I', description: '', panda_video_embed_url: 'a2bb52bb-a2a4-4851-8769-566dd461feb5', duration_minutes: 60, order_index: 4, is_active: true },
      { id: 'hs5', module_id: 'mod-hotseats', title: 'Hotseat 05 - Protocolos II', description: '', panda_video_embed_url: 'a0ab5cfd-af72-45a2-83f4-c504f773f378', duration_minutes: 60, order_index: 5, is_active: true },
      { id: 'hs6', module_id: 'mod-hotseats', title: 'Hotseat 06 - Avaliando Funis', description: '', panda_video_embed_url: 'c91a5b66-a44a-4486-8ae6-8dd2063e726a', duration_minutes: 60, order_index: 6, is_active: true },
      { id: 'hs7', module_id: 'mod-hotseats', title: 'Hotseat 07 - Avaliando Protocolos', description: '', panda_video_embed_url: 'b0ff9a22-2ac4-4fc3-af34-2c1777eeb570', duration_minutes: 60, order_index: 7, is_active: true },
      { id: 'hs8', module_id: 'mod-hotseats', title: 'Hotseat 08 - Montagem de Protocolos', description: '', panda_video_embed_url: 'a3ceb2a6-cee2-40d6-9c2a-96deb36c106d', duration_minutes: 60, order_index: 8, is_active: true },
      { id: 'hs9', module_id: 'mod-hotseats', title: 'Hotseat 09 - Marcos Strider', description: '', panda_video_embed_url: '1b30d985-d7a0-468b-b73b-655d31eee24f', duration_minutes: 60, order_index: 9, is_active: true },
      { id: 'hs10', module_id: 'mod-hotseats', title: 'Hotseat 10 - Direito médico', description: '', panda_video_embed_url: '945879e5-88b1-446a-895d-d3281f6a9bdb', duration_minutes: 60, order_index: 10, is_active: true },
      { id: 'hs11', module_id: 'mod-hotseats', title: 'Hotseat 11 - Tráfego pago 1', description: '', panda_video_embed_url: 'a69507b8-f9b2-437d-94fb-3a41e52e845b', duration_minutes: 60, order_index: 11, is_active: true },
      { id: 'hs12', module_id: 'mod-hotseats', title: 'Hotseat 12 - Tráfego pago 2', description: '', panda_video_embed_url: 'eb1f8df4-f013-450b-84ae-5aa8da0a95cf', duration_minutes: 60, order_index: 12, is_active: true },
      { id: 'hs13', module_id: 'mod-hotseats', title: 'Hotseat 13 - Avaliando protocolos', description: '', panda_video_embed_url: 'b9c3afaf-71a1-4db8-b9e5-8078276849e2', duration_minutes: 60, order_index: 13, is_active: true },
    ]
  },
]

export function createMockMentorado(email: string) {
  return {
    id: 'mock-mentorado-001',
    nome_completo: 'Mentorado',
    email,
    telefone: '',
    estado_entrada: 'ativo',
    estado_atual: 'ativo',
    data_entrada: '2025-01-01',
    status_login: 'ativo',
    genero: 'nao_informado',
    especialidade: '',
    created_at: new Date().toISOString(),
    turma: 'Mentorado',
  }
}
