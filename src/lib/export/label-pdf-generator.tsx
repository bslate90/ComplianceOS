/**
 * Label PDF Generator
 * Generates FDA-compliant Nutrition Facts Panel PDFs
 * 
 * Supports formats:
 * - Standard Vertical: Full height vertical NFP
 * - Tabular: Side-by-side format for wide packages
 * - Linear: Inline format for small packages
 * 
 * Supports modifiers:
 * - Simplified: Omits nutrients below significance thresholds per FDA 21 CFR 101.9
 *   Can be applied to ANY format to accommodate package sizing
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// Register fonts (using Helvetica as fallback, which is built-in)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

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

interface LabelPDFProps {
  productName: string
  servingSize: string
  servingsPerContainer: string | number
  nutritionData: NutritionData
  format?: 'standard_vertical' | 'tabular' | 'linear'
  simplified?: boolean // Modifier: omit insignificant nutrients
  ingredientStatement?: string
  allergenStatement?: string
  companyName?: string
  companyAddress?: string
}

// Daily Values for % calculations (FDA 2020 values)
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

// FDA Simplified Format Thresholds (21 CFR 101.9)
// Nutrients can be omitted if below these amounts per serving
const SIMPLIFIED_THRESHOLDS = {
  totalFat: 0.5,        // g - can omit if <0.5g
  saturatedFat: 0.5,    // g
  transFat: 0.5,        // g
  cholesterol: 2,       // mg - can omit if <2mg
  sodium: 5,            // mg - can omit if <5mg (but usually shown)
  totalCarbohydrates: 1, // g - can omit if <1g
  dietaryFiber: 1,      // g
  totalSugars: 1,       // g
  addedSugars: 1,       // g
  protein: 1,           // g - can omit if <1g
  vitaminD: 0,          // mcg - can omit if 0
  calcium: 0,           // mg
  iron: 0,              // mg
  potassium: 0,         // mg
}

// Calculate % Daily Value
function calculateDV(nutrient: keyof typeof DAILY_VALUES, amount: number | string): number {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value) || value <= 0) return 0
  return Math.round((value / DAILY_VALUES[nutrient]) * 100)
}

// Check if nutrient is below simplified threshold
function isBelowThreshold(nutrient: keyof typeof SIMPLIFIED_THRESHOLDS, amount: number | string): boolean {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value)) return true
  return value < SIMPLIFIED_THRESHOLDS[nutrient]
}

// Parse numeric value
function parseValue(amount: number | string): number {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  return isNaN(value) ? 0 : value
}

// Determine which nutrients to show based on simplified mode
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
    // Show all nutrients in standard mode
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

  // Simplified mode - check thresholds
  const showTotalFat = !isBelowThreshold('totalFat', nutritionData.totalFat)
  const showSaturatedFat = !isBelowThreshold('saturatedFat', nutritionData.saturatedFat)
  const showTransFat = !isBelowThreshold('transFat', nutritionData.transFat)
  const showCholesterol = !isBelowThreshold('cholesterol', nutritionData.cholesterol)
  const showSodium = true // Always show sodium per FDA
  const showCarbs = !isBelowThreshold('totalCarbohydrates', nutritionData.totalCarbohydrates)
  const showFiber = !isBelowThreshold('dietaryFiber', nutritionData.dietaryFiber)
  const showSugars = !isBelowThreshold('totalSugars', nutritionData.totalSugars)
  const showAddedSugars = !isBelowThreshold('addedSugars', nutritionData.addedSugars)
  const showProtein = !isBelowThreshold('protein', nutritionData.protein)
  const showVitaminD = parseValue(nutritionData.vitaminD) > 0
  const showCalcium = parseValue(nutritionData.calcium) > 0
  const showIron = parseValue(nutritionData.iron) > 0
  const showPotassium = parseValue(nutritionData.potassium) > 0

  // Collect omitted nutrients for "Not a significant source" statement
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

// PDF Styles - with inset separator bars
const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  nfpContainer: {
    border: '1pt solid #000',
    width: 240,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    paddingRight: 4,
  },
  // Thick separator bar with margin from edges
  thickSeparator: {
    height: 8,
    backgroundColor: '#000',
    marginLeft: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  // Medium separator bar with margin from edges
  mediumSeparator: {
    height: 5,
    backgroundColor: '#000',
    marginLeft: 4,
    marginRight: 4,
    marginTop: 2,
    marginBottom: 2,
  },
  // Thin separator bar with margin from edges
  thinSeparator: {
    height: 4,
    backgroundColor: '#000',
    marginLeft: 4,
    marginRight: 4,
    marginTop: 2,
    marginBottom: 2,
  },
  // Hairline separator for between rows
  hairlineSeparator: {
    height: 1,
    backgroundColor: '#000',
    marginLeft: 4,
    marginRight: 4,
  },
  // Calories thick separator (larger)
  caloriesSeparator: {
    height: 10,
    backgroundColor: '#000',
    marginLeft: 4,
    marginRight: 4,
    marginTop: 2,
    marginBottom: 2,
  },
  servingInfo: {
    fontSize: 10,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },
  servingSizeBold: {
    fontWeight: 'bold',
  },
  servingsPerContainer: {
    marginTop: 2,
  },
  caloriesSection: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },
  caloriesLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  caloriesValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  dvHeader: {
    fontSize: 8,
    textAlign: 'right',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    fontSize: 8,
  },
  nutrientName: {
    fontWeight: 'bold',
  },
  nutrientIndent1: {
    paddingLeft: 8,
  },
  nutrientIndent2: {
    paddingLeft: 16,
  },
  dvValue: {
    fontWeight: 'bold',
  },
  footnote: {
    fontSize: 6,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    paddingRight: 4,
  },
  micronutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    fontSize: 8,
  },
  notSignificant: {
    fontSize: 7,
    paddingTop: 4,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    fontStyle: 'italic',
  },
  ingredientSection: {
    marginTop: 20,
    padding: 10,
    border: '1pt solid #ccc',
    width: 400,
  },
  ingredientTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ingredientText: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  companyInfo: {
    marginTop: 20,
    fontSize: 8,
  },
})

// Standard Vertical NFP Component (with optional simplified modifier)
const StandardVerticalNFP: React.FC<LabelPDFProps & { visibility: NutrientVisibility }> = ({
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

      {/* Thick separator under header */}
      <View style={styles.thickSeparator} />

      {/* Serving Info */}
      <View style={styles.servingInfo}>
        <Text style={styles.servingSizeBold}>
          Serving size <Text>{servingSize}</Text>
        </Text>
        <Text style={styles.servingsPerContainer}>
          Servings per container {servingsPerContainer}
        </Text>
      </View>

      {/* Medium separator */}
      <View style={styles.mediumSeparator} />

      {/* Calories */}
      <View style={styles.caloriesSection}>
        <Text style={styles.caloriesLabel}>Amount per serving</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.caloriesLabel}>Calories</Text>
          <Text style={styles.caloriesValue}>{nutritionData.calories}</Text>
        </View>
      </View>

      {/* Thick separator under calories */}
      <View style={styles.caloriesSeparator} />

      {/* % Daily Value Header */}
      <Text style={styles.dvHeader}>% Daily Value*</Text>

      {/* Thin separator */}
      <View style={styles.thinSeparator} />

      {/* Total Fat */}
      {showTotalFat && (
        <>
          <View style={styles.nutrientRow}>
            <Text>
              <Text style={styles.nutrientName}>Total Fat</Text> {nutritionData.totalFat}g
            </Text>
            <Text style={styles.dvValue}>{calculateDV('totalFat', nutritionData.totalFat)}%</Text>
          </View>
          <View style={styles.hairlineSeparator} />
        </>
      )}

      {/* Saturated Fat */}
      {showSaturatedFat && (
        <>
          <View style={styles.nutrientRow}>
            <Text style={showTotalFat ? styles.nutrientIndent1 : undefined}>
              Saturated Fat {nutritionData.saturatedFat}g
            </Text>
            <Text style={styles.dvValue}>{calculateDV('saturatedFat', nutritionData.saturatedFat)}%</Text>
          </View>
          <View style={styles.hairlineSeparator} />
        </>
      )}

      {/* Trans Fat */}
      {showTransFat && (
        <>
          <View style={styles.nutrientRow}>
            <Text style={showTotalFat ? styles.nutrientIndent1 : undefined}>
              <Text style={{ fontStyle: 'italic' }}>Trans</Text> Fat {nutritionData.transFat}g
            </Text>
            <Text></Text>
          </View>
          <View style={styles.hairlineSeparator} />
        </>
      )}

      {/* Cholesterol */}
      {showCholesterol && (
        <>
          <View style={styles.nutrientRow}>
            <Text>
              <Text style={styles.nutrientName}>Cholesterol</Text> {nutritionData.cholesterol}mg
            </Text>
            <Text style={styles.dvValue}>{calculateDV('cholesterol', nutritionData.cholesterol)}%</Text>
          </View>
          <View style={styles.hairlineSeparator} />
        </>
      )}

      {/* Sodium - always shown */}
      <View style={styles.nutrientRow}>
        <Text>
          <Text style={styles.nutrientName}>Sodium</Text> {nutritionData.sodium}mg
        </Text>
        <Text style={styles.dvValue}>{calculateDV('sodium', nutritionData.sodium)}%</Text>
      </View>
      <View style={styles.hairlineSeparator} />

      {/* Total Carbohydrates */}
      {showCarbs && (
        <>
          <View style={styles.nutrientRow}>
            <Text>
              <Text style={styles.nutrientName}>Total Carbohydrate</Text>{' '}
              {nutritionData.totalCarbohydrates}g
            </Text>
            <Text style={styles.dvValue}>{calculateDV('totalCarbohydrates', nutritionData.totalCarbohydrates)}%</Text>
          </View>
          <View style={styles.hairlineSeparator} />
        </>
      )}

      {/* Dietary Fiber */}
      {showFiber && (
        <>
          <View style={styles.nutrientRow}>
            <Text style={showCarbs ? styles.nutrientIndent1 : undefined}>
              Dietary Fiber {nutritionData.dietaryFiber}g
            </Text>
            <Text style={styles.dvValue}>{calculateDV('dietaryFiber', nutritionData.dietaryFiber)}%</Text>
          </View>
          <View style={styles.hairlineSeparator} />
        </>
      )}

      {/* Total Sugars */}
      {showSugars && (
        <>
          <View style={styles.nutrientRow}>
            <Text style={showCarbs ? styles.nutrientIndent1 : undefined}>
              Total Sugars {nutritionData.totalSugars}g
            </Text>
            <Text></Text>
          </View>
          <View style={styles.hairlineSeparator} />
        </>
      )}

      {/* Added Sugars */}
      {showAddedSugars && (
        <>
          <View style={styles.nutrientRow}>
            <Text style={showCarbs ? styles.nutrientIndent2 : styles.nutrientIndent1}>
              Includes {nutritionData.addedSugars}g Added Sugars
            </Text>
            <Text style={styles.dvValue}>{calculateDV('addedSugars', nutritionData.addedSugars)}%</Text>
          </View>
        </>
      )}

      {/* Medium separator */}
      <View style={styles.mediumSeparator} />

      {/* Protein */}
      {showProtein && (
        <>
          <View style={styles.nutrientRow}>
            <Text>
              <Text style={styles.nutrientName}>Protein</Text> {nutritionData.protein}g
            </Text>
            <Text></Text>
          </View>

          {/* Medium separator before micronutrients */}
          <View style={styles.mediumSeparator} />
        </>
      )}

      {/* Micronutrients */}
      {showVitaminD && (
        <>
          <View style={styles.micronutrientRow}>
            <Text>Vitamin D {nutritionData.vitaminD}mcg</Text>
            <Text style={styles.dvValue}>{calculateDV('vitaminD', nutritionData.vitaminD)}%</Text>
          </View>
          <View style={styles.hairlineSeparator} />
        </>
      )}

      {showCalcium && (
        <>
          <View style={styles.micronutrientRow}>
            <Text>Calcium {nutritionData.calcium}mg</Text>
            <Text style={styles.dvValue}>{calculateDV('calcium', nutritionData.calcium)}%</Text>
          </View>
          <View style={styles.hairlineSeparator} />
        </>
      )}

      {showIron && (
        <>
          <View style={styles.micronutrientRow}>
            <Text>Iron {nutritionData.iron}mg</Text>
            <Text style={styles.dvValue}>{calculateDV('iron', nutritionData.iron)}%</Text>
          </View>
          <View style={styles.hairlineSeparator} />
        </>
      )}

      {showPotassium && (
        <>
          <View style={styles.micronutrientRow}>
            <Text>Potassium {nutritionData.potassium}mg</Text>
            <Text style={styles.dvValue}>{calculateDV('potassium', nutritionData.potassium)}%</Text>
          </View>
        </>
      )}

      {/* Thin separator */}
      <View style={styles.thinSeparator} />

      {/* Not a significant source statement - only in simplified mode */}
      {omittedNutrients.length > 0 && (
        <Text style={styles.notSignificant}>
          Not a significant source of {omittedNutrients.join(', ')}.
        </Text>
      )}

      {/* Footnote */}
      <View style={styles.footnote}>
        <Text>
          * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes
          to a daily diet. 2,000 calories a day is used for general nutrition advice.
        </Text>
      </View>
    </View>
  )
}

// TODO: Tabular NFP Component (side-by-side format)
const TabularNFP: React.FC<LabelPDFProps & { visibility: NutrientVisibility }> = (props) => {
  // For now, fallback to vertical format
  // Tabular format would arrange nutrients in columns
  return <StandardVerticalNFP {...props} />
}

// TODO: Linear NFP Component (inline format for small packages)
const LinearNFP: React.FC<LabelPDFProps & { visibility: NutrientVisibility }> = (props) => {
  // For now, fallback to vertical format
  // Linear format would be a single line or minimal rows
  return <StandardVerticalNFP {...props} />
}

// Main Label PDF Document
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
  } = props

  // Calculate nutrient visibility based on simplified modifier
  const visibility = getNutrientVisibility(nutritionData, simplified)

  // Select the appropriate format component
  const renderNFP = () => {
    switch (format) {
      case 'tabular':
        return <TabularNFP {...props} visibility={visibility} />
      case 'linear':
        return <LinearNFP {...props} visibility={visibility} />
      case 'standard_vertical':
      default:
        return <StandardVerticalNFP {...props} visibility={visibility} />
    }
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Product Name */}
        {productName && (
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>
            {productName}
          </Text>
        )}

        {/* Nutrition Facts Panel - format with optional simplified modifier */}
        {renderNFP()}

        {/* Ingredient Statement */}
        {ingredientStatement && (
          <View style={styles.ingredientSection}>
            <Text style={styles.ingredientTitle}>INGREDIENTS:</Text>
            <Text style={styles.ingredientText}>{ingredientStatement}</Text>
          </View>
        )}

        {/* Allergen Statement */}
        {allergenStatement && (
          <View style={styles.ingredientSection}>
            <Text style={styles.ingredientTitle}>CONTAINS:</Text>
            <Text style={styles.ingredientText}>{allergenStatement}</Text>
          </View>
        )}

        {/* Company Info */}
        {companyName && (
          <View style={styles.companyInfo}>
            <Text style={{ fontWeight: 'bold' }}>{companyName}</Text>
            {companyAddress && <Text>{companyAddress}</Text>}
          </View>
        )}
      </Page>
    </Document>
  )
}
