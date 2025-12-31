# FDA NFP Compliance Setup Guide

## Quick Start

Follow these steps to get the FDA Nutrition Facts Panel compliance system up and running.

### 1. Database Migration (Already Done ✓)

You've already deployed the migration `004_compliance_rules.sql` to Supabase.

### 2. Seed FDA Compliance Rules

Populate the database with FDA compliance rules:

```bash
curl -X POST http://localhost:3002/api/admin/seed-fda-rules \
  -H "Content-Type: application/json" \
  -d '{"clear_existing": true}'
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully seeded 31 FDA compliance rules",
  "rules_count": 31
}
```

Verify the rules were seeded:
```bash
curl http://localhost:3002/api/admin/seed-fda-rules
```

Expected response:
```json
{
  "total_fda_rules": 31,
  "breakdown_by_type": {
    "nfp_format": 4,
    "serving_size": 3,
    "nutrient_content_claim": 22,
    "mandatory_nutrients": 1
  }
}
```

### 3. Test the System

#### Create a Test Label

Navigate to `/labels/generate` in your app and create a label with nutrition data.

**The label will be automatically validated** when created!

#### View Compliance Dashboard

Navigate to `/compliance` to see:
- Overall compliance statistics
- All labels with their compliance status
- Detailed validation reports for each label
- Ability to re-validate and export PDFs

#### Check Label List

Navigate to `/labels` to see the updated labels list with:
- Compliance status badges (compliant, warnings, errors)
- Error and warning counts
- Link to view detailed reports

### 4. Test Validation Scenarios

Try creating labels with different scenarios:

#### Scenario 1: Compliant Label
```json
{
  "name": "Test Compliant Product",
  "nutrition_data": {
    "calories": 200,
    "totalFat": 8,
    "saturatedFat": 1,
    "transFat": 0,
    "cholesterol": 0,
    "sodium": 160,
    "totalCarbohydrates": 37,
    "dietaryFiber": 4,
    "totalSugars": 12,
    "addedSugars": 10,
    "protein": 3,
    "vitaminD": 2,
    "calcium": 260,
    "iron": 8,
    "potassium": 240
  },
  "serving_size_g": 55,
  "servings_per_container": 8,
  "format": "standard_vertical",
  "package_surface_area": 60
}
```

#### Scenario 2: Label with "Low Fat" Claim
```json
{
  "name": "Low Fat Product",
  "nutrition_data": { /* ... same as above ... */ },
  "serving_size_g": 30,
  "servings_per_container": 10,
  "format": "standard_vertical",
  "package_surface_area": 50,
  "claim_statements": ["low fat"]
}
```

#### Scenario 3: INVALID "Sugar Free" Claim (will show errors)
```json
{
  "name": "Incorrectly Labeled Sugar Free",
  "nutrition_data": {
    /* ... */
    "totalSugars": 2  // Too high for "sugar free" (must be <0.5g)
  },
  "claim_statements": ["sugar free"]  // This will fail validation
}
```

### 5. Export Labels as PDFs

From the compliance dashboard (`/compliance`):
1. Click on any label to view its detailed validation report
2. If compliant or has only warnings, click "Export PDF"
3. The system will:
   - Validate the label
   - Block export if there are errors
   - Generate FDA-compliant NFP PDF if validation passes

### 6. API Endpoints

#### Validate a Label
```bash
curl -X POST http://localhost:3002/api/labels/export \
  -H "Content-Type: application/json" \
  -d '{
    "label_id": "YOUR_LABEL_UUID",
    "validate_only": true
  }'
```

#### Export Label as PDF
```bash
curl -X POST http://localhost:3002/api/labels/export \
  -H "Content-Type: application/json" \
  -d '{"label_id": "YOUR_LABEL_UUID"}' \
  --output label.pdf
```

#### Get Validation Status
```bash
curl http://localhost:3002/api/labels/export?label_id=YOUR_LABEL_UUID
```

## Features Implemented

### ✅ Automatic Validation
- Labels are automatically validated when created or updated
- Validation results stored in database
- No manual validation required

### ✅ Compliance Dashboard
- Navigate to `/compliance`
- View all labels with compliance status
- Filter by status (compliant, warnings, errors, not validated)
- Search labels by name
- Click labels to view detailed reports
- Re-validate or export PDFs directly from dashboard

### ✅ Enhanced Labels List
- Navigate to `/labels`
- See compliance status badges for each label
- Error and warning counts displayed
- Link to view detailed compliance reports

### ✅ Validation Components
- `ValidationReport` - Detailed compliance report display
- `ComplianceStatusBadge` - Status indicator with icons
- Both reusable across the app

### ✅ FDA Rules
- 31 comprehensive FDA compliance rules
- Format requirements (standard, tabular, linear, simplified)
- Serving size rounding rules
- 22 nutrient content claim validations
- Mandatory nutrients checking

### ✅ PDF Export
- FDA-compliant Nutrition Facts Panel
- Standard vertical format
- Proper font sizes (FDA requirements)
- Ingredient and allergen statements
- Blocks export if compliance errors exist

## Troubleshooting

### Issue: Rules not seeding
**Solution:** Check Supabase connection and RLS policies. Make sure you're authenticated.

### Issue: Validation not running on label creation
**Solution:** Check browser console for errors. Ensure nutrition_data is present in label.

### Issue: PDF export fails
**Solution:**
1. Check if label has compliance errors (must fix before export)
2. Verify @react-pdf/renderer is installed
3. Check API logs for errors

### Issue: Compliance dashboard shows "Not Validated"
**Solution:** Click the refresh button (🔄) to run validation on existing labels.

## What's Next?

Consider adding:
1. **Tabular and Linear PDF formats** (currently only standard vertical)
2. **Batch validation** for multiple labels at once
3. **Compliance history** tracking over time
4. **Custom organization rules** beyond FDA requirements
5. **Health claims validation** (beyond nutrient content claims)
6. **RACC database** for automatic serving size determination
7. **Email alerts** for compliance status changes
8. **Compliance reports export** (CSV/Excel)

## Need Help?

Refer to:
- `FDA_NFP_COMPLIANCE_GUIDE.md` - Comprehensive documentation
- `examples/nfp-validation-example.ts` - Code examples
- FDA references in validation results
