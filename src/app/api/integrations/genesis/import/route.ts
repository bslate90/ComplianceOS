/**
 * Genesis R&D / EshaPort Import API
 * 
 * Handles file uploads and imports from Genesis R&D EshaPort exports
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    parseIngredientFile,
    parseRecipeFile,
    importIngredients,
    importRecipes,
    DEFAULT_ESHAPORT_OPTIONS
} from '@/lib/integrations/genesis-client';

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const importType = formData.get('type') as string; // 'ingredients' or 'recipes'
        const updateExisting = formData.get('updateExisting') === 'true';
        const delimiter = formData.get('delimiter') as string || '\t';
        const textQualifier = formData.get('textQualifier') as string || '"';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!importType || !['ingredients', 'recipes'].includes(importType)) {
            return NextResponse.json({ error: 'Invalid import type' }, { status: 400 });
        }

        // Read file content
        const fileContent = await file.text();

        // Create import session
        const { data: session, error: sessionError } = await supabase
            .from('genesis_import_sessions')
            .insert({
                organization_id: profile.organization_id,
                import_type: importType,
                file_name: file.name,
                file_size: file.size,
                field_delimiter: delimiter,
                text_qualifier: textQualifier,
                status: 'validating',
                imported_by: user.id,
            })
            .select('id')
            .single();

        if (sessionError) {
            console.error('Failed to create import session:', sessionError);
            // Continue without session tracking
        }

        const sessionId = session?.id;

        // Parse the file
        const parseOptions = {
            ...DEFAULT_ESHAPORT_OPTIONS,
            fieldDelimiter: delimiter,
            textQualifier: textQualifier,
        };

        let parseResult;
        let importResult;

        if (importType === 'ingredients') {
            parseResult = parseIngredientFile(fileContent, parseOptions);

            if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
                // Complete failure
                if (sessionId) {
                    await supabase
                        .from('genesis_import_sessions')
                        .update({
                            status: 'failed',
                            validation_errors: parseResult.errors,
                            rows_total: parseResult.totalRows,
                        })
                        .eq('id', sessionId);
                }

                return NextResponse.json({
                    success: false,
                    error: 'Failed to parse file',
                    details: parseResult.errors,
                }, { status: 400 });
            }

            // Update session to importing
            if (sessionId) {
                await supabase
                    .from('genesis_import_sessions')
                    .update({
                        status: 'importing',
                        validation_warnings: parseResult.warnings,
                        rows_total: parseResult.totalRows,
                    })
                    .eq('id', sessionId);
            }

            // Import the ingredients
            importResult = await importIngredients(
                profile.organization_id,
                parseResult.data,
                { updateExisting, sessionId }
            );

        } else {
            parseResult = parseRecipeFile(fileContent, parseOptions);

            if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
                if (sessionId) {
                    await supabase
                        .from('genesis_import_sessions')
                        .update({
                            status: 'failed',
                            validation_errors: parseResult.errors,
                            rows_total: parseResult.totalRows,
                        })
                        .eq('id', sessionId);
                }

                return NextResponse.json({
                    success: false,
                    error: 'Failed to parse file',
                    details: parseResult.errors,
                }, { status: 400 });
            }

            if (sessionId) {
                await supabase
                    .from('genesis_import_sessions')
                    .update({
                        status: 'importing',
                        validation_warnings: parseResult.warnings,
                        rows_total: parseResult.totalRows,
                    })
                    .eq('id', sessionId);
            }

            importResult = await importRecipes(
                profile.organization_id,
                parseResult.data,
                { updateExisting, sessionId }
            );
        }

        // Update session with final results
        if (sessionId) {
            await supabase
                .from('genesis_import_sessions')
                .update({
                    status: importResult.failed > 0 ? 'completed' : 'completed', // Could be 'partial' if some failed
                    rows_imported: importResult.created,
                    rows_updated: importResult.updated,
                    rows_skipped: importResult.skipped,
                    rows_failed: importResult.failed,
                    error_rows: importResult.errors.length > 0 ? importResult.errors : null,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', sessionId);
        }

        // Log sync operation
        await supabase.from('integration_sync_log').insert({
            organization_id: profile.organization_id,
            provider: 'genesis',
            direction: 'import',
            sync_type: 'manual',
            entity_type: importType,
            status: importResult.failed === 0 ? 'completed' : 'partial',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            records_total: parseResult.parsedRows,
            records_processed: importResult.created + importResult.updated + importResult.skipped,
            records_created: importResult.created,
            records_updated: importResult.updated,
            records_skipped: importResult.skipped,
            records_failed: importResult.failed,
            error_log: importResult.errors.length > 0 ? importResult.errors : null,
            initiated_by: user.id,
        }).catch(err => console.error('Failed to log sync:', err));

        return NextResponse.json({
            success: true,
            sessionId,
            parsed: parseResult.parsedRows,
            created: importResult.created,
            updated: importResult.updated,
            skipped: importResult.skipped,
            failed: importResult.failed,
            errors: importResult.errors,
            warnings: parseResult.warnings,
        });

    } catch (error) {
        console.error('Genesis import error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Import failed',
        }, { status: 500 });
    }
}

// GET - List import sessions
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: sessions, error, count } = await supabase
        .from('genesis_import_sessions')
        .select('*', { count: 'exact' })
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        sessions: sessions || [],
        total: count || 0,
    });
}
