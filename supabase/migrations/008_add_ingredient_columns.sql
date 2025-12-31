-- Migration: Add missing columns to ingredients table
-- These columns are used by the ingredient form but were not in the initial schema

-- Add nutrition_basis column to track whether nutrition values are per 100g or per serving
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS nutrition_basis TEXT DEFAULT '100g';

-- Add check constraint separately
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ingredients_nutrition_basis_check'
    ) THEN
        ALTER TABLE ingredients ADD CONSTRAINT ingredients_nutrition_basis_check 
        CHECK (nutrition_basis IN ('100g', 'serving'));
    END IF;
END $$;

-- Add user_code column for custom user-defined ingredient codes (UDID)
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS user_code VARCHAR(25);

-- Add index for faster user_code lookups
CREATE INDEX IF NOT EXISTS idx_ingredients_user_code ON ingredients(user_code);

-- Comment the columns for documentation
COMMENT ON COLUMN ingredients.nutrition_basis IS 'Defines whether nutrition values are per 100g or per serving';
COMMENT ON COLUMN ingredients.user_code IS 'User-defined code for quick ingredient lookup (max 25 chars)';
