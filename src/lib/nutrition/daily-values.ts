/**
 * FDA 2020 Daily Values for % DV calculations
 * Reference: 21 CFR 101.9
 */
export const FDA_DAILY_VALUES = {
    totalFat: 78, // g
    saturatedFat: 20, // g
    cholesterol: 300, // mg
    sodium: 2300, // mg
    totalCarbohydrates: 275, // g
    dietaryFiber: 28, // g
    addedSugars: 50, // g
    protein: 50, // g
    vitaminD: 20, // mcg
    calcium: 1300, // mg
    iron: 18, // mg
    potassium: 4700, // mg
} as const;

export type NutrientKey = keyof typeof FDA_DAILY_VALUES;

/**
 * Calculate % Daily Value for a nutrient
 */
export function calculateDailyValuePercent(
    nutrientKey: NutrientKey,
    amount: number
): number {
    const dailyValue = FDA_DAILY_VALUES[nutrientKey];
    if (!dailyValue || amount <= 0) return 0;
    return Math.round((amount / dailyValue) * 100);
}

/**
 * Get the unit for a nutrient
 */
export function getNutrientUnit(nutrientKey: string): string {
    switch (nutrientKey) {
        case 'calories':
            return '';
        case 'cholesterol':
        case 'sodium':
        case 'calcium':
        case 'iron':
        case 'potassium':
            return 'mg';
        case 'vitaminD':
            return 'mcg';
        default:
            return 'g';
    }
}
