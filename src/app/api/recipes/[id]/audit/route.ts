import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('recipe_audit_log')
            .select('*')
            .eq('recipe_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Audit log fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('GET /api/recipes/[id]/audit error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
