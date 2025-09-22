const createAPI = require('lambda-api');
const { getWhatsAppService } = require('./whatsapp');

const api = createAPI({
  logger: true
});

// Health check
api.get('/health', async (req, res) => {
  console.log('🏥 [Lambda Health] Health check...');
  return res.status(200).json({
    success: true,
    message: 'WhatsApp API Health Check - Lambda',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
api.get('/test', async (req, res) => {
  console.log('🧪 [Lambda Test] Teste simples...');
  return res.status(200).json({
    success: true,
    message: 'Lambda API funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Status
api.get('/status', async (req, res) => {
  console.log('📡 [Lambda Status] Processando requisição...');
  try {
    const whatsappService = getWhatsAppService();
    const status = whatsappService.getStatus();

    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('❌ [Lambda Status] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// QR Code
api.get('/qr', async (req, res) => {
  console.log('📱 [Lambda QR] Processando requisição QR Code...');
  try {
    const whatsappService = getWhatsAppService();
    const qrData = await whatsappService.getQRCode();

    if (qrData.error) {
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
  } catch (error) {
    console.error('❌ [Lambda QR] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send message
api.post('/send', async (req, res) => {
  console.log('📤 [Lambda Send] Processando envio de mensagem...');
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Campos "to" e "message" são obrigatórios'
      });
    }

    console.log(`📤 [Lambda Send] Enviando mensagem para ${to}: ${message}`);

    const whatsappService = getWhatsAppService();
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    const result = await whatsappService.sendMessage(chatId, message);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [Lambda Send] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Contacts
api.get('/contacts', async (req, res) => {
  console.log('📞 [Lambda Contacts] Buscando contatos...');
  try {
    const whatsappService = getWhatsAppService();
    const contacts = whatsappService.getContacts();

    return res.status(200).json({
      success: true,
      data: contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('❌ [Lambda Contacts] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Messages
api.get('/messages', async (req, res) => {
  console.log('💬 [Lambda Messages] Buscando mensagens...');
  try {
    const limit = parseInt(req.query.limit) || 50;
    const whatsappService = getWhatsAppService();
    const messages = whatsappService.getMessages(limit);

    return res.status(200).json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('❌ [Lambda Messages] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Root endpoint
api.get('/', async (req, res) => {
  console.log('🏠 [Lambda Index] Rota raiz da API...');
  return res.status(200).json({
    success: true,
    message: 'WhatsApp API - Lambda Functions',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      status: '/api/status',
      qr: '/api/qr',
      send: '/api/send',
      contacts: '/api/contacts',
      messages: '/api/messages'
    },
    timestamp: new Date().toISOString()
  });
});

// CORS for all routes
api.use((req, res, next) => {
  res.cors({
    origin: ['http://localhost:3000', 'https://cs.medicosderesultado.com.br'],
    credentials: true
  });
  next();
});

// Lambda handler
exports.handler = async (event, context) => {
  console.log('🚀 [Lambda Handler] Event:', JSON.stringify(event, null, 2));
  return await api.run(event, context);
};

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3001;

  // Convert to Express for local server
  const express = require('express');
  const cors = require('cors');

  const app = express();
  app.use(cors({
    origin: ['http://localhost:3000', 'https://cs.medicosderesultado.com.br'],
    credentials: true
  }));
  app.use(express.json());

  // Mount routes
  app.get('/health', (req, res) => res.json({success: true, message: 'Health OK'}));
  app.get('/test', (req, res) => res.json({success: true, message: 'Test OK'}));

  app.listen(PORT, () => {
    console.log(`🚀 WhatsApp API rodando na porta ${PORT}`);
  });
}