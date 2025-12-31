-- Add dual column support for prepared/as packaged NFPs
-- Migration: 006_add_dual_column_support

ALTER TABLE labels
ADD COLUMN IF NOT EXISTS is_dual_column BOOLEAN DEFAULT FALSE;

ALTER TABLE labels
ADD COLUMN IF NOT EXISTS prepared_nutrition_data JSONB;

COMMENT ON COLUMN labels.is_dual_column IS 'Whether this label shows dual columns (prepared/as packaged)';
COMMENT ON COLUMN labels.prepared_nutrition_data IS 'Nutrition data for prepared state (when is_dual_column is true)';
