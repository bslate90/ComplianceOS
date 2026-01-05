/**
 * PLEX ERP Sync Service
 * 
 * Handles bi-directional data sync with PLEX by Rockwell Automation:
 * - Push nutritional data to PLEX data sources
 * - Push compliance reports to PLEX
 * - Process sync queue items
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PlexConfig {
    id: string;
    webhook_url: string;
    api_key: string;
    api_secret: string;
    plex_company_code: string;
    plex_data_source_key: string;
    plex_environment: 'production' | 'test';
}

interface PlexNutritionPayload {
    companyCode: string;
    dataSourceKey: string;
    action: 'create' | 'update' | 'delete';
    data: {
        externalId: string;
        name: string;
        code?: string;
        version?: number;
        servingSize: number;
        servingSizeUnit: string;
        servingsPerContainer?: number;
        nutrition: {
            calories?: number;
            caloriesFromFat?: number;
            totalFat?: number;
            saturatedFat?: number;
            transFat?: number;
            polyunsaturatedFat?: number;
            monounsaturatedFat?: number;
            cholesterol?: number;
            sodium?: number;
            totalCarbohydrates?: number;
            dietaryFiber?: number;
            solubleFiber?: number;
            insolubleFiber?: number;
            totalSugars?: number;
            addedSugars?: number;
            sugarAlcohol?: number;
            protein?: number;
            vitaminD?: number;
            calcium?: number;
            iron?: number;
            potassium?: number;
            vitaminA?: number;
            vitaminC?: number;
        };
        dailyValues?: {
            totalFatDV?: number;
            saturatedFatDV?: number;
            cholesterolDV?: number;
            sodiumDV?: number;
            totalCarbohydratesDV?: number;
            dietaryFiberDV?: number;
            addedSugarsDV?: number;
            vitaminDDV?: number;
            calciumDV?: number;
            ironDV?: number;
            potassiumDV?: number;
        };
        allergens?: {
            containsMilk?: boolean;
            containsEggs?: boolean;
            containsFish?: boolean;
            containsShellfish?: boolean;
            containsTreeNuts?: boolean;
            containsPeanuts?: boolean;
            containsWheat?: boolean;
            containsSoybeans?: boolean;
            containsSesame?: boolean;
        };
        ingredientStatement?: string;
        complianceStatus?: 'compliant' | 'warnings' | 'errors';
        lastComplianceCheck?: string;
    };
}

interface PlexCompliancePayload {
    companyCode: string;
    dataSourceKey: string;
    report: {
        reportId: string;
        formulationId: string;
        formulationName: string;
        reportDate: string;
        status: 'compliant' | 'warnings' | 'errors';
        totalChecks: number;
        passedChecks: number;
        warningChecks: number;
        failedChecks: number;
        summary: string;
        details: Array<{
            checkId: string;
            category: string;
            rule: string;
            status: 'pass' | 'warning' | 'fail';
            message: string;
            recommendation?: string;
        }>;
    };
}

/**
 * Get PLEX API base URL based on environment
 */
function getPlexApiUrl(config: PlexConfig): string {
    // PLEX Connect API endpoints
    const urls = {
        production: 'https://connect.plex.com/api/v1',
        test: 'https://test.connect.plex.com/api/v1',
    };
    return config.webhook_url || urls[config.plex_environment];
}

/**
 * Generate authentication headers for PLEX API
 */
function getPlexAuthHeaders(config: PlexConfig): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`,
        'X-Plex-Company-Code': config.plex_company_code,
        'X-Plex-Data-Source': config.plex_data_source_key,
    };
}

/**
 * Push nutritional data to PLEX for a recipe
 */
export async function pushNutritionToPlex(
    config: PlexConfig,
    recipeId: string,
    action: 'create' | 'update' | 'delete' = 'update'
): Promise<{ success: boolean; error?: string; response?: unknown }> {
    try {
        // Fetch recipe with full details
        const { data: recipe, error: recipeError } = await supabaseAdmin
            .from('recipes')
            .select(`
                *,
                recipe_ingredients(
                    *,
                    ingredient:ingredients(*)
                )
            `)
            .eq('id', recipeId)
            .single();

        if (recipeError || !recipe) {
            return { success: false, error: 'Recipe not found' };
        }

        const nutrition = recipe.calculated_nutrition || {};

        // Build PLEX payload
        const payload: PlexNutritionPayload = {
            companyCode: config.plex_company_code,
            dataSourceKey: config.plex_data_source_key,
            action,
            data: {
                externalId: recipe.id,
                name: recipe.name,
                code: recipe.external_code || recipe.id.slice(0, 8),
                version: recipe.external_version || 1,
                servingSize: recipe.serving_size_g || 100,
                servingSizeUnit: 'g',
                servingsPerContainer: recipe.servings_per_container,
                nutrition: {
                    calories: nutrition.calories,
                    totalFat: nutrition.total_fat_g,
                    saturatedFat: nutrition.saturated_fat_g,
                    transFat: nutrition.trans_fat_g,
                    cholesterol: nutrition.cholesterol_mg,
                    sodium: nutrition.sodium_mg,
                    totalCarbohydrates: nutrition.total_carbohydrates_g,
                    dietaryFiber: nutrition.dietary_fiber_g,
                    totalSugars: nutrition.total_sugars_g,
                    addedSugars: nutrition.added_sugars_g,
                    protein: nutrition.protein_g,
                    vitaminD: nutrition.vitamin_d_mcg,
                    calcium: nutrition.calcium_mg,
                    iron: nutrition.iron_mg,
                    potassium: nutrition.potassium_mg,
                },
                allergens: {
                    containsMilk: recipe.contains_milk,
                    containsEggs: recipe.contains_eggs,
                    containsFish: recipe.contains_fish,
                    containsShellfish: recipe.contains_shellfish,
                    containsTreeNuts: recipe.contains_tree_nuts,
                    containsPeanuts: recipe.contains_peanuts,
                    containsWheat: recipe.contains_wheat,
                    containsSoybeans: recipe.contains_soybeans,
                    containsSesame: recipe.contains_sesame,
                },
                ingredientStatement: recipe.ingredient_statement,
            },
        };

        // Send to PLEX
        const response = await fetch(`${getPlexApiUrl(config)}/nutrition`, {
            method: action === 'delete' ? 'DELETE' : 'POST',
            headers: getPlexAuthHeaders(config),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `PLEX API error: ${response.status} - ${errorText}`
            };
        }

        const result = await response.json();
        return { success: true, response: result };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Push compliance report to PLEX
 */
export async function pushComplianceReportToPlex(
    config: PlexConfig,
    reportId: string
): Promise<{ success: boolean; error?: string; response?: unknown }> {
    try {
        // Fetch compliance report with recipe
        const { data: report, error: reportError } = await supabaseAdmin
            .from('compliance_reports')
            .select(`
                *,
                recipe:recipes(id, name, external_id, external_code)
            `)
            .eq('id', reportId)
            .single();

        if (reportError || !report) {
            return { success: false, error: 'Report not found' };
        }

        // Build PLEX compliance payload
        const payload: PlexCompliancePayload = {
            companyCode: config.plex_company_code,
            dataSourceKey: config.plex_data_source_key,
            report: {
                reportId: report.id,
                formulationId: report.recipe?.external_id || report.recipe_id,
                formulationName: report.recipe?.name || 'Unknown',
                reportDate: report.generated_at || report.created_at,
                status: report.overall_status || 'compliant',
                totalChecks: report.total_checks || 0,
                passedChecks: report.passed_checks || 0,
                warningChecks: report.warning_checks || 0,
                failedChecks: report.failed_checks || 0,
                summary: report.summary || '',
                details: (report.results || []).map((r: {
                    id?: string;
                    category?: string;
                    rule?: string;
                    status?: string;
                    message?: string;
                    recommendation?: string
                }) => ({
                    checkId: r.id || '',
                    category: r.category || 'general',
                    rule: r.rule || '',
                    status: r.status || 'pass',
                    message: r.message || '',
                    recommendation: r.recommendation,
                })),
            },
        };

        // Send to PLEX
        const response = await fetch(`${getPlexApiUrl(config)}/compliance-reports`, {
            method: 'POST',
            headers: getPlexAuthHeaders(config),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `PLEX API error: ${response.status} - ${errorText}`
            };
        }

        const result = await response.json();
        return { success: true, response: result };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Process pending items in the sync queue
 */
export async function processSyncQueue(limit: number = 10): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
}> {
    const result = { processed: 0, succeeded: 0, failed: 0 };

    // Get pending queue items
    const { data: queueItems } = await supabaseAdmin
        .from('plex_sync_queue')
        .select(`
            *,
            webhook_config:webhook_configurations(*)
        `)
        .eq('status', 'pending')
        .lte('next_attempt_at', new Date().toISOString())
        .lt('attempts', 3)
        .order('created_at')
        .limit(limit);

    if (!queueItems || queueItems.length === 0) {
        return result;
    }

    for (const item of queueItems) {
        result.processed++;

        // Mark as sending
        await supabaseAdmin
            .from('plex_sync_queue')
            .update({ status: 'sending', last_attempt_at: new Date().toISOString() })
            .eq('id', item.id);

        try {
            const config = item.webhook_config as PlexConfig;
            let syncResult: { success: boolean; error?: string; response?: unknown };

            switch (item.entity_type) {
                case 'recipe':
                case 'nutrition':
                    syncResult = await pushNutritionToPlex(
                        config,
                        item.entity_id,
                        item.action
                    );
                    break;
                case 'compliance_report':
                    syncResult = await pushComplianceReportToPlex(config, item.entity_id);
                    break;
                default:
                    syncResult = { success: false, error: `Unknown entity type: ${item.entity_type}` };
            }

            if (syncResult.success) {
                result.succeeded++;
                await supabaseAdmin
                    .from('plex_sync_queue')
                    .update({
                        status: 'sent',
                        response_data: syncResult.response,
                    })
                    .eq('id', item.id);
            } else {
                throw new Error(syncResult.error);
            }

        } catch (error) {
            result.failed++;
            const attempts = item.attempts + 1;

            await supabaseAdmin
                .from('plex_sync_queue')
                .update({
                    status: attempts >= 3 ? 'failed' : 'pending',
                    attempts,
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                    next_attempt_at: attempts >= 3
                        ? null
                        : new Date(Date.now() + attempts * 60000).toISOString(), // Exponential backoff
                })
                .eq('id', item.id);
        }
    }

    return result;
}

/**
 * Get PLEX integration status for an organization
 */
export async function getPlexIntegrationStatus(organizationId: string): Promise<{
    configured: boolean;
    active: boolean;
    lastSync?: string;
    pendingSync: number;
    recentEvents: number;
    errors: number;
}> {
    // Get config
    const { data: config } = await supabaseAdmin
        .from('webhook_configurations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('provider', 'plex')
        .single();

    // Get queue stats
    const { count: pendingSync } = await supabaseAdmin
        .from('plex_sync_queue')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

    // Get recent events count
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentEvents } = await supabaseAdmin
        .from('webhook_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', oneDayAgo);

    // Get error count
    const { count: errors } = await supabaseAdmin
        .from('webhook_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'failed')
        .gte('created_at', oneDayAgo);

    return {
        configured: !!config,
        active: config?.is_active || false,
        lastSync: config?.last_sync_at,
        pendingSync: pendingSync || 0,
        recentEvents: recentEvents || 0,
        errors: errors || 0,
    };
}
