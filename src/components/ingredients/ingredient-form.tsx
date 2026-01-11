'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AllergenCheckboxes } from './allergen-checkboxes';
import { toast } from 'sonner';

import type { Tables } from '@/lib/database.types';

interface IngredientFormProps {
    initialData?: Partial<IngredientFormData> | Tables<'ingredients'>;
    onSuccess?: () => void;
}

export interface IngredientFormData {
    id?: string;
    name: string;
    brand: string | null;
    user_code: string | null;
    usda_fdc_id: number | null;
    serving_size_g: number;
    nutrition_basis: '100g' | 'serving';
    calories: number | null;
    total_fat_g: number | null;
    saturated_fat_g: number | null;
    trans_fat_g: number | null;
    cholesterol_mg: number | null;
    sodium_mg: number | null;
    total_carbohydrates_g: number | null;
    dietary_fiber_g: number | null;
    total_sugars_g: number | null;
    added_sugars_g: number | null;
    protein_g: number | null;
    vitamin_d_mcg: number | null;
    calcium_mg: number | null;
    iron_mg: number | null;
    potassium_mg: number | null;
    contains_milk: boolean;
    contains_eggs: boolean;
    contains_fish: boolean;
    contains_shellfish: boolean;
    contains_tree_nuts: boolean;
    contains_peanuts: boolean;
    contains_wheat: boolean;
    contains_soybeans: boolean;
    contains_sesame: boolean;
    ingredient_declaration: string | null;
}

const defaultFormData: IngredientFormData = {
    name: '',
    brand: '',
    user_code: '',
    usda_fdc_id: null,
    serving_size_g: 100,
    nutrition_basis: '100g',
    calories: null,
    total_fat_g: null,
    saturated_fat_g: null,
    trans_fat_g: null,
    cholesterol_mg: null,
    sodium_mg: null,
    total_carbohydrates_g: null,
    dietary_fiber_g: null,
    total_sugars_g: null,
    added_sugars_g: null,
    protein_g: null,
    vitamin_d_mcg: null,
    calcium_mg: null,
    iron_mg: null,
    potassium_mg: null,
    contains_milk: false,
    contains_eggs: false,
    contains_fish: false,
    contains_shellfish: false,
    contains_tree_nuts: false,
    contains_peanuts: false,
    contains_wheat: false,
    contains_soybeans: false,
    contains_sesame: false,
    ingredient_declaration: null,
};

export function IngredientForm({ initialData, onSuccess }: IngredientFormProps) {
    const [formData, setFormData] = useState<IngredientFormData>({
        ...defaultFormData,
        ...initialData as Partial<IngredientFormData>,
        // Ensure required fields have defaults
        name: initialData?.name ?? defaultFormData.name,
        brand: initialData?.brand ?? defaultFormData.brand,
        user_code: (initialData && 'user_code' in initialData) ? (initialData.user_code ?? '') : defaultFormData.user_code,
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const isEditing = !!initialData?.id;

    const handleChange = (field: keyof IngredientFormData, value: string | number | boolean | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNumberChange = (field: keyof IngredientFormData, value: string) => {
        const numValue = value === '' ? null : parseFloat(value);
        handleChange(field, numValue);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const method = isEditing ? 'PUT' : 'POST';
            const response = await fetch('/api/ingredients', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save ingredient');
            }

            toast.success(isEditing ? 'Ingredient updated!' : 'Ingredient created!');

            if (onSuccess) {
                onSuccess();
            } else {
                router.push('/ingredients');
                router.refresh();
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const nutritionFields = [
        { key: 'calories', label: 'Calories' },
        { key: 'total_fat_g', label: 'Total Fat (g)' },
        { key: 'saturated_fat_g', label: 'Saturated Fat (g)' },
        { key: 'trans_fat_g', label: 'Trans Fat (g)' },
        { key: 'cholesterol_mg', label: 'Cholesterol (mg)' },
        { key: 'sodium_mg', label: 'Sodium (mg)' },
        { key: 'total_carbohydrates_g', label: 'Total Carbohydrates (g)' },
        { key: 'dietary_fiber_g', label: 'Dietary Fiber (g)' },
        { key: 'total_sugars_g', label: 'Total Sugars (g)' },
        { key: 'added_sugars_g', label: 'Added Sugars (g)' },
        { key: 'protein_g', label: 'Protein (g)' },
        { key: 'vitamin_d_mcg', label: 'Vitamin D (mcg)' },
        { key: 'calcium_mg', label: 'Calcium (mg)' },
        { key: 'iron_mg', label: 'Iron (mg)' },
        { key: 'potassium_mg', label: 'Potassium (mg)' },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-foreground">Ingredient Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                required
                                className="bg-muted/50 border-border text-foreground"
                                placeholder="e.g., All-Purpose Flour"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="brand" className="text-foreground">Brand (optional)</Label>
                            <Input
                                id="brand"
                                value={formData.brand ?? ''}
                                onChange={(e) => handleChange('brand', e.target.value)}
                                className="bg-muted/50 border-border text-foreground"
                                placeholder="e.g., King Arthur"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="user_code" className="text-foreground">User Code (UDID)</Label>
                            <Input
                                id="user_code"
                                value={formData.user_code ?? ''}
                                onChange={(e) => handleChange('user_code', e.target.value.toUpperCase().slice(0, 25))}
                                className="bg-muted/50 border-border text-foreground font-mono"
                                placeholder="e.g., SALT100"
                                maxLength={25}
                            />
                            <p className="text-xs text-muted-foreground">Quick lookup code (max 25 chars)</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ingredient_declaration" className="text-foreground">Ingredient Declaration</Label>
                            <Input
                                id="ingredient_declaration"
                                value={formData.ingredient_declaration ?? ''}
                                onChange={(e) => handleChange('ingredient_declaration', e.target.value || null)}
                                className="bg-muted/50 border-border text-foreground"
                                placeholder="e.g., ENRICHED WHEAT FLOUR (WHEAT FLOUR, NIACIN...)"
                            />
                            <p className="text-xs text-muted-foreground">How this ingredient appears on the label</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Nutrition Facts */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground">Nutrition Facts</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Enter values {formData.nutrition_basis === '100g' ? 'per 100g' : `per ${formData.serving_size_g}g serving`}
                            </p>
                        </div>
                        {/* Serving Basis Toggle */}
                        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => handleChange('nutrition_basis', '100g')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-all ${formData.nutrition_basis === '100g'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Per 100g
                            </button>
                            <button
                                type="button"
                                onClick={() => handleChange('nutrition_basis', 'serving')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-all ${formData.nutrition_basis === 'serving'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Per Serving
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Serving Size - only show when per serving */}
                    {formData.nutrition_basis === 'serving' && (
                        <div className="grid gap-4 md:grid-cols-4 pb-4 border-b border-border">
                            <div className="space-y-2">
                                <Label htmlFor="serving_size_g" className="text-foreground">Serving Size (g) *</Label>
                                <Input
                                    id="serving_size_g"
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={formData.serving_size_g ?? ''}
                                    onChange={(e) => handleNumberChange('serving_size_g', e.target.value)}
                                    required
                                    className="bg-muted/50 border-border text-foreground"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {nutritionFields.map((field) => (
                            <div key={field.key} className="space-y-2">
                                <Label htmlFor={field.key} className="text-foreground text-sm">
                                    {field.label}
                                </Label>
                                <Input
                                    id={field.key}
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={String(formData[field.key as keyof IngredientFormData] ?? '')}
                                    onChange={(e) => handleNumberChange(field.key as keyof IngredientFormData, e.target.value)}
                                    className="bg-muted/50 border-border text-foreground"
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Allergens */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground">Allergen Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <AllergenCheckboxes
                        values={formData as unknown as Record<string, boolean | string | number | null | undefined>}
                        onChange={(field, value) => handleChange(field as keyof IngredientFormData, value)}
                    />
                </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                    {loading ? 'Saving...' : isEditing ? 'Update Ingredient' : 'Create Ingredient'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="border-border text-muted-foreground hover:text-foreground"
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}
