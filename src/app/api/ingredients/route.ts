import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        let query = supabase
            .from('ingredients')
            .select('*')
            .order('updated_at', { ascending: false });

        if (search) {
            // Search by name - user_code search added when column exists
            query = query.ilike('name', `%${search}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Ingredients query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // If search includes potential user_code, also filter client-side
        // This handles the case where user_code column may not exist yet
        if (search && data) {
            const searchLower = search.toLowerCase();
            const filtered = data.filter((ing: { name: string; user_code?: string | null }) =>
                ing.name.toLowerCase().includes(searchLower) ||
                (ing.user_code && ing.user_code.toLowerCase().includes(searchLower))
            );
            return NextResponse.json(filtered);
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('GET /api/ingredients error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();

        // Get user's organization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('ingredients')
            .insert({
                ...body,
                organization_id: profile.organization_id,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('POST /api/ingredients error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('ingredients')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('PUT /api/ingredients error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('ingredients')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/ingredients error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
