-- =====================================================
-- Fix: Profiles Table Setup and Auto-Population
-- =====================================================
-- This script:
-- 1. Creates profiles for all existing auth.users
-- 2. Sets up a trigger to auto-create profiles for new users
-- =====================================================

-- Step 1: Create a default organization if none exists
INSERT INTO organizations (id, name, slug)
SELECT 
    gen_random_uuid(),
    'Slater Innovations',
    'slater-innovations'
WHERE NOT EXISTS (SELECT 1 FROM organizations);

-- Step 2: Get the organization ID for use in profiles
DO $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
    
    -- Step 3: Create profiles for ALL existing auth users
    INSERT INTO profiles (id, organization_id, full_name, role, created_at)
    SELECT 
        u.id,
        v_org_id,
        COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
        CASE 
            WHEN u.email = 'slaterinnovations@outlook.com' THEN 'admin'
            ELSE 'member'
        END,
        u.created_at
    FROM auth.users u
    WHERE NOT EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = u.id
    );
    
    RAISE NOTICE 'Created profiles for existing users in organization %', v_org_id;
END $$;

-- Step 4: Verify profiles were created
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
ORDER BY p.created_at DESC;

-- =====================================================
-- Step 5: Create trigger to auto-create profiles for new users
-- =====================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Get the default organization
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
    
    -- If no organization exists, create one
    IF v_org_id IS NULL THEN
        INSERT INTO organizations (name, slug)
        VALUES ('Default Organization', 'default-org')
        RETURNING id INTO v_org_id;
    END IF;
    
    -- Create profile for the new user
    INSERT INTO public.profiles (id, organization_id, full_name, role, created_at)
    VALUES (
        NEW.id,
        v_org_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'member', -- Default role
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Final verification
-- =====================================================
SELECT 
    'SUCCESS' as status,
    COUNT(*) as profiles_created
FROM profiles;

SELECT 
    p.id,
    p.full_name,
    p.role,
    u.email,
    o.name as organization
FROM profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN organizations o ON p.organization_id = o.id;
