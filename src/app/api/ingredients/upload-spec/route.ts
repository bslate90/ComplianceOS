import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import mammoth from 'mammoth';

// Types for extracted data
interface ExtractedNutritionData {
    name?: string;
    brand?: string;
    serving_size_g?: number;
    calories?: number;
    total_fat_g?: number;
    saturated_fat_g?: number;
    trans_fat_g?: number;
    cholesterol_mg?: number;
    sodium_mg?: number;
    total_carbohydrates_g?: number;
    dietary_fiber_g?: number;
    total_sugars_g?: number;
    added_sugars_g?: number;
    protein_g?: number;
    vitamin_d_mcg?: number;
    calcium_mg?: number;
    iron_mg?: number;
    potassium_mg?: number;
}

// Extract a numeric value after a keyword
function extractAfterKeyword(text: string, keyword: string): number | undefined {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedKeyword + '[^0-9]*?(\\d+(?:\\.\\d+)?)', 'i');
    const match = text.match(pattern);
    if (match && match[1]) {
        return parseFloat(match[1]);
    }
    return undefined;
}

// Extract string value after a keyword
function extractStringAfterKeyword(text: string, keyword: string): string | undefined {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedKeyword + '[:\\s]+([^\\n]+)', 'i');
    const match = text.match(pattern);
    if (match && match[1]) {
        return match[1].trim().split(/\s{2,}/)[0];
    }
    return undefined;
}

// Parse nutrition data from extracted text
function parseNutritionFromText(rawText: string): ExtractedNutritionData {
    const text = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    return {
        name: extractStringAfterKeyword(text, 'Item') ||
            extractStringAfterKeyword(text, 'Product') ||
            extractStringAfterKeyword(text, 'Ingredient'),
        brand: extractStringAfterKeyword(text, 'Supplier') ||
            extractStringAfterKeyword(text, 'Manufacturer') ||
            extractStringAfterKeyword(text, 'Brand'),
        serving_size_g: 100,
        calories: extractAfterKeyword(text, 'Calories') || extractAfterKeyword(text, 'Energy'),
        total_fat_g: extractAfterKeyword(text, 'Total Fat'),
        saturated_fat_g: extractAfterKeyword(text, 'Saturated Fat'),
        trans_fat_g: extractAfterKeyword(text, 'Trans Fat'),
        cholesterol_mg: extractAfterKeyword(text, 'Cholesterol'),
        sodium_mg: extractAfterKeyword(text, 'Sodium'),
        total_carbohydrates_g: extractAfterKeyword(text, 'Total Carbohydrates') || extractAfterKeyword(text, 'Total Carbs'),
        dietary_fiber_g: extractAfterKeyword(text, 'Dietary Fiber') || extractAfterKeyword(text, 'Total Dietary Fiber'),
        total_sugars_g: extractAfterKeyword(text, 'Total Sugars'),
        added_sugars_g: extractAfterKeyword(text, 'Added Sugars'),
        protein_g: extractAfterKeyword(text, 'Protein'),
        vitamin_d_mcg: extractAfterKeyword(text, 'Vitamin D'),
        calcium_mg: extractAfterKeyword(text, 'Calcium'),
        iron_mg: extractAfterKeyword(text, 'Iron'),
        potassium_mg: extractAfterKeyword(text, 'Potassium'),
    };
}

// Extract text from PDF - disabled in serverless environment
// pdf-parse requires native dependencies (canvas, DOMMatrix) not available in Vercel
async function extractPdfText(_buffer: Buffer): Promise<string> {
    throw new Error('PDF parsing is not currently supported. Please upload a Word document (.doc or .docx) instead.');
}

// Extract text from Word document
async function extractWordText(buffer: Buffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        console.error('Word extraction error:', error);
        throw new Error('Failed to extract text from Word document');
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const formData = await request.formData();

        const file = formData.get('file') as File;
        const supplierName = formData.get('supplier_name') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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

        // Read file contents
        const buffer = Buffer.from(await file.arrayBuffer());
        let extractedText = '';

        // Extract text based on file type
        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            extractedText = await extractPdfText(buffer);
        } else if (
            fileType === 'application/msword' ||
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            fileName.endsWith('.doc') ||
            fileName.endsWith('.docx')
        ) {
            extractedText = await extractWordText(buffer);
        } else {
            return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or Word document.' }, { status: 400 });
        }

        if (!extractedText || extractedText.trim().length < 10) {
            return NextResponse.json({
                error: 'Could not extract text from the document. The file may be scanned or empty.'
            }, { status: 400 });
        }

        // Parse nutrition data from text
        const nutritionData = parseNutritionFromText(extractedText);

        // Derive ingredient name from file if not found in document
        const ingredientName = nutritionData.name ||
            file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        // Optionally create supplier
        let supplier = null;
        if (supplierName) {
            const { data: existingSupplier } = await supabase
                .from('suppliers')
                .select('id, name')
                .eq('organization_id', profile.organization_id)
                .eq('name', supplierName)
                .single();

            if (existingSupplier) {
                supplier = existingSupplier;
            } else {
                const { data: newSupplier, error: supplierError } = await supabase
                    .from('suppliers')
                    .insert({
                        organization_id: profile.organization_id,
                        name: supplierName,
                    })
                    .select()
                    .single();

                if (supplierError) {
                    console.error('Failed to create supplier:', supplierError);
                    // Don't fail the whole operation, just skip supplier creation
                } else {
                    supplier = newSupplier;

                    // Log supplier creation audit
                    await supabase.from('document_audit_log').insert({
                        organization_id: profile.organization_id,
                        supplier_id: supplier.id,
                        user_id: user.id,
                        action: 'create_supplier',
                        action_details: {
                            supplier_name: supplierName,
                            created_via: 'ingredient_upload'
                        },
                    });
                }
            }
        }

        // Create ingredient with parsed data
        const { data: ingredient, error: ingredientError } = await supabase
            .from('ingredients')
            .insert({
                organization_id: profile.organization_id,
                name: ingredientName,
                brand: nutritionData.brand || supplierName || null,
                serving_size_g: nutritionData.serving_size_g || 100,
                calories: nutritionData.calories,
                total_fat_g: nutritionData.total_fat_g,
                saturated_fat_g: nutritionData.saturated_fat_g,
                trans_fat_g: nutritionData.trans_fat_g,
                cholesterol_mg: nutritionData.cholesterol_mg,
                sodium_mg: nutritionData.sodium_mg,
                total_carbohydrates_g: nutritionData.total_carbohydrates_g,
                dietary_fiber_g: nutritionData.dietary_fiber_g,
                total_sugars_g: nutritionData.total_sugars_g,
                added_sugars_g: nutritionData.added_sugars_g,
                protein_g: nutritionData.protein_g,
                vitamin_d_mcg: nutritionData.vitamin_d_mcg,
                calcium_mg: nutritionData.calcium_mg,
                iron_mg: nutritionData.iron_mg,
                potassium_mg: nutritionData.potassium_mg,
            })
            .select()
            .single();

        if (ingredientError) {
            console.error('Failed to create ingredient:', ingredientError);
            return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 });
        }

        // Log ingredient creation audit
        await supabase.from('document_audit_log').insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            action: 'create_ingredient' as const,
            action_details: {
                ingredient_id: ingredient.id,
                ingredient_name: ingredientName,
                created_via: 'spec_upload',
                source_file: file.name,
                supplier_id: supplier?.id,
            },
        });

        return NextResponse.json({
            ingredient,
            supplier,
            extracted_text_length: extractedText.length,
            parsed_fields: Object.keys(nutritionData).filter(
                k => nutritionData[k as keyof ExtractedNutritionData] !== undefined
            ).length,
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/ingredients/upload-spec error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}
