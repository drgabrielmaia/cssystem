import { Router } from 'lambda-api';
import { getWhatsAppService } from './whatsapp.service';

const api = Router();

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

    const whatsappService = getWhatsAppService();
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    const result = await whatsappService.sendMessage(chatId, message);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ [Send] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = api;