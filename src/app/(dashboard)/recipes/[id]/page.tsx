'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LabelPreview } from '@/components/labels/label-preview';
import { toast } from 'sonner';
import type { RoundedNutritionData } from '@/lib/nutrition/rounding-rules';
import type { AllergenSummary } from '@/lib/nutrition/calculator';

interface RecipeData {
    recipe: {
        id: string;
        name: string;
        serving_size_g: number;
        serving_size_description: string | null;
        servings_per_container: number | null;
    };
    nutrition: {
        raw: Record<string, number>;
        rounded: RoundedNutritionData;
    };
    allergens: AllergenSummary;
    ingredientStatement: string;
    allergenStatement: string | null;
}

export default function RecipeDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<RecipeData | null>(null);

    const fetchRecipeData = useCallback(async () => {
        try {
            const response = await fetch(`/api/recipes/${id}/calculate`);
            if (!response.ok) throw new Error('Failed to fetch');
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load recipe');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchRecipeData();
    }, [fetchRecipeData]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-400">Recipe not found</p>
                <Button asChild className="mt-4" variant="outline">
                    <a href="/recipes">Back to Recipes</a>
                </Button>
            </div>
        );
    }

    const servingSize = data.recipe.serving_size_description || `${data.recipe.serving_size_g}g`;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white">{data.recipe.name}</h1>
                    <p className="text-slate-400 mt-1">Recipe formulation with calculated nutrition</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="border-slate-600 text-slate-300"
                    >
                        Back
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/recipes/${id}/edit`)}
                        className="border-emerald-600 text-emerald-400 hover:bg-emerald-900/20"
                    >
                        Edit Recipe
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/recipes/${id}/export`)}
                        className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                    >
                        Export
                    </Button>
                    <Button
                        onClick={() => router.push(`/labels/generate?recipe=${id}`)}
                        className="bg-gradient-to-r from-purple-500 to-pink-600"
                    >
                        Generate Label
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left: Ingredient Statement & Info */}
                <div className="space-y-6">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">Recipe Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-400">Serving Size</p>
                                    <p className="text-white font-medium">{servingSize}</p>
                                </div>
                                {data.recipe.servings_per_container && (
                                    <div>
                                        <p className="text-sm text-slate-400">Servings Per Container</p>
                                        <p className="text-white font-medium">{data.recipe.servings_per_container}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">Ingredient Statement</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-300">{data.ingredientStatement}</p>
                        </CardContent>
                    </Card>

                    {data.allergenStatement && (
                        <Card className="bg-amber-900/20 border-amber-500/30">
                            <CardHeader>
                                <CardTitle className="text-amber-400">Allergen Warning</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-amber-200 font-medium">{data.allergenStatement}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Label Preview */}
                <LabelPreview
                    recipeName={data.recipe.name}
                    servingsPerContainer={data.recipe.servings_per_container || undefined}
                    servingSize={servingSize}
                    nutrition={data.nutrition.rounded}
                    ingredientStatement={data.ingredientStatement}
                    allergenStatement={data.allergenStatement}
                />
            </div>
        </div>
    );
}
