// WhatsApp Multi-Organization Service - Nova implementação
import { supabase } from './supabase';

export interface WhatsAppStatus {
  isReady: boolean;
  isConnecting: boolean;
  hasQR: boolean;
  contactsCount: number;
  messagesCount: number;
  registered: boolean;
  userInfo?: {
    id: string;
    name: string;
    phone: string;
    isConnected: boolean;
  };
}

export interface QRCodeData {
  qr: string;
  qrImage: string;
}

export interface Contact {
  id: string;
  name: string;
  pushname: string;
  number: string;
  isMyContact: boolean;
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage: {
    body: string;
    timestamp: number;
    isFromMe: boolean;
  };
  unreadCount: number;
  timestamp: number;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  type: string;
  timestamp: number;
  isFromMe: boolean;
  contact: {
    id: string;
    name: string;
    pushname: string;
    number: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

class WhatsAppMultiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://api.medicosderesultado.com.br';
    console.log('🚀 WhatsApp Multi-Service inicializado com:', this.baseUrl);
  }

  /**
   * Obter userId único para a organização atual
   * Usa o owner_phone da organização como identificador único
   */
  private async getUserId(): Promise<string> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.warn('⚠️ Usuário não autenticado, usando padrão');
        return 'default';
      }

      // Admin sempre usa 'default'
      if (user.email === 'admin@admin.com') {
        console.log('🔑 Admin detectado, usando userId: default');
        return 'default';
      }

      console.log('🔍 Buscando organização para usuário:', user.email);

      // 1. Buscar organização por email na tabela organization_users
      const { data: orgUser, error: orgUserError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('email', user.email)
        .single();

      let organizationId = null;

      if (!orgUserError && orgUser) {
        organizationId = orgUser.organization_id;
        console.log('✅ Organização encontrada via organization_users:', organizationId);
      } else {
        // 2. Fallback: buscar diretamente na tabela organizations
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_email', user.email)
          .single();

        if (!orgError && orgData) {
          organizationId = orgData.id;
          console.log('✅ Organização encontrada via organizations:', organizationId);
        }
      }

      if (!organizationId) {
        console.warn('⚠️ Organização não encontrada, usando padrão');
        return 'default';
      }

      // 3. Buscar owner_phone da organização para usar como userId
      const { data: orgDetails, error: detailsError } = await supabase
        .from('organizations')
        .select('owner_phone, name')
        .eq('id', organizationId)
        .single();

      if (detailsError || !orgDetails) {
        console.warn('⚠️ Detalhes da organização não encontrados');
        return organizationId; // Usar ID como fallback
      }

      // Usar owner_phone como userId (sem caracteres especiais)
      if (orgDetails.owner_phone) {
        const userId = orgDetails.owner_phone.replace(/\D/g, ''); // Remove tudo que não é número
        console.log(`✅ UserId definido: ${userId} (org: ${orgDetails.name})`);
        return userId;
      }

      console.log('✅ UserId definido como organizationId:', organizationId);
      return organizationId;

    } catch (error) {
      console.error('❌ Erro ao obter userId:', error);
      return 'default';
    }
  }

  /**
   * Fazer requisição para API
   */
  private async request<T>(endpoint: string, options?: RequestInit, requireAuth = false): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log('📡 Fazendo requisição para:', url);

      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };

      // Adicionar token de autenticação se necessário
      if (requireAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log('🔐 Token de autenticação adicionado');
        } else {
          return {
            success: false,
            error: 'Usuário não autenticado. Faça login para enviar mensagens.',
          } as ApiResponse<T>;
        }
      }

      const response = await fetch(url, {
        headers,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Resposta recebida:', { success: data.success, hasData: !!data.data });
      return data;

    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // === MÉTODOS PÚBLICOS ===

  /**
   * Registrar usuário/organização no sistema WhatsApp
   */
  async registerUser(): Promise<ApiResponse<{ message: string; userId: string }>> {
    const userId = await this.getUserId();
    console.log('📝 Registrando usuário:', userId);
    return this.request(`/users/${userId}/register`, {
      method: 'POST',
    });
  }

  /**
   * Verificar status da conexão WhatsApp
   */
  async getStatus(): Promise<ApiResponse<WhatsAppStatus>> {
    const userId = await this.getUserId();
    console.log('📊 Verificando status para userId:', userId);
    return this.request<WhatsAppStatus>(`/users/${userId}/status`);
  }

  /**
   * Obter QR Code para conectar WhatsApp
   */
  async getQRCode(): Promise<ApiResponse<QRCodeData>> {
    const userId = await this.getUserId();
    console.log('📱 Obtendo QR Code para userId:', userId);
    return this.request<QRCodeData>(`/users/${userId}/qr`);
  }

  /**
   * Obter lista de contatos
   */
  async getContacts(): Promise<ApiResponse<Contact[]>> {
    const userId = await this.getUserId();
    console.log('👥 Obtendo contatos para userId:', userId);
    return this.request<Contact[]>(`/users/${userId}/contacts`);
  }

  /**
   * Obter lista de chats/conversas
   */
  async getChats(): Promise<ApiResponse<Chat[]>> {
    const userId = await this.getUserId();
    console.log('💬 Obtendo chats para userId:', userId);
    return this.request<Chat[]>(`/users/${userId}/chats`);
  }

  /**
   * Obter mensagens de um chat específico
   */
  async getChatMessages(chatId: string, limit = 50): Promise<ApiResponse<Message[]>> {
    const userId = await this.getUserId();
    console.log('📨 Obtendo mensagens do chat:', chatId, 'userId:', userId);
    return this.request<Message[]>(`/users/${userId}/messages/${encodeURIComponent(chatId)}?limit=${limit}`);
  }

  /**
   * Enviar mensagem
   */
  async sendMessage(phoneNumber: string, message: string): Promise<ApiResponse<{ messageId: string; timestamp: number }>> {
    const userId = await this.getUserId();
    console.log('📤 Enviando mensagem via userId:', userId, 'para:', phoneNumber);
    return this.request(`/users/${userId}/send`, {
      method: 'POST',
      body: JSON.stringify({ 
        to: phoneNumber, 
        message: message 
      }),
    }, true); // Exigir autenticação
  }

  /**
   * Sincronizar chat específico
   */
  async syncChat(chatId: string): Promise<ApiResponse<{ chatId: string; messageCount: number; messages: Message[] }>> {
    const userId = await this.getUserId();
    console.log('🔄 Sincronizando chat:', chatId, 'userId:', userId);
    return this.request(`/users/${userId}/chats/${encodeURIComponent(chatId)}/sync`, {
      method: 'POST',
    });
  }

  /**
   * Verificar health da API
   */
  async getHealth(): Promise<ApiResponse<{ message: string; timestamp: string }>> {
    return this.request('/health');
  }

  /**
   * Limpar mensagens em cache
   */
  async clearMessages(): Promise<ApiResponse<{ message: string }>> {
    const userId = await this.getUserId();
    console.log('🧹 Limpando mensagens para userId:', userId);
    return this.request(`/users/${userId}/clear-messages`, {
      method: 'POST',
    });
  }

  /**
   * Obter todas as mensagens (com limite)
   */
  async getMessages(limit = 50): Promise<ApiResponse<Message[]>> {
    const userId = await this.getUserId();
    console.log('📥 Obtendo mensagens gerais para userId:', userId);
    return this.request<Message[]>(`/users/${userId}/messages?limit=${limit}`);
  }

  /**
   * Obter histórico de chat
   */
  async getChatHistory(chatId: string, limit = 5): Promise<ApiResponse<Message[]>> {
    const userId = await this.getUserId();
    console.log('📜 Obtendo histórico do chat:', chatId, 'userId:', userId);
    return this.request<Message[]>(`/users/${userId}/chats/${encodeURIComponent(chatId)}/history?limit=${limit}`);
  }

  /**
   * Desconectar WhatsApp
   */
  async disconnect(): Promise<ApiResponse<{ message: string }>> {
    const userId = await this.getUserId();
    console.log('📴 Desconectando userId:', userId);
    return this.request(`/users/${userId}/disconnect`, {
      method: 'POST',
    });
  }
}

// Instância única do serviço
export const whatsappMultiService = new WhatsAppMultiService();
export default whatsappMultiService;