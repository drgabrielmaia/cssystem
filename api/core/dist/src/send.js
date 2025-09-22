"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lambda_api_1 = require("lambda-api");
const whatsapp_service_1 = require("./whatsapp.service");
const api = (0, lambda_api_1.Router)();
api.post('/', async (req, res) => {
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
        const whatsappService = (0, whatsapp_service_1.getWhatsAppService)();
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
module.exports = api;
//# sourceMappingURL=send.js.map