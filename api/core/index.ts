import { APIGatewayEvent, Context } from 'aws-lambda';
import createAPI from 'lambda-api';

const api = createAPI();

// Register WhatsApp routes
api.register(require("./src/health"), { prefix: "/health" });
api.register(require("./src/status"), { prefix: "/status" });
api.register(require("./src/qr"), { prefix: "/qr" });
api.register(require("./src/send"), { prefix: "/send" });
api.register(require("./src/contacts"), { prefix: "/contacts" });
api.register(require("./src/messages"), { prefix: "/messages" });

// Root endpoint
api.get('/', async (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'WhatsApp API - Bohr Functions',
        version: '2.0.0',
        endpoints: {
            health: '/api/health',
            status: '/api/status',
            qr: '/api/qr',
            send: '/api/send',
            contacts: '/api/contacts',
            messages: '/api/messages'
        },
        timestamp: new Date().toISOString()
    });
});

// Global CORS middleware
api.use((req, res, next) => {
    res.cors({
        origin: 'https://cs.medicosderesultado.com.br',
        credentials: true
    });
    next();
});

export async function handler(event: APIGatewayEvent, context: Context) {
    return await api.run(event, context);
}