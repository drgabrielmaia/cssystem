// WhatsApp Core API Client for Bohr.io integration
import { supabase } from './supabase';

export interface WhatsAppStatus {
  isReady: boolean;
  isConnecting: boolean;
  hasQR: boolean;
  contactsCount: number;
  messagesCount: number;
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

  // Função para determinar userId baseado no usuário logado
  private getUserId(userEmail?: string): string {
    if (!userEmail) return 'default';

    // Admin sempre usa 'default'
    if (userEmail === 'admin@medicosderesultado.com.br' ||
        userEmail === 'emersin7x@gmail.com' ||
        userEmail === 'admin@empresa.com') {
      return 'default';
    }

    // Outros usuários usam seu email
    return userEmail;
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

  async getStatus(userEmail?: string): Promise<ApiResponse<WhatsAppStatus>> {
    const userId = this.getUserId(userEmail);
    return this.request<WhatsAppStatus>(`/users/${userId}/status`);
  }

  async getQRCode(userEmail?: string): Promise<ApiResponse<QRCodeData>> {
    const userId = this.getUserId(userEmail);
    return this.request<QRCodeData>(`/users/${userId}/qr`);
  }

  async getContacts(userEmail?: string): Promise<ApiResponse<Contact[]>> {
    const userId = this.getUserId(userEmail);
    return this.request<Contact[]>(`/users/${userId}/contacts`);
  }

  async getChats(userEmail?: string): Promise<ApiResponse<Chat[]>> {
    const userId = this.getUserId(userEmail);
    return this.request<Chat[]>(`/users/${userId}/chats`);
  }

  async getMessages(limit = 50, userEmail?: string): Promise<ApiResponse<Message[]>> {
    const userId = this.getUserId(userEmail);
    return this.request<Message[]>(`/users/${userId}/messages?limit=${limit}`);
  }

  async getChatMessages(chatId: string, limit = 50, userEmail?: string): Promise<ApiResponse<Message[]>> {
    const userId = this.getUserId(userEmail);
    return this.request<Message[]>(`/users/${userId}/messages/${encodeURIComponent(chatId)}?limit=${limit}`);
  }

  async getChatHistory(chatId: string, limit = 5, userEmail?: string): Promise<ApiResponse<Message[]>> {
    const userId = this.getUserId(userEmail);
    return this.request<Message[]>(`/users/${userId}/chats/${encodeURIComponent(chatId)}/history?limit=${limit}`);
  }

  async sendMessage(to: string, message: string, userEmail?: string): Promise<ApiResponse<{ messageId: string; timestamp: number }>> {
    const userId = this.getUserId(userEmail);
    return this.request(`/users/${userId}/send`, {
      method: 'POST',
      body: JSON.stringify({ to, message }),
    }, true); // Exigir autenticação
  }

  async getHealth(): Promise<ApiResponse<{ message: string; timestamp: string }>> {
    return this.request('/health');
  }

  async registerUser(userEmail?: string): Promise<ApiResponse<{ message: string; userId: string }>> {
    const userId = this.getUserId(userEmail);
    return this.request(`/users/${userId}/register`, {
      method: 'POST',
    });
  }

  async syncChat(chatId: string, userEmail?: string): Promise<ApiResponse<{ chatId: string; messageCount: number; messages: Message[] }>> {
    const userId = this.getUserId(userEmail);
    return this.request(`/users/${userId}/chats/${encodeURIComponent(chatId)}/sync`, {
      method: 'POST',
    });
  }
}

export const whatsappCoreAPI = new WhatsAppCoreAPI();