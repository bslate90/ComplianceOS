import type { ExtractedNutritionData } from '@/lib/types/supplier.types';

// Extract a numeric value after a keyword, handling various formats
function extractAfterKeyword(text: string, keyword: string): number | undefined {
    // Create a pattern that matches the keyword followed by anything, then a number
    // Handle formats like:
    // - "Sodium (mg) 39100"
    // - "Sodium ﴾mg﴿ 39100" (unicode)
    // - "Sodium: 39100"
    // - "Sodium 39100"
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match keyword, then optionally (unit), then whitespace, then number
    const pattern = new RegExp(
        escapedKeyword + '[^0-9]*?(\\d+(?:\\.\\d+)?)',
        'i'
    );

    const match = text.match(pattern);
    if (match && match[1]) {
        const value = parseFloat(match[1]);
        console.log(`  ${keyword}: found "${match[0].substring(0, 40)}" -> ${value}`);
        return value;
    }
    return undefined;
}

// Extract string value after a keyword
function extractStringAfterKeyword(text: string, keyword: string): string | undefined {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedKeyword + '[:\\s]+([^\\n]+)', 'i');
    const match = text.match(pattern);
    if (match && match[1]) {
        return match[1].trim().split(/\s{2,}/)[0]; // Take text until double space
    }
    return undefined;
}

export function parseNutritionFromText(rawText: string): ExtractedNutritionData {
    // Normalize text - replace newlines with spaces, collapse multiple spaces
    const text = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    console.log('=== Parsing Nutrition Data ===');
    console.log('Text sample:', text.substring(0, 200));

    const extracted: ExtractedNutritionData = {
        raw_text: rawText,
        name: extractStringAfterKeyword(text, 'Item'),
        brand: extractStringAfterKeyword(text, 'Supplier'),
        serving_size_g: 100, // Default for spec sheets
        calories: extractAfterKeyword(text, 'Calories') || extractAfterKeyword(text, 'Energy'),
        total_fat_g: extractAfterKeyword(text, 'Total Fat'),
        saturated_fat_g: extractAfterKeyword(text, 'Saturated Fat'),
        trans_fat_g: extractAfterKeyword(text, 'Trans Fat'),
        cholesterol_mg: extractAfterKeyword(text, 'Cholesterol'),
        sodium_mg: extractAfterKeyword(text, 'Sodium'),
        total_carbohydrates_g: extractAfterKeyword(text, 'Total Carbohydrates') || extractAfterKeyword(text, 'Total Carbs'),
        dietary_fiber_g: extractAfterKeyword(text, 'Dietary Fiber') || extractAfterKeyword(text, 'Total Dietary Fiber'),
        total_sugars_g: extractAfterKeyword(text, 'Total Sugars'),
        added_sugars_g: extractAfterKeyword(text, 'Added Sugars'),
        protein_g: extractAfterKeyword(text, 'Protein'),
        vitamin_d_mcg: extractAfterKeyword(text, 'Vitamin D'),
        calcium_mg: extractAfterKeyword(text, 'Calcium'),
        iron_mg: extractAfterKeyword(text, 'Iron'),
        potassium_mg: extractAfterKeyword(text, 'Potassium'),
    };

    // Calculate confidence based on key fields
    const keyFields = ['calories', 'total_fat_g', 'sodium_mg', 'total_carbohydrates_g', 'protein_g'];
    const filledCount = keyFields.filter(f => extracted[f as keyof ExtractedNutritionData] !== undefined).length;
    extracted.confidence = Math.round((filledCount / keyFields.length) * 100);

    console.log('=== Extracted Results ===');
    console.log({
        name: extracted.name,
        brand: extracted.brand,
        calories: extracted.calories,
        sodium: extracted.sodium_mg,
        totalFat: extracted.total_fat_g,
        carbs: extracted.total_carbohydrates_g,
        protein: extracted.protein_g,
        confidence: extracted.confidence,
    });

    return extracted;
}

// Normalize to 100g serving (usually already 100g for spec sheets)
export function normalizeToServing(data: ExtractedNutritionData, targetServingG: number = 100): ExtractedNutritionData {
    if (!data.serving_size_g || data.serving_size_g === targetServingG) {
        return { ...data, serving_size_g: targetServingG };
    }

    const ratio = targetServingG / data.serving_size_g;

    return {
        ...data,
        serving_size_g: targetServingG,
        calories: data.calories ? Math.round(data.calories * ratio) : undefined,
        total_fat_g: data.total_fat_g ? Math.round(data.total_fat_g * ratio * 10) / 10 : undefined,
        saturated_fat_g: data.saturated_fat_g ? Math.round(data.saturated_fat_g * ratio * 10) / 10 : undefined,
        trans_fat_g: data.trans_fat_g ? Math.round(data.trans_fat_g * ratio * 10) / 10 : undefined,
        cholesterol_mg: data.cholesterol_mg ? Math.round(data.cholesterol_mg * ratio) : undefined,
        sodium_mg: data.sodium_mg ? Math.round(data.sodium_mg * ratio) : undefined,
        total_carbohydrates_g: data.total_carbohydrates_g ? Math.round(data.total_carbohydrates_g * ratio * 10) / 10 : undefined,
        dietary_fiber_g: data.dietary_fiber_g ? Math.round(data.dietary_fiber_g * ratio * 10) / 10 : undefined,
        total_sugars_g: data.total_sugars_g ? Math.round(data.total_sugars_g * ratio * 10) / 10 : undefined,
        added_sugars_g: data.added_sugars_g ? Math.round(data.added_sugars_g * ratio * 10) / 10 : undefined,
        protein_g: data.protein_g ? Math.round(data.protein_g * ratio * 10) / 10 : undefined,
        vitamin_d_mcg: data.vitamin_d_mcg ? Math.round(data.vitamin_d_mcg * ratio * 10) / 10 : undefined,
        calcium_mg: data.calcium_mg ? Math.round(data.calcium_mg * ratio) : undefined,
        iron_mg: data.iron_mg ? Math.round(data.iron_mg * ratio * 10) / 10 : undefined,
        potassium_mg: data.potassium_mg ? Math.round(data.potassium_mg * ratio) : undefined,
    };
}
