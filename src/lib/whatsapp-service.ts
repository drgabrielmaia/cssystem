import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import QRCode from 'qrcode-terminal';
import puppeteer from 'puppeteer';

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  isFromMe: boolean;
  contact?: {
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

class WhatsAppService {
  private client: Client;
  private isReady: boolean = false;
  private qrCode: string | null = null;
  private messages: WhatsAppMessage[] = [];
  private contacts: WhatsAppContact[] = [];
  private messageListeners: ((message: WhatsAppMessage) => void)[] = [];
  private statusListeners: ((status: string) => void)[] = [];

  constructor() {
    console.log('🚀 Inicializando WhatsApp Service...');
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'customer-success-whatsapp',
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on('qr', (qr) => {
      this.qrCode = qr;
      console.log('📱 QR Code gerado para WhatsApp - Escaneie com seu celular');
      QRCode.generate(qr, { small: true });
      this.notifyStatusListeners('qr_generated');
    });

    this.client.on('ready', async () => {
      console.log('✅ WhatsApp Client está pronto!');
      this.isReady = true;
      this.qrCode = null;

      // Carregar dados iniciais
      await this.loadContacts();
      await this.loadRecentMessages();

      console.log(`📞 Conectado como: ${await this.getMyNumber()}`);
      console.log(`👥 ${this.contacts.length} contatos carregados`);

      this.notifyStatusListeners('ready');
    });

    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp autenticado com sucesso');
      this.notifyStatusListeners('authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Falha na autenticação WhatsApp:', msg);
      this.notifyStatusListeners('auth_failure');
    });

    this.client.on('disconnected', (reason) => {
      console.log('🔌 WhatsApp desconectado:', reason);
      this.isReady = false;
      this.notifyStatusListeners('disconnected');
    });

    this.client.on('loading_screen', (percent, message) => {
      console.log(`⏳ Carregando WhatsApp: ${percent}% - ${message}`);
    });

    this.client.on('message', async (message: Message) => {
      const whatsappMessage = await this.formatMessage(message);
      this.messages.unshift(whatsappMessage);

      // Manter apenas as últimas 1000 mensagens em memória
      if (this.messages.length > 1000) {
        this.messages = this.messages.slice(0, 1000);
      }

      this.notifyMessageListeners(whatsappMessage);
    });

    this.client.on('message_create', async (message: Message) => {
      if (message.fromMe) {
        const whatsappMessage = await this.formatMessage(message);
        this.messages.unshift(whatsappMessage);

        if (this.messages.length > 1000) {
          this.messages = this.messages.slice(0, 1000);
        }

        this.notifyMessageListeners(whatsappMessage);
      }
    });
  }

  private async formatMessage(message: Message): Promise<WhatsAppMessage> {
    const contact = await message.getContact();

    return {
      id: message.id._serialized,
      from: message.from,
      to: message.to || '',
      body: message.body,
      timestamp: message.timestamp * 1000,
      isFromMe: message.fromMe,
      contact: {
        name: contact.name || contact.pushname || '',
        pushname: contact.pushname || '',
        number: contact.number
      }
    };
  }

  private async loadContacts() {
    try {
      console.log('📞 Carregando contatos...');
      const contacts = await this.client.getContacts();
      this.contacts = contacts
        .filter(contact => contact.isMyContact || contact.name) // Apenas contatos salvos
        .map(contact => ({
          id: contact.id._serialized,
          name: contact.name || contact.pushname || contact.number,
          pushname: contact.pushname || '',
          number: contact.number,
          isMyContact: contact.isMyContact
        }));

      console.log(`✅ ${this.contacts.length} contatos carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar contatos:', error);
    }
  }

  private async loadRecentMessages() {
    try {
      console.log('💬 Carregando mensagens recentes...');
      const chats = await this.client.getChats();

      for (const chat of chats.slice(0, 10)) { // Apenas os 10 chats mais recentes
        try {
          const messages = await chat.fetchMessages({ limit: 5 });
          for (const message of messages) {
            const whatsappMessage = await this.formatMessage(message);
            this.messages.push(whatsappMessage);
          }
        } catch (error) {
          console.error(`Erro ao carregar mensagens do chat ${chat.name}:`, error);
        }
      }

      // Ordenar por timestamp (mais recentes primeiro)
      this.messages.sort((a, b) => b.timestamp - a.timestamp);
      this.messages = this.messages.slice(0, 100); // Manter apenas as 100 mais recentes

      console.log(`✅ ${this.messages.length} mensagens carregadas`);
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
    }
  }

  private async getMyNumber(): Promise<string> {
    try {
      const info = this.client.info;
      return info?.wid?.user || 'Número não identificado';
    } catch (error) {
      return 'Erro ao obter número';
    }
  }

  private notifyMessageListeners(message: WhatsAppMessage) {
    this.messageListeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Erro no listener de mensagem:', error);
      }
    });
  }

  private notifyStatusListeners(status: string) {
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Erro no listener de status:', error);
      }
    });
  }

  async initialize(): Promise<void> {
    if (!this.client) {
      throw new Error('Client não inicializado');
    }

    try {
      console.log('🚀 Inicializando cliente WhatsApp...');

      // Verificar se já está inicializado
      if (this.isReady) {
        console.log('✅ WhatsApp já está conectado!');
        return;
      }

      await this.client.initialize();
      console.log('📱 Cliente WhatsApp inicializado - aguardando conexão...');
    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp:', error);
      throw error;
    }
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.isReady) {
      console.error('❌ WhatsApp não está conectado');
      throw new Error('WhatsApp não está conectado');
    }

    try {
      console.log(`📤 Enviando mensagem para ${to}: ${message.substring(0, 50)}...`);

      // Formatar número se necessário
      const chatId = to.includes('@') ? to : `${to}@c.us`;

      // Verificar se o chat existe
      const chat = await this.client.getChatById(chatId);
      if (!chat) {
        throw new Error('Chat não encontrado');
      }

      await this.client.sendMessage(chatId, message);
      console.log('✅ Mensagem enviada com sucesso!');
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  async getMessages(limit: number = 50): Promise<WhatsAppMessage[]> {
    return this.messages.slice(0, limit);
  }

  async getContacts(): Promise<WhatsAppContact[]> {
    return this.contacts;
  }

  async getChatMessages(chatId: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    if (!this.isReady) {
      console.log('⚠️ WhatsApp não está conectado');
      return [];
    }

    try {
      console.log(`💬 Buscando mensagens do chat: ${chatId}`);

      const chat = await this.client.getChatById(chatId);
      if (!chat) {
        console.error('❌ Chat não encontrado:', chatId);
        return [];
      }

      const messages = await chat.fetchMessages({ limit });
      console.log(`📥 ${messages.length} mensagens encontradas no chat`);

      const formattedMessages = await Promise.all(
        messages.map(msg => this.formatMessage(msg))
      );

      // Ordenar por timestamp (mais antigas primeiro para exibição correta)
      return formattedMessages.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens do chat:', error);
      return [];
    }
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  isClientReady(): boolean {
    return this.isReady;
  }

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

  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
    }
  }
}

export const whatsappService = new WhatsAppService();