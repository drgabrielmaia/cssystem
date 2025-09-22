exports.handler = async (event) => {
  console.log('🏠 [Lambda Index] Rota raiz da API...');

  try {
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
        message: 'WhatsApp API - Lambda Functions',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          test: '/api/test',
          status: '/api/status',
          qr: '/api/qr',
          send: '/api/send'
        },
        timestamp: new Date().toISOString()
      })
    };

    console.log('✅ [Lambda Index] Rota raiz OK');
    return response;

  } catch (error) {
    console.error('❌ [Lambda Index] Erro:', error);
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