import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Create admin client for user management
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all members for the organization
export async function GET() {
    const supabase = await createClient();

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
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get all members with their permissions
    const { data: members, error } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            role,
            created_at,
            user_permissions(*)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also fetch emails from auth.users for admin view
    const memberIds = members?.map(m => m.id) || [];
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

    const membersWithEmail = members?.map(member => {
        const authUser = authUsers?.users.find(u => u.id === member.id);
        return {
            ...member,
            email: authUser?.email || null,
        };
    });

    return NextResponse.json(membersWithEmail || []);
}

// POST - Invite a new member to the organization
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
        const { email, full_name, role = 'member' } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Check if user already exists
        const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = authData?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (existingUser) {
            // Check if already in this organization
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', existingUser.id)
                .eq('organization_id', profile.organization_id)
                .single();

            if (existingProfile) {
                return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 });
            }

            // Add existing user to this organization
            await supabase
                .from('profiles')
                .update({
                    organization_id: profile.organization_id,
                    role,
                })
                .eq('id', existingUser.id);

            // Log the action
            await supabase.from('organization_audit_log').insert({
                organization_id: profile.organization_id,
                user_id: user.id,
                user_name: profile.full_name,
                action: 'invite',
                entity_type: 'member',
                entity_name: email,
                change_summary: `Added existing user ${email} to organization as ${role}`,
            });

            return NextResponse.json({
                success: true,
                message: 'User added to organization',
                userId: existingUser.id,
            });
        }

        // Create new user with invite
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true, // Auto-confirm for invited users
            user_metadata: {
                full_name: full_name || email.split('@')[0],
                invited_by: user.id,
                organization_id: profile.organization_id,
            },
        });

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 });
        }

        if (newUser.user) {
            // Create profile for new user
            await supabase.from('profiles').insert({
                id: newUser.user.id,
                organization_id: profile.organization_id,
                full_name: full_name || email.split('@')[0],
                role,
            });

            // Send password reset email so they can set their password
            await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email,
            });

            // Log the action
            await supabase.from('organization_audit_log').insert({
                organization_id: profile.organization_id,
                user_id: user.id,
                user_name: profile.full_name,
                action: 'invite',
                entity_type: 'member',
                entity_name: email,
                change_summary: `Invited new user ${email} as ${role}`,
            });

            return NextResponse.json({
                success: true,
                message: 'User invited successfully',
                userId: newUser.user.id,
            });
        }

        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });

    } catch (error) {
        console.error('Invite member error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// PUT - Update a member's role
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

    try {
        const body = await request.json();
        const { memberId, role, permissions } = body;

        if (!memberId) {
            return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
        }

        // Cannot demote yourself if you're the only admin
        if (memberId === user.id && role !== 'admin') {
            const { count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', profile.organization_id)
                .eq('role', 'admin');

            if ((count || 0) <= 1) {
                return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
            }
        }

        // Update role
        if (role) {
            await supabase
                .from('profiles')
                .update({ role })
                .eq('id', memberId)
                .eq('organization_id', profile.organization_id);
        }

        // Update permissions
        if (permissions) {
            await supabase
                .from('user_permissions')
                .upsert({
                    profile_id: memberId,
                    organization_id: profile.organization_id,
                    ...permissions,
                });
        }

        // Log the action
        await supabase.from('organization_audit_log').insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            user_name: profile.full_name,
            action: 'update',
            entity_type: 'member',
            entity_id: memberId,
            change_summary: `Updated member role to ${role}`,
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update member error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// DELETE - Remove a member from the organization
export async function DELETE(request: NextRequest) {
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
        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get('memberId');

        if (!memberId) {
            return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
        }

        // Cannot remove yourself
        if (memberId === user.id) {
            return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
        }

        // Get member info before removal for audit log
        const { data: member } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', memberId)
            .single();

        // Remove from organization (set organization_id to null)
        await supabase
            .from('profiles')
            .update({ organization_id: null })
            .eq('id', memberId)
            .eq('organization_id', profile.organization_id);

        // Log the action
        await supabase.from('organization_audit_log').insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            user_name: profile.full_name,
            action: 'remove',
            entity_type: 'member',
            entity_id: memberId,
            entity_name: member?.full_name,
            change_summary: `Removed ${member?.full_name || memberId} from organization`,
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Remove member error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
