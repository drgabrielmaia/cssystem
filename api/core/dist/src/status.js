"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lambda_api_1 = __importDefault(require("lambda-api"));
const whatsapp_service_1 = require("./whatsapp.service");
const api = (0, lambda_api_1.default)();
api.get('/', async (req, res) => {
    console.log('📡 [Status] Processando requisição...');
    try {
        const whatsappService = (0, whatsapp_service_1.getWhatsAppService)();
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
module.exports = api;
//# sourceMappingURL=status.js.map