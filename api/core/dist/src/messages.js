"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lambda_api_1 = require("lambda-api");
const whatsapp_service_1 = require("./whatsapp.service");
const api = (0, lambda_api_1.Router)();
api.get('/', async (req, res) => {
    console.log('💬 [Messages] Buscando mensagens...');
    try {
        const limit = parseInt(req.query.limit) || 50;
        const whatsappService = (0, whatsapp_service_1.getWhatsAppService)();
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
// Get messages from specific chat
api.get('/:chatId', async (req, res) => {
    console.log('💬 [Messages] Buscando mensagens do chat...');
    try {
        const { chatId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const whatsappService = (0, whatsapp_service_1.getWhatsAppService)();
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
module.exports = api;
//# sourceMappingURL=messages.js.map