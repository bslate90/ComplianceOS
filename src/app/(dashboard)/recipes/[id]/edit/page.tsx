'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IngredientSearch, IngredientSearchResult } from '@/components/ingredients/ingredient-search';
import { toast } from 'sonner';

interface RecipeIngredient {
    ingredient_id: string;
    ingredient: {
        id: string;
        name: string;
        user_code: string | null;
        calories: number | null;
    };
    amount_g: number;
}

interface RecipeData {
    id: string;
    name: string;
    description: string | null;
    recipe_yield_g: number;
    serving_size_g: number;
    serving_size_description: string | null;
    servings_per_container: number | null;
    recipe_ingredients: Array<{
        ingredient_id: string;
        amount_g: number;
        ingredient: {
            id: string;
            name: string;
            user_code: string | null;
            calories: number | null;
        };
    }>;
}

function truncateText(text: string, maxLength = 25): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

export default function EditRecipePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        recipe_yield_g: '',
        serving_size_g: '',
        serving_size_description: '',
        servings_per_container: '',
    });

    const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
    const [pendingIngredient, setPendingIngredient] = useState<IngredientSearchResult | null>(null);
    const [ingredientAmount, setIngredientAmount] = useState<string>('');

    const fetchRecipe = useCallback(async () => {
        try {
            const response = await fetch(`/api/recipes/${id}`);
            if (!response.ok) throw new Error('Failed to fetch recipe');
            const recipe: RecipeData = await response.json();

            setFormData({
                name: recipe.name,
                description: recipe.description || '',
                recipe_yield_g: recipe.recipe_yield_g?.toString() || '',
                serving_size_g: recipe.serving_size_g?.toString() || '',
                serving_size_description: recipe.serving_size_description || '',
                servings_per_container: recipe.servings_per_container?.toString() || '',
            });

            setRecipeIngredients(
                recipe.recipe_ingredients.map(ri => ({
                    ingredient_id: ri.ingredient_id,
                    ingredient: ri.ingredient,
                    amount_g: ri.amount_g,
                }))
            );
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load recipe');
            router.push('/recipes');
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        fetchRecipe();
    }, [fetchRecipe]);

    const handleSelectIngredient = (ingredient: IngredientSearchResult) => {
        setPendingIngredient(ingredient);
    };

    const handleAddIngredient = () => {
        if (!pendingIngredient || !ingredientAmount) {
            toast.error('Please select an ingredient and enter an amount');
            return;
        }

        if (recipeIngredients.some(ri => ri.ingredient_id === pendingIngredient.id)) {
            toast.error('Ingredient already added');
            return;
        }

        setRecipeIngredients(prev => [
            ...prev,
            {
                ingredient_id: pendingIngredient.id,
                ingredient: {
                    id: pendingIngredient.id,
                    name: pendingIngredient.name,
                    user_code: pendingIngredient.user_code,
                    calories: pendingIngredient.calories,
                },
                amount_g: parseFloat(ingredientAmount),
            },
        ]);

        setPendingIngredient(null);
        setIngredientAmount('');
    };

    const handleRemoveIngredient = (ingredientId: string) => {
        setRecipeIngredients(prev => prev.filter(ri => ri.ingredient_id !== ingredientId));
    };

    const totalWeight = recipeIngredients.reduce((sum, ri) => sum + ri.amount_g, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (recipeIngredients.length === 0) {
            toast.error('Please add at least one ingredient');
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('/api/recipes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    name: formData.name,
                    description: formData.description || null,
                    recipe_yield_g: parseFloat(formData.recipe_yield_g) || totalWeight,
                    serving_size_g: parseFloat(formData.serving_size_g),
                    serving_size_description: formData.serving_size_description || null,
                    servings_per_container: formData.servings_per_container ? parseFloat(formData.servings_per_container) : null,
                    ingredients: recipeIngredients.map(ri => ({
                        ingredient_id: ri.ingredient_id,
                        amount_g: ri.amount_g,
                    })),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update recipe');
            }

            toast.success('Recipe updated!');
            router.push(`/recipes/${id}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white">Edit Recipe</h1>
                    <p className="text-slate-400 mt-1">Update recipe formulation and ingredients</p>
                </div>
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                    Changes will be logged
                </Badge>
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
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-200">Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="bg-slate-700/50 border-slate-600 text-white"
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
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-200">Serving Description</Label>
                                <Input
                                    value={formData.serving_size_description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, serving_size_description: e.target.value }))}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Ingredients */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Ingredients</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Ingredient Search */}
                        <div className="space-y-3">
                            <Label className="text-slate-200">Add Ingredient</Label>
                            <IngredientSearch
                                onSelect={handleSelectIngredient}
                                placeholder="Search by code or name..."
                                className="flex-1"
                            />

                            {pendingIngredient && (
                                <div className="flex items-center gap-3 p-3 bg-emerald-900/20 border border-emerald-700/50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="text-white font-medium">{pendingIngredient.name}</p>
                                        <p className="text-xs text-slate-400">
                                            {pendingIngredient.user_code && <span className="font-mono text-emerald-400">{pendingIngredient.user_code}</span>}
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
                                    <Button type="button" onClick={handleAddIngredient} className="bg-emerald-600 hover:bg-emerald-700">
                                        Add
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setPendingIngredient(null)} className="text-slate-400">
                                        ✕
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Ingredient list */}
                        {recipeIngredients.length > 0 ? (
                            <div className="space-y-2 mt-4">
                                <div className="grid grid-cols-[32px_80px_1fr_80px_60px] gap-2 px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-700">
                                    <span>#</span>
                                    <span>Code</span>
                                    <span>Name</span>
                                    <span>Amount</span>
                                    <span></span>
                                </div>

                                {recipeIngredients.map((ri, index) => (
                                    <div
                                        key={ri.ingredient_id}
                                        className="grid grid-cols-[32px_80px_1fr_80px_60px] gap-2 items-center p-3 bg-slate-700/50 rounded-lg"
                                    >
                                        <span className="text-slate-500">{index + 1}.</span>
                                        <span className="font-mono text-xs text-emerald-400">
                                            {ri.ingredient.user_code || '—'}
                                        </span>
                                        <p className="text-white truncate" title={ri.ingredient.name}>
                                            {truncateText(ri.ingredient.name)}
                                        </p>
                                        <span className="text-slate-300">{ri.amount_g}g</span>
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

                                <div className="pt-4 border-t border-slate-700 text-sm text-slate-400">
                                    Total weight: <span className="text-white font-medium">{totalWeight}g</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <p>No ingredients added</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex gap-4">
                    <Button
                        type="submit"
                        disabled={saving}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
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
