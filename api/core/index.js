const express = require('express');
const cors = require('cors');
const { getWhatsAppService } = require('./whatsapp');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', 'https://cs.medicosderesultado.com.br', 'https://www.cs.medicosderesultado.com.br', 'http://cs.medicosderesultado.com.br', 'https://your-domain.bohr.io'],
  credentials: true
}));

app.use(express.json());

// Initialize WhatsApp service
const whatsappService = getWhatsAppService();

// Routes
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp API Health Check',
    timestamp: new Date().toISOString()
  });
});

app.get('/status', (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/qr', async (req, res) => {
  try {
    const qrData = await whatsappService.getQRCode();

    if (qrData.error) {
      return res.status(404).json({
        success: false,
        error: qrData.error
      });
    }

    res.json({
      success: true,
      data: qrData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/contacts', (req, res) => {
  try {
    const contacts = whatsappService.getContacts();
    res.json({
      success: true,
      data: contacts,
      count: contacts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/messages', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const messages = whatsappService.getMessages(limit);

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/chats/:chatId/messages', (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const messages = whatsappService.getChatMessages(chatId, limit);

    res.json({
      success: true,
      data: messages,
      count: messages.length,
      chatId: chatId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Campos "to" e "message" são obrigatórios'
      });
    }

    // Ensure proper format
    const chatId = to.includes('@') ? to : `${to}@c.us`;

    const result = await whatsappService.sendMessage(chatId, message);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp API - Bohr.io Core',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      status: '/status',
      qr: '/qr',
      contacts: '/contacts',
      messages: '/messages',
      send: '/send'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp API rodando na porta ${PORT}`);
  console.log(`📱 Aguardando QR Code...`);
});

module.exports = app;