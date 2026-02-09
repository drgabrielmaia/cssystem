// Use the shared supabase instance with timeout configured
import { supabase } from './supabase';

export interface StoredMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  is_from_me: boolean;
  contact_name?: string;
  contact_number: string;
  message_id?: string;
  created_at?: string;
}

export class WhatsAppStorage {

  // Salvar mensagem no banco
  async saveMessage(message: StoredMessage): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          id: message.id,
          from_number: message.from,
          to_number: message.to,
          message_body: message.body,
          timestamp: message.timestamp,
          is_from_me: message.is_from_me,
          contact_name: message.contact_name,
          contact_number: message.contact_number,
          message_id: message.message_id
        });

      if (error) {
        console.error('❌ Erro ao salvar mensagem:', error);
        return false;
      }

      console.log('✅ Mensagem salva no banco:', message.id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
      return false;
    }
  }

  // Buscar mensagens de um chat específico
  async getChatMessages(phoneNumber: string, limit: number = 50): Promise<StoredMessage[]> {
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .or(`from_number.eq.${cleanPhone},to_number.eq.${cleanPhone},contact_number.eq.${cleanPhone}`)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erro ao buscar mensagens:', error);
        return [];
      }

      return data?.map(row => ({
        id: row.id,
        from: row.from_number,
        to: row.to_number,
        body: row.message_body,
        timestamp: row.timestamp,
        is_from_me: row.is_from_me,
        contact_name: row.contact_name,
        contact_number: row.contact_number,
        message_id: row.message_id
      })) || [];

    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      return [];
    }
  }

  // Buscar mensagens recentes de todos os chats
  async getRecentMessages(limit: number = 100): Promise<StoredMessage[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erro ao buscar mensagens recentes:', error);
        return [];
      }

      return data?.map(row => ({
        id: row.id,
        from: row.from_number,
        to: row.to_number,
        body: row.message_body,
        timestamp: row.timestamp,
        is_from_me: row.is_from_me,
        contact_name: row.contact_name,
        contact_number: row.contact_number,
        message_id: row.message_id
      })) || [];

    } catch (error) {
      console.error('❌ Erro ao buscar mensagens recentes:', error);
      return [];
    }
  }

  // Criar tabela se não existir
  async initializeTable(): Promise<void> {
    try {
      // Verificar se a tabela existe
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'whatsapp_messages');

      // Se não existir, será criada via SQL no Supabase Dashboard
      console.log('📋 Tabela whatsapp_messages verificada');

    } catch (error) {
      console.log('⚠️ Erro ao verificar tabela:', error);
    }
  }
}

export const whatsappStorage = new WhatsAppStorage();