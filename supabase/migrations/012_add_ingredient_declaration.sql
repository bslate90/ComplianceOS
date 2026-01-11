-- Migration: Add ingredient_declaration column to ingredients table
-- This allows users to specify how the ingredient should appear on the label

ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS ingredient_declaration TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN ingredients.ingredient_declaration IS 'The name to use in ingredient declarations on product labels (e.g., "ENRICHED WHEAT FLOUR" instead of "Flour")';

-- Create index for searching by declaration name
CREATE INDEX IF NOT EXISTS idx_ingredients_declaration ON ingredients(ingredient_declaration);
