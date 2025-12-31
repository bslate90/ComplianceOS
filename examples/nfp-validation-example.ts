/**
 * NFP Validation Examples
 * Demonstrates how to use the FDA compliance validation system
 */

import { validateLabel, formatValidationReport } from '@/lib/compliance/nfp-validator'
import { getRulesByType, getRuleById } from '@/lib/compliance/fda-nfp-rules'

// Example 1: Validate a simple label with no claims
function example1_BasicValidation() {
  const report = validateLabel({
    nutrition_data: {
      calories: 230,
      totalFat: 8,
      saturatedFat: 1,
      transFat: 0,
      cholesterol: 0,
      sodium: 160,
      totalCarbohydrates: 37,
      dietaryFiber: 4,
      totalSugars: 12,
      addedSugars: 10,
      protein: 3,
      vitaminD: 2,
      calcium: 260,
      iron: 8,
      potassium: 240,
    },
    serving_size_g: 55,
    servings_per_container: 8,
    format: 'standard_vertical',
    package_surface_area: 60,
  })

  console.log('Example 1: Basic Validation')
  console.log('Overall Status:', report.overall_status)
  console.log('Errors:', report.errors_count)
  console.log('Warnings:', report.warnings_count)
  console.log('\n' + formatValidationReport(report))
}

// Example 2: Validate a label with "Low Fat" claim
function example2_LowFatClaim() {
  const report = validateLabel({
    nutrition_data: {
      calories: 100,
      totalFat: 2.5, // Must be ≤3g for "low fat" claim
      saturatedFat: 0.5,
      transFat: 0,
      cholesterol: 5,
      sodium: 140,
      totalCarbohydrates: 15,
      dietaryFiber: 2,
      totalSugars: 8,
      addedSugars: 6,
      protein: 4,
      vitaminD: 0,
      calcium: 100,
      iron: 1,
      potassium: 150,
    },
    serving_size_g: 30,
    servings_per_container: 10,
    format: 'standard_vertical',
    package_surface_area: 50,
    claim_statements: ['low fat'],
  })

  console.log('\nExample 2: Low Fat Claim Validation')
  console.log('Overall Status:', report.overall_status)

  const claimResults = report.validation_results.filter(
    (r) => r.rule_type === 'nutrient_content_claim'
  )
  claimResults.forEach((result) => {
    console.log(`\n${result.rule_name}:`, result.status)
    console.log('Message:', result.message)
    console.log('CFR Reference:', result.cfr_reference)
  })
}

// Example 3: Validate label with INVALID "Sugar Free" claim
function example3_InvalidSugarFreeClaim() {
  const report = validateLabel({
    nutrition_data: {
      calories: 150,
      totalFat: 3,
      saturatedFat: 1,
      transFat: 0,
      cholesterol: 0,
      sodium: 200,
      totalCarbohydrates: 25,
      dietaryFiber: 3,
      totalSugars: 2, // Too high for "sugar free" (must be <0.5g)
      addedSugars: 2,
      protein: 5,
      vitaminD: 0,
      calcium: 50,
      iron: 2,
      potassium: 100,
    },
    serving_size_g: 40,
    servings_per_container: 6,
    format: 'standard_vertical',
    package_surface_area: 45,
    claim_statements: ['sugar free'], // This will fail validation
  })

  console.log('\nExample 3: INVALID Sugar Free Claim')
  console.log('Overall Status:', report.overall_status)
  console.log('Errors:', report.errors_count)

  const errors = report.validation_results.filter((r) => r.status === 'fail')
  errors.forEach((error) => {
    console.log(`\n❌ ${error.rule_name}`)
    console.log('Message:', error.message)
    console.log('Details:', error.details)
  })
}

// Example 4: Validate "Good Source of Fiber" claim
function example4_GoodSourceOfFiber() {
  const report = validateLabel({
    nutrition_data: {
      calories: 180,
      totalFat: 5,
      saturatedFat: 0.5,
      transFat: 0,
      cholesterol: 0,
      sodium: 250,
      totalCarbohydrates: 30,
      dietaryFiber: 4, // 4g = 14% DV (needs 10-19% for "good source")
      totalSugars: 6,
      addedSugars: 4,
      protein: 6,
      vitaminD: 0,
      calcium: 80,
      iron: 3,
      potassium: 200,
    },
    serving_size_g: 50,
    servings_per_container: 8,
    format: 'standard_vertical',
    package_surface_area: 55,
    claim_statements: ['good source of fiber'],
  })

  console.log('\nExample 4: Good Source of Fiber')
  console.log('Overall Status:', report.overall_status)

  const fiberResult = report.validation_results.find((r) => r.rule_id === 'claim-good-source')
  if (fiberResult) {
    console.log('Status:', fiberResult.status)
    console.log('Message:', fiberResult.message)
    console.log('DV Percentage:', fiberResult.details?.dv_percent + '%')
  }
}

// Example 5: Validate 2025 "Healthy" claim
function example5_HealthyClaim2025() {
  const report = validateLabel({
    nutrition_data: {
      calories: 200,
      totalFat: 9, // No limit on total fat (2025 rule change)
      saturatedFat: 2, // Must be ≤20% DV (4g max for 20% of 20g DV)
      transFat: 0,
      cholesterol: 10,
      sodium: 300, // Must be ≤30% DV (690mg max for 30% of 2300mg DV)
      totalCarbohydrates: 25,
      dietaryFiber: 5,
      totalSugars: 8,
      addedSugars: 6, // Must be ≤20% DV (10g max for 20% of 50g DV)
      protein: 8,
      vitaminD: 2,
      calcium: 150,
      iron: 4,
      potassium: 350,
    },
    serving_size_g: 60,
    servings_per_container: 5,
    format: 'standard_vertical',
    package_surface_area: 50,
    claim_statements: ['healthy'],
  })

  console.log('\nExample 5: 2025 "Healthy" Claim')
  console.log('Overall Status:', report.overall_status)

  const healthyResult = report.validation_results.find((r) => r.rule_id === 'claim-healthy-2025')
  if (healthyResult) {
    console.log('Status:', healthyResult.status)
    console.log('Message:', healthyResult.message)
    console.log('Details:', JSON.stringify(healthyResult.details, null, 2))
  }
}

// Example 6: Check format requirements for small package
function example6_SmallPackageFormat() {
  const report = validateLabel({
    nutrition_data: {
      calories: 120,
      totalFat: 4,
      saturatedFat: 1,
      transFat: 0,
      cholesterol: 0,
      sodium: 180,
      totalCarbohydrates: 20,
      dietaryFiber: 2,
      totalSugars: 5,
      addedSugars: 3,
      protein: 3,
      vitaminD: 0,
      calcium: 60,
      iron: 2,
      potassium: 120,
    },
    serving_size_g: 28,
    servings_per_container: 4,
    format: 'linear', // Linear format for small package
    package_surface_area: 25, // Small package (20-40 sq in)
  })

  console.log('\nExample 6: Small Package Format')
  console.log('Overall Status:', report.overall_status)

  const formatResults = report.validation_results.filter((r) => r.rule_type === 'nfp_format')
  formatResults.forEach((result) => {
    console.log(`\n${result.rule_name}:`, result.status)
    console.log('Message:', result.message)
  })
}

// Example 7: Get all nutrient content claim rules
function example7_ListAllClaimRules() {
  const claimRules = getRulesByType('nutrient_content_claim')

  console.log('\nExample 7: All Nutrient Content Claim Rules')
  console.log(`Total claims: ${claimRules.length}\n`)

  // Group by claim category
  const freeRules = claimRules.filter((r) => r.id.includes('free'))
  const lowRules = claimRules.filter((r) => r.id.includes('low'))
  const reducedRules = claimRules.filter((r) => r.id.includes('reduced'))
  const goodSourceRules = claimRules.filter((r) => r.id.includes('good-source') || r.id.includes('high'))

  console.log('FREE Claims:', freeRules.length)
  freeRules.forEach((r) => console.log(`  - ${r.rule_name}`))

  console.log('\nLOW Claims:', lowRules.length)
  lowRules.forEach((r) => console.log(`  - ${r.rule_name}`))

  console.log('\nREDUCED/LESS Claims:', reducedRules.length)
  reducedRules.forEach((r) => console.log(`  - ${r.rule_name}`))

  console.log('\nGOOD SOURCE/HIGH Claims:', goodSourceRules.length)
  goodSourceRules.forEach((r) => console.log(`  - ${r.rule_name}`))
}

// Example 8: Inspect a specific rule
function example8_InspectRule() {
  const rule = getRuleById('claim-low-sodium')

  if (rule) {
    console.log('\nExample 8: Inspect "Low Sodium" Rule')
    console.log('Rule Name:', rule.rule_name)
    console.log('CFR Reference:', rule.cfr_reference)
    console.log('Description:', rule.description)
    console.log('Requirements:', JSON.stringify(rule.requirements, null, 2))
  }
}

// Run all examples
export function runAllExamples() {
  example1_BasicValidation()
  example2_LowFatClaim()
  example3_InvalidSugarFreeClaim()
  example4_GoodSourceOfFiber()
  example5_HealthyClaim2025()
  example6_SmallPackageFormat()
  example7_ListAllClaimRules()
  example8_InspectRule()
}

// Run individual example by uncommenting:
// example1_BasicValidation()
// example2_LowFatClaim()
// example3_InvalidSugarFreeClaim()
// example4_GoodSourceOfFiber()
// example5_HealthyClaim2025()
// example6_SmallPackageFormat()
// example7_ListAllClaimRules()
// example8_InspectRule()
