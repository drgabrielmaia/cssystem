import { Router } from 'lambda-api';
import { getWhatsAppService } from './whatsapp.service';

const api = Router();

api.get('/', async (req, res) => {
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

module.exports = api;