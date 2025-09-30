// WhatsApp Core API Client for Bohr.io integration

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
  private userId: string = 'default'; // Default user ID for single-user mode

  constructor() {
    // URL da API Express - ngrok HTTPS tunnel
    this.baseUrl = 'https://enigmatic-electrotonic-kala.ngrok-free.dev';
    console.log('🔍 WhatsApp API - baseUrl final:', this.baseUrl);
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log('🌐 WhatsApp API - Fazendo request para:', url);
      console.log('🔍 WhatsApp API - URL protocol:', new URL(url).protocol);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...options?.headers,
        },
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
    return this.request<WhatsAppStatus>(`/users/${this.userId}/status`);
  }

  async getQRCode(): Promise<ApiResponse<QRCodeData>> {
    return this.request<QRCodeData>(`/users/${this.userId}/qr`);
  }

  async getContacts(): Promise<ApiResponse<Contact[]>> {
    return this.request<Contact[]>(`/users/${this.userId}/contacts`);
  }

  async getChats(): Promise<ApiResponse<Chat[]>> {
    return this.request<Chat[]>(`/users/${this.userId}/chats`);
  }

  async getMessages(limit = 50): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(`/users/${this.userId}/messages?limit=${limit}`);
  }

  async getChatMessages(chatId: string, limit = 50): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(`/users/${this.userId}/messages/${encodeURIComponent(chatId)}?limit=${limit}`);
  }

  async getChatHistory(chatId: string, limit = 5): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(`/users/${this.userId}/chats/${encodeURIComponent(chatId)}/history?limit=${limit}`);
  }

  async sendMessage(to: string, message: string): Promise<ApiResponse<{ messageId: string; timestamp: number }>> {
    return this.request(`/users/${this.userId}/send`, {
      method: 'POST',
      body: JSON.stringify({ to, message }),
    });
  }

  async getHealth(): Promise<ApiResponse<{ message: string; timestamp: string }>> {
    return this.request('/health');
  }

  async registerUser(): Promise<ApiResponse<{ message: string; userId: string }>> {
    return this.request(`/users/${this.userId}/register`, {
      method: 'POST',
    });
  }
}

export const whatsappCoreAPI = new WhatsAppCoreAPI();