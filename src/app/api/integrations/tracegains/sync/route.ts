import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TraceGainsClient } from '@/lib/integrations/tracegains-client';

// Decryption function (must match the one in route.ts)
function decryptApiKey(encrypted: string): string {
    const ENCRYPTION_KEY = process.env.TRACEGAINS_ENCRYPTION_KEY || 'default-key-change-in-production';
    const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
    const parts = decoded.split(':');
    return parts.slice(1).join(':');
}

/**
 * POST /api/integrations/tracegains/sync
 * Sync items from TraceGains
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's organization
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 404 });
        }

        const organizationId = profile.organization_id;

        // Get TraceGains credentials
        const { data: credentials } = await supabase
            .from('tracegains_credentials')
            .select('*')
            .eq('organization_id', organizationId)
            .single();

        if (!credentials) {
            return NextResponse.json({ error: 'TraceGains not configured' }, { status: 400 });
        }

        // Update sync status to 'syncing'
        await supabase
            .from('tracegains_credentials')
            .update({ sync_status: 'syncing', sync_error: null })
            .eq('id', credentials.id);

        try {
            // Decrypt API key and create client
            const apiKey = decryptApiKey(credentials.api_key_encrypted);
            const client = new TraceGainsClient({
                apiKey,
                baseUrl: credentials.instance_url,
            });

            // Fetch all items from TraceGains
            let page = 1;
            const pageSize = 100;
            let totalSynced = 0;
            let hasMore = true;

            while (hasMore) {
                const result = await client.getItems(page, pageSize);

                if (result.items.length === 0) {
                    hasMore = false;
                    break;
                }

                // Upsert items into our cache
                const itemsToUpsert = result.items.map(item => ({
                    organization_id: organizationId,
                    tracegains_item_id: item.id,
                    name: item.name,
                    item_number: item.itemNumber || null,
                    category: item.category || null,
                    supplier_name: item.supplierName || null,
                    raw_data: item as unknown as Record<string, unknown>,
                    last_updated_at: item.updatedAt || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }));

                const { error: upsertError } = await supabase
                    .from('tracegains_items')
                    .upsert(itemsToUpsert, {
                        onConflict: 'organization_id,tracegains_item_id',
                    });

                if (upsertError) {
                    console.error('Failed to upsert items:', upsertError);
                }

                totalSynced += result.items.length;
                page++;

                // Check if we've fetched all items
                if (totalSynced >= result.totalCount) {
                    hasMore = false;
                }
            }

            // Update sync status to 'success'
            await supabase
                .from('tracegains_credentials')
                .update({
                    sync_status: 'success',
                    sync_error: null,
                    last_sync_at: new Date().toISOString(),
                    is_connected: true,
                })
                .eq('id', credentials.id);

            return NextResponse.json({
                success: true,
                message: `Synced ${totalSynced} items from TraceGains`,
                itemCount: totalSynced,
            });
        } catch (syncError) {
            // Update sync status to 'error'
            const errorMessage = syncError instanceof Error ? syncError.message : 'Sync failed';

            await supabase
                .from('tracegains_credentials')
                .update({
                    sync_status: 'error',
                    sync_error: errorMessage,
                })
                .eq('id', credentials.id);

            throw syncError;
        }
    } catch (error) {
        console.error('TraceGains sync error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to sync with TraceGains' },
            { status: 500 }
        );
    }
}
