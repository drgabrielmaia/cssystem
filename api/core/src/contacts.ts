import { Router } from 'lambda-api';
import { getWhatsAppService } from './whatsapp.service';

const api = Router();

api.get('/', async (req, res) => {
  console.log('📞 [Contacts] Buscando contatos...');
  try {
    const whatsappService = getWhatsAppService();
    const contacts = whatsappService.getContacts();

    return res.status(200).json({
      success: true,
      data: contacts,
      count: contacts.length
    });
  } catch (error: any) {
    console.error('❌ [Contacts] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = api;