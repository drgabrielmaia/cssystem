import { Router } from 'lambda-api';
import { getWhatsAppService } from './whatsapp.service';

const api = Router();

api.get('/', async (req, res) => {
  console.log('💬 [Messages] Buscando mensagens...');
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const whatsappService = getWhatsAppService();
    const messages = whatsappService.getMessages(limit);

    return res.status(200).json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error: any) {
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
    const limit = parseInt(req.query.limit as string) || 50;
    const whatsappService = getWhatsAppService();
    const messages = whatsappService.getChatMessages(chatId, limit);

    return res.status(200).json({
      success: true,
      data: messages,
      count: messages.length,
      chatId: chatId
    });
  } catch (error: any) {
    console.error('❌ [Messages] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = api;