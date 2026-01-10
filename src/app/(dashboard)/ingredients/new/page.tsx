'use client';

import { useState } from 'react';
import { IngredientForm, IngredientFormData } from '@/components/ingredients/ingredient-form';
import { USDASearchModal } from '@/components/ingredients/usda-search-modal';
import { AIIngredientFinder } from '@/components/ingredients/ai-ingredient-finder';
import { Button } from '@/components/ui/button';
import type { MappedIngredient } from '@/lib/usda/mappers';

export default function NewIngredientPage() {
    const [showUSDASearch, setShowUSDASearch] = useState(false);
    const [importedData, setImportedData] = useState<Partial<IngredientFormData> | null>(null);

    const handleUSDAImport = (data: MappedIngredient) => {
        setImportedData({
            name: data.name,
            brand: data.brand || '',
            usda_fdc_id: data.usda_fdc_id,
            serving_size_g: data.serving_size_g,
            calories: data.calories,
            total_fat_g: data.total_fat_g,
            saturated_fat_g: data.saturated_fat_g,
            trans_fat_g: data.trans_fat_g,
            cholesterol_mg: data.cholesterol_mg,
            sodium_mg: data.sodium_mg,
            total_carbohydrates_g: data.total_carbohydrates_g,
            dietary_fiber_g: data.dietary_fiber_g,
            total_sugars_g: data.total_sugars_g,
            added_sugars_g: data.added_sugars_g,
            protein_g: data.protein_g,
            vitamin_d_mcg: data.vitamin_d_mcg,
            calcium_mg: data.calcium_mg,
            iron_mg: data.iron_mg,
            potassium_mg: data.potassium_mg,
            contains_milk: false,
            contains_eggs: false,
            contains_fish: false,
            contains_shellfish: false,
            contains_tree_nuts: false,
            contains_peanuts: false,
            contains_wheat: false,
            contains_soybeans: false,
            contains_sesame: false,
        });
    };

    const handleAIIngredientSelect = (ingredient: {
        name: string;
        usda_fdc_id: number;
        serving_size_g: number;
        calories: number | null;
        total_fat_g: number | null;
        saturated_fat_g: number | null;
        trans_fat_g: number | null;
        cholesterol_mg: number | null;
        sodium_mg: number | null;
        total_carbohydrates_g: number | null;
        dietary_fiber_g: number | null;
        total_sugars_g: number | null;
        protein_g: number | null;
        vitamin_d_mcg: number | null;
        calcium_mg: number | null;
        iron_mg: number | null;
        potassium_mg: number | null;
    }) => {
        setImportedData({
            name: ingredient.name,
            brand: '',
            usda_fdc_id: ingredient.usda_fdc_id,
            serving_size_g: ingredient.serving_size_g,
            calories: ingredient.calories,
            total_fat_g: ingredient.total_fat_g,
            saturated_fat_g: ingredient.saturated_fat_g,
            trans_fat_g: ingredient.trans_fat_g,
            cholesterol_mg: ingredient.cholesterol_mg,
            sodium_mg: ingredient.sodium_mg,
            total_carbohydrates_g: ingredient.total_carbohydrates_g,
            dietary_fiber_g: ingredient.dietary_fiber_g,
            total_sugars_g: ingredient.total_sugars_g,
            added_sugars_g: null,
            protein_g: ingredient.protein_g,
            vitamin_d_mcg: ingredient.vitamin_d_mcg,
            calcium_mg: ingredient.calcium_mg,
            iron_mg: ingredient.iron_mg,
            potassium_mg: ingredient.potassium_mg,
            contains_milk: false,
            contains_eggs: false,
            contains_fish: false,
            contains_shellfish: false,
            contains_tree_nuts: false,
            contains_peanuts: false,
            contains_wheat: false,
            contains_soybeans: false,
            contains_sesame: false,
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Add Ingredient</h1>
                    <p className="text-slate-400 mt-1">Create a new ingredient with full nutritional data</p>
                </div>
                <Button
                    onClick={() => setShowUSDASearch(true)}
                    className="bg-blue-500 hover:bg-blue-600 self-start"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search USDA Database
                </Button>
            </div>

            {/* AI-Powered USDA Search */}
            <AIIngredientFinder onSelectIngredient={handleAIIngredientSelect} />

            <IngredientForm initialData={importedData || undefined} key={importedData?.name || 'new'} />

            <USDASearchModal
                open={showUSDASearch}
                onClose={() => setShowUSDASearch(false)}
                onImport={handleUSDAImport}
            />
        </div>
    );
}
