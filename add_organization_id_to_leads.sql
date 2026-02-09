-- Add organization_id to leads table and set all existing records to admin organization

-- Add organization_id column to leads and update existing records
DO $$
DECLARE
    admin_org_id UUID;
BEGIN
    -- Get the admin organization ID
    SELECT id INTO admin_org_id 
    FROM organizations 
    WHERE name = 'Admin Organization' OR owner_email = 'admin@admin.com' 
    LIMIT 1;

    -- If no admin organization found, create one
    IF admin_org_id IS NULL THEN
        INSERT INTO organizations (
            id,
            name,
            owner_email,
            admin_phone,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Admin Organization',
            'admin@admin.com',
            '+5583999999999',
            NOW(),
            NOW()
        ) RETURNING id INTO admin_org_id;
        
        RAISE NOTICE 'Created Admin Organization with ID: %', admin_org_id;
    ELSE
        RAISE NOTICE 'Found Admin Organization with ID: %', admin_org_id;
    END IF;

    -- Add organization_id column to leads if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN organization_id UUID;
        RAISE NOTICE 'Added organization_id column to leads table';
    ELSE
        RAISE NOTICE 'organization_id column already exists in leads table';
    END IF;

    -- Update all existing leads records to use admin organization
    UPDATE leads 
    SET organization_id = admin_org_id 
    WHERE organization_id IS NULL;

    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'leads' 
        AND constraint_name = 'leads_organization_id_fkey'
    ) THEN
        ALTER TABLE leads 
        ADD CONSTRAINT leads_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for organization_id in leads';
    END IF;

    -- Make organization_id NOT NULL after setting values
    ALTER TABLE leads ALTER COLUMN organization_id SET NOT NULL;

    RAISE NOTICE 'Successfully updated % records in leads table', (SELECT COUNT(*) FROM leads WHERE organization_id = admin_org_id);
END $$;

-- Verify the changes
SELECT 
    COUNT(*) as total_leads,
    organization_id,
    o.name as organization_name
FROM leads l
LEFT JOIN organizations o ON l.organization_id = o.id
GROUP BY organization_id, o.name;