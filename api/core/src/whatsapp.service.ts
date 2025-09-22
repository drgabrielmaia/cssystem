import { Client, LocalAuth } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';

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

class WhatsAppService {
  private client: Client | null = null;
  private qrString: string | null = null;
  private isReady: boolean = false;
  private isConnecting: boolean = false;
  private messages: WhatsAppMessage[] = [];
  private contacts: WhatsAppContact[] = [];

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    console.log('🚀 Inicializando WhatsApp Web...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'customer-success-session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        ignoreDefaultArgs: ['--disable-extensions'],
        timeout: 60000
      }
    });

    this.setupEventHandlers();
    this.initialize();
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // QR Code generation
    this.client.on('qr', async (qr: string) => {
      console.log('📱 QR Code recebido');
      this.qrString = qr;
      this.isConnecting = true;
    });

    // Ready event
    this.client.on('ready', () => {
      console.log('✅ WhatsApp Client pronto!');
      this.isReady = true;
      this.isConnecting = false;
    });

    // Message event
    this.client.on('message', (message: any) => {
      console.log('📨 Nova mensagem recebida:', message.body);
      const whatsappMessage: WhatsAppMessage = {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        type: message.type,
        timestamp: message.timestamp,
        isFromMe: message.fromMe,
        contact: {
          id: message.author || message.from,
          name: '',
          pushname: '',
          number: message.from
        }
      };
      this.messages.unshift(whatsappMessage);
      if (this.messages.length > 1000) {
        this.messages = this.messages.slice(0, 1000);
      }
    });

    // Authenticated event
    this.client.on('authenticated', () => {
      console.log('🔐 Cliente autenticado');
    });

    // Disconnected event
    this.client.on('disconnected', (reason: string) => {
      console.log('❌ Cliente desconectado:', reason);
      this.isReady = false;
      this.isConnecting = false;
    });
  }

  private async initialize(): Promise<void> {
    if (!this.client) return;

    try {
      console.log('🔄 Inicializando cliente WhatsApp...');
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Erro ao inicializar cliente:', error);
    }
  }

  public getStatus(): WhatsAppStatus {
    return {
      isReady: this.isReady,
      isConnecting: this.isConnecting,
      hasQR: !!this.qrString && !this.isReady,
      contactsCount: this.contacts.length,
      messagesCount: this.messages.length
    };
  }

  public async getQRCode(): Promise<QRCodeData | { error: string }> {
    if (!this.qrString) {
      return { error: 'QR Code não disponível' };
    }

    try {
      const qrImage = await QRCode.toDataURL(this.qrString);
      return {
        qr: this.qrString,
        qrImage: qrImage
      };
    } catch (error) {
      console.error('❌ Erro ao gerar QR Code:', error);
      return { error: 'Erro ao gerar QR Code' };
    }
  }

  public async sendMessage(to: string, message: string): Promise<any> {
    if (!this.client || !this.isReady) {
      throw new Error('Cliente WhatsApp não está pronto');
    }

    try {
      const result = await this.client.sendMessage(to, message);
      console.log('✅ Mensagem enviada:', result.id._serialized);
      return result;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  public getMessages(limit: number = 20): WhatsAppMessage[] {
    return this.messages.slice(0, limit);
  }

  public getContacts(): WhatsAppContact[] {
    return this.contacts;
  }

  public getChatMessages(chatId: string, limit: number = 20): WhatsAppMessage[] {
    return this.messages
      .filter(msg => msg.from === chatId || msg.to === chatId)
      .slice(0, limit);
  }
}

// Global instance
let whatsappService: WhatsAppService | null = null;

export const getWhatsAppService = (): WhatsAppService => {
  if (!whatsappService) {
    whatsappService = new WhatsAppService();
  }
  return whatsappService;
};