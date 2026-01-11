/**
 * USDA Allergen Detection Utility
 * 
 * Detects potential allergens in USDA food items based on their descriptions,
 * category codes, and food group classifications.
 * 
 * Based on FDA Big 9 allergens:
 * - Milk
 * - Eggs
 * - Fish
 * - Shellfish (Crustacean)
 * - Tree Nuts
 * - Peanuts
 * - Wheat
 * - Soybeans
 * - Sesame
 */

export interface AllergenFlags {
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

// Keywords that indicate allergen presence
const ALLERGEN_KEYWORDS: Record<keyof AllergenFlags, string[]> = {
    contains_milk: [
        'milk', 'dairy', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt',
        'whey', 'casein', 'lactose', 'ghee', 'custard', 'ice cream',
        'buttermilk', 'half and half', 'sour cream', 'cottage cheese',
        'ricotta', 'mozzarella', 'cheddar', 'parmesan', 'brie', 'camembert',
        'gouda', 'swiss cheese', 'cream cheese', 'condensed milk', 'evaporated milk',
        'skim milk', 'whole milk', 'low-fat milk', 'nonfat milk', 'milkfat'
    ],
    contains_eggs: [
        'egg', 'eggs', 'albumin', 'albumen', 'meringue', 'mayonnaise',
        'eggnog', 'ovalbumin', 'ovomucin', 'ovomucoid', 'ovovitellin',
        'globulin', 'livetin', 'lysozyme', 'surimi', 'yolk', 'egg white',
        'egg yolk', 'whole egg', 'dried egg', 'powdered egg'
    ],
    contains_fish: [
        'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'mahi mahi',
        'anchovy', 'anchovies', 'sardine', 'sardines', 'mackerel', 'herring',
        'trout', 'bass', 'catfish', 'perch', 'pike', 'flounder', 'sole',
        'swordfish', 'pollock', 'haddock', 'whiting', 'snapper', 'grouper',
        'fish sauce', 'fish oil', 'omega-3', 'caviar', 'roe', 'surimi'
    ],
    contains_shellfish: [
        'shellfish', 'shrimp', 'prawn', 'prawns', 'crab', 'lobster',
        'crayfish', 'crawfish', 'langostino', 'scallop', 'scallops',
        'clam', 'clams', 'mussel', 'mussels', 'oyster', 'oysters',
        'squid', 'calamari', 'octopus', 'abalone', 'snail', 'escargot',
        'crustacean', 'crustaceans', 'mollusc', 'mollusk', 'krill'
    ],
    contains_tree_nuts: [
        'almond', 'almonds', 'cashew', 'cashews', 'walnut', 'walnuts',
        'pecan', 'pecans', 'pistachio', 'pistachios', 'macadamia',
        'brazil nut', 'brazil nuts', 'hazelnut', 'hazelnuts', 'filbert',
        'chestnut', 'chestnuts', 'pine nut', 'pine nuts', 'pignoli',
        'praline', 'nougat', 'marzipan', 'gianduja', 'nutella',
        'tree nut', 'tree nuts', 'nut butter', 'almond butter',
        'cashew butter', 'almond milk', 'coconut' // Note: FDA considers coconut a tree nut
    ],
    contains_peanuts: [
        'peanut', 'peanuts', 'groundnut', 'groundnuts', 'arachis',
        'peanut butter', 'peanut oil', 'peanut flour', 'goober',
        'monkey nut', 'earth nut', 'beer nut', 'beer nuts'
    ],
    contains_wheat: [
        'wheat', 'flour', 'bread', 'pasta', 'noodle', 'noodles', 'spaghetti',
        'macaroni', 'fettuccine', 'tortilla', 'pita', 'bagel', 'cracker',
        'crackers', 'biscuit', 'biscuits', 'cake', 'cookie', 'cookies',
        'muffin', 'muffins', 'pastry', 'croissant', 'donut', 'doughnut',
        'pie crust', 'pizza', 'breadcrumb', 'breadcrumbs', 'panko',
        'couscous', 'bulgur', 'semolina', 'durum', 'spelt', 'farina',
        'kamut', 'einkorn', 'emmer', 'triticale', 'seitan', 'gluten',
        'farro', 'wheat germ', 'wheat bran', 'wheat starch', 'modified food starch'
    ],
    contains_soybeans: [
        'soy', 'soya', 'soybean', 'soybeans', 'edamame', 'tofu',
        'tempeh', 'miso', 'natto', 'soy sauce', 'shoyu', 'tamari',
        'soy milk', 'soy protein', 'soy flour', 'soy lecithin',
        'textured vegetable protein', 'tvp', 'soy oil', 'soybean oil',
        'hydrolyzed soy', 'soy isolate', 'soy concentrate'
    ],
    contains_sesame: [
        'sesame', 'sesame seed', 'sesame seeds', 'tahini', 'tahina',
        'halvah', 'halva', 'hummus', 'falafel', 'sesame oil',
        'benne', 'benne seed', 'gingelly', 'gingelly oil', 'til',
        'sesame flour', 'sesame paste', 'sesamol', 'sesamolin'
    ]
};

// USDA Food Category codes that strongly indicate allergens
const USDA_CATEGORY_ALLERGEN_MAP: Record<string, (keyof AllergenFlags)[]> = {
    'Dairy and Egg Products': ['contains_milk', 'contains_eggs'],
    'Dairy products': ['contains_milk'],
    'Milk': ['contains_milk'],
    'Cheese': ['contains_milk'],
    'Eggs': ['contains_eggs'],
    'Finfish and Shellfish Products': ['contains_fish', 'contains_shellfish'],
    'Fish': ['contains_fish'],
    'Shellfish': ['contains_shellfish'],
    'Nut and Seed Products': ['contains_tree_nuts', 'contains_peanuts', 'contains_sesame'],
    'Nuts': ['contains_tree_nuts'],
    'Seeds': ['contains_sesame'],
    'Legumes and Legume Products': ['contains_peanuts', 'contains_soybeans'],
    'Legumes': ['contains_soybeans'],
    'Cereal Grains and Pasta': ['contains_wheat'],
    'Baked Products': ['contains_wheat', 'contains_eggs', 'contains_milk'],
    'Breads': ['contains_wheat'],
    'Pasta': ['contains_wheat'],
    'Breakfast Cereals': ['contains_wheat'],
};

/**
 * Detect allergens from a USDA food item's description and optional category
 */
export function detectAllergensFromUSDA(
    description: string,
    foodCategory?: string,
    brandName?: string
): AllergenFlags {
    const flags: AllergenFlags = {
        contains_milk: false,
        contains_eggs: false,
        contains_fish: false,
        contains_shellfish: false,
        contains_tree_nuts: false,
        contains_peanuts: false,
        contains_wheat: false,
        contains_soybeans: false,
        contains_sesame: false,
    };

    // Combine all text for keyword search
    const searchText = [description, brandName || ''].join(' ').toLowerCase();

    // Check keywords for each allergen
    for (const [allergenKey, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
        const key = allergenKey as keyof AllergenFlags;
        for (const keyword of keywords) {
            // Use word boundary matching to avoid false positives
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(searchText)) {
                flags[key] = true;
                break;
            }
        }
    }

    // Also check food category if provided
    if (foodCategory) {
        const categoryAllergens = USDA_CATEGORY_ALLERGEN_MAP[foodCategory];
        if (categoryAllergens) {
            for (const allergen of categoryAllergens) {
                flags[allergen] = true;
            }
        }
    }

    return flags;
}

/**
 * Generate a human-readable list of detected allergens
 */
export function formatDetectedAllergens(flags: AllergenFlags): string[] {
    const detected: string[] = [];

    if (flags.contains_milk) detected.push('Milk');
    if (flags.contains_eggs) detected.push('Eggs');
    if (flags.contains_fish) detected.push('Fish');
    if (flags.contains_shellfish) detected.push('Shellfish');
    if (flags.contains_tree_nuts) detected.push('Tree Nuts');
    if (flags.contains_peanuts) detected.push('Peanuts');
    if (flags.contains_wheat) detected.push('Wheat');
    if (flags.contains_soybeans) detected.push('Soybeans');
    if (flags.contains_sesame) detected.push('Sesame');

    return detected;
}

/**
 * Check if any allergen is detected
 */
export function hasAnyAllergen(flags: AllergenFlags): boolean {
    return Object.values(flags).some(v => v === true);
}
