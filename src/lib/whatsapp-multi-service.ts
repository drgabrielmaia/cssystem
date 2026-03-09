// WhatsApp Multi-Organization Service - Nova implementação
import { supabase } from './supabase';
import { getToken } from './api';

// Org ID validado pelo servidor (setado pelo auth context após /auth/me)
let _validatedOrgId: string | null = null;

/**
 * Setter chamado pelo auth context após validação server-side.
 * Garante que o org ID usado nos requests veio do backend, não de localStorage.
 */
export function setValidatedOrgId(orgId: string) {
  _validatedOrgId = orgId;
}

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
    this.baseUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br';
    console.log('🚀 WhatsApp Multi-Service inicializado com:', this.baseUrl);
  }

  /**
   * Obter userId único para a organização atual
   * Usa o id da organização como identificador único.
   * PRIORIDADE: org ID validado pelo servidor (setado pelo auth context)
   */
  private async getUserId(): Promise<string> {
    try {
      // 1. Usar org ID validado pelo servidor (setado pelo auth context após /auth/me)
      if (_validatedOrgId) {
        console.log('✅ Organização validada pelo servidor:', _validatedOrgId);
        return _validatedOrgId;
      }

      // 2. Fallback: Try Supabase auth (for Supabase-authenticated users)
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

      // 3. Buscar organização por email na tabela organization_users
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
        // 4. Fallback: buscar diretamente na tabela organizations
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

      // Usar o ID da organização diretamente como userId
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
        // 1. Check custom JWT token first (Docker PostgreSQL backend)
        const customToken = getToken();
        if (customToken) {
          headers['Authorization'] = `Bearer ${customToken}`;
        } else {
          // 2. Fallback: Supabase session token
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          } else {
            return {
              success: false,
              error: 'Usuário não autenticado. Faça login para enviar mensagens.',
            } as ApiResponse<T>;
          }
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
    return this.request<Chat[]>(`/users/${userId}/chats`, undefined, true);
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
   * Enviar imagem
   */
  async sendImage(phoneNumber: string, imageBase64: string, caption?: string): Promise<ApiResponse<{ messageId: string }>> {
    const userId = await this.getUserId();
    return this.request(`/users/${userId}/send-image`, {
      method: 'POST',
      body: JSON.stringify({ to: phoneNumber, imageBase64, caption }),
    }, true);
  }

  /**
   * Verificar se número existe no WhatsApp
   */
  async checkNumber(phone: string): Promise<ApiResponse<{ exists: boolean; jid: string | null; number: string }>> {
    const userId = await this.getUserId();
    return this.request(`/users/${userId}/check-number`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }, true);
  }

  /**
   * Enviar vídeo
   */
  async sendVideo(phoneNumber: string, videoBase64: string, caption?: string): Promise<ApiResponse<{ messageId: string }>> {
    const userId = await this.getUserId();
    return this.request(`/users/${userId}/send-video`, {
      method: 'POST',
      body: JSON.stringify({ to: phoneNumber, videoBase64, caption }),
    }, true);
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
   * Enviar mídia (imagem, vídeo, documento) via URL
   */
  async sendMedia(phoneNumber: string, mediaUrl: string, mediaType: 'image' | 'video' | 'document', caption?: string, filename?: string, mimetype?: string): Promise<ApiResponse<any>> {
    const userId = await this.getUserId();
    if (!userId) return { success: false, error: 'No user ID' };

    const response = await fetch(`${this.baseUrl}/users/${userId}/send-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phoneNumber.replace(/\D/g, ''),
        mediaUrl,
        mediaType,
        caption,
        filename,
        mimetype
      })
    });
    const result = await response.json();
    return result;
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