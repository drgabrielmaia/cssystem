'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Phone, QrCode, Send, Users, Wifi, WifiOff,
  Search, RefreshCw, Settings, Clock, X, CalendarDays, Plus,
  Trash2, Paperclip, Image as ImageIcon, Mic, ChevronLeft,
  Star, StickyNote, History, User, Building2, Mail, Tag,
  AlertCircle, Check, CheckCheck, Pin, Filter, MoreVertical,
  FileText, ArrowLeft, Loader2
} from 'lucide-react';
import { whatsappMultiService, type WhatsAppStatus, type Contact, type Chat, type Message } from '@/lib/whatsapp-multi-service';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────
interface LeadInfo {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  empresa: string;
  cargo: string;
  origem: string;
  status: string;
  temperatura: string;
  lead_score: number;
  tags: string[];
  observacoes: string;
  valor_potencial: number;
  created_at: string;
}

interface LeadNote {
  id: number;
  lead_id: string;
  nota: string;
  tipo: string;
  categoria: string;
  is_important: boolean;
  responsavel: string;
  created_at: string;
}

type ContactTab = 'conversa' | 'detalhes' | 'anotacoes' | 'historico';

// ─── Component ──────────────────────────────────────────────────
export default function WhatsAppPage() {
  const { user } = useAuth();

  // Core state
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingChat, setIsSyncingChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<ContactTab>('conversa');
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showAutoMessageModal, setShowAutoMessageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [adminPhone, setAdminPhone] = useState('+5583996910414');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Lead/notes state
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoadingLead, setIsLoadingLead] = useState(false);

  // Image state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [isSendingImage, setIsSendingImage] = useState(false);

  // Auto messages
  const [autoMessages, setAutoMessages] = useState([{
    id: '1', message: '', scheduledDate: '', scheduledTime: '',
    targetGroup: '', photoUrl: '', photoCaption: '', isActive: true
  }]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Filtered chats ─────────────────────────────────────────
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.id.includes(searchTerm) ||
    chat.lastMessage?.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─── Connection check ──────────────────────────────────────
  const checkWhatsAppConnection = useCallback(async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );
      const response = await Promise.race([
        whatsappMultiService.getStatus(),
        timeoutPromise
      ]) as any;

      const isConnected = response?.success && (
        response.data?.isReady ||
        response.data?.status === 'connected' ||
        response.data?.state === 'CONNECTED' ||
        response.isReady === true
      );

      if (isConnected) {
        setIsWhatsAppConnected(true);
        setIsLoadingStatus(false);
        try {
          await Promise.all([
            loadChats().catch(() => {}),
            loadContacts().catch(() => {}),
            loadAutoMessages().catch(() => {})
          ]);
        } catch {}
      } else {
        setIsWhatsAppConnected(false);
        setIsLoadingStatus(false);
      }
    } catch {
      setIsWhatsAppConnected(false);
      setIsLoadingStatus(false);
    }
  }, []);

  // ─── Load chats ────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    try {
      const chatTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      const [chatsResponse, contactsResponse] = await Promise.race([
        Promise.all([
          whatsappMultiService.getChats().catch(() => ({ success: false, data: [] })),
          whatsappMultiService.getContacts().catch(() => ({ success: false, data: [] }))
        ]),
        chatTimeout
      ]) as any;

      let allChats: Chat[] = [];

      if (chatsResponse.success && chatsResponse.data) {
        const chatMap = new Map<string, Chat>();
        chatsResponse.data.forEach((chat: any) => {
          const existing = chatMap.get(chat.id);
          if (!existing || (chat.lastMessage?.timestamp > existing.lastMessage?.timestamp)) {
            chatMap.set(chat.id, chat);
          }
        });
        allChats = Array.from(chatMap.values());
      }

      if (contactsResponse.success && contactsResponse.data) {
        contactsResponse.data
          .filter((c: any) => c.isMyContact)
          .forEach((contact: any) => {
            if (!allChats.find(chat => chat.id === contact.id)) {
              allChats.push({
                id: contact.id,
                name: contact.name || contact.pushname || contact.number,
                isGroup: contact.id.includes('@g.us'),
                lastMessage: { body: '', timestamp: 0, isFromMe: false },
                unreadCount: 0,
                timestamp: 0
              });
            }
          });
      }

      allChats.sort((a, b) => {
        const aHas = a.lastMessage?.body && a.lastMessage.body !== '';
        const bHas = b.lastMessage?.body && b.lastMessage.body !== '';
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (aHas && bHas) return (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0);
        return a.name.localeCompare(b.name);
      });

      setChats(allChats);
    } catch {}
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const response = await whatsappMultiService.getContacts();
      if (response.success && response.data) {
        setContacts(response.data.filter(c => c.isMyContact));
      }
    } catch {}
  }, []);

  // ─── Load messages ─────────────────────────────────────────
  const loadChatMessages = useCallback(async (chatId: string) => {
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

    loadingTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await whatsappMultiService.getChatMessages(chatId, 50);
        if (response.success && response.data) {
          const sorted = response.data.sort((a, b) => a.timestamp - b.timestamp);
          setChatMessages(sorted);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } else {
          setChatMessages([]);
        }
      } catch {
        setChatMessages([]);
      }
    }, 300);
  }, []);

  // ─── Send message ──────────────────────────────────────────
  const sendMessage = async () => {
    if (!selectedChat || !newMessage.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const response = await whatsappMultiService.sendMessage(selectedChat.id, newMessage);
      if (response.success) {
        setNewMessage('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        alert('Erro ao enviar: ' + response.error);
      }
    } catch {
      alert('Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Send image ────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const sendImage = async () => {
    if (!selectedChat || !imagePreview || isSendingImage) return;
    setIsSendingImage(true);
    try {
      const response = await whatsappMultiService.sendImage(
        selectedChat.id, imagePreview, imageCaption
      );
      if (response.success) {
        setSelectedImage(null);
        setImagePreview('');
        setImageCaption('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        alert('Erro ao enviar imagem: ' + response.error);
      }
    } catch {
      alert('Erro ao enviar imagem');
    } finally {
      setIsSendingImage(false);
    }
  };

  const cancelImage = () => {
    setSelectedImage(null);
    setImagePreview('');
    setImageCaption('');
  };

  // ─── Sync chat ─────────────────────────────────────────────
  const syncCurrentChat = async () => {
    if (!selectedChat || isSyncingChat) return;
    setIsSyncingChat(true);
    try {
      const response = await whatsappMultiService.syncChat(selectedChat.id);
      if (response.success && response.data) {
        setChatMessages(response.data.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch {} finally {
      setIsSyncingChat(false);
    }
  };

  // ─── Lead lookup ───────────────────────────────────────────
  const lookupLead = useCallback(async (chatId: string) => {
    setIsLoadingLead(true);
    setLeadInfo(null);
    setLeadNotes([]);
    try {
      const phoneClean = chatId.replace(/@.*$/, '');
      const last9 = phoneClean.slice(-9);

      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .ilike('telefone', `%${last9}`)
        .limit(1);

      if (leads && leads.length > 0) {
        setLeadInfo(leads[0] as LeadInfo);
        // Load notes
        const { data: notes } = await supabase
          .from('lead_notes')
          .select('*')
          .eq('lead_id', leads[0].id)
          .order('created_at', { ascending: false });

        if (notes) setLeadNotes(notes as LeadNote[]);
      }
    } catch {} finally {
      setIsLoadingLead(false);
    }
  }, []);

  // ─── Add note ──────────────────────────────────────────────
  const addNote = async () => {
    if (!leadInfo || !newNote.trim()) return;
    try {
      const { data, error } = await supabase
        .from('lead_notes')
        .insert({
          lead_id: leadInfo.id,
          nota: newNote.trim(),
          tipo: 'geral',
          categoria: 'whatsapp',
          is_important: false,
          responsavel: user?.email || 'sistema'
        })
        .select()
        .single();

      if (!error && data) {
        setLeadNotes(prev => [data as LeadNote, ...prev]);
        setNewNote('');
      }
    } catch {}
  };

  // ─── Helpers ───────────────────────────────────────────────
  const formatTime = (timestamp: number) => {
    if (!timestamp || timestamp <= 0) return '';
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp || timestamp <= 0) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getDisplayName = (chat: Chat) => {
    if (!chat.name || chat.name === chat.id) {
      return chat.id.replace(/@.*$/, '');
    }
    return chat.name;
  };

  const getPhoneDisplay = (chatId: string) => {
    const num = chatId.replace(/@.*$/, '');
    if (num.length >= 12) {
      return `+${num.slice(0, 2)} (${num.slice(2, 4)}) ${num.slice(4, 9)}-${num.slice(9)}`;
    }
    return num;
  };

  const getContactBadge = (chat: Chat) => {
    if (chat.isGroup) return null;
    const phoneClean = chat.id.replace(/@.*$/, '');
    const contact = contacts.find(c => c.id === chat.id);
    if (!contact) return { label: 'Novo', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Contato', color: 'bg-emerald-100 text-emerald-700' };
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'novo': 'bg-blue-100 text-blue-700',
      'qualificado': 'bg-emerald-100 text-emerald-700',
      'em_negociacao': 'bg-amber-100 text-amber-700',
      'fechado': 'bg-green-100 text-green-700',
      'perdido': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const getTemperaturaIcon = (temp: string) => {
    if (temp === 'quente') return '🔥';
    if (temp === 'morno') return '🌡️';
    return '❄️';
  };

  // ─── Auto messages ────────────────────────────────────────
  const addAutoMessage = () => {
    setAutoMessages([...autoMessages, {
      id: Date.now().toString(), message: '', scheduledDate: '',
      scheduledTime: '', targetGroup: '', photoUrl: '', photoCaption: '', isActive: true
    }]);
  };

  const removeAutoMessage = (id: string) => setAutoMessages(autoMessages.filter(m => m.id !== id));
  const updateAutoMessage = (id: string, field: string, value: string) => {
    setAutoMessages(autoMessages.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const loadAutoMessages = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'}/auto-messages?userId=default`);
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        setAutoMessages(data.data.map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          message: msg.message || '', scheduledDate: msg.scheduled_date || '',
          scheduledTime: msg.scheduled_time || '', targetGroup: msg.target_group || '',
          photoUrl: msg.photo_url || '', photoCaption: msg.photo_caption || '',
          isActive: msg.is_active !== false
        })));
      }
    } catch {}
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('email', user.email)
        .single();

      let orgId = orgData?.organization_id;
      if (!orgId) {
        const { data: orgDirect } = await supabase
          .from('organizations').select('id, admin_phone')
          .eq('owner_email', user.email).single();
        if (orgDirect) {
          orgId = orgDirect.id;
          if (orgDirect.admin_phone) { setAdminPhone(orgDirect.admin_phone); return; }
        }
      }

      if (orgId) {
        const { data: settings } = await supabase
          .from('organizations').select('admin_phone').eq('id', orgId).single();
        if (settings?.admin_phone) setAdminPhone(settings.admin_phone);
      }
    } catch {}
  }, []);

  const saveSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from('organization_users').select('organization_id')
        .eq('email', user.email).single();

      let orgId = orgData?.organization_id;
      if (!orgId) {
        const { data: orgDirect } = await supabase
          .from('organizations').select('id').eq('owner_email', user.email).single();
        orgId = orgDirect?.id;
      }

      if (orgId) {
        await supabase.from('organizations')
          .update({ admin_phone: adminPhone, updated_at: new Date().toISOString() })
          .eq('id', orgId);
      }
      setShowSettingsModal(false);
    } catch {
      localStorage.setItem('whatsapp_settings', JSON.stringify({ adminPhone }));
      setShowSettingsModal(false);
    }
  };

  const saveAutoMessages = async () => {
    try {
      const messagesToSave = autoMessages
        .filter(msg => msg.message && msg.scheduledTime && msg.targetGroup)
        .map(msg => ({
          ...msg, scheduled_date: msg.scheduledDate || null,
          scheduled_time: msg.scheduledTime, target_group: msg.targetGroup,
          photo_url: msg.photoUrl || null, photo_caption: msg.photoCaption || null,
          is_active: msg.isActive
        }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'}/auto-messages/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default', autoMessages: messagesToSave }),
      });
      const data = await response.json();
      if (data.success) {
        setShowAutoMessageModal(false);
        loadAutoMessages();
      }
    } catch {}
  };

  // ─── Effects ───────────────────────────────────────────────
  useEffect(() => {
    checkWhatsAppConnection();
    const interval = setInterval(checkWhatsAppConnection, 30000);
    loadSettings();

    const forceTimeout = setTimeout(() => {
      if (isLoadingStatus) {
        setIsLoadingStatus(false);
        setIsWhatsAppConnected(true);
        loadChats();
        loadContacts();
      }
    }, 20000);

    return () => { clearInterval(interval); clearTimeout(forceTimeout); };
  }, [checkWhatsAppConnection, loadSettings, isLoadingStatus]);

  useEffect(() => {
    if (selectedChat) {
      loadChatMessages(selectedChat.id);
      if (!selectedChat.isGroup) lookupLead(selectedChat.id);
      setActiveTab('conversa');
    }
  }, [selectedChat, loadChatMessages, lookupLead]);

  // ─── Select chat handler ──────────────────────────────────
  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setMobileView('chat');
    setShowDetailsPanel(false);
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  // ─── Loading state ─────────────────────────────────────────
  if (isLoadingStatus) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#f8f9fb] via-white to-[#f0f2f8]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-[#FF2D6B]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#FF2D6B] animate-spin" />
          </div>
          <p className="text-[#6C757D] font-medium">Conectando ao WhatsApp...</p>
          <button
            onClick={() => { setIsWhatsAppConnected(true); setIsLoadingStatus(false); loadChats(); loadContacts(); }}
            className="mt-4 text-xs text-[#ADB5BD] hover:text-[#FF2D6B] transition-colors"
          >
            Forcar carregamento
          </button>
        </div>
      </div>
    );
  }

  // ─── Not connected ─────────────────────────────────────────
  if (!isWhatsAppConnected) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#f8f9fb] via-white to-[#f0f2f8]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#FF2D6B]/10 to-[#FF2D6B]/5 flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-[#FF2D6B]" />
          </div>
          <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">WhatsApp nao conectado</h2>
          <p className="text-[#6C757D] mb-6">Conecte seu WhatsApp para comecar a atender</p>
          <Link href="/whatsapp/connect">
            <button className="px-6 py-3 bg-[#FF2D6B] hover:bg-[#E91E5A] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#FF2D6B]/25">
              <QrCode className="w-5 h-5 inline mr-2" />
              Conectar WhatsApp
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main interface ────────────────────────────────────────
  return (
    <div className="h-screen flex bg-gradient-to-br from-[#f0f2f8] via-[#f8f9fb] to-[#eef1f8] overflow-hidden">

      {/* ══════ COLUMN 1: Chat List ══════ */}
      <div className={`w-full md:w-[380px] md:min-w-[380px] flex flex-col border-r border-[#E9ECEF]/60
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
        bg-white/70 backdrop-blur-xl`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-[#1A1A2E]">Chats</h1>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-600">Online</span>
              </div>
              <button
                onClick={() => setShowAutoMessageModal(true)}
                className="p-2 rounded-lg hover:bg-[#F1F3F5] text-[#6C757D] hover:text-[#FF2D6B] transition-all"
                title="Mensagens Automaticas"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 rounded-lg hover:bg-[#F1F3F5] text-[#6C757D] hover:text-[#FF2D6B] transition-all"
                title="Configuracoes"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
            <input
              type="text"
              placeholder="Pesquisar contato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F1F3F5]/80 border border-transparent rounded-xl text-sm text-[#1A1A2E] placeholder-[#ADB5BD] focus:outline-none focus:border-[#FF2D6B]/30 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <MessageCircle className="w-10 h-10 text-[#E9ECEF] mb-3" />
              <p className="text-sm font-medium text-[#6C757D]">Nenhuma conversa</p>
              <p className="text-xs text-[#ADB5BD] mt-1">Aguardando sincronizacao...</p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const badge = getContactBadge(chat);
              const isSelected = selectedChat?.id === chat.id;
              const displayName = getDisplayName(chat);
              const preview = chat.lastMessage?.body && chat.lastMessage.body !== ''
                ? chat.lastMessage.body
                : 'Iniciar conversa';
              const hasUnread = (chat.unreadCount || 0) > 0;

              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-all duration-200 border-b border-[#F1F3F5]/60
                    ${isSelected
                      ? 'bg-gradient-to-r from-[#FF2D6B]/[0.08] to-transparent border-l-[3px] border-l-[#FF2D6B]'
                      : 'hover:bg-[#F8F9FA] border-l-[3px] border-l-transparent'
                    }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold
                      ${isSelected ? 'bg-[#FF2D6B]/10 text-[#FF2D6B]' : 'bg-[#F1F3F5] text-[#6C757D]'}`}
                    >
                      {getInitials(displayName)}
                    </div>
                    {hasUnread && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#FF2D6B] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {chat.unreadCount! > 9 ? '9+' : chat.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm truncate ${hasUnread ? 'font-semibold text-[#1A1A2E]' : 'font-medium text-[#1A1A2E]'}`}>
                          {displayName}
                        </span>
                        {badge && (
                          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${badge.color}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage?.timestamp && chat.lastMessage.timestamp > 0 && (
                        <span className={`text-[11px] flex-shrink-0 ml-2 ${hasUnread ? 'text-[#FF2D6B] font-medium' : 'text-[#ADB5BD]'}`}>
                          {formatTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {chat.lastMessage?.isFromMe && (
                        <CheckCheck className="w-3.5 h-3.5 flex-shrink-0 text-[#ADB5BD]" />
                      )}
                      <p className={`text-xs truncate ${hasUnread ? 'text-[#1A1A2E] font-medium' : 'text-[#6C757D]'}`}>
                        {preview.length > 50 ? preview.substring(0, 50) + '...' : preview}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══════ COLUMN 2: Conversation ══════ */}
      <div className={`flex-1 flex flex-col min-w-0
        ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}
      >
        {selectedChat ? (
          <>
            {/* Conversation Header */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-[#E9ECEF]/60 px-5 py-3">
              <div className="flex items-center gap-3">
                {/* Mobile back */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 rounded-lg hover:bg-[#F1F3F5] text-[#6C757D]"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF2D6B]/10 to-[#FF2D6B]/5 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#FF2D6B]">
                    {getInitials(getDisplayName(selectedChat))}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-semibold text-[#1A1A2E] truncate">
                      {getDisplayName(selectedChat)}
                    </h2>
                    {leadInfo && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-700`}>
                        Lead
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#ADB5BD]">
                    {getPhoneDisplay(selectedChat.id)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={syncCurrentChat}
                    disabled={isSyncingChat}
                    className="p-2 rounded-lg hover:bg-[#F1F3F5] text-[#6C757D] hover:text-[#FF2D6B] transition-all disabled:opacity-40"
                    title="Sincronizar conversa"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingChat ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                    className={`p-2 rounded-lg transition-all
                      ${showDetailsPanel ? 'bg-[#FF2D6B]/10 text-[#FF2D6B]' : 'hover:bg-[#F1F3F5] text-[#6C757D] hover:text-[#FF2D6B]'}`}
                    title="Detalhes do contato"
                  >
                    <User className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-0 mt-3 -mb-3 border-b border-transparent">
                {[
                  { key: 'conversa' as ContactTab, label: 'Conversa', icon: MessageCircle },
                  { key: 'detalhes' as ContactTab, label: 'Detalhes', icon: User },
                  { key: 'anotacoes' as ContactTab, label: 'Anotacoes', icon: StickyNote },
                  { key: 'historico' as ContactTab, label: 'Historico', icon: History },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-all
                      ${activeTab === tab.key
                        ? 'border-[#FF2D6B] text-[#FF2D6B]'
                        : 'border-transparent text-[#6C757D] hover:text-[#1A1A2E]'
                      }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tab: Conversa ── */}
            {activeTab === 'conversa' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-5 py-4 bg-gradient-to-b from-[#f8f9fb] to-[#f0f2f5] scrollbar-thin">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-2xl bg-[#F1F3F5] flex items-center justify-center mb-3">
                        <MessageCircle className="w-8 h-8 text-[#ADB5BD]" />
                      </div>
                      <p className="text-sm text-[#6C757D]">Nenhuma mensagem ainda</p>
                      <p className="text-xs text-[#ADB5BD] mt-1">Envie a primeira mensagem!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {chatMessages.map((message, index) => {
                        const showDate = index === 0 ||
                          formatDate(message.timestamp) !== formatDate(chatMessages[index - 1]?.timestamp);
                        const isMe = message.isFromMe;
                        const prevSameAuthor = index > 0 && chatMessages[index - 1]?.isFromMe === isMe;

                        return (
                          <div key={message.id || index}>
                            {showDate && (
                              <div className="flex justify-center my-4">
                                <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-[11px] text-[#6C757D] shadow-sm border border-[#E9ECEF]/40">
                                  {formatDate(message.timestamp)}
                                </span>
                              </div>
                            )}

                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${prevSameAuthor ? 'mt-0.5' : 'mt-3'}`}>
                              {/* Avatar for received (only if different author) */}
                              {!isMe && !prevSameAuthor && (
                                <div className="w-7 h-7 rounded-full bg-[#F1F3F5] flex items-center justify-center mr-2 mt-auto mb-1 flex-shrink-0">
                                  <span className="text-[10px] font-semibold text-[#6C757D]">
                                    {getInitials(message.contact?.name || getDisplayName(selectedChat))}
                                  </span>
                                </div>
                              )}
                              {!isMe && prevSameAuthor && <div className="w-7 mr-2 flex-shrink-0" />}

                              <div className={`max-w-[65%] px-3.5 py-2 shadow-sm
                                ${isMe
                                  ? `bg-white border border-[#E9ECEF]/60 ${!prevSameAuthor ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-br-md'}`
                                  : `bg-[#F1F3F5] ${!prevSameAuthor ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl rounded-bl-md'}`
                                }`}
                              >
                                {!isMe && !prevSameAuthor && message.contact?.name && (
                                  <p className="text-[11px] font-semibold text-[#FF2D6B] mb-0.5">
                                    {message.contact.name}
                                  </p>
                                )}
                                <p className="text-[13px] leading-relaxed text-[#1A1A2E] whitespace-pre-wrap break-words">
                                  {message.body}
                                </p>
                                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <span className="text-[10px] text-[#ADB5BD]">
                                    {formatTime(message.timestamp)}
                                  </span>
                                  {isMe && <CheckCheck className="w-3 h-3 text-[#ADB5BD]" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Image preview */}
                {imagePreview && (
                  <div className="px-5 py-3 bg-white/90 backdrop-blur-xl border-t border-[#E9ECEF]/60">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <img src={imagePreview} alt="" className="w-20 h-20 object-cover rounded-xl border border-[#E9ECEF]" />
                        <button
                          onClick={cancelImage}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF2D6B] text-white rounded-full flex items-center justify-center shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={imageCaption}
                          onChange={(e) => setImageCaption(e.target.value)}
                          placeholder="Legenda (opcional)..."
                          className="w-full px-3 py-2 bg-[#F1F3F5] rounded-lg text-sm text-[#1A1A2E] placeholder-[#ADB5BD] focus:outline-none focus:ring-1 focus:ring-[#FF2D6B]/30"
                        />
                        <button
                          onClick={sendImage}
                          disabled={isSendingImage}
                          className="mt-2 px-4 py-1.5 bg-[#FF2D6B] hover:bg-[#E91E5A] text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                          {isSendingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Enviar imagem'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Input area */}
                <div className="px-4 py-3 bg-white/80 backdrop-blur-xl border-t border-[#E9ECEF]/40">
                  <div className="flex items-end gap-2">
                    {/* Attach */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl hover:bg-[#F1F3F5] text-[#6C757D] hover:text-[#FF2D6B] transition-all flex-shrink-0"
                      title="Enviar imagem"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />

                    {/* Input */}
                    <div className="flex-1 bg-[#F1F3F5]/80 rounded-2xl px-4 py-2.5 border border-transparent focus-within:border-[#FF2D6B]/20 focus-within:bg-white transition-all">
                      <textarea
                        placeholder="Escreva sua mensagem aqui"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="w-full bg-transparent text-sm text-[#1A1A2E] placeholder-[#ADB5BD] resize-none focus:outline-none min-h-[24px] max-h-32"
                        rows={1}
                        style={{ height: 'auto' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                        }}
                        onInput={(e) => {
                          const t = e.target as HTMLTextAreaElement;
                          t.style.height = '24px';
                          t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                        }}
                      />
                    </div>

                    {/* Send */}
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isLoading}
                      className={`p-2.5 rounded-xl flex-shrink-0 transition-all
                        ${newMessage.trim()
                          ? 'bg-[#FF2D6B] hover:bg-[#E91E5A] text-white shadow-lg shadow-[#FF2D6B]/25'
                          : 'bg-[#F1F3F5] text-[#ADB5BD]'
                        }`}
                    >
                      {isLoading
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <Send className="w-5 h-5" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Detalhes ── */}
            {activeTab === 'detalhes' && (
              <div className="flex-1 overflow-y-auto bg-[#f8f9fb] p-5 scrollbar-thin">
                {isLoadingLead ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-[#FF2D6B]" />
                  </div>
                ) : leadInfo ? (
                  <div className="space-y-4">
                    {/* Lead card */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-[#E9ECEF]/40 shadow-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF2D6B]/10 to-[#FF2D6B]/5 flex items-center justify-center">
                          <span className="text-lg font-bold text-[#FF2D6B]">
                            {getInitials(leadInfo.nome_completo)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-[#1A1A2E]">{leadInfo.nome_completo}</h3>
                          <p className="text-xs text-[#6C757D]">{leadInfo.cargo || 'Sem cargo'} {leadInfo.empresa ? `em ${leadInfo.empresa}` : ''}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getStatusColor(leadInfo.status)}`}>
                          {leadInfo.status?.replace('_', ' ') || 'Novo'}
                        </span>
                        {leadInfo.temperatura && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-orange-50 text-orange-700">
                            {getTemperaturaIcon(leadInfo.temperatura)} {leadInfo.temperatura}
                          </span>
                        )}
                        {leadInfo.lead_score > 0 && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700">
                            Score: {leadInfo.lead_score}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2.5 text-sm">
                        {leadInfo.telefone && (
                          <div className="flex items-center gap-2.5 text-[#6C757D]">
                            <Phone className="w-4 h-4 text-[#ADB5BD]" />
                            <span>{leadInfo.telefone}</span>
                          </div>
                        )}
                        {leadInfo.email && (
                          <div className="flex items-center gap-2.5 text-[#6C757D]">
                            <Mail className="w-4 h-4 text-[#ADB5BD]" />
                            <span>{leadInfo.email}</span>
                          </div>
                        )}
                        {leadInfo.empresa && (
                          <div className="flex items-center gap-2.5 text-[#6C757D]">
                            <Building2 className="w-4 h-4 text-[#ADB5BD]" />
                            <span>{leadInfo.empresa}</span>
                          </div>
                        )}
                        {leadInfo.origem && (
                          <div className="flex items-center gap-2.5 text-[#6C757D]">
                            <Tag className="w-4 h-4 text-[#ADB5BD]" />
                            <span>Origem: {leadInfo.origem}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Extra info */}
                    {leadInfo.valor_potencial > 0 && (
                      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-[#E9ECEF]/40 shadow-sm">
                        <h4 className="text-xs font-semibold text-[#ADB5BD] uppercase tracking-wider mb-3">Valor Potencial</h4>
                        <p className="text-2xl font-bold text-[#1A1A2E]">
                          R$ {leadInfo.valor_potencial.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}

                    {leadInfo.observacoes && (
                      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-[#E9ECEF]/40 shadow-sm">
                        <h4 className="text-xs font-semibold text-[#ADB5BD] uppercase tracking-wider mb-2">Observacoes</h4>
                        <p className="text-sm text-[#6C757D] whitespace-pre-wrap">{leadInfo.observacoes}</p>
                      </div>
                    )}

                    {leadInfo.tags && leadInfo.tags.length > 0 && (
                      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-[#E9ECEF]/40 shadow-sm">
                        <h4 className="text-xs font-semibold text-[#ADB5BD] uppercase tracking-wider mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {leadInfo.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#F1F3F5] rounded-md text-xs text-[#6C757D]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#F1F3F5] flex items-center justify-center mb-3">
                      <User className="w-7 h-7 text-[#ADB5BD]" />
                    </div>
                    <p className="text-sm font-medium text-[#6C757D]">Lead nao encontrado</p>
                    <p className="text-xs text-[#ADB5BD] mt-1">Este contato nao esta cadastrado como lead</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Anotacoes ── */}
            {activeTab === 'anotacoes' && (
              <div className="flex-1 overflow-y-auto bg-[#f8f9fb] p-5 scrollbar-thin">
                {leadInfo ? (
                  <div className="space-y-4">
                    {/* Add note */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-[#E9ECEF]/40 shadow-sm">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Adicionar anotacao..."
                        className="w-full bg-[#F1F3F5]/80 rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#ADB5BD] focus:outline-none focus:ring-1 focus:ring-[#FF2D6B]/30 resize-none min-h-[80px]"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={addNote}
                          disabled={!newNote.trim()}
                          className="px-4 py-2 bg-[#FF2D6B] hover:bg-[#E91E5A] text-white text-xs font-medium rounded-lg transition-all disabled:opacity-40 shadow-sm shadow-[#FF2D6B]/20"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>

                    {/* Notes list */}
                    {leadNotes.length === 0 ? (
                      <div className="text-center py-8">
                        <StickyNote className="w-8 h-8 text-[#E9ECEF] mx-auto mb-2" />
                        <p className="text-sm text-[#ADB5BD]">Nenhuma anotacao ainda</p>
                      </div>
                    ) : (
                      leadNotes.map(note => (
                        <div key={note.id} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-[#E9ECEF]/40 shadow-sm">
                          {note.is_important && (
                            <div className="flex items-center gap-1 mb-2">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span className="text-[10px] font-semibold text-amber-600 uppercase">Importante</span>
                            </div>
                          )}
                          <p className="text-sm text-[#1A1A2E] whitespace-pre-wrap">{note.nota}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-[#ADB5BD]">
                            <span>{note.responsavel}</span>
                            <span>•</span>
                            <span>{new Date(note.created_at).toLocaleDateString('pt-BR')} {new Date(note.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            {note.categoria && (
                              <>
                                <span>•</span>
                                <span className="px-1.5 py-0.5 bg-[#F1F3F5] rounded text-[9px]">{note.categoria}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <StickyNote className="w-10 h-10 text-[#E9ECEF] mb-3" />
                    <p className="text-sm text-[#6C757D]">Cadastre este contato como lead para adicionar anotacoes</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Historico ── */}
            {activeTab === 'historico' && (
              <div className="flex-1 overflow-y-auto bg-[#f8f9fb] p-5 scrollbar-thin">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <History className="w-10 h-10 text-[#E9ECEF] mb-3" />
                  <p className="text-sm text-[#6C757D]">Historico de interacoes</p>
                  <p className="text-xs text-[#ADB5BD] mt-1">Em breve - acompanhe todas as interacoes com este contato</p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* No chat selected */
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[#f8f9fb] to-[#f0f2f8]">
            <div className="text-center max-w-sm">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#FF2D6B]/10 to-[#FF2D6B]/5 flex items-center justify-center">
                <MessageCircle className="w-12 h-12 text-[#FF2D6B]/60" />
              </div>
              <h3 className="text-xl font-light text-[#1A1A2E] mb-2">Selecione uma conversa</h3>
              <p className="text-sm text-[#6C757D]">
                {filteredChats.length > 0
                  ? 'Escolha um contato para comecar a conversar'
                  : 'Carregando suas conversas...'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ══════ COLUMN 3: Details Panel (desktop only) ══════ */}
      {showDetailsPanel && selectedChat && !selectedChat.isGroup && (
        <div className="hidden lg:flex w-[320px] min-w-[320px] flex-col border-l border-[#E9ECEF]/60 bg-white/70 backdrop-blur-xl overflow-y-auto scrollbar-thin">
          <div className="p-5 border-b border-[#E9ECEF]/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#1A1A2E]">Informacoes do Contato</h3>
              <button onClick={() => setShowDetailsPanel(false)} className="p-1 rounded hover:bg-[#F1F3F5] text-[#ADB5BD]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contact avatar */}
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF2D6B]/10 to-[#FF2D6B]/5 flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-[#FF2D6B]">
                  {getInitials(getDisplayName(selectedChat))}
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#1A1A2E]">{getDisplayName(selectedChat)}</h3>
              <p className="text-xs text-[#ADB5BD] mt-0.5">{getPhoneDisplay(selectedChat.id)}</p>
            </div>
          </div>

          {isLoadingLead ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[#FF2D6B]" />
            </div>
          ) : leadInfo ? (
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${getStatusColor(leadInfo.status)}`}>
                  {leadInfo.status?.replace('_', ' ') || 'Novo'}
                </span>
                {leadInfo.temperatura && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-700">
                    {getTemperaturaIcon(leadInfo.temperatura)} {leadInfo.temperatura}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {leadInfo.email && (
                  <div className="flex items-center gap-2 text-[#6C757D]">
                    <Mail className="w-3.5 h-3.5 text-[#ADB5BD]" />
                    <span className="truncate">{leadInfo.email}</span>
                  </div>
                )}
                {leadInfo.empresa && (
                  <div className="flex items-center gap-2 text-[#6C757D]">
                    <Building2 className="w-3.5 h-3.5 text-[#ADB5BD]" />
                    <span>{leadInfo.empresa}</span>
                  </div>
                )}
                {leadInfo.cargo && (
                  <div className="flex items-center gap-2 text-[#6C757D]">
                    <User className="w-3.5 h-3.5 text-[#ADB5BD]" />
                    <span>{leadInfo.cargo}</span>
                  </div>
                )}
                {leadInfo.origem && (
                  <div className="flex items-center gap-2 text-[#6C757D]">
                    <Tag className="w-3.5 h-3.5 text-[#ADB5BD]" />
                    <span>{leadInfo.origem}</span>
                  </div>
                )}
              </div>

              {leadInfo.valor_potencial > 0 && (
                <div className="bg-[#F8F9FA] rounded-xl p-3">
                  <p className="text-[10px] text-[#ADB5BD] uppercase tracking-wider mb-1">Valor Potencial</p>
                  <p className="text-lg font-bold text-[#1A1A2E]">
                    R$ {leadInfo.valor_potencial.toLocaleString('pt-BR')}
                  </p>
                </div>
              )}

              {/* Quick notes */}
              <div>
                <h4 className="text-[10px] text-[#ADB5BD] uppercase tracking-wider mb-2">Ultimas Anotacoes</h4>
                {leadNotes.length === 0 ? (
                  <p className="text-xs text-[#ADB5BD]">Sem anotacoes</p>
                ) : (
                  leadNotes.slice(0, 3).map(note => (
                    <div key={note.id} className="py-2 border-b border-[#F1F3F5] last:border-0">
                      <p className="text-xs text-[#6C757D] line-clamp-2">{note.nota}</p>
                      <p className="text-[10px] text-[#ADB5BD] mt-0.5">
                        {new Date(note.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
              <User className="w-8 h-8 text-[#E9ECEF] mb-2" />
              <p className="text-xs text-[#ADB5BD]">Lead nao cadastrado</p>
            </div>
          )}
        </div>
      )}

      {/* ══════ MODALS ══════ */}

      {/* Auto Messages Modal */}
      {showAutoMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9ECEF]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF2D6B]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#FF2D6B]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#1A1A2E]">Mensagens Automaticas</h2>
                  <p className="text-xs text-[#ADB5BD]">Configure envios automatizados</p>
                </div>
              </div>
              <button onClick={() => setShowAutoMessageModal(false)} className="p-2 rounded-lg hover:bg-[#F1F3F5] text-[#6C757D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6 space-y-4">
              <div className="flex justify-end">
                <button onClick={addAutoMessage} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF2D6B] hover:bg-[#E91E5A] text-white text-xs font-medium rounded-lg transition-all">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {autoMessages.map((autoMsg, index) => (
                <div key={autoMsg.id} className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E9ECEF]/40">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-[#1A1A2E]">Mensagem {index + 1}</h4>
                    {autoMessages.length > 1 && (
                      <button onClick={() => removeAutoMessage(autoMsg.id)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-[#ADB5BD] uppercase tracking-wider">Data</label>
                      <input type="date" value={autoMsg.scheduledDate}
                        onChange={(e) => updateAutoMessage(autoMsg.id, 'scheduledDate', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-white border border-[#E9ECEF] rounded-lg text-xs focus:outline-none focus:border-[#FF2D6B]/40"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#ADB5BD] uppercase tracking-wider">Horario</label>
                      <input type="time" value={autoMsg.scheduledTime}
                        onChange={(e) => updateAutoMessage(autoMsg.id, 'scheduledTime', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-white border border-[#E9ECEF] rounded-lg text-xs focus:outline-none focus:border-[#FF2D6B]/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#ADB5BD] uppercase tracking-wider">Destino</label>
                      <select
                        value={autoMsg.targetGroup}
                        onChange={(e) => updateAutoMessage(autoMsg.id, 'targetGroup', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-white border border-[#E9ECEF] rounded-lg text-xs focus:outline-none focus:border-[#FF2D6B]/40"
                      >
                        <option value="">Selecione...</option>
                        {filteredChats.map(chat => (
                          <option key={chat.id} value={chat.id}>
                            {getDisplayName(chat)} {chat.isGroup ? '(Grupo)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="text-[10px] text-[#ADB5BD] uppercase tracking-wider">Mensagem</label>
                    <textarea value={autoMsg.message}
                      onChange={(e) => updateAutoMessage(autoMsg.id, 'message', e.target.value)}
                      placeholder="Digite a mensagem..."
                      className="w-full mt-1 px-3 py-2 bg-white border border-[#E9ECEF] rounded-lg text-xs focus:outline-none focus:border-[#FF2D6B]/40 resize-none min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-[#ADB5BD] uppercase tracking-wider">URL da Foto (opcional)</label>
                      <input type="url" value={autoMsg.photoUrl}
                        onChange={(e) => updateAutoMessage(autoMsg.id, 'photoUrl', e.target.value)}
                        placeholder="https://..."
                        className="w-full mt-1 px-3 py-2 bg-white border border-[#E9ECEF] rounded-lg text-xs focus:outline-none focus:border-[#FF2D6B]/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#ADB5BD] uppercase tracking-wider">Legenda (opcional)</label>
                      <input type="text" value={autoMsg.photoCaption}
                        onChange={(e) => updateAutoMessage(autoMsg.id, 'photoCaption', e.target.value)}
                        placeholder="Legenda..."
                        className="w-full mt-1 px-3 py-2 bg-white border border-[#E9ECEF] rounded-lg text-xs focus:outline-none focus:border-[#FF2D6B]/40"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E9ECEF]">
              <button onClick={() => setShowAutoMessageModal(false)} className="px-4 py-2 text-sm text-[#6C757D] hover:bg-[#F1F3F5] rounded-lg transition-all">
                Cancelar
              </button>
              <button onClick={saveAutoMessages}
                disabled={!autoMessages.some(msg => msg.message && msg.scheduledTime && msg.targetGroup)}
                className="px-4 py-2 bg-[#FF2D6B] hover:bg-[#E91E5A] text-white text-sm font-medium rounded-lg transition-all disabled:opacity-40 shadow-sm shadow-[#FF2D6B]/20"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9ECEF]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#FF2D6B]" />
                <h2 className="text-base font-semibold text-[#1A1A2E]">Configuracoes</h2>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 rounded-lg hover:bg-[#F1F3F5] text-[#6C757D]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-[#1A1A2E] block mb-1">Numero do Administrador</label>
                <p className="text-[10px] text-[#ADB5BD] mb-2">Recebera notificacoes de agendamentos</p>
                <input type="tel" value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+5583996910414"
                  className="w-full px-4 py-2.5 bg-[#F1F3F5] border border-transparent rounded-xl text-sm text-[#1A1A2E] placeholder-[#ADB5BD] focus:outline-none focus:border-[#FF2D6B]/30 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E9ECEF]">
              <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-sm text-[#6C757D] hover:bg-[#F1F3F5] rounded-lg">
                Cancelar
              </button>
              <button onClick={saveSettings} disabled={!adminPhone || adminPhone.length < 10}
                className="px-4 py-2 bg-[#FF2D6B] hover:bg-[#E91E5A] text-white text-sm font-medium rounded-lg transition-all disabled:opacity-40 shadow-sm shadow-[#FF2D6B]/20"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #CED4DA; border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #ADB5BD; }
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #CED4DA transparent; }
      `}</style>
    </div>
  );
}
