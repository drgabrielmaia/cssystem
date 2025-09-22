const { getWhatsAppService } = require('./core/whatsapp');

exports.handler = async (event) => {
  console.log('📡 [Lambda Status] Processando requisição...');

  try {
    const whatsappService = getWhatsAppService();
    const status = whatsappService.getStatus();

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
        data: status
      })
    };

    console.log('✅ [Lambda Status] Status retornado com sucesso');
    return response;

  } catch (error) {
    console.error('❌ [Lambda Status] Erro:', error);
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