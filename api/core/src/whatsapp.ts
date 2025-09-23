const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  type: string;
  timestamp: number;
  isFromMe: boolean;
  contact: any;
}

interface WhatsAppContact {
  id: string;
  name: string;
  pushname: string;
  number: string;
}

class WhatsAppService {
  private client: any;
  private qrString: string | null;
  private isReady: boolean;
  private isConnecting: boolean;
  private messages: WhatsAppMessage[];
  private contacts: WhatsAppContact[];

  constructor() {
    this.client = null;
    this.qrString = null;
    this.isReady = false;
    this.isConnecting = false;
    this.messages = [];
    this.contacts = [];

    this.initializeClient();
  }

  initializeClient() {
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

  setupEventHandlers() {
    // QR Code generation
    this.client.on('qr', async (qr) => {
      console.log('📱 QR Code recebido');
      this.qrString = qr;
      this.isConnecting = true;
    });

    // Client ready
    this.client.on('ready', async () => {
      console.log('✅ WhatsApp conectado!');
      this.isReady = true;
      this.isConnecting = false;
      this.qrString = null;

      await this.loadContacts();
    });

    // Authentication success
    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp autenticado');
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('❌ Falha na autenticação:', msg);
      this.isReady = false;
      this.isConnecting = false;
    });

    // Client disconnected
    this.client.on('disconnected', (reason) => {
      console.log('🔌 WhatsApp desconectado:', reason);
      this.isReady = false;
      this.isConnecting = false;
    });

    // Message received
    this.client.on('message', async (message) => {
      const formattedMessage = await this.formatMessage(message);
      this.messages.unshift(formattedMessage);

      // Keep only last 500 messages
      if (this.messages.length > 500) {
        this.messages = this.messages.slice(0, 500);
      }

      console.log(`📩 Mensagem de ${message.from}: ${message.body}`);

      // Notificar sistema de atualizações em tempo real
      await this.notifyLiveUpdate('new_message', formattedMessage);
    });

    // Message sent
    this.client.on('message_create', async (message) => {
      if (message.fromMe) {
        const formattedMessage = await this.formatMessage(message);
        this.messages.unshift(formattedMessage);

        if (this.messages.length > 500) {
          this.messages = this.messages.slice(0, 500);
        }

        // Notificar sistema de atualizações em tempo real para mensagens enviadas também
        await this.notifyLiveUpdate('new_message', formattedMessage);
      }
    });
  }

  async initialize() {
    try {
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Erro ao inicializar:', error);
    }
  }

  async loadContacts() {
    try {
      const contacts = await this.client.getContacts();

      this.contacts = contacts
        .filter(contact => contact.isMyContact && contact.name)
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

  async formatMessage(message) {
    const contact = await message.getContact();

    // Para grupos, verificar se a mensagem é de um grupo
    const isGroupMessage = message.from.includes('@g.us') || message.to.includes('@g.us');

    let contactInfo;
    if (isGroupMessage) {
      // Para mensagens de grupo, usar informações do grupo quando possível
      const chat = await message.getChat();
      contactInfo = {
        id: chat.id._serialized,
        name: chat.name || `Grupo ${chat.id._serialized.split('@')[0].slice(-4)}`,
        pushname: '',
        number: chat.id._serialized.replace('@g.us', '')
      };
      console.log(`🔵 [BACKEND] Mensagem de grupo formatada: ${contactInfo.name} (${contactInfo.id})`);
    } else {
      // Para mensagens individuais
      contactInfo = {
        id: contact.id._serialized,
        name: contact.name || contact.pushname || contact.number,
        pushname: contact.pushname || '',
        number: contact.number
      };
      console.log(`👤 [BACKEND] Mensagem individual formatada: ${contactInfo.name} (${contactInfo.id})`);
    }

    return {
      id: message.id._serialized,
      from: message.from,
      to: message.to,
      body: message.body,
      type: message.type,
      timestamp: message.timestamp * 1000, // Convert to milliseconds
      isFromMe: message.fromMe,
      contact: contactInfo
    };
  }

  // API Methods
  async getQRCode() {
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
      return { error: 'Erro ao gerar QR Code' };
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isConnecting: this.isConnecting,
      hasQR: !!this.qrString,
      contactsCount: this.contacts.length,
      messagesCount: this.messages.length
    };
  }

  getContacts() {
    return this.contacts;
  }

  getMessages(limit = 50) {
    return this.messages.slice(0, limit);
  }

  getChatMessages(chatId, limit = 50) {
    const isGroup = chatId.includes('@g.us');
    console.log(`🔍 [BACKEND] Buscando mensagens para: ${chatId} (isGroup: ${isGroup})`);

    let chatMessages;
    if (isGroup) {
      // Para grupos: SOMENTE mensagens onde FROM ou TO é exatamente o grupo
      chatMessages = this.messages.filter(msg => {
        const match = (msg.from === chatId || msg.to === chatId);
        if (match) {
          console.log(`🔵 [GRUPO] Mensagem incluída: ${msg.from} -> ${msg.to}: ${msg.body.substring(0, 50)}...`);
        }
        return match;
      });
      console.log(`🔵 [GRUPO] Total de mensagens do grupo ${chatId}: ${chatMessages.length}`);
    } else {
      // Para conversas individuais: NUNCA incluir mensagens de grupos
      chatMessages = this.messages.filter(msg => {
        // REJEITAR qualquer mensagem que envolva um grupo
        if (msg.from.includes('@g.us') || msg.to.includes('@g.us')) {
          return false;
        }

        // INCLUIR apenas se FROM ou TO for exatamente o contact individual
        const match = (msg.from === chatId || msg.to === chatId);
        if (match) {
          console.log(`👤 [INDIVIDUAL] Mensagem incluída: ${msg.from} -> ${msg.to}: ${msg.body.substring(0, 50)}...`);
        }
        return match;
      });
      console.log(`👤 [INDIVIDUAL] Total de mensagens individuais para ${chatId}: ${chatMessages.length}`);
    }

    const result = chatMessages.slice(0, limit);
    console.log(`📤 [BACKEND] Retornando ${result.length} mensagens para ${chatId}`);
    return result;
  }

  async sendMessage(to, message) {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp não está conectado');
      }

      const result = await this.client.sendMessage(to, message);

      return {
        success: true,
        messageId: result.id._serialized,
        timestamp: result.timestamp
      };
    } catch (error) {
      throw error;
    }
  }

  // Notificar sistema de atualizações em tempo real
  async notifyLiveUpdate(type, data) {
    try {
      // Usar fetch nativo para Node.js v18+
      const response = await fetch('http://localhost:3002/api/whatsapp/live-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type,
          data: data
        })
      });

      if (response.ok) {
        console.log(`📡 Atualização ${type} enviada para sistema SSE`);
      } else {
        console.log(`⚠️ Falha ao enviar atualização ${type}:`, response.status);
      }
    } catch (error) {
      console.log(`⚠️ Erro ao notificar live update:`, error.message);
    }
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