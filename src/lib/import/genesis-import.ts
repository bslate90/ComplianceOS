/**
 * Genesis R&D Classic Import Service
 * 
 * Handles importing data from Genesis R&D Classic exports.
 * Supports:
 * - Tab-delimited text exports (from Genesis reports)
 * - Multi-column nutrient reports
 * - Ingredient and recipe data
 * 
 * Note: .EXL files are proprietary binary format. Users should export 
 * as tab-delimited text from Genesis for best compatibility.
 */

import type { Database } from '@/lib/database.types';

type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
type RecipeInsert = Database['public']['Tables']['recipes']['Insert'];

// Genesis nutrient name mappings to our database fields
const GENESIS_NUTRIENT_MAP: Record<string, keyof IngredientInsert> = {
    // Energy
    'energy (kcal)': 'calories',
    'energy': 'calories',
    'calories': 'calories',
    'kcal': 'calories',

    // Fats
    'total fat': 'total_fat_g',
    'fat, total': 'total_fat_g',
    'fat': 'total_fat_g',
    'saturated fat': 'saturated_fat_g',
    'fatty acids, saturated': 'saturated_fat_g',
    'trans fat': 'trans_fat_g',
    'fatty acids, trans': 'trans_fat_g',
    'trans fatty acid': 'trans_fat_g',

    // Cholesterol & Sodium
    'cholesterol': 'cholesterol_mg',
    'sodium': 'sodium_mg',
    'sodium, na': 'sodium_mg',

    // Carbohydrates
    'total carbohydrate': 'total_carbohydrates_g',
    'carbohydrate, total': 'total_carbohydrates_g',
    'carbohydrate': 'total_carbohydrates_g',
    'carbs': 'total_carbohydrates_g',
    'dietary fiber': 'dietary_fiber_g',
    'fiber, total dietary': 'dietary_fiber_g',
    'fiber': 'dietary_fiber_g',
    'total sugars': 'total_sugars_g',
    'sugars, total': 'total_sugars_g',
    'sugars': 'total_sugars_g',
    'added sugars': 'added_sugars_g',
    'sugars, added': 'added_sugars_g',

    // Protein
    'protein': 'protein_g',

    // Vitamins & Minerals
    'vitamin d': 'vitamin_d_mcg',
    'vitamin d (d2 + d3)': 'vitamin_d_mcg',
    'calcium': 'calcium_mg',
    'calcium, ca': 'calcium_mg',
    'iron': 'iron_mg',
    'iron, fe': 'iron_mg',
    'potassium': 'potassium_mg',
    'potassium, k': 'potassium_mg',
};

// Genesis allergen mappings
const GENESIS_ALLERGEN_MAP: Record<string, keyof IngredientInsert> = {
    'milk': 'contains_milk',
    'dairy': 'contains_milk',
    'egg': 'contains_eggs',
    'eggs': 'contains_eggs',
    'fish': 'contains_fish',
    'shellfish': 'contains_shellfish',
    'crustacean': 'contains_shellfish',
    'tree nut': 'contains_tree_nuts',
    'tree nuts': 'contains_tree_nuts',
    'peanut': 'contains_peanuts',
    'peanuts': 'contains_peanuts',
    'wheat': 'contains_wheat',
    'soy': 'contains_soybeans',
    'soybean': 'contains_soybeans',
    'soybeans': 'contains_soybeans',
    'sesame': 'contains_sesame',
};

export interface GenesisImportResult {
    success: boolean;
    ingredients: {
        total: number;
        imported: number;
        skipped: number;
        errors: string[];
    };
    recipes: {
        total: number;
        imported: number;
        skipped: number;
        errors: string[];
    };
    warnings: string[];
}

export interface ParsedGenesisIngredient {
    name: string;
    brand?: string;
    userCode?: string;
    servingSizeG: number;
    nutrients: Partial<Record<keyof IngredientInsert, number>>;
    allergens: Partial<Record<keyof IngredientInsert, boolean>>;
}

export interface ParsedGenesisRecipe {
    name: string;
    description?: string;
    yieldG: number;
    servingSizeG: number;
    servingsPerContainer?: number;
    ingredients: { name: string; amountG: number }[];
    nutrients: Partial<Record<keyof IngredientInsert, number>>;
}

/**
 * Detect the type of Genesis export file
 */
export function detectGenesisFileType(content: string, fileName: string): 'tab-delimited' | 'exl-binary' | 'unknown' {
    const extension = fileName.toLowerCase().split('.').pop();

    // Check for EXL binary signature
    if (extension === 'exl' || extension === 'exlx') {
        // EXL files typically start with binary headers
        const firstBytes = content.slice(0, 20);
        if (firstBytes.includes('\x00') || !firstBytes.match(/^[\x20-\x7E\t\n\r]/)) {
            return 'exl-binary';
        }
    }

    // Check for tab-delimited format
    if (content.includes('\t') && content.includes('\n')) {
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length > 1) {
            const tabCounts = lines.slice(0, 5).map(l => (l.match(/\t/g) || []).length);
            // If consistent tab count across rows, likely tab-delimited
            if (tabCounts.every(c => c > 0 && Math.abs(c - tabCounts[0]) <= 2)) {
                return 'tab-delimited';
            }
        }
    }

    return 'unknown';
}

/**
 * Parse tab-delimited Genesis export
 */
export function parseGenesisTabDelimited(content: string): {
    ingredients: ParsedGenesisIngredient[];
    recipes: ParsedGenesisRecipe[];
    type: 'ingredients' | 'recipes' | 'mixed' | 'unknown';
} {
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
        return { ingredients: [], recipes: [], type: 'unknown' };
    }

    // Parse header row
    const headers = lines[0].toLowerCase().split('\t').map(h => h.trim());

    // Detect content type based on headers
    const hasRecipeHeaders = headers.some(h =>
        h.includes('yield') || h.includes('formula') || h.includes('ingredient list')
    );
    const hasIngredientHeaders = headers.some(h =>
        h.includes('ndb') || h.includes('ingredient') || h.includes('food name')
    );

    const ingredients: ParsedGenesisIngredient[] = [];
    const recipes: ParsedGenesisRecipe[] = [];

    // Find column indices
    const nameIdx = findColumnIndex(headers, ['name', 'food name', 'ingredient', 'description', 'item']);
    const brandIdx = findColumnIndex(headers, ['brand', 'manufacturer', 'supplier']);
    const codeIdx = findColumnIndex(headers, ['code', 'user code', 'id', 'ndb', 'item code']);
    const servingIdx = findColumnIndex(headers, ['serving', 'serving size', 'portion', 'amount']);
    const yieldIdx = findColumnIndex(headers, ['yield', 'recipe yield', 'batch size']);

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split('\t');
        if (row.length < 2) continue;

        const name = row[nameIdx]?.trim();
        if (!name) continue;

        // Parse nutrients from row
        const nutrients: Partial<Record<keyof IngredientInsert, number>> = {};
        const allergens: Partial<Record<keyof IngredientInsert, boolean>> = {};

        headers.forEach((header, idx) => {
            const value = row[idx]?.trim();
            if (!value || value === '-' || value === 'N/A') return;

            // Check nutrient mapping
            const normalizedHeader = header.toLowerCase().replace(/[()]/g, '').trim();
            const nutrientField = GENESIS_NUTRIENT_MAP[normalizedHeader];
            if (nutrientField) {
                const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
                if (!isNaN(numValue)) {
                    nutrients[nutrientField] = numValue;
                }
            }

            // Check allergen columns
            if (header.includes('allergen') || header.includes('contains')) {
                const allergenField = Object.entries(GENESIS_ALLERGEN_MAP).find(([key]) =>
                    header.includes(key) || value.toLowerCase().includes(key)
                );
                if (allergenField) {
                    allergens[allergenField[1]] = true;
                }
            }
        });

        // Determine if this is a recipe or ingredient
        const yieldValue = yieldIdx >= 0 ? parseFloat(row[yieldIdx]?.replace(/[^0-9.-]/g, '') || '0') : 0;
        const servingValue = servingIdx >= 0 ? parseFloat(row[servingIdx]?.replace(/[^0-9.-]/g, '') || '100') : 100;

        if (hasRecipeHeaders && yieldValue > 0) {
            recipes.push({
                name,
                yieldG: yieldValue,
                servingSizeG: servingValue || 30,
                ingredients: [], // Would need ingredient breakdown from another export
                nutrients,
            });
        } else {
            ingredients.push({
                name,
                brand: brandIdx >= 0 ? row[brandIdx]?.trim() : undefined,
                userCode: codeIdx >= 0 ? row[codeIdx]?.trim() : undefined,
                servingSizeG: servingValue || 100,
                nutrients,
                allergens,
            });
        }
    }

    const type = recipes.length > 0 && ingredients.length > 0 ? 'mixed' :
        recipes.length > 0 ? 'recipes' :
            ingredients.length > 0 ? 'ingredients' : 'unknown';

    return { ingredients, recipes, type };
}

/**
 * Parse Genesis multi-column nutrient report format
 */
export function parseGenesisNutrientReport(content: string): ParsedGenesisIngredient[] {
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const ingredients: ParsedGenesisIngredient[] = [];

    // Multi-column reports often have a different structure
    // Header line followed by nutrient columns
    let currentItem: ParsedGenesisIngredient | null = null;

    for (const line of lines) {
        const parts = line.split('\t').map(p => p.trim());

        // Check if this is a new item row (typically starts with item name)
        if (parts[0] && !parts[0].match(/^[0-9.]+$/) && parts[0].length > 2) {
            // New item
            if (currentItem) {
                ingredients.push(currentItem);
            }
            currentItem = {
                name: parts[0],
                servingSizeG: 100,
                nutrients: {},
                allergens: {},
            };
        }

        // Parse nutrient values from the line
        if (currentItem) {
            for (let i = 0; i < parts.length; i++) {
                const value = parts[i];
                const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
                if (!isNaN(numValue) && numValue > 0) {
                    // Try to match with common nutrient order in Genesis reports
                    const nutrientOrder: (keyof IngredientInsert)[] = [
                        'calories', 'total_fat_g', 'saturated_fat_g', 'trans_fat_g',
                        'cholesterol_mg', 'sodium_mg', 'total_carbohydrates_g',
                        'dietary_fiber_g', 'total_sugars_g', 'protein_g',
                        'vitamin_d_mcg', 'calcium_mg', 'iron_mg', 'potassium_mg'
                    ];
                    if (i > 0 && i <= nutrientOrder.length) {
                        currentItem.nutrients[nutrientOrder[i - 1]] = numValue;
                    }
                }
            }
        }
    }

    if (currentItem) {
        ingredients.push(currentItem);
    }

    return ingredients;
}

/**
 * Convert parsed Genesis data to database format
 */
export function convertToIngredientInsert(
    parsed: ParsedGenesisIngredient,
    organizationId: string
): IngredientInsert {
    return {
        organization_id: organizationId,
        name: parsed.name,
        brand: parsed.brand || null,
        user_code: parsed.userCode || null,
        serving_size_g: parsed.servingSizeG,
        calories: parsed.nutrients.calories || null,
        total_fat_g: parsed.nutrients.total_fat_g || null,
        saturated_fat_g: parsed.nutrients.saturated_fat_g || null,
        trans_fat_g: parsed.nutrients.trans_fat_g || null,
        cholesterol_mg: parsed.nutrients.cholesterol_mg || null,
        sodium_mg: parsed.nutrients.sodium_mg || null,
        total_carbohydrates_g: parsed.nutrients.total_carbohydrates_g || null,
        dietary_fiber_g: parsed.nutrients.dietary_fiber_g || null,
        total_sugars_g: parsed.nutrients.total_sugars_g || null,
        added_sugars_g: parsed.nutrients.added_sugars_g || null,
        protein_g: parsed.nutrients.protein_g || null,
        vitamin_d_mcg: parsed.nutrients.vitamin_d_mcg || null,
        calcium_mg: parsed.nutrients.calcium_mg || null,
        iron_mg: parsed.nutrients.iron_mg || null,
        potassium_mg: parsed.nutrients.potassium_mg || null,
        contains_milk: parsed.allergens.contains_milk || false,
        contains_eggs: parsed.allergens.contains_eggs || false,
        contains_fish: parsed.allergens.contains_fish || false,
        contains_shellfish: parsed.allergens.contains_shellfish || false,
        contains_tree_nuts: parsed.allergens.contains_tree_nuts || false,
        contains_peanuts: parsed.allergens.contains_peanuts || false,
        contains_wheat: parsed.allergens.contains_wheat || false,
        contains_soybeans: parsed.allergens.contains_soybeans || false,
        contains_sesame: parsed.allergens.contains_sesame || false,
    };
}

/**
 * Convert parsed Genesis recipe to database format
 */
export function convertToRecipeInsert(
    parsed: ParsedGenesisRecipe,
    organizationId: string
): RecipeInsert {
    return {
        organization_id: organizationId,
        name: parsed.name,
        description: parsed.description || null,
        recipe_yield_g: parsed.yieldG,
        serving_size_g: parsed.servingSizeG,
        servings_per_container: parsed.servingsPerContainer || null,
        calculated_nutrition: JSON.parse(JSON.stringify(parsed.nutrients)),
        status: 'draft',
    };
}

// Helper function to find column index
function findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
        const idx = headers.findIndex(h => h.includes(name));
        if (idx >= 0) return idx;
    }
    return -1;
}

/**
 * Generate human-readable import instructions for Genesis users
 */
export function getGenesisExportInstructions(): string {
    return `
## How to Export Data from Genesis R&D Classic

### For Ingredients:
1. Open Genesis R&D Classic
2. Go to **File** → **Export** → **Export All**
3. Under "Type", select **Ingredients**
4. Click **Export**
5. Alternatively, generate a **Multi-Column Report** and export as tab-delimited text

### For Recipes:
1. Open Genesis R&D Classic  
2. Go to **File** → **Export** → **Export All**
3. Under "Type", select **Recipes**
4. Click **Export**

### Best Practice - Tab-Delimited Export:
For best compatibility, export your data as a **tab-delimited text file**:

1. Go to **Reports** → **Multi-Column Report**
2. Select the items you want to export
3. Configure the nutrients/columns you need
4. Click **Print** → **To File**
5. Choose **Tab-delimited** format
6. Save the file and upload it here

### Supported Formats:
- ✅ Tab-delimited text files (.txt)
- ✅ Genesis report exports
- ⚠️ .EXL files (limited support - export as text for best results)
`;
}
