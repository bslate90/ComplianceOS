import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TraceGainsClient } from '@/lib/integrations/tracegains-client';

// Simple encryption for storing API keys (in production, use proper encryption like AES-256-GCM)
// This is a placeholder - you should use a proper encryption library
const ENCRYPTION_KEY = process.env.TRACEGAINS_ENCRYPTION_KEY || 'default-key-change-in-production';

function encryptApiKey(apiKey: string): string {
    // In production, use proper encryption
    // This is a simple base64 encoding with a prefix for demo purposes
    return Buffer.from(`${ENCRYPTION_KEY}:${apiKey}`).toString('base64');
}

function decryptApiKey(encrypted: string): string {
    // In production, use proper decryption
    const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
    const parts = decoded.split(':');
    return parts.slice(1).join(':');
}

/**
 * GET /api/integrations/tracegains
 * Get TraceGains connection status
 */
export async function GET() {
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

        // Get TraceGains credentials
        const { data: credentials } = await supabase
            .from('tracegains_credentials')
            .select('id, is_connected, last_sync_at, sync_status, sync_error, instance_url, created_at')
            .eq('organization_id', profile.organization_id)
            .single();

        if (!credentials) {
            return NextResponse.json({
                connected: false,
                configured: false,
            });
        }

        return NextResponse.json({
            connected: credentials.is_connected,
            configured: true,
            lastSyncAt: credentials.last_sync_at,
            syncStatus: credentials.sync_status,
            syncError: credentials.sync_error,
            instanceUrl: credentials.instance_url,
        });
    } catch (error) {
        console.error('TraceGains status error:', error);
        return NextResponse.json(
            { error: 'Failed to get TraceGains status' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/integrations/tracegains
 * Save TraceGains credentials and test connection
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { apiKey, instanceUrl } = body;

        if (!apiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
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

        // Test the connection first
        const client = new TraceGainsClient({
            apiKey,
            baseUrl: instanceUrl || undefined,
        });

        const connectionTest = await client.testConnection();

        // Encrypt and store credentials
        const encryptedKey = encryptApiKey(apiKey);

        const { error: upsertError } = await supabase
            .from('tracegains_credentials')
            .upsert({
                organization_id: profile.organization_id,
                api_key_encrypted: encryptedKey,
                instance_url: instanceUrl || 'https://api.tracegains.net',
                is_connected: connectionTest.success,
                sync_status: connectionTest.success ? 'not_synced' : 'error',
                sync_error: connectionTest.success ? null : connectionTest.message,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'organization_id',
            });

        if (upsertError) {
            console.error('Failed to save credentials:', upsertError);
            return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
        }

        return NextResponse.json({
            success: connectionTest.success,
            message: connectionTest.message,
            connected: connectionTest.success,
        });
    } catch (error) {
        console.error('TraceGains connect error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to connect to TraceGains' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/integrations/tracegains
 * Disconnect TraceGains and remove credentials
 */
export async function DELETE() {
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

        // Delete credentials
        const { error } = await supabase
            .from('tracegains_credentials')
            .delete()
            .eq('organization_id', profile.organization_id);

        if (error) {
            console.error('Failed to delete credentials:', error);
            return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
        }

        // Optionally delete cached items
        await supabase
            .from('tracegains_items')
            .delete()
            .eq('organization_id', profile.organization_id);

        return NextResponse.json({ success: true, message: 'Disconnected from TraceGains' });
    } catch (error) {
        console.error('TraceGains disconnect error:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect from TraceGains' },
            { status: 500 }
        );
    }
}
