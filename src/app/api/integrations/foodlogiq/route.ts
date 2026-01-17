/**
 * FoodLogiQ Integration API
 * 
 * Endpoints for configuring and managing FoodLogiQ Connect integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    testFoodLogiQConnection,
    syncRecipeToFoodLogiQ,
    listProducts,
    listSuppliers,
    FoodLogiQConfig
} from '@/lib/integrations/foodlogiq-client';

// GET - Get FoodLogiQ configuration and status
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get FoodLogiQ configuration
    const { data: config } = await supabase
        .from('webhook_configurations')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('provider', 'foodlogiq')
        .single();

    if (!config) {
        return NextResponse.json({
            configured: false,
            config: null,
        });
    }

    // Don't expose secrets
    const safeConfig = {
        id: config.id,
        name: config.name,
        environment: config.provider_config?.environment || 'sandbox',
        community_id: config.provider_config?.community_id,
        is_active: config.is_active,
        last_sync_at: config.last_sync_at,
        last_error: config.last_error,
        sync_products: config.provider_config?.sync_products ?? true,
        sync_suppliers: config.provider_config?.sync_suppliers ?? true,
    };

    return NextResponse.json({
        configured: true,
        config: safeConfig,
    });
}

// POST - Create or update FoodLogiQ configuration
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
        client_id,
        client_secret,
        environment = 'sandbox',
        community_id,
        sync_products = true,
        sync_suppliers = true,
        is_active = true,
    } = body;

    if (!client_id || !client_secret || !community_id) {
        return NextResponse.json({
            error: 'Missing required fields: client_id, client_secret, community_id',
        }, { status: 400 });
    }

    // Test connection first
    const testResult = await testFoodLogiQConnection({
        client_id,
        client_secret,
        environment,
        community_id,
    } as FoodLogiQConfig);

    if (!testResult.success) {
        return NextResponse.json({
            error: 'Connection test failed',
            details: testResult.message,
        }, { status: 400 });
    }

    // Check for existing config
    const { data: existing } = await supabase
        .from('webhook_configurations')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('provider', 'foodlogiq')
        .single();

    const configData = {
        organization_id: profile.organization_id,
        name: 'FoodLogiQ Connect',
        provider: 'foodlogiq',
        api_key: client_id,
        api_secret: client_secret,
        is_active,
        provider_config: {
            environment,
            community_id,
            sync_products,
            sync_suppliers,
        },
    };

    let result;
    if (existing) {
        result = await supabase
            .from('webhook_configurations')
            .update(configData)
            .eq('id', existing.id)
            .select()
            .single();
    } else {
        result = await supabase
            .from('webhook_configurations')
            .insert(configData)
            .select()
            .single();
    }

    if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        message: testResult.message,
        configId: result.data.id,
    });
}

// DELETE - Remove FoodLogiQ configuration
export async function DELETE() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { error } = await supabase
        .from('webhook_configurations')
        .delete()
        .eq('organization_id', profile.organization_id)
        .eq('provider', 'foodlogiq');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// PATCH - Sync specific actions
export async function PATCH(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, recipeId } = body;

    // Get FoodLogiQ config
    const { data: config } = await supabase
        .from('webhook_configurations')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('provider', 'foodlogiq')
        .single();

    if (!config) {
        return NextResponse.json({ error: 'FoodLogiQ not configured' }, { status: 404 });
    }

    const foodlogiQConfig: FoodLogiQConfig = {
        id: config.id,
        client_id: config.api_key,
        client_secret: config.api_secret,
        environment: config.provider_config?.environment || 'sandbox',
        community_id: config.provider_config?.community_id,
        access_token: config.oauth_tokens?.access_token,
        refresh_token: config.oauth_tokens?.refresh_token,
        token_expires_at: config.token_expires_at,
    };

    switch (action) {
        case 'sync_recipe':
            if (!recipeId) {
                return NextResponse.json({ error: 'Recipe ID required' }, { status: 400 });
            }
            const syncResult = await syncRecipeToFoodLogiQ(foodlogiQConfig, recipeId);
            return NextResponse.json(syncResult);

        case 'list_products':
            const productsResult = await listProducts(foodlogiQConfig, { limit: 50 });
            return NextResponse.json(productsResult);

        case 'list_suppliers':
            const suppliersResult = await listSuppliers(foodlogiQConfig, { limit: 50 });
            return NextResponse.json(suppliersResult);

        default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
