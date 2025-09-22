"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWhatsAppService = void 0;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const QRCode = __importStar(require("qrcode"));
class WhatsAppService {
    constructor() {
        this.client = null;
        this.qrString = null;
        this.isReady = false;
        this.isConnecting = false;
        this.messages = [];
        this.contacts = [];
        this.initializeClient();
    }
    initializeClient() {
        console.log('🚀 Inicializando WhatsApp Web...');
        this.client = new whatsapp_web_js_1.Client({
            authStrategy: new whatsapp_web_js_1.LocalAuth({
                clientId: 'customer-success-session'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ],
                ignoreDefaultArgs: ['--disable-extensions'],
                timeout: 60000
            }
        });
        this.setupEventHandlers();
        this.initialize();
    }
    setupEventHandlers() {
        if (!this.client)
            return;
        // QR Code generation
        this.client.on('qr', async (qr) => {
            console.log('📱 QR Code recebido');
            this.qrString = qr;
            this.isConnecting = true;
        });
        // Ready event
        this.client.on('ready', () => {
            console.log('✅ WhatsApp Client pronto!');
            this.isReady = true;
            this.isConnecting = false;
        });
        // Message event
        this.client.on('message', (message) => {
            console.log('📨 Nova mensagem recebida:', message.body);
            const whatsappMessage = {
                id: message.id._serialized,
                from: message.from,
                to: message.to,
                body: message.body,
                type: message.type,
                timestamp: message.timestamp,
                isFromMe: message.fromMe,
                contact: {
                    id: message.author || message.from,
                    name: '',
                    pushname: '',
                    number: message.from
                }
            };
            this.messages.unshift(whatsappMessage);
            if (this.messages.length > 1000) {
                this.messages = this.messages.slice(0, 1000);
            }
        });
        // Authenticated event
        this.client.on('authenticated', () => {
            console.log('🔐 Cliente autenticado');
        });
        // Disconnected event
        this.client.on('disconnected', (reason) => {
            console.log('❌ Cliente desconectado:', reason);
            this.isReady = false;
            this.isConnecting = false;
        });
    }
    async initialize() {
        if (!this.client)
            return;
        try {
            console.log('🔄 Inicializando cliente WhatsApp...');
            await this.client.initialize();
        }
        catch (error) {
            console.error('❌ Erro ao inicializar cliente:', error);
        }
    }
    getStatus() {
        return {
            isReady: this.isReady,
            isConnecting: this.isConnecting,
            hasQR: !!this.qrString && !this.isReady,
            contactsCount: this.contacts.length,
            messagesCount: this.messages.length
        };
    }
    async getQRCode() {
        if (!this.qrString) {
            return { error: 'QR Code não disponível' };
        }
        try {
            const qrImage = await QRCode.toDataURL(this.qrString);
            return {
                qr: this.qrString,
                qrImage: qrImage
            };
        }
        catch (error) {
            console.error('❌ Erro ao gerar QR Code:', error);
            return { error: 'Erro ao gerar QR Code' };
        }
    }
    async sendMessage(to, message) {
        if (!this.client || !this.isReady) {
            throw new Error('Cliente WhatsApp não está pronto');
        }
        try {
            const result = await this.client.sendMessage(to, message);
            console.log('✅ Mensagem enviada:', result.id._serialized);
            return result;
        }
        catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
            throw error;
        }
    }
    getMessages(limit = 20) {
        return this.messages.slice(0, limit);
    }
    getContacts() {
        return this.contacts;
    }
    getChatMessages(chatId, limit = 20) {
        return this.messages
            .filter(msg => msg.from === chatId || msg.to === chatId)
            .slice(0, limit);
    }
}
// Global instance
let whatsappService = null;
const getWhatsAppService = () => {
    if (!whatsappService) {
        whatsappService = new WhatsAppService();
    }
    return whatsappService;
};
exports.getWhatsAppService = getWhatsAppService;
//# sourceMappingURL=whatsapp.service.js.map