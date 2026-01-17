import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use service role for webhook processing (no user context)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PlexFormulationPayload {
    eventType: 'formulation.created' | 'formulation.updated' | 'formulation.deleted';
    timestamp: string;
    companyCode: string;
    data: {
        formulationId: string;
        formulationName: string;
        formulationCode?: string;
        version?: number;
        status?: string;
        ingredients?: Array<{
            ingredientId: string;
            ingredientName: string;
            quantity: number;
            unit: string;
            percentage?: number;
        }>;
        nutrition?: {
            servingSize?: number;
            servingSizeUnit?: string;
            calories?: number;
            totalFat?: number;
            saturatedFat?: number;
            transFat?: number;
            cholesterol?: number;
            sodium?: number;
            totalCarbohydrates?: number;
            dietaryFiber?: number;
            totalSugars?: number;
            addedSugars?: number;
            protein?: number;
            vitaminD?: number;
            calcium?: number;
            iron?: number;
            potassium?: number;
        };
        allergens?: string[];
        metadata?: Record<string, unknown>;
    };
}

// Verify PLEX webhook signature
function verifyPlexSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const { organizationId } = await params;

    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-plex-signature') ||
            request.headers.get('x-webhook-signature') || '';

        // Get webhook configuration for this organization
        const { data: config, error: configError } = await supabaseAdmin
            .from('webhook_configurations')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('provider', 'plex')
            .eq('is_active', true)
            .single();

        if (configError || !config) {
            return NextResponse.json(
                { error: 'Webhook not configured for this organization' },
                { status: 404 }
            );
        }

        // Verify signature if secret is configured
        if (config.api_secret && signature) {
            const isValid = verifyPlexSignature(rawBody, signature, config.api_secret);
            if (!isValid) {
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
        }

        // Parse payload
        let payload: PlexFormulationPayload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!payload.eventType || !payload.data?.formulationId) {
            return NextResponse.json(
                { error: 'Missing required fields: eventType, data.formulationId' },
                { status: 400 }
            );
        }

        // Map PLEX event type to our format
        const eventType = payload.eventType.replace('.', '_');
        const isDelete = payload.eventType === 'formulation.deleted';

        // Store webhook event
        const { data: event, error: eventError } = await supabaseAdmin
            .from('webhook_events')
            .insert({
                organization_id: organizationId,
                webhook_config_id: config.id,
                event_type: eventType,
                source: 'plex',
                external_id: payload.data.formulationId,
                payload: JSON.parse(JSON.stringify(payload)),
                headers: JSON.parse(JSON.stringify(Object.fromEntries(request.headers.entries()))),
                status: 'pending',
            })
            .select()
            .single();

        if (eventError) {
            console.error('Failed to store webhook event:', eventError);
            return NextResponse.json(
                { error: 'Failed to store event' },
                { status: 500 }
            );
        }

        // Process the event asynchronously
        processWebhookEvent(event.id, organizationId, payload, isDelete).catch(console.error);

        // Return immediate acknowledgment
        return NextResponse.json({
            success: true,
            eventId: event.id,
            message: 'Webhook received and queued for processing',
        });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Async processing of webhook event
async function processWebhookEvent(
    eventId: string,
    organizationId: string,
    payload: PlexFormulationPayload,
    isDelete: boolean
) {
    try {
        // Update event status
        await supabaseAdmin
            .from('webhook_events')
            .update({ status: 'processing' })
            .eq('id', eventId);

        const { data } = payload;
        let recipeId: string | null = null;

        // Check if recipe already exists by external ID
        const { data: existingRecipe } = await supabaseAdmin
            .from('recipes')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('external_id', data.formulationId)
            .single();

        if (isDelete) {
            // Handle deletion
            if (existingRecipe) {
                await supabaseAdmin
                    .from('recipes')
                    .update({ status: 'archived' })
                    .eq('id', existingRecipe.id);
                recipeId = existingRecipe.id;
            }
        } else {
            // Create or update recipe
            const nutrition = data.nutrition || {};
            const calculatedNutrition = {
                calories: nutrition.calories,
                total_fat_g: nutrition.totalFat,
                saturated_fat_g: nutrition.saturatedFat,
                trans_fat_g: nutrition.transFat,
                cholesterol_mg: nutrition.cholesterol,
                sodium_mg: nutrition.sodium,
                total_carbohydrates_g: nutrition.totalCarbohydrates,
                dietary_fiber_g: nutrition.dietaryFiber,
                total_sugars_g: nutrition.totalSugars,
                added_sugars_g: nutrition.addedSugars,
                protein_g: nutrition.protein,
                vitamin_d_mcg: nutrition.vitaminD,
                calcium_mg: nutrition.calcium,
                iron_mg: nutrition.iron,
                potassium_mg: nutrition.potassium,
            };

            const recipeData = {
                organization_id: organizationId,
                name: data.formulationName,
                external_id: data.formulationId,
                external_code: data.formulationCode,
                external_version: data.version,
                external_source: 'plex',
                serving_size_g: nutrition.servingSize || 100,
                calculated_nutrition: calculatedNutrition,
                allergen_statement: data.allergens?.join(', '),
                status: data.status === 'active' ? 'active' : 'draft',
                plex_metadata: data.metadata,
            };

            if (existingRecipe) {
                // Update existing recipe
                await supabaseAdmin
                    .from('recipes')
                    .update(recipeData)
                    .eq('id', existingRecipe.id);
                recipeId = existingRecipe.id;
            } else {
                // Create new recipe
                const { data: newRecipe } = await supabaseAdmin
                    .from('recipes')
                    .insert(recipeData)
                    .select()
                    .single();
                recipeId = newRecipe?.id || null;
            }

            // Sync ingredients if provided
            if (data.ingredients && data.ingredients.length > 0 && recipeId) {
                await syncRecipeIngredients(
                    organizationId,
                    recipeId,
                    data.ingredients
                );
            }
        }

        // Generate compliance report if recipe was created/updated
        let complianceReportId: string | null = null;
        if (recipeId && !isDelete) {
            const { data: report } = await supabaseAdmin
                .from('compliance_reports')
                .insert({
                    organization_id: organizationId,
                    recipe_id: recipeId,
                    trigger_source: 'webhook',
                    webhook_event_id: eventId,
                    report_type: 'full',
                    status: 'pending',
                })
                .select()
                .single();

            complianceReportId = report?.id || null;

            // Trigger compliance check (would be handled by a background job)
            // For now, we just create the pending report
        }

        // Update event as completed
        await supabaseAdmin
            .from('webhook_events')
            .update({
                status: 'completed',
                processed_at: new Date().toISOString(),
                recipe_id: recipeId,
                compliance_report_id: complianceReportId,
            })
            .eq('id', eventId);

    } catch (error) {
        console.error('Event processing error:', error);

        // Update event as failed
        await supabaseAdmin
            .from('webhook_events')
            .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error',
                retry_count: 1, // Track retries
            })
            .eq('id', eventId);
    }
}

// Sync recipe ingredients from PLEX data
async function syncRecipeIngredients(
    organizationId: string,
    recipeId: string,
    ingredients: PlexFormulationPayload['data']['ingredients']
) {
    if (!ingredients) return;

    // Remove existing recipe ingredients
    await supabaseAdmin
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId);

    // Add new ingredients
    for (const ing of ingredients) {
        // Find or create ingredient
        let { data: ingredient } = await supabaseAdmin
            .from('ingredients')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('external_id', ing.ingredientId)
            .single();

        if (!ingredient) {
            // Create placeholder ingredient
            const { data: newIngredient } = await supabaseAdmin
                .from('ingredients')
                .insert({
                    organization_id: organizationId,
                    name: ing.ingredientName,
                    external_id: ing.ingredientId,
                    external_source: 'plex',
                })
                .select()
                .single();
            ingredient = newIngredient;
        }

        if (ingredient) {
            // Add to recipe
            await supabaseAdmin
                .from('recipe_ingredients')
                .insert({
                    recipe_id: recipeId,
                    ingredient_id: ingredient.id,
                    amount_g: ing.quantity,
                    percentage: ing.percentage,
                });
        }
    }
}

// GET endpoint to check webhook status
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    const { organizationId } = await params;

    return NextResponse.json({
        status: 'active',
        organization_id: organizationId,
        supported_events: [
            'formulation.created',
            'formulation.updated',
            'formulation.deleted',
        ],
        documentation: 'https://docs.exodis.com/integrations/plex',
    });
}
