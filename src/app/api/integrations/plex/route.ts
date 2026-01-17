import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlexIntegrationStatus } from '@/lib/integrations/plex-sync';

// GET - Fetch PLEX webhook configuration
export async function GET() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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

    // Get webhook configuration
    const { data: config } = await supabase
        .from('webhook_configurations')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('provider', 'plex')
        .single();

    // Get integration status
    const status = await getPlexIntegrationStatus(profile.organization_id);

    // Get recent webhook events
    const { data: recentEvents } = await supabase
        .from('webhook_events')
        .select('id, event_type, status, external_id, created_at, error_message')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(10);

    // Generate webhook URL for this organization
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://exodis.com'}/api/webhooks/plex/${profile.organization_id}`;

    return NextResponse.json({
        config: config ? {
            id: config.id,
            name: config.name,
            is_active: config.is_active,
            plex_company_code: config.plex_company_code,
            plex_environment: config.plex_environment,
            sync_ingredients: config.sync_ingredients,
            sync_recipes: config.sync_recipes,
            sync_nutrition: config.sync_nutrition,
            sync_compliance: config.sync_compliance,
            auto_generate_reports: config.auto_generate_reports,
            last_sync_at: config.last_sync_at,
            last_error: config.last_error,
            // Don't expose secrets
        } : null,
        status,
        webhookUrl,
        recentEvents: recentEvents || [],
    });
}

// POST - Create or update PLEX webhook configuration
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role, full_name')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        const body = await request.json();

        const configData = {
            organization_id: profile.organization_id,
            name: body.name || 'PLEX Integration',
            provider: 'plex',
            webhook_url: body.webhook_url,
            api_key: body.api_key,
            api_secret: body.api_secret,
            plex_company_code: body.plex_company_code,
            plex_data_source_key: body.plex_data_source_key,
            plex_environment: body.plex_environment || 'production',
            sync_ingredients: body.sync_ingredients ?? true,
            sync_recipes: body.sync_recipes ?? true,
            sync_nutrition: body.sync_nutrition ?? true,
            sync_compliance: body.sync_compliance ?? true,
            auto_generate_reports: body.auto_generate_reports ?? true,
            is_active: body.is_active ?? true,
        };

        // Check if config exists
        const { data: existing } = await supabase
            .from('webhook_configurations')
            .select('id')
            .eq('organization_id', profile.organization_id)
            .eq('provider', 'plex')
            .single();

        let result;
        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('webhook_configurations')
                .update(configData)
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Create new
            const { data, error } = await supabase
                .from('webhook_configurations')
                .insert(configData)
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        // Log the action
        await supabase.from('organization_audit_log').insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            user_name: profile.full_name,
            action: existing ? 'update' : 'create',
            entity_type: 'webhook',
            entity_name: 'PLEX Integration',
            change_summary: existing
                ? 'Updated PLEX webhook configuration'
                : 'Created PLEX webhook configuration',
        });

        return NextResponse.json({
            success: true,
            config: {
                id: result.id,
                name: result.name,
                is_active: result.is_active,
            },
        });

    } catch (error) {
        console.error('PLEX config error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// DELETE - Disable PLEX integration
export async function DELETE() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role, full_name')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Deactivate the config (soft delete)
    const { error } = await supabase
        .from('webhook_configurations')
        .update({ is_active: false })
        .eq('organization_id', profile.organization_id)
        .eq('provider', 'plex');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase.from('organization_audit_log').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        user_name: profile.full_name,
        action: 'delete',
        entity_type: 'webhook',
        entity_name: 'PLEX Integration',
        change_summary: 'Disabled PLEX webhook integration',
    });

    return NextResponse.json({ success: true });
}
