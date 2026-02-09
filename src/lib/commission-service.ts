// ======================================================
// SERVIÇO DE COMISSÕES - FUNÇÕES DE INTERAÇÃO COM O BANCO
// ======================================================

import { supabase } from './supabase';
import type {
  Referral,
  ReferralPayment,
  Commission,
  CommissionHistory,
  CommissionSettings,
  WithdrawalRequest,
  CommissionSummary,
  ReferralDetails,
  PendingCommission,
  CommissionStats,
  CommissionFilters,
  ReferralFilters,
  CreateReferralData,
  UpdateReferralData,
  CreatePaymentData,
  CreateWithdrawalData,
  ApproveWithdrawalData,
  RejectWithdrawalData,
  ProcessPaymentData,
  ReferralStatus,
  CommissionStatus,
  WithdrawalStatus
} from '@/types/commission';

// ======================================================
// REFERRAL MANAGEMENT
// ======================================================

export const referralService = {
  // List all referrals for a mentee
  async getByMentorado(mentoradoId: string): Promise<Referral[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        lead:leads(id, nome, email, telefone),
        mentorado:mentorados(id, nome_completo, email)
      `)
      .eq('mentorado_id', mentoradoId)
      .order('referral_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all referrals for an organization
  async getByOrganization(organizationId: string, filters?: ReferralFilters): Promise<Referral[]> {
    let query = supabase
      .from('referrals')
      .select(`
        *,
        lead:leads(id, nome, email, telefone),
        mentorado:mentorados(id, nome_completo, email)
      `)
      .eq('organization_id', organizationId);

    // Apply filters
    if (filters) {
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters.source?.length) {
        query = query.in('referral_source', filters.source);
      }
      if (filters.dateFrom) {
        query = query.gte('referral_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('referral_date', filters.dateTo);
      }
      if (filters.mentoradoId) {
        query = query.eq('mentorado_id', filters.mentoradoId);
      }
      if (filters.searchTerm) {
        query = query.or(`referral_code.ilike.%${filters.searchTerm}%,referral_notes.ilike.%${filters.searchTerm}%`);
      }
    }

    const { data, error } = await query.order('referral_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get single referral details
  async getById(referralId: string): Promise<Referral | null> {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        lead:leads(id, nome, email, telefone),
        mentorado:mentorados(id, nome_completo, email)
      `)
      .eq('id', referralId)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new referral
  async create(data: CreateReferralData): Promise<Referral> {
    const { data: result, error } = await supabase
      .rpc('create_referral', {
        p_mentorado_id: data.mentorado_id,
        p_lead_id: data.lead_id,
        p_organization_id: (await supabase.auth.getUser()).data.user?.user_metadata.organization_id,
        p_source: data.referral_source,
        p_notes: data.referral_notes
      });

    if (error) throw error;
    
    // Fetch the created referral
    const referral = await this.getById(result);
    if (!referral) throw new Error('Failed to create referral');
    
    return referral;
  },

  // Update referral
  async update(referralId: string, data: UpdateReferralData): Promise<Referral> {
    const { data: result, error } = await supabase
      .from('referrals')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', referralId)
      .select(`
        *,
        lead:leads(id, nome, email, telefone),
        mentorado:mentorados(id, nome_completo, email)
      `)
      .single();

    if (error) throw error;
    return result;
  },

  // Convert referral (mark as converted with contract value)
  async convert(referralId: string, contractValue: number, paymentPlan?: string): Promise<Referral> {
    return this.update(referralId, {
      status: 'converted' as ReferralStatus,
      contract_value: contractValue,
      payment_plan: paymentPlan
    });
  }
};

// ======================================================
// PAYMENT MANAGEMENT
// ======================================================

export const paymentService = {
  // Get payments for a referral
  async getByReferral(referralId: string): Promise<ReferralPayment[]> {
    const { data, error } = await supabase
      .from('referral_payments')
      .select('*')
      .eq('referral_id', referralId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create payment record
  async create(data: CreatePaymentData): Promise<ReferralPayment> {
    const { data: result, error } = await supabase
      .from('referral_payments')
      .insert({
        ...data,
        organization_id: (await supabase.auth.getUser()).data.user?.user_metadata.organization_id,
        status: 'pending' as const
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  // Confirm payment
  async confirm(paymentId: string): Promise<ReferralPayment> {
    const user = (await supabase.auth.getUser()).data.user;
    
    const { data, error } = await supabase
      .from('referral_payments')
      .update({
        status: 'confirmed' as const,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user?.id
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Cancel payment
  async cancel(paymentId: string, notes?: string): Promise<ReferralPayment> {
    const { data, error } = await supabase
      .from('referral_payments')
      .update({
        status: 'cancelled' as const,
        notes: notes
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// ======================================================
// COMMISSION MANAGEMENT
// ======================================================

export const commissionService = {
  // Get commissions for a mentee
  async getByMentorado(mentoradoId: string, filters?: CommissionFilters): Promise<Commission[]> {
    let query = supabase
      .from('commissions')
      .select(`
        *,
        referral:referrals(
          *,
          lead:leads(id, nome, email, telefone)
        ),
        payment:referral_payments(*)
      `)
      .eq('mentorado_id', mentoradoId);

    // Apply filters
    if (filters) {
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters.milestone?.length) {
        query = query.in('milestone', filters.milestone);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.minAmount) {
        query = query.gte('commission_amount', filters.minAmount);
      }
      if (filters.maxAmount) {
        query = query.lte('commission_amount', filters.maxAmount);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all commissions for organization
  async getByOrganization(organizationId: string, filters?: CommissionFilters): Promise<Commission[]> {
    let query = supabase
      .from('commissions')
      .select(`
        *,
        mentorado:mentorados(id, nome_completo, email),
        referral:referrals(
          *,
          lead:leads(id, nome, email, telefone)
        ),
        payment:referral_payments(*)
      `)
      .eq('organization_id', organizationId);

    // Apply filters
    if (filters) {
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters.mentoradoId) {
        query = query.eq('mentorado_id', filters.mentoradoId);
      }
      if (filters.referralId) {
        query = query.eq('referral_id', filters.referralId);
      }
      // Add other filters as needed
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get eligible commissions for withdrawal
  async getEligibleForWithdrawal(mentoradoId: string): Promise<Commission[]> {
    const { data, error } = await supabase
      .from('commissions')
      .select(`
        *,
        referral:referrals(
          *,
          lead:leads(id, nome, email, telefone)
        )
      `)
      .eq('mentorado_id', mentoradoId)
      .eq('status', 'eligible')
      .order('eligible_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get commission history
  async getHistory(commissionId: string): Promise<CommissionHistory[]> {
    const { data, error } = await supabase
      .from('commission_history')
      .select('*')
      .eq('commission_id', commissionId)
      .order('performed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Update commission status
  async updateStatus(commissionId: string, status: CommissionStatus, notes?: string): Promise<Commission> {
    const user = (await supabase.auth.getUser()).data.user;
    
    const { data: commission, error: fetchError } = await supabase
      .from('commissions')
      .select('status')
      .eq('id', commissionId)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('commissions')
      .update({
        status,
        notes,
        [`${status}_date`]: new Date().toISOString(),
        [`${status}_by`]: user?.id
      })
      .eq('id', commissionId)
      .select()
      .single();

    if (error) throw error;

    // Record in history
    await supabase
      .from('commission_history')
      .insert({
        commission_id: commissionId,
        action: `STATUS_CHANGED_TO_${status.toUpperCase()}`,
        old_status: commission.status,
        new_status: status,
        performed_by: user?.id,
        notes
      });

    return data;
  }
};

// ======================================================
// WITHDRAWAL MANAGEMENT
// ======================================================

export const withdrawalService = {
  // Get withdrawals for a mentee
  async getByMentorado(mentoradoId: string): Promise<WithdrawalRequest[]> {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        commissions:commissions(*)
      `)
      .eq('mentorado_id', mentoradoId)
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all withdrawals for organization
  async getByOrganization(organizationId: string, status?: WithdrawalStatus[]): Promise<WithdrawalRequest[]> {
    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        mentorado:mentorados(id, nome_completo, email),
        commissions:commissions(*)
      `)
      .eq('organization_id', organizationId);

    if (status?.length) {
      query = query.in('status', status);
    }

    const { data, error } = await query.order('requested_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create withdrawal request
  async create(mentoradoId: string, data?: CreateWithdrawalData): Promise<WithdrawalRequest> {
    const organizationId = (await supabase.auth.getUser()).data.user?.user_metadata.organization_id;
    
    // Process withdrawal using the database function
    const { data: result, error } = await supabase
      .rpc('process_withdrawal_request', {
        p_mentorado_id: mentoradoId,
        p_organization_id: organizationId
      });

    if (error) throw error;

    // Update with payment data if provided
    if (data?.payment_data && result) {
      const { data: updated, error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({ payment_data: data.payment_data })
        .eq('id', result)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated;
    }

    // Fetch the created request
    const { data: request, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        commissions:commissions(*)
      `)
      .eq('id', result)
      .single();

    if (fetchError) throw fetchError;
    return request;
  },

  // Approve withdrawal (admin)
  async approve(data: ApproveWithdrawalData): Promise<WithdrawalRequest> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data: result, error } = await supabase
      .rpc('approve_commission_payment', {
        p_request_id: data.withdrawal_id,
        p_approved_by: user?.id
      });

    if (error) throw error;

    // Add admin notes if provided
    if (data.admin_notes) {
      await supabase
        .from('withdrawal_requests')
        .update({ admin_notes: data.admin_notes })
        .eq('id', data.withdrawal_id);
    }

    // Fetch updated request
    const { data: request, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        mentorado:mentorados(id, nome_completo, email),
        commissions:commissions(*)
      `)
      .eq('id', data.withdrawal_id)
      .single();

    if (fetchError) throw fetchError;
    return request;
  },

  // Reject withdrawal (admin)
  async reject(data: RejectWithdrawalData): Promise<WithdrawalRequest> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data: result, error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected' as const,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
        rejection_reason: data.rejection_reason,
        admin_notes: data.admin_notes
      })
      .eq('id', data.withdrawal_id)
      .select(`
        *,
        mentorado:mentorados(id, nome_completo, email),
        commissions:commissions(*)
      `)
      .single();

    if (error) throw error;

    // Update commission status back to eligible
    const commissionIds = result.commission_ids;
    if (commissionIds?.length) {
      await supabase
        .from('commissions')
        .update({ status: 'eligible' as const })
        .in('id', commissionIds);
    }

    return result;
  },

  // Process payment (admin)
  async processPayment(data: ProcessPaymentData): Promise<WithdrawalRequest> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data: result, error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        payment_proof_url: data.payment_proof_url,
        admin_notes: data.admin_notes
      })
      .eq('id', data.withdrawal_id)
      .select(`
        *,
        mentorado:mentorados(id, nome_completo, email),
        commissions:commissions(*)
      `)
      .single();

    if (error) throw error;

    // Update commissions to paid
    const commissionIds = result.commission_ids;
    if (commissionIds?.length) {
      await supabase
        .from('commissions')
        .update({
          status: 'paid' as const,
          paid_date: new Date().toISOString(),
          paid_by: user?.id,
          payment_method: data.payment_method,
          payment_reference: data.payment_reference
        })
        .in('id', commissionIds);
    }

    return result;
  },

  // Cancel withdrawal (mentee)
  async cancel(withdrawalId: string): Promise<WithdrawalRequest> {
    const { data: result, error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'cancelled' as const
      })
      .eq('id', withdrawalId)
      .select(`
        *,
        commissions:commissions(*)
      `)
      .single();

    if (error) throw error;

    // Update commission status back to eligible
    const commissionIds = result.commission_ids;
    if (commissionIds?.length) {
      await supabase
        .from('commissions')
        .update({ status: 'eligible' as const })
        .in('id', commissionIds);
    }

    return result;
  }
};

// ======================================================
// DASHBOARD & REPORTS
// ======================================================

export const commissionDashboardService = {
  // Get commission summary for mentee
  async getMentoradoSummary(mentoradoId: string): Promise<CommissionSummary | null> {
    const { data, error } = await supabase
      .from('commission_summary')
      .select('*')
      .eq('mentorado_id', mentoradoId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    return data;
  },

  // Get all commission summaries for organization
  async getOrganizationSummary(organizationId: string): Promise<CommissionSummary[]> {
    const { data, error } = await supabase
      .from('commission_summary')
      .select('*')
      .eq('organization_id', organizationId)
      .order('total_commission_amount', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get referral details with payment status
  async getReferralDetails(mentoradoId?: string, organizationId?: string): Promise<ReferralDetails[]> {
    let query = supabase
      .from('referral_details')
      .select('*');

    if (mentoradoId) {
      query = query.eq('mentorado_id', mentoradoId);
    }
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.order('referral_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get pending commissions
  async getPendingCommissions(organizationId: string): Promise<PendingCommission[]> {
    const { data, error } = await supabase
      .from('pending_commissions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('eligible_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get statistics for mentee
  async getMentoradoStats(mentoradoId: string): Promise<CommissionStats> {
    const summary = await this.getMentoradoSummary(mentoradoId);
    const referrals = await referralService.getByMentorado(mentoradoId);
    const commissions = await commissionService.getByMentorado(mentoradoId);

    const activeReferrals = referrals.filter(r => 
      ['pending', 'contacted', 'qualified', 'negotiating'].includes(r.status)
    ).length;

    const convertedReferrals = referrals.filter(r => r.status === 'converted').length;
    const conversionRate = referrals.length > 0 
      ? (convertedReferrals / referrals.length) * 100 
      : 0;

    const lastPayment = commissions
      .filter(c => c.status === 'paid')
      .sort((a, b) => new Date(b.paid_date || 0).getTime() - new Date(a.paid_date || 0).getTime())[0];

    return {
      totalReferrals: referrals.length,
      activeReferrals,
      convertedReferrals,
      conversionRate,
      totalEarned: summary?.total_commission_amount || 0,
      pendingAmount: summary?.pending_amount || 0,
      availableForWithdrawal: summary?.eligible_amount || 0,
      paidAmount: summary?.paid_amount || 0,
      averageCommission: convertedReferrals > 0 
        ? (summary?.total_commission_amount || 0) / convertedReferrals 
        : 0,
      lastPaymentDate: lastPayment?.paid_date,
      nextPaymentDate: undefined // Calculate based on settings
    };
  },

  // Get monthly commission report
  async getMonthlyReport(organizationId: string, year: number, month: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from('commissions')
      .select(`
        *,
        mentorado:mentorados(id, nome_completo, email),
        referral:referrals(
          *,
          lead:leads(nome)
        )
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Process data for report
    const totalCommissions = data?.length || 0;
    const totalAmount = data?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;
    const paidAmount = data?.filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commission_amount, 0) || 0;
    const pendingAmount = data?.filter(c => c.status !== 'paid' && c.status !== 'cancelled')
      .reduce((sum, c) => sum + c.commission_amount, 0) || 0;

    return {
      period: { year, month },
      totalCommissions,
      totalAmount,
      paidAmount,
      pendingAmount,
      commissions: data || []
    };
  }
};

// ======================================================
// SETTINGS MANAGEMENT
// ======================================================

export const commissionSettingsService = {
  // Get organization settings
  async getByOrganization(organizationId: string): Promise<CommissionSettings | null> {
    const { data, error } = await supabase
      .from('commission_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    return data;
  },

  // Create or update settings
  async upsert(organizationId: string, settings: Partial<CommissionSettings>): Promise<CommissionSettings> {
    const { data, error } = await supabase
      .from('commission_settings')
      .upsert({
        ...settings,
        organization_id: organizationId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Export all services as a single object for convenience
export const commissionSystem = {
  referrals: referralService,
  payments: paymentService,
  commissions: commissionService,
  withdrawals: withdrawalService,
  dashboard: commissionDashboardService,
  settings: commissionSettingsService
};