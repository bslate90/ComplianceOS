'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IngredientSearch, IngredientSearchResult } from '@/components/ingredients/ingredient-search';
import { RACCCategorySelector } from '@/components/recipes/racc-category-selector';
import { AIRecipeSuggester } from '@/components/recipes/ai-recipe-suggester';
import { toast } from 'sonner';
import type { Tables } from '@/lib/database.types';

type Ingredient = Tables<'ingredients'>;

interface RecipeIngredient {
    ingredient_id: string;
    ingredient: Ingredient | IngredientSearchResult;
    amount_g: number;
}

function truncateText(text: string, maxLength = 25): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

export default function NewRecipePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        recipe_yield_g: '',
        serving_size_g: '',
        serving_size_description: '',
        servings_per_container: '',
        racc_category_id: null as string | null,
    });

    const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
    const [pendingIngredient, setPendingIngredient] = useState<IngredientSearchResult | null>(null);
    const [ingredientAmount, setIngredientAmount] = useState<string>('');

    const handleSelectIngredient = (ingredient: IngredientSearchResult) => {
        setPendingIngredient(ingredient);
    };

    const handleAddIngredient = () => {
        if (!pendingIngredient || !ingredientAmount) {
            toast.error('Please select an ingredient and enter an amount');
            return;
        }

        // Check if already added
        if (recipeIngredients.some(ri => ri.ingredient_id === pendingIngredient.id)) {
            toast.error('Ingredient already added');
            return;
        }

        setRecipeIngredients(prev => [
            ...prev,
            {
                ingredient_id: pendingIngredient.id,
                ingredient: pendingIngredient,
                amount_g: parseFloat(ingredientAmount),
            },
        ]);

        setPendingIngredient(null);
        setIngredientAmount('');
    };

    const handleRemoveIngredient = (id: string) => {
        setRecipeIngredients(prev => prev.filter(ri => ri.ingredient_id !== id));
    };

    const handleUpdateIngredientName = (id: string, newName: string) => {
        setRecipeIngredients(prev => prev.map(ri => {
            if (ri.ingredient_id === id) {
                return {
                    ...ri,
                    ingredient: {
                        ...ri.ingredient,
                        name: newName,
                    },
                };
            }
            return ri;
        }));
    };

    const handleUpdateIngredientAmount = (id: string, newAmount: number) => {
        setRecipeIngredients(prev => prev.map(ri => {
            if (ri.ingredient_id === id) {
                return {
                    ...ri,
                    amount_g: newAmount,
                };
            }
            return ri;
        }));
    };

    // Handle AI-generated ingredient suggestions
    const handleApplyAISuggestions = (suggestions: {
        yield_g: number;
        serving_size_g: number;
        serving_description: string;
        ingredients: Array<{
            name: string;
            amount_g: number;
            usda_fdc_id: number;
            calories: number | null;
            total_fat_g: number | null;
            sodium_mg: number | null;
            total_carbohydrates_g: number | null;
            protein_g: number | null;
        }>;
    }) => {
        // Update form data with suggested values
        setFormData(prev => ({
            ...prev,
            recipe_yield_g: suggestions.yield_g.toString(),
            serving_size_g: suggestions.serving_size_g.toString(),
            serving_size_description: suggestions.serving_description,
        }));

        // Add AI-suggested ingredients as USDA ingredients
        console.log('AI Suggestions received:', suggestions);

        const newIngredients: RecipeIngredient[] = suggestions.ingredients.map((ing) => {
            console.log('Processing ingredient:', ing.name, 'FDC ID:', ing.usda_fdc_id);
            return {
                ingredient_id: `usda-${ing.usda_fdc_id}`,
                ingredient: {
                    id: `usda-${ing.usda_fdc_id}`,
                    name: ing.name,
                    user_code: null,
                    brand: null,
                    calories: ing.calories,
                    sodium_mg: ing.sodium_mg,
                    protein_g: ing.protein_g,
                    total_fat_g: ing.total_fat_g,
                    total_carbohydrates_g: ing.total_carbohydrates_g,
                    updated_at: new Date().toISOString(),
                    source: 'usda' as const,
                    usda_fdc_id: ing.usda_fdc_id,
                },
                amount_g: ing.amount_g,
            };
        });

        console.log('New ingredients list:', newIngredients.map(ri => ({ name: ri.ingredient.name, amount: ri.amount_g })));
        setRecipeIngredients(newIngredients);
    };

    // Calculate total weight and estimated nutrition
    const totalWeight = recipeIngredients.reduce((sum, ri) => sum + ri.amount_g, 0);

    const calculateNutrition = useCallback(() => {
        const yieldG = parseFloat(formData.recipe_yield_g) || totalWeight;
        const servingG = parseFloat(formData.serving_size_g) || 100;

        let totalCals = 0;
        recipeIngredients.forEach(ri => {
            const servingSize = 'serving_size_g' in ri.ingredient ? ri.ingredient.serving_size_g : 100;
            const ratio = ri.amount_g / servingSize;
            totalCals += (ri.ingredient.calories || 0) * ratio;
        });

        const servingRatio = servingG / yieldG;
        return Math.round(totalCals * servingRatio);
    }, [formData.recipe_yield_g, formData.serving_size_g, recipeIngredients, totalWeight]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (recipeIngredients.length === 0) {
            toast.error('Please add at least one ingredient');
            return;
        }

        setLoading(true);
        try {
            // Check for USDA ingredients and add them to database first
            const usdaIngredients = recipeIngredients.filter(ri =>
                'source' in ri.ingredient && ri.ingredient.source === 'usda'
            );

            // Map to store USDA temp IDs to real database IDs
            const idMapping: Record<string, string> = {};

            if (usdaIngredients.length > 0) {
                toast.info(`Adding ${usdaIngredients.length} USDA ingredient(s) to your database...`);

                for (const ri of usdaIngredients) {
                    const ing = ri.ingredient;
                    console.log('Saving USDA ingredient to database:', {
                        name: ing.name,
                        usda_fdc_id: 'usda_fdc_id' in ing ? ing.usda_fdc_id : null,
                        fullIngredient: ing
                    });

                    // Create ingredient in database
                    const response = await fetch('/api/ingredients', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: ing.name,
                            brand: ing.brand || null,
                            usda_fdc_id: 'usda_fdc_id' in ing ? ing.usda_fdc_id : null,
                            serving_size_g: 100,
                            nutrition_basis: '100g',
                            calories: ing.calories,
                            total_fat_g: ing.total_fat_g,
                            sodium_mg: ing.sodium_mg,
                            protein_g: ing.protein_g,
                            total_carbohydrates_g: ing.total_carbohydrates_g,
                        }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(`Failed to add USDA ingredient "${ing.name}": ${error.error}`);
                    }

                    const savedIngredient = await response.json();
                    console.log('Saved ingredient:', savedIngredient);
                    idMapping[ri.ingredient_id] = savedIngredient.id;
                }
            }

            // Build ingredients list with proper IDs (replacing USDA temp IDs with real ones)
            const ingredientsList = recipeIngredients.map(ri => ({
                ingredient_id: idMapping[ri.ingredient_id] || ri.ingredient_id,
                amount_g: ri.amount_g,
            }));

            const response = await fetch('/api/recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description || null,
                    recipe_yield_g: parseFloat(formData.recipe_yield_g) || totalWeight,
                    serving_size_g: parseFloat(formData.serving_size_g),
                    serving_size_description: formData.serving_size_description || null,
                    servings_per_container: formData.servings_per_container ? parseFloat(formData.servings_per_container) : null,
                    racc_category_id: formData.racc_category_id,
                    ingredients: ingredientsList,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create recipe');
            }

            toast.success('Recipe created!');
            router.push('/recipes');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Create Recipe</h1>
                <p className="text-slate-400 mt-1">Build a recipe formulation with automatic nutrition calculation</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Recipe Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-slate-200">Recipe Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    placeholder="e.g., Chocolate Chip Cookies"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-200">Servings Per Container</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={formData.servings_per_container}
                                    onChange={(e) => setFormData(prev => ({ ...prev, servings_per_container: e.target.value }))}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    placeholder="e.g., 12"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-200">Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="bg-slate-700/50 border-slate-600 text-white"
                                placeholder="Optional description..."
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label className="text-slate-200">Recipe Yield (g)</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={formData.recipe_yield_g}
                                    onChange={(e) => setFormData(prev => ({ ...prev, recipe_yield_g: e.target.value }))}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    placeholder={totalWeight.toString() || "Total weight"}
                                />
                                <p className="text-xs text-slate-500">Leave blank to use total ingredient weight</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-200">Serving Size (g) *</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={formData.serving_size_g}
                                    onChange={(e) => setFormData(prev => ({ ...prev, serving_size_g: e.target.value }))}
                                    required
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    placeholder="e.g., 30"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-200">Serving Description</Label>
                                <Input
                                    value={formData.serving_size_description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, serving_size_description: e.target.value }))}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    placeholder="e.g., 1 cookie (30g)"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Ingredient Suggester */}
                {formData.name.trim() && (
                    <AIRecipeSuggester
                        recipeName={formData.name}
                        onApplySuggestions={handleApplyAISuggestions}
                    />
                )}

                {/* FDA RACC Category */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            FDA Serving Size Compliance
                            <Badge variant="outline" className="text-xs font-normal text-slate-500 border-slate-600">
                                RACC
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RACCCategorySelector
                            value={formData.racc_category_id}
                            onChange={(categoryId) => setFormData(prev => ({ ...prev, racc_category_id: categoryId }))}
                            totalProductWeight={parseFloat(formData.recipe_yield_g) || totalWeight || undefined}
                            currentServingSize={parseFloat(formData.serving_size_g) || undefined}
                            onServingSizeRecommendation={(rec) => {
                                if (rec && !formData.serving_size_g) {
                                    setFormData(prev => ({
                                        ...prev,
                                        serving_size_g: rec.recommendedServingSize.toString(),
                                        serving_size_description: rec.householdMeasure,
                                        servings_per_container: rec.recommendedServingsPerContainer.toString(),
                                    }));
                                }
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Ingredients */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            Ingredients
                            <Badge variant="outline" className="text-slate-400 border-slate-600 font-normal">
                                Search by code, name, or USDA
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Ingredient Search */}
                        <div className="space-y-3">
                            <Label className="text-slate-200">Find Ingredient</Label>
                            <div className="flex gap-3 items-end">
                                <IngredientSearch
                                    onSelect={handleSelectIngredient}
                                    placeholder="Type UDID (e.g., SALT100) or name..."
                                    className="flex-1"
                                />
                            </div>

                            {/* Pending Ingredient */}
                            {pendingIngredient && (
                                <div className="flex items-center gap-3 p-3 bg-emerald-900/20 border border-emerald-700/50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="text-white font-medium">{pendingIngredient.name}</p>
                                        <p className="text-xs text-slate-400">
                                            {pendingIngredient.user_code && <span className="font-mono text-emerald-400">{pendingIngredient.user_code} • </span>}
                                            {pendingIngredient.calories ? `${pendingIngredient.calories} cal` : 'No cal data'}
                                            {pendingIngredient.source === 'usda' && ' • USDA'}
                                        </p>
                                    </div>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={ingredientAmount}
                                        onChange={(e) => setIngredientAmount(e.target.value)}
                                        className="w-28 bg-slate-700/50 border-slate-600 text-white"
                                        placeholder="grams"
                                        autoFocus
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleAddIngredient}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        Add
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPendingIngredient(null)}
                                        className="text-slate-400"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Ingredient list */}
                        {recipeIngredients.length > 0 ? (
                            <div className="space-y-2 mt-4">
                                {/* Table Header */}
                                <div className="grid grid-cols-[32px_1fr_100px_40px] gap-2 px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-700">
                                    <span>#</span>
                                    <span>Name (editable)</span>
                                    <span>Amount</span>
                                    <span></span>
                                </div>

                                {recipeIngredients.map((ri, index) => (
                                    <div
                                        key={ri.ingredient_id}
                                        className="grid grid-cols-[32px_1fr_100px_40px] gap-2 items-center p-3 bg-slate-700/50 rounded-lg"
                                    >
                                        <span className="text-slate-500">{index + 1}.</span>
                                        <div className="min-w-0">
                                            <Input
                                                value={ri.ingredient.name}
                                                onChange={(e) => handleUpdateIngredientName(ri.ingredient_id, e.target.value)}
                                                className="bg-slate-600/50 border-slate-500 text-white text-sm h-8"
                                                placeholder="Ingredient name"
                                            />
                                            {'source' in ri.ingredient && ri.ingredient.source === 'usda' && (
                                                <span className="text-xs text-blue-400 mt-1 block">USDA #{ri.ingredient.usda_fdc_id}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="number"
                                                step="any"
                                                value={ri.amount_g}
                                                onChange={(e) => handleUpdateIngredientAmount(ri.ingredient_id, parseFloat(e.target.value) || 0)}
                                                className="bg-slate-600/50 border-slate-500 text-white text-sm h-8 w-20"
                                            />
                                            <span className="text-slate-400 text-sm">g</span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveIngredient(ri.ingredient_id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 w-7 p-0"
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                ))}

                                {/* Summary */}
                                <div className="pt-4 border-t border-slate-700 flex justify-between text-sm">
                                    <span className="text-slate-400">Total weight: <span className="text-white font-medium">{totalWeight}g</span></span>
                                    <span className="text-slate-400">Est. calories/serving: <span className="text-white font-medium">{calculateNutrition()}</span></span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <p>No ingredients added yet</p>
                                <p className="text-sm mt-1">Search for ingredients by UDID code or name</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex gap-4">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                    >
                        {loading ? 'Creating...' : 'Create Recipe'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}
