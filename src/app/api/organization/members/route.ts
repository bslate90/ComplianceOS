import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get all members and their permissions
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

    // Get all organization members with their permissions
    const { data: members, error } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            role,
            created_at,
            user_permissions (*)
        `)
        .eq('organization_id', profile.organization_id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(members);
}

// Update a member's role or permissions
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { memberId, role, permissions } = body;

    if (!memberId) {
        return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    // Prevent self-demotion from admin
    if (memberId === user.id && role && role !== 'admin') {
        return NextResponse.json({ error: 'Cannot demote yourself from admin' }, { status: 400 });
    }

    // Update role if provided
    if (role) {
        const { error: roleError } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', memberId)
            .eq('organization_id', profile.organization_id);

        if (roleError) {
            return NextResponse.json({ error: roleError.message }, { status: 500 });
        }
    }

    // Update permissions if provided
    if (permissions) {
        const { error: permError } = await supabase
            .from('user_permissions')
            .upsert({
                profile_id: memberId,
                organization_id: profile.organization_id,
                ...permissions,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'profile_id,organization_id'
            });

        if (permError) {
            return NextResponse.json({ error: permError.message }, { status: 500 });
        }
    }

    // Log the activity
    await supabase.from('organization_audit_log').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        user_name: profile.full_name,
        action: 'update',
        entity_type: 'user',
        entity_id: memberId,
        change_summary: role ? `Changed role to ${role}` : 'Updated permissions',
        new_values: { role, permissions },
    });

    return NextResponse.json({ success: true });
}
