-- Migration: Add RACC category to recipes table
-- This column stores the FDA RACC category for proper serving size validation

-- Add racc_category_id column to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS racc_category_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipes_racc_category ON recipes(racc_category_id);

-- Comment the column for documentation
COMMENT ON COLUMN recipes.racc_category_id IS 'FDA RACC category ID for serving size compliance (e.g., bakery-cookies, dairy-yogurt)';
