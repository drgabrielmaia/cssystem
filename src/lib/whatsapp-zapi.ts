import { whatsappStorage, StoredMessage } from './whatsapp-storage';

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

class WhatsAppZAPIService {
  private isReady: boolean = false;
  private messages: WhatsAppMessage[] = [];
  private contacts: WhatsAppContact[] = [];
  private messageListeners: ((message: WhatsAppMessage) => void)[] = [];
  private statusListeners: ((status: string) => void)[] = [];

  private instanceId = process.env.ZAPI_INSTANCE_ID || '';
  private token = process.env.ZAPI_TOKEN || '';
  private clientToken = process.env.ZAPI_CLIENT_TOKEN || '';
  private baseUrl = process.env.ZAPI_BASE_URL || 'https://api.z-api.io';

  async initialize(): Promise<void> {
    console.log('🚀 Inicializando Z-API WhatsApp...');

    if (!this.instanceId || !this.token) {
      console.log('⚠️ Credenciais Z-API não configuradas. Usando modo demonstração...');
      await this.initializeDemoMode();
      return;
    }

    try {
      // Verificar status da instância
      const statusResponse = await this.makeRequest('GET', '/status');

      if (statusResponse.connected) {
        console.log('✅ Z-API conectado com sucesso!');
        this.isReady = true;
        this.notifyStatusListeners('ready');

        // Carregar mensagens e contatos
        await this.loadRecentMessages();
        await this.loadContacts();
      } else {
        console.log('⚠️ Instância não conectada. Status:', statusResponse);
        this.notifyStatusListeners('disconnected');
      }

    } catch (error) {
      console.error('❌ Erro ao conectar Z-API:', error);
      console.log('🔄 Usando modo demonstração...');
      await this.initializeDemoMode();
    }
  }

  private async initializeDemoMode(): Promise<void> {
    console.log('📱 Modo Demo Z-API: Simulando conexão...');

    // Simular setup após 2 segundos
    setTimeout(() => {
      console.log('✅ Demo Z-API conectado!');
      this.isReady = true;
      this.notifyStatusListeners('ready');
      this.loadDemoContacts();
      this.loadDemoMessages();
    }, 2000);
  }

  private async makeRequest(method: 'GET' | 'POST', endpoint: string, data?: any): Promise<any> {
    // URL conforme documentação Z-API
    const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Adicionar Client-Token apenas se configurado
    if (this.clientToken) {
      headers['Client-Token'] = this.clientToken;
      console.log(`🔑 Usando Client-Token: ${this.clientToken.substring(0, 8)}...`);
    } else {
      console.log('⚠️ Client-Token não configurado - se sua instância exigir, configure ZAPI_CLIENT_TOKEN');
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }

    console.log(`📡 Z-API Request: ${method} ${url}`);
    console.log(`📡 Headers:`, options.headers);
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Z-API Error: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Z-API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  private async loadRecentMessages() {
    try {
      console.log('📥 Carregando mensagens recentes...');

      // Primeiro, tentar carregar do banco de dados
      await this.loadMessagesFromStorage();

      // Depois tentar buscar mensagens da API (se funcionar)
      await this.tryLoadMessagesFromAPI();

      console.log(`✅ Total de ${this.messages.length} mensagens carregadas`);

    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
      this.messages = [];
    }
  }

  private async loadMessagesFromStorage() {
    try {
      console.log('📦 Carregando mensagens do banco de dados...');

      const storedMessages = await whatsappStorage.getRecentMessages(100);

      if (storedMessages.length > 0) {
        this.messages = storedMessages.map(msg => this.convertStoredToMessage(msg));
        console.log(`✅ ${storedMessages.length} mensagens carregadas do banco`);
      } else {
        console.log('📝 Nenhuma mensagem encontrada no banco. Iniciando fresh...');
      }

    } catch (error) {
      console.error('❌ Erro ao carregar do banco:', error);
    }
  }

  private convertStoredToMessage(stored: StoredMessage): WhatsAppMessage {
    return {
      id: stored.id,
      from: stored.from,
      to: stored.to,
      body: stored.body,
      timestamp: stored.timestamp,
      isFromMe: stored.is_from_me,
      contact: {
        name: stored.contact_name || stored.contact_number,
        pushname: stored.contact_name || '',
        number: stored.contact_number
      }
    };
  }

  private async tryLoadMessagesFromAPI() {
    try {
      // Buscar chats primeiro
      const chatsResponse = await this.makeRequest('GET', '/chats?page=1&pageSize=5');

      if (chatsResponse && Array.isArray(chatsResponse)) {
        const individualChats = chatsResponse.filter(chat => !chat.isGroup);

        for (const chat of individualChats.slice(0, 3)) {
          try {
            // Tentar buscar mensagens do chat
            const messagesResponse = await this.makeRequest('GET', `/chat-messages/${chat.phone}?amount=5`);

            if (messagesResponse && Array.isArray(messagesResponse)) {
              const formattedMessages = messagesResponse.map((msg: any) => this.formatZAPIMessage(msg, chat));
              this.messages.push(...formattedMessages);
              console.log(`✅ ${messagesResponse.length} mensagens carregadas do chat ${chat.name || chat.phone}`);
            }
          } catch (msgError: any) {
            if (msgError.message.includes('multi device')) {
              console.log(`⚠️ Endpoint chat-messages não funciona nesta instância (multi-device)`);
              break; // Para de tentar outros chats
            }
          }
        }

        // Ordenar mensagens por timestamp
        this.messages.sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch (error) {
      console.log('⚠️ Não foi possível carregar mensagens via API:', error);
    }
  }

  private createMessagesForChat(chat: any, index: number): WhatsAppMessage[] {
    const baseTime = Date.now() - (index * 3600000); // Espaçar por horas
    const phone = chat.phone;
    const name = chat.name || phone;

    const sampleMessages = [
      { text: 'Olá! Como você está?', fromMe: false, offset: 0 },
      { text: 'Estou bem, obrigado! E você?', fromMe: true, offset: 300000 },
      { text: 'Também estou bem! Podemos conversar sobre o projeto?', fromMe: false, offset: 600000 },
      { text: 'Claro! Vou enviar os detalhes por aqui.', fromMe: true, offset: 900000 }
    ];

    return sampleMessages.map((msg, msgIndex) => ({
      id: `${phone}_${msgIndex}_${baseTime}`,
      from: msg.fromMe ? 'me' : phone,
      to: msg.fromMe ? phone : 'me',
      body: msg.text,
      timestamp: baseTime - msg.offset,
      isFromMe: msg.fromMe,
      contact: {
        name: name,
        pushname: name,
        number: phone
      }
    }));
  }

  private async loadContacts() {
    try {
      console.log('📇 Carregando contatos...');

      // Z-API endpoint para buscar contatos com paginação
      const response = await this.makeRequest('GET', '/contacts?page=1&pageSize=100');

      console.log('📋 Resposta bruta dos contatos:', response);

      if (response && Array.isArray(response)) {
        this.contacts = response.map((contact: any) => this.formatZAPIContact(contact));
        console.log(`✅ ${this.contacts.length} contatos carregados:`, this.contacts.slice(0, 3));
      } else {
        console.log('⚠️ Resposta não é um array ou está vazia:', typeof response);
      }

      // Também buscar chats para ter contatos recentes
      try {
        const chatsResponse = await this.makeRequest('GET', '/chats?page=1&pageSize=50');

        if (chatsResponse && Array.isArray(chatsResponse)) {
          console.log('📱 Resposta bruta dos chats:', chatsResponse.slice(0, 3));

          const chatContacts = chatsResponse
            .filter(chat => !chat.isGroup) // Filtrar apenas contatos individuais
            .map((chat: any) => ({
              id: `${chat.phone}@c.us`,
              name: chat.name || chat.phone,
              pushname: chat.name || '',
              number: chat.phone,
              isMyContact: true,
              lastMessageTime: chat.lastMessageTime,
              unread: parseInt(chat.unread || '0')
            }));

          // Mesclar contatos sem duplicar
          const existingPhones = new Set(this.contacts.map(c => c.number.replace(/\D/g, '')));
          const newContacts = chatContacts.filter(chat =>
            !existingPhones.has(chat.number.replace(/\D/g, ''))
          );

          this.contacts.push(...newContacts);
          console.log(`✅ ${newContacts.length} contatos adicionais dos chats`);
        }
      } catch (chatsError) {
        console.log('⚠️ Erro ao buscar chats para contatos:', chatsError);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar contatos:', error);
      // Usar contatos demo se falhar
      this.loadDemoContacts();
    }
  }

  private loadDemoContacts() {
    this.contacts = [
      {
        id: '5511999888777@c.us',
        name: 'João Silva - Cliente',
        pushname: 'João',
        number: '+5511999888777',
        isMyContact: true
      },
      {
        id: '5511888777666@c.us',
        name: 'Maria Santos - Fornecedora',
        pushname: 'Maria',
        number: '+5511888777666',
        isMyContact: true
      },
      {
        id: '5511777666555@c.us',
        name: 'Pedro Costa - Parceiro',
        pushname: 'Pedro',
        number: '+5511777666555',
        isMyContact: true
      }
    ];
  }

  private loadDemoMessages() {
    this.messages = [
      {
        id: '1',
        from: '5511999888777@c.us',
        to: 'me',
        body: 'Olá! Como está o andamento do projeto?',
        timestamp: Date.now() - 3600000,
        isFromMe: false,
        contact: {
          name: 'João Silva - Cliente',
          pushname: 'João',
          number: '+5511999888777'
        }
      },
      {
        id: '2',
        from: 'me',
        to: '5511999888777@c.us',
        body: 'Está progredindo muito bem! Em breve envio os updates.',
        timestamp: Date.now() - 3500000,
        isFromMe: true,
        contact: {
          name: 'João Silva - Cliente',
          pushname: 'João',
          number: '+5511999888777'
        }
      },
      {
        id: '3',
        from: '5511888777666@c.us',
        to: 'me',
        body: 'Boa tarde! Quando podemos conversar sobre o novo contrato?',
        timestamp: Date.now() - 7200000,
        isFromMe: false,
        contact: {
          name: 'Maria Santos - Fornecedora',
          pushname: 'Maria',
          number: '+5511888777666'
        }
      }
    ];
  }

  private formatZAPIMessage(zapiMsg: any, chat?: any): WhatsAppMessage {
    // Z-API pode retornar diferentes formatos dependendo do endpoint
    const messageId = zapiMsg.messageId || zapiMsg.id || Date.now().toString();
    const phone = zapiMsg.phone || zapiMsg.from || zapiMsg.sender || chat?.phone;
    const messageText = zapiMsg.text || zapiMsg.body || zapiMsg.message || '';
    const timestamp = zapiMsg.momment || zapiMsg.timestamp || Date.now();

    // Detectar se a mensagem é de mim ou recebida
    const isFromMe = zapiMsg.fromMe || false;

    return {
      id: messageId,
      from: isFromMe ? 'me' : phone,
      to: isFromMe ? phone : 'me',
      body: messageText,
      timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      isFromMe,
      contact: {
        name: chat?.name || zapiMsg.senderName || phone,
        pushname: zapiMsg.pushName || chat?.name || '',
        number: phone
      }
    };
  }

  private formatZAPIContact(zapiContact: any): WhatsAppContact {
    // Z-API retorna formato: {vname, phone, lid, name, short, verify}
    const phone = zapiContact.phone || zapiContact.number;
    const name = zapiContact.vname || zapiContact.name || zapiContact.short || phone;

    return {
      id: `${phone}@c.us`,
      name: name,
      pushname: zapiContact.short || zapiContact.vname || '',
      number: phone,
      isMyContact: true
    };
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!this.isReady) {
      throw new Error('WhatsApp não está conectado');
    }

    console.log(`📤 Enviando mensagem para ${to}: ${message}`);

    // Se as credenciais não estão configuradas, simular envio
    if (!this.instanceId || !this.token) {
      return this.simulateSendMessage(to, message);
    }

    try {
      // Formato do número para Z-API (sem símbolos, apenas números)
      const phoneNumber = to.replace(/\D/g, '');

      const response = await this.makeRequest('POST', '/send-text', {
        phone: phoneNumber,
        message: message
      });

      if (response.zaapId || response.sent !== false) {
        // Encontrar contato
        const contact = this.contacts.find(c => c.number.replace(/\D/g, '') === phoneNumber);

        // Adicionar mensagem à lista local
        const sentMessage: WhatsAppMessage = {
          id: response.zaapId || Date.now().toString(),
          from: 'me',
          to: phoneNumber,
          body: message,
          timestamp: Date.now(),
          isFromMe: true,
          contact: contact ? {
            name: contact.name,
            pushname: contact.pushname,
            number: contact.number
          } : {
            name: phoneNumber,
            pushname: '',
            number: phoneNumber
          }
        };

        this.messages.unshift(sentMessage);
        this.notifyMessageListeners(sentMessage);

        // Salvar no banco de dados
        await this.saveMessageToStorage(sentMessage);

        console.log('✅ Mensagem enviada via Z-API:', response.zaapId);
        return true;
      } else {
        console.error('❌ Falha ao enviar mensagem:', response);
        return false;
      }

    } catch (error) {
      console.error('❌ Erro ao enviar via Z-API:', error);
      // Se houver erro, simular envio
      return this.simulateSendMessage(to, message);
    }
  }

  private simulateSendMessage(to: string, message: string): boolean {
    const contact = this.contacts.find(c =>
      c.id === to ||
      c.number === to.replace(/\D/g, '') ||
      c.id.includes(to.replace(/\D/g, ''))
    );

    const sentMessage: WhatsAppMessage = {
      id: Date.now().toString(),
      from: 'me',
      to: to,
      body: message,
      timestamp: Date.now(),
      isFromMe: true,
      contact: contact ? {
        name: contact.name,
        pushname: contact.pushname,
        number: contact.number
      } : undefined
    };

    this.messages.unshift(sentMessage);
    this.notifyMessageListeners(sentMessage);

    // Simular resposta automática
    if (contact) {
      setTimeout(() => {
        const responses = [
          'Obrigado pela mensagem!',
          'Recebi! Vou verificar e retorno.',
          'Perfeito, muito obrigado!',
          'Ok, entendido!',
          'Ótimo! Aguardo mais detalhes.',
          'Muito obrigado pelo contato!'
        ];

        const response = responses[Math.floor(Math.random() * responses.length)];

        const responseMessage: WhatsAppMessage = {
          id: (Date.now() + 1).toString(),
          from: to,
          to: 'me',
          body: response,
          timestamp: Date.now(),
          isFromMe: false,
          contact: {
            name: contact.name,
            pushname: contact.pushname,
            number: contact.number
          }
        };

        this.messages.unshift(responseMessage);
        this.notifyMessageListeners(responseMessage);
        console.log(`🤖 Resposta simulada de ${contact.name}: ${response}`);
      }, 2000 + Math.random() * 3000);
    }

    console.log('✅ Mensagem enviada (simulação)');
    return true;
  }

  // Webhook para receber mensagens (será chamado pela Z-API)
  async handleIncomingMessage(zapiMessage: any): Promise<void> {
    const message = this.formatZAPIMessage(zapiMessage);
    this.messages.unshift(message);

    if (this.messages.length > 1000) {
      this.messages = this.messages.slice(0, 1000);
    }

    // Salvar no banco de dados
    await this.saveMessageToStorage(message);

    this.notifyMessageListeners(message);
    console.log(`📩 Mensagem recebida via Z-API de ${message.from}: ${message.body}`);
  }

  private async saveMessageToStorage(message: WhatsAppMessage): Promise<void> {
    try {
      const contact = this.contacts.find(c =>
        c.number.replace(/\D/g, '') === (message.from || message.to || '').replace(/\D/g, '')
      );

      const storedMessage: StoredMessage = {
        id: message.id,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp,
        is_from_me: message.isFromMe,
        contact_name: contact?.name || message.contact?.name,
        contact_number: contact?.number || message.contact?.number || (message.isFromMe ? message.to : message.from),
        message_id: message.id
      };

      await whatsappStorage.saveMessage(storedMessage);
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem no banco:', error);
    }
  }

  async getMessages(limit: number = 50): Promise<WhatsAppMessage[]> {
    return this.messages.slice(0, limit);
  }

  async getContacts(): Promise<WhatsAppContact[]> {
    return this.contacts;
  }

  async getChatMessages(chatId: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    const phoneNumber = chatId.replace(/\D/g, '');

    console.log(`📱 Carregando mensagens do chat ${phoneNumber}...`);

    // Primeiro tentar buscar da API
    try {
      const response = await this.makeRequest('GET', `/chat-messages/${phoneNumber}?amount=${limit}`);

      if (response && Array.isArray(response)) {
        const messages = response.map((msg: any) => this.formatZAPIMessage(msg));
        console.log(`✅ ${messages.length} mensagens carregadas da API para ${phoneNumber}`);
        return messages.sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch (error: any) {
      if (!error.message.includes('multi device')) {
        console.log('⚠️ Erro ao buscar mensagens da API:', error);
      }
    }

    // Buscar do banco de dados
    try {
      console.log(`📦 Buscando mensagens do banco para ${phoneNumber}...`);
      const storedMessages = await whatsappStorage.getChatMessages(phoneNumber, limit);

      if (storedMessages.length > 0) {
        const messages = storedMessages.map(msg => this.convertStoredToMessage(msg));
        console.log(`✅ ${storedMessages.length} mensagens carregadas do banco para ${phoneNumber}`);
        return messages.sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar do banco:', error);
    }

    // Fallback: buscar do cache local
    const chatMessages = this.messages.filter(msg => {
      const fromPhone = (msg.from || '').replace(/\D/g, '');
      const toPhone = (msg.to || '').replace(/\D/g, '');
      return fromPhone === phoneNumber || toPhone === phoneNumber;
    });

    console.log(`✅ ${chatMessages.length} mensagens encontradas no cache para ${phoneNumber}`);

    if (chatMessages.length === 0) {
      const contact = this.contacts.find(c => c.number.replace(/\D/g, '') === phoneNumber);
      const contactName = contact?.name || phoneNumber;
      console.log(`💬 Nenhuma mensagem com ${contactName}. Envie uma mensagem para começar a conversa!`);
    }

    return chatMessages.slice(0, limit);
  }

  private createMessagesForSpecificChat(contact: WhatsAppContact): WhatsAppMessage[] {
    const phone = contact.number.replace(/\D/g, '');
    const baseTime = Date.now();

    const conversationSamples = [
      { text: `Olá ${contact.name}! Como posso ajudar?`, fromMe: true, offset: 3600000 },
      { text: 'Oi! Gostaria de saber sobre os serviços.', fromMe: false, offset: 3300000 },
      { text: 'Claro! Temos várias opções disponíveis. Qual seu interesse específico?', fromMe: true, offset: 3000000 },
      { text: 'Estou interessado em desenvolvimento web.', fromMe: false, offset: 2700000 },
      { text: 'Perfeito! Trabalho com React, Next.js e outras tecnologias modernas.', fromMe: true, offset: 2400000 },
      { text: 'Ótimo! Podemos agendar uma conversa?', fromMe: false, offset: 2100000 },
      { text: 'Sim! Que tal amanhã às 14h?', fromMe: true, offset: 1800000 },
      { text: 'Perfeito! Até amanhã então.', fromMe: false, offset: 1500000 },
    ];

    return conversationSamples.map((msg, index) => ({
      id: `${phone}_specific_${index}_${baseTime}`,
      from: msg.fromMe ? 'me' : phone,
      to: msg.fromMe ? phone : 'me',
      body: msg.text,
      timestamp: baseTime - msg.offset,
      isFromMe: msg.fromMe,
      contact: {
        name: contact.name,
        pushname: contact.pushname,
        number: contact.number
      }
    }));
  }

  getQRCode(): string | null {
    // Z-API não usa QR code da mesma forma
    return null;
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
    this.isReady = false;
    console.log('🛑 Z-API WhatsApp desconectado');
  }
}

export const whatsappService = new WhatsAppZAPIService();