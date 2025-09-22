"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const serverless_http_1 = __importDefault(require("serverless-http"));
const whatsapp_1 = require("./whatsapp");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'https://cs.medicosderesultado.com.br'],
    credentials: true
}));
app.use(express_1.default.json());
// WhatsApp routes
// Health check
app.get('/health', async (req, res) => {
    console.log('🏥 [Health] Health check...');
    return res.status(200).json({
        success: true,
        message: 'WhatsApp API Health Check - Serverless',
        timestamp: new Date().toISOString()
    });
});
// Status
app.get('/status', async (req, res) => {
    console.log('📡 [Status] Processando requisição...');
    try {
        const whatsappService = (0, whatsapp_1.getWhatsAppService)();
        const status = whatsappService.getStatus();
        return res.status(200).json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('❌ [Status] Erro:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// QR Code
app.get('/qr', async (req, res) => {
    console.log('📱 [QR] Processando requisição QR Code...');
    try {
        const whatsappService = (0, whatsapp_1.getWhatsAppService)();
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
    }
    catch (error) {
        console.error('❌ [QR] Erro:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Send message
app.post('/send', async (req, res) => {
    console.log('📤 [Send] Processando envio de mensagem...');
    try {
        const { to, message } = req.body;
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: 'Campos "to" e "message" são obrigatórios'
            });
        }
        console.log(`📤 [Send] Enviando mensagem para ${to}: ${message}`);
        const whatsappService = (0, whatsapp_1.getWhatsAppService)();
        const chatId = to.includes('@') ? to : `${to}@c.us`;
        const result = await whatsappService.sendMessage(chatId, message);
        return res.status(200).json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('❌ [Send] Erro:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Contacts
app.get('/contacts', async (req, res) => {
    console.log('📞 [Contacts] Buscando contatos...');
    try {
        const whatsappService = (0, whatsapp_1.getWhatsAppService)();
        const contacts = whatsappService.getContacts();
        return res.status(200).json({
            success: true,
            data: contacts,
            count: contacts.length
        });
    }
    catch (error) {
        console.error('❌ [Contacts] Erro:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Messages
app.get('/messages', async (req, res) => {
    console.log('💬 [Messages] Buscando mensagens...');
    try {
        const limit = parseInt(req.query.limit) || 50;
        const whatsappService = (0, whatsapp_1.getWhatsAppService)();
        const messages = whatsappService.getMessages(limit);
        return res.status(200).json({
            success: true,
            data: messages,
            count: messages.length
        });
    }
    catch (error) {
        console.error('❌ [Messages] Erro:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Messages from specific chat
app.get('/messages/:chatId', async (req, res) => {
    console.log('💬 [Messages] Buscando mensagens do chat...');
    try {
        const { chatId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const whatsappService = (0, whatsapp_1.getWhatsAppService)();
        const messages = whatsappService.getChatMessages(chatId, limit);
        return res.status(200).json({
            success: true,
            data: messages,
            count: messages.length,
            chatId: chatId
        });
    }
    catch (error) {
        console.error('❌ [Messages] Erro:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Root endpoint
app.get('/', async (req, res) => {
    console.log('🏠 [Root] Rota raiz da API...');
    return res.status(200).json({
        success: true,
        message: 'WhatsApp API - Serverless HTTP',
        version: '3.0.0',
        endpoints: {
            health: '/api/health',
            status: '/api/status',
            qr: '/api/qr',
            send: '/api/send',
            contacts: '/api/contacts',
            messages: '/api/messages'
        },
        timestamp: new Date().toISOString()
    });
});
// For local development
if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`🚀 WhatsApp API rodando na porta ${PORT}`);
        console.log(`📱 Aguardando QR Code...`);
    });
}
// Export serverless handler
exports.handler = (0, serverless_http_1.default)(app);
//# sourceMappingURL=index.js.map