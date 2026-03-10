'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Phone, QrCode, Send, Users, Wifi, WifiOff,
  Search, RefreshCw, Settings, Clock, X, CalendarDays, Plus,
  Trash2, Paperclip, Image as ImageIcon, Mic, ChevronLeft,
  Star, StickyNote, History, User, Building2, Mail, Tag,
  AlertCircle, Check, CheckCheck, Pin, Filter, MoreVertical,
  FileText, ArrowLeft, Loader2, Video, DollarSign, CreditCard,
  TrendingUp, Activity, Zap, Bot, Link2, ChevronRight,
  CircleDot, Layers, Globe, Shield, Eye, BarChart3,
  BookOpen, UserCheck, AlertTriangle, PlusCircle, Copy,
  Power, PowerOff, Smartphone, Hash, ArrowUpDown
} from 'lucide-react';
import { whatsappMultiService, type WhatsAppStatus, type Contact, type Chat, type Message } from '@/lib/whatsapp-multi-service';
import { waV2, type WAChat, type WAContact, type WAContactEnriched, type WAInstance, type WANote, type WAHistory, type WADivida, type WAAutomation, type WAPipelineStage, type WAStats } from '@/lib/whatsapp-v2-service';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { generateWeeklyAgenda, generateDailyAgenda } from '@/services/agenda-generator';

// ─── Types ──────────────────────────────────────────────────
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
  valor_vendido: number;
  valor_arrecadado: number;
  created_at: string;
  data_venda: string;
}

interface LeadNote {
  id: string;
  lead_id: string;
  conteudo: string;
  tipo_nota: string;
  titulo?: string;
  visibilidade: string;
  prioridade: string;
  created_at: string;
}

type MainTab = 'chats' | 'instances' | 'automations' | 'stats';
type ContactTab = 'conversa' | 'detalhes' | 'financeiro' | 'anotacoes' | 'historico';

// ─── Component ──────────────────────────────────────────────
export default function WhatsAppPage() {
  const { user, organizationId } = useAuth();

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
  const [mainTab, setMainTab] = useState<MainTab>('chats');
  const [activeTab, setActiveTab] = useState<ContactTab>('conversa');
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // V2 state
  const [instances, setInstances] = useState<WAInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('all');
  const [automations, setAutomations] = useState<WAAutomation[]>([]);
  const [stats, setStats] = useState<WAStats | null>(null);
  const [pipelineStages, setPipelineStages] = useState<WAPipelineStage[]>([]);

  // Lead/mentorado/financial state
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoadingLead, setIsLoadingLead] = useState(false);
  const [enrichedContact, setEnrichedContact] = useState<WAContactEnriched | null>(null);
  const [contactDividas, setContactDividas] = useState<WADivida[]>([]);
  const [contactHistory, setContactHistory] = useState<WAHistory[]>([]);
  const [contactNotes, setContactNotes] = useState<WANote[]>([]);

  // Image/Video state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [isSendingImage, setIsSendingImage] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [videoBase64, setVideoBase64] = useState('');
  const [videoCaption, setVideoCaption] = useState('');
  const [isSendingVideo, setIsSendingVideo] = useState(false);

  // New instance form
  const [showNewInstance, setShowNewInstance] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceDept, setNewInstanceDept] = useState('');

  // Automation form
  const [showAutoForm, setShowAutoForm] = useState(false);
  const [editingAuto, setEditingAuto] = useState<WAAutomation | null>(null);
  const [autoForm, setAutoForm] = useState({ name: '', description: '', scope: 'global', priority: 10 });
  const [autoTrigger, setAutoTrigger] = useState<{ type: string; config: Record<string, any> }>({ type: 'message_received', config: {} });
  const [autoConditions, setAutoConditions] = useState<{ type: string; operator: string; config: Record<string, any>; logic_gate: string }[]>([]);
  const [autoActions, setAutoActions] = useState<{ type: string; config: Record<string, any> }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Filtered chats ─────────────────────────────────────
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.id.includes(searchTerm) ||
    chat.lastMessage?.body?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─── Connection check ──────────────────────────────────
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

  // ─── Load V2 data ───────────────────────────────────────
  const loadV2Data = useCallback(async () => {
    try {
      const [instRes, statsRes, stagesRes] = await Promise.all([
        waV2.getInstances().catch(() => ({ success: false, data: [] })),
        waV2.getStats().catch(() => ({ success: false, data: null })),
        waV2.getPipelineStages().catch(() => ({ success: false, data: [] })),
      ]);
      if (instRes.success && instRes.data) setInstances(instRes.data as WAInstance[]);
      if (statsRes.success && statsRes.data) setStats(statsRes.data as WAStats);
      if (stagesRes.success && stagesRes.data) setPipelineStages(stagesRes.data as WAPipelineStage[]);
    } catch {}
  }, []);

  // ─── Load chats ─────────────────────────────────────────
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
        setContacts(response.data.filter((c: Contact) => c.isMyContact));
      }
    } catch {}
  }, []);

  // ─── Load messages ──────────────────────────────────────
  const loadChatMessages = useCallback(async (chatId: string) => {
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await whatsappMultiService.getChatMessages(chatId, 50);
        if (response.success && response.data) {
          const sorted = response.data.sort((a: Message, b: Message) => a.timestamp - b.timestamp);
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

  // ─── Send message ───────────────────────────────────────
  const sendMessage = async () => {
    if (!selectedChat || !newMessage.trim() || isLoading) return;
    const cmd = newMessage.trim().toLowerCase();

    if ((cmd === 'agenda do dia' || cmd === 'agenda da semana') && organizationId) {
      setIsLoading(true);
      try {
        const agendaMsg = cmd === 'agenda da semana'
          ? await generateWeeklyAgenda(organizationId)
          : await generateDailyAgenda(organizationId);
        const response = await whatsappMultiService.sendMessage(selectedChat.id, agendaMsg);
        if (response.success) {
          setNewMessage('');
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      } catch {} finally { setIsLoading(false); }
      return;
    }

    setIsLoading(true);
    try {
      const response = await whatsappMultiService.sendMessage(selectedChat.id, newMessage);
      if (response.success) {
        setNewMessage('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch {} finally { setIsLoading(false); }
  };

  // ─── Send image/video ──────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('video/')) {
      if (file.size > 16 * 1024 * 1024) { alert('Video muito grande. Maximo 16MB.'); return; }
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onload = (ev) => setVideoBase64(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          const maxSize = 800;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          setImagePreview(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const sendImage = async () => {
    if (!selectedChat || !imagePreview || isSendingImage) return;
    setIsSendingImage(true);
    try {
      const response = await whatsappMultiService.sendImage(selectedChat.id, imagePreview, imageCaption);
      if (response.success) { setSelectedImage(null); setImagePreview(''); setImageCaption(''); }
    } catch {} finally { setIsSendingImage(false); }
  };

  const sendVideo = async () => {
    if (!selectedChat || !videoBase64 || isSendingVideo) return;
    setIsSendingVideo(true);
    try {
      const response = await whatsappMultiService.sendVideo(selectedChat.id, videoBase64, videoCaption);
      if (response.success) { cancelVideo(); }
    } catch {} finally { setIsSendingVideo(false); }
  };

  const cancelImage = () => { setSelectedImage(null); setImagePreview(''); setImageCaption(''); };
  const cancelVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setSelectedVideo(null); setVideoPreview(''); setVideoBase64(''); setVideoCaption('');
  };

  // ─── Sync chat ──────────────────────────────────────────
  const syncCurrentChat = async () => {
    if (!selectedChat || isSyncingChat) return;
    setIsSyncingChat(true);
    try {
      const response = await whatsappMultiService.syncChat(selectedChat.id);
      if (response.success && response.data) {
        setChatMessages(response.data.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch {} finally { setIsSyncingChat(false); }
  };

  // ─── Lead lookup ────────────────────────────────────────
  const lookupLead = useCallback(async (chatId: string) => {
    setIsLoadingLead(true);
    setLeadInfo(null);
    setLeadNotes([]);
    setEnrichedContact(null);
    setContactDividas([]);
    setContactHistory([]);
    setContactNotes([]);
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
        const { data: notes } = await supabase
          .from('lead_notes')
          .select('*')
          .eq('lead_id', leads[0].id)
          .order('created_at', { ascending: false });
        if (notes) setLeadNotes(notes as LeadNote[]);

        // Also lookup mentorado via lead
        if (leads[0].convertido_em) {
          const { data: mentorados } = await supabase
            .from('mentorados')
            .select('id, nome_completo, email, telefone, status, turma')
            .ilike('telefone', `%${last9}`)
            .limit(1);

          if (mentorados && mentorados.length > 0) {
            // Lookup dividas
            const { data: dividas } = await supabase
              .from('dividas')
              .select('*')
              .eq('mentorado_id', mentorados[0].id)
              .order('data_vencimento', { ascending: false });
            if (dividas) setContactDividas(dividas as any);
          }
        }
      }

      // Also try the phone match for mentorado directly
      const { data: mentoradosDirect } = await supabase
        .from('mentorados')
        .select('id')
        .ilike('telefone', `%${last9}`)
        .limit(1);

      if (mentoradosDirect && mentoradosDirect.length > 0 && contactDividas.length === 0) {
        const { data: dividas } = await supabase
          .from('dividas')
          .select('*')
          .eq('mentorado_id', mentoradosDirect[0].id)
          .order('data_vencimento', { ascending: false });
        if (dividas) setContactDividas(dividas as any);
      }

      // Load lead history
      const { data: leadHistory } = await supabase
        .from('lead_historico')
        .select('*')
        .ilike('lead_telefone', `%${last9}`)
        .order('created_at', { ascending: false })
        .limit(30);
      // Fallback: lead_history table
      if (!leadHistory || leadHistory.length === 0) {
        const { data: lh2 } = await supabase
          .from('lead_history')
          .select('*')
          .eq('lead_id', leads?.[0]?.id)
          .order('created_at', { ascending: false })
          .limit(30);
        if (lh2) setContactHistory(lh2 as any);
      } else {
        setContactHistory(leadHistory as any);
      }
    } catch {} finally {
      setIsLoadingLead(false);
    }
  }, []);

  // ─── Add note ───────────────────────────────────────────
  const addNote = async () => {
    if (!leadInfo || !newNote.trim()) return;
    try {
      const { data, error } = await supabase
        .from('lead_notes')
        .insert({
          lead_id: leadInfo.id,
          conteudo: newNote.trim(),
          tipo_nota: 'geral',
          visibilidade: 'team',
          prioridade: 'normal',
        })
        .select()
        .single();
      if (!error && data) {
        setLeadNotes(prev => [data as LeadNote, ...prev]);
        setNewNote('');
      }
    } catch {}
  };

  // ─── Load automations ──────────────────────────────────
  const loadAutomations = useCallback(async () => {
    const res = await waV2.getAutomations();
    if (res.success && res.data) setAutomations(res.data as WAAutomation[]);
  }, []);

  // ─── Save automation (create or update) ───────────────
  const saveAutomation = async () => {
    if (!autoForm.name.trim()) return;
    const payload = {
      name: autoForm.name,
      description: autoForm.description,
      scope: autoForm.scope,
      priority: autoForm.priority,
      trigger: autoTrigger,
      conditions: autoConditions,
      actions: autoActions.map((a, i) => ({ ...a, order_index: i }))
    };
    const res = editingAuto
      ? await waV2.updateAutomation(editingAuto.id, payload)
      : await waV2.createAutomation(payload);
    if (res.success) {
      setShowAutoForm(false);
      setEditingAuto(null);
      resetAutoForm();
      loadAutomations();
    }
  };

  const resetAutoForm = () => {
    setAutoForm({ name: '', description: '', scope: 'global', priority: 10 });
    setAutoTrigger({ type: 'message_received', config: {} });
    setAutoConditions([]);
    setAutoActions([]);
  };

  const openEditAuto = (auto: WAAutomation) => {
    setEditingAuto(auto);
    setAutoForm({ name: auto.name, description: auto.description || '', scope: auto.scope || 'global', priority: auto.priority || 10 });
    if (auto.triggers?.[0]) {
      setAutoTrigger({ type: auto.triggers[0].trigger_type, config: auto.triggers[0].config || {} });
    } else {
      setAutoTrigger({ type: 'message_received', config: {} });
    }
    setAutoConditions((auto.conditions || []).map((c: any) => ({
      type: c.condition_type, operator: c.operator || 'eq', config: c.config || {}, logic_gate: c.logic_gate || 'AND'
    })));
    setAutoActions((auto.actions || []).map((a: any) => ({
      type: a.action_type, config: a.config || {}
    })));
    setShowAutoForm(true);
  };

  const openNewAuto = () => {
    setEditingAuto(null);
    resetAutoForm();
    setShowAutoForm(true);
  };

  const addAutoCondition = () => {
    setAutoConditions(prev => [...prev, { type: 'message_contains', operator: 'contains', config: { value: '' }, logic_gate: 'AND' }]);
  };

  const addAutoAction = () => {
    setAutoActions(prev => [...prev, { type: 'send_message', config: { message: '' } }]);
  };

  const removeAutoCondition = (idx: number) => setAutoConditions(prev => prev.filter((_, i) => i !== idx));
  const removeAutoAction = (idx: number) => setAutoActions(prev => prev.filter((_, i) => i !== idx));
  const moveActionUp = (idx: number) => {
    if (idx === 0) return;
    setAutoActions(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  // Automation constants
  const TRIGGER_TYPES = [
    { value: 'message_received', label: 'Mensagem recebida' },
    { value: 'keyword_detected', label: 'Palavra-chave detectada' },
    { value: 'contact_created', label: 'Contato criado' },
    { value: 'contact_tag_added', label: 'Tag adicionada' },
    { value: 'contact_stage_changed', label: 'Estagio alterado' },
    { value: 'lead_converted', label: 'Lead convertido' },
    { value: 'mentorado_created', label: 'Mentorado criado' },
    { value: 'payment_overdue', label: 'Pagamento atrasado' },
    { value: 'no_response_timeout', label: 'Sem resposta (timeout)' },
    { value: 'schedule_cron', label: 'Agendamento (cron)' },
    { value: 'webhook_received', label: 'Webhook recebido' },
  ];

  const CONDITION_TYPES = [
    { value: 'message_contains', label: 'Mensagem contem' },
    { value: 'contact_has_tag', label: 'Contato tem tag' },
    { value: 'contact_in_stage', label: 'Contato no estagio' },
    { value: 'is_lead', label: 'E um lead' },
    { value: 'is_mentorado', label: 'E um mentorado' },
    { value: 'financial_status', label: 'Status financeiro' },
    { value: 'has_pending_payment', label: 'Tem pagamento pendente' },
    { value: 'time_window', label: 'Horario permitido' },
    { value: 'lead_status', label: 'Status do lead' },
    { value: 'contact_field_equals', label: 'Campo personalizado' },
    { value: 'contact_replied_within', label: 'Respondeu dentro de' },
  ];

  const ACTION_TYPES = [
    { value: 'send_message', label: 'Enviar mensagem', icon: '💬' },
    { value: 'send_template', label: 'Enviar template', icon: '📋' },
    { value: 'send_media', label: 'Enviar midia', icon: '📸' },
    { value: 'wait_delay', label: 'Aguardar (delay)', icon: '⏱️' },
    { value: 'wait_for_reply', label: 'Aguardar resposta', icon: '💬' },
    { value: 'add_tag', label: 'Adicionar tag', icon: '🏷️' },
    { value: 'remove_tag', label: 'Remover tag', icon: '🏷️' },
    { value: 'change_stage', label: 'Mudar estagio', icon: '📊' },
    { value: 'send_notification', label: 'Enviar notificacao', icon: '🔔' },
    { value: 'create_lead', label: 'Criar lead', icon: '👤' },
    { value: 'link_to_mentorado', label: 'Vincular mentorado', icon: '🔗' },
    { value: 'update_lead_status', label: 'Atualizar status lead', icon: '📝' },
    { value: 'call_webhook', label: 'Chamar webhook', icon: '🌐' },
    { value: 'set_contact_field', label: 'Definir campo', icon: '✏️' },
    { value: 'assign_to_user', label: 'Atribuir a usuario', icon: '👥' },
    { value: 'transfer_to_human', label: 'Transferir para humano', icon: '🙋' },
    { value: 'send_payment_reminder', label: 'Lembrete de pagamento', icon: '💰' },
    { value: 'run_sub_automation', label: 'Executar sub-automacao', icon: '🔄' },
    { value: 'pause_automation', label: 'Pausar automacao', icon: '⏸️' },
  ];

  // ─── Create instance ───────────────────────────────────
  const createInstance = async () => {
    if (!newInstanceName.trim()) return;
    const res = await waV2.createInstance({ name: newInstanceName, department: newInstanceDept || undefined });
    if (res.success) {
      setNewInstanceName('');
      setNewInstanceDept('');
      setShowNewInstance(false);
      loadV2Data();
    }
  };

  // ─── Helpers ────────────────────────────────────────────
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

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getDisplayName = (chat: Chat) => {
    if (!chat.name || chat.name === chat.id) return chat.id.replace(/@.*$/, '');
    return chat.name;
  };

  const getPhoneDisplay = (chatId: string) => {
    const num = chatId.replace(/@.*$/, '');
    if (num.length >= 12) return `+${num.slice(0, 2)} (${num.slice(2, 4)}) ${num.slice(4, 9)}-${num.slice(9)}`;
    return num;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'novo': 'bg-blue-100 text-blue-700',
      'contactado': 'bg-indigo-100 text-indigo-700',
      'qualificado': 'bg-emerald-100 text-emerald-700',
      'agendado': 'bg-purple-100 text-purple-700',
      'em_negociacao': 'bg-amber-100 text-amber-700',
      'vendido': 'bg-green-100 text-green-700',
      'perdido': 'bg-red-100 text-red-700',
      'quente': 'bg-orange-100 text-orange-700',
      'vazado': 'bg-gray-100 text-gray-600',
      'churn': 'bg-rose-100 text-rose-700',
      'ativo': 'bg-green-100 text-green-700',
      'inativo': 'bg-gray-100 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const getFinancialBadge = (dividas: WADivida[] | any[]) => {
    if (!dividas || dividas.length === 0) return null;
    const atrasadas = dividas.filter(d => d.status === 'atrasado');
    const pendentes = dividas.filter(d => d.status === 'pendente');
    if (atrasadas.length > 0) return { label: `${atrasadas.length} atrasada(s)`, color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    if (pendentes.length > 0) return { label: `${pendentes.length} pendente(s)`, color: 'bg-amber-100 text-amber-700', icon: Clock };
    return { label: 'Em dia', color: 'bg-green-100 text-green-700', icon: Check };
  };

  // ─── Effects ────────────────────────────────────────────
  useEffect(() => {
    checkWhatsAppConnection();
    loadV2Data();
    const interval = setInterval(checkWhatsAppConnection, 30000);
    const v2Interval = setInterval(loadV2Data, 60000);

    const forceTimeout = setTimeout(() => {
      if (isLoadingStatus) {
        setIsWhatsAppConnected(true);
        setIsLoadingStatus(false);
        loadChats();
        loadContacts();
      }
    }, 20000);

    return () => { clearInterval(interval); clearInterval(v2Interval); clearTimeout(forceTimeout); };
  }, [checkWhatsAppConnection, loadV2Data, isLoadingStatus]);

  useEffect(() => {
    if (selectedChat) {
      loadChatMessages(selectedChat.id);
      if (!selectedChat.isGroup) lookupLead(selectedChat.id);
      setActiveTab('conversa');
    }
  }, [selectedChat, loadChatMessages, lookupLead]);

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setMobileView('chat');
    setShowDetailsPanel(false);
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  // ─── Loading state ──────────────────────────────────────
  if (isLoadingStatus) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#f8f9fb] via-white to-[#f0f2f8]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-[#16A34A]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#16A34A] animate-spin" />
          </div>
          <p className="text-[#6C757D] font-medium">Conectando ao WhatsApp...</p>
          <button onClick={() => { setIsWhatsAppConnected(true); setIsLoadingStatus(false); loadChats(); loadContacts(); }}
            className="mt-4 text-xs text-[#ADB5BD] hover:text-[#16A34A] transition-colors">
            Forcar carregamento
          </button>
        </div>
      </div>
    );
  }

  // ─── Not connected ──────────────────────────────────────
  if (!isWhatsAppConnected) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#f8f9fb] via-white to-[#f0f2f8]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#16A34A]/10 to-[#16A34A]/5 flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-[#16A34A]" />
          </div>
          <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">WhatsApp nao conectado</h2>
          <p className="text-[#6C757D] mb-6">Conecte seu WhatsApp para comecar a atender</p>
          <Link href="/whatsapp/connect">
            <button className="px-6 py-3 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#16A34A]/25">
              <QrCode className="w-5 h-5 inline mr-2" />
              Conectar WhatsApp
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main interface ─────────────────────────────────────
  return (
    <div className="h-screen flex bg-gradient-to-br from-[#f0f2f8] via-[#f8f9fb] to-[#eef1f8] overflow-hidden">

      {/* ══════ COLUMN 1: Sidebar + Chat List ══════ */}
      <div className={`w-full md:w-[400px] md:min-w-[400px] flex flex-col border-r border-[#E9ECEF]/60
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'} bg-white/70 backdrop-blur-xl`}>

        {/* Top Navigation Tabs */}
        <div className="px-3 pt-3 pb-1 border-b border-[#E9ECEF]/40">
          <div className="flex gap-1 bg-[#F1F3F5]/80 p-1 rounded-xl">
            {([
              { key: 'chats', icon: MessageCircle, label: 'Chats' },
              { key: 'instances', icon: Smartphone, label: 'Instancias' },
              { key: 'automations', icon: Bot, label: 'Automacoes' },
              { key: 'stats', icon: BarChart3, label: 'Stats' },
            ] as { key: MainTab; icon: any; label: string }[]).map(tab => (
              <button key={tab.key} onClick={() => setMainTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all
                  ${mainTab === tab.key ? 'bg-white text-[#16A34A] shadow-sm' : 'text-[#6C757D] hover:text-[#1A1A2E]'}`}>
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Chats Tab ─── */}
        {mainTab === 'chats' && (
          <>
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-[#1A1A2E]">Chats</h1>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-medium text-emerald-600">Online</span>
                  </div>
                </div>
                <button onClick={() => { loadChats(); loadContacts(); }}
                  className="p-2 rounded-lg hover:bg-[#F1F3F5] text-[#6C757D] hover:text-[#16A34A] transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Instance filter */}
              {instances.length > 1 && (
                <div className="flex gap-1 mb-2 overflow-x-auto scrollbar-none">
                  <button onClick={() => setSelectedInstance('all')}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all
                      ${selectedInstance === 'all' ? 'bg-[#16A34A] text-white' : 'bg-[#F1F3F5] text-[#6C757D] hover:bg-[#E9ECEF]'}`}>
                    Todos
                  </button>
                  {instances.map(inst => (
                    <button key={inst.id} onClick={() => setSelectedInstance(inst.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all
                        ${selectedInstance === inst.id ? 'bg-[#16A34A] text-white' : 'bg-[#F1F3F5] text-[#6C757D] hover:bg-[#E9ECEF]'}`}>
                      {inst.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
                <input type="text" placeholder="Pesquisar contato..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F1F3F5]/80 border border-transparent rounded-xl text-sm text-[#1A1A2E] placeholder-[#ADB5BD] focus:outline-none focus:border-[#16A34A]/30 focus:bg-white transition-all" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-[#ADB5BD]">
                  <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Nenhum chat encontrado</p>
                </div>
              ) : (
                filteredChats.map((chat, idx) => (
                  <div key={`${chat.id}-${idx}`} onClick={() => handleSelectChat(chat)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-[#F1F3F5]/60
                      ${selectedChat?.id === chat.id ? 'bg-[#16A34A]/5 border-l-2 border-l-[#16A34A]' : 'hover:bg-[#F8F9FB]'}`}>
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#16A34A]/10 to-[#16A34A]/5 flex items-center justify-center flex-shrink-0">
                      {chat.isGroup ? <Users className="w-5 h-5 text-[#16A34A]" /> :
                        <span className="text-sm font-semibold text-[#16A34A]">{getInitials(chat.name)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-[#1A1A2E] truncate">{getDisplayName(chat)}</span>
                        <span className="text-[10px] text-[#ADB5BD] flex-shrink-0 ml-2">
                          {formatTime(chat.lastMessage?.timestamp || chat.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-[#6C757D] truncate max-w-[200px]">
                          {chat.lastMessage?.isFromMe && <span className="text-[#16A34A]">Voce: </span>}
                          {chat.lastMessage?.body || 'Sem mensagens'}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-[#16A34A] text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ─── Instances Tab ─── */}
        {mainTab === 'instances' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-[#1A1A2E]">Instancias WhatsApp</h2>
              <button onClick={() => setShowNewInstance(!showNewInstance)}
                className="p-2 rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] transition-all">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showNewInstance && (
              <div className="bg-white rounded-xl p-4 border border-[#E9ECEF] space-y-3">
                <input type="text" placeholder="Nome da instancia (ex: CS, Financeiro)"
                  value={newInstanceName} onChange={e => setNewInstanceName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F1F3F5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30" />
                <input type="text" placeholder="Departamento (opcional)"
                  value={newInstanceDept} onChange={e => setNewInstanceDept(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F1F3F5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30" />
                <div className="flex gap-2">
                  <button onClick={createInstance}
                    className="flex-1 px-3 py-2 bg-[#16A34A] text-white rounded-lg text-sm font-medium hover:bg-[#15803D]">
                    Criar
                  </button>
                  <button onClick={() => setShowNewInstance(false)}
                    className="px-3 py-2 bg-[#F1F3F5] text-[#6C757D] rounded-lg text-sm hover:bg-[#E9ECEF]">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {instances.map(inst => (
              <div key={inst.id} className="bg-white rounded-xl p-4 border border-[#E9ECEF] hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#16A34A]" />
                    <span className="font-semibold text-sm text-[#1A1A2E]">{inst.name}</span>
                    {inst.department && (
                      <span className="px-2 py-0.5 bg-[#F1F3F5] text-[#6C757D] text-[10px] rounded-full">{inst.department}</span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium
                    ${inst.live_status === 'connected' ? 'bg-emerald-50 text-emerald-600' :
                      inst.live_status === 'connecting' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      inst.live_status === 'connected' ? 'bg-emerald-500 animate-pulse' :
                      inst.live_status === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
                    {inst.live_status === 'connected' ? 'Conectado' : inst.live_status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                  </div>
                </div>
                {inst.phone_number && (
                  <p className="text-xs text-[#6C757D] mb-2">{inst.phone_number}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#ADB5BD]">{inst.open_chats || 0} chats abertos</span>
                  <div className="flex gap-1">
                    {inst.live_status !== 'connected' ? (
                      <button onClick={() => waV2.connectInstance(inst.id).then(loadV2Data)}
                        className="px-3 py-1 bg-[#16A34A] text-white text-xs rounded-lg hover:bg-[#15803D]">
                        <Power className="w-3 h-3 inline mr-1" />Conectar
                      </button>
                    ) : (
                      <button onClick={() => waV2.disconnectInstance(inst.id).then(loadV2Data)}
                        className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100">
                        <PowerOff className="w-3 h-3 inline mr-1" />Desconectar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {instances.length === 0 && (
              <div className="text-center py-12 text-[#ADB5BD]">
                <Smartphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma instancia configurada</p>
                <p className="text-xs mt-1">Clique em + para adicionar</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Automations Tab ─── */}
        {mainTab === 'automations' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-[#1A1A2E]">Automacoes</h2>
              <div className="flex items-center gap-2">
                <button onClick={openNewAuto}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#16A34A] text-white rounded-lg hover:bg-[#15803D] transition-colors">
                  <Plus className="w-3.5 h-3.5" />Nova
                </button>
                <button onClick={loadAutomations}
                  className="p-2 rounded-lg hover:bg-[#F1F3F5] text-[#6C757D]">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Automation Form (Full Builder) */}
            {showAutoForm && (
              <div className="bg-white rounded-xl p-4 border-2 border-[#16A34A] space-y-4 max-h-[80vh] overflow-y-auto">
                <h3 className="text-sm font-semibold text-[#1A1A2E]">{editingAuto ? 'Editar Automacao' : 'Nova Automacao'}</h3>

                {/* Basic Info */}
                <input type="text" placeholder="Nome da automacao" value={autoForm.name}
                  onChange={e => setAutoForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E9ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30" />
                <textarea placeholder="Descricao (opcional)" value={autoForm.description}
                  onChange={e => setAutoForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E9ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 resize-none" rows={2} />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-[#6C757D] mb-1 block">Escopo</label>
                    <select value={autoForm.scope} onChange={e => setAutoForm(f => ({ ...f, scope: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-[#E9ECEF] rounded-lg">
                      <option value="global">Global</option>
                      <option value="instance_specific">Instancia Especifica</option>
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-[#6C757D] mb-1 block">Prioridade</label>
                    <input type="number" value={autoForm.priority}
                      onChange={e => setAutoForm(f => ({ ...f, priority: Number(e.target.value) }))}
                      className="w-full px-3 py-1.5 text-sm border border-[#E9ECEF] rounded-lg" />
                  </div>
                </div>

                {/* TRIGGER */}
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
                  <h4 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> GATILHO (Quando)
                  </h4>
                  <select value={autoTrigger.type}
                    onChange={e => setAutoTrigger({ type: e.target.value, config: {} })}
                    className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white mb-2">
                    {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {autoTrigger.type === 'keyword_detected' && (
                    <input type="text" placeholder="Palavras-chave (separadas por virgula)"
                      value={(autoTrigger.config.keywords || []).join(', ')}
                      onChange={e => setAutoTrigger(t => ({ ...t, config: { ...t.config, keywords: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) } }))}
                      className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white" />
                  )}
                  {autoTrigger.type === 'schedule_cron' && (
                    <input type="text" placeholder="Expressao cron (ex: 0 9 * * *)"
                      value={autoTrigger.config.cron || ''}
                      onChange={e => setAutoTrigger(t => ({ ...t, config: { ...t.config, cron: e.target.value } }))}
                      className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white" />
                  )}
                  {autoTrigger.type === 'no_response_timeout' && (
                    <input type="number" placeholder="Timeout em segundos"
                      value={autoTrigger.config.timeout_seconds || ''}
                      onChange={e => setAutoTrigger(t => ({ ...t, config: { ...t.config, timeout_seconds: Number(e.target.value) } }))}
                      className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white" />
                  )}
                </div>

                {/* CONDITIONS */}
                <div className="border border-amber-200 rounded-lg p-3 bg-amber-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> CONDICOES (Se)
                    </h4>
                    <button onClick={addAutoCondition}
                      className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200">
                      + Adicionar
                    </button>
                  </div>
                  {autoConditions.length === 0 && (
                    <p className="text-[10px] text-amber-500 italic">Nenhuma condicao (executa sempre)</p>
                  )}
                  {autoConditions.map((cond, idx) => (
                    <div key={idx} className="flex gap-2 items-start mb-2">
                      {idx > 0 && (
                        <select value={cond.logic_gate}
                          onChange={e => setAutoConditions(prev => prev.map((c, i) => i === idx ? { ...c, logic_gate: e.target.value } : c))}
                          className="w-14 px-1 py-1 text-[10px] border border-amber-200 rounded bg-white">
                          <option value="AND">E</option>
                          <option value="OR">OU</option>
                        </select>
                      )}
                      <select value={cond.type}
                        onChange={e => setAutoConditions(prev => prev.map((c, i) => i === idx ? { ...c, type: e.target.value, config: {} } : c))}
                        className="flex-1 px-2 py-1 text-xs border border-amber-200 rounded bg-white">
                        {CONDITION_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                      </select>
                      {!['is_lead', 'is_mentorado', 'has_pending_payment'].includes(cond.type) && (
                        <input type="text" placeholder="Valor"
                          value={cond.config.value || ''}
                          onChange={e => setAutoConditions(prev => prev.map((c, i) => i === idx ? { ...c, config: { ...c.config, value: e.target.value } } : c))}
                          className="w-32 px-2 py-1 text-xs border border-amber-200 rounded bg-white" />
                      )}
                      <button onClick={() => removeAutoCondition(idx)}
                        className="p-1 text-red-400 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* ACTIONS */}
                <div className="border border-green-200 rounded-lg p-3 bg-green-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-green-700 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" /> ACOES (Entao)
                    </h4>
                    <button onClick={addAutoAction}
                      className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200">
                      + Adicionar
                    </button>
                  </div>
                  {autoActions.length === 0 && (
                    <p className="text-[10px] text-green-500 italic">Adicione ao menos uma acao</p>
                  )}
                  {autoActions.map((action, idx) => (
                    <div key={idx} className="border border-green-200 rounded-lg p-2 mb-2 bg-white">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[#ADB5BD] font-mono w-5">{idx + 1}.</span>
                        <select value={action.type}
                          onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { type: e.target.value, config: e.target.value === action.type ? a.config : {} } : a))}
                          className="flex-1 px-2 py-1 text-xs border border-green-200 rounded">
                          {ACTION_TYPES.map(at => <option key={at.value} value={at.value}>{at.icon} {at.label}</option>)}
                        </select>
                        <button onClick={() => moveActionUp(idx)} className="p-1 text-[#ADB5BD] hover:text-[#6C757D]" title="Mover para cima">
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeAutoAction(idx)} className="p-1 text-red-400 hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Action-specific config */}
                      {action.type === 'send_message' && (
                        <div className="space-y-1">
                          <textarea placeholder="Mensagem (use {{contact.name}}, {{lead.nome}}, {{mentorado.email}}, etc)"
                            value={action.config.message || ''}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, message: e.target.value } } : a))}
                            className="w-full px-2 py-1 text-xs border border-green-200 rounded resize-none" rows={3} />
                          <input type="text" placeholder="Telefone destino (vazio = contato do gatilho)"
                            value={action.config.target_phone || ''}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, target_phone: e.target.value } } : a))}
                            className="w-full px-2 py-1 text-xs border border-green-200 rounded" />
                        </div>
                      )}

                      {action.type === 'wait_delay' && (
                        <div className="flex gap-2 items-center">
                          <input type="number" placeholder="Segundos"
                            value={action.config.delay_seconds || action.config.seconds || ''}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { delay_seconds: Number(e.target.value) } } : a))}
                            className="w-24 px-2 py-1 text-xs border border-green-200 rounded" />
                          <span className="text-[10px] text-[#ADB5BD]">segundos</span>
                        </div>
                      )}

                      {action.type === 'wait_for_reply' && (
                        <input type="number" placeholder="Timeout em segundos (0 = sem limite)"
                          value={action.config.timeout_seconds || ''}
                          onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { timeout_seconds: Number(e.target.value) } } : a))}
                          className="w-full px-2 py-1 text-xs border border-green-200 rounded" />
                      )}

                      {(action.type === 'add_tag' || action.type === 'remove_tag') && (
                        <input type="text" placeholder="Nome da tag"
                          value={action.config.tag || ''}
                          onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { tag: e.target.value } } : a))}
                          className="w-full px-2 py-1 text-xs border border-green-200 rounded" />
                      )}

                      {action.type === 'change_stage' && (
                        <input type="text" placeholder="Nome do estagio"
                          value={action.config.stage || ''}
                          onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { stage: e.target.value } } : a))}
                          className="w-full px-2 py-1 text-xs border border-green-200 rounded" />
                      )}

                      {action.type === 'send_notification' && (
                        <div className="space-y-1">
                          <textarea placeholder="Mensagem da notificacao"
                            value={action.config.message || ''}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, message: e.target.value } } : a))}
                            className="w-full px-2 py-1 text-xs border border-green-200 rounded resize-none" rows={2} />
                          <input type="text" placeholder="Telefone (vazio = admin)"
                            value={action.config.notify_phone || ''}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, notify_phone: e.target.value } } : a))}
                            className="w-full px-2 py-1 text-xs border border-green-200 rounded" />
                        </div>
                      )}

                      {action.type === 'call_webhook' && (
                        <div className="space-y-1">
                          <input type="text" placeholder="URL do webhook"
                            value={action.config.url || ''}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, url: e.target.value } } : a))}
                            className="w-full px-2 py-1 text-xs border border-green-200 rounded" />
                          <select value={action.config.method || 'POST'}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, method: e.target.value } } : a))}
                            className="w-full px-2 py-1 text-xs border border-green-200 rounded">
                            <option value="POST">POST</option>
                            <option value="GET">GET</option>
                            <option value="PUT">PUT</option>
                          </select>
                        </div>
                      )}

                      {action.type === 'update_lead_status' && (
                        <select value={action.config.status || ''}
                          onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { status: e.target.value } } : a))}
                          className="w-full px-2 py-1 text-xs border border-green-200 rounded">
                          <option value="">Selecione</option>
                          <option value="novo">Novo</option>
                          <option value="contatado">Contatado</option>
                          <option value="qualificado">Qualificado</option>
                          <option value="negociando">Negociando</option>
                          <option value="vendido">Vendido</option>
                          <option value="perdido">Perdido</option>
                        </select>
                      )}

                      {action.type === 'set_contact_field' && (
                        <div className="flex gap-2">
                          <input type="text" placeholder="Campo"
                            value={action.config.field || ''}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, field: e.target.value } } : a))}
                            className="flex-1 px-2 py-1 text-xs border border-green-200 rounded" />
                          <input type="text" placeholder="Valor"
                            value={action.config.value || ''}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, value: e.target.value } } : a))}
                            className="flex-1 px-2 py-1 text-xs border border-green-200 rounded" />
                        </div>
                      )}

                      {action.type === 'send_media' && (
                        <div className="space-y-1">
                          <input type="text" placeholder="URL da midia"
                            value={action.config.media_url || ''}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, media_url: e.target.value } } : a))}
                            className="w-full px-2 py-1 text-xs border border-green-200 rounded" />
                          <input type="text" placeholder="Legenda"
                            value={action.config.caption || ''}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, caption: e.target.value } } : a))}
                            className="w-full px-2 py-1 text-xs border border-green-200 rounded" />
                          <select value={action.config.media_type || 'image'}
                            onChange={e => setAutoActions(prev => prev.map((a, i) => i === idx ? { ...a, config: { ...a.config, media_type: e.target.value } } : a))}
                            className="w-full px-2 py-1 text-xs border border-green-200 rounded">
                            <option value="image">Imagem</option>
                            <option value="video">Video</option>
                            <option value="document">Documento</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Variables Helper */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[10px] font-medium text-[#6C757D] mb-1">Variaveis disponiveis:</p>
                  <div className="flex flex-wrap gap-1">
                    {['{{contact.name}}', '{{contact.phone}}', '{{lead.nome}}', '{{lead.email}}', '{{mentorado.nome}}', '{{mentorado.email}}', '{{mentorado.turma}}', '{{financeiro.total_pendente}}', '{{event.message}}'].map(v => (
                      <span key={v} className="px-1.5 py-0.5 bg-white border border-[#E9ECEF] rounded text-[9px] font-mono text-[#6C757D] cursor-pointer hover:bg-[#F1F3F5]"
                        onClick={() => navigator.clipboard.writeText(v)}>
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowAutoForm(false); setEditingAuto(null); }}
                    className="px-3 py-1.5 text-xs text-[#6C757D] hover:bg-[#F1F3F5] rounded-lg">Cancelar</button>
                  <button onClick={saveAutomation}
                    className="px-4 py-1.5 text-xs font-medium bg-[#16A34A] text-white rounded-lg hover:bg-[#15803D]">
                    {editingAuto ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </div>
            )}

            {automations.map(auto => (
              <div key={auto.id} className="bg-white rounded-xl p-4 border border-[#E9ECEF] hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${auto.is_active ? 'text-[#16A34A]' : 'text-gray-400'}`} />
                    <span className="font-semibold text-sm text-[#1A1A2E]">{auto.name}</span>
                  </div>
                  <button onClick={() => waV2.toggleAutomation(auto.id).then(loadAutomations)}
                    className={`relative w-10 h-5 rounded-full transition-all ${auto.is_active ? 'bg-[#16A34A]' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${auto.is_active ? 'left-5.5' : 'left-0.5'}`}
                      style={{ left: auto.is_active ? '22px' : '2px' }} />
                  </button>
                </div>
                {auto.description && <p className="text-xs text-[#6C757D] mb-1">{auto.description}</p>}
                {/* Show trigger and actions summary */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {auto.triggers?.map((t: any, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-medium">
                      {TRIGGER_TYPES.find(tt => tt.value === t.trigger_type)?.label || t.trigger_type}
                    </span>
                  ))}
                  {auto.conditions?.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-medium">
                      {auto.conditions.length} condicao(oes)
                    </span>
                  )}
                  {auto.actions?.map((a: any, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-medium">
                      {ACTION_TYPES.find(at => at.value === a.action_type)?.icon} {ACTION_TYPES.find(at => at.value === a.action_type)?.label || a.action_type}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#ADB5BD]">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />{auto.executions_24h || 0} exec/24h
                  </span>
                  {(auto.failures_24h || 0) > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertCircle className="w-3 h-3" />{auto.failures_24h} falhas
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />{auto.scope === 'global' ? 'Global' : 'Especifica'}
                  </span>
                  <span>v{auto.version}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  <button onClick={() => openEditAuto(auto)}
                    className="px-2 py-1 text-[10px] bg-[#F1F3F5] text-[#6C757D] rounded-md hover:bg-[#E9ECEF]">
                    <Settings className="w-3 h-3 inline mr-0.5" />Editar
                  </button>
                  <button onClick={() => waV2.duplicateAutomation(auto.id).then(loadAutomations)}
                    className="px-2 py-1 text-[10px] bg-[#F1F3F5] text-[#6C757D] rounded-md hover:bg-[#E9ECEF]">
                    <Copy className="w-3 h-3 inline mr-0.5" />Duplicar
                  </button>
                </div>
              </div>
            ))}

            {automations.length === 0 && (
              <div className="text-center py-12 text-[#ADB5BD]">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma automacao configurada</p>
                <button onClick={loadAutomations}
                  className="mt-2 text-xs text-[#16A34A] hover:underline">Carregar automacoes</button>
              </div>
            )}
          </div>
        )}

        {/* ─── Stats Tab ─── */}
        {mainTab === 'stats' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h2 className="text-lg font-semibold text-[#1A1A2E] mb-2">Dashboard WhatsApp</h2>

            {stats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-[#E9ECEF]">
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone className="w-4 h-4 text-[#16A34A]" />
                      <span className="text-xs text-[#6C757D]">Instancias</span>
                    </div>
                    <span className="text-2xl font-bold text-[#1A1A2E]">{stats.instances}</span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E9ECEF]">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-[#6C757D]">Chats Abertos</span>
                    </div>
                    <span className="text-2xl font-bold text-[#1A1A2E]">{stats.chats.open}</span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E9ECEF]">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-[#6C757D]">Contatos</span>
                    </div>
                    <span className="text-2xl font-bold text-[#1A1A2E]">{stats.contacts.total}</span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-[#E9ECEF]">
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-[#6C757D]">Automacoes</span>
                    </div>
                    <span className="text-2xl font-bold text-[#1A1A2E]">{stats.automations.active}/{stats.automations.total}</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-[#E9ECEF]">
                  <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3">Contatos Vinculados</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6C757D]">Com Lead</span>
                      <span className="text-xs font-medium text-[#1A1A2E]">{stats.contacts.with_lead}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6C757D]">Com Mentorado</span>
                      <span className="text-xs font-medium text-[#1A1A2E]">{stats.contacts.with_mentorado}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6C757D]">Identidade Pendente</span>
                      <span className={`text-xs font-medium ${stats.pending_identity > 0 ? 'text-amber-600' : 'text-[#1A1A2E]'}`}>
                        {stats.pending_identity}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-[#ADB5BD]">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Carregando estatisticas...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════ COLUMN 2: Chat Messages ══════ */}
      <div className={`flex-1 flex flex-col ${mobileView === 'list' ? 'hidden md:flex' : 'flex'} bg-white/50`}>
        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-[#16A34A]/20 mx-auto mb-4" />
              <p className="text-[#6C757D] font-medium">Selecione um chat para comecar</p>
              <p className="text-xs text-[#ADB5BD] mt-1">Escolha uma conversa na lista ao lado</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-[#E9ECEF]/60 bg-white/80 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedChat(null); setMobileView('list'); }}
                  className="md:hidden p-1.5 rounded-lg hover:bg-[#F1F3F5]">
                  <ArrowLeft className="w-5 h-5 text-[#6C757D]" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#16A34A]/10 to-[#16A34A]/5 flex items-center justify-center">
                  {selectedChat.isGroup ? <Users className="w-5 h-5 text-[#16A34A]" /> :
                    <span className="text-sm font-semibold text-[#16A34A]">{getInitials(selectedChat.name)}</span>}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#1A1A2E]">{getDisplayName(selectedChat)}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-[#6C757D]">{getPhoneDisplay(selectedChat.id)}</p>
                    {leadInfo && (
                      <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${getStatusColor(leadInfo.status)}`}>
                        {leadInfo.status}
                      </span>
                    )}
                    {contactDividas.some(d => d.status === 'atrasado') && (
                      <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-red-100 text-red-700">
                        Inadimplente
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={syncCurrentChat}
                  className={`p-2 rounded-lg hover:bg-[#F1F3F5] text-[#6C757D] transition-all ${isSyncingChat ? 'animate-spin' : ''}`}>
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                  className={`p-2 rounded-lg transition-all ${showDetailsPanel ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'hover:bg-[#F1F3F5] text-[#6C757D]'}`}>
                  <User className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin bg-[#F8F9FB]/50">
              {chatMessages.map((msg, idx) => {
                const prevMsg = idx > 0 ? chatMessages[idx - 1] : null;
                const showDate = !prevMsg || formatDate(msg.timestamp) !== formatDate(prevMsg.timestamp);

                return (
                  <div key={`${msg.id}-${idx}`}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="px-3 py-1 bg-white/80 rounded-full text-[10px] text-[#ADB5BD] shadow-sm">
                          {formatDate(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words
                        ${msg.isFromMe
                          ? 'bg-[#16A34A] text-white rounded-br-md'
                          : 'bg-white text-[#1A1A2E] rounded-bl-md shadow-sm border border-[#E9ECEF]/40'}`}>
                        {msg.body}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${msg.isFromMe ? 'text-white/70' : 'text-[#ADB5BD]'}`}>
                          <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                          {msg.isFromMe && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Image/Video preview */}
            {(imagePreview || videoPreview) && (
              <div className="px-4 py-3 bg-white border-t border-[#E9ECEF]/60">
                <div className="flex items-center gap-3">
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                  )}
                  {videoPreview && (
                    <video src={videoPreview} className="w-20 h-20 object-cover rounded-lg" />
                  )}
                  <div className="flex-1">
                    <input type="text"
                      placeholder="Legenda (opcional)"
                      value={imagePreview ? imageCaption : videoCaption}
                      onChange={(e) => imagePreview ? setImageCaption(e.target.value) : setVideoCaption(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F1F3F5] rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={imagePreview ? sendImage : sendVideo}
                      disabled={isSendingImage || isSendingVideo}
                      className="p-2 bg-[#16A34A] text-white rounded-lg hover:bg-[#15803D] disabled:opacity-50">
                      {(isSendingImage || isSendingVideo) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                    <button onClick={imagePreview ? cancelImage : cancelVideo}
                      className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Message input */}
            {!imagePreview && !videoPreview && (
              <div className="px-4 py-3 bg-white border-t border-[#E9ECEF]/60">
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl hover:bg-[#F1F3F5] text-[#6C757D] transition-all">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input type="text" placeholder="Digite uma mensagem..."
                    value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    className="flex-1 px-4 py-2.5 bg-[#F1F3F5]/80 rounded-xl text-sm text-[#1A1A2E] placeholder-[#ADB5BD] focus:outline-none focus:ring-1 focus:ring-[#16A34A]/30 transition-all" />
                  <button onClick={sendMessage} disabled={isLoading || !newMessage.trim()}
                    className="p-2.5 rounded-xl bg-[#16A34A] text-white hover:bg-[#15803D] disabled:opacity-50 transition-all shadow-sm">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════ COLUMN 3: Details Panel ══════ */}
      {showDetailsPanel && selectedChat && !selectedChat.isGroup && (
        <div className="w-[380px] min-w-[380px] hidden lg:flex flex-col border-l border-[#E9ECEF]/60 bg-white/80 backdrop-blur-xl overflow-hidden">
          {/* Detail tabs */}
          <div className="px-3 pt-3 pb-1 border-b border-[#E9ECEF]/40">
            <div className="flex gap-0.5 overflow-x-auto scrollbar-none">
              {([
                { key: 'detalhes', icon: User, label: 'Detalhes' },
                { key: 'financeiro', icon: DollarSign, label: 'Financeiro' },
                { key: 'anotacoes', icon: StickyNote, label: 'Notas' },
                { key: 'historico', icon: History, label: 'Historico' },
              ] as { key: ContactTab; icon: any; label: string }[]).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                    ${activeTab === tab.key ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'text-[#6C757D] hover:bg-[#F1F3F5]'}`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ─── Details tab ─── */}
            {activeTab === 'detalhes' && (
              <div className="p-4 space-y-4">
                {/* Contact info */}
                <div className="text-center pb-4 border-b border-[#E9ECEF]/40">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#16A34A]/20 to-[#16A34A]/5 flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-[#16A34A]">{getInitials(selectedChat.name)}</span>
                  </div>
                  <h3 className="font-semibold text-[#1A1A2E]">{getDisplayName(selectedChat)}</h3>
                  <p className="text-sm text-[#6C757D]">{getPhoneDisplay(selectedChat.id)}</p>
                </div>

                {isLoadingLead ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#16A34A]" />
                  </div>
                ) : leadInfo ? (
                  <>
                    {/* Lead info */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-[#ADB5BD] uppercase tracking-wider">Lead</h4>
                      <div className="bg-[#F8F9FB] rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6C757D]">Status</span>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(leadInfo.status)}`}>
                            {leadInfo.status}
                          </span>
                        </div>
                        {leadInfo.temperatura && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#6C757D]">Temperatura</span>
                            <span className="text-xs font-medium">
                              {leadInfo.temperatura === 'quente' ? '🔥' : leadInfo.temperatura === 'morno' ? '🌡️' : '❄️'} {leadInfo.temperatura}
                            </span>
                          </div>
                        )}
                        {leadInfo.origem && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#6C757D]">Origem</span>
                            <span className="text-xs font-medium text-[#1A1A2E]">{leadInfo.origem}</span>
                          </div>
                        )}
                        {leadInfo.email && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#6C757D]">Email</span>
                            <span className="text-xs font-medium text-[#1A1A2E] truncate max-w-[150px]">{leadInfo.email}</span>
                          </div>
                        )}
                        {leadInfo.empresa && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#6C757D]">Empresa</span>
                            <span className="text-xs font-medium text-[#1A1A2E]">{leadInfo.empresa}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6C757D]">Desde</span>
                          <span className="text-xs font-medium text-[#1A1A2E]">{formatDateStr(leadInfo.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial summary */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-[#ADB5BD] uppercase tracking-wider">Valores</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-[10px] text-green-600 mb-0.5">Vendido</p>
                          <p className="text-sm font-bold text-green-700">{formatCurrency(leadInfo.valor_vendido)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-[10px] text-blue-600 mb-0.5">Arrecadado</p>
                          <p className="text-sm font-bold text-blue-700">{formatCurrency(leadInfo.valor_arrecadado)}</p>
                        </div>
                      </div>
                    </div>

                    {leadInfo.observacoes && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-[#ADB5BD] uppercase tracking-wider">Observacoes</h4>
                        <p className="text-xs text-[#6C757D] bg-[#F8F9FB] rounded-lg p-3">{leadInfo.observacoes}</p>
                      </div>
                    )}

                    <Link href={`/leads?search=${encodeURIComponent(leadInfo.telefone || leadInfo.email || leadInfo.nome_completo)}`}>
                      <button className="w-full mt-2 px-3 py-2 bg-[#16A34A]/10 text-[#16A34A] rounded-lg text-xs font-medium hover:bg-[#16A34A]/20 transition-all">
                        <Eye className="w-3.5 h-3.5 inline mr-1.5" />
                        Ver lead completo
                      </button>
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-6 text-[#ADB5BD]">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Lead nao encontrado</p>
                    <p className="text-[10px] mt-1">Este contato nao esta vinculado a nenhum lead</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Financial tab ─── */}
            {activeTab === 'financeiro' && (
              <div className="p-4 space-y-4">
                <h4 className="text-xs font-semibold text-[#ADB5BD] uppercase tracking-wider">Situacao Financeira</h4>

                {contactDividas.length > 0 ? (
                  <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-amber-600 mb-0.5">Pendente</p>
                        <p className="text-sm font-bold text-amber-700">
                          {formatCurrency(contactDividas.filter(d => d.status === 'pendente').reduce((s, d) => s + (d.valor || 0), 0))}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-red-600 mb-0.5">Atrasado</p>
                        <p className="text-sm font-bold text-red-700">
                          {formatCurrency(contactDividas.filter(d => d.status === 'atrasado').reduce((s, d) => s + (d.valor || 0), 0))}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-green-600 mb-0.5">Pago</p>
                        <p className="text-sm font-bold text-green-700">
                          {formatCurrency(contactDividas.filter(d => d.status === 'pago').reduce((s, d) => s + (d.valor || 0), 0))}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-600 mb-0.5">Total</p>
                        <p className="text-sm font-bold text-gray-700">
                          {formatCurrency(contactDividas.reduce((s, d) => s + (d.valor || 0), 0))}
                        </p>
                      </div>
                    </div>

                    {/* Dividas list */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-[#ADB5BD] uppercase tracking-wider">Parcelas / Dividas</h4>
                      {contactDividas.map((d: any) => {
                        const isOverdue = d.status === 'atrasado' || (d.status === 'pendente' && new Date(d.data_vencimento) < new Date());
                        return (
                          <div key={d.id} className={`rounded-lg p-3 border ${
                            d.status === 'pago' ? 'bg-green-50/50 border-green-100' :
                            isOverdue ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-[#1A1A2E]">{formatCurrency(d.valor)}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                                d.status === 'pago' ? 'bg-green-100 text-green-700' :
                                isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {d.status === 'pago' ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[#6C757D]">
                              <span>Vencimento: {formatDateStr(d.data_vencimento)}</span>
                              {d.data_pagamento && <span>Pago: {formatDateStr(d.data_pagamento)}</span>}
                            </div>
                            {d.observacoes && <p className="text-[10px] text-[#ADB5BD] mt-1">{d.observacoes}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-[#ADB5BD]">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Sem dados financeiros</p>
                    <p className="text-[10px] mt-1">Nenhuma divida vinculada a este contato</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Notes tab ─── */}
            {activeTab === 'anotacoes' && (
              <div className="p-4 space-y-3">
                {/* Add note */}
                <div className="flex gap-2">
                  <input type="text" placeholder="Adicionar anotacao..."
                    value={newNote} onChange={e => setNewNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
                    className="flex-1 px-3 py-2 bg-[#F1F3F5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#16A34A]/30" />
                  <button onClick={addNote} disabled={!newNote.trim()}
                    className="px-3 py-2 bg-[#16A34A] text-white rounded-lg text-sm disabled:opacity-50 hover:bg-[#15803D]">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Notes list */}
                {leadNotes.length > 0 ? (
                  <div className="space-y-2">
                    {leadNotes.map(note => (
                      <div key={note.id} className="bg-[#F8F9FB] rounded-lg p-3 border border-[#E9ECEF]/40">
                        <p className="text-xs text-[#1A1A2E]">{note.conteudo}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-[#ADB5BD]">{formatDateStr(note.created_at)}</span>
                          <span className={`px-1.5 py-0.5 text-[9px] rounded-full ${
                            note.prioridade === 'alta' || note.prioridade === 'high' ? 'bg-red-100 text-red-600' :
                            note.prioridade === 'urgent' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {note.tipo_nota}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#ADB5BD]">
                    <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Sem anotacoes</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── History tab ─── */}
            {activeTab === 'historico' && (
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#ADB5BD] uppercase tracking-wider">Historico do Contato</h4>

                {contactHistory.length > 0 ? (
                  <div className="space-y-2">
                    {contactHistory.map((h: any, idx: number) => (
                      <div key={h.id || idx} className="flex gap-3 items-start">
                        <div className="w-2 h-2 rounded-full bg-[#16A34A]/30 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 bg-[#F8F9FB] rounded-lg p-3 border border-[#E9ECEF]/40">
                          <p className="text-xs text-[#1A1A2E]">
                            {h.action || h.tipo || h.descricao || h.description || 'Acao registrada'}
                          </p>
                          {(h.description || h.detalhes) && (
                            <p className="text-[10px] text-[#6C757D] mt-1">{h.description || h.detalhes}</p>
                          )}
                          <span className="text-[10px] text-[#ADB5BD]">{formatDateStr(h.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#ADB5BD]">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Sem historico</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
