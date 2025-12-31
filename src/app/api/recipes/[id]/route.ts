import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: recipe, error } = await supabase
            .from('recipes')
            .select(`
                *,
                recipe_ingredients (
                    ingredient_id,
                    amount_g,
                    sort_order,
                    ingredient:ingredients (
                        id,
                        name,
                        user_code,
                        calories,
                        sodium_mg,
                        protein_g,
                        total_fat_g,
                        total_carbohydrates_g
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Recipe fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        return NextResponse.json(recipe);
    } catch (error) {
        console.error('GET /api/recipes/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
