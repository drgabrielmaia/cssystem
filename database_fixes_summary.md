# Database Structure Fixes Summary

## Issues Found and Fixed

### 1. **Leads Table Column Name Issue**
- **Problem**: SQL scripts were referencing `l.nome` but the actual column is `nome_completo`
- **Fixed in files**:
  - `/migrations_consolidated.sql` (lines 510, 529, 544)
  - `/sql/commission_system_complete.sql` (lines 501, 520, 535)
  - `/fix_all_column_references.sql` (complete fix)

### 2. **SDRs Table Structure**
- **Problem**: SDRs table doesn't exist yet and when created uses `nome` instead of `nome_completo`
- **Solution**: 
  - Created proper table structure with `nome_completo` column
  - Added all necessary indexes and constraints
  - Fixed in `/create_sdrs_table.sql` and `/fix_all_column_references.sql`

### 3. **Organizations Table Column Reference**
- **Problem**: SQL scripts reference `o.nome` but actual column is `name`
- **Fixed**: Changed all references from `o.nome` to `o.name`

### 4. **Closers Table Column Reference**
- **Problem**: Views reference `c.nome` but actual column is `nome_completo`
- **Fixed**: Changed all references from `c.nome` to `c.nome_completo`

### 5. **Organizations Owner Reference**
- **Problem**: RLS policies reference `owner_id` but table has `owner_email`
- **Solution**: Added logic to handle both `owner_id` and `owner_email` in RLS policies

## Actual Database Structure

### Leads Table
- Uses `nome_completo` for person's name (75 columns total)
- Has columns for SDR and Closer assignment
- Includes lead scoring and qualification fields

### Mentorados Table
- Uses `nome_completo` for person's name (28 columns total)
- Linked to leads via `lead_id`
- Has commission percentage field

### Organizations Table
- Uses `name` for organization name (7 columns total)
- Has `owner_email` field (not `owner_id`)
- Includes commission settings

### Closers Table
- Uses `nome_completo` for person's name (26 columns total)
- Includes performance metrics
- Has user authentication link

### SDRs Table (to be created)
- Will use `nome_completo` for consistency
- Includes performance metrics
- Has qualification targets

## Migration Order

1. Run `/fix_all_column_references.sql` first - this creates SDRs table and fixes all views
2. Then run the commission system migration
3. Finally run any lead qualification system migrations

## Files Modified

1. `/migrations_consolidated.sql` - Fixed column references
2. `/sql/commission_system_complete.sql` - Fixed column references  
3. `/create_sdrs_table.sql` - Fixed column names to match existing tables
4. `/fix_all_column_references.sql` - Comprehensive fix for all issues

## Verification Steps

Run the following query to verify all tables exist with correct columns:
```sql
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('leads', 'mentorados', 'organizations', 'closers', 'sdrs')
AND column_name LIKE '%nome%' OR column_name LIKE '%name%'
ORDER BY table_name, column_name;
```

This should show:
- leads.nome_completo
- mentorados.nome_completo
- organizations.name
- closers.nome_completo
- sdrs.nome_completo (after migration)