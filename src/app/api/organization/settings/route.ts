import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get organization settings
    const { data: settings, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return default settings if none exist
    if (!settings) {
        return NextResponse.json({
            organization_id: profile.organization_id,
            default_label_format: 'fda_vertical',
            default_serving_size_g: 30,
            default_servings_per_container: 1,
            default_household_measure: '1 serving',
            show_dual_column: false,
            logo_url: null,
            primary_color: '#10b981',
            secondary_color: '#0d9488',
            company_address: null,
            company_phone: null,
            company_website: null,
            general_disclaimer: null,
            footer_text: null,
            email_compliance_alerts: true,
            email_expiration_reminders: true,
            email_weekly_digest: false,
            email_team_activity: false,
            expiration_reminder_days: 30,
        });
    }

    return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and check if admin
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

    // Upsert settings
    const { data: settings, error } = await supabase
        .from('organization_settings')
        .upsert({
            organization_id: profile.organization_id,
            ...body,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'organization_id'
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the activity
    await supabase.from('organization_audit_log').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        user_name: profile.full_name,
        action: 'update',
        entity_type: 'settings',
        entity_name: 'Organization Settings',
        change_summary: 'Updated organization settings',
        new_values: body,
    });

    return NextResponse.json(settings);
}
