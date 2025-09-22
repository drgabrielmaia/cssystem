exports.handler = async (event) => {
  console.log('🧪 [Lambda Test] Teste simples...');

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
        message: 'Lambda handler funcionando!',
        timestamp: new Date().toISOString(),
        event: event
      })
    };

    console.log('✅ [Lambda Test] Teste OK');
    return response;

  } catch (error) {
    console.error('❌ [Lambda Test] Erro:', error);
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