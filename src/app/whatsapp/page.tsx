'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PageLayout } from '@/components/ui/page-layout';
import { ChartCard } from '@/components/ui/chart-card';
import { MetricCard } from '@/components/ui/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Phone, QrCode, Send, Users, Wifi, WifiOff, ExternalLink, Search, RefreshCw, Settings, Clock, X, CalendarDays, Plus, Trash2 } from 'lucide-react';
import { whatsappCoreAPI, type WhatsAppStatus, type Contact, type Chat, type Message } from '@/lib/whatsapp-core-api';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function WhatsAppPage() {
  const { user } = useAuth();

  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingChat, setIsSyncingChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAutoMessageModal, setShowAutoMessageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [adminPhone, setAdminPhone] = useState('+5583996910414'); // Número padrão
  const [autoMessages, setAutoMessages] = useState([
    {
      id: '1',
      message: '',
      scheduledDate: '',
      scheduledTime: '',
      targetGroup: '',
      photoUrl: '',
      photoCaption: '',
      isActive: true
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filtrar chats baseado na busca
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.id.includes(searchTerm) ||
    chat.lastMessage?.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchQRCode = useCallback(async () => {
    try {
      console.log('📱 Buscando QR code...');
      const response = await whatsappCoreAPI.getQRCode();
      if (response.success && response.data?.qr) {
        setQrCode(response.data.qr);
        console.log('✅ QR Code obtido com sucesso');
      } else {
        console.log('📭 QR Code não disponível ainda');
        setQrCode(null);
      }
    } catch (error) {
      console.error('Erro ao buscar QR code:', error);
      setQrCode(null);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const response = await whatsappCoreAPI.getStatus();
      if (response.success && response.data) {
        setStatus(response.data);

        // Se o usuário não está registrado e não está conectando, iniciar registro
        if (!response.data.isReady && !response.data.isConnecting && !response.data.hasQR) {
          console.log('🔄 Usuário não registrado, iniciando registro automático...');
          try {
            const registerResponse = await whatsappCoreAPI.registerUser();
            if (registerResponse.success) {
              console.log('✅ Registro iniciado:', registerResponse.data?.message || 'Registro iniciado com sucesso');
              // Aguardar um momento e verificar status novamente
              setTimeout(checkStatus, 3000);
            }
          } catch (registerError) {
            console.error('Erro ao registrar usuário:', registerError);
          }
        }

        // Se tem QR disponível, buscar o QR code
        if (response.data.hasQR && !response.data.isReady) {
          fetchQRCode();
        } else if (response.data.isReady) {
          setQrCode(null); // Limpar QR quando conectado
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  }, [fetchQRCode]);

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

  const addAutoMessage = () => {
    const newMessage = {
      id: Date.now().toString(),
      message: '',
      scheduledDate: '',
      scheduledTime: '',
      targetGroup: '',
      photoUrl: '',
      photoCaption: '',
      isActive: true
    };
    setAutoMessages([...autoMessages, newMessage]);
  };

  const removeAutoMessage = (id: string) => {
    setAutoMessages(autoMessages.filter(msg => msg.id !== id));
  };

  const updateAutoMessage = (id: string, field: string, value: string) => {
    setAutoMessages(autoMessages.map(msg =>
      msg.id === id ? { ...msg, [field]: value } : msg
    ));
  };

  const loadAutoMessages = useCallback(async () => {
    try {
      // Para mensagens automáticas, ainda usar 'default' por enquanto
      const response = await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'}/auto-messages?userId=default`);
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        const loadedMessages = data.data.map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          message: msg.message || '',
          scheduledDate: msg.scheduled_date || '',
          scheduledTime: msg.scheduled_time || '',
          targetGroup: msg.target_group || '',
          photoUrl: msg.photo_url || '',
          photoCaption: msg.photo_caption || '',
          isActive: msg.is_active !== false
        }));
        setAutoMessages(loadedMessages);
        console.log('✅ Mensagens automáticas carregadas:', loadedMessages.length);
        console.log('📋 Dados brutos do servidor:', data.data);
        console.log('🔄 Dados mapeados:', loadedMessages);
      } else {
        // Se não há mensagens cadastradas, manter o estado inicial com uma mensagem vazia
        console.log('📭 Nenhuma mensagem automática encontrada');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens automáticas:', error);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      console.log('📋 Carregando configurações da organização...');

      // Buscar organização do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ Usuário não autenticado, usando configurações padrão');
        return;
      }

      // Buscar organização por email
      const { data: orgData, error: orgError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('email', user.email)
        .single();

      let organizationId = null;

      if (orgError) {
        console.log('🔍 Organização não encontrada via organization_users, tentando organizations...');
        // Fallback: buscar diretamente na tabela organizations
        const { data: orgDirectData, error: orgDirectError } = await supabase
          .from('organizations')
          .select('id, admin_phone')
          .eq('owner_email', user.email)
          .single();

        if (!orgDirectError && orgDirectData) {
          organizationId = orgDirectData.id;
          if (orgDirectData.admin_phone) {
            setAdminPhone(orgDirectData.admin_phone);
            console.log('✅ Admin phone carregado da organização:', orgDirectData.admin_phone);
            return;
          }
        }
      } else {
        organizationId = orgData.organization_id;
      }

      if (organizationId) {
        // Buscar configurações da organização
        const { data: orgSettings, error: settingsError } = await supabase
          .from('organizations')
          .select('admin_phone')
          .eq('id', organizationId)
          .single();

        if (!settingsError && orgSettings?.admin_phone) {
          setAdminPhone(orgSettings.admin_phone);
          console.log('✅ Admin phone carregado:', orgSettings.admin_phone);
        } else {
          console.log('ℹ️ Sem configurações salvas, usando padrão');
        }
      } else {
        console.log('ℹ️ Organização não encontrada, usando configurações padrão');
      }

    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      // Fallback para localStorage se Supabase falhar
      const savedSettings = localStorage.getItem('whatsapp_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setAdminPhone(settings.adminPhone || '+5583996910414');
      }
    }
  }, []);

  const saveSettings = async () => {
    try {
      console.log('💾 Salvando configurações no banco de dados...');

      // Buscar organização do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Erro: Usuário não autenticado');
        return;
      }

      // Buscar organização por email
      const { data: orgData, error: orgError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('email', user.email)
        .single();

      let organizationId = null;

      if (orgError) {
        // Fallback: buscar diretamente na tabela organizations
        const { data: orgDirectData, error: orgDirectError } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_email', user.email)
          .single();

        if (orgDirectError || !orgDirectData) {
          console.error('❌ Organização não encontrada');
          alert('Erro: Organização não encontrada');
          return;
        }
        organizationId = orgDirectData.id;
      } else {
        organizationId = orgData.organization_id;
      }

      console.log('🏢 Salvando para organização:', organizationId);

      // Atualizar admin_phone na organização
      const { data: updateData, error: updateError } = await supabase
        .from('organizations')
        .update({
          admin_phone: adminPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)
        .select();

      if (updateError) {
        console.error('❌ Erro ao salvar no banco:', updateError);

        // Se falhar, salvar no localStorage como fallback
        const settings = {
          adminPhone,
          whatsappNotifications: true,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('whatsapp_settings', JSON.stringify(settings));

        alert('Configurações salvas localmente (erro no banco de dados)');
        setShowSettingsModal(false);
        return;
      }

      console.log('✅ Configurações salvas no banco:', updateData);
      alert('Configurações salvas com sucesso!');
      setShowSettingsModal(false);

    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);

      // Fallback para localStorage
      const settings = {
        adminPhone,
        whatsappNotifications: true,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('whatsapp_settings', JSON.stringify(settings));

      alert('Configurações salvas localmente (erro no sistema)');
      setShowSettingsModal(false);
    }
  };

  const saveAutoMessages = async () => {
    try {
      // Para mensagens automáticas, ainda usar 'default' por enquanto

      // Debug: mostrar dados antes de enviar
      console.log('🔍 AutoMessages antes de salvar:', autoMessages);

      const messagesToSave = autoMessages.filter(msg => msg.message && msg.scheduledTime && msg.targetGroup).map(msg => ({
        ...msg,
        scheduled_date: msg.scheduledDate || null,
        scheduled_time: msg.scheduledTime,
        target_group: msg.targetGroup,
        photo_url: msg.photoUrl || null,
        photo_caption: msg.photoCaption || null,
        is_active: msg.isActive
      }));

      console.log('📤 Mensagens que serão enviadas:', messagesToSave);

      const response = await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'}/auto-messages/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'default',
          autoMessages: messagesToSave
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message || 'Mensagens automáticas configuradas com sucesso!');
        setShowAutoMessageModal(false);
        loadAutoMessages(); // Recarregar mensagens após salvar
        console.log('✅ Mensagens automáticas salvas:', data.data);
      } else {
        alert('Erro ao salvar mensagens automáticas: ' + data.error);
        console.error('❌ Erro:', data.error);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar mensagens automáticas:', error);
      alert('Erro ao conectar com o servidor. Tente novamente.');
    }
  };

  // SSE para atualizações em tempo real
  useEffect(() => {
    if (!status?.isReady) return;

    console.log('📡 Conectando SSE para atualizações...');
    // Por enquanto usar 'default' para SSE, será atualizado para organizationId depois
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
      loadAutoMessages();
    }
    // Carregar configurações sempre que o componente montar
    loadSettings();
  }, [status?.isReady, loadChats, loadContacts, loadAutoMessages, loadSettings]);

  useEffect(() => {
    if (selectedChat) {
      loadChatMessages(selectedChat.id);
    }
  }, [selectedChat, loadChatMessages]);

  return (
    <PageLayout
      title="WhatsApp Business"
      subtitle="Sistema de mensagens profissional integrado"
    >
      {/* Actions */}
      {status?.isReady && (
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setShowAutoMessageModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors"
          >
            <Clock className="w-4 h-4" />
            Mensagens Automáticas
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
          <div className="hidden lg:flex items-center gap-2 bg-green-50 px-3 py-2 rounded-xl border border-green-200">
            <div className="w-2 h-2 bg-[#059669] rounded-full animate-pulse" />
            <span className="text-sm font-medium text-[#059669]">Online</span>
          </div>
        </div>
      )}
      {/* Métricas de Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Status da Conexão"
          value={status?.isReady ? "Conectado" : "Desconectado"}
          change={0}
          icon={status?.isReady ? Wifi : WifiOff}
          iconColor={status?.isReady ? "green" : "orange"}
        />
        <MetricCard
          title="Contatos"
          value={status?.contactsCount?.toString() || "0"}
          change={0}
          icon={Users}
          iconColor="blue"
        />
        <MetricCard
          title="Mensagens"
          value={status?.messagesCount?.toString() || "0"}
          change={0}
          icon={MessageCircle}
          iconColor="purple"
        />
        <MetricCard
          title="Conversas Ativas"
          value={filteredChats.length.toString()}
          change={0}
          icon={MessageCircle}
          iconColor="orange"
        />
      </div>

      {/* Alerta de Conexão */}
      {!status?.isReady && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-2xl p-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-orange-500" />
              <div className="flex-1">
                <p className="font-semibold text-orange-800">WhatsApp não conectado</p>
                <p className="text-sm text-orange-700">
                  {status?.hasQR ? 'Escaneie o QR code com seu WhatsApp' : 'Conecte seu WhatsApp Business para começar a enviar mensagens'}
                </p>
              </div>
              {!qrCode && (
                <Link href={`/whatsapp/connect?userId=default`}>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors">
                    <QrCode className="w-4 h-4" />
                    Conectar WhatsApp
                  </button>
                </Link>
              )}
            </div>

            {/* QR Code Display */}
            {qrCode && (
              <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-xl border border-orange-200">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="w-48 h-48"
                  />
                </div>
                <div className="text-center">
                  <p className="font-medium text-orange-800">Escaneie com seu WhatsApp</p>
                  <p className="text-sm text-orange-600 mt-1">
                    Abra o WhatsApp → Menu (3 pontos) → Dispositivos conectados → Conectar dispositivo
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status?.isReady && (
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
      )}

      {/* Modal de Mensagens Automáticas */}
      <Dialog open={showAutoMessageModal} onOpenChange={setShowAutoMessageModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              Configurar Mensagens Automáticas
            </DialogTitle>
            <p className="text-gray-600">
              Configure mensagens para serem enviadas automaticamente em horários específicos
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Header com instruções */}
            <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <CalendarDays className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-800 mb-2">Como funciona:</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Configure múltiplas mensagens para diferentes horários</li>
                      <li>• Selecione os grupos ou contatos que receberão as mensagens</li>
                      <li>• As mensagens serão enviadas automaticamente nos horários definidos</li>
                      <li>• Adicione fotos usando uma URL pública (opcional)</li>
                      <li>• Não é necessário estar logado para o envio automático</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botão para recarregar mensagens */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={loadAutoMessages}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Recarregar Mensagens
              </Button>
            </div>

            {/* Lista de mensagens configuradas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Mensagens Programadas</h3>
                <Button
                  onClick={addAutoMessage}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Mensagem
                </Button>
              </div>

              {autoMessages.map((autoMsg, index) => (
                <Card key={autoMsg.id} className="border-2 border-gray-200 hover:border-green-300 transition-colors">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-white pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-800">Mensagem {index + 1}</h4>
                      {autoMessages.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAutoMessage(autoMsg.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    {/* Data e Horário */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`date-${autoMsg.id}`} className="text-sm font-medium">
                          Data de Envio
                        </Label>
                        <Input
                          id={`date-${autoMsg.id}`}
                          type="date"
                          value={autoMsg.scheduledDate}
                          onChange={(e) => updateAutoMessage(autoMsg.id, 'scheduledDate', e.target.value)}
                          className="mt-1"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`time-${autoMsg.id}`} className="text-sm font-medium">
                          Horário de Envio
                        </Label>
                        <Input
                          id={`time-${autoMsg.id}`}
                          type="time"
                          value={autoMsg.scheduledTime}
                          onChange={(e) => updateAutoMessage(autoMsg.id, 'scheduledTime', e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      {/* Grupo/Contato de destino */}
                      <div>
                        <Label htmlFor={`target-${autoMsg.id}`} className="text-sm font-medium">
                          Destino
                        </Label>
                        <Select
                          value={autoMsg.targetGroup}
                          onValueChange={(value) => updateAutoMessage(autoMsg.id, 'targetGroup', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione o grupo ou contato" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredChats.map((chat) => (
                              <SelectItem key={chat.id} value={chat.id}>
                                {chat.name === chat.id ? chat.id.split('@')[0] : chat.name}
                                {chat.isGroup && ' (Grupo)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Mensagem */}
                    <div>
                      <Label htmlFor={`message-${autoMsg.id}`} className="text-sm font-medium">
                        Mensagem
                      </Label>
                      <Textarea
                        id={`message-${autoMsg.id}`}
                        placeholder="Digite a mensagem que será enviada automaticamente..."
                        value={autoMsg.message}
                        onChange={(e) => updateAutoMessage(autoMsg.id, 'message', e.target.value)}
                        className="mt-1 min-h-[100px]"
                      />
                    </div>

                    {/* Foto (opcional) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`photo-url-${autoMsg.id}`} className="text-sm font-medium">
                          URL da Foto (opcional)
                        </Label>
                        <Input
                          id={`photo-url-${autoMsg.id}`}
                          type="url"
                          placeholder="https://exemplo.com/imagem.jpg"
                          value={autoMsg.photoUrl}
                          onChange={(e) => updateAutoMessage(autoMsg.id, 'photoUrl', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`photo-caption-${autoMsg.id}`} className="text-sm font-medium">
                          Legenda da Foto (opcional)
                        </Label>
                        <Input
                          id={`photo-caption-${autoMsg.id}`}
                          placeholder="Legenda da imagem..."
                          value={autoMsg.photoCaption}
                          onChange={(e) => updateAutoMessage(autoMsg.id, 'photoCaption', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Preview da configuração */}
                    {autoMsg.scheduledDate && autoMsg.scheduledTime && autoMsg.targetGroup && autoMsg.message && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <div className="bg-green-100 p-1 rounded">
                            <Clock className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="text-sm">
                            <p className="text-green-800 font-medium">
                              Será enviado em {new Date(autoMsg.scheduledDate).toLocaleDateString('pt-BR')} às {autoMsg.scheduledTime} para{' '}
                              {filteredChats.find(c => c.id === autoMsg.targetGroup)?.name || autoMsg.targetGroup}
                            </p>
                            {autoMsg.photoUrl && (
                              <p className="text-green-600 mt-1">
                                📸 Com foto: {autoMsg.photoCaption || 'Sem legenda'}
                              </p>
                            )}
                            <p className="text-green-600 mt-1 italic">
                              "{autoMsg.message.substring(0, 100)}{autoMsg.message.length > 100 ? '...' : ''}"
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Botões de ação */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAutoMessageModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={saveAutoMessages}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                disabled={!autoMessages.some(msg => msg.message && msg.scheduledDate && msg.scheduledTime && msg.targetGroup)}
              >
                Salvar Configurações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Configurações */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações do WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label htmlFor="admin-phone" className="text-sm font-medium">
                Número do Administrador
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Número que receberá notificações de agendamentos e calendário diário
              </p>
              <Input
                id="admin-phone"
                type="tel"
                placeholder="+5583996910414"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Formato: +55DDNNNNNNNNN (Ex: +5583996910414)
              </p>
            </div>

            {adminPhone && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="bg-blue-100 p-1 rounded">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <p className="text-blue-800 font-medium">
                      Administrador configurado: {adminPhone}
                    </p>
                    <p className="text-blue-600 mt-1">
                      ✅ Receberá notificações de agendamentos<br/>
                      ✅ Receberá calendário diário<br/>
                      ✅ Receberá confirmações de calls
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowSettingsModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={saveSettings}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                disabled={!adminPhone || adminPhone.length < 10}
              >
                Salvar Configurações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}