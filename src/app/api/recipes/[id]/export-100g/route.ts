/**
 * Recipe 100g Nutritional Report Export
 * Exports recipe nutrition data normalized to 100g serving
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Define the shape of the calculated nutrition data
interface RecipeNutritionData {
  calories?: number
  totalFat?: number
  saturatedFat?: number
  transFat?: number
  cholesterol?: number
  sodium?: number
  totalCarbohydrates?: number
  dietaryFiber?: number
  totalSugars?: number
  addedSugars?: number
  protein?: number
  vitaminD?: number
  calcium?: number
  iron?: number
  potassium?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipe_id } = await params
    const supabase = await createClient()

    // Get user's organization
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Fetch recipe with calculated nutrition
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipe_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    if (!recipe.calculated_nutrition) {
      return NextResponse.json(
        { error: 'Recipe nutrition not calculated. Please calculate nutrition first.' },
        { status: 400 }
      )
    }

    // Cast to proper type for type-safe access
    const nutrition = recipe.calculated_nutrition as unknown as RecipeNutritionData

    // Normalize nutrition data to 100g
    const recipeYieldG = recipe.recipe_yield_g
    const scaleFactor = 100 / recipeYieldG

    const nutritionPer100g = {
      calories: Math.round((nutrition.calories || 0) * scaleFactor),
      totalFat: Number(((nutrition.totalFat || 0) * scaleFactor).toFixed(1)),
      saturatedFat: Number(
        ((nutrition.saturatedFat || 0) * scaleFactor).toFixed(1)
      ),
      transFat: Number(((nutrition.transFat || 0) * scaleFactor).toFixed(1)),
      cholesterol: Math.round((nutrition.cholesterol || 0) * scaleFactor),
      sodium: Math.round((nutrition.sodium || 0) * scaleFactor),
      totalCarbohydrates: Number(
        ((nutrition.totalCarbohydrates || 0) * scaleFactor).toFixed(1)
      ),
      dietaryFiber: Number(
        ((nutrition.dietaryFiber || 0) * scaleFactor).toFixed(1)
      ),
      totalSugars: Number(
        ((nutrition.totalSugars || 0) * scaleFactor).toFixed(1)
      ),
      addedSugars: Number(
        ((nutrition.addedSugars || 0) * scaleFactor).toFixed(1)
      ),
      protein: Number(((nutrition.protein || 0) * scaleFactor).toFixed(1)),
      vitaminD: Number(((nutrition.vitaminD || 0) * scaleFactor).toFixed(1)),
      calcium: Math.round((nutrition.calcium || 0) * scaleFactor),
      iron: Number(((nutrition.iron || 0) * scaleFactor).toFixed(1)),
      potassium: Math.round((nutrition.potassium || 0) * scaleFactor),
    }

    return NextResponse.json({
      recipe: {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        yield_g: recipe.recipe_yield_g,
      },
      nutrition_per_100g: nutritionPer100g,
      serving_size_g: 100,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('GET /api/recipes/[id]/export-100g error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipe_id } = await params
    const supabase = await createClient()
    const body = await request.json()
    const { format = 'json' } = body

    // Get user's organization
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Fetch recipe with calculated nutrition
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipe_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    if (!recipe.calculated_nutrition) {
      return NextResponse.json(
        { error: 'Recipe nutrition not calculated. Please calculate nutrition first.' },
        { status: 400 }
      )
    }

    // Cast to proper type for type-safe access
    const nutrition = recipe.calculated_nutrition as unknown as RecipeNutritionData

    // Normalize nutrition data to 100g
    const recipeYieldG = recipe.recipe_yield_g
    const scaleFactor = 100 / recipeYieldG

    const nutritionPer100g = {
      calories: Math.round((nutrition.calories || 0) * scaleFactor),
      totalFat: Number(((nutrition.totalFat || 0) * scaleFactor).toFixed(1)),
      saturatedFat: Number(
        ((nutrition.saturatedFat || 0) * scaleFactor).toFixed(1)
      ),
      transFat: Number(((nutrition.transFat || 0) * scaleFactor).toFixed(1)),
      cholesterol: Math.round((nutrition.cholesterol || 0) * scaleFactor),
      sodium: Math.round((nutrition.sodium || 0) * scaleFactor),
      totalCarbohydrates: Number(
        ((nutrition.totalCarbohydrates || 0) * scaleFactor).toFixed(1)
      ),
      dietaryFiber: Number(
        ((nutrition.dietaryFiber || 0) * scaleFactor).toFixed(1)
      ),
      totalSugars: Number(
        ((nutrition.totalSugars || 0) * scaleFactor).toFixed(1)
      ),
      addedSugars: Number(
        ((nutrition.addedSugars || 0) * scaleFactor).toFixed(1)
      ),
      protein: Number(((nutrition.protein || 0) * scaleFactor).toFixed(1)),
      vitaminD: Number(((nutrition.vitaminD || 0) * scaleFactor).toFixed(1)),
      calcium: Math.round((nutrition.calcium || 0) * scaleFactor),
      iron: Number(((nutrition.iron || 0) * scaleFactor).toFixed(1)),
      potassium: Math.round((nutrition.potassium || 0) * scaleFactor),
    }

    if (format === 'csv') {
      // Generate CSV format
      const csvRows = [
        'Nutrient,Per 100g',
        `Calories,${nutritionPer100g.calories} kcal`,
        `Total Fat,${nutritionPer100g.totalFat} g`,
        `Saturated Fat,${nutritionPer100g.saturatedFat} g`,
        `Trans Fat,${nutritionPer100g.transFat} g`,
        `Cholesterol,${nutritionPer100g.cholesterol} mg`,
        `Sodium,${nutritionPer100g.sodium} mg`,
        `Total Carbohydrates,${nutritionPer100g.totalCarbohydrates} g`,
        `Dietary Fiber,${nutritionPer100g.dietaryFiber} g`,
        `Total Sugars,${nutritionPer100g.totalSugars} g`,
        `Added Sugars,${nutritionPer100g.addedSugars} g`,
        `Protein,${nutritionPer100g.protein} g`,
        `Vitamin D,${nutritionPer100g.vitaminD} mcg`,
        `Calcium,${nutritionPer100g.calcium} mg`,
        `Iron,${nutritionPer100g.iron} mg`,
        `Potassium,${nutritionPer100g.potassium} mg`,
      ]

      const csv = csvRows.join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${recipe.name}-100g-nutrition.csv"`,
        },
      })
    }

    // Default: JSON format
    return NextResponse.json({
      recipe: {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        yield_g: recipe.recipe_yield_g,
      },
      nutrition_per_100g: nutritionPer100g,
      serving_size_g: 100,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('POST /api/recipes/[id]/export-100g error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
