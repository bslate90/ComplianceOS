/**
 * FoodLogiQ Connect API Client
 * 
 * Integrates with FoodLogiQ Connect for food safety and traceability:
 * - Product registration and management
 * - Supplier compliance tracking
 * - Critical Tracking Events (CTEs)
 * - Key Data Elements (KDEs)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// FoodLogiQ API Environments
const FOODLOGIQ_URLS = {
    production: 'https://connect.foodlogiq.com/api/v2',
    sandbox: 'https://sandbox.connect.foodlogiq.com/api/v2',
};

export interface FoodLogiQConfig {
    id: string;
    client_id: string;
    client_secret: string;
    environment: 'production' | 'sandbox';
    community_id: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
}

export interface FoodLogiQProduct {
    id?: string;
    name: string;
    gtin?: string;
    brand?: string;
    description?: string;
    category?: string;
    allergens?: string[];
    ingredients?: string;
    nutritionFacts?: {
        servingSize: string;
        servingsPerContainer: number;
        nutrients: Record<string, { amount: number; unit: string; dailyValue?: number }>;
    };
    attributes?: Record<string, unknown>;
}

export interface FoodLogiQSupplier {
    id: string;
    name: string;
    status: 'approved' | 'pending' | 'suspended' | 'rejected';
    complianceScore?: number;
    lastAuditDate?: string;
    certifications?: string[];
}

export interface FoodLogiQEvent {
    eventType: string; // 'shipping', 'receiving', 'transformation', etc.
    eventTime: string;
    products: Array<{
        productId: string;
        quantity: number;
        unit: string;
        lotNumber?: string;
    }>;
    location?: {
        gln?: string; // Global Location Number
        name: string;
        address?: string;
    };
    businessTransaction?: string;
    kdes?: Record<string, unknown>; // Key Data Elements
}

/**
 * Get OAuth access token for FoodLogiQ
 */
export async function getFoodLogiQToken(config: FoodLogiQConfig): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
} | null> {
    try {
        const baseUrl = FOODLOGIQ_URLS[config.environment];

        const response = await fetch(`${baseUrl}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: config.client_id,
                client_secret: config.client_secret,
                scope: 'products suppliers events',
            }),
        });

        if (!response.ok) {
            console.error('FoodLogiQ auth error:', await response.text());
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('FoodLogiQ token error:', error);
        return null;
    }
}

/**
 * Refresh OAuth token if expired
 */
export async function ensureValidToken(config: FoodLogiQConfig): Promise<string | null> {
    // Check if current token is valid
    if (config.access_token && config.token_expires_at) {
        const expiresAt = new Date(config.token_expires_at);
        if (expiresAt > new Date(Date.now() + 60000)) { // 1 minute buffer
            return config.access_token;
        }
    }

    // Refresh token
    const tokenResponse = await getFoodLogiQToken(config);
    if (!tokenResponse) return null;

    // Update stored token
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    await supabaseAdmin
        .from('webhook_configurations')
        .update({
            oauth_tokens: {
                access_token: tokenResponse.access_token,
                refresh_token: tokenResponse.refresh_token,
            },
            token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', config.id);

    return tokenResponse.access_token;
}

/**
 * Make authenticated request to FoodLogiQ API
 */
async function foodlogiQRequest<T>(
    config: FoodLogiQConfig,
    endpoint: string,
    options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    const token = await ensureValidToken(config);
    if (!token) {
        return { success: false, error: 'Failed to obtain access token' };
    }

    const baseUrl = FOODLOGIQ_URLS[config.environment];

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Community-Id': config.community_id,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `API error ${response.status}: ${errorText}` };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============ Product Management ============

/**
 * Register a product in FoodLogiQ
 */
export async function registerProduct(
    config: FoodLogiQConfig,
    product: FoodLogiQProduct
): Promise<{ success: boolean; productId?: string; error?: string }> {
    const result = await foodlogiQRequest<{ id: string }>(
        config,
        '/products',
        {
            method: 'POST',
            body: JSON.stringify(product),
        }
    );

    if (result.success && result.data) {
        return { success: true, productId: result.data.id };
    }
    return { success: false, error: result.error };
}

/**
 * Update a product in FoodLogiQ
 */
export async function updateProduct(
    config: FoodLogiQConfig,
    productId: string,
    product: Partial<FoodLogiQProduct>
): Promise<{ success: boolean; error?: string }> {
    return await foodlogiQRequest(
        config,
        `/products/${productId}`,
        {
            method: 'PATCH',
            body: JSON.stringify(product),
        }
    );
}

/**
 * Get product details from FoodLogiQ
 */
export async function getProduct(
    config: FoodLogiQConfig,
    productId: string
): Promise<{ success: boolean; product?: FoodLogiQProduct; error?: string }> {
    const result = await foodlogiQRequest<FoodLogiQProduct>(
        config,
        `/products/${productId}`
    );

    if (result.success && result.data) {
        return { success: true, product: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * List products in FoodLogiQ community
 */
export async function listProducts(
    config: FoodLogiQConfig,
    options: { limit?: number; offset?: number; search?: string } = {}
): Promise<{ success: boolean; products?: FoodLogiQProduct[]; total?: number; error?: string }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.search) params.set('search', options.search);

    const result = await foodlogiQRequest<{ items: FoodLogiQProduct[]; total: number }>(
        config,
        `/products?${params.toString()}`
    );

    if (result.success && result.data) {
        return { success: true, products: result.data.items, total: result.data.total };
    }
    return { success: false, error: result.error };
}

// ============ Supplier Management ============

/**
 * Get supplier compliance data
 */
export async function getSupplier(
    config: FoodLogiQConfig,
    supplierId: string
): Promise<{ success: boolean; supplier?: FoodLogiQSupplier; error?: string }> {
    const result = await foodlogiQRequest<FoodLogiQSupplier>(
        config,
        `/suppliers/${supplierId}`
    );

    if (result.success && result.data) {
        return { success: true, supplier: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * List suppliers in community with compliance status
 */
export async function listSuppliers(
    config: FoodLogiQConfig,
    options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ success: boolean; suppliers?: FoodLogiQSupplier[]; total?: number; error?: string }> {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());

    const result = await foodlogiQRequest<{ items: FoodLogiQSupplier[]; total: number }>(
        config,
        `/suppliers?${params.toString()}`
    );

    if (result.success && result.data) {
        return { success: true, suppliers: result.data.items, total: result.data.total };
    }
    return { success: false, error: result.error };
}

// ============ Traceability Events ============

/**
 * Submit a Critical Tracking Event (CTE)
 */
export async function submitTraceabilityEvent(
    config: FoodLogiQConfig,
    event: FoodLogiQEvent
): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const result = await foodlogiQRequest<{ id: string }>(
        config,
        '/events',
        {
            method: 'POST',
            body: JSON.stringify(event),
        }
    );

    if (result.success && result.data) {
        return { success: true, eventId: result.data.id };
    }
    return { success: false, error: result.error };
}

/**
 * Get traceability history for a product
 */
export async function getProductTraceability(
    config: FoodLogiQConfig,
    productId: string,
    lotNumber?: string
): Promise<{ success: boolean; events?: FoodLogiQEvent[]; error?: string }> {
    const params = new URLSearchParams();
    params.set('productId', productId);
    if (lotNumber) params.set('lotNumber', lotNumber);

    const result = await foodlogiQRequest<{ items: FoodLogiQEvent[] }>(
        config,
        `/events/trace?${params.toString()}`
    );

    if (result.success && result.data) {
        return { success: true, events: result.data.items };
    }
    return { success: false, error: result.error };
}

// ============ Sync Operations ============

/**
 * Sync a recipe from Exodis to FoodLogiQ as a product
 */
export async function syncRecipeToFoodLogiQ(
    config: FoodLogiQConfig,
    recipeId: string
): Promise<{ success: boolean; foodlogiqProductId?: string; error?: string }> {
    // Fetch recipe with details
    const { data: recipe, error: recipeError } = await supabaseAdmin
        .from('recipes')
        .select(`
            *,
            recipe_ingredients(
                *,
                ingredient:ingredients(*)
            ),
            labels(*)
        `)
        .eq('id', recipeId)
        .single();

    if (recipeError || !recipe) {
        return { success: false, error: 'Recipe not found' };
    }

    // Check if already mapped
    const { data: existingMapping } = await supabaseAdmin
        .from('external_entity_mapping')
        .select('external_id')
        .eq('provider', 'foodlogiq')
        .eq('entity_type', 'recipe')
        .eq('internal_id', recipeId)
        .single();

    const nutrition = recipe.calculated_nutrition || {};

    // Build FoodLogiQ product from recipe
    const product: FoodLogiQProduct = {
        name: recipe.name,
        description: recipe.description,
        brand: recipe.brand,
        gtin: recipe.gtin,
        ingredients: recipe.ingredient_statement,
        allergens: [
            recipe.contains_milk && 'Milk',
            recipe.contains_eggs && 'Eggs',
            recipe.contains_fish && 'Fish',
            recipe.contains_shellfish && 'Shellfish',
            recipe.contains_tree_nuts && 'Tree Nuts',
            recipe.contains_peanuts && 'Peanuts',
            recipe.contains_wheat && 'Wheat',
            recipe.contains_soybeans && 'Soybeans',
            recipe.contains_sesame && 'Sesame',
        ].filter(Boolean) as string[],
        nutritionFacts: {
            servingSize: `${recipe.serving_size_g}g`,
            servingsPerContainer: recipe.servings_per_container || 1,
            nutrients: {
                calories: { amount: nutrition.calories || 0, unit: 'kcal' },
                totalFat: { amount: nutrition.total_fat_g || 0, unit: 'g' },
                saturatedFat: { amount: nutrition.saturated_fat_g || 0, unit: 'g' },
                transFat: { amount: nutrition.trans_fat_g || 0, unit: 'g' },
                cholesterol: { amount: nutrition.cholesterol_mg || 0, unit: 'mg' },
                sodium: { amount: nutrition.sodium_mg || 0, unit: 'mg' },
                totalCarbohydrates: { amount: nutrition.total_carbohydrates_g || 0, unit: 'g' },
                dietaryFiber: { amount: nutrition.dietary_fiber_g || 0, unit: 'g' },
                totalSugars: { amount: nutrition.total_sugars_g || 0, unit: 'g' },
                addedSugars: { amount: nutrition.added_sugars_g || 0, unit: 'g' },
                protein: { amount: nutrition.protein_g || 0, unit: 'g' },
            },
        },
    };

    let result;
    if (existingMapping?.external_id) {
        // Update existing product
        result = await updateProduct(config, existingMapping.external_id, product);
        if (result.success) {
            return { success: true, foodlogiqProductId: existingMapping.external_id };
        }
    } else {
        // Create new product
        result = await registerProduct(config, product);
        if (result.success && result.productId) {
            // Save mapping
            await supabaseAdmin.from('external_entity_mapping').insert({
                organization_id: recipe.organization_id,
                provider: 'foodlogiq',
                entity_type: 'recipe',
                internal_id: recipeId,
                internal_table: 'recipes',
                external_id: result.productId,
                sync_direction: 'to_external',
                last_synced_at: new Date().toISOString(),
            });
            return { success: true, foodlogiqProductId: result.productId };
        }
    }

    return { success: false, error: result.error };
}

/**
 * Test FoodLogiQ connection
 */
export async function testFoodLogiQConnection(
    config: Omit<FoodLogiQConfig, 'id'>
): Promise<{ success: boolean; message: string }> {
    const tokenResult = await getFoodLogiQToken(config as FoodLogiQConfig);

    if (!tokenResult) {
        return {
            success: false,
            message: 'Failed to authenticate. Please check your client ID and secret.'
        };
    }

    // Try to list products to verify community access
    const testConfig = { ...config, access_token: tokenResult.access_token } as FoodLogiQConfig;
    const productsResult = await listProducts(testConfig, { limit: 1 });

    if (!productsResult.success) {
        return {
            success: false,
            message: `Authentication successful but community access failed: ${productsResult.error}`
        };
    }

    return {
        success: true,
        message: `Successfully connected to FoodLogiQ. Found ${productsResult.total || 0} products in community.`
    };
}
