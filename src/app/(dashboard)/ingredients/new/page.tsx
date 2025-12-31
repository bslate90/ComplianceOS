'use client';

import { useState } from 'react';
import { IngredientForm, IngredientFormData } from '@/components/ingredients/ingredient-form';
import { USDASearchModal } from '@/components/ingredients/usda-search-modal';
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

            <IngredientForm initialData={importedData || undefined} key={importedData?.name || 'new'} />

            <USDASearchModal
                open={showUSDASearch}
                onClose={() => setShowUSDASearch(false)}
                onImport={handleUSDAImport}
            />
        </div>
    );
}
