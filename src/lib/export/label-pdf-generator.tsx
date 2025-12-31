/**
 * Label PDF Generator
 * Generates FDA-compliant Nutrition Facts Panel PDFs
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
  ingredientStatement?: string
  allergenStatement?: string
  companyName?: string
  companyAddress?: string
}

// Daily Values for % calculations
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

// Calculate % Daily Value
function calculateDV(nutrient: keyof typeof DAILY_VALUES, amount: number | string): number {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value) || value <= 0) return 0
  return Math.round((value / DAILY_VALUES[nutrient]) * 100)
}

// PDF Styles
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
    borderBottom: '8pt solid #000',
  },
  servingInfo: {
    fontSize: 10,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    borderBottom: '5pt solid #000',
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
    borderBottom: '10pt solid #000',
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
    borderBottom: '4pt solid #000',
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    fontSize: 8,
    borderBottom: '1pt solid #000',
  },
  nutrientRowThick: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    fontSize: 8,
    borderBottom: '5pt solid #000',
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
    borderTop: '4pt solid #000',
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

// Standard Vertical NFP Component
const StandardVerticalNFP: React.FC<LabelPDFProps> = ({
  servingSize,
  servingsPerContainer,
  nutritionData,
}) => {
  return (
    <View style={styles.nfpContainer}>
      {/* Header */}
      <Text style={styles.header}>Nutrition Facts</Text>

      {/* Serving Info */}
      <View style={styles.servingInfo}>
        <Text style={styles.servingSizeBold}>
          Serving size <Text>{servingSize}</Text>
        </Text>
        <Text style={styles.servingsPerContainer}>
          Servings per container {servingsPerContainer}
        </Text>
      </View>

      {/* Calories */}
      <View style={styles.caloriesSection}>
        <Text style={styles.caloriesLabel}>Amount per serving</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.caloriesLabel}>Calories</Text>
          <Text style={styles.caloriesValue}>{nutritionData.calories}</Text>
        </View>
      </View>

      {/* % Daily Value Header */}
      <Text style={styles.dvHeader}>% Daily Value*</Text>

      {/* Total Fat */}
      <View style={styles.nutrientRow}>
        <Text>
          <Text style={styles.nutrientName}>Total Fat</Text> {nutritionData.totalFat}g
        </Text>
        <Text style={styles.dvValue}>{calculateDV('totalFat', nutritionData.totalFat)}%</Text>
      </View>

      {/* Saturated Fat */}
      <View style={styles.nutrientRow}>
        <Text style={styles.nutrientIndent1}>
          Saturated Fat {nutritionData.saturatedFat}g
        </Text>
        <Text style={styles.dvValue}>{calculateDV('saturatedFat', nutritionData.saturatedFat)}%</Text>
      </View>

      {/* Trans Fat */}
      <View style={styles.nutrientRow}>
        <Text style={styles.nutrientIndent1}>
          <Text style={{ fontStyle: 'italic' }}>Trans</Text> Fat {nutritionData.transFat}g
        </Text>
        <Text></Text>
      </View>

      {/* Cholesterol */}
      <View style={styles.nutrientRow}>
        <Text>
          <Text style={styles.nutrientName}>Cholesterol</Text> {nutritionData.cholesterol}mg
        </Text>
        <Text style={styles.dvValue}>{calculateDV('cholesterol', nutritionData.cholesterol)}%</Text>
      </View>

      {/* Sodium */}
      <View style={styles.nutrientRow}>
        <Text>
          <Text style={styles.nutrientName}>Sodium</Text> {nutritionData.sodium}mg
        </Text>
        <Text style={styles.dvValue}>{calculateDV('sodium', nutritionData.sodium)}%</Text>
      </View>

      {/* Total Carbohydrates */}
      <View style={styles.nutrientRow}>
        <Text>
          <Text style={styles.nutrientName}>Total Carbohydrate</Text>{' '}
          {nutritionData.totalCarbohydrates}g
        </Text>
        <Text style={styles.dvValue}>{calculateDV('totalCarbohydrates', nutritionData.totalCarbohydrates)}%</Text>
      </View>

      {/* Dietary Fiber */}
      <View style={styles.nutrientRow}>
        <Text style={styles.nutrientIndent1}>Dietary Fiber {nutritionData.dietaryFiber}g</Text>
        <Text style={styles.dvValue}>{calculateDV('dietaryFiber', nutritionData.dietaryFiber)}%</Text>
      </View>

      {/* Total Sugars */}
      <View style={styles.nutrientRow}>
        <Text style={styles.nutrientIndent1}>Total Sugars {nutritionData.totalSugars}g</Text>
        <Text></Text>
      </View>

      {/* Added Sugars */}
      <View style={styles.nutrientRowThick}>
        <Text style={styles.nutrientIndent2}>Includes {nutritionData.addedSugars}g Added Sugars</Text>
        <Text style={styles.dvValue}>{calculateDV('addedSugars', nutritionData.addedSugars)}%</Text>
      </View>

      {/* Protein */}
      <View style={styles.nutrientRowThick}>
        <Text>
          <Text style={styles.nutrientName}>Protein</Text> {nutritionData.protein}g
        </Text>
        <Text></Text>
      </View>

      {/* Micronutrients */}
      <View style={styles.micronutrientRow}>
        <Text>Vitamin D {nutritionData.vitaminD}mcg</Text>
        <Text style={styles.dvValue}>{calculateDV('vitaminD', nutritionData.vitaminD)}%</Text>
      </View>

      <View style={styles.micronutrientRow}>
        <Text>Calcium {nutritionData.calcium}mg</Text>
        <Text style={styles.dvValue}>{calculateDV('calcium', nutritionData.calcium)}%</Text>
      </View>

      <View style={styles.micronutrientRow}>
        <Text>Iron {nutritionData.iron}mg</Text>
        <Text style={styles.dvValue}>{calculateDV('iron', nutritionData.iron)}%</Text>
      </View>

      <View style={styles.micronutrientRow}>
        <Text>Potassium {nutritionData.potassium}mg</Text>
        <Text style={styles.dvValue}>{calculateDV('potassium', nutritionData.potassium)}%</Text>
      </View>

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

// Main Label PDF Document
export const LabelPDFDocument: React.FC<LabelPDFProps> = (props) => {
  const {
    productName,
    ingredientStatement,
    allergenStatement,
    companyName,
    companyAddress,
    format = 'standard_vertical',
  } = props

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Product Name */}
        {productName && (
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>
            {productName}
          </Text>
        )}

        {/* Nutrition Facts Panel */}
        {format === 'standard_vertical' && <StandardVerticalNFP {...props} />}

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
