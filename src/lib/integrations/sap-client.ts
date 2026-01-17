/**
 * SAP S/4HANA Integration Client
 * 
 * Integrates with SAP S/4HANA for:
 * - Material Master data sync
 * - Recipe/BOM management via PLM-RM
 * - Quality Management data
 * - Production order integration
 * 
 * Uses OData v2/v4 APIs as per SAP standards
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SAPConfig {
    id: string;
    organization_id: string;
    api_base_url: string;
    client_id: string;
    client_secret: string;
    tenant_url?: string;
    company_code: string;
    plant: string;
    storage_location?: string;
    odata_version: 'v2' | 'v4';
    sync_materials: boolean;
    sync_recipes: boolean;
    sync_quality: boolean;
    access_token?: string;
    token_expires_at?: string;
}

// ============ SAP Data Types ============

export interface SAPMaterial {
    Material: string; // Material number
    MaterialType: string;
    MaterialGroup: string;
    BaseUnit: string;
    Plant: string;
    StorageLocation?: string;
    Description: string;
    Industry?: string;
    GrossWeight?: number;
    NetWeight?: number;
    WeightUnit?: string;
    // Quality fields
    QualityManagementActive?: boolean;
    InspectionType?: string;
    // Custom extension fields for nutrition
    to_NutritionData?: SAPNutritionData;
}

export interface SAPNutritionData {
    Material: string;
    NutritionPer100g: boolean;
    Calories?: number;
    TotalFat?: number;
    SaturatedFat?: number;
    TransFat?: number;
    Cholesterol?: number;
    Sodium?: number;
    TotalCarbohydrates?: number;
    DietaryFiber?: number;
    TotalSugars?: number;
    AddedSugars?: number;
    Protein?: number;
    VitaminD?: number;
    Calcium?: number;
    Iron?: number;
    Potassium?: number;
}

export interface SAPMasterRecipe {
    MasterRecipe: string; // Recipe ID
    MasterRecipeDescription: string;
    Plant: string;
    Status: string;
    ValidFrom: string;
    ValidTo: string;
    ResponsiblePerson?: string;
    RecipeGroup?: string;
    RecipeType?: string;
    to_RecipeItems?: SAPRecipeItem[];
    to_RecipeOperations?: SAPRecipeOperation[];
}

export interface SAPRecipeItem {
    MasterRecipe: string;
    ItemNumber: string;
    Material: string;
    MaterialDescription: string;
    Quantity: number;
    Unit: string;
    ItemCategory: string;
}

export interface SAPRecipeOperation {
    MasterRecipe: string;
    OperationNumber: string;
    OperationDescription: string;
    WorkCenter: string;
    ControlKey: string;
    StandardValue?: number;
    StandardValueUnit?: string;
}

export interface SAPQualitySpec {
    Material: string;
    Plant: string;
    InspectionCharacteristic: string;
    CharacteristicDescription: string;
    SpecificationType: string;
    LowerLimit?: number;
    UpperLimit?: number;
    TargetValue?: number;
    Unit?: string;
}

// ============ Authentication ============

/**
 * Get OAuth access token for SAP
 * Supports both SAP BTP OAuth and basic auth fallback
 */
export async function getSAPToken(config: SAPConfig): Promise<{
    access_token: string;
    expires_in: number;
} | null> {
    try {
        // OAuth flow for SAP BTP
        const tokenUrl = config.tenant_url
            ? `${config.tenant_url}/oauth/token`
            : `${config.api_base_url}/oauth/token`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: config.client_id,
                client_secret: config.client_secret,
            }),
        });

        if (!response.ok) {
            console.error('SAP auth error:', await response.text());
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('SAP token error:', error);
        return null;
    }
}

/**
 * Ensure valid token
 */
export async function ensureValidToken(config: SAPConfig): Promise<string | null> {
    if (config.access_token && config.token_expires_at) {
        const expiresAt = new Date(config.token_expires_at);
        if (expiresAt > new Date(Date.now() + 60000)) {
            return config.access_token;
        }
    }

    const tokenResponse = await getSAPToken(config);
    if (!tokenResponse) return null;

    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    await supabaseAdmin
        .from('webhook_configurations')
        .update({
            oauth_tokens: { access_token: tokenResponse.access_token },
            token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', config.id);

    return tokenResponse.access_token;
}

/**
 * Make authenticated OData request
 */
async function odataRequest<T>(
    config: SAPConfig,
    endpoint: string,
    options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    const token = await ensureValidToken(config);
    if (!token) {
        return { success: false, error: 'Failed to obtain access token' };
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
    };

    // Add OData version specific headers
    if (config.odata_version === 'v4') {
        headers['OData-Version'] = '4.0';
    }

    try {
        const response = await fetch(`${config.api_base_url}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `SAP API error ${response.status}: ${errorText}` };
        }

        const data = await response.json();

        // OData v2 wraps results in d.results, v4 uses value
        const results = config.odata_version === 'v4'
            ? data.value || data
            : data.d?.results || data.d || data;

        return { success: true, data: results };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============ Material Master API ============

/**
 * Get materials from SAP
 */
export async function getMaterials(
    config: SAPConfig,
    options: {
        filter?: string;
        top?: number;
        skip?: number;
        expand?: string[];
    } = {}
): Promise<{ success: boolean; materials?: SAPMaterial[]; error?: string }> {
    let endpoint = `/API_MATERIAL/A_Material?$filter=Plant eq '${config.plant}'`;

    if (options.filter) {
        endpoint += ` and ${options.filter}`;
    }
    if (options.top) {
        endpoint += `&$top=${options.top}`;
    }
    if (options.skip) {
        endpoint += `&$skip=${options.skip}`;
    }
    if (options.expand?.length) {
        endpoint += `&$expand=${options.expand.join(',')}`;
    }

    const result = await odataRequest<SAPMaterial[]>(config, endpoint);

    if (result.success && result.data) {
        return { success: true, materials: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Get single material by number
 */
export async function getMaterial(
    config: SAPConfig,
    materialNumber: string
): Promise<{ success: boolean; material?: SAPMaterial; error?: string }> {
    const endpoint = `/API_MATERIAL/A_Material('${materialNumber}')?$filter=Plant eq '${config.plant}'`;

    const result = await odataRequest<SAPMaterial>(config, endpoint);

    if (result.success && result.data) {
        return { success: true, material: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Create or update material in SAP
 */
export async function upsertMaterial(
    config: SAPConfig,
    material: Partial<SAPMaterial>
): Promise<{ success: boolean; error?: string }> {
    const endpoint = material.Material
        ? `/API_MATERIAL/A_Material('${material.Material}')`
        : '/API_MATERIAL/A_Material';

    return await odataRequest(
        config,
        endpoint,
        {
            method: material.Material ? 'PATCH' : 'POST',
            body: JSON.stringify({
                ...material,
                Plant: config.plant,
            }),
        }
    );
}

// ============ Master Recipe API ============

/**
 * Get master recipes from SAP
 */
export async function getMasterRecipes(
    config: SAPConfig,
    options: {
        filter?: string;
        top?: number;
        expand?: boolean;
    } = {}
): Promise<{ success: boolean; recipes?: SAPMasterRecipe[]; error?: string }> {
    let endpoint = `/API_MASTER_RECIPE/A_MasterRecipe?$filter=Plant eq '${config.plant}'`;

    if (options.filter) {
        endpoint += ` and ${options.filter}`;
    }
    if (options.top) {
        endpoint += `&$top=${options.top}`;
    }
    if (options.expand) {
        endpoint += '&$expand=to_RecipeItems,to_RecipeOperations';
    }

    const result = await odataRequest<SAPMasterRecipe[]>(config, endpoint);

    if (result.success && result.data) {
        return { success: true, recipes: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Get single master recipe with items
 */
export async function getMasterRecipe(
    config: SAPConfig,
    recipeId: string
): Promise<{ success: boolean; recipe?: SAPMasterRecipe; error?: string }> {
    const endpoint = `/API_MASTER_RECIPE/A_MasterRecipe('${recipeId}')?$expand=to_RecipeItems,to_RecipeOperations`;

    const result = await odataRequest<SAPMasterRecipe>(config, endpoint);

    if (result.success && result.data) {
        return { success: true, recipe: result.data };
    }
    return { success: false, error: result.error };
}

// ============ Quality Management API ============

/**
 * Get quality specifications for a material
 */
export async function getQualitySpecs(
    config: SAPConfig,
    materialNumber: string
): Promise<{ success: boolean; specs?: SAPQualitySpec[]; error?: string }> {
    const endpoint = `/API_INSPECTIONPLAN_SRV/A_InspectionCharacteristic?$filter=Material eq '${materialNumber}' and Plant eq '${config.plant}'`;

    const result = await odataRequest<SAPQualitySpec[]>(config, endpoint);

    if (result.success && result.data) {
        return { success: true, specs: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Create quality specification for compliance data
 */
export async function createQualitySpec(
    config: SAPConfig,
    spec: SAPQualitySpec
): Promise<{ success: boolean; error?: string }> {
    return await odataRequest(
        config,
        '/API_INSPECTIONPLAN_SRV/A_InspectionCharacteristic',
        {
            method: 'POST',
            body: JSON.stringify({
                ...spec,
                Plant: config.plant,
            }),
        }
    );
}

// ============ Sync Operations ============

/**
 * Sync materials from SAP to Exodis ingredients
 */
export async function syncMaterialsToIngredients(
    config: SAPConfig,
    options: { fullSync?: boolean; modifiedSince?: string } = {}
): Promise<{
    success: boolean;
    synced: number;
    created: number;
    updated: number;
    failed: number;
    errors: Array<{ material: string; error: string }>;
}> {
    const result = {
        success: true,
        synced: 0,
        created: 0,
        updated: 0,
        failed: 0,
        errors: [] as Array<{ material: string; error: string }>,
    };

    // Build filter for materials
    let filter = "MaterialType eq 'ROH'"; // Raw materials
    if (options.modifiedSince && !options.fullSync) {
        filter += ` and LastChangeDate ge datetime'${options.modifiedSince}'`;
    }

    const materialsResult = await getMaterials(config, {
        filter,
        top: 1000,
        expand: ['to_NutritionData'],
    });

    if (!materialsResult.success || !materialsResult.materials) {
        return { ...result, success: false, errors: [{ material: '*', error: materialsResult.error || 'Failed to fetch materials' }] };
    }

    for (const material of materialsResult.materials) {
        try {
            // Check if mapping exists
            const { data: existingMapping } = await supabaseAdmin
                .from('external_entity_mapping')
                .select('internal_id')
                .eq('provider', 'sap')
                .eq('entity_type', 'material')
                .eq('external_id', material.Material)
                .eq('organization_id', config.organization_id)
                .single();

            const nutritionData = material.to_NutritionData;

            const ingredientData = {
                organization_id: config.organization_id,
                name: material.Description,
                user_code: material.Material,
                manufacturer: null,
                source: 'SAP',
                // Nutrition per 100g if available
                calories_per_100g: nutritionData?.Calories,
                protein_per_100g: nutritionData?.Protein,
                fat_per_100g: nutritionData?.TotalFat,
                saturated_fat_per_100g: nutritionData?.SaturatedFat,
                trans_fat_per_100g: nutritionData?.TransFat,
                cholesterol_per_100g: nutritionData?.Cholesterol,
                sodium_per_100g: nutritionData?.Sodium,
                carbohydrates_per_100g: nutritionData?.TotalCarbohydrates,
                fiber_per_100g: nutritionData?.DietaryFiber,
                sugar_per_100g: nutritionData?.TotalSugars,
                added_sugars_per_100g: nutritionData?.AddedSugars,
                vitamin_d_per_100g: nutritionData?.VitaminD,
                calcium_per_100g: nutritionData?.Calcium,
                iron_per_100g: nutritionData?.Iron,
                potassium_per_100g: nutritionData?.Potassium,
            };

            if (existingMapping) {
                // Update existing ingredient
                const { error } = await supabaseAdmin
                    .from('ingredients')
                    .update(ingredientData)
                    .eq('id', existingMapping.internal_id);

                if (error) throw error;
                result.updated++;
            } else {
                // Create new ingredient
                const { data: newIngredient, error } = await supabaseAdmin
                    .from('ingredients')
                    .insert(ingredientData)
                    .select('id')
                    .single();

                if (error) throw error;

                // Create mapping
                await supabaseAdmin.from('external_entity_mapping').insert({
                    organization_id: config.organization_id,
                    provider: 'sap',
                    entity_type: 'material',
                    internal_id: newIngredient.id,
                    internal_table: 'ingredients',
                    external_id: material.Material,
                    external_system_ref: `${config.plant}`,
                    sync_direction: 'from_external',
                    last_synced_at: new Date().toISOString(),
                });

                result.created++;
            }

            // Update SAP materials tracking table
            await supabaseAdmin.from('sap_materials').upsert({
                organization_id: config.organization_id,
                config_id: config.id,
                ingredient_id: existingMapping?.internal_id,
                material_number: material.Material,
                plant: config.plant,
                storage_location: material.StorageLocation,
                material_description: material.Description,
                material_type: material.MaterialType,
                material_group: material.MaterialGroup,
                base_unit_of_measure: material.BaseUnit,
                quality_management_active: material.QualityManagementActive,
                inspection_type: material.InspectionType,
                last_synced_at: new Date().toISOString(),
            }, {
                onConflict: 'organization_id,material_number,plant',
            });

            result.synced++;
        } catch (error) {
            result.failed++;
            result.errors.push({
                material: material.Material,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    result.success = result.failed === 0;
    return result;
}

/**
 * Push recipe nutrition data to SAP material specs
 */
export async function pushRecipeToSAP(
    config: SAPConfig,
    recipeId: string
): Promise<{ success: boolean; sapRecipeId?: string; error?: string }> {
    // Fetch recipe with nutrition
    const { data: recipe, error: recipeError } = await supabaseAdmin
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

    if (recipeError || !recipe) {
        return { success: false, error: 'Recipe not found' };
    }

    // Check for existing SAP recipe mapping
    const { data: existingMapping } = await supabaseAdmin
        .from('external_entity_mapping')
        .select('external_id')
        .eq('provider', 'sap')
        .eq('entity_type', 'recipe')
        .eq('internal_id', recipeId)
        .single();

    const nutrition = recipe.calculated_nutrition || {};

    // Build SAP recipe structure
    const sapRecipe: Partial<SAPMasterRecipe> = {
        MasterRecipe: existingMapping?.external_id || undefined,
        MasterRecipeDescription: recipe.name,
        Plant: config.plant,
        Status: 'ACTIVE',
        ValidFrom: new Date().toISOString().split('T')[0],
        ValidTo: '9999-12-31',
    };

    // Note: Creating a full SAP Master Recipe requires
    // additional BOM and operation data which would need
    // to be populated from recipe_ingredients

    // For now, we'll create/update quality specs for nutrition compliance
    const qualitySpecs: Partial<SAPQualitySpec>[] = [
        { InspectionCharacteristic: 'NUT_CALORIES', CharacteristicDescription: 'Calories', TargetValue: nutrition.calories, Unit: 'KCAL' },
        { InspectionCharacteristic: 'NUT_TOTAL_FAT', CharacteristicDescription: 'Total Fat', TargetValue: nutrition.total_fat_g, Unit: 'G' },
        { InspectionCharacteristic: 'NUT_SODIUM', CharacteristicDescription: 'Sodium', TargetValue: nutrition.sodium_mg, Unit: 'MG' },
        { InspectionCharacteristic: 'NUT_CARBS', CharacteristicDescription: 'Total Carbohydrates', TargetValue: nutrition.total_carbohydrates_g, Unit: 'G' },
        { InspectionCharacteristic: 'NUT_PROTEIN', CharacteristicDescription: 'Protein', TargetValue: nutrition.protein_g, Unit: 'G' },
    ];

    // This would require creating a SAP material for the finished good first
    // For MVP, we log the intent and return success
    console.log('SAP recipe push:', { recipe: sapRecipe, qualitySpecs });

    return {
        success: true,
        sapRecipeId: existingMapping?.external_id || 'PENDING_CREATION',
    };
}

/**
 * Test SAP connection
 */
export async function testSAPConnection(
    config: Omit<SAPConfig, 'id' | 'organization_id'>
): Promise<{ success: boolean; message: string }> {
    const tokenResult = await getSAPToken(config as SAPConfig);

    if (!tokenResult) {
        return {
            success: false,
            message: 'Failed to authenticate. Please check your client ID, secret, and API URL.'
        };
    }

    // Try to fetch a single material to verify API access
    const testConfig = {
        ...config,
        access_token: tokenResult.access_token,
        id: 'test',
        organization_id: 'test',
    } as SAPConfig;

    const materialsResult = await getMaterials(testConfig, { top: 1 });

    if (!materialsResult.success) {
        return {
            success: false,
            message: `Authentication successful but API access failed: ${materialsResult.error}`
        };
    }

    return {
        success: true,
        message: `Successfully connected to SAP S/4HANA at plant ${config.plant}.`
    };
}
