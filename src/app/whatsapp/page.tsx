'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MessageCircle, Phone, QrCode, Send, Users, Wifi, WifiOff, ExternalLink, Search, RefreshCw } from 'lucide-react';
import { whatsappCoreAPI, type WhatsAppStatus, type Contact, type Chat, type Message } from '@/lib/whatsapp-core-api';
import Link from 'next/link';

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingChat, setIsSyncingChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filtrar chats baseado na busca
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.id.includes(searchTerm) ||
    chat.lastMessage?.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const checkStatus = useCallback(async () => {
    try {
      const response = await whatsappCoreAPI.getStatus();
      if (response.success && response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  }, []);

  const loadChats = useCallback(async () => {
    try {
      console.log('📱 Carregando chats e contatos...');

      // Buscar chats existentes e contatos em paralelo
      const [chatsResponse, contactsResponse] = await Promise.all([
        whatsappCoreAPI.getChats(),
        whatsappCoreAPI.getContacts()
      ]);

      let allChats: Chat[] = [];

      // Adicionar chats existentes (com mensagens) - com deduplicação
      if (chatsResponse.success && chatsResponse.data) {
        // Agrupar chats duplicados por ID
        const chatMap = new Map<string, Chat>();

        chatsResponse.data.forEach(chat => {
          const existingChat = chatMap.get(chat.id);
          if (!existingChat) {
            // Primeiro chat com este ID
            chatMap.set(chat.id, chat);
          } else {
            // Chat duplicado - manter o que tem mensagem mais recente
            if (chat.lastMessage?.timestamp > existingChat.lastMessage?.timestamp) {
              chatMap.set(chat.id, chat);
            }
          }
        });

        allChats = Array.from(chatMap.values());
        console.log(`💬 Chats com mensagens (após deduplicação): ${allChats.length} de ${chatsResponse.data.length} originais`);
      }

      // Adicionar contatos como chats (mesmo sem mensagens)
      if (contactsResponse.success && contactsResponse.data) {
        const contacts = contactsResponse.data.filter(contact => contact.isMyContact);
        console.log(`👥 Contatos encontrados: ${contacts.length}`);

        contacts.forEach(contact => {
          // Só adicionar se não existe chat já
          const existingChat = allChats.find(chat => chat.id === contact.id);
          if (!existingChat) {
            // Criar chat baseado no contato
            const contactChat: Chat = {
              id: contact.id,
              name: contact.name || contact.pushname || contact.number,
              isGroup: contact.id.includes('@g.us'),
              lastMessage: {
                body: 'Clique para iniciar conversa',
                timestamp: Date.now(),
                isFromMe: false
              },
              unreadCount: 0,
              timestamp: Date.now()
            };
            allChats.push(contactChat);
          }
        });
      }

      // Ordenar: chats com mensagens primeiro, depois por nome
      allChats.sort((a, b) => {
        // Se um tem mensagem real e outro não
        const aHasRealMessage = a.lastMessage?.body !== 'Clique para iniciar conversa';
        const bHasRealMessage = b.lastMessage?.body !== 'Clique para iniciar conversa';

        if (aHasRealMessage && !bHasRealMessage) return -1;
        if (!aHasRealMessage && bHasRealMessage) return 1;

        // Se ambos têm mensagens reais, ordenar por timestamp
        if (aHasRealMessage && bHasRealMessage) {
          return b.timestamp - a.timestamp;
        }

        // Se nenhum tem mensagem real, ordenar alfabeticamente
        return a.name.localeCompare(b.name);
      });

      setChats(allChats);
      console.log(`✅ Total de chats carregados: ${allChats.length}`);
    } catch (error) {
      console.error('❌ Erro ao carregar chats:', error);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const response = await whatsappCoreAPI.getContacts();
      if (response.success && response.data) {
        setContacts(response.data.filter(contact => contact.isMyContact));
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    }
  }, []);

  const loadChatMessages = useCallback(async (chatId: string) => {
    // Debounce: cancelar carregamento anterior se ainda não executou
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = setTimeout(async () => {
      try {
        console.log(`📨 Carregando mensagens para: ${chatId}`);
        const response = await whatsappCoreAPI.getChatMessages(chatId, 50);
        if (response.success && response.data) {
          // Ordenar mensagens da mais antiga para mais nova
          const sortedMessages = response.data.sort((a, b) => a.timestamp - b.timestamp);

          setChatMessages(sortedMessages);
          console.log(`✅ ${sortedMessages.length} mensagens carregadas para ${chatId}`);

          // Scroll para o final das mensagens
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else {
          setChatMessages([]);
          console.log('📭 Nenhuma mensagem encontrada');
        }
      } catch (error) {
        console.error('Erro ao carregar mensagens do chat:', error);
        setChatMessages([]);
      }
    }, 300); // Debounce de 300ms
  }, []);

  const sendMessage = async () => {
    if (!selectedChat || !newMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      console.log(`📤 Enviando mensagem para ${selectedChat.id}: ${newMessage}`);

      const response = await whatsappCoreAPI.sendMessage(selectedChat.id, newMessage);

      if (response.success) {
        setNewMessage('');
        console.log('✅ Mensagem enviada com sucesso');

        // Apenas scroll - SSE vai atualizar automaticamente as mensagens
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        console.error('❌ Erro ao enviar:', response.error);
        alert('Erro ao enviar mensagem: ' + response.error);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  const syncCurrentChat = async () => {
    if (!selectedChat || isSyncingChat) return;

    setIsSyncingChat(true);
    try {
      console.log(`🔄 Sincronizando conversa: ${selectedChat.id}`);

      const response = await whatsappCoreAPI.syncChat(selectedChat.id);

      if (response.success && response.data) {
        console.log(`✅ Conversa sincronizada: ${response.data.messageCount} mensagens`);

        // Atualizar mensagens do chat atual
        setChatMessages(response.data.messages || []);

        // Scroll para o final
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        // Feedback visual
        alert(`Conversa atualizada! ${response.data.messageCount} mensagens carregadas.`);
      } else {
        console.error('❌ Erro ao sincronizar:', response.error);
        alert('Erro ao atualizar conversa: ' + response.error);
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar conversa:', error);
      alert('Erro ao atualizar conversa');
    } finally {
      setIsSyncingChat(false);
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp || timestamp <= 0) return '';
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp || timestamp <= 0) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getMessagePreview = (message: any) => {
    if (!message || !message.body || message.body === 'Clique para iniciar conversa') {
      return 'Clique para iniciar conversa';
    }
    const text = String(message.body).trim();
    if (!text) return 'Clique para iniciar conversa';
    return text.length > 45 ? text.substring(0, 45) + '...' : text;
  };

  // SSE para atualizações em tempo real
  useEffect(() => {
    if (!status?.isReady) return;

    console.log('📡 Conectando SSE para atualizações...');
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'}/users/default/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 SSE Update:', data);

        switch (data.type) {
          case 'status':
            setStatus(data.data);
            break;

          case 'new_message':
            console.log('📲 Nova mensagem recebida via SSE');

            // Sempre atualizar lista de chats
            loadChats();

            // Se estamos na conversa ativa, atualizar mensagens apenas se for dessa conversa
            if (selectedChat && data.data) {
              const messageFrom = data.data.isFromMe ? data.data.to : data.data.from;
              console.log(`🔍 Verificando mensagem: ${messageFrom} vs ${selectedChat.id}`);

              if (messageFrom === selectedChat.id) {
                console.log('🔄 Atualizando mensagens do chat ativo');
                loadChatMessages(selectedChat.id);
              }
            }
            break;

          case 'chats_updated':
            loadChats();
            break;

          case 'chat_updated':
            console.log('🔄 Chat atualizado via SSE:', data.data);
            // Se é o chat atual, recarregar mensagens
            if (selectedChat && data.data?.chatId === selectedChat.id) {
              loadChatMessages(selectedChat.id);
            }
            break;

          case 'contacts_updated':
            loadContacts();
            break;
        }
      } catch (error) {
        console.error('❌ Erro ao processar SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Erro na conexão SSE:', error);
    };

    return () => {
      console.log('🔌 Desconectando SSE');
      eventSource.close();
    };
  }, [status?.isReady, selectedChat, loadChats, loadContacts, loadChatMessages]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check status every 10s
    return () => clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    if (status?.isReady) {
      loadChats();
      loadContacts();
    }
  }, [status?.isReady, loadChats, loadContacts]);

  useEffect(() => {
    if (selectedChat) {
      loadChatMessages(selectedChat.id);
    }
  }, [selectedChat, loadChatMessages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header Moderno */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl shadow-lg">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                  WhatsApp Business
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Sistema de mensagens profissional integrado
                </p>
              </div>
            </div>

            {status?.isReady && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-2 bg-green-100 px-3 py-2 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-green-700">Online</span>
                </div>
                <Badge variant="outline" className="bg-white">
                  {filteredChats.length} conversas
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Status e Conexão */}
        <Card className="mb-6 overflow-hidden bg-gradient-to-r from-white to-gray-50 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${
                  status?.isReady
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {status?.isReady ? (
                    <Wifi className="h-6 w-6" />
                  ) : (
                    <WifiOff className="h-6 w-6" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg text-gray-800">Status da Conexão</h3>
                    <Badge
                      variant={status?.isReady ? "default" : "secondary"}
                      className={`${
                        status?.isReady
                          ? 'bg-green-500 hover:bg-green-600'
                          : status?.isConnecting
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-gray-500 hover:bg-gray-600'
                      } px-3 py-1`}
                    >
                      {status?.isReady ? "🟢 Conectado" :
                       status?.isConnecting ? "🟡 Conectando..." :
                       status?.hasQR ? "🔶 QR Code Disponível" : "🔴 Desconectado"}
                    </Badge>
                  </div>

                  {status && (
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{status.contactsCount} contatos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        <span>{status.messagesCount} mensagens</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!status?.isReady && (
                <Link href="/whatsapp/connect">
                  <Button className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg">
                    <QrCode className="h-4 w-4" />
                    Conectar WhatsApp
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {status?.isReady && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Chats */}
            <Card className="bg-white shadow-xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Conversas</h3>
                    <p className="text-green-100 text-sm">{filteredChats.length} ativas</p>
                  </div>
                </CardTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-4 w-4" />
                  <Input
                    placeholder="Buscar conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/70 focus:bg-white/20 focus:border-white/40"
                  />
                </div>
              </CardHeader>
            <CardContent className="p-0 bg-white">
              <ScrollArea className="h-96">
                {filteredChats.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Carregando conversas...</p>
                    <p className="text-sm text-gray-400 mt-1">Aguarde enquanto sincronizamos seus chats</p>
                  </div>
                ) : (
                  filteredChats.map((chat, index) => (
                    <div
                      key={chat.id}
                      className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50 hover:to-transparent border-b border-gray-100 ${
                        selectedChat?.id === chat.id
                          ? 'bg-gradient-to-r from-green-100 to-green-50 border-green-200 shadow-sm'
                          : ''
                      }`}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12 shadow-sm">
                            <AvatarFallback className="bg-gradient-to-br from-green-100 to-green-200 text-green-700 font-semibold">
                              {getInitials(chat.name || chat.id)}
                            </AvatarFallback>
                          </Avatar>
                          {chat.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">
                              {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {chat.name === chat.id ? chat.id.split('@')[0] : chat.name}
                            </h4>
                            {chat.lastMessage?.timestamp && chat.lastMessage.timestamp > 0 && (
                              <span className="text-xs text-gray-400 font-medium">
                                {formatTime(chat.lastMessage.timestamp)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {chat.lastMessage?.isFromMe && (
                              <svg className="w-3 h-3 text-gray-400" viewBox="0 0 16 15">
                                <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
                              </svg>
                            )}
                            <p className="text-sm text-gray-600 truncate flex-1">
                              {getMessagePreview(chat.lastMessage)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat */}
          <Card className="lg:col-span-2 overflow-hidden shadow-xl border-0 bg-white">
            {selectedChat && (
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white border-b-0 pb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-white/20">
                      <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                        {getInitials(selectedChat.name || selectedChat.id)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-white">
                      {selectedChat.name === selectedChat.id
                        ? selectedChat.id.split('@')[0]
                        : selectedChat.name
                      }
                    </CardTitle>
                    <p className="text-sm text-green-100 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                      {selectedChat.isGroup ? 'Grupo ativo' : 'Online agora'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0"
                      onClick={syncCurrentChat}
                      disabled={isSyncingChat}
                      title="Atualizar conversa"
                    >
                      <RefreshCw className={`h-5 w-5 ${isSyncingChat ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0">
                      <Phone className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0">
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            )}
            <CardContent className={selectedChat ? "p-0" : ""}>
              {selectedChat ? (
                <div className="flex flex-col h-[500px]">
                  {/* Mensagens - Estilo WhatsApp */}
                  <div className="flex-1 overflow-y-auto bg-[#f0f2f5] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXRoIGlkPSJhIiBkPSJtMjAgMjAgMjAtMjBIMjB2MjB6Ii8+CiAgPC9kZWZzPgogIDx1c2UgZmlsbD0iI2ZmZmZmZjA1IiBocmVmPSIjYSIvPgo8L3N2Zz4=')] p-4">
                    <div className="space-y-2">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma mensagem ainda. Envie a primeira!</p>
                        </div>
                      ) : (
                        chatMessages.map((message, index) => {
                          const showDate = index === 0 ||
                            formatDate(message.timestamp) !== formatDate(chatMessages[index - 1]?.timestamp);

                          return (
                            <div key={message.id}>
                              {/* Separador de data */}
                              {showDate && (
                                <div className="flex justify-center my-4">
                                  <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-600 shadow-sm">
                                    {formatDate(message.timestamp)}
                                  </div>
                                </div>
                              )}

                              {/* Mensagem */}
                              <div
                                className={`flex mb-1 ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className="flex flex-col max-w-xs lg:max-w-md">
                                  <div
                                    className={`relative px-3 py-2 rounded-lg shadow-sm ${
                                      message.isFromMe
                                        ? 'bg-[#dcf8c6] text-gray-800 rounded-br-none'
                                        : 'bg-white text-gray-800 rounded-bl-none'
                                    }`}
                                  >
                                    {/* Texto da mensagem */}
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                      {message.body}
                                    </p>

                                    {/* Horário e status */}
                                    <div className={`flex items-center gap-1 mt-1 ${
                                      message.isFromMe ? 'justify-end' : 'justify-start'
                                    }`}>
                                      <span className="text-xs text-gray-500">
                                        {formatTime(message.timestamp)}
                                      </span>
                                      {message.isFromMe && (
                                        <div className="flex">
                                          {/* Check duplo (entregue e lido) */}
                                          <svg className="w-3 h-3 text-[#4fc3f7]" viewBox="0 0 16 15">
                                            <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l3.61 3.463c.143.14.361.125.484-.033l8.168-8.048a.365.365 0 0 0-.064-.512z"/>
                                          </svg>
                                        </div>
                                      )}
                                    </div>

                                    {/* Rabinho da mensagem */}
                                    <div
                                      className={`absolute top-0 w-3 h-3 ${
                                        message.isFromMe
                                          ? '-right-1 bg-[#dcf8c6]'
                                          : '-left-1 bg-white'
                                      }`}
                                      style={{
                                        clipPath: message.isFromMe
                                          ? 'polygon(0% 0%, 100% 100%, 0% 100%)'
                                          : 'polygon(100% 0%, 100% 100%, 0% 100%)'
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      {/* Referência para scroll automático */}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Input de nova mensagem - Estilo WhatsApp */}
                  <div className="bg-[#f0f2f5] px-4 py-3 flex items-end gap-3">
                    <div className="flex-1 bg-white rounded-3xl px-4 py-2 flex items-center gap-2 shadow-sm">
                      <Textarea
                        placeholder="Digite uma mensagem"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 border-none resize-none min-h-[24px] max-h-32 p-0 focus:ring-0 focus:outline-none bg-transparent"
                        rows={1}
                        style={{ height: 'auto' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = '24px';
                          target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                        }}
                      />
                    </div>

                    {newMessage.trim() ? (
                      <Button
                        onClick={sendMessage}
                        disabled={isLoading}
                        size="sm"
                        className="rounded-full w-10 h-10 p-0 bg-[#00a884] hover:bg-[#008f72] shadow-sm"
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Send className="h-4 w-4 text-white" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full w-10 h-10 p-0 text-gray-500"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-[500px] flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-500">
                  <div className="text-center max-w-md">
                    <div className="bg-gradient-to-r from-green-400 to-green-500 p-6 rounded-full mx-auto mb-6 w-24 h-24 flex items-center justify-center shadow-lg">
                      <MessageCircle className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-light mb-3 text-gray-700">WhatsApp Business</h3>
                    <p className="text-gray-600 mb-2">
                      {filteredChats.length > 0
                        ? 'Selecione uma conversa para começar a enviar mensagens'
                        : 'Carregando suas conversas...'
                      }
                    </p>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 mt-6">
                      <p className="text-sm text-gray-500">
                        💬 Envie e receba mensagens profissionais
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        🚀 Integração completa com seu sistema
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  );
}