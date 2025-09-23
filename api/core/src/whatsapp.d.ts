export interface WhatsAppService {
  getStatus(): any;
  getQRCode(): Promise<any>;
  sendMessage(to: string, message: string): Promise<any>;
  getContacts(): any[];
  getMessages(limit?: number): any[];
  getChatMessages(chatId: string, limit?: number): any[];
}

export function getWhatsAppService(): WhatsAppService;