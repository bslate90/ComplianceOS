import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        let query = supabase
            .from('recipes')
            .select('*')
            .order('created_at', { ascending: false });

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('GET /api/recipes error:', error);
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

        const { ingredients, ...recipeData } = body;

        // Create recipe
        const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({
                ...recipeData,
                organization_id: profile.organization_id,
            })
            .select()
            .single();

        if (recipeError) {
            return NextResponse.json({ error: recipeError.message }, { status: 500 });
        }

        // Add recipe ingredients if provided
        if (ingredients && ingredients.length > 0) {
            const recipeIngredients = ingredients.map((ing: { ingredient_id: string; amount_g: number }, index: number) => ({
                recipe_id: recipe.id,
                ingredient_id: ing.ingredient_id,
                amount_g: ing.amount_g,
                sort_order: index,
            }));

            const { error: ingredientsError } = await supabase
                .from('recipe_ingredients')
                .insert(recipeIngredients);

            if (ingredientsError) {
                console.error('Error adding recipe ingredients:', ingredientsError);
            }
        }

        // Log audit trail
        await supabase.from('recipe_audit_log').insert({
            organization_id: profile.organization_id,
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            user_id: user.id,
            action: 'create',
            changes: { created: { name: recipe.name, ingredients: ingredients?.length || 0 } },
        });

        return NextResponse.json(recipe, { status: 201 });
    } catch (error) {
        console.error('POST /api/recipes error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { id, ingredients, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Update recipe
        const { data: recipe, error } = await supabase
            .from('recipes')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update recipe ingredients if provided
        if (ingredients !== undefined) {
            // Delete existing
            await supabase
                .from('recipe_ingredients')
                .delete()
                .eq('recipe_id', id);

            // Add new
            if (ingredients.length > 0) {
                const recipeIngredients = ingredients.map((ing: { ingredient_id: string; amount_g: number }, index: number) => ({
                    recipe_id: id,
                    ingredient_id: ing.ingredient_id,
                    amount_g: ing.amount_g,
                    sort_order: index,
                }));

                await supabase
                    .from('recipe_ingredients')
                    .insert(recipeIngredients);
            }
        }

        // Get user info for audit
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id, full_name')
                .eq('id', user.id)
                .single();

            if (profile) {
                await supabase.from('recipe_audit_log').insert({
                    organization_id: profile.organization_id,
                    recipe_id: id,
                    recipe_name: recipe.name,
                    user_id: user.id,
                    user_name: profile.full_name,
                    action: 'update',
                    changes: {
                        updated: updateData,
                        ingredients_updated: ingredients !== undefined
                    },
                });
            }
        }

        return NextResponse.json(recipe);
    } catch (error) {
        console.error('PUT /api/recipes error:', error);
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
            .from('recipes')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/recipes error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
