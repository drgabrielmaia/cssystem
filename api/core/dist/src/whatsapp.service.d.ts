export interface WhatsAppMessage {
    id: string;
    from: string;
    to: string;
    body: string;
    type: string;
    timestamp: number;
    isFromMe: boolean;
    contact: {
        id: string;
        name: string;
        pushname: string;
        number: string;
    };
}
export interface WhatsAppContact {
    id: string;
    name: string;
    pushname: string;
    number: string;
    isMyContact: boolean;
}
export interface WhatsAppStatus {
    isReady: boolean;
    isConnecting: boolean;
    hasQR: boolean;
    contactsCount: number;
    messagesCount: number;
}
export interface QRCodeData {
    qr: string;
    qrImage: string;
}
declare class WhatsAppService {
    private client;
    private qrString;
    private isReady;
    private isConnecting;
    private messages;
    private contacts;
    constructor();
    private initializeClient;
    private setupEventHandlers;
    private initialize;
    getStatus(): WhatsAppStatus;
    getQRCode(): Promise<QRCodeData | {
        error: string;
    }>;
    sendMessage(to: string, message: string): Promise<any>;
    getMessages(limit?: number): WhatsAppMessage[];
    getContacts(): WhatsAppContact[];
    getChatMessages(chatId: string, limit?: number): WhatsAppMessage[];
}
export declare const getWhatsAppService: () => WhatsAppService;
export {};
//# sourceMappingURL=whatsapp.service.d.ts.map