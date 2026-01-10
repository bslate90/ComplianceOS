'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface USDAMatch {
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

interface IngredientSuggestion {
    name: string
    typical_amount_g: number
    category: string
    usda_matches: USDAMatch[]
    selected_match?: USDAMatch
}

interface RecipeSuggestionResponse {
    recipe_name: string
    estimated_yield_g: number
    suggested_serving_size_g: number
    suggested_serving_description: string
    ingredients: IngredientSuggestion[]
}

interface AIRecipeSuggesterProps {
    recipeName: string
    onApplySuggestions: (suggestions: {
        yield_g: number
        serving_size_g: number
        serving_description: string
        ingredients: Array<{
            name: string
            amount_g: number
            usda_fdc_id: number
            calories: number | null
            total_fat_g: number | null
            sodium_mg: number | null
            total_carbohydrates_g: number | null
            protein_g: number | null
        }>
    }) => void
    className?: string
}

const CATEGORY_COLORS: Record<string, string> = {
    dairy: 'bg-blue-500/20 text-blue-400',
    meat: 'bg-red-500/20 text-red-400',
    vegetables: 'bg-green-500/20 text-green-400',
    fruits: 'bg-orange-500/20 text-orange-400',
    grains: 'bg-amber-500/20 text-amber-400',
    fats: 'bg-yellow-500/20 text-yellow-400',
    sweeteners: 'bg-pink-500/20 text-pink-400',
    seasonings: 'bg-purple-500/20 text-purple-400',
    other: 'bg-slate-500/20 text-slate-400',
}

export function AIRecipeSuggester({
    recipeName,
    onApplySuggestions,
    className,
}: AIRecipeSuggesterProps) {
    const [loading, setLoading] = useState(false)
    const [suggestions, setSuggestions] = useState<RecipeSuggestionResponse | null>(null)
    const [selectedMatches, setSelectedMatches] = useState<Record<number, USDAMatch>>({})

    const handleGenerateSuggestions = async () => {
        if (!recipeName.trim()) {
            toast.error('Please enter a recipe name first')
            return
        }

        setLoading(true)
        setSuggestions(null)

        try {
            const response = await fetch('/api/ai/recipe-ingredients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipe_name: recipeName }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to get suggestions')
            }

            const data: RecipeSuggestionResponse = await response.json()
            setSuggestions(data)

            // Initialize selected matches with auto-selected ones
            const initialSelections: Record<number, USDAMatch> = {}
            data.ingredients.forEach((ing, index) => {
                if (ing.selected_match) {
                    initialSelections[index] = ing.selected_match
                }
            })
            setSelectedMatches(initialSelections)

            toast.success(`Found ${data.ingredients.length} typical ingredients!`)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to get suggestions')
        } finally {
            setLoading(false)
        }
    }

    const handleSelectMatch = (ingredientIndex: number, match: USDAMatch) => {
        setSelectedMatches((prev) => ({
            ...prev,
            [ingredientIndex]: match,
        }))
    }

    const handleApply = () => {
        if (!suggestions) return

        // Build the ingredients array with selected USDA matches
        const ingredients = suggestions.ingredients
            .map((ing, index) => {
                const match = selectedMatches[index]
                if (!match) return null

                return {
                    name: match.description,
                    amount_g: ing.typical_amount_g,
                    usda_fdc_id: match.fdcId,
                    calories: match.nutrients.calories,
                    total_fat_g: match.nutrients.totalFat,
                    sodium_mg: match.nutrients.sodium,
                    total_carbohydrates_g: match.nutrients.carbohydrates,
                    protein_g: match.nutrients.protein,
                }
            })
            .filter((ing): ing is NonNullable<typeof ing> => ing !== null)

        if (ingredients.length === 0) {
            toast.error('Please select at least one USDA match')
            return
        }

        onApplySuggestions({
            yield_g: suggestions.estimated_yield_g,
            serving_size_g: suggestions.suggested_serving_size_g,
            serving_description: suggestions.suggested_serving_description,
            ingredients,
        })

        toast.success(`Applied ${ingredients.length} ingredients!`)
    }

    const selectedCount = Object.keys(selectedMatches).length

    return (
        <Card className={cn('bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-700/50', className)}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                    <span className="text-xl">✨</span>
                    AI Ingredient Suggester
                    <Badge variant="outline" className="text-purple-400 border-purple-600 text-xs font-normal">
                        Powered by Gemini + USDA
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {!suggestions ? (
                    <div className="text-center py-4">
                        <p className="text-slate-400 mb-4">
                            Let AI suggest typical ingredients for &quot;{recipeName || 'your recipe'}&quot; with matching USDA nutrition data
                        </p>
                        <Button
                            onClick={handleGenerateSuggestions}
                            disabled={loading || !recipeName.trim()}
                            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin mr-2">⏳</span>
                                    Analyzing recipe...
                                </>
                            ) : (
                                <>
                                    <span className="mr-2">🔮</span>
                                    Generate Ingredient Suggestions
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 bg-slate-800/50 rounded-lg">
                                <p className="text-xs text-slate-400">Est. Yield</p>
                                <p className="text-lg font-semibold text-white">{suggestions.estimated_yield_g}g</p>
                            </div>
                            <div className="p-3 bg-slate-800/50 rounded-lg">
                                <p className="text-xs text-slate-400">Serving Size</p>
                                <p className="text-lg font-semibold text-white">{suggestions.suggested_serving_size_g}g</p>
                            </div>
                            <div className="p-3 bg-slate-800/50 rounded-lg">
                                <p className="text-xs text-slate-400">Ingredients</p>
                                <p className="text-lg font-semibold text-white">{suggestions.ingredients.length}</p>
                            </div>
                        </div>

                        {/* Ingredients List */}
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {suggestions.ingredients.map((ing, index) => (
                                <div
                                    key={index}
                                    className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white">{ing.name}</span>
                                            <Badge className={cn('text-xs', CATEGORY_COLORS[ing.category] || CATEGORY_COLORS.other)}>
                                                {ing.category}
                                            </Badge>
                                        </div>
                                        <span className="text-emerald-400 font-mono text-sm">{ing.typical_amount_g}g</span>
                                    </div>

                                    {/* USDA Matches */}
                                    {ing.usda_matches.length > 0 ? (
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-500">Select USDA match:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {ing.usda_matches.map((match) => (
                                                    <button
                                                        key={match.fdcId}
                                                        onClick={() => handleSelectMatch(index, match)}
                                                        className={cn(
                                                            'text-xs px-2 py-1 rounded transition-colors',
                                                            selectedMatches[index]?.fdcId === match.fdcId
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                        )}
                                                        title={`${match.description} (${match.dataType}) - ${match.nutrients.calories || 0} cal/100g`}
                                                    >
                                                        {match.description.length > 40
                                                            ? match.description.substring(0, 40) + '...'
                                                            : match.description}
                                                    </button>
                                                ))}
                                            </div>
                                            {selectedMatches[index] && (
                                                <p className="text-xs text-emerald-400 mt-1">
                                                    ✓ {selectedMatches[index].nutrients.calories || 0} cal, {selectedMatches[index].nutrients.protein || 0}g protein
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-400">No USDA matches found</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                            <p className="text-sm text-slate-400">
                                {selectedCount} of {suggestions.ingredients.length} ingredients matched
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSuggestions(null)}
                                    className="border-slate-600 text-slate-300"
                                >
                                    Reset
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleApply}
                                    disabled={selectedCount === 0}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Apply {selectedCount} Ingredients
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
