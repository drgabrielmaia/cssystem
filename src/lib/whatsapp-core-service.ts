export interface WhatsAppMessage {
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

export interface WhatsAppContact {
  id: string;
  name: string;
  pushname: string;
  number: string;
  isMyContact: boolean;
}

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

class WhatsAppCoreService {
  private baseUrl: string;
  private messageListeners: ((message: WhatsAppMessage) => void)[] = [];
  private statusListeners: ((status: string) => void)[] = [];

  constructor() {
    // URL da API Express - usar variável de ambiente ou fallback
    this.baseUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'http://localhost:3001';
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Inicializando WhatsApp Core Service...');
      console.log(`📡 Conectando em: ${this.baseUrl}`);

      // Verificar se a API está rodando
      const healthCheck = await this.healthCheck();
      if (!healthCheck) {
        throw new Error('API WhatsApp Core não está respondendo');
      }

      console.log('✅ WhatsApp Core Service inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp Core Service:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout para Docker

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('❌ Erro no health check:', error);
      return false;
    }
  }

  async getStatus(): Promise<WhatsAppStatus | null> {
    console.log('🔍 [WhatsApp Service] Buscando status da API core...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout para Docker

      const response = await fetch(`${this.baseUrl}/status`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      console.log('📡 [WhatsApp Service] Resposta da API core:', response.status);

      if (!response.ok) {
        console.log('❌ [WhatsApp Service] Resposta não ok:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('📋 [WhatsApp Service] Dados do status:', data);

      if (data.success) {
        console.log('✅ [WhatsApp Service] Status obtido com sucesso:', data.data);
        return data.data;
      }
      console.log('❌ [WhatsApp Service] Status sem sucesso:', data);
      return null;
    } catch (error) {
      console.error('💥 [WhatsApp Service] Erro ao buscar status:', error);
      return null;
    }
  }

  async getQRCode(): Promise<QRCodeData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/qr`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar QR Code:', error);
      return null;
    }
  }

  isClientReady(): boolean {
    // Esta função será verificada de forma assíncrona através do getStatus()
    return false;
  }

  getQRCodeSync(): string | null {
    // Esta função será verificada de forma assíncrona através do getQRCode()
    return null;
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      // Format phone number to include +55 if needed
      let formattedNumber = to.replace(/\D/g, ''); // Remove non-digits

      if (!formattedNumber.startsWith('55') && formattedNumber.length === 11) {
        formattedNumber = '55' + formattedNumber;
      }

      // Add @s.whatsapp.net suffix if needed
      const phoneWithSuffix = formattedNumber.includes('@')
        ? formattedNumber
        : `${formattedNumber}@s.whatsapp.net`;

      console.log(`📤 Enviando mensagem para ${phoneWithSuffix}: ${message}`);

      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: phoneWithSuffix, message })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Mensagem enviada via WhatsApp Core API');
        return true;
      } else {
        console.error('❌ Falha ao enviar mensagem:', data.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  async getMessages(limit: number = 20): Promise<WhatsAppMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/messages?limit=${limit}`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      return [];
    }
  }

  async getContacts(): Promise<WhatsAppContact[]> {
    try {
      const response = await fetch(`${this.baseUrl}/contacts`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar contatos:', error);
      return [];
    }
  }

  async getChatMessages(chatId: string, limit: number = 20): Promise<WhatsAppMessage[]> {
    console.log(`📱 [WhatsApp Service] Carregando mensagens do chat: ${chatId} (limit: ${limit})`);
    try {
      const url = `${this.baseUrl}/messages/${encodeURIComponent(chatId)}?limit=${limit}`;
      console.log(`📡 [WhatsApp Service] URL de busca do chat: ${url}`);

      const response = await fetch(url);
      console.log(`📡 [WhatsApp Service] Resposta da API core (chat):`, response.status);

      const data = await response.json();
      console.log(`📋 [WhatsApp Service] Dados do chat recebidos:`, data);

      if (data.success && data.data) {
        console.log(`✅ [WhatsApp Service] ${data.data.length} mensagens carregadas do chat ${chatId}`);
        return data.data;
      }

      console.log(`💬 [WhatsApp Service] Nenhuma mensagem encontrada para ${chatId}:`, data);
      return [];
    } catch (error) {
      console.error(`💥 [WhatsApp Service] Erro ao buscar mensagens do chat ${chatId}:`, error);
      return [];
    }
  }

  // Event listeners
  onMessage(listener: (message: WhatsAppMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  onStatusChange(listener: (status: string) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  private notifyMessageListeners(message: WhatsAppMessage) {
    this.messageListeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('❌ Erro no listener de mensagem:', error);
      }
    });
  }

  private notifyStatusListeners(status: string) {
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('❌ Erro no listener de status:', error);
      }
    });
  }

  async destroy(): Promise<void> {
    console.log('🛑 WhatsApp Core Service destruído');
  }
}

export const whatsappService = new WhatsAppCoreService();