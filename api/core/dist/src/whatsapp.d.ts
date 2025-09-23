interface WhatsAppMessage {
    id: string;
    from: string;
    to: string;
    body: string;
    type: string;
    timestamp: number;
    isFromMe: boolean;
    contact: any;
}
interface WhatsAppContact {
    id: string;
    name: string;
    pushname: string;
    number: string;
}
declare class WhatsAppService {
    private client;
    private qrString;
    private isReady;
    private isConnecting;
    private messages;
    private contacts;
    constructor();
    initializeClient(): void;
    setupEventHandlers(): void;
    initialize(): Promise<void>;
    loadContacts(): Promise<void>;
    formatMessage(message: any): Promise<{
        id: any;
        from: any;
        to: any;
        body: any;
        type: any;
        timestamp: number;
        isFromMe: any;
        contact: any;
    }>;
    getQRCode(): Promise<{
        error: string;
        qr?: undefined;
        qrImage?: undefined;
    } | {
        qr: string;
        qrImage: any;
        error?: undefined;
    }>;
    getStatus(): {
        isReady: boolean;
        isConnecting: boolean;
        hasQR: boolean;
        contactsCount: number;
        messagesCount: number;
    };
    getContacts(): WhatsAppContact[];
    getMessages(limit?: number): WhatsAppMessage[];
    getChatMessages(chatId: string, limit?: number): WhatsAppMessage[];
    sendMessage(to: string, message: string): Promise<{
        success: boolean;
        messageId: any;
        timestamp: any;
        to: string;
        message: string;
    }>;
    notifyLiveUpdate(type: string, data: any): Promise<void>;
}
export declare const getWhatsAppService: () => WhatsAppService;
export {};
//# sourceMappingURL=whatsapp.d.ts.map