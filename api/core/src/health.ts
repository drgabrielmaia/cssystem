import createAPI from 'lambda-api';

const api = createAPI();

api.get('/', async (req, res) => {
  console.log('🏥 [Health] Health check...');
  return res.status(200).json({
    success: true,
    message: 'WhatsApp API Health Check - Bohr Functions',
    timestamp: new Date().toISOString()
  });
});

module.exports = api;