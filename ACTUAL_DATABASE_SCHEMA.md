# ACTUAL SUPABASE DATABASE SCHEMA
## Complete Database Analysis - February 9, 2026

### DATABASE CONNECTION DETAILS
- **URL**: https://udzmlnnztzzwrphhizol.supabase.co
- **Total Tables Checked**: 53
- **Existing Tables**: 8
- **Missing Tables**: 45

---

## EXISTING TABLES (What We Have)

### 1. organizations
Primary table for multi-tenant organizations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Organization name |
| owner_email | text | Owner's email |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |
| admin_phone | text | Admin phone number |
| comissao_fixa_indicacao | integer | Fixed referral commission (cents) |

### 2. organization_users
Links users to organizations with roles.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | FK to organizations |
| user_id | uuid | User identifier |
| email | text | User email |
| role | text | User role (owner, admin, etc.) |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |
| is_active | boolean | Active status |

### 3. leads
Main leads table with extensive tracking fields.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| nome_completo | text | Full name |
| email | text | Email address |
| telefone | text | Phone number |
| empresa | text | Company name |
| cargo | text | Job title |
| origem | text | Lead source |
| status | text | Current status |
| observacoes | text | Notes |
| lead_score | integer | Lead scoring |
| temperatura | text | Lead temperature (frio/morno/quente) |
| probabilidade_compra | integer | Purchase probability |
| prioridade | text | Priority level |
| desistiu | boolean | Gave up flag |
| organization_id | uuid | FK to organizations |
| **SDR Fields** | | |
| sdr_id | uuid | Assigned SDR |
| sdr_atribuido_em | timestamp | SDR assignment date |
| sdr_qualificado_em | timestamp | SDR qualification date |
| sdr_observacoes | text | SDR notes |
| **Closer Fields** | | |
| closer_id | uuid | Assigned closer |
| closer_atribuido_em | timestamp | Closer assignment date |
| closer_tipo | text | Closer type |
| closer_observacoes | text | Closer notes |
| **Sales Fields** | | |
| valor_venda | numeric | Sale value |
| data_fechamento | timestamp | Closing date |
| valor_vendido | numeric | Sold value |
| valor_arrecadado | numeric | Collected amount |
| **Commission Fields** | | |
| mentorado_indicador_id | uuid | Referrer ID |
| comissao_id | uuid | Commission ID |
| possui_comissao | boolean | Has commission flag |
| **JSON Fields** | | |
| call_details | jsonb | Call information |
| call_history | jsonb | Call history array |
| qualification_details | jsonb | Qualification data |
| sales_details | jsonb | Sales information |

### 4. lead_notes
Notes for leads (currently empty).

### 5. closers
Sales closers management.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| nome_completo | text | Full name |
| email | text | Email address |
| telefone | text | Phone |
| cpf | text | Brazilian CPF |
| password_hash | text | Password hash |
| status_login | text | Login status |
| tipo_closer | text | Closer type |
| organization_id | uuid | FK to organizations |
| data_contratacao | date | Hire date |
| status_contrato | text | Contract status |
| meta_mensal | integer | Monthly goal |
| comissao_percentual | integer | Commission percentage |
| total_vendas | integer | Total sales |
| total_leads_atendidos | integer | Leads attended |
| conversao_rate | integer | Conversion rate |
| skills | jsonb | Skills array |
| horario_trabalho | jsonb | Work schedule |

### 6. whatsapp_conversations
WhatsApp conversation tracking (currently empty).

### 7. notifications
System notifications.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| type | text | Notification type |
| title | text | Title |
| message | text | Message content |
| source_type | text | Source type |
| source_id | uuid | Source ID |
| read | boolean | Read status |
| action_required | boolean | Action required flag |
| created_at | timestamp | Creation date |
| read_at | timestamp | Read date |
| organization_id | uuid | FK to organizations |

### 8. form_templates
Dynamic form builder templates.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Template name |
| description | text | Description |
| slug | text | URL slug |
| fields | jsonb | Form fields configuration |
| form_type | text | Form type |
| style | jsonb | Style configuration |

---

## MISSING CRITICAL TABLES

### USER AUTHENTICATION (MISSING)
- **users** - NOT FOUND (Critical for authentication)
- **profiles** - NOT FOUND (User profile data)

### COMMISSION SYSTEM (ALL MISSING)
- **referrals** - NOT FOUND
- **commissions** - NOT FOUND
- **commission_withdrawals** - NOT FOUND
- **withdrawals** - NOT FOUND
- **commission_tiers** - NOT FOUND
- **commission_rules** - NOT FOUND
- **payout_requests** - NOT FOUND
- **wallet_transactions** - NOT FOUND
- **referral_links** - NOT FOUND
- **referral_stats** - NOT FOUND

### SALES TEAM (PARTIALLY MISSING)
- **social_sellers** - NOT FOUND
- **sellers** - NOT FOUND
- **admins** - NOT FOUND
- **sdrs** - NOT FOUND

---

## KEY FINDINGS

### 1. Database State
- Database is partially implemented
- Only 8 out of 53 expected tables exist
- Commission system is completely absent
- User authentication tables are missing

### 2. Current Functionality
- Organizations multi-tenancy is set up
- Lead management is functional
- Closers table exists and is being used
- Basic notification system is in place
- Form builder system is available

### 3. Critical Issues
- **No user authentication tables** (users, profiles)
- **No commission system** at all
- **No referral tracking** capability
- **Missing sales team tables** (SDRs, social sellers)

### 4. Data Integrity Notes
- The leads table has commission-related columns (mentorado_indicador_id, comissao_id, possui_comissao) but no supporting tables
- Organization has comissao_fixa_indicacao field (fixed commission) but no commission system
- Closers table exists but related tables (sdrs, social_sellers) don't exist

---

## MIGRATION REQUIREMENTS

To implement the commission system, we need to create:

1. **User System Tables** (if using Supabase Auth, may not be needed):
   - users (or use auth.users)
   - profiles

2. **Commission Core Tables**:
   - referrals
   - commissions
   - commission_withdrawals
   - withdrawals

3. **Commission Support Tables**:
   - commission_tiers (optional)
   - commission_rules (optional)
   - wallet_transactions (optional)

4. **Sales Team Tables**:
   - social_sellers
   - sdrs

---

## NEXT STEPS

1. **Decide on User Authentication**:
   - Use Supabase Auth (auth.users) or create custom users table
   - Create profiles table linked to auth system

2. **Create Commission System**:
   - Design and create all commission-related tables
   - Set up proper foreign key relationships
   - Implement RLS policies

3. **Complete Sales Team Structure**:
   - Create missing sales team tables
   - Link to existing closers table

4. **Data Migration**:
   - Migrate any existing commission data from leads table
   - Set up proper relationships

---

## IMPORTANT NOTES

- The database uses UUID for all primary keys
- Timestamps use timezone-aware format (+00:00)
- Money values should be stored in cents (integer) to avoid floating-point issues
- JSONB is used for flexible data structures
- Brazilian-specific fields are present (CPF, etc.)

---

## CONNECTION TEST CODE

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://udzmlnnztzzwrphhizol.supabase.co',
  'YOUR_SERVICE_ROLE_KEY'
);

// Test query
const { data, error } = await supabase
  .from('leads')
  .select('*')
  .limit(1);

console.log('Connection test:', error ? 'FAILED' : 'SUCCESS');
```

---

Last Updated: February 9, 2026 at 06:36:46 UTC