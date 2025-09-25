'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageCircle,
  QrCode,
  Send,
  Search,
  Wifi,
  WifiOff,
  MoreVertical,
  CheckCheck
} from 'lucide-react';

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  type: string;
  timestamp: number;
  isFromMe: boolean;
  contact?: {
    id: string;
    name: string;
    pushname: string;
    number: string;
  };
}

interface WhatsAppContact {
  id: string;
  name: string;
  pushname: string;
  number: string;
  isMyContact: boolean;
  lastMessage?: WhatsAppMessage;
  unreadCount?: number;
}

interface LeadStage {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface WhatsAppStatus {
  isReady: boolean;
  qrCode: string | null;
  status: string;
}

interface Conversation {
  contact: WhatsAppContact;
  lastMessage: WhatsAppMessage | null;
  timestamp: number;
  unreadCount: number;
  stage: LeadStage;
}

// Estágios hardcoded com UUIDs simples por enquanto
const leadStages: LeadStage[] = [
  { id: 'novo-lead', name: 'Novo Lead', color: 'blue', description: 'Lead recém-chegado' },
  { id: 'call-agendada', name: 'Call Agendada', color: 'yellow', description: 'Call de qualificação agendada' },
  { id: 'convertida', name: 'Convertida', color: 'green', description: 'Lead convertida em cliente' },
  { id: 'perdida', name: 'Perdida', color: 'red', description: 'Lead perdida ou desqualificada' }
];

// Função para detectar se é anexo
const isAttachment = (message: WhatsAppMessage): boolean => {
  const attachmentTypes = ['image', 'video', 'audio', 'document', 'sticker'];
  return attachmentTypes.includes(message.type) ||
         message.body.match(/\.(jpg|jpeg|png|gif|mp4|mp3|wav|pdf|doc|docx)$/i) !== null;
};

// Função para obter tipo de anexo
const getAttachmentType = (message: WhatsAppMessage): string => {
  if (message.type !== 'chat') return message.type;

  const ext = message.body.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image';
  if (['mp4', 'avi', 'mov'].includes(ext || '')) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';
  if (['pdf', 'doc', 'docx'].includes(ext || '')) return 'document';

  return 'attachment';
};

const getStageColor = (color: string) => {
  const colors = {
    blue: 'bg-blue-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white'
  };
  return colors[color as keyof typeof colors] || 'bg-gray-500 text-white';
};

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus>({ isReady: false, qrCode: null, status: 'disconnected' });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar conversas baseado na busca
  const filteredConversations = conversations.filter(conv =>
    conv.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact.number.includes(searchTerm) ||
    conv.lastMessage?.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const checkStatus = useCallback(async () => {
    try {
      const { whatsappService } = await import('@/lib/whatsapp-core-service');
      const statusData = await whatsappService.getStatus();

      if (statusData) {
        setStatus(prevStatus => ({
          isReady: statusData.isReady,
          qrCode: statusData.isReady ? null : prevStatus.qrCode, // Limpar QR quando conectado
          status: statusData.isReady ? 'connected' : 'disconnected'
        }));
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  }, []);

  // Função para criar conversas com TODOS os remetentes (incluindo números não salvos)
  const loadConversations = useCallback(async () => {
    if (!status.isReady) return;

    try {
      // Buscar contatos e mensagens em paralelo
      const { whatsappService } = await import('@/lib/whatsapp-core-service');
      const [allContacts, allMessages] = await Promise.all([
        whatsappService.getContacts(),
        whatsappService.getMessages(100)
      ]);

      console.log(`📊 Carregando: ${allContacts.length} contatos, ${allMessages.length} mensagens`);

      // Usar Map para evitar duplicação - chave única por ID
      const conversationsMap = new Map<string, Conversation>();

      // PRIMEIRO: Criar conversas com contatos salvos (SOMENTE INDIVIDUAIS)
      allContacts.forEach((contact: WhatsAppContact) => {
        // FILTRAR: Não incluir contatos que são grupos
        if (contact.id.includes('@g.us')) {
          console.log(`🔵 [CONTATOS] Ignorando grupo nos contatos salvos: ${contact.name} (${contact.id})`);
          return; // Pular grupos que vieram na lista de contatos
        }

        console.log(`👤 [CONTATOS] Adicionando contato salvo: ${contact.name} (${contact.id})`);
        conversationsMap.set(contact.id, {
          contact: contact,
          lastMessage: null,
          timestamp: 0,
          unreadCount: 0,
          stage: leadStages[0]
        });
      });

      // SEGUNDO: Para CADA mensagem, criar conversa se não existir (números não salvos + grupos)
      allMessages.forEach((message: WhatsAppMessage) => {
        // DETECTAR se a mensagem está relacionada a um grupo
        const isGroupMessage = message.from.includes('@g.us') || message.to.includes('@g.us');

        let contactId: string;

        if (isGroupMessage) {
          // QUALQUER mensagem que envolva um grupo: usar SEMPRE o ID do grupo
          contactId = message.from.includes('@g.us') ? message.from : message.to;
          console.log(`🔵 [GRUPO] DETECTADO - De: ${message.from} Para: ${message.to} -> Usando: ${contactId}`);
          console.log(`🔵 [GRUPO] Remetente real: ${message.contact?.name || 'Desconhecido'}`);
        } else {
          // Conversa individual pura - sem envolvimento de grupos
          contactId = message.isFromMe ? message.to : message.from;

          // ÚLTIMA VALIDAÇÃO: Se ainda assim chegou um grupo aqui, pular
          if (contactId.includes('@g.us')) {
            console.error(`❌ [ERRO CRÍTICO] Grupo escapou da detecção: ${contactId}`);
            return; // Ignorar completamente
          }
          console.log(`👤 [INDIVIDUAL] Conversa pura: ${contactId} (${message.contact?.name || 'Sem nome'})`);
        }

        // Se não existe conversa para este ID, criar uma nova
        if (!conversationsMap.has(contactId)) {
          const isGroup = contactId.includes('@g.us');
          let displayName: string;

          // VALIDAÇÃO DUPLA: Garantir que não há mistura entre grupos e individuais
          if (isGroup && !isGroupMessage) {
            console.error(`❌ [ERRO CRÍTICO] ID de grupo ${contactId} detectado em mensagem não-grupo!`);
            return; // Ignorar essa mensagem problemática
          }

          if (!isGroup && isGroupMessage) {
            console.error(`❌ [ERRO CRÍTICO] ID individual ${contactId} detectado em mensagem de grupo!`);
            return; // Ignorar essa mensagem problemática
          }

          if (isGroup) {
            // Para grupos, sempre priorizar nome do chat
            displayName = message.contact?.name ||
                         `Grupo ${contactId.split('@')[0].slice(-4)}`; // Últimos 4 dígitos
            console.log(`✨ [GRUPO] Criando nova conversa de grupo: ${displayName} (ID: ${contactId})`);
          } else {
            // Para contatos individuais
            displayName = message.contact?.name ||
                         message.contact?.pushname ||
                         contactId.replace('@c.us', '');
            console.log(`✨ [INDIVIDUAL] Criando nova conversa individual: ${displayName} (ID: ${contactId})`);
          }

          const newContact: WhatsAppContact = {
            id: contactId,
            name: displayName,
            pushname: message.contact?.pushname || '',
            number: contactId.replace('@c.us', '').replace('@g.us', ''),
            isMyContact: false // Número/grupo não salvo
          };

          conversationsMap.set(contactId, {
            contact: newContact,
            lastMessage: null,
            timestamp: 0,
            unreadCount: 0,
            stage: leadStages[0]
          });
        }

        // Atualizar com a mensagem mais recente
        const conversation = conversationsMap.get(contactId);
        if (conversation && (!conversation.lastMessage || message.timestamp > conversation.timestamp)) {
          conversation.lastMessage = message;
          conversation.timestamp = message.timestamp;

          // Contar mensagens não lidas (de outros para mim)
          if (!message.isFromMe && Date.now() - message.timestamp < 3600000) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
        }
      });

      // FILTRO FINAL: Remover contatos individuais que só aparecem em mensagens de grupo
      const conversationsArray = Array.from(conversationsMap.values()).filter((conversation) => {
        const contactId = conversation.contact.id;
        const isGroup = contactId.includes('@g.us');

        if (isGroup) {
          // Manter todos os grupos
          console.log(`🔵 [FILTRO FINAL] Mantendo grupo: ${conversation.contact.name}`);
          return true;
        }

        // Para contatos individuais: verificar se têm mensagens reais (não só de grupo)
        const hasIndividualMessages = allMessages.some((msg: any) => {
          // Verificar se a mensagem é realmente individual (sem @g.us)
          const isIndividualMessage = !msg.from.includes('@g.us') && !msg.to.includes('@g.us');
          const involvesContact = msg.from === contactId || msg.to === contactId;

          return isIndividualMessage && involvesContact;
        });

        if (!hasIndividualMessages && conversation.lastMessage) {
          console.log(`❌ [FILTRO FINAL] Removendo contato que só aparece em grupos: ${conversation.contact.name} (${contactId})`);
          return false; // Remover este contato
        }

        if (hasIndividualMessages) {
          console.log(`👤 [FILTRO FINAL] Mantendo contato individual válido: ${conversation.contact.name}`);
        }

        return true; // Manter contatos válidos
      }).sort((a, b) => {
        if (a.lastMessage && !b.lastMessage) return -1;
        if (!a.lastMessage && b.lastMessage) return 1;
        if (a.lastMessage && b.lastMessage) return b.timestamp - a.timestamp;
        return a.contact.name.localeCompare(b.contact.name);
      });

      setConversations(conversationsArray);
      console.log(`✅ ${conversationsArray.length} conversas carregadas (${conversationsArray.filter(c => c.lastMessage).length} com mensagens)`);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  }, [status.isReady]);

  const loadChatMessages = useCallback(async (contactId: string) => {
    try {
      console.log(`📱 Carregando mensagens para: ${contactId}`);

      const { whatsappService } = await import('@/lib/whatsapp-core-service');
      const messages = await whatsappService.getChatMessages(contactId, 50);

      // Ordenar mensagens: mais recentes PRIMEIRO (ordem decrescente de timestamp)
      const sortedMessages = messages.sort((a: WhatsAppMessage, b: WhatsAppMessage) =>
        b.timestamp - a.timestamp
      );
      setChatMessages(sortedMessages);
      console.log(`✅ ${sortedMessages.length} mensagens carregadas (ordenadas: mais recentes primeiro)`);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setChatMessages([]);
    }
  }, []);

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Limpar imediatamente para melhor UX

    try {
      console.log(`📤 Enviando mensagem para ${selectedConversation.contact.id}: ${messageText}`);

      // Adicionar mensagem temporária na UI imediatamente
      const tempMessage: WhatsAppMessage = {
        id: 'temp-' + Date.now(),
        from: 'me',
        to: selectedConversation.contact.id,
        body: messageText,
        type: 'chat',
        timestamp: Date.now(),
        isFromMe: true,
        contact: {
          id: 'me',
          name: 'Você',
          pushname: '',
          number: ''
        }
      };

      // Atualizar UI imediatamente (adicionar no INÍCIO pois ordenamos por mais recentes primeiro)
      setChatMessages(prev => [tempMessage, ...prev]);

      // Enviar mensagem usando o serviço
      const { whatsappService } = await import('@/lib/whatsapp-core-service');
      const success = await whatsappService.sendMessage(
        selectedConversation.contact.id,
        messageText
      );

      if (success) {
        console.log('✅ Mensagem enviada com sucesso!');

        // Recarregar mensagens após 1 segundo para pegar a mensagem real
        setTimeout(() => {
          loadChatMessages(selectedConversation.contact.id);
          loadConversations();
        }, 1000);
      } else {
        console.error('❌ Falha ao enviar mensagem');
        // Remover mensagem temporária em caso de erro
        setChatMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        setNewMessage(messageText); // Restaurar texto
      }
    } catch (error) {
      console.error('💥 Erro ao enviar mensagem:', error);
      // Remover mensagem temporária e restaurar texto
      setChatMessages(prev => prev.filter(msg => msg.id.startsWith('temp-')));
      setNewMessage(messageText);
    }
  };

  const updateContactStage = async (contactId: string, stageId: string) => {
    try {
      console.log('🔄 Atualizando estágio:', contactId, 'para:', stageId);

      // Atualizar localmente primeiro para UX imediata
      const newStage = leadStages.find(s => s.id === stageId) || leadStages[0];

      setConversations(prev => prev.map(conv =>
        conv.contact.id === contactId
          ? { ...conv, stage: newStage }
          : conv
      ));

      if (selectedConversation?.contact.id === contactId) {
        setSelectedConversation(prev => prev ? { ...prev, stage: newStage } : null);
      }

      // TODO: Aqui implementar salvamento no banco quando as tabelas existirem
      console.log('✅ Estágio atualizado localmente para:', newStage.name);

    } catch (error) {
      console.error('💥 Erro ao atualizar estágio:', error);
    }
  };

  const initializeWhatsApp = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Usuário clicou para conectar - gerando QR Code...');

      const { whatsappService } = await import('@/lib/whatsapp-core-service');
      await whatsappService.initialize();

      // Gerar QR Code apenas quando usuário clicar
      const qrData = await whatsappService.getQRCode();

      if (qrData?.qrImage) {
        setStatus(prev => ({
          ...prev,
          qrCode: qrData.qrImage
        }));
        console.log('✅ QR Code gerado e exibido');
      }

      // Verificar status após gerar QR (intervalo razoável)
      const interval = setInterval(checkStatus, 8000); // 8 segundos
      setTimeout(() => clearInterval(interval), 120000); // Para após 2 minutos
    } catch (error) {
      console.error('Erro ao inicializar WhatsApp:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getMessagePreview = (message: WhatsAppMessage | null) => {
    if (!message) return 'Clique para iniciar conversa';

    const prefix = message.isFromMe ? 'Você: ' : '';

    // Detectar anexos
    if (isAttachment(message)) {
      const attachmentType = getAttachmentType(message);
      const typeEmojis = {
        image: '🖼️ Imagem',
        video: '🎥 Vídeo',
        audio: '🎤 Áudio',
        document: '📄 Documento',
        sticker: '😀 Sticker',
        attachment: '📎 Anexo'
      };
      return prefix + (typeEmojis[attachmentType as keyof typeof typeEmojis] || '📎 Anexo');
    }

    const body = message.body.length > 50 ? message.body.substring(0, 50) + '...' : message.body;
    return prefix + body;
  };

  // SSE para atualizações em tempo real + polling como backup
  useEffect(() => {
    if (!status.isReady) return;

    console.log('📡 Conectando SSE para atualizações em tempo real...');

    // Conectar ao SSE (usando URL da API)
    const isProduction = process.env.NODE_ENV === 'production';
    const apiUrl = isProduction ? 'https://api-cs-2.onrender.com' : 'http://localhost:3333';
    const eventSource = new EventSource(`${apiUrl}/live-updates`);

    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 SSE Update:', data);

        if (data.type === 'new_message') {
          // Nova mensagem recebida
          loadConversations(); // Atualizar lista de conversas

          // Se estamos na conversa onde chegou a mensagem, atualizar mensagens
          if (selectedConversation) {
            // Usar a mesma lógica de grupos do loadConversations
            let messageContactId: string;
            if (data.data.from.includes('@g.us')) {
              // É um grupo - usar sempre o ID do grupo
              messageContactId = data.data.from;
            } else if (data.data.to.includes('@g.us')) {
              // Mensagem enviada para um grupo
              messageContactId = data.data.to;
            } else {
              // Conversa individual
              messageContactId = data.data.isFromMe ? data.data.to : data.data.from;
            }

            if (messageContactId === selectedConversation.contact.id) {
              console.log('📲 Mensagem recebida na conversa ativa, atualizando...');
              loadChatMessages(selectedConversation.contact.id);
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro ao processar SSE:', error);
      }
    });

    eventSource.addEventListener('error', (error) => {
      console.warn('⚠️ SSE erro, usando polling como backup:', error);
    });

    // Polling como backup (intervalos bem maiores para não sobrecarregar)
    const conversationsBackup = setInterval(loadConversations, 60000); // 1 minuto
    const messagesBackup = selectedConversation ? setInterval(() => {
      if (selectedConversation) {
        loadChatMessages(selectedConversation.contact.id);
      }
    }, 45000) : null; // 45 segundos

    return () => {
      console.log('🔌 Desconectando SSE...');
      eventSource.close();
      clearInterval(conversationsBackup);
      if (messagesBackup) clearInterval(messagesBackup);
    };
  }, [status.isReady, selectedConversation, loadConversations, loadChatMessages]);

  useEffect(() => {
    checkStatus();

    // Intervalo mais longo para não sobrecarregar a API
    // Apenas quando desconectado - se conectado, reduz ainda mais
    const getInterval = () => status.isReady ? 30000 : 15000; // 30s se conectado, 15s se desconectado

    const statusInterval = setInterval(() => {
      checkStatus();
    }, getInterval());

    return () => clearInterval(statusInterval);
  }, [checkStatus, status.isReady]);

  useEffect(() => {
    if (status.isReady) {
      loadConversations();
    }
  }, [status.isReady, loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadChatMessages(selectedConversation.contact.id);
    }
  }, [selectedConversation, loadChatMessages]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business</h1>
            <p className="text-sm text-gray-600">Gerencie suas conversas e leads</p>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              status.isReady ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {status.isReady ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {status.isReady ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            {!status.isReady && (
              <Button onClick={initializeWhatsApp} disabled={isLoading}>
                <QrCode className="h-4 w-4 mr-2" />
                {isLoading ? 'Conectando...' : 'Conectar'}
              </Button>
            )}
          </div>
        </div>

        {status.qrCode && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              Escaneie o QR Code com seu WhatsApp:
            </p>
            <div className="flex flex-col items-center">
              <img src={status.qrCode} alt="QR Code" className="w-48 h-48 mx-auto" />
              <div className="mt-3 flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Aguardando leitura do QR Code...</span>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={initializeWhatsApp}
                  disabled={isLoading}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {isLoading ? 'Gerando...' : 'Gerar Novo QR'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {status.isReady === false && status.isConnecting === true && !status.qrCode && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-blue-800 font-medium">Conectando ao WhatsApp...</span>
            </div>
          </div>
        )}
      </div>

      {status.isReady && (
        <div className="flex-1 flex overflow-hidden">
          {/* Lista de Conversas */}
          <div className="w-1/3 bg-white border-r flex flex-col">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Conversas */}
            <ScrollArea className="flex-1">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.contact.id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.contact.id === conversation.contact.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {conversation.contact.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.contact.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {conversation.lastMessage ? (
                            <span className="text-xs text-gray-500">
                              {formatTime(conversation.timestamp)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Novo
                            </span>
                          )}
                          {conversation.unreadCount > 0 && (
                            <Badge className="bg-green-500 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate flex-1 ${
                          conversation.lastMessage
                            ? 'text-gray-600'
                            : 'text-gray-400 italic'
                        }`}>
                          {getMessagePreview(conversation.lastMessage)}
                        </p>

                        {conversation.lastMessage?.isFromMe && (
                          <div className="ml-2">
                            <CheckCheck className="h-4 w-4 text-blue-500" />
                          </div>
                        )}
                      </div>

                      {/* Estágio do Lead */}
                      <div className="mt-2">
                        <Badge className={`text-xs ${getStageColor(conversation.stage.color)}`}>
                          {conversation.stage.name}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredConversations.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conversa encontrada</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="bg-white border-b p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {selectedConversation.contact.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-medium text-gray-900">
                        {selectedConversation.contact.name}
                      </h2>
                      <p className="text-sm text-gray-500">{selectedConversation.contact.number}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Seletor de Estágio */}
                    <Select
                      value={selectedConversation.stage.id}
                      onValueChange={(stageId) => updateContactStage(selectedConversation.contact.id, stageId)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {leadStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getStageColor(stage.color).split(' ')[0]}`} />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Mensagens */}
                <ScrollArea className="flex-1 p-4 bg-gray-50">
                  <div className="space-y-3">
                    {chatMessages.length > 0 ? (
                      chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.isFromMe
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-gray-900 border'
                            }`}
                          >
                            {/* Conteúdo da mensagem ou anexo */}
                            {isAttachment(message) ? (
                              <div className="flex items-center gap-2 text-sm">
                                {getAttachmentType(message) === 'image' && <span>🖼️</span>}
                                {getAttachmentType(message) === 'video' && <span>🎥</span>}
                                {getAttachmentType(message) === 'audio' && <span>🎤</span>}
                                {getAttachmentType(message) === 'document' && <span>📄</span>}
                                {getAttachmentType(message) === 'sticker' && <span>😀</span>}
                                {!['image', 'video', 'audio', 'document', 'sticker'].includes(getAttachmentType(message)) && <span>📎</span>}
                                <span className="italic">
                                  {
                                    {
                                      'image': 'Imagem',
                                      'video': 'Vídeo',
                                      'audio': 'Áudio',
                                      'document': 'Documento',
                                      'sticker': 'Sticker'
                                    }[getAttachmentType(message)] || 'Anexo'
                                  }
                                </span>
                                {message.body && message.body !== getAttachmentType(message) && (
                                  <span className="text-xs opacity-75">({message.body})</span>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm">{message.body}</p>
                            )}

                            <div className={`flex items-center justify-end gap-1 mt-1 ${
                              message.isFromMe ? 'text-green-100' : 'text-gray-500'
                            }`}>
                              <span className="text-xs">
                                {formatTime(message.timestamp)}
                              </span>
                              {message.isFromMe && (
                                <CheckCheck className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-12">
                        <div className="text-center text-gray-500">
                          <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                          <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
                          <p className="text-sm">Envie a primeira mensagem para {selectedConversation.contact.name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input de Mensagem */}
                <div className="bg-white border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Digite uma mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 min-h-[40px] max-h-32 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecione uma conversa para começar</p>
                  <p className="text-sm">Escolha uma conversa da lista para ver as mensagens</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}