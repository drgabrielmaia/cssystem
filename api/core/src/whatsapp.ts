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
    this.client.on('qr', async (qr: string) => {
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
    this.client.on('auth_failure', (msg: any) => {
      console.error('❌ Falha na autenticação:', msg);
      this.isReady = false;
      this.isConnecting = false;
    });

    // Client disconnected
    this.client.on('disconnected', (reason: any) => {
      console.log('🔌 WhatsApp desconectado:', reason);
      this.isReady = false;
      this.isConnecting = false;
    });

    // Message received
    this.client.on('message', async (message: any) => {
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
    this.client.on('message_create', async (message: any) => {
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
        .filter((contact: any) => contact.isMyContact && contact.name)
        .map((contact: any) => ({
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

  async formatMessage(message: any) {
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

  getMessages(limit: number = 50): WhatsAppMessage[] {
    // Validação do parâmetro limit
    if (typeof limit !== 'number' || isNaN(limit) || limit < 1 || limit > 1000) {
      throw new Error('Limit deve ser um número entre 1 e 1000');
    }
    return this.messages.slice(0, limit);
  }

  getChatMessages(chatId: string, limit: number = 50): WhatsAppMessage[] {
    // Validação dos parâmetros
    if (!chatId || typeof chatId !== 'string' || chatId.trim().length === 0) {
      throw new Error('ChatId é obrigatório e deve ser uma string não vazia');
    }

    if (typeof limit !== 'number' || isNaN(limit) || limit < 1 || limit > 1000) {
      throw new Error('Limit deve ser um número entre 1 e 1000');
    }

    // Validação do formato do chatId
    const chatIdRegex = /^[\d@c.us@g.us\-\+\s\(\)]+$/;
    if (!chatIdRegex.test(chatId)) {
      throw new Error('Formato de chatId inválido');
    }

    const cleanChatId = chatId.trim();
    const isGroup = cleanChatId.includes('@g.us');
    console.log(`🔍 [BACKEND] Buscando mensagens para: ${cleanChatId} (isGroup: ${isGroup})`);

    let chatMessages: WhatsAppMessage[];
    if (isGroup) {
      // Para grupos: SOMENTE mensagens onde FROM ou TO é exatamente o grupo
      chatMessages = this.messages.filter((msg: WhatsAppMessage) => {
        const match = (msg.from === cleanChatId || msg.to === cleanChatId);
        if (match) {
          console.log(`🔵 [GRUPO] Mensagem incluída: ${msg.from} -> ${msg.to}: ${msg.body.substring(0, 50)}...`);
        }
        return match;
      });
      console.log(`🔵 [GRUPO] Total de mensagens do grupo ${cleanChatId}: ${chatMessages.length}`);
    } else {
      // Para conversas individuais: NUNCA incluir mensagens de grupos
      chatMessages = this.messages.filter((msg: WhatsAppMessage) => {
        // REJEITAR qualquer mensagem que envolva um grupo
        if (msg.from.includes('@g.us') || msg.to.includes('@g.us')) {
          return false;
        }

        // INCLUIR apenas se FROM ou TO for exatamente o contact individual
        const match = (msg.from === cleanChatId || msg.to === cleanChatId);
        if (match) {
          console.log(`👤 [INDIVIDUAL] Mensagem incluída: ${msg.from} -> ${msg.to}: ${msg.body.substring(0, 50)}...`);
        }
        return match;
      });
      console.log(`👤 [INDIVIDUAL] Total de mensagens individuais para ${cleanChatId}: ${chatMessages.length}`);
    }

    const result = chatMessages.slice(0, limit);
    console.log(`📤 [BACKEND] Retornando ${result.length} mensagens para ${cleanChatId}`);
    return result;
  }

  async sendMessage(to: string, message: string) {
    try {
      // Validação rigorosa dos parâmetros
      if (!to || typeof to !== 'string' || to.trim().length === 0) {
        throw new Error('Parâmetro "to" é obrigatório e deve ser uma string não vazia');
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new Error('Parâmetro "message" é obrigatório e deve ser uma string não vazia');
      }

      // Validação do formato do número
      const phoneRegex = /^[\d@c.us@g.us\-\+\s\(\)]+$/;
      if (!phoneRegex.test(to)) {
        throw new Error('Formato de número inválido');
      }

      // Validação do tamanho da mensagem
      if (message.trim().length > 4096) {
        throw new Error('Mensagem muito longa. Máximo 4096 caracteres');
      }

      if (!this.isReady) {
        throw new Error('WhatsApp não está conectado');
      }

      if (!this.client) {
        throw new Error('Cliente WhatsApp não inicializado');
      }

      const cleanTo = to.trim();
      const cleanMessage = message.trim();

      const result = await this.client.sendMessage(cleanTo, cleanMessage);

      if (!result || !result.id) {
        throw new Error('Falha ao enviar mensagem - resposta inválida');
      }

      return {
        success: true,
        messageId: result.id._serialized,
        timestamp: result.timestamp,
        to: cleanTo,
        message: cleanMessage
      };
    } catch (error: any) {
      console.error('❌ Erro no sendMessage:', error);
      throw new Error(error.message || 'Erro interno ao enviar mensagem');
    }
  }

  // Notificar sistema de atualizações em tempo real
  async notifyLiveUpdate(type: string, data: any) {
    try {
      // Validação dos parâmetros
      if (!type || typeof type !== 'string' || type.trim().length === 0) {
        console.error('❌ Tipo de atualização inválido');
        return;
      }

      if (data === null || data === undefined) {
        console.error('❌ Dados da atualização são obrigatórios');
        return;
      }

      const cleanType = type.trim();

      // Usar fetch nativo para Node.js v18+
      const response = await fetch('http://localhost:3002/api/whatsapp/live-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: cleanType,
          data: data,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log(`📡 Atualização ${cleanType} enviada para sistema SSE`);
      } else {
        console.log(`⚠️ Falha ao enviar atualização ${cleanType}:`, response.status);
      }
    } catch (error: any) {
      console.log(`⚠️ Erro ao notificar live update:`, error?.message || 'Erro desconhecido');
    }
  }
}

// Global instance
let whatsappService: WhatsAppService | null = null;

export const getWhatsAppService = (): WhatsAppService => {
  try {
    if (!whatsappService) {
      console.log('🚀 Criando nova instância do WhatsAppService...');
      whatsappService = new WhatsAppService();
    }
    return whatsappService;
  } catch (error: any) {
    console.error('❌ Erro ao criar/obter WhatsAppService:', error);
    throw new Error('Falha ao inicializar serviço WhatsApp: ' + (error?.message || 'Erro desconhecido'));
  }
};