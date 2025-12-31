-- Migration: 007_sync_labels_schema
-- Add all missing columns to the labels table that are defined in TypeScript types
-- This ensures the database schema matches the application types

-- Add serving size related columns
ALTER TABLE labels ADD COLUMN IF NOT EXISTS serving_size_g DECIMAL(10,2);
ALTER TABLE labels ADD COLUMN IF NOT EXISTS serving_size_household TEXT;
ALTER TABLE labels ADD COLUMN IF NOT EXISTS servings_per_container DECIMAL(10,2);

-- Add package surface area for NFP format selection
ALTER TABLE labels ADD COLUMN IF NOT EXISTS package_surface_area DECIMAL(10,2);

-- Add compliance/validation columns (some may exist from 004_compliance_rules.sql)
ALTER TABLE labels ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'not_validated';
ALTER TABLE labels ADD COLUMN IF NOT EXISTS validation_results JSONB;
ALTER TABLE labels ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE labels ADD COLUMN IF NOT EXISTS claim_statements JSONB;

-- Add dual column support columns (some may exist from 006_add_dual_column_support.sql)
ALTER TABLE labels ADD COLUMN IF NOT EXISTS is_dual_column BOOLEAN DEFAULT FALSE;
ALTER TABLE labels ADD COLUMN IF NOT EXISTS prepared_nutrition_data JSONB;

-- Add comments for documentation
COMMENT ON COLUMN labels.serving_size_g IS 'Serving size in grams';
COMMENT ON COLUMN labels.serving_size_household IS 'Household serving size description (e.g., "1 cup", "2 tbsp")';
COMMENT ON COLUMN labels.servings_per_container IS 'Number of servings per container';
COMMENT ON COLUMN labels.package_surface_area IS 'Package surface area in square inches for NFP format selection';
COMMENT ON COLUMN labels.compliance_status IS 'FDA compliance status: compliant, warnings, errors, pending, not_validated';
COMMENT ON COLUMN labels.validation_results IS 'Detailed FDA validation check results';
COMMENT ON COLUMN labels.validated_at IS 'Timestamp of last validation';
COMMENT ON COLUMN labels.claim_statements IS 'Nutrient content claims on the label';
COMMENT ON COLUMN labels.is_dual_column IS 'Whether this label shows dual columns (as packaged/prepared)';
COMMENT ON COLUMN labels.prepared_nutrition_data IS 'Nutrition data for prepared state when is_dual_column is true';
