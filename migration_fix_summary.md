# Migration Fix Summary - leads_com_vendas View Error

## Problem
The migration was failing with the error:
```
ERROR: 42809: "leads_com_vendas" is a view 
DETAIL: Views cannot have row-level BEFORE or AFTER triggers.
```

## Root Cause
The migration script was attempting to create `updated_at` triggers on ALL database objects that had an `updated_at` column, including views. PostgreSQL does not allow triggers on views, only on actual tables.

## Solution Applied
Fixed the migration file at `/Users/gabrielmaia/Desktop/ECOSSISTEMA GM/cs/cssystem/supabase/migrations/20260209_complete_commission_system.sql`

### Original Code (Lines 279-294):
```sql
-- Apply updated_at trigger to all tables that have it
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I 
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;
```

### Fixed Code:
```sql
-- Apply updated_at trigger to all tables (not views) that have it
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT c.table_name 
    FROM information_schema.columns c
    INNER JOIN information_schema.tables t 
      ON c.table_name = t.table_name 
      AND c.table_schema = t.table_schema
    WHERE c.column_name = 'updated_at' 
    AND c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'  -- Only actual tables, not views
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I 
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;
```

## Key Changes
1. **Added JOIN with information_schema.tables** - To access the `table_type` information
2. **Added filter for table_type = 'BASE TABLE'** - This ensures only actual tables get triggers, not views
3. **Updated comment** - Clarified that triggers are only for tables, not views

## Result
- The migration will now skip any views (like `leads_com_vendas`) when creating triggers
- Only actual database tables will have `updated_at` triggers created
- The migration should run successfully without the view trigger error

## How to Apply
Run the migration using:
```bash
npx supabase migration up
```

Or apply directly to your database using your preferred PostgreSQL client.