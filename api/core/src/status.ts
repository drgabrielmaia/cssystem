import createAPI from 'lambda-api';
import { getWhatsAppService } from './whatsapp.service';

const api = createAPI();

api.get('/', async (req, res) => {
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

module.exports = api;