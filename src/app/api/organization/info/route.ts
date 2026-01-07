import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get organization basic info (name, etc.)
export async function GET() {
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

    // Get organization info
    const { data: organization, error } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', profile.organization_id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(organization);
}
