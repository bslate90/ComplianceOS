/**
 * SAP S/4HANA Integration API
 * 
 * Endpoints for configuring and managing SAP S/4HANA integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    testSAPConnection,
    syncMaterialsToIngredients,
    getMaterials,
    getMasterRecipes,
    SAPConfig
} from '@/lib/integrations/sap-client';

// GET - Get SAP configuration and status
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

    // Get SAP configuration
    const { data: config } = await supabase
        .from('webhook_configurations')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('provider', 'sap')
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
        api_base_url: config.provider_config?.api_base_url,
        company_code: config.provider_config?.company_code,
        plant: config.provider_config?.plant,
        odata_version: config.provider_config?.odata_version || 'v2',
        is_active: config.is_active,
        last_sync_at: config.last_sync_at,
        last_error: config.last_error,
        sync_materials: config.provider_config?.sync_materials ?? true,
        sync_recipes: config.provider_config?.sync_recipes ?? true,
        sync_quality: config.provider_config?.sync_quality ?? false,
    };

    return NextResponse.json({
        configured: true,
        config: safeConfig,
    });
}

// POST - Create or update SAP configuration
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
        api_base_url,
        tenant_url,
        client_id,
        client_secret,
        company_code,
        plant,
        storage_location,
        odata_version = 'v2',
        sync_materials = true,
        sync_recipes = true,
        sync_quality = false,
        is_active = true,
    } = body;

    if (!api_base_url || !client_id || !client_secret || !company_code || !plant) {
        return NextResponse.json({
            error: 'Missing required fields: api_base_url, client_id, client_secret, company_code, plant',
        }, { status: 400 });
    }

    // Test connection
    const testResult = await testSAPConnection({
        api_base_url,
        tenant_url,
        client_id,
        client_secret,
        company_code,
        plant,
        odata_version,
        sync_materials,
        sync_recipes,
        sync_quality,
    });

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
        .eq('provider', 'sap')
        .single();

    const configData = {
        organization_id: profile.organization_id,
        name: 'SAP S/4HANA',
        provider: 'sap',
        api_key: client_id,
        api_secret: client_secret,
        webhook_url: api_base_url,
        is_active,
        provider_config: {
            api_base_url,
            tenant_url,
            company_code,
            plant,
            storage_location,
            odata_version,
            sync_materials,
            sync_recipes,
            sync_quality,
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

// DELETE - Remove SAP configuration
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
        .eq('provider', 'sap');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// PATCH - Sync actions
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
    const { action, fullSync } = body;

    // Get SAP config
    const { data: config } = await supabase
        .from('webhook_configurations')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('provider', 'sap')
        .single();

    if (!config) {
        return NextResponse.json({ error: 'SAP not configured' }, { status: 404 });
    }

    const sapConfig: SAPConfig = {
        id: config.id,
        organization_id: profile.organization_id,
        api_base_url: config.provider_config?.api_base_url || config.webhook_url,
        client_id: config.api_key,
        client_secret: config.api_secret,
        company_code: config.provider_config?.company_code,
        plant: config.provider_config?.plant,
        storage_location: config.provider_config?.storage_location,
        odata_version: config.provider_config?.odata_version || 'v2',
        sync_materials: config.provider_config?.sync_materials ?? true,
        sync_recipes: config.provider_config?.sync_recipes ?? true,
        sync_quality: config.provider_config?.sync_quality ?? false,
        access_token: config.oauth_tokens?.access_token,
        token_expires_at: config.token_expires_at,
    };

    switch (action) {
        case 'sync_materials':
            const syncResult = await syncMaterialsToIngredients(sapConfig, { fullSync });

            // Log sync operation
            await supabase.from('integration_sync_log').insert({
                organization_id: profile.organization_id,
                config_id: config.id,
                provider: 'sap',
                direction: 'import',
                sync_type: fullSync ? 'full' : 'incremental',
                entity_type: 'material',
                status: syncResult.success ? 'completed' : 'partial',
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                records_total: syncResult.synced + syncResult.failed,
                records_processed: syncResult.synced,
                records_created: syncResult.created,
                records_updated: syncResult.updated,
                records_failed: syncResult.failed,
                error_log: syncResult.errors.length > 0 ? syncResult.errors : null,
                initiated_by: user.id,
            }).catch(err => console.error('Failed to log sync:', err));

            // Update last sync time
            await supabase
                .from('webhook_configurations')
                .update({ last_sync_at: new Date().toISOString() })
                .eq('id', config.id);

            return NextResponse.json(syncResult);

        case 'list_materials':
            const materialsResult = await getMaterials(sapConfig, { top: 50 });
            return NextResponse.json(materialsResult);

        case 'list_recipes':
            const recipesResult = await getMasterRecipes(sapConfig, { top: 50 });
            return NextResponse.json(recipesResult);

        default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
