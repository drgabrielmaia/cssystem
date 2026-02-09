-- Add organization_id to dividas table and set all existing records to admin organization

-- First, let's get the Admin Organization ID
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

    -- Add organization_id column to dividas if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dividas' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE dividas ADD COLUMN organization_id UUID;
        RAISE NOTICE 'Added organization_id column to dividas table';
    ELSE
        RAISE NOTICE 'organization_id column already exists in dividas table';
    END IF;

    -- Update all existing dividas records to use admin organization
    UPDATE dividas 
    SET organization_id = admin_org_id 
    WHERE organization_id IS NULL;

    -- Add foreign key constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'dividas' 
        AND constraint_name = 'dividas_organization_id_fkey'
    ) THEN
        ALTER TABLE dividas 
        ADD CONSTRAINT dividas_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for organization_id';
    END IF;

    -- Make organization_id NOT NULL after setting values
    ALTER TABLE dividas ALTER COLUMN organization_id SET NOT NULL;

    RAISE NOTICE 'Successfully updated % records in dividas table', (SELECT COUNT(*) FROM dividas WHERE organization_id = admin_org_id);
END $$;

-- Verify the changes
SELECT 
    COUNT(*) as total_dividas,
    organization_id,
    o.name as organization_name
FROM dividas d
LEFT JOIN organizations o ON d.organization_id = o.id
GROUP BY organization_id, o.name;