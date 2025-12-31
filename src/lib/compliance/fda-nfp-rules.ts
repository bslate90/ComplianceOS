/**
 * FDA Nutrition Facts Panel (NFP) Compliance Rules
 * Based on 21 CFR 101.9 and FDA Food Labeling Guide
 *
 * References:
 * - 21 CFR Part 101.9: Nutrition labeling of food
 * - FDA Food Labeling Guide (https://www.fda.gov/media/81606/download)
 * - eCFR: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9
 */

export interface ComplianceRule {
  id: string
  rule_type: string
  rule_category: 'required' | 'conditional' | 'optional' | 'prohibited'
  rule_name: string
  description: string
  requirements: Record<string, any>
  cfr_reference: string
  severity: 'error' | 'warning' | 'info'
  applicable_to?: Record<string, any>
}

/**
 * NFP Format Requirements by Package Size
 * Reference: 21 CFR 101.9(d)
 */
export const NFP_FORMAT_RULES: ComplianceRule[] = [
  {
    id: 'nfp-format-standard',
    rule_type: 'nfp_format',
    rule_category: 'required',
    rule_name: 'Standard Vertical Format',
    description: 'Standard vertical Nutrition Facts Panel for packages with adequate vertical space',
    requirements: {
      min_package_surface_area: 40, // square inches
      min_vertical_space: 3, // inches
      format_type: 'standard_vertical',
      font_sizes: {
        nutrition_facts_header: 16, // points
        calories_value: 22, // points
        serving_size: 10, // points (bold)
        nutrient_names: 8, // points
        nutrient_values: 8, // points
        footnote: 6, // points
      },
    },
    cfr_reference: '21 CFR 101.9(d)(1)',
    severity: 'error',
  },
  {
    id: 'nfp-format-tabular',
    rule_type: 'nfp_format',
    rule_category: 'conditional',
    rule_name: 'Tabular Format',
    description: 'Tabular format for packages with 20-40 sq in surface area or limited vertical space',
    requirements: {
      min_package_surface_area: 20, // square inches
      max_package_surface_area: 40, // square inches
      format_type: 'tabular',
      font_sizes: {
        nutrition_facts_header: 10, // points
        calories_value: 14, // points (bold)
        serving_size: 9, // points (bold)
        nutrient_names: 8, // points
        nutrient_values: 8, // points
      },
    },
    cfr_reference: '21 CFR 101.9(d)(11)',
    severity: 'warning',
    applicable_to: {
      package_surface_area: { min: 20, max: 40 },
      vertical_space_limited: true,
    },
  },
  {
    id: 'nfp-format-linear',
    rule_type: 'nfp_format',
    rule_category: 'conditional',
    rule_name: 'Linear Format',
    description: 'Linear format for small packages (<40 sq in) where vertical/tabular formats do not fit',
    requirements: {
      max_package_surface_area: 40, // square inches
      format_type: 'linear',
      font_sizes: {
        nutrition_facts_header: 10, // points
        calories_value: 14, // points (bold)
        serving_size: 9, // points (bold)
        all_other_text: 8, // points
      },
    },
    cfr_reference: '21 CFR 101.9(d)(13)',
    severity: 'warning',
    applicable_to: {
      package_surface_area: { max: 40 },
      cannot_accommodate_vertical_or_tabular: true,
    },
  },
  {
    id: 'nfp-format-simplified',
    rule_type: 'nfp_format',
    rule_category: 'conditional',
    rule_name: 'Simplified Format',
    description: 'Simplified format for small packages (<12 sq in total surface area)',
    requirements: {
      max_package_surface_area: 12, // square inches
      format_type: 'simplified',
      allowed_nutrients: [
        'calories',
        'total_fat',
        'total_carbohydrates',
        'protein',
        'sodium',
      ],
    },
    cfr_reference: '21 CFR 101.9(f)',
    severity: 'info',
    applicable_to: {
      package_surface_area: { max: 12 },
    },
  },
]

/**
 * Serving Size Requirements
 * Reference: 21 CFR 101.9(b) and 21 CFR 101.12
 */
export const SERVING_SIZE_RULES: ComplianceRule[] = [
  {
    id: 'serving-size-rounding-grams',
    rule_type: 'serving_size',
    rule_category: 'required',
    rule_name: 'Serving Size Gram/mL Rounding',
    description: 'Rounding rules for gram/milliliter quantities in serving sizes',
    requirements: {
      rounding_rules: [
        { range: [0, 2], increment: 0.1, unit: 'g or mL' },
        { range: [2, 5], increment: 0.5, unit: 'g or mL' },
        { range: [5, Infinity], increment: 1, unit: 'g or mL (whole number)' },
      ],
    },
    cfr_reference: '21 CFR 101.9(b)(7)',
    severity: 'error',
  },
  {
    id: 'serving-size-servings-per-container',
    rule_type: 'serving_size',
    rule_category: 'required',
    rule_name: 'Servings Per Container Rounding',
    description: 'Rounding rules for number of servings per container',
    requirements: {
      rounding_rules: [
        { range: [0, 2], increment: 0.1, prefix: 'about' },
        { range: [2, 5], increment: 0.5, prefix: 'about' },
        { range: [5, Infinity], increment: 1, prefix: 'about' },
      ],
    },
    cfr_reference: '21 CFR 101.9(b)(8)',
    severity: 'error',
  },
  {
    id: 'serving-size-single-serving-container',
    rule_type: 'serving_size',
    rule_category: 'required',
    rule_name: 'Single-Serving Container',
    description: 'Products <200% of reference amount must be labeled as single serving',
    requirements: {
      max_reference_amount_percentage: 200,
      must_label_as_single_serving: true,
    },
    cfr_reference: '21 CFR 101.9(b)(6)',
    severity: 'error',
  },
]

/**
 * Nutrient Content Claim Thresholds
 * Reference: 21 CFR Part 101 Subpart D
 */
export const NUTRIENT_CONTENT_CLAIM_RULES: ComplianceRule[] = [
  // FREE CLAIMS
  {
    id: 'claim-calorie-free',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Calorie Free',
    description: 'Product contains less than 5 calories per RACC and labeled serving',
    requirements: {
      claim_terms: ['calorie free', 'free of calories', 'no calories', 'zero calories'],
      max_per_racc: 5,
      max_per_serving: 5,
      nutrient: 'calories',
    },
    cfr_reference: '21 CFR 101.60(b)(1)',
    severity: 'error',
  },
  {
    id: 'claim-fat-free',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Fat Free',
    description: 'Product contains less than 0.5g fat per RACC and labeled serving',
    requirements: {
      claim_terms: ['fat free', 'free of fat', 'no fat', 'zero fat'],
      max_per_racc: 0.5,
      max_per_serving: 0.5,
      nutrient: 'total_fat',
      unit: 'g',
    },
    cfr_reference: '21 CFR 101.62(b)(1)',
    severity: 'error',
  },
  {
    id: 'claim-saturated-fat-free',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Saturated Fat Free',
    description: 'Product contains less than 0.5g saturated fat and less than 0.5g trans fat per RACC',
    requirements: {
      claim_terms: ['saturated fat free', 'no saturated fat'],
      max_saturated_fat_per_racc: 0.5,
      max_trans_fat_per_racc: 0.5,
      nutrient: 'saturated_fat',
      unit: 'g',
    },
    cfr_reference: '21 CFR 101.62(b)(2)',
    severity: 'error',
  },
  {
    id: 'claim-cholesterol-free',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Cholesterol Free',
    description: 'Product contains less than 2mg cholesterol per RACC',
    requirements: {
      claim_terms: ['cholesterol free', 'no cholesterol', 'zero cholesterol'],
      max_per_racc: 2,
      max_saturated_fat_per_racc: 2, // Also limited
      nutrient: 'cholesterol',
      unit: 'mg',
    },
    cfr_reference: '21 CFR 101.62(d)(1)',
    severity: 'error',
  },
  {
    id: 'claim-sodium-free',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Sodium Free',
    description: 'Product contains less than 5mg sodium per RACC',
    requirements: {
      claim_terms: ['sodium free', 'no sodium', 'zero sodium', 'salt free'],
      max_per_racc: 5,
      nutrient: 'sodium',
      unit: 'mg',
    },
    cfr_reference: '21 CFR 101.61(b)(1)',
    severity: 'error',
  },
  {
    id: 'claim-sugar-free',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Sugar Free',
    description: 'Product contains less than 0.5g sugars per RACC',
    requirements: {
      claim_terms: ['sugar free', 'no sugar', 'zero sugar', 'sugarless'],
      max_per_racc: 0.5,
      nutrient: 'total_sugars',
      unit: 'g',
    },
    cfr_reference: '21 CFR 101.60(c)(1)',
    severity: 'error',
  },

  // LOW CLAIMS
  {
    id: 'claim-low-calorie',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Low Calorie',
    description: 'Product contains 40 calories or less per RACC',
    requirements: {
      claim_terms: ['low calorie', 'few calories', 'low in calories'],
      max_per_racc: 40,
      max_per_100g_for_meals: 120,
      nutrient: 'calories',
    },
    cfr_reference: '21 CFR 101.60(b)(2)',
    severity: 'error',
  },
  {
    id: 'claim-low-fat',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Low Fat',
    description: 'Product contains 3g or less fat per RACC',
    requirements: {
      claim_terms: ['low fat', 'low in fat'],
      max_per_racc: 3,
      max_per_100g_for_meals: 3,
      max_calories_from_fat_for_meals: 30, // percentage
      nutrient: 'total_fat',
      unit: 'g',
    },
    cfr_reference: '21 CFR 101.62(b)(2)',
    severity: 'error',
  },
  {
    id: 'claim-low-saturated-fat',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Low Saturated Fat',
    description: 'Product contains 1g or less saturated fat per RACC and ≤15% calories from saturated fat',
    requirements: {
      claim_terms: ['low saturated fat', 'low in saturated fat'],
      max_per_racc: 1,
      max_calories_from_saturated_fat: 15, // percentage
      nutrient: 'saturated_fat',
      unit: 'g',
    },
    cfr_reference: '21 CFR 101.62(c)(2)',
    severity: 'error',
  },
  {
    id: 'claim-low-cholesterol',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Low Cholesterol',
    description: 'Product contains 20mg or less cholesterol per RACC',
    requirements: {
      claim_terms: ['low cholesterol', 'low in cholesterol'],
      max_per_racc: 20,
      max_saturated_fat_per_racc: 2, // Also limited
      nutrient: 'cholesterol',
      unit: 'mg',
    },
    cfr_reference: '21 CFR 101.62(d)(2)',
    severity: 'error',
  },
  {
    id: 'claim-low-sodium',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Low Sodium',
    description: 'Product contains 140mg or less sodium per RACC',
    requirements: {
      claim_terms: ['low sodium', 'low in sodium'],
      max_per_racc: 140,
      nutrient: 'sodium',
      unit: 'mg',
    },
    cfr_reference: '21 CFR 101.61(b)(2)',
    severity: 'error',
  },
  {
    id: 'claim-very-low-sodium',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Very Low Sodium',
    description: 'Product contains 35mg or less sodium per RACC',
    requirements: {
      claim_terms: ['very low sodium', 'very low in sodium'],
      max_per_racc: 35,
      nutrient: 'sodium',
      unit: 'mg',
    },
    cfr_reference: '21 CFR 101.61(b)(3)',
    severity: 'error',
  },

  // REDUCED/LESS CLAIMS
  {
    id: 'claim-reduced-calories',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Reduced/Less Calories',
    description: 'Product contains at least 25% fewer calories than reference food',
    requirements: {
      claim_terms: ['reduced calorie', 'fewer calories', 'lower calorie', 'less calories'],
      min_reduction_percentage: 25,
      nutrient: 'calories',
    },
    cfr_reference: '21 CFR 101.60(b)(3)',
    severity: 'error',
  },
  {
    id: 'claim-reduced-fat',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Reduced/Less Fat',
    description: 'Product contains at least 25% less fat than reference food',
    requirements: {
      claim_terms: ['reduced fat', 'less fat', 'lower fat'],
      min_reduction_percentage: 25,
      nutrient: 'total_fat',
    },
    cfr_reference: '21 CFR 101.62(b)(4)',
    severity: 'error',
  },
  {
    id: 'claim-reduced-saturated-fat',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Reduced/Less Saturated Fat',
    description: 'Product contains at least 25% less saturated fat than reference food',
    requirements: {
      claim_terms: ['reduced saturated fat', 'less saturated fat'],
      min_reduction_percentage: 25,
      nutrient: 'saturated_fat',
    },
    cfr_reference: '21 CFR 101.62(c)(3)',
    severity: 'error',
  },
  {
    id: 'claim-reduced-sodium',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Reduced/Less Sodium',
    description: 'Product contains at least 25% less sodium than reference food',
    requirements: {
      claim_terms: ['reduced sodium', 'less sodium', 'lower sodium'],
      min_reduction_percentage: 25,
      nutrient: 'sodium',
    },
    cfr_reference: '21 CFR 101.61(b)(4)',
    severity: 'error',
  },

  // LIGHT/LITE CLAIMS
  {
    id: 'claim-light-fat',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Light/Lite (Fat)',
    description: 'Product has 50% less fat if ≥50% calories from fat, or meets low-fat definition',
    requirements: {
      claim_terms: ['light', 'lite'],
      nutrient: 'total_fat',
      conditions: [
        {
          if: 'calories_from_fat >= 50%',
          then: 'fat_reduction >= 50%',
        },
        {
          if: 'calories_from_fat < 50%',
          then: 'fat_reduction >= 50% OR calorie_reduction >= 33.3%',
        },
      ],
    },
    cfr_reference: '21 CFR 101.56(b)',
    severity: 'error',
  },
  {
    id: 'claim-light-sodium',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Light in Sodium',
    description: 'Product contains 50% less sodium than reference food',
    requirements: {
      claim_terms: ['light in sodium', 'lite in sodium', 'lightly salted'],
      min_reduction_percentage: 50,
      nutrient: 'sodium',
    },
    cfr_reference: '21 CFR 101.56(d)',
    severity: 'error',
  },

  // GOOD SOURCE/HIGH CLAIMS
  {
    id: 'claim-good-source',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Good Source',
    description: 'Product contains 10-19% of Daily Value per RACC',
    requirements: {
      claim_terms: ['good source', 'contains', 'provides'],
      min_dv_percentage: 10,
      max_dv_percentage: 19,
      applicable_nutrients: [
        'protein',
        'vitamin_d',
        'calcium',
        'iron',
        'potassium',
        'dietary_fiber',
      ],
    },
    cfr_reference: '21 CFR 101.54(b)',
    severity: 'error',
  },
  {
    id: 'claim-high',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'High/Excellent Source',
    description: 'Product contains 20% or more of Daily Value per RACC',
    requirements: {
      claim_terms: ['high', 'rich in', 'excellent source'],
      min_dv_percentage: 20,
      applicable_nutrients: [
        'protein',
        'vitamin_d',
        'calcium',
        'iron',
        'potassium',
        'dietary_fiber',
      ],
    },
    cfr_reference: '21 CFR 101.54(b)',
    severity: 'error',
  },

  // HEALTHY CLAIM (Updated 2025)
  {
    id: 'claim-healthy-2025',
    rule_type: 'nutrient_content_claim',
    rule_category: 'optional',
    rule_name: 'Healthy (2025 Updated)',
    description: 'Product meets updated "healthy" nutrient content claim criteria (effective 2025)',
    requirements: {
      claim_terms: ['healthy'],
      effective_date: '2025-04-28',
      compliance_deadline: '2028-02-25',
      must_contain_food_group: true,
      food_groups: [
        'fruit',
        'vegetables',
        'grains',
        'fat_free_low_fat_dairy',
        'protein_foods',
      ],
      nutrient_limits: {
        added_sugars_dv_max: 20, // percentage
        sodium_dv_max: 30, // percentage
        saturated_fat_dv_max: 20, // percentage
      },
      no_limits_on: ['total_fat', 'cholesterol'],
    },
    cfr_reference: '21 CFR 101.65(d) (2025 Final Rule)',
    severity: 'error',
  },
]

/**
 * Mandatory Nutrient Display Requirements
 * Reference: 21 CFR 101.9(c)
 */
export const MANDATORY_NUTRIENTS_RULES: ComplianceRule[] = [
  {
    id: 'mandatory-nutrients-standard',
    rule_type: 'mandatory_nutrients',
    rule_category: 'required',
    rule_name: 'Mandatory Nutrient Declaration',
    description: 'All mandatory nutrients that must appear on NFP in prescribed order',
    requirements: {
      nutrients_in_order: [
        { name: 'calories', display: 'Calories', unit: 'kcal', mandatory: true },
        { name: 'total_fat', display: 'Total Fat', unit: 'g', mandatory: true, show_dv: true },
        { name: 'saturated_fat', display: 'Saturated Fat', unit: 'g', mandatory: true, show_dv: true, indent_level: 1 },
        { name: 'trans_fat', display: 'Trans Fat', unit: 'g', mandatory: true, show_dv: false, indent_level: 1 },
        { name: 'cholesterol', display: 'Cholesterol', unit: 'mg', mandatory: true, show_dv: true },
        { name: 'sodium', display: 'Sodium', unit: 'mg', mandatory: true, show_dv: true },
        { name: 'total_carbohydrates', display: 'Total Carbohydrate', unit: 'g', mandatory: true, show_dv: true },
        { name: 'dietary_fiber', display: 'Dietary Fiber', unit: 'g', mandatory: true, show_dv: true, indent_level: 1 },
        { name: 'total_sugars', display: 'Total Sugars', unit: 'g', mandatory: true, show_dv: false, indent_level: 1 },
        { name: 'added_sugars', display: 'Includes Added Sugars', unit: 'g', mandatory: true, show_dv: true, indent_level: 2 },
        { name: 'protein', display: 'Protein', unit: 'g', mandatory: true, show_dv: false },
        { name: 'vitamin_d', display: 'Vitamin D', unit: 'mcg', mandatory: true, show_dv: true },
        { name: 'calcium', display: 'Calcium', unit: 'mg', mandatory: true, show_dv: true },
        { name: 'iron', display: 'Iron', unit: 'mg', mandatory: true, show_dv: true },
        { name: 'potassium', display: 'Potassium', unit: 'mg', mandatory: true, show_dv: true },
      ],
    },
    cfr_reference: '21 CFR 101.9(c)',
    severity: 'error',
  },
]

/**
 * All FDA NFP Compliance Rules Combined
 */
export const ALL_FDA_NFP_RULES: ComplianceRule[] = [
  ...NFP_FORMAT_RULES,
  ...SERVING_SIZE_RULES,
  ...NUTRIENT_CONTENT_CLAIM_RULES,
  ...MANDATORY_NUTRIENTS_RULES,
]

/**
 * Helper function to get rules by type
 */
export function getRulesByType(ruleType: string): ComplianceRule[] {
  return ALL_FDA_NFP_RULES.filter((rule) => rule.rule_type === ruleType)
}

/**
 * Helper function to get rule by ID
 */
export function getRuleById(ruleId: string): ComplianceRule | undefined {
  return ALL_FDA_NFP_RULES.find((rule) => rule.id === ruleId)
}
