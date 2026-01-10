/**
 * AI Ingredient Search API
 * 
 * Uses AI to refine natural language ingredient queries
 * for better USDA FoodData Central search results.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini API configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * POST /api/ai/ingredient-search
 * Body: { query: string }
 * Returns: { refined_query: string, suggestion: string }
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
        const { query } = body

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: 'query is required' }, { status: 400 })
        }

        // Check for Gemini API key
        if (!process.env.GEMINI_API_KEY) {
            // Return the original query if no AI is available
            return NextResponse.json({
                refined_query: query,
                suggestion: null,
            })
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const prompt = `You are a food database expert. Given this user search query for an ingredient: "${query}"

Provide:
1. A refined search term that would work best with the USDA FoodData Central database
2. A helpful suggestion or clarification for the user

Rules for the refined query:
- Use simple, generic terms (no brand names unless specifically asked)
- Use USDA-style naming conventions (e.g., "butter, salted" not "salted butter")
- For raw ingredients, add "raw" if appropriate
- For common foods, prefer SR Legacy or Foundation data format naming

Return ONLY a valid JSON object with this structure (no markdown):
{
  "refined_query": "<optimized search term for USDA>",
  "suggestion": "<brief helpful tip, e.g., 'Searching for unsalted butter - USDA lists this as butter, without salt'>"
}`

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()

        try {
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim()
            const parsed = JSON.parse(cleanJson)

            return NextResponse.json({
                refined_query: parsed.refined_query || query,
                suggestion: parsed.suggestion || null,
            })
        } catch {
            // If parsing fails, return original query
            return NextResponse.json({
                refined_query: query,
                suggestion: null,
            })
        }
    } catch (error) {
        console.error('AI ingredient search error:', error)
        return NextResponse.json(
            { error: 'Failed to process search', details: (error as Error).message },
            { status: 500 }
        )
    }
}
