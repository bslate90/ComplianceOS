import type { USDASearchResult, USDANutrient } from './api';

/**
 * USDA Nutrient IDs to our database fields mapping
 */
const NUTRIENT_ID_MAP: Record<number, string> = {
    1008: 'calories',           // Energy (kcal)
    1003: 'protein_g',          // Protein
    1004: 'total_fat_g',        // Total Fat
    1005: 'total_carbohydrates_g', // Carbohydrates
    1079: 'dietary_fiber_g',    // Fiber
    2000: 'total_sugars_g',     // Total Sugars
    1235: 'added_sugars_g',     // Added Sugars
    1258: 'saturated_fat_g',    // Saturated Fat
    1257: 'trans_fat_g',        // Trans Fat
    1253: 'cholesterol_mg',     // Cholesterol
    1093: 'sodium_mg',          // Sodium
    1087: 'calcium_mg',         // Calcium
    1089: 'iron_mg',            // Iron
    1114: 'vitamin_d_mcg',      // Vitamin D (D2 + D3)
    1110: 'vitamin_d_mcg',      // Vitamin D (alternative ID)
    1092: 'potassium_mg',       // Potassium
};

/**
 * Mapped ingredient data ready for database
 */
export interface MappedIngredient {
    name: string;
    brand: string | null;
    usda_fdc_id: number;
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
}

/**
 * Find a nutrient value by ID from USDA food nutrients array
 */
function findNutrientValue(nutrients: USDANutrient[], nutrientId: number): number | null {
    const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
    return nutrient ? nutrient.value : null;
}

/**
 * Map USDA food data to our ingredient schema
 * USDA data is typically per 100g serving
 */
export function mapUSDAToIngredient(food: USDASearchResult): MappedIngredient {
    const nutrients = food.foodNutrients || [];

    return {
        name: food.description,
        brand: food.brandOwner || food.brandName || null,
        usda_fdc_id: food.fdcId,
        serving_size_g: 100, // USDA data is per 100g
        calories: findNutrientValue(nutrients, 1008),
        total_fat_g: findNutrientValue(nutrients, 1004),
        saturated_fat_g: findNutrientValue(nutrients, 1258),
        trans_fat_g: findNutrientValue(nutrients, 1257),
        cholesterol_mg: findNutrientValue(nutrients, 1253),
        sodium_mg: findNutrientValue(nutrients, 1093),
        total_carbohydrates_g: findNutrientValue(nutrients, 1005),
        dietary_fiber_g: findNutrientValue(nutrients, 1079),
        total_sugars_g: findNutrientValue(nutrients, 2000),
        added_sugars_g: findNutrientValue(nutrients, 1235),
        protein_g: findNutrientValue(nutrients, 1003),
        vitamin_d_mcg: findNutrientValue(nutrients, 1114) ?? findNutrientValue(nutrients, 1110),
        calcium_mg: findNutrientValue(nutrients, 1087),
        iron_mg: findNutrientValue(nutrients, 1089),
        potassium_mg: findNutrientValue(nutrients, 1092),
    };
}

/**
 * Format USDA data type for display
 */
export function formatDataType(dataType: string): string {
    switch (dataType) {
        case 'Branded':
            return 'Branded Product';
        case 'SR Legacy':
            return 'USDA Standard Reference';
        case 'Foundation':
            return 'USDA Foundation';
        case 'Survey (FNDDS)':
            return 'Survey Data';
        default:
            return dataType;
    }
}
