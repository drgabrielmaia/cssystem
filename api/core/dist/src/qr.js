"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lambda_api_1 = require("lambda-api");
const whatsapp_service_1 = require("./whatsapp.service");
const api = (0, lambda_api_1.Router)();
api.get('/', async (req, res) => {
    console.log('📱 [QR] Processando requisição QR Code...');
    try {
        const whatsappService = (0, whatsapp_service_1.getWhatsAppService)();
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
module.exports = api;
//# sourceMappingURL=qr.js.map