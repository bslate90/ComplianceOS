import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    detectGenesisFileType,
    parseGenesisTabDelimited,
    parseGenesisNutrientReport,
    convertToIngredientInsert,
    convertToRecipeInsert,
    getGenesisExportInstructions,
    type GenesisImportResult,
} from '@/lib/import/genesis-import';

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
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const mergeMode = formData.get('mergeMode') as string || 'skip';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const content = await file.text();
        const fileName = file.name;

        // Detect file type
        const fileType = detectGenesisFileType(content, fileName);

        if (fileType === 'exl-binary') {
            return NextResponse.json({
                error: 'Binary EXL files are not directly supported',
                message: 'Please export your data from Genesis as a tab-delimited text file.',
                instructions: getGenesisExportInstructions(),
            }, { status: 400 });
        }

        if (fileType === 'unknown') {
            // Try parsing anyway - might be a text file with unusual formatting
        }

        // Parse the content
        let parsedData = parseGenesisTabDelimited(content);

        // If no data found, try the nutrient report format
        if (parsedData.ingredients.length === 0 && parsedData.recipes.length === 0) {
            const nutrientReportData = parseGenesisNutrientReport(content);
            if (nutrientReportData.length > 0) {
                parsedData = {
                    ingredients: nutrientReportData,
                    recipes: [],
                    type: 'ingredients',
                };
            }
        }

        const result: GenesisImportResult = {
            success: true,
            ingredients: { total: parsedData.ingredients.length, imported: 0, skipped: 0, errors: [] },
            recipes: { total: parsedData.recipes.length, imported: 0, skipped: 0, errors: [] },
            warnings: [],
        };

        if (parsedData.ingredients.length === 0 && parsedData.recipes.length === 0) {
            return NextResponse.json({
                error: 'No data could be parsed from the file',
                message: 'The file format was not recognized. Please ensure you are exporting from Genesis as a tab-delimited text file.',
                instructions: getGenesisExportInstructions(),
            }, { status: 400 });
        }

        // Import ingredients
        for (const ingredient of parsedData.ingredients) {
            try {
                // Check if ingredient already exists
                if (mergeMode === 'skip') {
                    const { data: existing } = await supabase
                        .from('ingredients')
                        .select('id')
                        .eq('organization_id', profile.organization_id)
                        .eq('name', ingredient.name)
                        .single();

                    if (existing) {
                        result.ingredients.skipped++;
                        continue;
                    }
                }

                const insertData = convertToIngredientInsert(ingredient, profile.organization_id);

                if (mergeMode === 'update') {
                    // Upsert based on name
                    const { error } = await supabase
                        .from('ingredients')
                        .upsert(insertData, { onConflict: 'organization_id,name', ignoreDuplicates: false })
                        .select();

                    if (error) {
                        // If upsert fails (no unique constraint), just insert
                        const { error: insertError } = await supabase
                            .from('ingredients')
                            .insert(insertData);

                        if (insertError) {
                            result.ingredients.errors.push(`${ingredient.name}: ${insertError.message}`);
                        } else {
                            result.ingredients.imported++;
                        }
                    } else {
                        result.ingredients.imported++;
                    }
                } else {
                    const { error } = await supabase
                        .from('ingredients')
                        .insert(insertData);

                    if (error) {
                        result.ingredients.errors.push(`${ingredient.name}: ${error.message}`);
                    } else {
                        result.ingredients.imported++;
                    }
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                result.ingredients.errors.push(`${ingredient.name}: ${message}`);
            }
        }

        // Import recipes
        for (const recipe of parsedData.recipes) {
            try {
                if (mergeMode === 'skip') {
                    const { data: existing } = await supabase
                        .from('recipes')
                        .select('id')
                        .eq('organization_id', profile.organization_id)
                        .eq('name', recipe.name)
                        .single();

                    if (existing) {
                        result.recipes.skipped++;
                        continue;
                    }
                }

                const insertData = convertToRecipeInsert(recipe, profile.organization_id);

                const { error } = await supabase
                    .from('recipes')
                    .insert(insertData);

                if (error) {
                    result.recipes.errors.push(`${recipe.name}: ${error.message}`);
                } else {
                    result.recipes.imported++;
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                result.recipes.errors.push(`${recipe.name}: ${message}`);
            }
        }

        // Add warnings for partial data
        if (parsedData.ingredients.some(i => Object.keys(i.nutrients).length < 5)) {
            result.warnings.push('Some ingredients have incomplete nutrient data. You may need to update them manually.');
        }

        if (parsedData.recipes.length > 0 && parsedData.recipes.every(r => r.ingredients.length === 0)) {
            result.warnings.push('Recipe ingredient breakdowns were not included in the export. You will need to add ingredients manually.');
        }

        // Log the import
        await supabase.from('organization_audit_log').insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            user_name: profile.full_name,
            action: 'import',
            entity_type: 'genesis',
            entity_name: fileName,
            change_summary: `Genesis import: ${result.ingredients.imported} ingredients, ${result.recipes.imported} recipes`,
            new_values: JSON.parse(JSON.stringify(result)),
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('Genesis import error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// GET endpoint to return export instructions
export async function GET() {
    return NextResponse.json({
        instructions: getGenesisExportInstructions(),
        supportedFormats: [
            { extension: '.txt', name: 'Tab-delimited text', recommended: true },
            { extension: '.csv', name: 'Comma-separated values', recommended: false },
            { extension: '.exl', name: 'Genesis EXL (export as text instead)', recommended: false },
        ],
    });
}
