import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const formData = await request.formData();

        const file = formData.get('file') as File;
        const supplierId = formData.get('supplier_id') as string;
        const documentName = formData.get('name') as string;
        const documentType = formData.get('document_type') as string || 'spec_sheet';

        if (!file || !supplierId || !documentName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get user and organization
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

        // Generate unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.organization_id}/${supplierId}/${Date.now()}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('supplier-documents')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
        }

        // Create document record
        const { data: document, error: docError } = await supabase
            .from('supplier_documents')
            .insert({
                organization_id: profile.organization_id,
                supplier_id: supplierId,
                name: documentName,
                document_type: documentType,
                file_path: fileName,
                file_type: fileExt || 'unknown',
                file_size_bytes: file.size,
                uploaded_by: user.id,
            })
            .select()
            .single();

        if (docError) {
            // Clean up uploaded file on error
            await supabase.storage.from('supplier-documents').remove([fileName]);
            return NextResponse.json({ error: docError.message }, { status: 500 });
        }

        // Create initial version
        await supabase.from('document_versions').insert({
            document_id: document.id,
            version_number: 1,
            file_path: fileName,
            file_size_bytes: file.size,
            uploaded_by: user.id,
            change_notes: 'Initial upload',
        });

        // Log audit
        await supabase.from('document_audit_log').insert({
            organization_id: profile.organization_id,
            document_id: document.id,
            supplier_id: supplierId,
            user_id: user.id,
            action: 'upload',
            action_details: {
                file_name: file.name,
                file_size: file.size,
                document_type: documentType,
            },
        });

        return NextResponse.json(document, { status: 201 });
    } catch (error) {
        console.error('POST /api/documents/upload error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
