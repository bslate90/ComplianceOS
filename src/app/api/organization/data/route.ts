import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Export organization data as JSON
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const dataType = searchParams.get('type') || 'all';

    const exportData: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        exportedBy: profile.full_name,
        organizationId: profile.organization_id,
    };

    // Export ingredients
    if (dataType === 'all' || dataType === 'ingredients') {
        const { data: ingredients } = await supabase
            .from('ingredients')
            .select('*')
            .eq('organization_id', profile.organization_id);
        exportData.ingredients = ingredients;
    }

    // Export recipes with ingredients
    if (dataType === 'all' || dataType === 'recipes') {
        const { data: recipes } = await supabase
            .from('recipes')
            .select(`
                *,
                recipe_ingredients (
                    *,
                    ingredient:ingredients (name, user_code)
                )
            `)
            .eq('organization_id', profile.organization_id);
        exportData.recipes = recipes;
    }

    // Export labels
    if (dataType === 'all' || dataType === 'labels') {
        const { data: labels } = await supabase
            .from('labels')
            .select('*')
            .eq('organization_id', profile.organization_id);
        exportData.labels = labels;
    }

    // Export suppliers with documents
    if (dataType === 'all' || dataType === 'suppliers') {
        const { data: suppliers } = await supabase
            .from('suppliers')
            .select(`
                *,
                supplier_documents (*)
            `)
            .eq('organization_id', profile.organization_id);
        exportData.suppliers = suppliers;
    }

    // Log the export
    await supabase.from('organization_audit_log').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        user_name: profile.full_name,
        action: 'export',
        entity_type: 'data',
        change_summary: `Exported ${dataType} data`,
    });

    return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="complianceos-export-${dataType}-${new Date().toISOString().split('T')[0]}.json"`,
        },
    });
}

// Import organization data from JSON
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

    const body = await request.json();
    const { ingredients, recipes, labels, suppliers, mergeMode = 'skip' } = body;

    const results = {
        ingredients: { imported: 0, skipped: 0, errors: 0 },
        recipes: { imported: 0, skipped: 0, errors: 0 },
        labels: { imported: 0, skipped: 0, errors: 0 },
        suppliers: { imported: 0, skipped: 0, errors: 0 },
    };

    // Import ingredients
    if (ingredients && Array.isArray(ingredients)) {
        for (const ingredient of ingredients) {
            try {
                // Remove id and set organization_id
                const { id, organization_id, ...ingredientData } = ingredient;

                if (mergeMode === 'skip') {
                    // Check if exists by name
                    const { data: existing } = await supabase
                        .from('ingredients')
                        .select('id')
                        .eq('organization_id', profile.organization_id)
                        .eq('name', ingredientData.name)
                        .single();

                    if (existing) {
                        results.ingredients.skipped++;
                        continue;
                    }
                }

                const { error } = await supabase.from('ingredients').insert({
                    ...ingredientData,
                    organization_id: profile.organization_id,
                });

                if (error) {
                    results.ingredients.errors++;
                } else {
                    results.ingredients.imported++;
                }
            } catch {
                results.ingredients.errors++;
            }
        }
    }

    // Import suppliers
    if (suppliers && Array.isArray(suppliers)) {
        for (const supplier of suppliers) {
            try {
                const { id, organization_id, supplier_documents, ...supplierData } = supplier;

                if (mergeMode === 'skip') {
                    const { data: existing } = await supabase
                        .from('suppliers')
                        .select('id')
                        .eq('organization_id', profile.organization_id)
                        .eq('name', supplierData.name)
                        .single();

                    if (existing) {
                        results.suppliers.skipped++;
                        continue;
                    }
                }

                const { error } = await supabase.from('suppliers').insert({
                    ...supplierData,
                    organization_id: profile.organization_id,
                });

                if (error) {
                    results.suppliers.errors++;
                } else {
                    results.suppliers.imported++;
                }
            } catch {
                results.suppliers.errors++;
            }
        }
    }

    // Log the import
    await supabase.from('organization_audit_log').insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        user_name: profile.full_name,
        action: 'import',
        entity_type: 'data',
        change_summary: `Imported data: ${JSON.stringify(results)}`,
        new_values: results,
    });

    return NextResponse.json({
        success: true,
        results,
    });
}
