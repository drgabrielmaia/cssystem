"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lambda_api_1 = require("lambda-api");
const whatsapp_service_1 = require("./whatsapp.service");
const api = (0, lambda_api_1.Router)();
api.get('/', async (req, res) => {
    console.log('📞 [Contacts] Buscando contatos...');
    try {
        const whatsappService = (0, whatsapp_service_1.getWhatsAppService)();
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
module.exports = api;
//# sourceMappingURL=contacts.js.map