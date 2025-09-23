import express, { Response, Request } from "express";
import cors from "cors";
import { getWhatsAppService } from './whatsapp';

var app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://cs.medicosderesultado.com.br'],
  credentials: true
}));

app.use(express.json());

// Template endpoints (keeping from Bohr template)
const users = [
  { id: 1, name: "Lucas" },
  { id: 2, name: "Eric" },
  { id: 3, name: "Ana" },
];

app.get("/", function (req: Request, res: Response) {
  res.status(200).json({
    success: true,
    message: 'WhatsApp API - Serverless HTTP',
    version: '3.0.0',
    endpoints: {
      health: '/health',
      status: '/status',
      qr: '/qr',
      send: '/send',
      contacts: '/contacts',
      messages: '/messages'
    },
    timestamp: new Date().toISOString()
  });
});

app.get("/users", function (req: Request, res: Response) {
  res.send(users);
});

app.get("/users/:userId", function (req: Request, res: Response) {
  const user = users.find((user) => user.id === parseInt(req.params.userId));
  res.send(user);
});

// WhatsApp API endpoints
// Health check
app.get('/health', async (req: Request, res: Response) => {
  console.log('🏥 [Health] Health check...');
  return res.status(200).json({
    success: true,
    message: 'WhatsApp API Health Check - Serverless',
    timestamp: new Date().toISOString()
  });
});

// Status
app.get('/status', async (req: Request, res: Response) => {
  console.log('📡 [Status] Processando requisição...');
  try {
    const whatsappService = getWhatsAppService();
    const status = whatsappService.getStatus();

    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('❌ [Status] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// QR Code
app.get('/qr', async (req: Request, res: Response) => {
  console.log('📱 [QR] Processando requisição QR Code...');
  try {
    const whatsappService = getWhatsAppService();
    const qrData = await whatsappService.getQRCode();

    if ('error' in qrData) {
      return res.status(404).json({
        success: false,
        error: qrData.error
      });
    }

    return res.status(200).json({
      success: true,
      qrCode: qrData.qrImage,
      qr: qrData.qr
    });
  } catch (error: any) {
    console.error('❌ [QR] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send message
app.post('/send', async (req: Request, res: Response) => {
  console.log('📤 [Send] Processando envio de mensagem...');
  try {
    const { to, message } = req.body;

    // Validação rigorosa dos parâmetros
    if (!to || typeof to !== 'string' || to.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campo "to" é obrigatório e deve ser uma string não vazia'
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campo "message" é obrigatório e deve ser uma string não vazia'
      });
    }

    // Validação do formato do número
    const phoneRegex = /^[\d@c.us@g.us\-\+\s\(\)]+$/;
    if (!phoneRegex.test(to)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de número inválido'
      });
    }

    console.log(`📤 [Send] Enviando mensagem para ${to}: ${message}`);

    const whatsappService = getWhatsAppService();
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    const result = await whatsappService.sendMessage(chatId, message.trim());

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ [Send] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// Contacts
app.get('/contacts', async (req: Request, res: Response) => {
  console.log('📞 [Contacts] Buscando contatos...');
  try {
    const whatsappService = getWhatsAppService();
    const contacts = whatsappService.getContacts();

    return res.status(200).json({
      success: true,
      data: contacts,
      count: contacts.length
    });
  } catch (error: any) {
    console.error('❌ [Contacts] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Messages
app.get('/messages', async (req: Request, res: Response) => {
  console.log('💬 [Messages] Buscando mensagens...');
  try {
    const limitParam = req.query.limit as string;
    let limit = 50; // valor padrão

    // Validação do parâmetro limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Parâmetro "limit" deve ser um número entre 1 e 1000'
        });
      }
      limit = parsedLimit;
    }

    const whatsappService = getWhatsAppService();

    // Verificar se o serviço está pronto
    const status = whatsappService.getStatus();
    if (!status.isReady) {
      return res.status(503).json({
        success: false,
        error: 'Serviço WhatsApp não está pronto'
      });
    }

    const messages = whatsappService.getMessages(limit);

    return res.status(200).json({
      success: true,
      data: messages,
      count: messages.length,
      limit: limit
    });
  } catch (error: any) {
    console.error('❌ [Messages] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// Messages from specific chat
app.get('/messages/:chatId', async (req: Request, res: Response) => {
  console.log('💬 [Messages] Buscando mensagens do chat...');
  try {
    const { chatId } = req.params;

    // Validação do chatId
    if (!chatId || typeof chatId !== 'string' || chatId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ChatId é obrigatório e deve ser uma string não vazia'
      });
    }

    // Validação do formato do chatId
    const chatIdRegex = /^[\d@c.us@g.us\-\+\s\(\)]+$/;
    if (!chatIdRegex.test(chatId)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de chatId inválido'
      });
    }

    const limitParam = req.query.limit as string;
    let limit = 50; // valor padrão

    // Validação do parâmetro limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Parâmetro "limit" deve ser um número entre 1 e 1000'
        });
      }
      limit = parsedLimit;
    }

    const whatsappService = getWhatsAppService();

    // Verificar se o serviço está pronto
    const status = whatsappService.getStatus();
    if (!status.isReady) {
      return res.status(503).json({
        success: false,
        error: 'Serviço WhatsApp não está pronto'
      });
    }

    const messages = whatsappService.getChatMessages(chatId.trim(), limit);

    return res.status(200).json({
      success: true,
      data: messages,
      count: messages.length,
      chatId: chatId.trim(),
      limit: limit
    });
  } catch (error: any) {
    console.error('❌ [Messages] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

if (require.main === module) {
  app.listen(3001);
  console.log("Express started on port 3001");
}

export default app;