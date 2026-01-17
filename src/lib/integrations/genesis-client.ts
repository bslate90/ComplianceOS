/**
 * Genesis R&D / EshaPort Integration Client
 * 
 * Supports two integration modes:
 * 1. EshaPort File-Based: Import/export via delimited text files
 * 2. Genesis R&D API: Real-time SOAP/REST data streaming
 * 
 * Primary use cases:
 * - Import recipes and ingredients from Genesis R&D
 * - Import nutritional analysis
 * - Export formulations for analysis
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface GenesisConfig {
    id: string;
    organization_id: string;
    integration_mode: 'file_based' | 'api';
    api_endpoint?: string;
    api_key?: string;
    default_export_template?: string;
    auto_sync_calculations?: boolean;
}

// ============ EshaPort Field Definitions ============

// Standard ingredient export fields from Genesis R&D
export const ESHAPORT_INGREDIENT_FIELDS = [
    'Primary Key',
    'User Code',
    'Name',
    'Common Name',
    'Manufacturer',
    'Source',
    'Calories',
    'Protein (g)',
    'Total Fat (g)',
    'Saturated Fat (g)',
    'Trans Fat (g)',
    'Cholesterol (mg)',
    'Sodium (mg)',
    'Total Carbohydrate (g)',
    'Dietary Fiber (g)',
    'Total Sugars (g)',
    'Added Sugars (g)',
    'Vitamin D (mcg)',
    'Calcium (mg)',
    'Iron (mg)',
    'Potassium (mg)',
    'Contains Milk',
    'Contains Eggs',
    'Contains Fish',
    'Contains Shellfish',
    'Contains Tree Nuts',
    'Contains Peanuts',
    'Contains Wheat',
    'Contains Soybeans',
    'Contains Sesame',
] as const;

// Recipe export fields
export const ESHAPORT_RECIPE_FIELDS = [
    'Primary Key',
    'User Code',
    'Name',
    'Description',
    'Yield Amount',
    'Yield Unit',
    'Serving Size',
    'Serving Size Unit',
    'Servings Per Container',
    'Recipe Type',
    'Category',
    // Analysis fields
    'Calories',
    'Calories from Fat',
    'Total Fat (g)',
    'Saturated Fat (g)',
    'Trans Fat (g)',
    'Polyunsaturated Fat (g)',
    'Monounsaturated Fat (g)',
    'Cholesterol (mg)',
    'Sodium (mg)',
    'Total Carbohydrate (g)',
    'Dietary Fiber (g)',
    'Soluble Fiber (g)',
    'Insoluble Fiber (g)',
    'Total Sugars (g)',
    'Added Sugars (g)',
    'Protein (g)',
    'Vitamin D (mcg)',
    'Calcium (mg)',
    'Iron (mg)',
    'Potassium (mg)',
    'Vitamin A (mcg RAE)',
    'Vitamin C (mg)',
    // Ingredient statement
    'Ingredient Statement',
    // Allergens
    'Contains Milk',
    'Contains Eggs',
    'Contains Fish',
    'Contains Shellfish',
    'Contains Tree Nuts',
    'Contains Peanuts',
    'Contains Wheat',
    'Contains Soybeans',
    'Contains Sesame',
] as const;

export interface EshaPortOptions {
    fieldDelimiter: string;
    textQualifier: string;
    includeHeaders: boolean;
    dateFormat: string;
}

export const DEFAULT_ESHAPORT_OPTIONS: EshaPortOptions = {
    fieldDelimiter: '\t',
    textQualifier: '"',
    includeHeaders: true,
    dateFormat: 'MM/DD/YYYY',
};

export interface ParsedIngredient {
    primaryKey?: string;
    userCode?: string;
    name: string;
    commonName?: string;
    manufacturer?: string;
    source?: string;
    nutrition: {
        calories?: number;
        protein_g?: number;
        total_fat_g?: number;
        saturated_fat_g?: number;
        trans_fat_g?: number;
        cholesterol_mg?: number;
        sodium_mg?: number;
        total_carbohydrates_g?: number;
        dietary_fiber_g?: number;
        total_sugars_g?: number;
        added_sugars_g?: number;
        vitamin_d_mcg?: number;
        calcium_mg?: number;
        iron_mg?: number;
        potassium_mg?: number;
    };
    allergens: {
        contains_milk?: boolean;
        contains_eggs?: boolean;
        contains_fish?: boolean;
        contains_shellfish?: boolean;
        contains_tree_nuts?: boolean;
        contains_peanuts?: boolean;
        contains_wheat?: boolean;
        contains_soybeans?: boolean;
        contains_sesame?: boolean;
    };
}

export interface ParsedRecipe {
    primaryKey?: string;
    userCode?: string;
    name: string;
    description?: string;
    yieldAmount?: number;
    yieldUnit?: string;
    servingSize?: number;
    servingSizeUnit?: string;
    servingsPerContainer?: number;
    recipeType?: string;
    category?: string;
    ingredientStatement?: string;
    nutrition: Record<string, number>;
    allergens: Record<string, boolean>;
}

export interface ParseResult<T> {
    success: boolean;
    data: T[];
    errors: Array<{ row: number; field: string; message: string }>;
    warnings: Array<{ row: number; message: string }>;
    totalRows: number;
    parsedRows: number;
}

// ============ EshaPort Parser ============

/**
 * Parse EshaPort ingredient export file
 */
export function parseIngredientFile(
    content: string,
    options: Partial<EshaPortOptions> = {}
): ParseResult<ParsedIngredient> {
    const opts = { ...DEFAULT_ESHAPORT_OPTIONS, ...options };
    const result: ParseResult<ParsedIngredient> = {
        success: true,
        data: [],
        errors: [],
        warnings: [],
        totalRows: 0,
        parsedRows: 0,
    };

    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
        result.success = false;
        result.errors.push({ row: 0, field: '', message: 'File is empty' });
        return result;
    }

    // Parse headers
    const headerLine = opts.includeHeaders ? lines[0] : null;
    const headers = headerLine
        ? parseDelimitedLine(headerLine, opts.fieldDelimiter, opts.textQualifier)
        : ESHAPORT_INGREDIENT_FIELDS as unknown as string[];

    // Create field index map
    const fieldMap = new Map<string, number>();
    headers.forEach((h, i) => fieldMap.set(h.toLowerCase().trim(), i));

    // Parse data rows
    const dataStart = opts.includeHeaders ? 1 : 0;
    result.totalRows = lines.length - dataStart;

    for (let i = dataStart; i < lines.length; i++) {
        const rowNum = i + 1;
        try {
            const fields = parseDelimitedLine(lines[i], opts.fieldDelimiter, opts.textQualifier);

            const getName = (fieldName: string) => {
                const idx = fieldMap.get(fieldName.toLowerCase());
                return idx !== undefined ? fields[idx]?.trim() : undefined;
            };

            const getNumber = (fieldName: string): number | undefined => {
                const val = getName(fieldName);
                if (!val) return undefined;
                const num = parseFloat(val);
                return isNaN(num) ? undefined : num;
            };

            const getBool = (fieldName: string): boolean | undefined => {
                const val = getName(fieldName)?.toLowerCase();
                if (!val) return undefined;
                return val === 'yes' || val === 'true' || val === '1' || val === 'y';
            };

            const name = getName('name');
            if (!name) {
                result.warnings.push({ row: rowNum, message: 'Missing ingredient name, skipping row' });
                continue;
            }

            const ingredient: ParsedIngredient = {
                primaryKey: getName('primary key'),
                userCode: getName('user code'),
                name,
                commonName: getName('common name'),
                manufacturer: getName('manufacturer'),
                source: getName('source'),
                nutrition: {
                    calories: getNumber('calories'),
                    protein_g: getNumber('protein (g)'),
                    total_fat_g: getNumber('total fat (g)'),
                    saturated_fat_g: getNumber('saturated fat (g)'),
                    trans_fat_g: getNumber('trans fat (g)'),
                    cholesterol_mg: getNumber('cholesterol (mg)'),
                    sodium_mg: getNumber('sodium (mg)'),
                    total_carbohydrates_g: getNumber('total carbohydrate (g)'),
                    dietary_fiber_g: getNumber('dietary fiber (g)'),
                    total_sugars_g: getNumber('total sugars (g)'),
                    added_sugars_g: getNumber('added sugars (g)'),
                    vitamin_d_mcg: getNumber('vitamin d (mcg)'),
                    calcium_mg: getNumber('calcium (mg)'),
                    iron_mg: getNumber('iron (mg)'),
                    potassium_mg: getNumber('potassium (mg)'),
                },
                allergens: {
                    contains_milk: getBool('contains milk'),
                    contains_eggs: getBool('contains eggs'),
                    contains_fish: getBool('contains fish'),
                    contains_shellfish: getBool('contains shellfish'),
                    contains_tree_nuts: getBool('contains tree nuts'),
                    contains_peanuts: getBool('contains peanuts'),
                    contains_wheat: getBool('contains wheat'),
                    contains_soybeans: getBool('contains soybeans'),
                    contains_sesame: getBool('contains sesame'),
                },
            };

            result.data.push(ingredient);
            result.parsedRows++;
        } catch (error) {
            result.errors.push({
                row: rowNum,
                field: '',
                message: error instanceof Error ? error.message : 'Parse error',
            });
        }
    }

    result.success = result.errors.length === 0;
    return result;
}

/**
 * Parse EshaPort recipe export file
 */
export function parseRecipeFile(
    content: string,
    options: Partial<EshaPortOptions> = {}
): ParseResult<ParsedRecipe> {
    const opts = { ...DEFAULT_ESHAPORT_OPTIONS, ...options };
    const result: ParseResult<ParsedRecipe> = {
        success: true,
        data: [],
        errors: [],
        warnings: [],
        totalRows: 0,
        parsedRows: 0,
    };

    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
        result.success = false;
        result.errors.push({ row: 0, field: '', message: 'File is empty' });
        return result;
    }

    // Parse headers
    const headerLine = opts.includeHeaders ? lines[0] : null;
    const headers = headerLine
        ? parseDelimitedLine(headerLine, opts.fieldDelimiter, opts.textQualifier)
        : ESHAPORT_RECIPE_FIELDS as unknown as string[];

    const fieldMap = new Map<string, number>();
    headers.forEach((h, i) => fieldMap.set(h.toLowerCase().trim(), i));

    const dataStart = opts.includeHeaders ? 1 : 0;
    result.totalRows = lines.length - dataStart;

    for (let i = dataStart; i < lines.length; i++) {
        const rowNum = i + 1;
        try {
            const fields = parseDelimitedLine(lines[i], opts.fieldDelimiter, opts.textQualifier);

            const getName = (fieldName: string) => {
                const idx = fieldMap.get(fieldName.toLowerCase());
                return idx !== undefined ? fields[idx]?.trim() : undefined;
            };

            const getNumber = (fieldName: string): number | undefined => {
                const val = getName(fieldName);
                if (!val) return undefined;
                const num = parseFloat(val);
                return isNaN(num) ? undefined : num;
            };

            const getBool = (fieldName: string): boolean => {
                const val = getName(fieldName)?.toLowerCase();
                return val === 'yes' || val === 'true' || val === '1' || val === 'y';
            };

            const name = getName('name');
            if (!name) {
                result.warnings.push({ row: rowNum, message: 'Missing recipe name, skipping row' });
                continue;
            }

            const recipe: ParsedRecipe = {
                primaryKey: getName('primary key'),
                userCode: getName('user code'),
                name,
                description: getName('description'),
                yieldAmount: getNumber('yield amount'),
                yieldUnit: getName('yield unit'),
                servingSize: getNumber('serving size'),
                servingSizeUnit: getName('serving size unit'),
                servingsPerContainer: getNumber('servings per container'),
                recipeType: getName('recipe type'),
                category: getName('category'),
                ingredientStatement: getName('ingredient statement'),
                nutrition: {
                    calories: getNumber('calories') || 0,
                    calories_from_fat: getNumber('calories from fat') || 0,
                    total_fat_g: getNumber('total fat (g)') || 0,
                    saturated_fat_g: getNumber('saturated fat (g)') || 0,
                    trans_fat_g: getNumber('trans fat (g)') || 0,
                    polyunsaturated_fat_g: getNumber('polyunsaturated fat (g)') || 0,
                    monounsaturated_fat_g: getNumber('monounsaturated fat (g)') || 0,
                    cholesterol_mg: getNumber('cholesterol (mg)') || 0,
                    sodium_mg: getNumber('sodium (mg)') || 0,
                    total_carbohydrates_g: getNumber('total carbohydrate (g)') || 0,
                    dietary_fiber_g: getNumber('dietary fiber (g)') || 0,
                    soluble_fiber_g: getNumber('soluble fiber (g)') || 0,
                    insoluble_fiber_g: getNumber('insoluble fiber (g)') || 0,
                    total_sugars_g: getNumber('total sugars (g)') || 0,
                    added_sugars_g: getNumber('added sugars (g)') || 0,
                    protein_g: getNumber('protein (g)') || 0,
                    vitamin_d_mcg: getNumber('vitamin d (mcg)') || 0,
                    calcium_mg: getNumber('calcium (mg)') || 0,
                    iron_mg: getNumber('iron (mg)') || 0,
                    potassium_mg: getNumber('potassium (mg)') || 0,
                    vitamin_a_mcg: getNumber('vitamin a (mcg rae)') || 0,
                    vitamin_c_mg: getNumber('vitamin c (mg)') || 0,
                },
                allergens: {
                    contains_milk: getBool('contains milk'),
                    contains_eggs: getBool('contains eggs'),
                    contains_fish: getBool('contains fish'),
                    contains_shellfish: getBool('contains shellfish'),
                    contains_tree_nuts: getBool('contains tree nuts'),
                    contains_peanuts: getBool('contains peanuts'),
                    contains_wheat: getBool('contains wheat'),
                    contains_soybeans: getBool('contains soybeans'),
                    contains_sesame: getBool('contains sesame'),
                },
            };

            result.data.push(recipe);
            result.parsedRows++;
        } catch (error) {
            result.errors.push({
                row: rowNum,
                field: '',
                message: error instanceof Error ? error.message : 'Parse error',
            });
        }
    }

    result.success = result.errors.length === 0;
    return result;
}

/**
 * Parse a delimited line respecting text qualifiers
 */
function parseDelimitedLine(line: string, delimiter: string, qualifier: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === qualifier) {
            if (inQuotes && line[i + 1] === qualifier) {
                // Escaped quote
                current += qualifier;
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    fields.push(current);
    return fields;
}

// ============ Import Operations ============

/**
 * Import parsed ingredients into Exodis
 */
export async function importIngredients(
    organizationId: string,
    ingredients: ParsedIngredient[],
    options: { updateExisting?: boolean; sessionId?: string } = {}
): Promise<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: Array<{ name: string; error: string }>;
}> {
    const result = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] as Array<{ name: string; error: string }> };

    for (const ing of ingredients) {
        try {
            // Check if ingredient exists by user code or name
            const { data: existing } = await supabaseAdmin
                .from('ingredients')
                .select('id')
                .eq('organization_id', organizationId)
                .or(`user_code.eq.${ing.userCode},name.ilike.${ing.name}`)
                .limit(1)
                .single();

            const ingredientData = {
                organization_id: organizationId,
                name: ing.name,
                user_code: ing.userCode || null,
                common_name: ing.commonName || null,
                manufacturer: ing.manufacturer || null,
                source: ing.source || null,
                // Nutrition per 100g
                calories_per_100g: ing.nutrition.calories,
                protein_per_100g: ing.nutrition.protein_g,
                fat_per_100g: ing.nutrition.total_fat_g,
                saturated_fat_per_100g: ing.nutrition.saturated_fat_g,
                trans_fat_per_100g: ing.nutrition.trans_fat_g,
                cholesterol_per_100g: ing.nutrition.cholesterol_mg,
                sodium_per_100g: ing.nutrition.sodium_mg,
                carbohydrates_per_100g: ing.nutrition.total_carbohydrates_g,
                fiber_per_100g: ing.nutrition.dietary_fiber_g,
                sugar_per_100g: ing.nutrition.total_sugars_g,
                added_sugars_per_100g: ing.nutrition.added_sugars_g,
                vitamin_d_per_100g: ing.nutrition.vitamin_d_mcg,
                calcium_per_100g: ing.nutrition.calcium_mg,
                iron_per_100g: ing.nutrition.iron_mg,
                potassium_per_100g: ing.nutrition.potassium_mg,
                // Allergens
                contains_milk: ing.allergens.contains_milk,
                contains_eggs: ing.allergens.contains_eggs,
                contains_fish: ing.allergens.contains_fish,
                contains_shellfish: ing.allergens.contains_shellfish,
                contains_tree_nuts: ing.allergens.contains_tree_nuts,
                contains_peanuts: ing.allergens.contains_peanuts,
                contains_wheat: ing.allergens.contains_wheat,
                contains_soybeans: ing.allergens.contains_soybeans,
                contains_sesame: ing.allergens.contains_sesame,
                // Metadata
                genesis_primary_key: ing.primaryKey || null,
            };

            if (existing && options.updateExisting) {
                const { error } = await supabaseAdmin
                    .from('ingredients')
                    .update(ingredientData)
                    .eq('id', existing.id);

                if (error) throw error;
                result.updated++;
            } else if (existing) {
                result.skipped++;
            } else {
                const { error } = await supabaseAdmin
                    .from('ingredients')
                    .insert(ingredientData);

                if (error) throw error;
                result.created++;
            }
        } catch (error) {
            result.failed++;
            result.errors.push({
                name: ing.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return result;
}

/**
 * Import parsed recipes into Exodis
 */
export async function importRecipes(
    organizationId: string,
    recipes: ParsedRecipe[],
    options: { updateExisting?: boolean; sessionId?: string } = {}
): Promise<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: Array<{ name: string; error: string }>;
}> {
    const result = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] as Array<{ name: string; error: string }> };

    for (const recipe of recipes) {
        try {
            // Check if recipe exists
            const { data: existing } = await supabaseAdmin
                .from('recipes')
                .select('id')
                .eq('organization_id', organizationId)
                .or(`external_code.eq.${recipe.userCode},name.ilike.${recipe.name}`)
                .limit(1)
                .single();

            const recipeData = {
                organization_id: organizationId,
                name: recipe.name,
                description: recipe.description || null,
                external_code: recipe.userCode || null,
                recipe_yield_g: recipe.yieldAmount && recipe.yieldUnit === 'g'
                    ? recipe.yieldAmount
                    : (recipe.yieldAmount || 100),
                serving_size_g: recipe.servingSize || 100,
                servings_per_container: recipe.servingsPerContainer || 1,
                ingredient_statement: recipe.ingredientStatement || null,
                calculated_nutrition: recipe.nutrition,
                // Allergens
                contains_milk: recipe.allergens.contains_milk,
                contains_eggs: recipe.allergens.contains_eggs,
                contains_fish: recipe.allergens.contains_fish,
                contains_shellfish: recipe.allergens.contains_shellfish,
                contains_tree_nuts: recipe.allergens.contains_tree_nuts,
                contains_peanuts: recipe.allergens.contains_peanuts,
                contains_wheat: recipe.allergens.contains_wheat,
                contains_soybeans: recipe.allergens.contains_soybeans,
                contains_sesame: recipe.allergens.contains_sesame,
                // Metadata
                genesis_primary_key: recipe.primaryKey || null,
            };

            if (existing && options.updateExisting) {
                const { error } = await supabaseAdmin
                    .from('recipes')
                    .update(recipeData)
                    .eq('id', existing.id);

                if (error) throw error;
                result.updated++;
            } else if (existing) {
                result.skipped++;
            } else {
                const { error } = await supabaseAdmin
                    .from('recipes')
                    .insert(recipeData);

                if (error) throw error;
                result.created++;
            }
        } catch (error) {
            result.failed++;
            result.errors.push({
                name: recipe.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return result;
}

// ============ Export Operations ============

/**
 * Export recipes to EshaPort format
 */
export async function exportRecipesToEshaPort(
    organizationId: string,
    recipeIds: string[],
    options: Partial<EshaPortOptions> = {}
): Promise<string> {
    const opts = { ...DEFAULT_ESHAPORT_OPTIONS, ...options };

    const { data: recipes, error } = await supabaseAdmin
        .from('recipes')
        .select('*')
        .eq('organization_id', organizationId)
        .in('id', recipeIds);

    if (error || !recipes) {
        throw new Error('Failed to fetch recipes');
    }

    const lines: string[] = [];

    // Header row
    if (opts.includeHeaders) {
        lines.push(ESHAPORT_RECIPE_FIELDS.join(opts.fieldDelimiter));
    }

    // Data rows
    for (const recipe of recipes) {
        const nutrition = recipe.calculated_nutrition || {};
        const row = [
            recipe.genesis_primary_key || '',
            recipe.external_code || '',
            recipe.name,
            recipe.description || '',
            recipe.recipe_yield_g?.toString() || '',
            'g',
            recipe.serving_size_g?.toString() || '',
            'g',
            recipe.servings_per_container?.toString() || '',
            '', // Recipe type
            '', // Category
            nutrition.calories?.toString() || '',
            nutrition.calories_from_fat?.toString() || '',
            nutrition.total_fat_g?.toString() || '',
            nutrition.saturated_fat_g?.toString() || '',
            nutrition.trans_fat_g?.toString() || '',
            nutrition.polyunsaturated_fat_g?.toString() || '',
            nutrition.monounsaturated_fat_g?.toString() || '',
            nutrition.cholesterol_mg?.toString() || '',
            nutrition.sodium_mg?.toString() || '',
            nutrition.total_carbohydrates_g?.toString() || '',
            nutrition.dietary_fiber_g?.toString() || '',
            nutrition.soluble_fiber_g?.toString() || '',
            nutrition.insoluble_fiber_g?.toString() || '',
            nutrition.total_sugars_g?.toString() || '',
            nutrition.added_sugars_g?.toString() || '',
            nutrition.protein_g?.toString() || '',
            nutrition.vitamin_d_mcg?.toString() || '',
            nutrition.calcium_mg?.toString() || '',
            nutrition.iron_mg?.toString() || '',
            nutrition.potassium_mg?.toString() || '',
            nutrition.vitamin_a_mcg?.toString() || '',
            nutrition.vitamin_c_mg?.toString() || '',
            recipe.ingredient_statement || '',
            recipe.contains_milk ? 'Yes' : 'No',
            recipe.contains_eggs ? 'Yes' : 'No',
            recipe.contains_fish ? 'Yes' : 'No',
            recipe.contains_shellfish ? 'Yes' : 'No',
            recipe.contains_tree_nuts ? 'Yes' : 'No',
            recipe.contains_peanuts ? 'Yes' : 'No',
            recipe.contains_wheat ? 'Yes' : 'No',
            recipe.contains_soybeans ? 'Yes' : 'No',
            recipe.contains_sesame ? 'Yes' : 'No',
        ];

        // Apply text qualifier to fields with special characters
        const qualifiedRow = row.map(field => {
            if (field.includes(opts.fieldDelimiter) || field.includes('\n') || field.includes(opts.textQualifier)) {
                return `${opts.textQualifier}${field.replace(new RegExp(opts.textQualifier, 'g'), opts.textQualifier + opts.textQualifier)}${opts.textQualifier}`;
            }
            return field;
        });

        lines.push(qualifiedRow.join(opts.fieldDelimiter));
    }

    return lines.join('\n');
}

/**
 * Export ingredients to EshaPort format
 */
export async function exportIngredientsToEshaPort(
    organizationId: string,
    ingredientIds: string[],
    options: Partial<EshaPortOptions> = {}
): Promise<string> {
    const opts = { ...DEFAULT_ESHAPORT_OPTIONS, ...options };

    const { data: ingredients, error } = await supabaseAdmin
        .from('ingredients')
        .select('*')
        .eq('organization_id', organizationId)
        .in('id', ingredientIds);

    if (error || !ingredients) {
        throw new Error('Failed to fetch ingredients');
    }

    const lines: string[] = [];

    if (opts.includeHeaders) {
        lines.push(ESHAPORT_INGREDIENT_FIELDS.join(opts.fieldDelimiter));
    }

    for (const ing of ingredients) {
        const row = [
            ing.genesis_primary_key || '',
            ing.user_code || '',
            ing.name,
            ing.common_name || '',
            ing.manufacturer || '',
            ing.source || '',
            ing.calories_per_100g?.toString() || '',
            ing.protein_per_100g?.toString() || '',
            ing.fat_per_100g?.toString() || '',
            ing.saturated_fat_per_100g?.toString() || '',
            ing.trans_fat_per_100g?.toString() || '',
            ing.cholesterol_per_100g?.toString() || '',
            ing.sodium_per_100g?.toString() || '',
            ing.carbohydrates_per_100g?.toString() || '',
            ing.fiber_per_100g?.toString() || '',
            ing.sugar_per_100g?.toString() || '',
            ing.added_sugars_per_100g?.toString() || '',
            ing.vitamin_d_per_100g?.toString() || '',
            ing.calcium_per_100g?.toString() || '',
            ing.iron_per_100g?.toString() || '',
            ing.potassium_per_100g?.toString() || '',
            ing.contains_milk ? 'Yes' : 'No',
            ing.contains_eggs ? 'Yes' : 'No',
            ing.contains_fish ? 'Yes' : 'No',
            ing.contains_shellfish ? 'Yes' : 'No',
            ing.contains_tree_nuts ? 'Yes' : 'No',
            ing.contains_peanuts ? 'Yes' : 'No',
            ing.contains_wheat ? 'Yes' : 'No',
            ing.contains_soybeans ? 'Yes' : 'No',
            ing.contains_sesame ? 'Yes' : 'No',
        ];

        const qualifiedRow = row.map(field => {
            if (field.includes(opts.fieldDelimiter) || field.includes('\n') || field.includes(opts.textQualifier)) {
                return `${opts.textQualifier}${field.replace(new RegExp(opts.textQualifier, 'g'), opts.textQualifier + opts.textQualifier)}${opts.textQualifier}`;
            }
            return field;
        });

        lines.push(qualifiedRow.join(opts.fieldDelimiter));
    }

    return lines.join('\n');
}
