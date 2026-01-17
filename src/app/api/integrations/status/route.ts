/**
 * Integration Status API
 * 
 * Returns the status of all configured integrations for the current organization
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to find organization
    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const organizationId = profile.organization_id;

    // Get all webhook configurations for this organization
    const { data: configs } = await supabase
        .from('webhook_configurations')
        .select('*')
        .eq('organization_id', organizationId);

    // Initialize status for all providers
    const statuses: Record<string, {
        configured: boolean;
        active: boolean;
        lastSync?: string;
        pendingSync?: number;
        errors?: number;
        configId?: string;
    }> = {
        plex: { configured: false, active: false },
        foodlogiq: { configured: false, active: false },
        genesis: { configured: false, active: false },
        sap: { configured: false, active: false },
        tracegains: { configured: false, active: false },
    };

    // Update statuses based on configurations
    if (configs) {
        for (const config of configs) {
            const provider = config.provider?.toLowerCase() || 'custom';
            if (statuses[provider]) {
                statuses[provider] = {
                    configured: true,
                    active: config.is_active,
                    lastSync: config.last_sync_at,
                    configId: config.id,
                };
            }
        }
    }

    // Get error counts from webhook events (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: errorCounts } = await supabase
        .from('webhook_events')
        .select('source')
        .eq('organization_id', organizationId)
        .eq('status', 'failed')
        .gte('created_at', oneDayAgo);

    if (errorCounts) {
        const errorsByProvider: Record<string, number> = {};
        for (const event of errorCounts) {
            const provider = event.source?.toLowerCase() || 'unknown';
            errorsByProvider[provider] = (errorsByProvider[provider] || 0) + 1;
        }

        for (const [provider, count] of Object.entries(errorsByProvider)) {
            if (statuses[provider]) {
                statuses[provider].errors = count;
            }
        }
    }

    // Get pending sync counts from plex_sync_queue (if exists)
    try {
        const { count: plexPending } = await supabase
            .from('plex_sync_queue')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'pending');

        if (plexPending !== null) {
            statuses.plex.pendingSync = plexPending;
        }
    } catch {
        // Table may not exist yet
    }

    // Get pending sync from integration_sync_log (if exists)
    try {
        const { data: pendingSyncs } = await supabase
            .from('integration_sync_log')
            .select('provider')
            .eq('organization_id', organizationId)
            .eq('status', 'pending');

        if (pendingSyncs) {
            const pendingByProvider: Record<string, number> = {};
            for (const sync of pendingSyncs) {
                const provider = sync.provider?.toLowerCase() || 'unknown';
                pendingByProvider[provider] = (pendingByProvider[provider] || 0) + 1;
            }

            for (const [provider, count] of Object.entries(pendingByProvider)) {
                if (statuses[provider]) {
                    statuses[provider].pendingSync = (statuses[provider].pendingSync || 0) + count;
                }
            }
        }
    } catch {
        // Table may not exist yet
    }

    return NextResponse.json(statuses);
}
