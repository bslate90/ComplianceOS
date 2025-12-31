import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateRecipeNutrition, aggregateAllergens, generateIngredientStatement, generateAllergenStatement } from '@/lib/nutrition/calculator';
import { applyFDARounding } from '@/lib/nutrition/rounding-rules';
import type { IngredientNutrition, RecipeIngredient } from '@/lib/nutrition/calculator';
import type { Json } from '@/lib/database.types';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Get recipe with ingredients
        const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', id)
            .single();

        if (recipeError || !recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // Get recipe ingredients with full ingredient data
        const { data: recipeIngredients, error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .select(`
        id,
        amount_g,
        sort_order,
        ingredient:ingredients(*)
      `)
            .eq('recipe_id', id)
            .order('sort_order');

        if (ingredientsError) {
            return NextResponse.json({ error: ingredientsError.message }, { status: 500 });
        }

        // Map to calculator format
        const ingredients: RecipeIngredient[] = (recipeIngredients || []).map((ri) => ({
            ingredient: ri.ingredient as unknown as IngredientNutrition,
            amount_g: Number(ri.amount_g),
            sort_order: ri.sort_order,
        }));

        // Calculate nutrition
        const rawNutrition = calculateRecipeNutrition(
            ingredients,
            Number(recipe.recipe_yield_g),
            Number(recipe.serving_size_g)
        );

        // Apply FDA rounding
        const roundedNutrition = applyFDARounding(rawNutrition);

        // Aggregate allergens
        const allergens = aggregateAllergens(ingredients);

        // Generate statements
        const ingredientStatement = generateIngredientStatement(ingredients);
        const allergenStatement = generateAllergenStatement(allergens);

        // Update recipe with calculated data
        await supabase
            .from('recipes')
            .update({
                calculated_nutrition: rawNutrition as unknown as Json,
                allergen_summary: allergens as unknown as Json,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        return NextResponse.json({
            recipe,
            ingredients: recipeIngredients,
            nutrition: {
                raw: rawNutrition,
                rounded: roundedNutrition,
            },
            allergens,
            ingredientStatement,
            allergenStatement,
        });
    } catch (error) {
        console.error('Calculate nutrition error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
