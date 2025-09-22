exports.handler = async (event) => {
  console.log('🏥 [Lambda Health] Health check...');

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
        message: 'WhatsApp API Health Check - Lambda',
        timestamp: new Date().toISOString()
      })
    };

    console.log('✅ [Lambda Health] Health check OK');
    return response;

  } catch (error) {
    console.error('❌ [Lambda Health] Erro:', error);
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