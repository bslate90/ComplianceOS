'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelPreview } from '@/components/labels/label-preview';
import { toast } from 'sonner';
import type { Tables } from '@/lib/database.types';
import type { RoundedNutritionData } from '@/lib/nutrition/rounding-rules';
import type { AllergenSummary } from '@/lib/nutrition/calculator';

type Recipe = Tables<'recipes'>;

interface CalculatedData {
    recipe: Recipe;
    nutrition: {
        raw: Record<string, number>;
        rounded: RoundedNutritionData;
    };
    allergens: AllergenSummary;
    ingredientStatement: string;
    allergenStatement: string | null;
}

function GenerateLabelContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedRecipeId = searchParams.get('recipe');

    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [selectedRecipeId, setSelectedRecipeId] = useState<string>(preselectedRecipeId || '');
    const [labelName, setLabelName] = useState('');
    const [calculatedData, setCalculatedData] = useState<CalculatedData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [packageSurfaceArea, setPackageSurfaceArea] = useState<string>('');
    const [servingSize, setServingSize] = useState<string>('');
    const [servingsPerContainer, setServingsPerContainer] = useState<string>('');
    const [labelFormat, setLabelFormat] = useState<'standard_vertical' | 'tabular' | 'linear' | 'simplified'>('standard_vertical');
    const [isDualColumn, setIsDualColumn] = useState(false);

    useEffect(() => {
        fetchRecipes();
    }, []);

    const fetchRecipes = async () => {
        try {
            const response = await fetch('/api/recipes');
            if (response.ok) {
                const data = await response.json();
                setRecipes(data);
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    };

    const calculateNutrition = useCallback(async (recipeId: string) => {
        if (!recipeId) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/recipes/${recipeId}/calculate`);
            if (!response.ok) throw new Error('Failed to calculate');

            const data = await response.json();
            setCalculatedData(data);

            // Auto-populate label name if empty
            if (!labelName && data.recipe) {
                setLabelName(`${data.recipe.name} - Nutrition Label`);
            }

            // Auto-populate serving info from recipe
            if (data.recipe.serving_size_g) {
                setServingSize(data.recipe.serving_size_g.toString());
            }
            if (data.recipe.servings_per_container) {
                setServingsPerContainer(data.recipe.servings_per_container.toString());
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to calculate nutrition');
        } finally {
            setLoading(false);
        }
    }, [labelName]);

    useEffect(() => {
        if (selectedRecipeId) {
            calculateNutrition(selectedRecipeId);
        }
    }, [selectedRecipeId, calculateNutrition]);

    const handleSaveLabel = async () => {
        if (!calculatedData || !labelName.trim()) {
            toast.error('Please select a recipe and enter a label name');
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('/api/labels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipe_id: selectedRecipeId,
                    name: labelName,
                    format: labelFormat,
                    nutrition_data: calculatedData.nutrition.rounded,
                    ingredient_statement: calculatedData.ingredientStatement,
                    allergen_statement: calculatedData.allergenStatement,
                    serving_size_g: servingSize ? parseFloat(servingSize) : null,
                    serving_size_household: calculatedData.recipe.serving_size_description,
                    servings_per_container: servingsPerContainer ? parseFloat(servingsPerContainer) : null,
                    package_surface_area: packageSurfaceArea ? parseFloat(packageSurfaceArea) : null,
                    is_dual_column: isDualColumn,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save label');
            }

            toast.success('Label saved!');
            router.push('/labels');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const servingSizeDisplay = calculatedData?.recipe.serving_size_description ||
        `${calculatedData?.recipe.serving_size_g}g`;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Generate Label</h1>
                <p className="text-slate-400 mt-1">Create an FDA-compliant nutrition label from a recipe</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left: Configuration */}
                <div className="space-y-6">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">Label Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-200">Select Recipe *</Label>
                                <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                        <SelectValue placeholder="Choose a recipe..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        {recipes.map((recipe) => (
                                            <SelectItem key={recipe.id} value={recipe.id} className="text-white">
                                                {recipe.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-200">Label Name *</Label>
                                <Input
                                    value={labelName}
                                    onChange={(e) => setLabelName(e.target.value)}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    placeholder="e.g., Chocolate Chip Cookies - Nutrition Label"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-200">Label Format</Label>
                                <Select value={labelFormat} onValueChange={(value: any) => setLabelFormat(value)}>
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="standard_vertical" className="text-white">
                                            Standard Vertical (≥40 sq in)
                                        </SelectItem>
                                        <SelectItem value="tabular" className="text-white">
                                            Tabular (20-40 sq in)
                                        </SelectItem>
                                        <SelectItem value="linear" className="text-white">
                                            Linear (&lt;20 sq in)
                                        </SelectItem>
                                        <SelectItem value="simplified" className="text-white">
                                            Simplified (&lt;12 sq in)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="dualColumn"
                                    checked={isDualColumn}
                                    onChange={(e) => setIsDualColumn(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-600 bg-slate-700/50 text-emerald-500 focus:ring-emerald-500"
                                />
                                <Label htmlFor="dualColumn" className="text-slate-200 cursor-pointer">
                                    Dual Column (Prepared/As Packaged)
                                </Label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-200">Serving Size (g)</Label>
                                    <Input
                                        type="number"
                                        value={servingSize}
                                        onChange={(e) => setServingSize(e.target.value)}
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                        placeholder="55"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-200">Servings/Container</Label>
                                    <Input
                                        type="number"
                                        value={servingsPerContainer}
                                        onChange={(e) => setServingsPerContainer(e.target.value)}
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                        placeholder="8"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-200 flex items-center gap-2">
                                    Package Surface Area (sq in)
                                    <span className="text-xs text-slate-400">(for FDA format compliance)</span>
                                </Label>
                                <Input
                                    type="number"
                                    value={packageSurfaceArea}
                                    onChange={(e) => setPackageSurfaceArea(e.target.value)}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    placeholder="e.g., 60"
                                />
                                <p className="text-xs text-slate-400">
                                    ≥40 sq in: Standard • 20-40 sq in: Tabular • &lt;20 sq in: Linear/Simplified
                                </p>
                            </div>

                            <Button
                                onClick={handleSaveLabel}
                                disabled={saving || !calculatedData || !labelName.trim()}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                            >
                                {saving ? 'Saving...' : 'Save Label'}
                            </Button>
                        </CardContent>
                    </Card>

                    {calculatedData && (
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white">Ingredient Statement</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 text-sm">{calculatedData.ingredientStatement}</p>
                            </CardContent>
                        </Card>
                    )}

                    {calculatedData?.allergenStatement && (
                        <Card className="bg-amber-900/20 border-amber-500/30">
                            <CardHeader>
                                <CardTitle className="text-amber-400">Allergen Warning</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-amber-200 font-medium">{calculatedData.allergenStatement}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Preview */}
                <div>
                    {loading ? (
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                            </CardContent>
                        </Card>
                    ) : calculatedData ? (
                        <LabelPreview
                            recipeName={calculatedData.recipe.name}
                            servingsPerContainer={calculatedData.recipe.servings_per_container || undefined}
                            servingSize={servingSizeDisplay}
                            nutrition={calculatedData.nutrition.rounded}
                            ingredientStatement={calculatedData.ingredientStatement}
                            allergenStatement={calculatedData.allergenStatement}
                        />
                    ) : (
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="text-center py-20">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <p className="text-slate-400">Select a recipe to preview the label</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function GenerateLabelPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
        }>
            <GenerateLabelContent />
        </Suspense>
    );
}
