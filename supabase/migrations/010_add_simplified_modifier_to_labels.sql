-- Migration: Add simplified boolean field to labels table
-- Date: 2026-01-10
-- Description: The 'simplified' option is now a modifier that can be applied
-- to any format (standard_vertical, tabular, linear), not a format itself.
-- This follows FDA 21 CFR 101.9(f) which allows simplified labeling as a
-- modifier when nutrients are below significance thresholds.

-- Add simplified column as a boolean modifier
ALTER TABLE labels ADD COLUMN IF NOT EXISTS simplified BOOLEAN DEFAULT FALSE;

-- Migrate any existing labels with format='simplified' to use the new structure
UPDATE labels 
SET 
  simplified = TRUE,
  format = 'standard_vertical'
WHERE format = 'simplified';

-- Add comment explaining the field
COMMENT ON COLUMN labels.simplified IS 
  'Simplified format modifier per FDA 21 CFR 101.9(f). When true, insignificant nutrients may be omitted and a "Not a significant source of..." statement is required.';

-- Add index for queries filtering by simplified
CREATE INDEX IF NOT EXISTS idx_labels_simplified ON labels(simplified) WHERE simplified = TRUE;
