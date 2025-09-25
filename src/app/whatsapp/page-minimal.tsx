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

const getStageColor = (color: string) => {
  const colors = {
    blue: 'bg-blue-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white'
  };
  return colors[color as keyof typeof colors] || 'bg-gray-500 text-white';
};

export default function WhatsAppPageMinimal() {
  const [status, setStatus] = useState<WhatsAppStatus>({ isReady: false, qrCode: null, status: 'disconnected' });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState(0);

  // Filtrar conversas baseado na busca
  const filteredConversations = conversations.filter(conv =>
    conv.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact.number.includes(searchTerm) ||
    conv.lastMessage?.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const checkStatus = useCallback(async () => {
    // Evitar multiple requests simultâneos
    const now = Date.now();
    if (now - lastStatusCheck < 5000) return; // Mínimo 5s entre checks
    setLastStatusCheck(now);

    try {
      const { whatsappService } = await import('@/lib/whatsapp-core-service');
      const statusData = await whatsappService.getStatus();

      if (statusData) {
        setStatus(prevStatus => ({
          isReady: statusData.isReady,
          qrCode: statusData.isReady ? null : prevStatus.qrCode,
          status: statusData.isReady ? 'connected' : 'disconnected'
        }));
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  }, [lastStatusCheck]);

  const loadConversations = useCallback(async () => {
    if (!status.isReady) return;

    try {
      const { whatsappService } = await import('@/lib/whatsapp-core-service');
      const [allContacts, allMessages] = await Promise.all([
        whatsappService.getContacts(),
        whatsappService.getMessages(50) // Reduzido de 100 para 50
      ]);

      const conversationsMap = new Map<string, Conversation>();

      // Criar conversas apenas com contatos válidos
      allContacts.forEach((contact: WhatsAppContact) => {
        if (contact.id.includes('@g.us')) return; // Skip groups

        conversationsMap.set(contact.id, {
          contact: contact,
          lastMessage: null,
          timestamp: 0,
          unreadCount: 0,
          stage: leadStages[0]
        });
      });

      // Processar mensagens para encontrar últimas mensagens
      allMessages.forEach((message: WhatsAppMessage) => {
        const contactId = message.isFromMe ? message.to : message.from;
        if (contactId.includes('@g.us')) return; // Skip groups

        if (!conversationsMap.has(contactId)) {
          // Criar conversa para número não salvo
          conversationsMap.set(contactId, {
            contact: {
              id: contactId,
              name: message.contact?.name || contactId.split('@')[0],
              pushname: message.contact?.pushname || '',
              number: contactId.split('@')[0],
              isMyContact: false
            },
            lastMessage: null,
            timestamp: 0,
            unreadCount: 0,
            stage: leadStages[0]
          });
        }

        const conversation = conversationsMap.get(contactId)!;
        if (message.timestamp > conversation.timestamp) {
          conversation.lastMessage = message;
          conversation.timestamp = message.timestamp;
        }
      });

      const sortedConversations = Array.from(conversationsMap.values())
        .filter(conv => conv.lastMessage) // Apenas conversas com mensagens
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20); // Limitar a 20 conversas

      setConversations(sortedConversations);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  }, [status.isReady]);

  const loadChatMessages = useCallback(async (chatId: string) => {
    try {
      const { whatsappService } = await import('@/lib/whatsapp-core-service');
      const messages = await whatsappService.getChatMessages(chatId, 30); // Reduzido de 50 para 30
      setChatMessages(messages.sort((a, b) => a.timestamp - b.timestamp));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setChatMessages([]);
    }
  }, []);

  const generateQR = async () => {
    setIsLoading(true);
    setShowQR(true);
    try {
      const { whatsappService } = await import('@/lib/whatsapp-core-service');
      const qrData = await whatsappService.getQRCode();

      if (qrData) {
        setStatus(prev => ({ ...prev, qrCode: qrData.qrImage }));
      }
    } catch (error) {
      console.error('Erro ao gerar QR:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      const { whatsappService } = await import('@/lib/whatsapp-core-service');
      const success = await whatsappService.sendMessage(selectedConversation.contact.id, newMessage);

      if (success) {
        setNewMessage('');
        // Recarregar mensagens após 1 segundo
        setTimeout(() => loadChatMessages(selectedConversation.contact.id), 1000);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  // POLLING ULTRA CONSERVADOR
  useEffect(() => {
    checkStatus();
    // Polling muito mais lento para não sobrecarregar
    const interval = setInterval(() => {
      checkStatus();
    }, status.isReady ? 120000 : 90000); // 2 min se conectado, 1.5 min se desconectado

    return () => clearInterval(interval);
  }, [checkStatus, status.isReady]);

  // Carregar conversas apenas uma vez quando conectar
  useEffect(() => {
    if (status.isReady) {
      loadConversations();
    }
  }, [status.isReady, loadConversations]);

  // Carregar mensagens do chat selecionado
  useEffect(() => {
    if (selectedConversation) {
      loadChatMessages(selectedConversation.contact.id);
    }
  }, [selectedConversation, loadChatMessages]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business</h1>
            <p className="text-sm text-gray-600">Gerencie suas conversas e leads - Versão Otimizada</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {status.isReady ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-600">Desconectado</span>
                </>
              )}
            </div>
            {!status.isReady && (
              <Button
                onClick={generateQR}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <QrCode className="h-4 w-4 mr-2" />
                {isLoading ? 'Gerando...' : 'Gerar QR'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Display */}
      {showQR && status.qrCode && (
        <div className="bg-white border-b p-6 text-center">
          <h2 className="text-lg font-semibold mb-4">Escaneie o QR Code com seu WhatsApp</h2>
          <div className="flex justify-center">
            <img src={status.qrCode} alt="QR Code" className="border rounded-lg" />
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Abra o WhatsApp no seu celular e escaneie este código
          </p>
        </div>
      )}

      {/* Main Content */}
      {status.isReady && (
        <div className="flex-1 flex">
          {/* Sidebar - Lista de Conversas */}
          <div className="w-80 bg-white border-r flex flex-col">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.contact.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    selectedConversation?.contact.id === conversation.contact.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{conversation.contact.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.contact.name}
                        </p>
                        {conversation.lastMessage && (
                          <p className="text-xs text-gray-500">
                            {formatTime(conversation.lastMessage.timestamp)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.lastMessage
                            ? (conversation.lastMessage.isFromMe ? 'Você: ' : '') +
                              (conversation.lastMessage.body.length > 30
                                ? conversation.lastMessage.body.substring(0, 30) + '...'
                                : conversation.lastMessage.body)
                            : 'Sem mensagens'}
                        </p>
                        <Badge className={`ml-2 ${getStageColor(conversation.stage.color)} text-xs`}>
                          {conversation.stage.name}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="bg-white border-b p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {selectedConversation.contact.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">{selectedConversation.contact.name}</h2>
                      <p className="text-sm text-gray-500">{selectedConversation.contact.number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedConversation.stage.id}
                      onValueChange={(value) => {
                        const newStage = leadStages.find(s => s.id === value);
                        if (newStage) {
                          setSelectedConversation(prev => prev ? { ...prev, stage: newStage } : null);
                          setConversations(prev =>
                            prev.map(conv =>
                              conv.contact.id === selectedConversation.contact.id
                                ? { ...conv, stage: newStage }
                                : conv
                            )
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {leadStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStageColor(stage.color)}`} />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.isFromMe
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.body}</p>
                          <p className={`text-xs mt-1 ${
                            message.isFromMe ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                            {message.isFromMe && (
                              <CheckCheck className="inline h-3 w-3 ml-1" />
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="bg-white border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 resize-none"
                      rows={2}
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
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Selecione uma conversa
                  </h3>
                  <p className="text-gray-600">
                    Escolha uma conversa da lista para começar a conversar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}