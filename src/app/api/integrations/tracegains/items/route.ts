import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/integrations/tracegains/items
 * Search and list TraceGains items from cache
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '25');

        // Get user's organization
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 404 });
        }

        // Build query
        let query = supabase
            .from('tracegains_items')
            .select('*', { count: 'exact' })
            .eq('organization_id', profile.organization_id);

        // Add search filter
        if (search) {
            query = query.or(`name.ilike.%${search}%,item_number.ilike.%${search}%,supplier_name.ilike.%${search}%`);
        }

        // Add pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to).order('name');

        const { data: items, error, count } = await query;

        if (error) {
            console.error('Failed to fetch TraceGains items:', error);
            return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
        }

        return NextResponse.json({
            items: items || [],
            totalCount: count || 0,
            page,
            pageSize,
        });
    } catch (error) {
        console.error('TraceGains items error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch TraceGains items' },
            { status: 500 }
        );
    }
}
