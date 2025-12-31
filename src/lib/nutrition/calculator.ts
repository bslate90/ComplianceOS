import type { RawNutritionData } from './rounding-rules';

/**
 * Ingredient with nutrition data from database
 */
export interface IngredientNutrition {
    id: string;
    name: string;
    serving_size_g: number;
    calories: number | null;
    total_fat_g: number | null;
    saturated_fat_g: number | null;
    trans_fat_g: number | null;
    cholesterol_mg: number | null;
    sodium_mg: number | null;
    total_carbohydrates_g: number | null;
    dietary_fiber_g: number | null;
    total_sugars_g: number | null;
    added_sugars_g: number | null;
    protein_g: number | null;
    vitamin_d_mcg: number | null;
    calcium_mg: number | null;
    iron_mg: number | null;
    potassium_mg: number | null;
    // Allergens
    contains_milk: boolean;
    contains_eggs: boolean;
    contains_fish: boolean;
    contains_shellfish: boolean;
    contains_tree_nuts: boolean;
    contains_peanuts: boolean;
    contains_wheat: boolean;
    contains_soybeans: boolean;
    contains_sesame: boolean;
}

/**
 * Recipe ingredient with amount
 */
export interface RecipeIngredient {
    ingredient: IngredientNutrition;
    amount_g: number;
    sort_order: number;
}

/**
 * Calculate nutrition for a recipe based on ingredients and amounts
 */
export function calculateRecipeNutrition(
    ingredients: RecipeIngredient[],
    recipeYieldG: number,
    servingSizeG: number
): RawNutritionData {
    // First, calculate total nutrition for the entire recipe
    const totalNutrition: RawNutritionData = {
        calories: 0,
        totalFat: 0,
        saturatedFat: 0,
        transFat: 0,
        cholesterol: 0,
        sodium: 0,
        totalCarbohydrates: 0,
        dietaryFiber: 0,
        totalSugars: 0,
        addedSugars: 0,
        protein: 0,
        vitaminD: 0,
        calcium: 0,
        iron: 0,
        potassium: 0,
    };

    for (const { ingredient, amount_g } of ingredients) {
        // Calculate the ratio of the amount used to the ingredient's serving size
        const ratio = amount_g / ingredient.serving_size_g;

        totalNutrition.calories += (ingredient.calories || 0) * ratio;
        totalNutrition.totalFat += (ingredient.total_fat_g || 0) * ratio;
        totalNutrition.saturatedFat += (ingredient.saturated_fat_g || 0) * ratio;
        totalNutrition.transFat += (ingredient.trans_fat_g || 0) * ratio;
        totalNutrition.cholesterol += (ingredient.cholesterol_mg || 0) * ratio;
        totalNutrition.sodium += (ingredient.sodium_mg || 0) * ratio;
        totalNutrition.totalCarbohydrates += (ingredient.total_carbohydrates_g || 0) * ratio;
        totalNutrition.dietaryFiber += (ingredient.dietary_fiber_g || 0) * ratio;
        totalNutrition.totalSugars += (ingredient.total_sugars_g || 0) * ratio;
        totalNutrition.addedSugars += (ingredient.added_sugars_g || 0) * ratio;
        totalNutrition.protein += (ingredient.protein_g || 0) * ratio;
        totalNutrition.vitaminD += (ingredient.vitamin_d_mcg || 0) * ratio;
        totalNutrition.calcium += (ingredient.calcium_mg || 0) * ratio;
        totalNutrition.iron += (ingredient.iron_mg || 0) * ratio;
        totalNutrition.potassium += (ingredient.potassium_mg || 0) * ratio;
    }

    // Now calculate per serving
    const servingRatio = servingSizeG / recipeYieldG;

    return {
        calories: totalNutrition.calories * servingRatio,
        totalFat: totalNutrition.totalFat * servingRatio,
        saturatedFat: totalNutrition.saturatedFat * servingRatio,
        transFat: totalNutrition.transFat * servingRatio,
        cholesterol: totalNutrition.cholesterol * servingRatio,
        sodium: totalNutrition.sodium * servingRatio,
        totalCarbohydrates: totalNutrition.totalCarbohydrates * servingRatio,
        dietaryFiber: totalNutrition.dietaryFiber * servingRatio,
        totalSugars: totalNutrition.totalSugars * servingRatio,
        addedSugars: totalNutrition.addedSugars * servingRatio,
        protein: totalNutrition.protein * servingRatio,
        vitaminD: totalNutrition.vitaminD * servingRatio,
        calcium: totalNutrition.calcium * servingRatio,
        iron: totalNutrition.iron * servingRatio,
        potassium: totalNutrition.potassium * servingRatio,
    };
}

/**
 * Aggregate allergens from all ingredients
 */
export interface AllergenSummary {
    containsMilk: boolean;
    containsEggs: boolean;
    containsFish: boolean;
    containsShellfish: boolean;
    containsTreeNuts: boolean;
    containsPeanuts: boolean;
    containsWheat: boolean;
    containsSoybeans: boolean;
    containsSesame: boolean;
}

export function aggregateAllergens(ingredients: RecipeIngredient[]): AllergenSummary {
    return {
        containsMilk: ingredients.some(i => i.ingredient.contains_milk),
        containsEggs: ingredients.some(i => i.ingredient.contains_eggs),
        containsFish: ingredients.some(i => i.ingredient.contains_fish),
        containsShellfish: ingredients.some(i => i.ingredient.contains_shellfish),
        containsTreeNuts: ingredients.some(i => i.ingredient.contains_tree_nuts),
        containsPeanuts: ingredients.some(i => i.ingredient.contains_peanuts),
        containsWheat: ingredients.some(i => i.ingredient.contains_wheat),
        containsSoybeans: ingredients.some(i => i.ingredient.contains_soybeans),
        containsSesame: ingredients.some(i => i.ingredient.contains_sesame),
    };
}

/**
 * Generate ingredient statement (descending order by weight)
 */
export function generateIngredientStatement(ingredients: RecipeIngredient[]): string {
    // Sort by amount in descending order
    const sorted = [...ingredients].sort((a, b) => b.amount_g - a.amount_g);

    // Join names with commas
    const names = sorted.map(i => i.ingredient.name);

    return names.join(', ') + '.';
}

/**
 * Generate allergen statement ("Contains: X, Y, Z")
 */
export function generateAllergenStatement(allergens: AllergenSummary): string | null {
    const present: string[] = [];

    if (allergens.containsMilk) present.push('milk');
    if (allergens.containsEggs) present.push('eggs');
    if (allergens.containsFish) present.push('fish');
    if (allergens.containsShellfish) present.push('shellfish');
    if (allergens.containsTreeNuts) present.push('tree nuts');
    if (allergens.containsPeanuts) present.push('peanuts');
    if (allergens.containsWheat) present.push('wheat');
    if (allergens.containsSoybeans) present.push('soybeans');
    if (allergens.containsSesame) present.push('sesame');

    if (present.length === 0) return null;

    return `Contains: ${present.join(', ')}.`;
}
