# Closers/SDRs System Implementation Guide

## Overview
This document describes the implementation of the Closers/SDRs system, which mirrors the existing mentorados authentication and dashboard structure.

## 📁 Files Created

### 1. Database Migration
- **File**: `/supabase/migrations/create_closers_tables.sql`
- **Purpose**: Creates all necessary database tables for the closers system
- **Tables Created**:
  - `closers` - Main table for SDRs/Closers data
  - `closers_vendas` - Sales tracking
  - `closers_metas` - Monthly targets
  - `closers_atividades` - Activity logging
  - `closers_dashboard_access` - Access tracking

### 2. Authentication Context
- **File**: `/src/contexts/closer-auth.tsx`
- **Purpose**: Manages authentication state for closers
- **Features**:
  - Cookie-based authentication with localStorage fallback
  - Auto-refresh authentication status
  - Access control based on contract status
  - Mobile-compatible authentication

### 3. Closers Dashboard
- **File**: `/src/app/closer/page.tsx`
- **Route**: `/closer`
- **Purpose**: Main dashboard for SDRs/Closers
- **Features**:
  - Login page with email/password
  - Metrics overview (sales, commissions, conversion rate)
  - Recent activities display
  - Quick action buttons
  - Monthly performance tracking

### 4. Admin Management Page
- **File**: `/src/app/admin/closers/page.tsx`
- **Route**: `/admin/closers`
- **Purpose**: Admin interface for managing closers
- **Features**:
  - List all closers with filtering
  - Add/Edit/Deactivate closers
  - View detailed metrics per closer
  - Export data to CSV
  - Filter by type (SDR, Closer, Senior, Manager)
  - Filter by status (Active, Inactive)

### 5. Data Hooks
- **File**: `/src/hooks/use-closers.ts`
- **Purpose**: React hook for managing closers data
- **Features**:
  - Load closers with metrics
  - CRUD operations
  - Automatic metrics calculation
  - Organization-based filtering

## 🗄️ Database Schema

### Main Tables Structure:

```sql
closers
├── id (UUID, Primary Key)
├── nome_completo (VARCHAR)
├── email (VARCHAR, Unique)
├── telefone (VARCHAR)
├── cpf (VARCHAR)
├── password_hash (VARCHAR)
├── status_login (VARCHAR)
├── tipo_closer (VARCHAR) - sdr/closer/closer_senior/manager
├── organization_id (UUID, Foreign Key)
├── data_contratacao (DATE)
├── status_contrato (VARCHAR)
├── meta_mensal (DECIMAL)
├── comissao_percentual (DECIMAL)
└── timestamps

closers_vendas
├── id (UUID, Primary Key)
├── closer_id (UUID, Foreign Key)
├── mentorado_id (UUID, Foreign Key)
├── data_venda (DATE)
├── valor_venda (DECIMAL)
├── valor_comissao (DECIMAL)
├── status_pagamento (VARCHAR)
└── timestamps

closers_metas
├── id (UUID, Primary Key)
├── closer_id (UUID, Foreign Key)
├── mes (INTEGER)
├── ano (INTEGER)
├── meta_vendas_quantidade (INTEGER)
├── meta_vendas_valor (DECIMAL)
├── vendas_realizadas (INTEGER)
├── valor_realizado (DECIMAL)
└── timestamps
```

## 🚀 Setup Instructions

### 1. Apply Database Migrations

Run the SQL migration file in your Supabase SQL editor:

```bash
# Go to Supabase Dashboard > SQL Editor
# Copy and paste the content from:
/supabase/migrations/create_closers_tables.sql
# Execute the query
```

### 2. Test the System

#### For Closers:
1. Navigate to `/closer`
2. Create a test closer in the database or admin panel
3. Login with email and password
4. Verify dashboard loads with metrics

#### For Admins:
1. Navigate to `/admin/closers`
2. Add new closers using the "Adicionar Closer" button
3. Test filtering and search functionality
4. Export data to verify CSV generation

### 3. Add Sample Data (Optional)

```sql
-- Insert sample closers
INSERT INTO public.closers (nome_completo, email, tipo_closer, organization_id, password_hash, status_login, status_contrato)
VALUES 
('João Silva', 'joao.silva@example.com', 'sdr', (SELECT id FROM organizations LIMIT 1), '123456', 'ativo', 'ativo'),
('Maria Santos', 'maria.santos@example.com', 'closer', (SELECT id FROM organizations LIMIT 1), '123456', 'ativo', 'ativo');

-- Insert sample sales
INSERT INTO public.closers_vendas (closer_id, data_venda, valor_venda, comissao_percentual, valor_comissao)
VALUES 
((SELECT id FROM closers WHERE email = 'joao.silva@example.com'), CURRENT_DATE, 5000.00, 5.00, 250.00);

-- Insert monthly targets
INSERT INTO public.closers_metas (closer_id, mes, ano, meta_vendas_valor, meta_vendas_quantidade)
VALUES 
((SELECT id FROM closers WHERE email = 'joao.silva@example.com'), 
 EXTRACT(MONTH FROM CURRENT_DATE), 
 EXTRACT(YEAR FROM CURRENT_DATE), 
 50000.00, 
 10);
```

## 🔐 Security Features

### Row Level Security (RLS)
- Closers can only see their own data
- Managers and owners can see all organization data
- Automatic access control based on user role

### Authentication
- Cookie-based session management
- Password hashing support
- Automatic session refresh
- Mobile-compatible authentication

### Access Control
- Contract status validation
- Login status checking
- Termination date enforcement
- Organization-based isolation

## 📊 Features Comparison

| Feature | Mentorados | Closers/SDRs |
|---------|------------|--------------|
| Authentication | ✅ Cookie-based | ✅ Cookie-based |
| Dashboard | ✅ Netflix-style | ✅ Metrics-focused |
| Admin Management | ✅ Basic CRUD | ✅ Advanced filtering |
| Metrics | ✅ Basic stats | ✅ Sales & performance |
| Organization Support | ✅ Yes | ✅ Yes |
| Mobile Support | ✅ Yes | ✅ Yes |
| Export Data | ❌ No | ✅ CSV export |
| Activity Tracking | ❌ No | ✅ Yes |
| Commission Tracking | ❌ No | ✅ Yes |

## 🎯 Key Differentiators

### For Closers:
- **Performance Dashboard**: Real-time sales metrics
- **Commission Tracking**: Automatic commission calculation
- **Activity Logging**: Track all interactions with leads
- **Target Management**: Monthly goals and achievement tracking

### For Admins:
- **Advanced Filtering**: Filter by type, status, performance
- **Bulk Operations**: Export, mass update capabilities
- **Detailed Analytics**: Per-closer performance metrics
- **Team Overview**: Aggregate team performance data

## 🔧 Customization Options

### Adding New Closer Types:
Edit the check constraint in the migration:
```sql
tipo_closer VARCHAR(50) DEFAULT 'sdr' 
CHECK (tipo_closer IN ('sdr', 'closer', 'closer_senior', 'manager', 'YOUR_NEW_TYPE'))
```

### Adjusting Commission Rates:
Default is 5%, can be customized per closer in the admin panel or database.

### Adding Custom Metrics:
Extend the `calculate_closer_metrics` function in the migration file.

## 📱 Routes Summary

- `/closer` - Closer login and dashboard
- `/admin/closers` - Admin management interface
- `/closer/leads` - Lead management (to be implemented)
- `/closer/vendas` - Sales registration (to be implemented)
- `/closer/atividades` - Activity log (to be implemented)
- `/closer/relatorios` - Reports (to be implemented)
- `/closer/comissoes` - Commission details (to be implemented)

## 🐛 Troubleshooting

### Common Issues:

1. **Login not working**:
   - Check if the closer exists in the database
   - Verify password_hash field
   - Check status_login is 'ativo'

2. **Metrics not showing**:
   - Verify the `calculate_closer_metrics` function was created
   - Check if there's data in closers_vendas table
   - Ensure proper date filtering

3. **Admin page not loading**:
   - Verify user has proper organization access
   - Check if useAuth hook is properly configured
   - Ensure organization_users table has correct permissions

## 🚦 Next Steps

To complete the implementation:

1. **Create Additional Pages**:
   - Lead management interface
   - Sales registration form
   - Activity logging interface
   - Detailed reports and analytics

2. **Enhance Features**:
   - Email notifications for targets
   - Automated commission calculations
   - Integration with payment systems
   - Advanced reporting dashboards

3. **Mobile App**:
   - React Native version for field sales
   - Offline capability
   - Push notifications

## 📞 Support

For issues or questions about this implementation:
1. Check the error logs in browser console
2. Verify database migrations were applied correctly
3. Ensure all environment variables are set
4. Check Supabase RLS policies are enabled

---

**Implementation Date**: 2026-02-09
**Author**: System
**Version**: 1.0.0