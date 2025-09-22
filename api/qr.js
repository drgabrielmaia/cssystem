const { getWhatsAppService } = require('./whatsapp.js');

exports.handler = async (event) => {
  console.log('📱 [Lambda QR] Processando requisição QR Code...');

  try {
    const whatsappService = getWhatsAppService();
    const qrData = await whatsappService.getQRCode();

    if (qrData.error) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: qrData.error
        })
      };
    }

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
        qrCode: qrData.qrImage,
        qr: qrData.qr
      })
    };

    console.log('✅ [Lambda QR] QR Code retornado com sucesso');
    return response;

  } catch (error) {
    console.error('❌ [Lambda QR] Erro:', error);
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