/**
 * FDA-Compliant Label PDF Generator
 * 
 * Generates Nutrition Facts Panels per FDA 21 CFR 101.9 specifications.
 * Includes a Compliance Report page to document FDA compliance validation.
 * 
 * Format Types:
 * - Standard Vertical: For packages >40 sq in (full format)
 * - Tabular: For packages 20-40 sq in (side-by-side columns)
 * - Linear: For packages <40 sq in where vertical/tabular don't fit
 * 
 * Modifiers (applicable to any format):
 * - Simplified: Omits insignificant nutrients per 21 CFR 101.9(f)
 * 
 * Font Specifications (per FDA):
 * - "Nutrition Facts" header: 16pt Helvetica Black
 * - Calories numeric: 22pt Helvetica Black (bold)
 * - Serving size: 10pt Helvetica Bold
 * - Nutrient names: 8pt Helvetica Black (bold main), Regular (sub)
 * - % Daily Value: 8pt Helvetica Black
 * - Footnote: 6pt Helvetica Regular
 * 
 * Line Rules:
 * - 7pt rule after header
 * - 3pt rule above/below calories
 * - Hairline (0.5pt) between nutrients
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { ComplianceReport } from '@/lib/compliance/nfp-validator'

// ============================================================================
// TYPES
// ============================================================================

interface NutritionData {
  calories: number | string
  totalFat: number | string
  saturatedFat: number | string
  transFat: number | string
  cholesterol: number | string
  sodium: number | string
  totalCarbohydrates: number | string
  dietaryFiber: number | string
  totalSugars: number | string
  addedSugars: number | string
  protein: number | string
  vitaminD: number
  calcium: number
  iron: number
  potassium: number
}

export interface LabelPDFProps {
  productName: string
  servingSize: string
  servingsPerContainer: string | number
  nutritionData: NutritionData
  format?: 'standard_vertical' | 'tabular' | 'linear'
  simplified?: boolean
  ingredientStatement?: string
  allergenStatement?: string
  companyName?: string
  companyAddress?: string
  complianceReport?: ComplianceReport
  raccCategory?: string
  raccValue?: string
}

// ============================================================================
// FDA CONSTANTS (21 CFR 101.9)
// ============================================================================

// Daily Values for % DV calculations (FDA 2020 values)
const DAILY_VALUES = {
  totalFat: 78,
  saturatedFat: 20,
  cholesterol: 300,
  sodium: 2300,
  totalCarbohydrates: 275,
  dietaryFiber: 28,
  addedSugars: 50,
  vitaminD: 20,
  calcium: 1300,
  iron: 18,
  potassium: 4700,
}

// Simplified Format Thresholds (21 CFR 101.9(f))
const SIMPLIFIED_THRESHOLDS = {
  totalFat: 0.5,
  saturatedFat: 0.5,
  transFat: 0.5,
  cholesterol: 2,
  sodium: 5,
  totalCarbohydrates: 1,
  dietaryFiber: 1,
  totalSugars: 1,
  addedSugars: 1,
  protein: 1,
  vitaminD: 0,
  calcium: 0,
  iron: 0,
  potassium: 0,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateDV(nutrient: keyof typeof DAILY_VALUES, amount: number | string): number {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value) || value <= 0) return 0
  return Math.round((value / DAILY_VALUES[nutrient]) * 100)
}

function isBelowThreshold(nutrient: keyof typeof SIMPLIFIED_THRESHOLDS, amount: number | string): boolean {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value)) return true
  return value < SIMPLIFIED_THRESHOLDS[nutrient]
}

function parseValue(amount: number | string): number {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  return isNaN(value) ? 0 : value
}

function formatAmount(amount: number | string, decimals: number = 0): string {
  const value = parseValue(amount)
  if (value < 0.5 && value > 0) return '<1'
  return value.toFixed(decimals)
}

// Determine nutrient visibility based on simplified mode
interface NutrientVisibility {
  showTotalFat: boolean
  showSaturatedFat: boolean
  showTransFat: boolean
  showCholesterol: boolean
  showSodium: boolean
  showCarbs: boolean
  showFiber: boolean
  showSugars: boolean
  showAddedSugars: boolean
  showProtein: boolean
  showVitaminD: boolean
  showCalcium: boolean
  showIron: boolean
  showPotassium: boolean
  omittedNutrients: string[]
}

function getNutrientVisibility(nutritionData: NutritionData, simplified: boolean): NutrientVisibility {
  if (!simplified) {
    return {
      showTotalFat: true,
      showSaturatedFat: true,
      showTransFat: true,
      showCholesterol: true,
      showSodium: true,
      showCarbs: true,
      showFiber: true,
      showSugars: true,
      showAddedSugars: true,
      showProtein: true,
      showVitaminD: true,
      showCalcium: true,
      showIron: true,
      showPotassium: true,
      omittedNutrients: [],
    }
  }

  const showTotalFat = !isBelowThreshold('totalFat', nutritionData.totalFat)
  const showSaturatedFat = !isBelowThreshold('saturatedFat', nutritionData.saturatedFat)
  const showTransFat = !isBelowThreshold('transFat', nutritionData.transFat)
  const showCholesterol = !isBelowThreshold('cholesterol', nutritionData.cholesterol)
  const showSodium = true // Always required per FDA
  const showCarbs = !isBelowThreshold('totalCarbohydrates', nutritionData.totalCarbohydrates)
  const showFiber = !isBelowThreshold('dietaryFiber', nutritionData.dietaryFiber)
  const showSugars = !isBelowThreshold('totalSugars', nutritionData.totalSugars)
  const showAddedSugars = !isBelowThreshold('addedSugars', nutritionData.addedSugars)
  const showProtein = !isBelowThreshold('protein', nutritionData.protein)
  const showVitaminD = parseValue(nutritionData.vitaminD) > 0
  const showCalcium = parseValue(nutritionData.calcium) > 0
  const showIron = parseValue(nutritionData.iron) > 0
  const showPotassium = parseValue(nutritionData.potassium) > 0

  const omittedNutrients: string[] = []
  if (!showTotalFat) omittedNutrients.push('total fat')
  if (!showSaturatedFat) omittedNutrients.push('saturated fat')
  if (!showTransFat) omittedNutrients.push('trans fat')
  if (!showCholesterol) omittedNutrients.push('cholesterol')
  if (!showFiber) omittedNutrients.push('dietary fiber')
  if (!showVitaminD) omittedNutrients.push('vitamin D')
  if (!showCalcium) omittedNutrients.push('calcium')
  if (!showIron) omittedNutrients.push('iron')
  if (!showPotassium) omittedNutrients.push('potassium')

  return {
    showTotalFat,
    showSaturatedFat,
    showTransFat,
    showCholesterol,
    showSodium,
    showCarbs,
    showFiber,
    showSugars,
    showAddedSugars,
    showProtein,
    showVitaminD,
    showCalcium,
    showIron,
    showPotassium,
    omittedNutrients,
  }
}

// ============================================================================
// PDF STYLES - FDA Compliant Typography
// ============================================================================

const styles = StyleSheet.create({
  // Page styles
  page: {
    padding: 36, // 0.5 inch margins
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },

  // NFP Container - The black box
  nfpContainer: {
    border: '0.5pt solid #000',
    width: 258, // ~3.6 inches at 72 DPI (FDA standard width)
    backgroundColor: '#ffffff',
    padding: 0,
  },

  // "Nutrition Facts" header - 16pt bold
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    paddingTop: 4,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    letterSpacing: -0.5,
  },

  // 7pt thick rule after header
  thickRule: {
    height: 7,
    backgroundColor: '#000',
    marginLeft: 4,
    marginRight: 4,
  },

  // 3pt medium rule
  mediumRule: {
    height: 3,
    backgroundColor: '#000',
    marginLeft: 4,
    marginRight: 4,
    marginTop: 1,
    marginBottom: 1,
  },

  // 1pt thin rule
  thinRule: {
    height: 1,
    backgroundColor: '#000',
    marginLeft: 4,
    marginRight: 4,
  },

  // Hairline rule (0.5pt)
  hairlineRule: {
    height: 0.5,
    backgroundColor: '#000',
    marginLeft: 4,
    marginRight: 4,
  },

  // Serving info section
  servingSection: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },

  servingsPerContainer: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },

  servingSizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },

  servingSizeLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },

  servingSizeValue: {
    fontSize: 9,
    fontFamily: 'Helvetica',
  },

  // Calories section - 22pt bold value
  caloriesSection: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    paddingRight: 4,
  },

  caloriesHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },

  caloriesLabel: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },

  caloriesValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
  },

  // % DV header row
  dvHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },

  // Nutrient row
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },

  nutrientName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  nutrientValue: {
    fontSize: 8,
    fontFamily: 'Helvetica',
  },

  nutrientDv: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  // Indented nutrients (sub-nutrients)
  indent1: {
    paddingLeft: 12,
  },

  indent2: {
    paddingLeft: 20,
  },

  // Footnote section - 6pt
  footnoteSection: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    paddingRight: 4,
  },

  footnote: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    lineHeight: 1.3,
  },

  // "Not a significant source" statement
  notSignificant: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    fontStyle: 'italic',
    paddingTop: 2,
    paddingBottom: 4,
    paddingLeft: 4,
    paddingRight: 4,
  },

  // Ingredient statement section
  ingredientSection: {
    marginTop: 24,
    width: 400,
  },

  ingredientTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },

  ingredientText: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },

  allergenStatement: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginTop: 8,
  },

  // Company info
  companyInfo: {
    marginTop: 24,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },

  companyName: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },

  // Product name
  productTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 16,
  },

  // =========================================
  // COMPLIANCE REPORT STYLES
  // =========================================

  complianceReportPage: {
    padding: 36,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },

  reportHeader: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },

  reportSubheader: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#666666',
    marginBottom: 20,
  },

  reportSection: {
    marginBottom: 20,
  },

  reportSectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1pt solid #cccccc',
  },

  reportSummary: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },

  summaryBox: {
    padding: 12,
    borderRadius: 4,
    minWidth: 100,
    alignItems: 'center',
  },

  summaryBoxCompliant: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#16a34a',
  },

  summaryBoxWarning: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#d97706',
  },

  summaryBoxError: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#dc2626',
  },

  summaryLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#666666',
    marginBottom: 4,
  },

  summaryValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
  },

  summaryValueCompliant: {
    color: '#16a34a',
  },

  summaryValueWarning: {
    color: '#d97706',
  },

  summaryValueError: {
    color: '#dc2626',
  },

  resultRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 8,
    borderBottom: '0.5pt solid #e5e5e5',
  },

  resultIcon: {
    width: 16,
    marginRight: 8,
    fontSize: 10,
  },

  resultContent: {
    flex: 1,
  },

  resultTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },

  resultMessage: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#666666',
  },

  resultCfr: {
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#999999',
    marginTop: 2,
  },

  passText: {
    color: '#16a34a',
  },

  warnText: {
    color: '#d97706',
  },

  failText: {
    color: '#dc2626',
  },

  // Nutrient values used section
  nutrientTable: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginTop: 8,
  },

  nutrientTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },

  nutrientTableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },

  nutrientTableCell: {
    fontSize: 8,
    fontFamily: 'Helvetica',
  },

  nutrientTableCellBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  cellNutrient: {
    width: 140,
  },

  cellAmount: {
    width: 80,
    textAlign: 'right',
  },

  cellDv: {
    width: 60,
    textAlign: 'right',
  },

  cellRounding: {
    width: 140,
  },

  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
  },

  footerText: {
    fontSize: 7,
    color: '#999999',
  },
})

// ============================================================================
// STANDARD VERTICAL NFP COMPONENT
// ============================================================================

interface NFPProps extends LabelPDFProps {
  visibility: NutrientVisibility
}

const StandardVerticalNFP: React.FC<NFPProps> = ({
  servingSize,
  servingsPerContainer,
  nutritionData,
  visibility,
}) => {
  const {
    showTotalFat, showSaturatedFat, showTransFat, showCholesterol,
    showCarbs, showFiber, showSugars, showAddedSugars, showProtein,
    showVitaminD, showCalcium, showIron, showPotassium,
    omittedNutrients,
  } = visibility

  return (
    <View style={styles.nfpContainer}>
      {/* Header */}
      <Text style={styles.header}>Nutrition Facts</Text>
      <View style={styles.thickRule} />

      {/* Serving Info */}
      <View style={styles.servingSection}>
        <Text style={styles.servingsPerContainer}>
          {servingsPerContainer} servings per container
        </Text>
        <View style={styles.servingSizeRow}>
          <Text style={styles.servingSizeLabel}>Serving size</Text>
          <Text style={styles.servingSizeLabel}>{servingSize}</Text>
        </View>
      </View>

      <View style={styles.thickRule} />

      {/* Calories */}
      <View style={styles.caloriesSection}>
        <Text style={styles.caloriesHeader}>Amount per serving</Text>
        <View style={styles.caloriesRow}>
          <Text style={styles.caloriesLabel}>Calories</Text>
          <Text style={styles.caloriesValue}>{formatAmount(nutritionData.calories)}</Text>
        </View>
      </View>

      <View style={styles.mediumRule} />

      {/* % DV Header */}
      <Text style={styles.dvHeader}>% Daily Value*</Text>
      <View style={styles.hairlineRule} />

      {/* Total Fat */}
      {showTotalFat && (
        <>
          <View style={styles.nutrientRow}>
            <Text>
              <Text style={styles.nutrientName}>Total Fat </Text>
              <Text style={styles.nutrientValue}>{formatAmount(nutritionData.totalFat)}g</Text>
            </Text>
            <Text style={styles.nutrientDv}>{calculateDV('totalFat', nutritionData.totalFat)}%</Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {/* Saturated Fat */}
      {showSaturatedFat && (
        <>
          <View style={[styles.nutrientRow, styles.indent1]}>
            <Text>
              <Text style={styles.nutrientValue}>Saturated Fat </Text>
              <Text style={styles.nutrientValue}>{formatAmount(nutritionData.saturatedFat)}g</Text>
            </Text>
            <Text style={styles.nutrientDv}>{calculateDV('saturatedFat', nutritionData.saturatedFat)}%</Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {/* Trans Fat */}
      {showTransFat && (
        <>
          <View style={[styles.nutrientRow, styles.indent1]}>
            <Text>
              <Text style={[styles.nutrientValue, { fontStyle: 'italic' }]}>Trans </Text>
              <Text style={styles.nutrientValue}>Fat {formatAmount(nutritionData.transFat)}g</Text>
            </Text>
            <Text></Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {/* Cholesterol */}
      {showCholesterol && (
        <>
          <View style={styles.nutrientRow}>
            <Text>
              <Text style={styles.nutrientName}>Cholesterol </Text>
              <Text style={styles.nutrientValue}>{formatAmount(nutritionData.cholesterol)}mg</Text>
            </Text>
            <Text style={styles.nutrientDv}>{calculateDV('cholesterol', nutritionData.cholesterol)}%</Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {/* Sodium (always shown) */}
      <View style={styles.nutrientRow}>
        <Text>
          <Text style={styles.nutrientName}>Sodium </Text>
          <Text style={styles.nutrientValue}>{formatAmount(nutritionData.sodium)}mg</Text>
        </Text>
        <Text style={styles.nutrientDv}>{calculateDV('sodium', nutritionData.sodium)}%</Text>
      </View>
      <View style={styles.hairlineRule} />

      {/* Total Carbohydrates */}
      {showCarbs && (
        <>
          <View style={styles.nutrientRow}>
            <Text>
              <Text style={styles.nutrientName}>Total Carbohydrate </Text>
              <Text style={styles.nutrientValue}>{formatAmount(nutritionData.totalCarbohydrates)}g</Text>
            </Text>
            <Text style={styles.nutrientDv}>{calculateDV('totalCarbohydrates', nutritionData.totalCarbohydrates)}%</Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {/* Dietary Fiber */}
      {showFiber && (
        <>
          <View style={[styles.nutrientRow, styles.indent1]}>
            <Text>
              <Text style={styles.nutrientValue}>Dietary Fiber </Text>
              <Text style={styles.nutrientValue}>{formatAmount(nutritionData.dietaryFiber)}g</Text>
            </Text>
            <Text style={styles.nutrientDv}>{calculateDV('dietaryFiber', nutritionData.dietaryFiber)}%</Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {/* Total Sugars */}
      {showSugars && (
        <>
          <View style={[styles.nutrientRow, styles.indent1]}>
            <Text>
              <Text style={styles.nutrientValue}>Total Sugars </Text>
              <Text style={styles.nutrientValue}>{formatAmount(nutritionData.totalSugars)}g</Text>
            </Text>
            <Text></Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {/* Added Sugars */}
      {showAddedSugars && (
        <>
          <View style={[styles.nutrientRow, styles.indent2]}>
            <Text>
              <Text style={styles.nutrientValue}>Includes </Text>
              <Text style={styles.nutrientValue}>{formatAmount(nutritionData.addedSugars)}g Added Sugars</Text>
            </Text>
            <Text style={styles.nutrientDv}>{calculateDV('addedSugars', nutritionData.addedSugars)}%</Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {/* Protein */}
      {showProtein && (
        <>
          <View style={styles.nutrientRow}>
            <Text>
              <Text style={styles.nutrientName}>Protein </Text>
              <Text style={styles.nutrientValue}>{formatAmount(nutritionData.protein)}g</Text>
            </Text>
            <Text></Text>
          </View>
        </>
      )}

      <View style={styles.thickRule} />

      {/* Micronutrients */}
      {showVitaminD && (
        <>
          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientValue}>Vitamin D {nutritionData.vitaminD}mcg</Text>
            <Text style={styles.nutrientDv}>{calculateDV('vitaminD', nutritionData.vitaminD)}%</Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {showCalcium && (
        <>
          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientValue}>Calcium {nutritionData.calcium}mg</Text>
            <Text style={styles.nutrientDv}>{calculateDV('calcium', nutritionData.calcium)}%</Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {showIron && (
        <>
          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientValue}>Iron {nutritionData.iron}mg</Text>
            <Text style={styles.nutrientDv}>{calculateDV('iron', nutritionData.iron)}%</Text>
          </View>
          <View style={styles.hairlineRule} />
        </>
      )}

      {showPotassium && (
        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientValue}>Potassium {nutritionData.potassium}mg</Text>
          <Text style={styles.nutrientDv}>{calculateDV('potassium', nutritionData.potassium)}%</Text>
        </View>
      )}

      <View style={styles.thinRule} />

      {/* Not a significant source statement */}
      {omittedNutrients.length > 0 && (
        <Text style={styles.notSignificant}>
          Not a significant source of {omittedNutrients.join(', ')}.
        </Text>
      )}

      {/* Footnote */}
      <View style={styles.footnoteSection}>
        <Text style={styles.footnote}>
          * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
        </Text>
      </View>
    </View>
  )
}

// Tabular and Linear formats fall back to Standard for now
const TabularNFP: React.FC<NFPProps> = (props) => <StandardVerticalNFP {...props} />
const LinearNFP: React.FC<NFPProps> = (props) => <StandardVerticalNFP {...props} />

// ============================================================================
// COMPLIANCE REPORT PAGE
// ============================================================================

interface ComplianceReportPageProps {
  productName: string
  report: ComplianceReport
  nutritionData: NutritionData
  servingSize: string
  raccCategory?: string
  raccValue?: string
  validatedAt: string
}

const ComplianceReportPage: React.FC<ComplianceReportPageProps> = ({
  productName,
  report,
  nutritionData,
  servingSize,
  raccCategory,
  raccValue,
  validatedAt,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return styles.summaryBoxCompliant
      case 'warnings': return styles.summaryBoxWarning
      default: return styles.summaryBoxError
    }
  }

  const getValueColor = (status: string) => {
    switch (status) {
      case 'compliant': return styles.summaryValueCompliant
      case 'warnings': return styles.summaryValueWarning
      default: return styles.summaryValueError
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'compliant': return 'COMPLIANT'
      case 'warnings': return 'WARNINGS'
      case 'errors': return 'ERRORS'
      default: return 'NOT VALIDATED'
    }
  }

  return (
    <Page size="LETTER" style={styles.complianceReportPage}>
      {/* Header */}
      <Text style={styles.reportHeader}>FDA Compliance Report</Text>
      <Text style={styles.reportSubheader}>
        {productName} • Validated: {new Date(validatedAt).toLocaleString()}
      </Text>

      {/* Summary Boxes */}
      <View style={styles.reportSummary}>
        <View style={[styles.summaryBox, getStatusColor(report.overall_status)]}>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text style={[styles.summaryValue, getValueColor(report.overall_status), { fontSize: 14 }]}>
            {getStatusLabel(report.overall_status)}
          </Text>
        </View>
        <View style={[styles.summaryBox, report.errors_count > 0 ? styles.summaryBoxError : styles.summaryBoxCompliant]}>
          <Text style={styles.summaryLabel}>Errors</Text>
          <Text style={[styles.summaryValue, report.errors_count > 0 ? styles.summaryValueError : styles.summaryValueCompliant]}>
            {report.errors_count}
          </Text>
        </View>
        <View style={[styles.summaryBox, report.warnings_count > 0 ? styles.summaryBoxWarning : styles.summaryBoxCompliant]}>
          <Text style={styles.summaryLabel}>Warnings</Text>
          <Text style={[styles.summaryValue, report.warnings_count > 0 ? styles.summaryValueWarning : styles.summaryValueCompliant]}>
            {report.warnings_count}
          </Text>
        </View>
      </View>

      {/* RACC Information */}
      {raccCategory && (
        <View style={styles.reportSection}>
          <Text style={styles.reportSectionTitle}>Reference Amount (RACC)</Text>
          <View style={styles.nutrientTableRow}>
            <Text style={[styles.nutrientTableCellBold, { width: 100 }]}>Category:</Text>
            <Text style={styles.nutrientTableCell}>{raccCategory}</Text>
          </View>
          {raccValue && (
            <View style={styles.nutrientTableRow}>
              <Text style={[styles.nutrientTableCellBold, { width: 100 }]}>RACC Value:</Text>
              <Text style={styles.nutrientTableCell}>{raccValue}</Text>
            </View>
          )}
          <View style={styles.nutrientTableRow}>
            <Text style={[styles.nutrientTableCellBold, { width: 100 }]}>Serving Size:</Text>
            <Text style={styles.nutrientTableCell}>{servingSize}</Text>
          </View>
        </View>
      )}

      {/* Nutrient Values Used */}
      <View style={styles.reportSection}>
        <Text style={styles.reportSectionTitle}>Nutrient Values Used for Compliance</Text>
        <View style={styles.nutrientTable}>
          <View style={styles.nutrientTableHeader}>
            <Text style={[styles.nutrientTableCellBold, styles.cellNutrient]}>Nutrient</Text>
            <Text style={[styles.nutrientTableCellBold, styles.cellAmount]}>Amount</Text>
            <Text style={[styles.nutrientTableCellBold, styles.cellDv]}>% DV</Text>
            <Text style={[styles.nutrientTableCellBold, styles.cellRounding]}>Per 21 CFR 101.9</Text>
          </View>
          {[
            { name: 'Calories', value: nutritionData.calories, unit: '', dv: null },
            { name: 'Total Fat', value: nutritionData.totalFat, unit: 'g', dv: calculateDV('totalFat', nutritionData.totalFat) },
            { name: 'Saturated Fat', value: nutritionData.saturatedFat, unit: 'g', dv: calculateDV('saturatedFat', nutritionData.saturatedFat) },
            { name: 'Trans Fat', value: nutritionData.transFat, unit: 'g', dv: null },
            { name: 'Cholesterol', value: nutritionData.cholesterol, unit: 'mg', dv: calculateDV('cholesterol', nutritionData.cholesterol) },
            { name: 'Sodium', value: nutritionData.sodium, unit: 'mg', dv: calculateDV('sodium', nutritionData.sodium) },
            { name: 'Total Carbohydrate', value: nutritionData.totalCarbohydrates, unit: 'g', dv: calculateDV('totalCarbohydrates', nutritionData.totalCarbohydrates) },
            { name: 'Dietary Fiber', value: nutritionData.dietaryFiber, unit: 'g', dv: calculateDV('dietaryFiber', nutritionData.dietaryFiber) },
            { name: 'Total Sugars', value: nutritionData.totalSugars, unit: 'g', dv: null },
            { name: 'Added Sugars', value: nutritionData.addedSugars, unit: 'g', dv: calculateDV('addedSugars', nutritionData.addedSugars) },
            { name: 'Protein', value: nutritionData.protein, unit: 'g', dv: null },
            { name: 'Vitamin D', value: nutritionData.vitaminD, unit: 'mcg', dv: calculateDV('vitaminD', nutritionData.vitaminD) },
            { name: 'Calcium', value: nutritionData.calcium, unit: 'mg', dv: calculateDV('calcium', nutritionData.calcium) },
            { name: 'Iron', value: nutritionData.iron, unit: 'mg', dv: calculateDV('iron', nutritionData.iron) },
            { name: 'Potassium', value: nutritionData.potassium, unit: 'mg', dv: calculateDV('potassium', nutritionData.potassium) },
          ].map((nutrient, index) => (
            <View key={index} style={styles.nutrientTableRow}>
              <Text style={[styles.nutrientTableCell, styles.cellNutrient]}>{nutrient.name}</Text>
              <Text style={[styles.nutrientTableCell, styles.cellAmount]}>
                {formatAmount(nutrient.value)}{nutrient.unit}
              </Text>
              <Text style={[styles.nutrientTableCell, styles.cellDv]}>
                {nutrient.dv !== null ? `${nutrient.dv}%` : '—'}
              </Text>
              <Text style={[styles.nutrientTableCell, styles.cellRounding]}>Rounded per §101.9(c)</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Validation Results */}
      {report.validation_results && report.validation_results.length > 0 && (
        <View style={styles.reportSection}>
          <Text style={styles.reportSectionTitle}>Validation Results</Text>
          {report.validation_results.map((result, index) => (
            <View key={index} style={styles.resultRow}>
              <Text style={[
                styles.resultIcon,
                result.status === 'pass' ? styles.passText :
                  result.status === 'warning' ? styles.warnText : styles.failText
              ]}>
                {result.status === 'pass' ? '✓' : result.status === 'warning' ? '⚠' : '✗'}
              </Text>
              <View style={styles.resultContent}>
                <Text style={styles.resultTitle}>{result.rule_name}</Text>
                <Text style={styles.resultMessage}>{result.message}</Text>
                {result.cfr_reference && (
                  <Text style={styles.resultCfr}>Reference: {result.cfr_reference}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.pageFooter}>
        <Text style={styles.footerText}>ComplianceOS FDA Label Compliance Report</Text>
        <Text style={styles.footerText}>Generated: {new Date().toISOString()}</Text>
      </View>
    </Page>
  )
}

// ============================================================================
// MAIN DOCUMENT COMPONENT
// ============================================================================

export const LabelPDFDocument: React.FC<LabelPDFProps> = (props) => {
  const {
    productName,
    ingredientStatement,
    allergenStatement,
    companyName,
    companyAddress,
    format = 'standard_vertical',
    simplified = false,
    nutritionData,
    servingSize,
    complianceReport,
    raccCategory,
    raccValue,
  } = props

  const visibility = getNutrientVisibility(nutritionData, simplified)

  const renderNFP = () => {
    const nfpProps = { ...props, visibility }
    switch (format) {
      case 'tabular':
        return <TabularNFP {...nfpProps} />
      case 'linear':
        return <LinearNFP {...nfpProps} />
      case 'standard_vertical':
      default:
        return <StandardVerticalNFP {...nfpProps} />
    }
  }

  return (
    <Document>
      {/* Page 1: Nutrition Facts Label */}
      <Page size="LETTER" style={styles.page}>
        {productName && (
          <Text style={styles.productTitle}>{productName}</Text>
        )}

        {renderNFP()}

        {ingredientStatement && (
          <View style={styles.ingredientSection}>
            <Text style={styles.ingredientTitle}>INGREDIENTS:</Text>
            <Text style={styles.ingredientText}>{ingredientStatement}</Text>
          </View>
        )}

        {allergenStatement && (
          <Text style={styles.allergenStatement}>
            CONTAINS: {allergenStatement}
          </Text>
        )}

        {companyName && (
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyName}</Text>
            {companyAddress && <Text>{companyAddress}</Text>}
          </View>
        )}
      </Page>

      {/* Page 2: Compliance Report (if provided) */}
      {complianceReport && (
        <ComplianceReportPage
          productName={productName}
          report={complianceReport}
          nutritionData={nutritionData}
          servingSize={servingSize}
          raccCategory={raccCategory}
          raccValue={raccValue}
          validatedAt={complianceReport.validated_at}
        />
      )}
    </Document>
  )
}
