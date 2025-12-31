/**
 * Recipe Export Utilities
 * Handles formula percentage and range formula calculations
 */

export interface RecipeIngredientWithDetails {
    ingredient_id: string;
    amount_g: number;
    ingredient: {
        id: string;
        name: string;
        user_code: string | null;
    };
}

/**
 * Calculate formula percentages for each ingredient
 */
export function calculateFormulaPercentages(
    ingredients: RecipeIngredientWithDetails[],
    recipeYieldG?: number
): { name: string; code: string | null; amount_g: number; percentage: number }[] {
    const totalWeight = recipeYieldG || ingredients.reduce((sum, i) => sum + i.amount_g, 0);

    if (totalWeight === 0) return [];

    return ingredients.map(ing => ({
        name: ing.ingredient.name,
        code: ing.ingredient.user_code,
        amount_g: ing.amount_g,
        percentage: (ing.amount_g / totalWeight) * 100,
    })).sort((a, b) => b.percentage - a.percentage);
}

/**
 * FDA-style range formula brackets
 * Rounds percentages to standard ranges for ingredient declarations
 */
export const FORMULA_RANGES = [
    { min: 90, max: 100, label: '100-90%' },
    { min: 80, max: 90, label: '90-80%' },
    { min: 70, max: 80, label: '80-70%' },
    { min: 60, max: 70, label: '70-60%' },
    { min: 50, max: 60, label: '60-50%' },
    { min: 40, max: 50, label: '50-40%' },
    { min: 30, max: 40, label: '40-30%' },
    { min: 20, max: 30, label: '30-20%' },
    { min: 10, max: 20, label: '20-10%' },
    { min: 5, max: 10, label: '10-5%' },
    { min: 2, max: 5, label: '5-2%' },
    { min: 0, max: 2, label: '<2%' },
] as const;

/**
 * Get range label for a percentage value
 */
export function getRangeLabel(percentage: number): string {
    for (const range of FORMULA_RANGES) {
        if (percentage >= range.min && percentage < range.max) {
            return range.label;
        }
    }
    // Handle 100% case
    if (percentage >= 100) return '90-100%';
    return '<2%';
}

/**
 * Calculate range formula for each ingredient
 */
export function calculateRangeFormula(
    ingredients: RecipeIngredientWithDetails[],
    recipeYieldG?: number
): { name: string; code: string | null; amount_g: number; percentage: number; range: string }[] {
    const percentages = calculateFormulaPercentages(ingredients, recipeYieldG);

    return percentages.map(ing => ({
        ...ing,
        range: getRangeLabel(ing.percentage),
    }));
}

/**
 * Format formula as text for export
 */
export function formatFormulaAsText(
    ingredients: RecipeIngredientWithDetails[],
    format: 'percentage' | 'range',
    recipeYieldG?: number
): string {
    if (format === 'percentage') {
        const data = calculateFormulaPercentages(ingredients, recipeYieldG);
        return data.map(i =>
            `${i.name}${i.code ? ` (${i.code})` : ''}: ${i.percentage.toFixed(2)}%`
        ).join('\n');
    } else {
        const data = calculateRangeFormula(ingredients, recipeYieldG);
        return data.map(i =>
            `${i.name}${i.code ? ` (${i.code})` : ''}: ${i.range}`
        ).join('\n');
    }
}

/**
 * Format formula as CSV for export
 */
export function formatFormulaAsCsv(
    ingredients: RecipeIngredientWithDetails[],
    format: 'percentage' | 'range',
    recipeYieldG?: number
): string {
    const header = format === 'percentage'
        ? 'Ingredient,Code,Amount (g),Percentage'
        : 'Ingredient,Code,Amount (g),Percentage,Range';

    const data = format === 'percentage'
        ? calculateFormulaPercentages(ingredients, recipeYieldG)
        : calculateRangeFormula(ingredients, recipeYieldG);

    const rows = data.map(i => {
        if ('range' in i) {
            return `"${i.name}","${i.code || ''}",${i.amount_g},${i.percentage.toFixed(2)}%,"${i.range}"`;
        }
        return `"${i.name}","${i.code || ''}",${i.amount_g},${i.percentage.toFixed(2)}%`;
    });

    return [header, ...rows].join('\n');
}
