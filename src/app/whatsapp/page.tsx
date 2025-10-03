'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MessageCircle, Phone, QrCode, Send, Users, Wifi, WifiOff, ExternalLink, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');

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

      // Adicionar chats existentes (com mensagens)
      if (chatsResponse.success && chatsResponse.data) {
        allChats = [...chatsResponse.data];
        console.log(`💬 Chats com mensagens: ${chatsResponse.data.length}`);
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
    try {
      console.log(`📨 Carregando mensagens para: ${chatId}`);
      const response = await whatsappCoreAPI.getChatHistory(chatId, 50);
      if (response.success && response.data) {
        setChatMessages(response.data);
        console.log(`✅ ${response.data.length} mensagens carregadas`);
      } else {
        setChatMessages([]);
        console.log('📭 Nenhuma mensagem encontrada');
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens do chat:', error);
      setChatMessages([]);
    }
  }, []);

  const sendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;

    setIsLoading(true);
    try {
      console.log(`📤 Enviando mensagem para ${selectedChat.id}: ${newMessage}`);

      const response = await whatsappCoreAPI.sendMessage(selectedChat.id, newMessage);

      if (response.success) {
        setNewMessage('');
        console.log('✅ Mensagem enviada com sucesso');

        // Atualizar mensagens do chat
        setTimeout(() => {
          loadChatMessages(selectedChat.id);
          loadChats(); // Atualizar lista para mostrar última mensagem
        }, 1000);
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

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getMessagePreview = (message: any) => {
    if (!message || message.body === 'Clique para iniciar conversa') {
      return 'Clique para iniciar conversa';
    }
    const text = message.body || '';
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
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
            console.log('📲 Nova mensagem recebida');
            loadChats(); // Atualizar lista de chats

            // Se estamos na conversa ativa, atualizar mensagens
            if (selectedChat) {
              const messageFrom = data.data.isFromMe ? data.data.to : data.data.from;
              if (messageFrom === selectedChat.id) {
                loadChatMessages(selectedChat.id);
              }
            }
            break;

          case 'chats_updated':
            loadChats();
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">WhatsApp Integration</h1>
        <p className="text-gray-600">Sistema WhatsApp completo usando API Baileys</p>
      </div>

      {/* Status e Conexão */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.isReady ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Status da Conexão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={status?.isReady ? "default" : "secondary"}>
                {status?.isReady ? "Conectado" :
                 status?.isConnecting ? "Conectando..." :
                 status?.hasQR ? "QR Code Disponível" : "Desconectado"}
              </Badge>

              {status && (
                <div className="text-sm text-gray-600">
                  <span>Contatos: {status.contactsCount}</span>
                  <span className="ml-4">Mensagens: {status.messagesCount}</span>
                </div>
              )}

              {!status?.isReady && (
                <Link href="/whatsapp/connect">
                  <Button className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Ver QR Code
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {status?.isReady && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Chats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversas ({filteredChats.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                {filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Carregando conversas...</p>
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 border-b transition-colors ${
                        selectedChat?.id === chat.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-green-100 text-green-700">
                            {getInitials(chat.name || chat.id)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {chat.name === chat.id ? chat.id.split('@')[0] : chat.name}
                            </p>
                            {chat.unreadCount > 0 && (
                              <Badge variant="default" className="bg-green-500 text-white text-xs">
                                {chat.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {getMessagePreview(chat.lastMessage)}
                          </p>
                          {chat.lastMessage?.timestamp && chat.lastMessage.timestamp > 0 && (
                            <p className="text-xs text-gray-400">
                              {formatTime(chat.lastMessage.timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {selectedChat
                  ? `Chat: ${selectedChat.name === selectedChat.id ? selectedChat.id.split('@')[0] : selectedChat.name}`
                  : "Selecione uma conversa"
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedChat ? (
                <div className="space-y-4">
                  {/* Mensagens */}
                  <ScrollArea className="h-80 p-4 border rounded">
                    <div className="space-y-3">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma mensagem ainda. Envie a primeira!</p>
                        </div>
                      ) : (
                        chatMessages.map((message) => (
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
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input de nova mensagem */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 min-h-[40px] max-h-32"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isLoading}
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
                    >
                      <Send className="h-4 w-4" />
                      {isLoading ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma conversa para começar</p>
                  <p className="text-sm mt-2">
                    {filteredChats.length > 0
                      ? 'Escolha uma conversa da lista ao lado'
                      : 'Carregando suas conversas...'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}