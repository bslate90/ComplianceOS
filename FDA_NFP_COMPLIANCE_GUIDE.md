# FDA Nutrition Facts Panel (NFP) Compliance System

This document describes the comprehensive FDA NFP compliance system that has been integrated into ComplianceOS.

## Overview

The system validates and exports Nutrition Facts Panel labels according to FDA regulations (21 CFR 101.9) with full compliance checking for:
- NFP format requirements
- Serving size requirements
- Mandatory nutrient declarations
- Nutrient content claims (e.g., "low fat", "sugar free", "good source")
- 2025 updated "healthy" claim

## Components

### 1. Database Schema

**Migration File:** `supabase/migrations/004_compliance_rules.sql`

#### Tables Created/Modified:

**`compliance_rules` table:**
- Stores FDA compliance requirements in structured format
- Fields: `rule_type`, `rule_category`, `requirements` (JSONB), `cfr_reference`, `severity`
- Supports organization-specific rules and global FDA rules

**`labels` table (extended):**
- Added `compliance_status` (compliant/warnings/errors/pending)
- Added `validation_results` (JSONB) - detailed validation check results
- Added `validated_at` (timestamp)
- Added `claim_statements` (JSONB) - nutrient content claims

### 2. FDA Compliance Rules

**File:** `src/lib/compliance/fda-nfp-rules.ts`

Contains comprehensive FDA requirements extracted from:
- 21 CFR 101.9 (Nutrition labeling)
- 21 CFR Part 101 Subpart D (Nutrient content claims)
- FDA Food Labeling Guide

#### Rule Types:

1. **NFP Format Rules** (4 rules)
   - Standard Vertical Format (≥40 sq in packages)
   - Tabular Format (20-40 sq in packages)
   - Linear Format (<40 sq in packages)
   - Simplified Format (<12 sq in packages)

2. **Serving Size Rules** (3 rules)
   - Gram/mL rounding (0.1g, 0.5g, 1g increments)
   - Servings per container rounding
   - Single-serving container definition

3. **Nutrient Content Claim Rules** (22 rules)
   - **FREE claims:** calorie free, fat free, sugar free, etc.
   - **LOW claims:** low calorie, low fat, low sodium, etc.
   - **REDUCED/LESS claims:** 25% reduction requirements
   - **LIGHT/LITE claims:** 50% reduction requirements
   - **GOOD SOURCE/HIGH claims:** 10-19% DV / ≥20% DV
   - **HEALTHY claim (2025):** Updated criteria (≤20% DV added sugars, ≤30% DV sodium, ≤20% DV saturated fat)

4. **Mandatory Nutrients Rules** (1 rule)
   - All 15 mandatory nutrients in prescribed order
   - Display requirements and units

### 3. Validation Service

**File:** `src/lib/compliance/nfp-validator.ts`

Validates labels against FDA rules and generates compliance reports.

#### Functions:

**`validateLabel(labelData: LabelData): ComplianceReport`**
- Main validation function
- Checks NFP format, serving sizes, mandatory nutrients, and claims
- Returns detailed validation report with errors/warnings

**`formatValidationReport(report: ComplianceReport): string`**
- Formats report for human-readable display

#### Validation Results:

```typescript
interface ValidationResult {
  rule_id: string
  rule_name: string
  rule_type: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  severity: 'error' | 'warning' | 'info'
  cfr_reference?: string
  details?: Record<string, any>
}
```

### 4. PDF Export

**File:** `src/lib/export/label-pdf-generator.tsx`

Generates FDA-compliant Nutrition Facts Panel PDFs using `@react-pdf/renderer`.

#### Features:
- Standard vertical NFP format
- FDA-compliant font sizes (22pt calories, 16pt header, 10pt serving size, 8pt nutrients)
- Proper spacing and thick/thin divider lines
- % Daily Value calculations
- Ingredient and allergen statements
- Company information

#### PDF Layout:
- 240pt width NFP panel (standard size)
- All mandatory nutrients in FDA-prescribed order
- Bold text for nutrient names and DV percentages
- Indented sub-nutrients (saturated fat, trans fat, fiber, sugars, added sugars)
- FDA-compliant footnote

### 5. Export API

**File:** `src/app/api/labels/export/route.ts`

API endpoint for validating and exporting labels with compliance checking.

#### Endpoints:

**POST /api/labels/export**
- Validates label against FDA rules
- Generates PDF if compliant
- Saves validation results to database
- Returns PDF or validation errors

Request body:
```json
{
  "label_id": "uuid",
  "validate_only": false  // optional: true to skip PDF generation
}
```

Response:
- Success: PDF file download with validation status in headers
- Errors: JSON with validation report

**GET /api/labels/export?label_id={uuid}**
- Retrieves validation status and results for a label
- Does not re-validate, returns cached results

### 6. Admin Seeding API

**File:** `src/app/api/admin/seed-fda-rules/route.ts`

Admin endpoint to populate FDA rules in database.

**POST /api/admin/seed-fda-rules**
- Seeds all FDA compliance rules as global rules
- Optional: `clear_existing: true` to reset rules

**GET /api/admin/seed-fda-rules**
- Returns count of FDA rules by type

## Usage

### 1. Initial Setup

Run the database migration:
```bash
# Apply migration through Supabase dashboard or CLI
# File: supabase/migrations/004_compliance_rules.sql
```

Seed FDA compliance rules:
```bash
curl -X POST http://localhost:3002/api/admin/seed-fda-rules \
  -H "Content-Type: application/json" \
  -d '{"clear_existing": true}'
```

### 2. Validate a Label

**Via API:**
```typescript
const response = await fetch('/api/labels/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    label_id: 'label-uuid',
    validate_only: true
  })
})

const { validation_report } = await response.json()
console.log(validation_report.overall_status) // 'compliant', 'warnings', 'errors'
```

**Via Code:**
```typescript
import { validateLabel } from '@/lib/compliance/nfp-validator'

const report = validateLabel({
  nutrition_data: { /* ... */ },
  serving_size_g: 30,
  servings_per_container: 10,
  format: 'standard_vertical',
  package_surface_area: 50,
  claim_statements: ['low fat', 'good source of fiber']
})

console.log(report.overall_status)
console.log(report.validation_results)
```

### 3. Export Label as PDF

```typescript
const response = await fetch('/api/labels/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    label_id: 'label-uuid'
  })
})

if (response.ok) {
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  window.open(url) // Open PDF
} else {
  const { validation_report } = await response.json()
  // Handle validation errors
}
```

### 4. Check Nutrient Content Claims

```typescript
import { validateLabel } from '@/lib/compliance/nfp-validator'

const report = validateLabel({
  nutrition_data: {
    totalFat: 2.5, // grams
    // ... other nutrients
  },
  claim_statements: ['low fat'] // Must be ≤3g per RACC
})

const claimResults = report.validation_results.filter(
  r => r.rule_type === 'nutrient_content_claim'
)

claimResults.forEach(result => {
  console.log(`${result.rule_name}: ${result.status}`)
  console.log(result.message)
})
```

## FDA Compliance Rules Reference

### NFP Format by Package Size

| Package Surface Area | Recommended Format |
|----------------------|-------------------|
| ≥ 40 sq inches       | Standard Vertical |
| 20-40 sq inches      | Tabular or Standard |
| < 40 sq inches       | Linear or Tabular |
| < 12 sq inches       | Simplified |

### Nutrient Content Claim Thresholds

| Claim | Threshold |
|-------|-----------|
| **Calorie Free** | < 5 calories per RACC |
| **Low Calorie** | ≤ 40 calories per RACC |
| **Fat Free** | < 0.5g fat per RACC |
| **Low Fat** | ≤ 3g fat per RACC |
| **Sugar Free** | < 0.5g sugars per RACC |
| **Sodium Free** | < 5mg sodium per RACC |
| **Low Sodium** | ≤ 140mg sodium per RACC |
| **Very Low Sodium** | ≤ 35mg sodium per RACC |
| **Good Source** | 10-19% Daily Value |
| **High/Excellent** | ≥ 20% Daily Value |
| **Reduced/Less** | ≥ 25% reduction vs reference food |
| **Light/Lite (fat)** | ≥ 50% fat reduction (if ≥50% cal from fat) |
| **Light/Lite (sodium)** | ≥ 50% sodium reduction |
| **Healthy (2025)** | ≤20% DV added sugars, ≤30% DV sodium, ≤20% DV sat fat |

### Serving Size Rounding

| Amount | Rounding Increment |
|--------|-------------------|
| < 2g (or mL) | 0.1g |
| 2-5g (or mL) | 0.5g |
| ≥ 5g (or mL) | 1g (whole number) |

### Servings Per Container Rounding

| Servings | Rounding Increment | Prefix |
|----------|-------------------|---------|
| < 2 | 0.1 | "about" |
| 2-5 | 0.5 | "about" |
| > 5 | 1 (whole number) | "about" |

## Integration Points

### Frontend Components

The system integrates with existing components:
- `NutritionFactsPanel.tsx` - Visual NFP display
- `LabelEditor.tsx` - Label creation/editing
- `LabelPreview.tsx` - Label preview

### API Endpoints

- `POST /api/labels` - Create label (now stores claim_statements)
- `POST /api/labels/export` - Validate and export label as PDF
- `GET /api/labels/export` - Get validation status
- `POST /api/admin/seed-fda-rules` - Seed FDA rules

### Database Tables

- `compliance_rules` - FDA requirements
- `labels` - Label data with validation status
- `recipe_audit_log` - Change tracking (existing)

## Future Enhancements

Potential additions:
1. **Tabular and Linear NFP formats** in PDF generator
2. **Dual-column NFP** for packages with multiple serving sizes
3. **Aggregate NFP** for variety packs
4. **Custom compliance rules** per organization
5. **Batch validation** for multiple labels
6. **Compliance dashboard** with statistics
7. **Health claims validation** (beyond nutrient content claims)
8. **RACC database** for automatic serving size determination
9. **Reference food database** for reduced/less claims validation
10. **International regulations** (Health Canada, EU, etc.)

## References

- [21 CFR 101.9 - Nutrition labeling of food](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9)
- [21 CFR Part 101 Subpart D - Nutrient Content Claims](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-D)
- [FDA Food Labeling Guide](https://www.fda.gov/media/81606/download)
- [FDA Serving Sizes Guidance](https://www.fda.gov/media/133699/download)
- [2025 "Healthy" Claim Final Rule](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/use-healthy-claim-food-labeling)

## Support

For questions or issues with the FDA compliance system, refer to:
- This documentation
- Code comments in validation and rules files
- CFR references in validation results
- FDA Food Labeling Guide (official source)
