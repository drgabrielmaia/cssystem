// WhatsApp Core API Client for Bohr.io integration
import { supabase } from './supabase';
import { getToken } from './api';

// Org ID validado pelo servidor (setado pelo auth context após /auth/me)
let _validatedOrgId: string | null = null;

/**
 * Setter chamado pelo auth context após validação server-side.
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

class WhatsAppCoreAPI {
  private baseUrl: string;

  constructor() {
    // Usar variável de ambiente ou fallback
    this.baseUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br';
    console.log('🔍 WhatsApp API - baseUrl final:', this.baseUrl);
  }

  // Função para determinar userId baseado na organização
  // PRIORIDADE: org ID validado pelo servidor (setado pelo auth context)
  private async getOrganizationId(): Promise<string> {
    try {
      // 1. Usar org ID validado pelo servidor (setado pelo auth context após /auth/me)
      if (_validatedOrgId) {
        console.log('✅ Organização validada pelo servidor:', _validatedOrgId);
        return _validatedOrgId;
      }

      // 2. Fallback: Try Supabase auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.warn('Usuário não autenticado, usando organização padrão');
        return 'default';
      }

      // Admin sempre usa 'default'
      if (user.email === 'admin@admin.com') {
        return 'default';
      }

      console.log('🔍 Buscando organização para usuário:', user.email, 'ID:', user.id);

      // 3. Tentar buscar por email primeiro (mais confiável)
      const { data: orgByEmail, error: emailError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('email', user.email)
        .single();

      if (!emailError && orgByEmail) {
        console.log('✅ Organização encontrada por email:', orgByEmail.organization_id);
        return orgByEmail.organization_id;
      }

      // 4. Fallback: tentar buscar pela tabela organizations usando owner_email
      const { data: orgDirectData, error: orgDirectError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_email', user.email)
        .single();

      if (!orgDirectError && orgDirectData) {
        console.log('✅ Organização encontrada como owner:', orgDirectData.id);
        return orgDirectData.id;
      }

      console.warn('⚠️ Organização não encontrada, usando padrão');
      return 'default';
    } catch (error) {
      console.error('❌ Erro ao obter organization_id:', error);
      return 'default';
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit, requireAuth = false): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log('🌐 WhatsApp API - Fazendo request para:', url);
      console.log('🔍 WhatsApp API - URL protocol:', new URL(url).protocol);

      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };

      // Adicionar headers personalizados se fornecidos
      if (options?.headers) {
        Object.assign(headers, options.headers);
      }

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

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getStatus(): Promise<ApiResponse<WhatsAppStatus>> {
    const organizationId = await this.getOrganizationId();
    return this.request<WhatsAppStatus>(`/users/${organizationId}/status`);
  }

  async getQRCode(): Promise<ApiResponse<QRCodeData>> {
    const organizationId = await this.getOrganizationId();
    return this.request<QRCodeData>(`/users/${organizationId}/qr`);
  }

  async getContacts(): Promise<ApiResponse<Contact[]>> {
    const organizationId = await this.getOrganizationId();
    return this.request<Contact[]>(`/users/${organizationId}/contacts`);
  }

  async getChats(): Promise<ApiResponse<Chat[]>> {
    const organizationId = await this.getOrganizationId();
    return this.request<Chat[]>(`/users/${organizationId}/chats`);
  }

  async getMessages(limit = 50): Promise<ApiResponse<Message[]>> {
    const organizationId = await this.getOrganizationId();
    return this.request<Message[]>(`/users/${organizationId}/messages?limit=${limit}`);
  }

  async getChatMessages(chatId: string, limit = 50): Promise<ApiResponse<Message[]>> {
    const organizationId = await this.getOrganizationId();
    return this.request<Message[]>(`/users/${organizationId}/messages/${encodeURIComponent(chatId)}?limit=${limit}`);
  }

  async getChatHistory(chatId: string, limit = 5): Promise<ApiResponse<Message[]>> {
    const organizationId = await this.getOrganizationId();
    return this.request<Message[]>(`/users/${organizationId}/chats/${encodeURIComponent(chatId)}/history?limit=${limit}`);
  }

  async sendMessage(phoneNumber: string, message: string): Promise<ApiResponse<{ messageId: string; timestamp: number }>> {
    const organizationId = await this.getOrganizationId();
    return this.request(`/users/${organizationId}/send`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, message }),
    }, true); // Exigir autenticação
  }

  async getHealth(): Promise<ApiResponse<{ message: string; timestamp: string }>> {
    return this.request('/health');
  }

  async registerUser(): Promise<ApiResponse<{ message: string; userId: string }>> {
    const organizationId = await this.getOrganizationId();
    return this.request(`/users/${organizationId}/register`, {
      method: 'POST',
    });
  }

  async syncChat(chatId: string): Promise<ApiResponse<{ chatId: string; messageCount: number; messages: Message[] }>> {
    const organizationId = await this.getOrganizationId();
    return this.request(`/users/${organizationId}/chats/${encodeURIComponent(chatId)}/sync`, {
      method: 'POST',
    });
  }
}

export const whatsappCoreAPI = new WhatsAppCoreAPI();