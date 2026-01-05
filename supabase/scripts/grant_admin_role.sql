-- =====================================================
-- Admin Role Assignment Script for ComplianceOS
-- =====================================================
-- User: slaterinnovations@outlook.com
-- 
-- Run this script in Supabase Dashboard > SQL Editor
-- =====================================================

-- Step 1: Find the correct user ID from auth.users by email
-- This will show you the actual UID for this email
SELECT 
    id as user_id,
    email,
    created_at
FROM auth.users
WHERE email = 'slaterinnovations@outlook.com';

-- Step 2: Check current profile status for this user
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.organization_id,
    u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'slaterinnovations@outlook.com';

-- Step 3: Update the user's role to 'admin' using their email
UPDATE profiles
SET role = 'admin'
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'slaterinnovations@outlook.com'
);

-- Step 4: Verify the role was updated correctly
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.organization_id,
    o.name as organization_name,
    u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE u.email = 'slaterinnovations@outlook.com';

-- =====================================================
-- If no profile exists for this user, create one:
-- =====================================================

-- Check if profile exists
DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'slaterinnovations@outlook.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found with email slaterinnovations@outlook.com';
        RETURN;
    END IF;
    
    -- Check if profile exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
        -- Get the first organization or create a default one
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
        
        IF v_org_id IS NULL THEN
            -- Create a default organization
            INSERT INTO organizations (name, slug)
            VALUES ('Slater Innovations', 'slater-innovations')
            RETURNING id INTO v_org_id;
        END IF;
        
        -- Create the profile
        INSERT INTO profiles (id, full_name, role, organization_id)
        VALUES (v_user_id, 'Slater Innovations Admin', 'admin', v_org_id);
        
        RAISE NOTICE 'Created new admin profile for user %', v_user_id;
    ELSE
        -- Update existing profile to admin
        UPDATE profiles 
        SET role = 'admin'
        WHERE id = v_user_id;
        
        RAISE NOTICE 'Updated existing profile to admin for user %', v_user_id;
    END IF;
END $$;

-- Final verification
SELECT 
    'Profile Status' as check_type,
    p.id,
    p.full_name,
    p.role,
    p.organization_id,
    o.name as organization_name,
    u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE u.email = 'slaterinnovations@outlook.com';
