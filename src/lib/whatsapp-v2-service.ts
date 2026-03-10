// WhatsApp V2 Service - Multi-Instance, Identity Resolution, Enriched Contacts
import { getToken } from './api';

const BASE_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br';

async function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiGet<T>(path: string): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers: await authHeaders() });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function apiPost<T>(path: string, body?: any): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: await authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function apiPut<T>(path: string, body?: any): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function apiPatch<T>(path: string, body?: any): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Types ──────────────────────────────────────────────────
export interface WAInstance {
  id: string;
  organization_id: string;
  name: string;
  phone_number: string | null;
  department: string | null;
  description: string | null;
  status: string;
  config: Record<string, any>;
  live_status: string;
  has_qr: boolean;
  open_chats: number;
  created_at: string;
}

export interface WAContact {
  id: string;
  display_name: string;
  phone_number: string | null;
  identity_status: string;
  tags: string[];
  pipeline_stage: string | null;
  lead_id: string | null;
  mentorado_id: string | null;
  custom_fields: Record<string, any>;
  // Enriched fields
  lead_nome?: string;
  lead_status?: string;
  lead_temperatura?: string;
  lead_valor_vendido?: number;
  lead_valor_arrecadado?: number;
  mentorado_nome?: string;
  mentorado_status?: string;
  mentorado_turma?: string;
  valor_pendente?: number;
  dividas_atrasadas?: number;
  created_at: string;
}

export interface WAChat {
  id: string;
  contact_id: string;
  instance_id: string;
  is_group: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  status: string;
  assigned_to: string | null;
  priority: string;
  pipeline_stage: string | null;
  financial_status: string | null;
  valor_pendente: number;
  // Enriched
  contact_name: string;
  contact_phone: string;
  contact_tags: string[];
  contact_stage: string | null;
  lead_id: string | null;
  mentorado_id: string | null;
  avatar_url: string | null;
  lead_nome: string | null;
  lead_status: string | null;
  lead_temp: string | null;
  valor_vendido: number | null;
  valor_arrecadado: number | null;
  mentorado_nome: string | null;
  mentorado_status: string | null;
  instance_name: string;
  instance_dept: string | null;
  total_pendente: number;
  dividas_atrasadas: number;
}

export interface WAMessage {
  id: string;
  chat_id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  content_type: string;
  body: string | null;
  media_url: string | null;
  status: string;
  created_at: string;
  wa_timestamp: string;
  metadata: Record<string, any>;
}

export interface WAAutomation {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  scope: string;
  instance_ids: string[];
  conflict_mode: string;
  version: number;
  triggers: any[];
  conditions: any[];
  actions: any[];
  executions_24h: number;
  failures_24h: number;
  created_at: string;
}

export interface WAContactEnriched {
  contact: {
    id: string;
    display_name: string;
    phone_number: string;
    identity_status: string;
    tags: string[];
    pipeline_stage: string;
    custom_fields: Record<string, any>;
    created_at: string;
  };
  lead: {
    id: string;
    nome: string;
    email: string;
    status: string;
    temperatura: string;
    lead_score: number;
    valor_vendido: number;
    valor_arrecadado: number;
    origem: string;
    data_venda: string;
    observacoes: string;
    created_at: string;
  } | null;
  mentorado: {
    id: string;
    nome: string;
    email: string;
    status: string;
    turma: string;
    data_entrada: string;
    created_at: string;
  } | null;
  financeiro: {
    total_dividas: number;
    total_pago: number;
    total_pendente: number;
    total_atrasado: number;
    dividas_pendentes: number;
    ultima_cobranca: string;
  };
  identifiers: { jid: string; jid_type: string; is_primary: boolean }[];
}

export interface WANote {
  id: string;
  contact_id: string;
  content: string;
  note_type: string;
  priority: string;
  created_at: string;
}

export interface WAHistory {
  id: string;
  contact_id: string;
  action: string;
  description: string;
  actor_type: string;
  created_at: string;
}

export interface WADivida {
  id: string;
  mentorado_id: string;
  valor: number;
  valor_pago: number;
  valor_restante: number;
  data_vencimento: string;
  status: string;
  observacoes: string;
}

export interface WAPipelineStage {
  id: string;
  pipeline_name: string;
  name: string;
  order_index: number;
  color: string;
  is_final: boolean;
}

export interface WAStats {
  instances: number;
  chats: { total: number; open: number; waiting: number };
  contacts: { total: number; with_lead: number; with_mentorado: number };
  automations: { total: number; active: number };
  pending_identity: number;
}

// ─── Service ────────────────────────────────────────────────
export const waV2 = {
  // Instances
  getInstances: () => apiGet<WAInstance[]>('/api/wa/instances'),
  createInstance: (data: { name: string; department?: string; description?: string }) =>
    apiPost<WAInstance>('/api/wa/instances', data),
  connectInstance: (instanceId: string) =>
    apiPost('/api/wa/instances/' + instanceId + '/connect'),
  disconnectInstance: (instanceId: string) =>
    apiPost('/api/wa/instances/' + instanceId + '/disconnect'),

  // Contacts
  getContacts: (params?: { search?: string; has_lead?: boolean; has_mentorado?: boolean; tag?: string; stage?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.has_lead) qs.set('has_lead', 'true');
    if (params?.has_mentorado) qs.set('has_mentorado', 'true');
    if (params?.tag) qs.set('tag', params.tag);
    if (params?.stage) qs.set('stage', params.stage);
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiGet<WAContact[]>('/api/wa/contacts?' + qs.toString());
  },
  getContactEnriched: (contactId: string) =>
    apiGet<{ data: WAContactEnriched; notes: WANote[]; history: WAHistory[]; dividas: WADivida[] }>('/api/wa/contacts/' + contactId + '/enriched'),
  addNote: (contactId: string, content: string, note_type?: string, priority?: string) =>
    apiPost<WANote>('/api/wa/contacts/' + contactId + '/notes', { content, note_type, priority }),
  updateTags: (contactId: string, tag: string, action: 'add' | 'remove') =>
    apiPost('/api/wa/contacts/' + contactId + '/tags', { tag, action }),
  updateStage: (contactId: string, stage: string) =>
    apiPut('/api/wa/contacts/' + contactId + '/stage', { stage }),
  linkContact: (contactId: string, data: { lead_id?: string; mentorado_id?: string }) =>
    apiPost('/api/wa/contacts/' + contactId + '/link', data),

  // Identity
  resolveIdentity: (jid: string, display_name?: string, instance_id?: string) =>
    apiPost('/api/wa/resolve-identity', { jid, display_name, instance_id }),
  mergeContacts: (keep_contact_id: string, merge_contact_id: string, reason?: string) =>
    apiPost('/api/wa/merge-contacts', { keep_contact_id, merge_contact_id, reason }),
  getPendingIdentities: () => apiGet('/api/wa/pending-identities'),

  // Chats
  getChats: (params?: { instance_id?: string; status?: string; search?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.instance_id) qs.set('instance_id', params.instance_id);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiGet<WAChat[]>('/api/wa/chats?' + qs.toString());
  },
  getChatMessages: (chatId: string, limit?: number) =>
    apiGet<WAMessage[]>('/api/wa/chats/' + chatId + '/messages?limit=' + (limit || 50)),

  // Automations
  getAutomations: () => apiGet<WAAutomation[]>('/api/wa/automations'),
  createAutomation: (data: any) => apiPost<WAAutomation>('/api/wa/automations', data),
  updateAutomation: (autoId: string, data: any) => apiPut('/api/wa/automations/' + autoId, data),
  toggleAutomation: (autoId: string) => apiPatch('/api/wa/automations/' + autoId + '/toggle'),
  duplicateAutomation: (autoId: string) => apiPost('/api/wa/automations/' + autoId + '/duplicate'),
  getAutomationExecutions: (autoId: string) =>
    apiGet('/api/wa/automations/' + autoId + '/executions'),

  // Pipeline
  getPipelineStages: () => apiGet<WAPipelineStage[]>('/api/wa/pipeline-stages'),

  // Templates
  getTemplates: () => apiGet('/api/wa/templates'),
  createTemplate: (data: { name: string; category?: string; body: string; variables?: string[] }) =>
    apiPost('/api/wa/templates', data),

  // Stats
  getStats: () => apiGet<WAStats>('/api/wa/stats'),
};
