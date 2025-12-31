/**
 * Big 9 Allergens (FDA Required)
 */

export const ALLERGENS = [
    { key: 'milk', label: 'Milk', field: 'contains_milk' },
    { key: 'eggs', label: 'Eggs', field: 'contains_eggs' },
    { key: 'fish', label: 'Fish', field: 'contains_fish' },
    { key: 'shellfish', label: 'Shellfish', field: 'contains_shellfish' },
    { key: 'tree_nuts', label: 'Tree Nuts', field: 'contains_tree_nuts' },
    { key: 'peanuts', label: 'Peanuts', field: 'contains_peanuts' },
    { key: 'wheat', label: 'Wheat', field: 'contains_wheat' },
    { key: 'soybeans', label: 'Soybeans', field: 'contains_soybeans' },
    { key: 'sesame', label: 'Sesame', field: 'contains_sesame' },
] as const;

export type AllergenKey = typeof ALLERGENS[number]['key'];
export type AllergenField = typeof ALLERGENS[number]['field'];

/**
 * Get allergen label from field name
 */
export function getAllergenLabel(field: string): string | undefined {
    return ALLERGENS.find(a => a.field === field)?.label;
}

/**
 * Get list of allergens that are present
 */
export function getPresentAllergens(data: Record<string, boolean>): string[] {
    return ALLERGENS
        .filter(a => data[a.field])
        .map(a => a.label);
}
