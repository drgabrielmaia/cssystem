'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Phone, QrCode, Send, Users, Wifi, WifiOff, ExternalLink } from 'lucide-react';
import { whatsappCoreAPI, type WhatsAppStatus, type Contact, type Chat, type Message } from '@/lib/whatsapp-core-api';
import { WhatsAppQRReader } from '@/components/whatsapp-qr-reader';
import Link from 'next/link';

export default function WhatsAppCorePage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const loadMessages = useCallback(async () => {
    try {
      const response = await whatsappCoreAPI.getMessages(50);
      if (response.success && response.data) {
        setChatMessages(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  }, []);

  const loadChats = useCallback(async () => {
    try {
      const response = await whatsappCoreAPI.getChats();
      if (response.success && response.data) {
        setChats(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar chats:', error);
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
      const response = await whatsappCoreAPI.getChatHistory(chatId, 5);
      if (response.success && response.data) {
        setChatMessages(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens do chat:', error);
    }
  }, []);

  const sendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;

    setIsLoading(true);
    try {
      const response = await whatsappCoreAPI.sendMessage(selectedChat.id, newMessage);

      if (response.success) {
        setNewMessage('');

        // Atualizar mensagens imediatamente após enviar
        const messagesResponse = await whatsappCoreAPI.getChatMessages(selectedChat.id, 5);
        if (messagesResponse.success) {
          setChatMessages(messagesResponse.data || []);
        }

        // Também atualizar lista de chats para refletir última mensagem
        const chatsResponse = await whatsappCoreAPI.getChats();
        if (chatsResponse.success) {
          setChats(chatsResponse.data || []);
        }
      } else {
        alert('Erro ao enviar mensagem: ' + response.error);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
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

  useEffect(() => {
    // Configurar Server-Sent Events para atualizações em tempo real
    const eventSource = new EventSource(`http://217.196.60.199:3001/users/default/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'status':
            setStatus(data.data);
            break;

          case 'new_message':
            // Se for uma mensagem do chat atualmente selecionado, atualizar chatMessages
            if (selectedChat && (data.data.from === selectedChat.id || data.data.to === selectedChat.id)) {
              setChatMessages(prev => {
                const exists = prev.find(msg => msg.id === data.data.id);
                if (!exists) {
                  return [data.data, ...prev.slice(0, 49)]; // Manter apenas 50 mensagens
                }
                return prev;
              });
            }
            break;

          case 'chats_updated':
            setChats(data.data);
            break;

          case 'contacts_updated':
            setContacts(prev => {
              const newContacts = data.data.filter((contact: Contact) => contact.isMyContact);
              // Remover duplicatas baseado no ID
              const uniqueContacts = newContacts.filter((contact: Contact, index: number, arr: Contact[]) =>
                arr.findIndex((c: Contact) => c.id === contact.id) === index
              );
              return uniqueContacts;
            });
            break;

          case 'chat_message_update':
            // Atualizar mensagens do chat se for o chat ativo
            if (selectedChat && data.data.chatId === selectedChat.id) {
              setChatMessages(prev => {
                const exists = prev.find(msg => msg.id === data.data.message.id);
                if (!exists) {
                  return [data.data.message, ...prev.slice(0, 49)]; // Newest first
                }
                return prev;
              });
            }
            break;
        }
      } catch (error) {
        console.error('Erro ao processar evento SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Erro na conexão SSE:', error);
      // Tentar reconectar após 5 segundos
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          window.location.reload();
        }
      }, 5000);
    };

    // Carregar dados iniciais uma vez
    checkStatus();
    if (status?.isReady) {
      loadMessages();
      loadChats();
      loadContacts();
    }

    return () => {
      eventSource.close();
    };
  }, []);

  // Remover o useEffect que dependia do status?.isReady pois agora usamos SSE

  useEffect(() => {
    if (selectedChat) {
      loadChatMessages(selectedChat.id);
    }
  }, [selectedChat, loadChatMessages]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">WhatsApp Core Integration</h1>
        <p className="text-gray-600">Sistema WhatsApp usando whatsapp-web.js com arquitetura Bohr.io</p>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>🚀 WhatsApp Core API:</strong> Sistema robusto usando whatsapp-web.js com padrão Bohr.io.
            Conecta diretamente ao WhatsApp Web para mensagens reais!
          </p>
        </div>
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

          {/* Quick QR Code Display */}
          {!status?.isReady && status?.hasQR && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                QR Code disponível! <Link href="/whatsapp/connect" className="text-blue-600 hover:underline">
                  Clique aqui para conectar
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {status?.isReady && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Chats - Aba "Todas" */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Todas as Conversas ({chats.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                {chats.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Carregando conversas...</p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 border-b ${
                        selectedChat?.id === chat.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
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
                            {chat.lastMessage?.body || ''}
                          </p>
                          <p className="text-xs text-gray-400">
                            {chat.lastMessage?.timestamp ? formatTime(chat.lastMessage.timestamp) : ''}
                          </p>
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
                    <div className="space-y-3 flex flex-col">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma mensagem ainda. Envie a primeira!</p>
                        </div>
                      ) : (
                        [...chatMessages].reverse().map((message) => (
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
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {isLoading ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma conversa para ver as últimas 5 mensagens</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}