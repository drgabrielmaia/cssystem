import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import QRCode from 'qrcode-terminal';

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  isFromMe: boolean;
  organizationId: string;
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
  organizationId: string;
}

export interface WhatsAppOrgConnection {
  organizationId: string;
  client: Client;
  isReady: boolean;
  qrCode: string | null;
  isConnecting: boolean;
  lastConnectionAttempt: number;
  connectionTimeout?: NodeJS.Timeout;
  messages: WhatsAppMessage[];
  contacts: WhatsAppContact[];
}

class MultiOrgWhatsAppService {
  private connections = new Map<string, WhatsAppOrgConnection>();
  private messageListeners: ((message: WhatsAppMessage) => void)[] = [];
  private statusListeners: ((organizationId: string, status: string, data?: any) => void)[] = [];
  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds

  async getOrCreateConnection(organizationId: string): Promise<WhatsAppOrgConnection> {
    console.log(`🔍 [DEBUG] getOrCreateConnection chamado para org: ${organizationId}`);
    let connection = this.connections.get(organizationId);
    console.log(`🔍 [DEBUG] Conexão existente encontrada: ${connection ? 'SIM' : 'NÃO'}`);

    if (!connection) {
      console.log(`🚀 [DEBUG] Criando nova conexão WhatsApp para organização: ${organizationId}`);

      console.log(`🔧 [DEBUG] Configurando cliente WhatsApp para org: ${organizationId}`);
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: `whatsapp-org-${organizationId}`,
          dataPath: `./.wwebjs_auth_${organizationId}`
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
      console.log(`✅ [DEBUG] Cliente WhatsApp criado para org: ${organizationId}`);

      connection = {
        organizationId,
        client,
        isReady: false,
        qrCode: null,
        isConnecting: false,
        lastConnectionAttempt: 0,
        messages: [],
        contacts: []
      };

      console.log(`🔗 [DEBUG] Configurando event listeners para org: ${organizationId}`);
      this.setupEventListeners(connection);
      this.connections.set(organizationId, connection);
      console.log(`💾 [DEBUG] Conexão armazenada para org: ${organizationId}`);
    }

    console.log(`🔄 [DEBUG] Retornando conexão para org: ${organizationId}, status: ready=${connection.isReady}, connecting=${connection.isConnecting}`);
    return connection;
  }

  private setupEventListeners(connection: WhatsAppOrgConnection) {
    const { client, organizationId } = connection;

    client.on('qr', (qr) => {
      console.log(`📱 [DEBUG] QR Code gerado para organização ${organizationId}`);
      console.log(`🔍 [DEBUG] QR Code length: ${qr.length}, starting with: ${qr.substring(0, 20)}...`);
      connection.qrCode = qr;
      connection.isConnecting = true;

      // Set timeout for connection
      console.log(`⏰ [DEBUG] Configurando timeout de conexão para org: ${organizationId}`);
      this.setConnectionTimeout(connection);

      QRCode.generate(qr, { small: true });
      console.log(`📡 [DEBUG] Notificando listeners sobre QR gerado para org: ${organizationId}`);
      this.notifyStatusListeners(organizationId, 'qr_generated', { qr });
    });

    client.on('ready', async () => {
      console.log(`✅ WhatsApp conectado para organização: ${organizationId}`);
      connection.isReady = true;
      connection.qrCode = null;
      connection.isConnecting = false;

      this.clearConnectionTimeout(connection);

      // Carregar dados iniciais
      await this.loadContacts(connection);
      await this.loadRecentMessages(connection);

      const myNumber = await this.getMyNumber(connection);
      console.log(`📞 Organização ${organizationId} conectada como: ${myNumber}`);
      console.log(`👥 ${connection.contacts.length} contatos carregados`);

      this.notifyStatusListeners(organizationId, 'ready', { myNumber });
    });

    client.on('authenticated', () => {
      console.log(`🔐 WhatsApp autenticado para organização: ${organizationId}`);
      this.notifyStatusListeners(organizationId, 'authenticated');
    });

    client.on('auth_failure', (msg) => {
      console.error(`❌ Falha na autenticação WhatsApp para organização ${organizationId}:`, msg);
      connection.isReady = false;
      connection.isConnecting = false;
      connection.qrCode = null;
      this.clearConnectionTimeout(connection);
      this.notifyStatusListeners(organizationId, 'auth_failure', { error: msg });
    });

    client.on('disconnected', (reason) => {
      console.log(`🔌 WhatsApp desconectado para organização ${organizationId}:`, reason);
      connection.isReady = false;
      connection.isConnecting = false;
      connection.qrCode = null;
      this.clearConnectionTimeout(connection);
      this.notifyStatusListeners(organizationId, 'disconnected', { reason });
    });

    client.on('loading_screen', (percent, message) => {
      console.log(`⏳ Carregando WhatsApp para ${organizationId}: ${percent}% - ${message}`);
      this.notifyStatusListeners(organizationId, 'loading', { percent, message });
    });

    client.on('message', async (message: Message) => {
      const whatsappMessage = await this.formatMessage(message, organizationId);
      connection.messages.unshift(whatsappMessage);

      // Manter apenas as últimas 1000 mensagens em memória
      if (connection.messages.length > 1000) {
        connection.messages = connection.messages.slice(0, 1000);
      }

      this.notifyMessageListeners(whatsappMessage);
    });

    client.on('message_create', async (message: Message) => {
      if (message.fromMe) {
        const whatsappMessage = await this.formatMessage(message, organizationId);
        connection.messages.unshift(whatsappMessage);

        if (connection.messages.length > 1000) {
          connection.messages = connection.messages.slice(0, 1000);
        }

        this.notifyMessageListeners(whatsappMessage);
      }
    });
  }

  private setConnectionTimeout(connection: WhatsAppOrgConnection) {
    console.log(`⏰ [DEBUG] setConnectionTimeout iniciado para org: ${connection.organizationId}`);
    this.clearConnectionTimeout(connection);

    connection.connectionTimeout = setTimeout(() => {
      console.log(`⏰ [DEBUG] Timeout executado para org: ${connection.organizationId}, isConnecting: ${connection.isConnecting}, isReady: ${connection.isReady}`);
      if (connection.isConnecting && !connection.isReady) {
        console.log(`⏰ [DEBUG] Timeout de conexão para organização ${connection.organizationId} - reconectando...`);
        this.reconnect(connection.organizationId);
      }
    }, this.CONNECTION_TIMEOUT);
    console.log(`⏰ [DEBUG] Timeout configurado para org: ${connection.organizationId} com ${this.CONNECTION_TIMEOUT}ms`);
  }

  private clearConnectionTimeout(connection: WhatsAppOrgConnection) {
    if (connection.connectionTimeout) {
      clearTimeout(connection.connectionTimeout);
      connection.connectionTimeout = undefined;
    }
  }

  private async formatMessage(message: Message, organizationId: string): Promise<WhatsAppMessage> {
    const contact = await message.getContact();

    return {
      id: message.id._serialized,
      from: message.from,
      to: message.to || '',
      body: message.body,
      timestamp: message.timestamp * 1000,
      isFromMe: message.fromMe,
      organizationId,
      contact: {
        name: contact.name || contact.pushname || '',
        pushname: contact.pushname || '',
        number: contact.number
      }
    };
  }

  private async loadContacts(connection: WhatsAppOrgConnection) {
    try {
      console.log(`📞 Carregando contatos para organização ${connection.organizationId}...`);
      const contacts = await connection.client.getContacts();
      connection.contacts = contacts
        .filter(contact => contact.isMyContact || contact.name) // Apenas contatos salvos
        .map(contact => ({
          id: contact.id._serialized,
          name: contact.name || contact.pushname || contact.number,
          pushname: contact.pushname || '',
          number: contact.number,
          isMyContact: contact.isMyContact,
          organizationId: connection.organizationId
        }));

      console.log(`✅ ${connection.contacts.length} contatos carregados para ${connection.organizationId}`);
    } catch (error) {
      console.error(`❌ Erro ao carregar contatos para ${connection.organizationId}:`, error);
    }
  }

  private async loadRecentMessages(connection: WhatsAppOrgConnection) {
    try {
      console.log(`💬 Carregando mensagens recentes para organização ${connection.organizationId}...`);
      const chats = await connection.client.getChats();

      for (const chat of chats.slice(0, 10)) { // Apenas os 10 chats mais recentes
        try {
          const messages = await chat.fetchMessages({ limit: 5 });
          for (const message of messages) {
            const whatsappMessage = await this.formatMessage(message, connection.organizationId);
            connection.messages.push(whatsappMessage);
          }
        } catch (error) {
          console.error(`Erro ao carregar mensagens do chat ${chat.name} para ${connection.organizationId}:`, error);
        }
      }

      // Ordenar por timestamp (mais recentes primeiro)
      connection.messages.sort((a, b) => b.timestamp - a.timestamp);
      connection.messages = connection.messages.slice(0, 100); // Manter apenas as 100 mais recentes

      console.log(`✅ ${connection.messages.length} mensagens carregadas para ${connection.organizationId}`);
    } catch (error) {
      console.error(`❌ Erro ao carregar mensagens para ${connection.organizationId}:`, error);
    }
  }

  private async getMyNumber(connection: WhatsAppOrgConnection): Promise<string> {
    try {
      const info = connection.client.info;
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

  private notifyStatusListeners(organizationId: string, status: string, data?: any) {
    this.statusListeners.forEach(listener => {
      try {
        listener(organizationId, status, data);
      } catch (error) {
        console.error('Erro no listener de status:', error);
      }
    });
  }

  // Public Methods
  async connect(organizationId: string): Promise<void> {
    console.log(`🚀 [DEBUG] connect() chamado para org: ${organizationId}`);
    const connection = await this.getOrCreateConnection(organizationId);
    console.log(`🔍 [DEBUG] Conexão obtida, status: ready=${connection.isReady}, connecting=${connection.isConnecting}`);

    if (connection.isReady) {
      console.log(`✅ [DEBUG] WhatsApp já está conectado para organização: ${organizationId}`);
      return;
    }

    if (connection.isConnecting) {
      console.log(`⏳ [DEBUG] Conexão já em andamento para organização: ${organizationId}`);
      return;
    }

    try {
      console.log(`🚀 [DEBUG] Conectando WhatsApp para organização: ${organizationId}`);
      connection.isConnecting = true;
      connection.lastConnectionAttempt = Date.now();
      console.log(`⏰ [DEBUG] LastConnectionAttempt atualizado para: ${connection.lastConnectionAttempt}`);

      console.log(`🔄 [DEBUG] Chamando client.initialize() para org: ${organizationId}`);
      await connection.client.initialize();
      console.log(`📱 [DEBUG] Cliente WhatsApp inicializado para ${organizationId} - aguardando conexão...`);
    } catch (error) {
      console.error(`❌ [DEBUG] Erro ao conectar WhatsApp para ${organizationId}:`, error);
      connection.isConnecting = false;
      throw error;
    }
  }

  async disconnect(organizationId: string): Promise<void> {
    const connection = this.connections.get(organizationId);
    if (!connection) return;

    try {
      console.log(`🔌 Desconectando WhatsApp para organização: ${organizationId}`);
      this.clearConnectionTimeout(connection);
      await connection.client.destroy();
      connection.isReady = false;
      connection.isConnecting = false;
      connection.qrCode = null;

      console.log(`✅ WhatsApp desconectado para organização: ${organizationId}`);
    } catch (error) {
      console.error(`❌ Erro ao desconectar WhatsApp para ${organizationId}:`, error);
    }
  }

  async reconnect(organizationId: string): Promise<void> {
    console.log(`🔄 Reconectando WhatsApp para organização: ${organizationId}`);
    await this.disconnect(organizationId);

    // Aguardar um pouco antes de reconectar
    await new Promise(resolve => setTimeout(resolve, 2000));

    await this.connect(organizationId);
  }

  async sendMessage(organizationId: string, to: string, message: string): Promise<boolean> {
    const connection = this.connections.get(organizationId);

    if (!connection || !connection.isReady) {
      console.error(`❌ WhatsApp não está conectado para organização: ${organizationId}`);
      throw new Error(`WhatsApp não está conectado para organização: ${organizationId}`);
    }

    try {
      console.log(`📤 Enviando mensagem via ${organizationId} para ${to}: ${message.substring(0, 50)}...`);

      // Formatar número se necessário
      const chatId = to.includes('@') ? to : `${to}@c.us`;

      // Verificar se o chat existe
      const chat = await connection.client.getChatById(chatId);
      if (!chat) {
        throw new Error('Chat não encontrado');
      }

      await connection.client.sendMessage(chatId, message);
      console.log('✅ Mensagem enviada com sucesso!');
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  getQRCode(organizationId: string): string | null {
    const connection = this.connections.get(organizationId);
    return connection?.qrCode || null;
  }

  isConnected(organizationId: string): boolean {
    const connection = this.connections.get(organizationId);
    return connection?.isReady || false;
  }

  isConnecting(organizationId: string): boolean {
    const connection = this.connections.get(organizationId);
    return connection?.isConnecting || false;
  }

  getConnectionStatus(organizationId: string): { isReady: boolean; isConnecting: boolean; qrCode: string | null } {
    const connection = this.connections.get(organizationId);
    return {
      isReady: connection?.isReady || false,
      isConnecting: connection?.isConnecting || false,
      qrCode: connection?.qrCode || null
    };
  }

  async getMessages(organizationId: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    const connection = this.connections.get(organizationId);
    return connection?.messages.slice(0, limit) || [];
  }

  async getContacts(organizationId: string): Promise<WhatsAppContact[]> {
    const connection = this.connections.get(organizationId);
    return connection?.contacts || [];
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

  onStatusChange(listener: (organizationId: string, status: string, data?: any) => void): () => void {
    this.statusListeners.push(listener);

    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(orgId =>
      this.disconnect(orgId)
    );
    await Promise.all(promises);
    this.connections.clear();
  }

  getAllConnections(): { organizationId: string; isReady: boolean; isConnecting: boolean }[] {
    return Array.from(this.connections.entries()).map(([orgId, connection]) => ({
      organizationId: orgId,
      isReady: connection.isReady,
      isConnecting: connection.isConnecting
    }));
  }
}

export const multiOrgWhatsAppService = new MultiOrgWhatsAppService();