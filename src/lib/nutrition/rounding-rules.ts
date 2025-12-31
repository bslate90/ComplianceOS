/**
 * FDA 21 CFR 101.9 Rounding Rules for Nutrition Labeling
 */

/**
 * Round calories according to FDA rules:
 * - Less than 5 calories → 0
 * - 5-50 calories → round to nearest 5
 * - More than 50 calories → round to nearest 10
 */
export function roundCalories(value: number): number | string {
    if (value < 5) return 0;
    if (value <= 50) return Math.round(value / 5) * 5;
    return Math.round(value / 10) * 10;
}

/**
 * Round total fat, saturated fat, and trans fat according to FDA rules:
 * - Less than 0.5g → 0
 * - 0.5g to less than 5g → round to nearest 0.5g
 * - 5g or more → round to nearest 1g
 */
export function roundFat(value: number): number | string {
    if (value < 0.5) return 0;
    if (value < 5) return Math.round(value * 2) / 2;
    return Math.round(value);
}

/**
 * Round cholesterol according to FDA rules:
 * - Less than 2mg → 0
 * - 2mg to 5mg → "less than 5mg"
 * - More than 5mg → round to nearest 5mg
 */
export function roundCholesterol(value: number): number | string {
    if (value < 2) return 0;
    if (value <= 5) return 'less than 5';
    return Math.round(value / 5) * 5;
}

/**
 * Round sodium according to FDA rules:
 * - Less than 5mg → 0
 * - 5mg to 140mg → round to nearest 5mg
 * - More than 140mg → round to nearest 10mg
 */
export function roundSodium(value: number): number | string {
    if (value < 5) return 0;
    if (value <= 140) return Math.round(value / 5) * 5;
    return Math.round(value / 10) * 10;
}

/**
 * Round carbohydrates, fiber, sugars, and protein according to FDA rules:
 * - Less than 0.5g → 0
 * - 0.5g or more → round to nearest 1g
 */
export function roundCarbs(value: number): number | string {
    if (value < 0.5) return 0;
    return Math.round(value);
}

/**
 * Round % Daily Value:
 * - Round to nearest whole number
 */
export function roundDailyValue(value: number): number {
    return Math.round(value);
}

/**
 * Round vitamins and minerals (mg/mcg):
 * - For vitamin D (mcg): round to nearest 0.1
 * - For calcium, iron (mg): round to nearest 1
 * - For potassium (mg): round to nearest 5
 */
export function roundVitaminD(value: number): number {
    return Math.round(value * 10) / 10;
}

export function roundCalciumIron(value: number): number {
    return Math.round(value);
}

export function roundPotassium(value: number): number {
    return Math.round(value / 5) * 5;
}

/**
 * Apply all FDA rounding rules to nutrition data
 */
export interface RawNutritionData {
    calories: number;
    totalFat: number;
    saturatedFat: number;
    transFat: number;
    cholesterol: number;
    sodium: number;
    totalCarbohydrates: number;
    dietaryFiber: number;
    totalSugars: number;
    addedSugars: number;
    protein: number;
    vitaminD: number;
    calcium: number;
    iron: number;
    potassium: number;
}

export interface RoundedNutritionData {
    calories: number | string;
    totalFat: number | string;
    saturatedFat: number | string;
    transFat: number | string;
    cholesterol: number | string;
    sodium: number | string;
    totalCarbohydrates: number | string;
    dietaryFiber: number | string;
    totalSugars: number | string;
    addedSugars: number | string;
    protein: number | string;
    vitaminD: number;
    calcium: number;
    iron: number;
    potassium: number;
}

export function applyFDARounding(data: RawNutritionData): RoundedNutritionData {
    return {
        calories: roundCalories(data.calories),
        totalFat: roundFat(data.totalFat),
        saturatedFat: roundFat(data.saturatedFat),
        transFat: roundFat(data.transFat),
        cholesterol: roundCholesterol(data.cholesterol),
        sodium: roundSodium(data.sodium),
        totalCarbohydrates: roundCarbs(data.totalCarbohydrates),
        dietaryFiber: roundCarbs(data.dietaryFiber),
        totalSugars: roundCarbs(data.totalSugars),
        addedSugars: roundCarbs(data.addedSugars),
        protein: roundCarbs(data.protein),
        vitaminD: roundVitaminD(data.vitaminD),
        calcium: roundCalciumIron(data.calcium),
        iron: roundCalciumIron(data.iron),
        potassium: roundPotassium(data.potassium),
    };
}
