/**
 * FDA Serving Size Validation Service
 * 
 * Validates that a product's serving size complies with FDA RACC regulations.
 * Reference: 21 CFR 101.12 and 21 CFR 101.9(b)
 */

import { FDA_RACC_TABLE, getRACCById, type RACCCategory } from './fda-racc';

export interface ServingSizeValidation {
    isValid: boolean;
    raccCategory: RACCCategory | null;
    suggestedServingSize: number | null;
    suggestedHouseholdMeasure: string | null;
    messages: ValidationMessage[];
    singleServingRequired: boolean;
    singleServingContainerRule: 'single' | 'dual' | 'standard';
}

export interface ValidationMessage {
    type: 'error' | 'warning' | 'info' | 'success';
    message: string;
    cfrReference?: string;
    details?: Record<string, any>;
}

export interface ServingSizeInput {
    servingSizeG: number;
    servingSizeHousehold?: string;
    totalProductWeight: number;
    raccCategoryId: string;
    servingsPerContainer?: number;
}

/**
 * Validate serving size against FDA RACC requirements
 */
export function validateServingSize(input: ServingSizeInput): ServingSizeValidation {
    const messages: ValidationMessage[] = [];
    let isValid = true;

    // Get RACC category
    const racc = getRACCById(input.raccCategoryId);

    if (!racc) {
        return {
            isValid: false,
            raccCategory: null,
            suggestedServingSize: null,
            suggestedHouseholdMeasure: null,
            messages: [{
                type: 'error',
                message: `RACC category "${input.raccCategoryId}" not found`,
            }],
            singleServingRequired: false,
            singleServingContainerRule: 'standard',
        };
    }

    // Convert RACC to grams if needed (most are already in grams)
    const raccInGrams = racc.racc_unit === 'mL'
        ? racc.racc_amount * 1 // Approximate 1mL = 1g for most beverages/liquids
        : racc.racc_amount;

    // Calculate percentage of RACC
    const percentOfRACC = (input.servingSizeG / raccInGrams) * 100;

    // Single serving container rules (21 CFR 101.9(b)(6))
    let singleServingContainerRule: 'single' | 'dual' | 'standard' = 'standard';
    const totalToRaccRatio = input.totalProductWeight / raccInGrams;

    if (totalToRaccRatio <= 2) {
        // Package ≤200% RACC: Must be labeled as single serving
        singleServingContainerRule = 'single';
        messages.push({
            type: 'info',
            message: `Package contains ≤200% of RACC (${Math.round(totalToRaccRatio * 100)}%). Must be labeled as single serving.`,
            cfrReference: '21 CFR 101.9(b)(6)',
            details: { totalToRaccRatio: Math.round(totalToRaccRatio * 100) + '%' },
        });
    } else if (totalToRaccRatio > 2 && totalToRaccRatio <= 3) {
        // Package >200% but ≤300% RACC: Can label as 1 or 2 servings with dual column
        singleServingContainerRule = 'dual';
        messages.push({
            type: 'info',
            message: `Package contains ${Math.round(totalToRaccRatio * 100)}% of RACC. May use dual-column format showing per-serving and per-container values.`,
            cfrReference: '21 CFR 101.9(b)(11)',
            details: { totalToRaccRatio: Math.round(totalToRaccRatio * 100) + '%' },
        });
    }

    // Validate serving size is within acceptable range of RACC
    // FDA allows serving size to differ from RACC but should be based on it
    if (percentOfRACC < 50) {
        messages.push({
            type: 'warning',
            message: `Serving size (${input.servingSizeG}g) is less than 50% of RACC (${raccInGrams}g). Consider increasing.`,
            cfrReference: '21 CFR 101.9(b)(2)',
            details: { percentOfRACC: Math.round(percentOfRACC) + '%' },
        });
        isValid = false;
    } else if (percentOfRACC > 200) {
        messages.push({
            type: 'warning',
            message: `Serving size (${input.servingSizeG}g) exceeds 200% of RACC (${raccInGrams}g). Consider decreasing.`,
            cfrReference: '21 CFR 101.9(b)(2)',
            details: { percentOfRACC: Math.round(percentOfRACC) + '%' },
        });
        isValid = false;
    } else {
        messages.push({
            type: 'success',
            message: `Serving size (${input.servingSizeG}g) is ${Math.round(percentOfRACC)}% of RACC (${raccInGrams}g) - within acceptable range.`,
            cfrReference: '21 CFR 101.9(b)',
            details: { percentOfRACC: Math.round(percentOfRACC) + '%' },
        });
    }

    // Validate gram rounding (21 CFR 101.9(b)(7))
    const roundingValidation = validateGramRounding(input.servingSizeG);
    if (!roundingValidation.isValid) {
        messages.push({
            type: 'error',
            message: `Serving size should be rounded to ${roundingValidation.suggestedValue}g per FDA rounding rules.`,
            cfrReference: '21 CFR 101.9(b)(7)',
            details: {
                currentValue: input.servingSizeG,
                suggestedValue: roundingValidation.suggestedValue,
            },
        });
        isValid = false;
    }

    // Validate servings per container rounding (21 CFR 101.9(b)(8))
    if (input.servingsPerContainer) {
        const spcRounding = validateServingsPerContainerRounding(input.servingsPerContainer);
        if (!spcRounding.isValid) {
            messages.push({
                type: 'error',
                message: `Servings per container should be displayed as "${spcRounding.suggestedDisplay}" per FDA rounding rules.`,
                cfrReference: '21 CFR 101.9(b)(8)',
                details: {
                    currentValue: input.servingsPerContainer,
                    suggestedValue: spcRounding.suggestedValue,
                    suggestedDisplay: spcRounding.suggestedDisplay,
                },
            });
            isValid = false;
        }
    }

    // Calculate suggested serving size based on RACC
    const suggestedServingSize = calculateSuggestedServingSize(raccInGrams, input.totalProductWeight);

    return {
        isValid,
        raccCategory: racc,
        suggestedServingSize,
        suggestedHouseholdMeasure: racc.household_measure || racc.label_statement,
        messages,
        singleServingRequired: singleServingContainerRule === 'single',
        singleServingContainerRule,
    };
}

/**
 * Validate that gram value is properly rounded per FDA rules
 * 21 CFR 101.9(b)(7):
 * - <2g: round to 0.1g
 * - 2-5g: round to 0.5g  
 * - >5g: round to nearest gram
 */
function validateGramRounding(grams: number): { isValid: boolean; suggestedValue: number } {
    let expectedRounded: number;

    if (grams < 2) {
        expectedRounded = Math.round(grams * 10) / 10;
    } else if (grams >= 2 && grams < 5) {
        expectedRounded = Math.round(grams * 2) / 2;
    } else {
        expectedRounded = Math.round(grams);
    }

    const isValid = Math.abs(grams - expectedRounded) < 0.01;

    return { isValid, suggestedValue: expectedRounded };
}

/**
 * Validate servings per container rounding per FDA rules
 * 21 CFR 101.9(b)(8):
 * - <2: round to 0.1
 * - 2-5: round to 0.5, use "about"
 * - >5: round to nearest whole, use "about"
 */
function validateServingsPerContainerRounding(servings: number): {
    isValid: boolean;
    suggestedValue: number;
    suggestedDisplay: string;
} {
    let expectedRounded: number;
    let prefix = '';

    if (servings < 2) {
        expectedRounded = Math.round(servings * 10) / 10;
    } else if (servings >= 2 && servings <= 5) {
        expectedRounded = Math.round(servings * 2) / 2;
        if (Math.abs(servings - expectedRounded) > 0.01) prefix = 'about ';
    } else {
        expectedRounded = Math.round(servings);
        if (Math.abs(servings - expectedRounded) > 0.01) prefix = 'about ';
    }

    const isValid = Math.abs(servings - expectedRounded) < 0.01;

    return {
        isValid,
        suggestedValue: expectedRounded,
        suggestedDisplay: `${prefix}${expectedRounded}`,
    };
}

/**
 * Calculate a suggested serving size based on RACC and total product weight
 */
function calculateSuggestedServingSize(raccGrams: number, totalWeight: number): number {
    // If product is small (single serving potential)
    if (totalWeight <= raccGrams * 2) {
        // Use the whole product as serving
        return validateGramRounding(totalWeight).suggestedValue;
    }

    // Otherwise, use RACC as basis, properly rounded
    return validateGramRounding(raccGrams).suggestedValue;
}

/**
 * Get serving size recommendation based on RACC category and product weight
 */
export function getServingSizeRecommendation(
    raccCategoryId: string,
    totalProductWeight: number
): {
    recommendedServingSize: number;
    recommendedServingsPerContainer: number;
    householdMeasure: string;
    labelStatement: string;
    isSingleServing: boolean;
    canUseDualColumn: boolean;
} | null {
    const racc = getRACCById(raccCategoryId);
    if (!racc) return null;

    const raccGrams = racc.racc_unit === 'mL' ? racc.racc_amount : racc.racc_amount;
    const ratio = totalProductWeight / raccGrams;

    let recommendedServingSize: number;
    let recommendedServingsPerContainer: number;
    let isSingleServing = false;
    let canUseDualColumn = false;

    if (ratio <= 2) {
        // Single serving container
        recommendedServingSize = totalProductWeight;
        recommendedServingsPerContainer = 1;
        isSingleServing = true;
    } else if (ratio <= 3) {
        // Could be 1 or 2 servings (dual column eligible)
        recommendedServingSize = raccGrams;
        recommendedServingsPerContainer = Math.round(totalProductWeight / raccGrams);
        canUseDualColumn = true;
    } else {
        // Multiple servings
        recommendedServingSize = raccGrams;
        recommendedServingsPerContainer = Math.round(totalProductWeight / raccGrams);
    }

    // Apply rounding
    recommendedServingSize = validateGramRounding(recommendedServingSize).suggestedValue;
    const spcRounding = validateServingsPerContainerRounding(recommendedServingsPerContainer);
    recommendedServingsPerContainer = spcRounding.suggestedValue;

    return {
        recommendedServingSize,
        recommendedServingsPerContainer,
        householdMeasure: racc.household_measure || racc.label_statement,
        labelStatement: racc.label_statement,
        isSingleServing,
        canUseDualColumn,
    };
}

/**
 * Check if serving size matches RACC for a category
 */
export function checkServingSizeMatchesRACC(
    servingSizeG: number,
    raccCategoryId: string
): {
    matches: boolean;
    percentOfRACC: number;
    raccAmount: number;
    message: string;
} {
    const racc = getRACCById(raccCategoryId);
    if (!racc) {
        return {
            matches: false,
            percentOfRACC: 0,
            raccAmount: 0,
            message: 'RACC category not found',
        };
    }

    const raccGrams = racc.racc_unit === 'mL' ? racc.racc_amount : racc.racc_amount;
    const percentOfRACC = (servingSizeG / raccGrams) * 100;

    // FDA allows some flexibility - typically 67-150% of RACC is reasonable
    const matches = percentOfRACC >= 67 && percentOfRACC <= 150;

    let message: string;
    if (matches) {
        message = `Serving size is ${Math.round(percentOfRACC)}% of RACC - acceptable`;
    } else if (percentOfRACC < 67) {
        message = `Serving size is only ${Math.round(percentOfRACC)}% of RACC - may be too small`;
    } else {
        message = `Serving size is ${Math.round(percentOfRACC)}% of RACC - may be too large`;
    }

    return { matches, percentOfRACC, raccAmount: raccGrams, message };
}
