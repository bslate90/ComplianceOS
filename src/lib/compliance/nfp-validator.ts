/**
 * NFP (Nutrition Facts Panel) Validation Service
 * Validates labels against FDA compliance rules
 */

import { FDA_DAILY_VALUES, calculateDailyValuePercent } from '../nutrition/daily-values'
import {
  ALL_FDA_NFP_RULES,
  getRulesByType,
  getRuleById,
  type ComplianceRule,
} from './fda-nfp-rules'
import { validateServingSize as validateServingSizeRACC, type ServingSizeValidation } from './serving-size-validator'

export interface NutritionData {
  calories: number
  totalFat: number
  saturatedFat: number
  transFat: number
  cholesterol: number
  sodium: number
  totalCarbohydrates: number
  dietaryFiber: number
  totalSugars: number
  addedSugars: number
  protein: number
  vitaminD: number
  calcium: number
  iron: number
  potassium: number
}

const NUTRIENT_KEY_MAP: Record<string, keyof NutritionData> = {
  'calories': 'calories',
  'total_fat': 'totalFat',
  'saturated_fat': 'saturatedFat',
  'trans_fat': 'transFat',
  'cholesterol': 'cholesterol',
  'sodium': 'sodium',
  'total_carbohydrates': 'totalCarbohydrates',
  'dietary_fiber': 'dietaryFiber',
  'total_sugars': 'totalSugars',
  'added_sugars': 'addedSugars',
  'protein': 'protein',
  'vitamin_d': 'vitaminD',
  'calcium': 'calcium',
  'iron': 'iron',
  'potassium': 'potassium'
}

export interface LabelData {
  nutrition_data: NutritionData
  serving_size_g?: number
  serving_size_household?: string
  servings_per_container?: number
  format?: 'standard_vertical' | 'tabular' | 'linear' | 'simplified'
  package_surface_area?: number // square inches
  claim_statements?: string[]
  racc_category_id?: string // FDA RACC category ID for serving size validation
  total_product_weight_g?: number // Total product weight for RACC calculations
}

export interface ValidationResult {
  rule_id: string
  rule_name: string
  rule_type: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  severity: 'error' | 'warning' | 'info'
  cfr_reference?: string
  details?: Record<string, any>
}

export interface ComplianceReport {
  overall_status: 'compliant' | 'warnings' | 'errors' | 'not_validated'
  validation_results: ValidationResult[]
  errors_count: number
  warnings_count: number
  validated_at: string
  label_format?: string
  racc_validation?: ServingSizeValidation | null
}

/**
 * Main validation function - validates a label against all applicable FDA rules
 */
export function validateLabel(labelData: LabelData): ComplianceReport {
  const results: ValidationResult[] = []

  // Validate NFP Format
  results.push(...validateNFPFormat(labelData))

  // Validate Serving Size
  results.push(...validateServingSize(labelData))

  // Validate Mandatory Nutrients
  results.push(...validateMandatoryNutrients(labelData))

  // Validate Nutrient Content Claims (if any)
  if (labelData.claim_statements && labelData.claim_statements.length > 0) {
    results.push(...validateNutrientContentClaims(labelData))
  }

  // Validate RACC serving size compliance (if category provided)
  let raccValidation: ServingSizeValidation | null = null
  if (labelData.racc_category_id && labelData.serving_size_g) {
    raccValidation = validateServingSizeRACC({
      servingSizeG: labelData.serving_size_g,
      servingSizeHousehold: labelData.serving_size_household,
      totalProductWeight: labelData.total_product_weight_g || labelData.serving_size_g * (labelData.servings_per_container || 1),
      raccCategoryId: labelData.racc_category_id,
      servingsPerContainer: labelData.servings_per_container,
    })

    // Convert RACC validation messages to validation results
    raccValidation.messages.forEach(msg => {
      results.push({
        rule_id: 'racc-serving-size',
        rule_name: 'RACC Serving Size Compliance',
        rule_type: 'racc_validation',
        status: msg.type === 'error' ? 'fail' : msg.type === 'warning' ? 'warning' : 'pass',
        message: msg.message,
        severity: msg.type === 'error' ? 'error' : msg.type === 'warning' ? 'warning' : 'info',
        cfr_reference: msg.cfrReference,
        details: msg.details,
      })
    })
  }

  // Calculate overall status
  const errors = results.filter((r) => r.status === 'fail' && r.severity === 'error')
  const warnings = results.filter((r) => r.status === 'fail' && r.severity === 'warning')

  let overall_status: ComplianceReport['overall_status'] = 'compliant'
  if (errors.length > 0) {
    overall_status = 'errors'
  } else if (warnings.length > 0) {
    overall_status = 'warnings'
  }

  return {
    overall_status,
    validation_results: results,
    errors_count: errors.length,
    warnings_count: warnings.length,
    validated_at: new Date().toISOString(),
    label_format: labelData.format,
    racc_validation: raccValidation,
  }
}

/**
 * Validate NFP Format requirements
 */
function validateNFPFormat(labelData: LabelData): ValidationResult[] {
  const results: ValidationResult[] = []
  const formatRules = getRulesByType('nfp_format')

  // Find applicable format rule
  const format = labelData.format || 'standard_vertical'
  const packageSize = labelData.package_surface_area || 100 // default to large package

  // Check if format matches package size requirements
  const applicableRule = formatRules.find((rule) => {
    const reqs = rule.requirements
    if (format === 'standard_vertical' && packageSize >= 40) {
      return rule.id === 'nfp-format-standard'
    } else if (format === 'tabular' && packageSize >= 20 && packageSize <= 40) {
      return rule.id === 'nfp-format-tabular'
    } else if (format === 'linear' && packageSize < 40) {
      return rule.id === 'nfp-format-linear'
    } else if (format === 'simplified' && packageSize < 12) {
      return rule.id === 'nfp-format-simplified'
    }
    return false
  })

  if (applicableRule) {
    results.push({
      rule_id: applicableRule.id,
      rule_name: applicableRule.rule_name,
      rule_type: 'nfp_format',
      status: 'pass',
      message: `Label format '${format}' is appropriate for package size ${packageSize} sq in`,
      severity: 'info',
      cfr_reference: applicableRule.cfr_reference,
    })
  } else {
    // Format mismatch
    results.push({
      rule_id: 'nfp-format-mismatch',
      rule_name: 'Format Package Size Mismatch',
      rule_type: 'nfp_format',
      status: 'fail',
      message: `Format '${format}' may not be appropriate for package size ${packageSize} sq in`,
      severity: 'warning',
      details: {
        current_format: format,
        package_size: packageSize,
        recommendation: packageSize >= 40 ? 'standard_vertical' : packageSize >= 20 ? 'tabular' : 'linear',
      },
    })
  }

  return results
}

/**
 * Validate Serving Size requirements
 */
function validateServingSize(labelData: LabelData): ValidationResult[] {
  const results: ValidationResult[] = []

  // Validate servings per container rounding
  if (labelData.servings_per_container) {
    const servings = labelData.servings_per_container
    let expectedRounded: number

    if (servings < 2) {
      expectedRounded = Math.round(servings * 10) / 10 // 0.1 increment
    } else if (servings >= 2 && servings <= 5) {
      expectedRounded = Math.round(servings * 2) / 2 // 0.5 increment
    } else {
      expectedRounded = Math.round(servings) // whole number
    }

    if (Math.abs(servings - expectedRounded) < 0.01) {
      results.push({
        rule_id: 'serving-size-servings-per-container',
        rule_name: 'Servings Per Container Rounding',
        rule_type: 'serving_size',
        status: 'pass',
        message: `Servings per container (${servings}) is properly rounded`,
        severity: 'info',
        cfr_reference: '21 CFR 101.9(b)(8)',
      })
    } else {
      results.push({
        rule_id: 'serving-size-servings-per-container',
        rule_name: 'Servings Per Container Rounding',
        rule_type: 'serving_size',
        status: 'fail',
        message: `Servings per container should be ${expectedRounded}, not ${servings}`,
        severity: 'error',
        cfr_reference: '21 CFR 101.9(b)(8)',
        details: { current: servings, expected: expectedRounded },
      })
    }
  }

  // Validate serving size gram rounding
  if (labelData.serving_size_g) {
    const grams = labelData.serving_size_g
    let expectedRounded: number

    if (grams < 2) {
      expectedRounded = Math.round(grams * 10) / 10 // 0.1 increment
    } else if (grams >= 2 && grams < 5) {
      expectedRounded = Math.round(grams * 2) / 2 // 0.5 increment
    } else {
      expectedRounded = Math.round(grams) // whole number
    }

    if (Math.abs(grams - expectedRounded) < 0.01) {
      results.push({
        rule_id: 'serving-size-rounding-grams',
        rule_name: 'Serving Size Gram Rounding',
        rule_type: 'serving_size',
        status: 'pass',
        message: `Serving size (${grams}g) is properly rounded`,
        severity: 'info',
        cfr_reference: '21 CFR 101.9(b)(7)',
      })
    } else {
      results.push({
        rule_id: 'serving-size-rounding-grams',
        rule_name: 'Serving Size Gram Rounding',
        rule_type: 'serving_size',
        status: 'fail',
        message: `Serving size should be ${expectedRounded}g, not ${grams}g`,
        severity: 'error',
        cfr_reference: '21 CFR 101.9(b)(7)',
        details: { current: grams, expected: expectedRounded },
      })
    }
  }

  return results
}

/**
 * Validate Mandatory Nutrients
 */
function validateMandatoryNutrients(labelData: LabelData): ValidationResult[] {
  const results: ValidationResult[] = []
  const mandatoryRule = getRuleById('mandatory-nutrients-standard')

  if (!mandatoryRule) return results

  const requiredNutrients = mandatoryRule.requirements.nutrients_in_order
  const nutritionData = labelData.nutrition_data

  // Check if all mandatory nutrients are present
  const missingNutrients: string[] = []

  for (const nutrient of requiredNutrients) {
    if (nutrient.mandatory) {
      // Convert display name to key (e.g., "Total Fat" -> "totalFat")
      const key = NUTRIENT_KEY_MAP[nutrient.name] || (nutrient.name as keyof NutritionData)
      if (nutritionData[key] === undefined || nutritionData[key] === null) {
        missingNutrients.push(nutrient.display)
      }
    }
  }

  if (missingNutrients.length === 0) {
    results.push({
      rule_id: 'mandatory-nutrients-standard',
      rule_name: 'Mandatory Nutrient Declaration',
      rule_type: 'mandatory_nutrients',
      status: 'pass',
      message: 'All mandatory nutrients are present',
      severity: 'info',
      cfr_reference: '21 CFR 101.9(c)',
    })
  } else {
    results.push({
      rule_id: 'mandatory-nutrients-standard',
      rule_name: 'Mandatory Nutrient Declaration',
      rule_type: 'mandatory_nutrients',
      status: 'fail',
      message: `Missing mandatory nutrients: ${missingNutrients.join(', ')}`,
      severity: 'error',
      cfr_reference: '21 CFR 101.9(c)',
      details: { missing_nutrients: missingNutrients },
    })
  }

  return results
}

/**
 * Validate Nutrient Content Claims
 */
function validateNutrientContentClaims(labelData: LabelData): ValidationResult[] {
  const results: ValidationResult[] = []
  const claimRules = getRulesByType('nutrient_content_claim')
  const nutritionData = labelData.nutrition_data

  if (!labelData.claim_statements || labelData.claim_statements.length === 0) {
    return results
  }

  for (const claimStatement of labelData.claim_statements) {
    const claimLower = claimStatement.toLowerCase()

    // Find matching rule(s)
    const matchingRules = claimRules.filter((rule) => {
      const terms = rule.requirements.claim_terms || []
      return terms.some((term: string) => claimLower.includes(term.toLowerCase()))
    })

    if (matchingRules.length === 0) {
      results.push({
        rule_id: 'unknown-claim',
        rule_name: 'Unknown Claim',
        rule_type: 'nutrient_content_claim',
        status: 'fail',
        message: `Claim "${claimStatement}" is not recognized or not defined in FDA regulations`,
        severity: 'warning',
        details: { claim: claimStatement },
      })
      continue
    }

    // Validate each matching rule
    for (const rule of matchingRules) {
      const validationResult = validateSingleClaim(rule, nutritionData, labelData)
      results.push({
        ...validationResult,
        details: { ...validationResult.details, claim_statement: claimStatement },
      })
    }
  }

  return results
}

/**
 * Validate a single nutrient content claim
 */
function validateSingleClaim(
  rule: ComplianceRule,
  nutritionData: NutritionData,
  labelData: LabelData
): ValidationResult {
  const reqs = rule.requirements
  const nutrientKey = NUTRIENT_KEY_MAP[reqs.nutrient] || (reqs.nutrient as keyof NutritionData)
  const nutrientValue = nutritionData[nutrientKey]

  // FREE claims
  if (rule.id.includes('free')) {
    const maxAllowed = reqs.max_per_racc || reqs.max_per_serving || 0

    if (nutrientValue <= maxAllowed) {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'pass',
        message: `Claim "${rule.rule_name}" is valid: ${nutrientValue} ≤ ${maxAllowed}`,
        severity: 'info',
        cfr_reference: rule.cfr_reference,
      }
    } else {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'fail',
        message: `Claim "${rule.rule_name}" is invalid: ${nutrientValue} exceeds maximum ${maxAllowed}`,
        severity: 'error',
        cfr_reference: rule.cfr_reference,
        details: { current_value: nutrientValue, max_allowed: maxAllowed },
      }
    }
  }

  // LOW claims
  if (rule.id.includes('low')) {
    const maxAllowed = reqs.max_per_racc || 0

    if (nutrientValue <= maxAllowed) {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'pass',
        message: `Claim "${rule.rule_name}" is valid: ${nutrientValue} ≤ ${maxAllowed}`,
        severity: 'info',
        cfr_reference: rule.cfr_reference,
      }
    } else {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'fail',
        message: `Claim "${rule.rule_name}" is invalid: ${nutrientValue} exceeds maximum ${maxAllowed}`,
        severity: 'error',
        cfr_reference: rule.cfr_reference,
        details: { current_value: nutrientValue, max_allowed: maxAllowed },
      }
    }
  }

  // GOOD SOURCE claims
  if (rule.id === 'claim-good-source') {
    const dvKey = nutrientKey as keyof typeof FDA_DAILY_VALUES
    if (!FDA_DAILY_VALUES[dvKey]) {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'fail',
        message: `Cannot validate "Good Source" claim for ${nutrientKey} - no DV defined`,
        severity: 'warning',
      }
    }

    const dvPercent = calculateDailyValuePercent(dvKey, nutrientValue)

    if (dvPercent >= 10 && dvPercent < 20) {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'pass',
        message: `Claim "Good Source" is valid: ${dvPercent}% DV (10-19%)`,
        severity: 'info',
        cfr_reference: rule.cfr_reference,
        details: { dv_percent: dvPercent },
      }
    } else {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'fail',
        message: `Claim "Good Source" is invalid: ${dvPercent}% DV (requires 10-19%)`,
        severity: 'error',
        cfr_reference: rule.cfr_reference,
        details: { dv_percent: dvPercent, required_range: '10-19%' },
      }
    }
  }

  // HIGH claims
  if (rule.id === 'claim-high') {
    const dvKey = nutrientKey as keyof typeof FDA_DAILY_VALUES
    if (!FDA_DAILY_VALUES[dvKey]) {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'fail',
        message: `Cannot validate "High" claim for ${nutrientKey} - no DV defined`,
        severity: 'warning',
      }
    }

    const dvPercent = calculateDailyValuePercent(dvKey, nutrientValue)

    if (dvPercent >= 20) {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'pass',
        message: `Claim "High" is valid: ${dvPercent}% DV (≥20%)`,
        severity: 'info',
        cfr_reference: rule.cfr_reference,
        details: { dv_percent: dvPercent },
      }
    } else {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'fail',
        message: `Claim "High" is invalid: ${dvPercent}% DV (requires ≥20%)`,
        severity: 'error',
        cfr_reference: rule.cfr_reference,
        details: { dv_percent: dvPercent, required_min: '20%' },
      }
    }
  }

  // HEALTHY claim (2025)
  if (rule.id === 'claim-healthy-2025') {
    const addedSugarsDV = calculateDailyValuePercent('addedSugars', nutritionData.addedSugars)
    const sodiumDV = calculateDailyValuePercent('sodium', nutritionData.sodium)
    const saturatedFatDV = calculateDailyValuePercent('saturatedFat', nutritionData.saturatedFat)

    const passes =
      addedSugarsDV <= 20 && sodiumDV <= 30 && saturatedFatDV <= 20

    if (passes) {
      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'pass',
        message: `Claim "Healthy" (2025) is valid`,
        severity: 'info',
        cfr_reference: rule.cfr_reference,
        details: {
          added_sugars_dv: addedSugarsDV,
          sodium_dv: sodiumDV,
          saturated_fat_dv: saturatedFatDV,
        },
      }
    } else {
      const violations: string[] = []
      if (addedSugarsDV > 20) violations.push(`Added Sugars ${addedSugarsDV}% DV (max 20%)`)
      if (sodiumDV > 30) violations.push(`Sodium ${sodiumDV}% DV (max 30%)`)
      if (saturatedFatDV > 20) violations.push(`Saturated Fat ${saturatedFatDV}% DV (max 20%)`)

      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        status: 'fail',
        message: `Claim "Healthy" (2025) is invalid: ${violations.join(', ')}`,
        severity: 'error',
        cfr_reference: rule.cfr_reference,
        details: {
          violations,
          added_sugars_dv: addedSugarsDV,
          sodium_dv: sodiumDV,
          saturated_fat_dv: saturatedFatDV,
        },
      }
    }
  }

  // Default - unable to validate
  return {
    rule_id: rule.id,
    rule_name: rule.rule_name,
    rule_type: rule.rule_type,
    status: 'fail',
    message: `Unable to validate claim "${rule.rule_name}"`,
    severity: 'warning',
  }
}

/**
 * Helper function to format validation report for display
 */
export function formatValidationReport(report: ComplianceReport): string {
  let output = `\nCompliance Validation Report\n`
  output += `Overall Status: ${report.overall_status.toUpperCase()}\n`
  output += `Errors: ${report.errors_count} | Warnings: ${report.warnings_count}\n`
  output += `Validated: ${new Date(report.validated_at).toLocaleString()}\n`
  output += `\n${'='.repeat(60)}\n`

  for (const result of report.validation_results) {
    const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '•'
    output += `\n${icon} [${result.severity.toUpperCase()}] ${result.rule_name}\n`
    output += `  ${result.message}\n`
    if (result.cfr_reference) {
      output += `  Reference: ${result.cfr_reference}\n`
    }
    if (result.details) {
      output += `  Details: ${JSON.stringify(result.details, null, 2)}\n`
    }
  }

  return output
}
