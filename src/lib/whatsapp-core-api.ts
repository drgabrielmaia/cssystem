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
    // Em produção na Bohr.io, será a URL da sua aplicação
    // Em desenvolvimento, será localhost:3001 (API core)
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? '/api/core' // Bohr.io vai mapear para api/core
      : 'http://localhost:3001'; // Desenvolvimento local
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
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
    return this.request<WhatsAppStatus>('/status');
  }

  async getQRCode(): Promise<ApiResponse<QRCodeData>> {
    return this.request<QRCodeData>('/qr');
  }

  async getContacts(): Promise<ApiResponse<Contact[]>> {
    return this.request<Contact[]>('/contacts');
  }

  async getMessages(limit = 50): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(`/messages?limit=${limit}`);
  }

  async getChatMessages(chatId: string, limit = 50): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(`/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`);
  }

  async sendMessage(to: string, message: string): Promise<ApiResponse<{ messageId: string; timestamp: number }>> {
    return this.request('/send', {
      method: 'POST',
      body: JSON.stringify({ to, message }),
    });
  }

  async getHealth(): Promise<ApiResponse<{ message: string; timestamp: string }>> {
    return this.request('/health');
  }
}

export const whatsappCoreAPI = new WhatsAppCoreAPI();