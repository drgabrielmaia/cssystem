const { getWhatsAppService } = require('./whatsapp.js');

exports.handler = async (event) => {
  console.log('📤 [Lambda Send] Processando envio de mensagem...');

  try {
    // Parse do body da requisição
    const body = JSON.parse(event.body || '{}');
    const { to, message } = body;

    if (!to || !message) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Campos "to" e "message" são obrigatórios'
        })
      };
    }

    console.log(`📤 [Lambda Send] Enviando mensagem para ${to}: ${message}`);

    const whatsappService = getWhatsAppService();

    // Ensure proper format
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    const result = await whatsappService.sendMessage(chatId, message);

    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        data: result
      })
    };

    console.log('✅ [Lambda Send] Mensagem enviada com sucesso');
    return response;

  } catch (error) {
    console.error('❌ [Lambda Send] Erro:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};