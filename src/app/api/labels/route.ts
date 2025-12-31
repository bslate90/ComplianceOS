import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateLabel, type LabelData, type NutritionData } from '@/lib/compliance/nfp-validator';
import type { Json } from '@/lib/database.types';

export async function GET() {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('labels')
            .select(`
        *,
        recipe:recipes(name)
      `)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('GET /api/labels error:', error);
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

        // Insert label first
        const { data, error } = await supabase
            .from('labels')
            .insert({
                ...body,
                organization_id: profile.organization_id,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Automatically validate the label
        if (data && data.nutrition_data) {
            try {
                const labelData: LabelData = {
                    nutrition_data: data.nutrition_data as unknown as NutritionData,
                    serving_size_g: data.serving_size_g ?? undefined,
                    serving_size_household: data.serving_size_household ?? undefined,
                    servings_per_container: data.servings_per_container ?? undefined,
                    format: (data.format === 'fda_vertical' ? 'standard_vertical' : data.format) as LabelData['format'],
                    package_surface_area: data.package_surface_area ?? undefined,
                    claim_statements: data.claim_statements as string[] | undefined,
                };

                const validationReport = validateLabel(labelData);

                // Update label with validation results
                await supabase
                    .from('labels')
                    .update({
                        compliance_status: validationReport.overall_status,
                        validation_results: validationReport.validation_results as unknown as Json,
                        validated_at: validationReport.validated_at,
                    })
                    .eq('id', data.id);

                // Return label with validation report
                return NextResponse.json({
                    ...data,
                    compliance_status: validationReport.overall_status,
                    validation_results: validationReport.validation_results,
                    validated_at: validationReport.validated_at,
                    validation_summary: {
                        errors_count: validationReport.errors_count,
                        warnings_count: validationReport.warnings_count,
                    }
                }, { status: 201 });
            } catch (validationError) {
                console.error('Validation error:', validationError);
                // Return label even if validation fails
                return NextResponse.json(data, { status: 201 });
            }
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('POST /api/labels error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

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

        // Update label
        const { data, error } = await supabase
            .from('labels')
            .update(updateData)
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Label not found' }, { status: 404 });
        }

        // Automatically validate the updated label
        if (data.nutrition_data) {
            try {
                const labelData: LabelData = {
                    nutrition_data: data.nutrition_data as unknown as NutritionData,
                    serving_size_g: data.serving_size_g ?? undefined,
                    serving_size_household: data.serving_size_household ?? undefined,
                    servings_per_container: data.servings_per_container ?? undefined,
                    format: (data.format === 'fda_vertical' ? 'standard_vertical' : data.format) as LabelData['format'],
                    package_surface_area: data.package_surface_area ?? undefined,
                    claim_statements: data.claim_statements as string[] | undefined,
                };

                const validationReport = validateLabel(labelData);

                // Update label with validation results
                await supabase
                    .from('labels')
                    .update({
                        compliance_status: validationReport.overall_status,
                        validation_results: validationReport.validation_results as unknown as Json,
                        validated_at: validationReport.validated_at,
                    })
                    .eq('id', data.id);

                // Return label with validation report
                return NextResponse.json({
                    ...data,
                    compliance_status: validationReport.overall_status,
                    validation_results: validationReport.validation_results,
                    validated_at: validationReport.validated_at,
                    validation_summary: {
                        errors_count: validationReport.errors_count,
                        warnings_count: validationReport.warnings_count,
                    }
                });
            } catch (validationError) {
                console.error('Validation error:', validationError);
                return NextResponse.json(data);
            }
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('PATCH /api/labels error:', error);
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
            .from('labels')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/labels error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
