import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Upload organization logo
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and check if admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('logo') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({
                error: 'Invalid file type. Allowed: PNG, JPG, SVG, WebP, GIF'
            }, { status: 400 });
        }

        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            return NextResponse.json({
                error: 'File too large. Maximum size is 2MB'
            }, { status: 400 });
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
        const fileName = `org-${profile.organization_id}/logo-${Date.now()}.${fileExt}`;

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('organization-assets')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json({
                error: 'Failed to upload file: ' + uploadError.message
            }, { status: 500 });
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
            .from('organization-assets')
            .getPublicUrl(fileName);

        const logoUrl = urlData.publicUrl;

        // Update organization settings with the new logo URL
        const { error: updateError } = await supabase
            .from('organization_settings')
            .upsert({
                organization_id: profile.organization_id,
                logo_url: logoUrl,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'organization_id'
            });

        if (updateError) {
            console.error('Update error:', updateError);
            return NextResponse.json({
                error: 'Failed to update settings: ' + updateError.message
            }, { status: 500 });
        }

        // Log the activity
        await supabase.from('organization_audit_log').insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            action: 'upload',
            entity_type: 'logo',
            entity_name: 'Organization Logo',
            change_summary: 'Uploaded new organization logo',
        });

        return NextResponse.json({
            success: true,
            logo_url: logoUrl
        });

    } catch (error) {
        console.error('Logo upload error:', error);
        return NextResponse.json({
            error: 'Failed to process upload'
        }, { status: 500 });
    }
}

// Delete organization logo
export async function DELETE() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and check if admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        // Get current logo URL
        const { data: settings } = await supabase
            .from('organization_settings')
            .select('logo_url')
            .eq('organization_id', profile.organization_id)
            .single();

        if (settings?.logo_url) {
            // Try to delete the file from storage
            // Extract the file path from the URL
            const url = new URL(settings.logo_url);
            const pathMatch = url.pathname.match(/\/organization-assets\/(.+)$/);

            if (pathMatch) {
                await supabase.storage
                    .from('organization-assets')
                    .remove([pathMatch[1]]);
            }
        }

        // Update settings to remove logo URL
        const { error: updateError } = await supabase
            .from('organization_settings')
            .update({
                logo_url: null,
                updated_at: new Date().toISOString(),
            })
            .eq('organization_id', profile.organization_id);

        if (updateError) {
            return NextResponse.json({
                error: 'Failed to update settings'
            }, { status: 500 });
        }

        // Log the activity
        await supabase.from('organization_audit_log').insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            action: 'delete',
            entity_type: 'logo',
            entity_name: 'Organization Logo',
            change_summary: 'Removed organization logo',
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Logo delete error:', error);
        return NextResponse.json({
            error: 'Failed to delete logo'
        }, { status: 500 });
    }
}
