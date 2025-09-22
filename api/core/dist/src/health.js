"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lambda_api_1 = __importDefault(require("lambda-api"));
const api = (0, lambda_api_1.default)();
api.get('/', async (req, res) => {
    console.log('🏥 [Health] Health check...');
    return res.status(200).json({
        success: true,
        message: 'WhatsApp API Health Check - Bohr Functions',
        timestamp: new Date().toISOString()
    });
});
module.exports = api;
//# sourceMappingURL=health.js.map