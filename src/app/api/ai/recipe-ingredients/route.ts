/**
 * AI Recipe Ingredient Suggester API
 * 
 * Uses AI to suggest typical ingredients for a recipe name,
 * then finds matching USDA foods for each ingredient.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini API configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface SuggestedIngredient {
    name: string
    typical_amount_g: number
    category: string
}

export interface USDAMatch {
    fdcId: number
    description: string
    dataType: string
    brandName?: string
    nutrients: {
        calories: number | null
        totalFat: number | null
        sodium: number | null
        carbohydrates: number | null
        protein: number | null
    }
}

export interface IngredientSuggestion extends SuggestedIngredient {
    usda_matches: USDAMatch[]
    selected_match?: USDAMatch
}

export interface RecipeSuggestionResponse {
    recipe_name: string
    estimated_yield_g: number
    suggested_serving_size_g: number
    suggested_serving_description: string
    ingredients: IngredientSuggestion[]
}

/**
 * POST /api/ai/recipe-ingredients
 * Body: { recipe_name: string }
 * Returns: RecipeSuggestionResponse
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { recipe_name } = body

        if (!recipe_name || typeof recipe_name !== 'string') {
            return NextResponse.json({ error: 'recipe_name is required' }, { status: 400 })
        }

        // Check for Gemini API key
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'AI service not configured. Please add GEMINI_API_KEY to environment.' },
                { status: 503 }
            )
        }

        // Step 1: Use AI to suggest typical ingredients
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const prompt = `You are a culinary expert and food scientist. For the recipe "${recipe_name}", provide a list of typical ingredients with estimated amounts in grams.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "recipe_name": "${recipe_name}",
  "estimated_yield_g": <total weight in grams>,
  "suggested_serving_size_g": <typical serving size in grams>,
  "suggested_serving_description": "<e.g., '1 cookie (30g)' or '1 cup (240g)'>",
  "ingredients": [
    {
      "name": "<simple ingredient name for USDA search, e.g., 'butter, salted' not 'Land O Lakes Butter'>",
      "typical_amount_g": <amount in grams>,
      "category": "<one of: dairy, meat, vegetables, fruits, grains, fats, sweeteners, seasonings, other>"
    }
  ]
}

Guidelines:
- Use simple, generic ingredient names (no brand names)
- Include all typical ingredients for this recipe
- Amounts should be realistic for a standard home recipe
- For small items like eggs, convert to grams (1 large egg ≈ 50g)
- order ingredients by amount (largest first)`

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()

        // Parse the AI response
        let aiSuggestion: {
            recipe_name: string
            estimated_yield_g: number
            suggested_serving_size_g: number
            suggested_serving_description: string
            ingredients: SuggestedIngredient[]
        }

        try {
            // Remove any markdown code blocks if present
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim()
            aiSuggestion = JSON.parse(cleanJson)
        } catch {
            console.error('Failed to parse AI response:', responseText)
            return NextResponse.json(
                { error: 'Failed to parse AI response. Please try again.' },
                { status: 500 }
            )
        }

        // Step 2: Search USDA for each ingredient
        const usdaApiKey = process.env.USDA_API_KEY
        if (!usdaApiKey) {
            // Return suggestions without USDA matches if no key
            return NextResponse.json({
                ...aiSuggestion,
                ingredients: aiSuggestion.ingredients.map((ing) => ({
                    ...ing,
                    usda_matches: [],
                })),
            })
        }

        const ingredientsWithMatches: IngredientSuggestion[] = await Promise.all(
            aiSuggestion.ingredients.map(async (ingredient) => {
                try {
                    // Search USDA for this ingredient
                    const usdaUrl = new URL('https://api.nal.usda.gov/fdc/v1/foods/search')
                    usdaUrl.searchParams.set('api_key', usdaApiKey)
                    usdaUrl.searchParams.set('query', ingredient.name)
                    usdaUrl.searchParams.set('pageSize', '5')
                    // Prefer SR Legacy and Foundation for better nutrition data
                    usdaUrl.searchParams.set('dataType', 'Foundation,SR Legacy')

                    const response = await fetch(usdaUrl.toString())
                    if (!response.ok) {
                        console.error(`USDA search failed for ${ingredient.name}:`, response.status)
                        return { ...ingredient, usda_matches: [] }
                    }

                    const data = await response.json()

                    // Map USDA results to our format
                    const matches: USDAMatch[] = (data.foods || []).slice(0, 5).map((food: {
                        fdcId: number
                        description: string
                        dataType: string
                        brandName?: string
                        foodNutrients: Array<{ nutrientId: number; value: number }>
                    }) => {
                        const getNutrient = (id: number) =>
                            food.foodNutrients?.find((n) => n.nutrientId === id)?.value ?? null

                        return {
                            fdcId: food.fdcId,
                            description: food.description,
                            dataType: food.dataType,
                            brandName: food.brandName,
                            nutrients: {
                                calories: getNutrient(1008),
                                totalFat: getNutrient(1004),
                                sodium: getNutrient(1093),
                                carbohydrates: getNutrient(1005),
                                protein: getNutrient(1003),
                            },
                        }
                    })

                    return {
                        ...ingredient,
                        usda_matches: matches,
                        // Auto-select the first match if available
                        selected_match: matches.length > 0 ? matches[0] : undefined,
                    }
                } catch (error) {
                    console.error(`Error searching USDA for ${ingredient.name}:`, error)
                    return { ...ingredient, usda_matches: [] }
                }
            })
        )

        const response: RecipeSuggestionResponse = {
            recipe_name: aiSuggestion.recipe_name,
            estimated_yield_g: aiSuggestion.estimated_yield_g,
            suggested_serving_size_g: aiSuggestion.suggested_serving_size_g,
            suggested_serving_description: aiSuggestion.suggested_serving_description,
            ingredients: ingredientsWithMatches,
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Recipe AI suggestion error:', error)
        return NextResponse.json(
            { error: 'Failed to generate suggestions', details: (error as Error).message },
            { status: 500 }
        )
    }
}
