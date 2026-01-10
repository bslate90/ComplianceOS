'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface USDAFood {
    fdcId: number
    description: string
    dataType: string
    brandName?: string
    nutrients: {
        calories: number | null
        totalFat: number | null
        saturatedFat: number | null
        transFat: number | null
        cholesterol: number | null
        sodium: number | null
        carbohydrates: number | null
        fiber: number | null
        sugars: number | null
        protein: number | null
        vitaminD: number | null
        calcium: number | null
        iron: number | null
        potassium: number | null
    }
}

interface AIIngredientFinderProps {
    onSelectIngredient: (ingredient: {
        name: string
        usda_fdc_id: number
        serving_size_g: number
        calories: number | null
        total_fat_g: number | null
        saturated_fat_g: number | null
        trans_fat_g: number | null
        cholesterol_mg: number | null
        sodium_mg: number | null
        total_carbohydrates_g: number | null
        dietary_fiber_g: number | null
        total_sugars_g: number | null
        protein_g: number | null
        vitamin_d_mcg: number | null
        calcium_mg: number | null
        iron_mg: number | null
        potassium_mg: number | null
    }) => void
    className?: string
}

export function AIIngredientFinder({ onSelectIngredient, className }: AIIngredientFinderProps) {
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<USDAFood[]>([])
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)

    const handleSearch = async () => {
        if (!query.trim()) {
            toast.error('Please enter a search term')
            return
        }

        setLoading(true)
        setResults([])
        setAiSuggestion(null)

        try {
            // First, use AI to refine the search query for USDA
            const aiResponse = await fetch('/api/ai/ingredient-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            })

            if (!aiResponse.ok) {
                // Fall back to direct USDA search
                const usdaResponse = await fetch(`/api/usda/search?query=${encodeURIComponent(query)}`)
                if (!usdaResponse.ok) throw new Error('Search failed')
                const data = await usdaResponse.json()
                setResults(mapUSDAResults(data.foods || []))
                return
            }

            const aiData = await aiResponse.json()
            setAiSuggestion(aiData.suggestion)

            // Search USDA with the AI-refined query
            const searchTerm = aiData.refined_query || query
            const usdaResponse = await fetch(`/api/usda/search?query=${encodeURIComponent(searchTerm)}`)
            if (!usdaResponse.ok) throw new Error('USDA search failed')

            const data = await usdaResponse.json()
            setResults(mapUSDAResults(data.foods || []))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Search failed')
        } finally {
            setLoading(false)
        }
    }

    const mapUSDAResults = (foods: Array<{
        fdcId: number
        description: string
        dataType: string
        brandName?: string
        foodNutrients?: Array<{ nutrientId: number; value: number }>
    }>): USDAFood[] => {
        return foods.slice(0, 10).map((food) => {
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
                    saturatedFat: getNutrient(1258),
                    transFat: getNutrient(1257),
                    cholesterol: getNutrient(1253),
                    sodium: getNutrient(1093),
                    carbohydrates: getNutrient(1005),
                    fiber: getNutrient(1079),
                    sugars: getNutrient(2000),
                    protein: getNutrient(1003),
                    vitaminD: getNutrient(1114),
                    calcium: getNutrient(1087),
                    iron: getNutrient(1089),
                    potassium: getNutrient(1092),
                },
            }
        })
    }

    const handleSelect = (food: USDAFood) => {
        onSelectIngredient({
            name: food.description,
            usda_fdc_id: food.fdcId,
            serving_size_g: 100, // USDA data is per 100g
            calories: food.nutrients.calories,
            total_fat_g: food.nutrients.totalFat,
            saturated_fat_g: food.nutrients.saturatedFat,
            trans_fat_g: food.nutrients.transFat,
            cholesterol_mg: food.nutrients.cholesterol,
            sodium_mg: food.nutrients.sodium,
            total_carbohydrates_g: food.nutrients.carbohydrates,
            dietary_fiber_g: food.nutrients.fiber,
            total_sugars_g: food.nutrients.sugars,
            protein_g: food.nutrients.protein,
            vitamin_d_mcg: food.nutrients.vitaminD,
            calcium_mg: food.nutrients.calcium,
            iron_mg: food.nutrients.iron,
            potassium_mg: food.nutrients.potassium,
        })
        toast.success(`Selected: ${food.description}`)
    }

    const getDataTypeBadge = (dataType: string) => {
        switch (dataType) {
            case 'Foundation':
                return <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Foundation</Badge>
            case 'SR Legacy':
                return <Badge className="bg-blue-500/20 text-blue-400 text-xs">SR Legacy</Badge>
            case 'Branded':
                return <Badge className="bg-purple-500/20 text-purple-400 text-xs">Branded</Badge>
            default:
                return <Badge className="bg-slate-500/20 text-slate-400 text-xs">{dataType}</Badge>
        }
    }

    return (
        <Card className={cn('bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-700/50', className)}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                    <span className="text-xl">🔍</span>
                    AI-Powered USDA Search
                    <Badge variant="outline" className="text-blue-400 border-blue-600 text-xs font-normal">
                        Natural Language
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="flex gap-2">
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Describe what you're looking for, e.g., 'unsalted butter' or 'whole wheat flour'"
                        className="bg-slate-700/50 border-slate-600 text-white flex-1"
                    />
                    <Button
                        onClick={handleSearch}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? '...' : 'Search'}
                    </Button>
                </div>

                {/* AI Suggestion */}
                {aiSuggestion && (
                    <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
                        <p className="text-sm text-blue-300">
                            <span className="font-medium">AI Suggestion:</span> {aiSuggestion}
                        </p>
                    </div>
                )}

                {/* Results */}
                {results.length > 0 && (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        <p className="text-xs text-slate-400">{results.length} results from USDA FoodData Central</p>
                        {results.map((food) => (
                            <button
                                key={food.fdcId}
                                onClick={() => handleSelect(food)}
                                className="w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500/50 hover:bg-slate-700/50 transition-colors text-left"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium text-sm truncate">{food.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {getDataTypeBadge(food.dataType)}
                                            {food.brandName && (
                                                <span className="text-xs text-slate-500">{food.brandName}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-emerald-400 font-mono text-sm">
                                            {food.nutrients.calories ?? '—'} cal
                                        </p>
                                        <p className="text-xs text-slate-500">per 100g</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                                    <span>Fat: {food.nutrients.totalFat ?? '—'}g</span>
                                    <span>Carbs: {food.nutrients.carbohydrates ?? '—'}g</span>
                                    <span>Protein: {food.nutrients.protein ?? '—'}g</span>
                                    <span>Na: {food.nutrients.sodium ?? '—'}mg</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* No Results */}
                {!loading && query && results.length === 0 && (
                    <div className="text-center py-4 text-slate-400">
                        <p>No results found. Try a different search term.</p>
                    </div>
                )}

                {/* Empty State */}
                {!query && results.length === 0 && (
                    <div className="text-center py-4 text-slate-400">
                        <p className="text-sm">
                            Describe what ingredient you&apos;re looking for in natural language.
                        </p>
                        <p className="text-xs mt-1 text-slate-500">
                            Examples: &quot;salted butter&quot;, &quot;brown sugar&quot;, &quot;whole milk&quot;
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
