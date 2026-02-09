# Commission Tracking System - Complete Implementation Guide

## Overview
This is a comprehensive commission tracking system for mentees (indicadores) that handles referrals, payment tracking, commission calculations, and withdrawal management.

## System Architecture

### Core Components
1. **Referral Management** - Track mentee referrals to leads
2. **Payment Tracking** - Monitor client payment milestones  
3. **Commission Calculation** - Automatic commission based on payments
4. **Withdrawal System** - Request and process commission payouts
5. **Admin Dashboard** - Complete oversight and management
6. **Mentee Portal** - View earnings and request withdrawals

## Database Structure

### Main Tables
- `referrals` - Links mentees to referred leads
- `referral_payments` - Tracks client payments
- `commissions` - Calculated commissions per payment
- `commission_history` - Audit trail of all changes
- `commission_settings` - Organization-specific rules
- `withdrawal_requests` - Payout requests from mentees

### Key Views
- `commission_summary` - Overview per mentee
- `referral_details` - Referral status with payments
- `pending_commissions` - Commissions awaiting action

## Business Rules Implementation

### Commission Structure
- **50% commission** when client pays first 50% 
- **50% commission** when client pays remaining 50%
- **Immediate eligibility** for 100% upfront payments

### Commission Lifecycle
1. **Pending** - Awaiting client payment
2. **Eligible** - Client paid, available for withdrawal
3. **Requested** - Mentee requested withdrawal
4. **Approved** - Admin approved for payment
5. **Processing** - Payment in progress
6. **Paid** - Commission paid to mentee

## Installation Steps

### 1. Database Setup
Execute the migration script in Supabase SQL Editor:

```sql
-- Run the complete migration
\i /path/to/commission_system_migration.sql
```

Or execute directly:
```bash
# Using Supabase CLI
supabase db push sql/commission_system_migration.sql
```

### 2. Verify Installation
Check that all components were created:

```sql
-- Verify tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%commission%' OR table_name LIKE '%referral%';

-- Verify views
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('commission_summary', 'referral_details', 'pending_commissions');

-- Check sample data
SELECT * FROM commission_summary;
```

### 3. Configure Organization Settings
Set up commission rules for your organization:

```typescript
import { commissionSettingsService } from '@/lib/commission-service';

await commissionSettingsService.upsert(organizationId, {
  default_commission_percentage: 50,
  first_milestone_percentage: 50,
  second_milestone_percentage: 50,
  minimum_payment_percentage: 50,
  auto_approve_threshold: 1000,
  payment_day_of_month: 10,
  minimum_withdrawal_amount: 100,
  notify_on_eligible: true,
  notify_on_payment: true
});
```

## Frontend Integration

### Import Types and Services

```typescript
import { 
  Referral,
  Commission,
  WithdrawalRequest,
  CommissionStats 
} from '@/types/commission';

import { commissionSystem } from '@/lib/commission-service';
```

### Mentee Dashboard Example

```typescript
// Get mentee statistics
const stats = await commissionSystem.dashboard.getMentoradoStats(mentoradoId);

// Display key metrics
console.log(`Total Earned: R$ ${stats.totalEarned}`);
console.log(`Available for Withdrawal: R$ ${stats.availableForWithdrawal}`);
console.log(`Conversion Rate: ${stats.conversionRate}%`);

// List referrals
const referrals = await commissionSystem.referrals.getByMentorado(mentoradoId);

// List commissions
const commissions = await commissionSystem.commissions.getByMentorado(mentoradoId);

// Request withdrawal
const eligibleCommissions = await commissionSystem.commissions.getEligibleForWithdrawal(mentoradoId);
if (eligibleCommissions.length > 0) {
  const withdrawal = await commissionSystem.withdrawals.create(mentoradoId, {
    payment_data: {
      pix_key: 'mentee@email.com'
    }
  });
}
```

### Admin Dashboard Example

```typescript
// Get organization overview
const summaries = await commissionSystem.dashboard.getOrganizationSummary(organizationId);

// Get pending withdrawals
const pendingWithdrawals = await commissionSystem.withdrawals.getByOrganization(
  organizationId, 
  ['pending']
);

// Approve withdrawal
await commissionSystem.withdrawals.approve({
  withdrawal_id: withdrawalId,
  admin_notes: 'Approved for payment'
});

// Process payment
await commissionSystem.withdrawals.processPayment({
  withdrawal_id: withdrawalId,
  payment_method: 'pix',
  payment_reference: 'PIX-123456',
  payment_proof_url: 'https://...',
  admin_notes: 'Payment completed'
});
```

## Common Workflows

### 1. Creating a Referral

```typescript
// When mentee refers a new lead
const referral = await commissionSystem.referrals.create({
  mentorado_id: mentoradoId,
  lead_id: leadId,
  referral_source: 'whatsapp',
  referral_notes: 'Friend from medical school'
});
```

### 2. Converting a Lead to Client

```typescript
// When lead becomes a paying client
await commissionSystem.referrals.convert(
  referralId,
  10000, // Contract value
  'parcelado_2x' // Payment plan
);
```

### 3. Recording Client Payment

```typescript
// Record payment from client
const payment = await commissionSystem.payments.create({
  referral_id: referralId,
  payment_amount: 5000,
  payment_percentage: 50,
  payment_date: new Date().toISOString(),
  payment_method: 'pix',
  payment_reference: 'PIX-789',
  notes: 'First installment'
});

// Confirm payment (triggers commission calculation)
await commissionSystem.payments.confirm(payment.id);
```

### 4. Monthly Report Generation

```typescript
// Generate monthly commission report
const report = await commissionSystem.dashboard.getMonthlyReport(
  organizationId,
  2024,
  12
);

console.log(`Total Commissions: ${report.totalCommissions}`);
console.log(`Total Amount: R$ ${report.totalAmount}`);
console.log(`Paid: R$ ${report.paidAmount}`);
console.log(`Pending: R$ ${report.pendingAmount}`);
```

## Security Considerations

### Row Level Security (RLS)
- Mentees can only view their own data
- Admins have full access to organization data
- Automatic organization isolation

### Audit Trail
- All commission changes are logged
- IP addresses and user agents tracked
- Complete history of status changes

### Data Validation
- Prevent duplicate commissions
- Validate payment percentages
- Ensure referral uniqueness

## Testing

### Sample Data Included
The system includes test data:
- 2 test mentees (João and Maria)
- 4 test leads/clients
- Various referral statuses
- Sample payments and commissions

### Test Scenarios

```sql
-- View all test commissions
SELECT * FROM commission_summary;

-- Check referral details
SELECT * FROM referral_details;

-- View pending commissions
SELECT * FROM pending_commissions;

-- Test withdrawal request
SELECT process_withdrawal_request(
  '22222222-2222-2222-2222-222222222222'::UUID,
  '11111111-1111-1111-1111-111111111111'::UUID
);
```

## Monitoring & Maintenance

### Key Metrics to Track
- Commission payment rate
- Average time to payment
- Conversion rates by mentee
- Monthly commission totals

### Database Maintenance

```sql
-- Clean up old history (keep 1 year)
DELETE FROM commission_history 
WHERE performed_at < NOW() - INTERVAL '1 year';

-- Vacuum tables for performance
VACUUM ANALYZE commissions;
VACUUM ANALYZE referrals;
```

### Performance Optimization
- All foreign keys are indexed
- Composite indexes on frequently queried columns
- Views for complex queries
- Triggers for automatic calculations

## Troubleshooting

### Common Issues

1. **Commission not calculated**
   - Check if payment status is 'confirmed'
   - Verify referral status is 'converted'
   - Ensure contract_value is set

2. **Withdrawal request fails**
   - Check minimum withdrawal amount
   - Verify eligible commissions exist
   - Ensure organization settings configured

3. **RLS blocking access**
   - Verify user authentication
   - Check organization membership
   - Review policy definitions

### Debug Queries

```sql
-- Check commission calculation
SELECT * FROM commissions 
WHERE referral_id = '[REFERRAL_ID]';

-- View commission history
SELECT * FROM commission_history 
WHERE commission_id = '[COMMISSION_ID]'
ORDER BY performed_at DESC;

-- Check payment status
SELECT * FROM referral_payments
WHERE referral_id = '[REFERRAL_ID]';
```

## API Reference

Full API documentation available in:
- `/src/types/commission.ts` - TypeScript interfaces
- `/src/lib/commission-service.ts` - Service functions
- `/sql/commission_system_complete.sql` - Database functions

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review test scenarios
3. Consult the API documentation
4. Check database logs in Supabase dashboard

## Version History

- **v1.0.0** - Initial implementation
  - Complete referral tracking
  - Automatic commission calculation
  - Withdrawal management
  - Admin dashboard
  - Mentee portal