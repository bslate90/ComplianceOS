'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ExtractedNutritionData } from '@/lib/types/supplier.types';

interface USDAFood {
    fdcId: number;
    description: string;
    brandName?: string;
    dataType: string;
    foodNutrients: Array<{
        nutrientId: number;
        nutrientName: string;
        value: number;
        unitName: string;
    }>;
}

interface USDAComparisonProps {
    extractedData: ExtractedNutritionData;
    onSelect: (usdaData: ExtractedNutritionData, fdcId: number) => void;
    onSkip: () => void;
}

// Map USDA nutrient IDs to our field names
const NUTRIENT_MAP: Record<number, keyof ExtractedNutritionData> = {
    1008: 'calories',           // Energy (kcal)
    1003: 'protein_g',          // Protein
    1004: 'total_fat_g',        // Total lipid (fat)
    1258: 'saturated_fat_g',    // Fatty acids, total saturated
    1257: 'trans_fat_g',        // Fatty acids, total trans
    1253: 'cholesterol_mg',     // Cholesterol
    1093: 'sodium_mg',          // Sodium
    1005: 'total_carbohydrates_g', // Carbohydrate
    1079: 'dietary_fiber_g',    // Fiber, total dietary
    2000: 'total_sugars_g',     // Sugars, total
    1235: 'added_sugars_g',     // Sugars, added
    1114: 'vitamin_d_mcg',      // Vitamin D
    1087: 'calcium_mg',         // Calcium
    1089: 'iron_mg',            // Iron
    1092: 'potassium_mg',       // Potassium
};

function extractUSDANutrition(food: USDAFood): ExtractedNutritionData {
    const data: ExtractedNutritionData = {
        name: food.description,
        brand: food.brandName,
        serving_size_g: 100, // USDA data is per 100g
    };

    // USDA API returns nutrients under different property names depending on data type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foodAny = food as any;
    const nutrients = food.foodNutrients || foodAny.labelNutrients || [];

    console.log('USDA Food data:', {
        description: food.description,
        hasNutrients: !!food.foodNutrients,
        nutrientCount: food.foodNutrients?.length,
        sampleNutrient: food.foodNutrients?.[0]
    });

    for (const nutrient of nutrients) {
        // Handle different API response formats
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const n = nutrient as any;
        const nutrientId = n.nutrientId || n.nutrient?.id;
        const value = n.value ?? n.amount;

        if (nutrientId && value !== undefined) {
            const fieldName = NUTRIENT_MAP[nutrientId];
            if (fieldName) {
                (data as Record<string, unknown>)[fieldName] = value;
            }
        }
    }

    console.log('Extracted USDA nutrition:', data);

    return data;
}

const COMPARISON_FIELDS = [
    { key: 'calories', label: 'Calories', unit: '' },
    { key: 'total_fat_g', label: 'Total Fat', unit: 'g' },
    { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g' },
    { key: 'trans_fat_g', label: 'Trans Fat', unit: 'g' },
    { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg' },
    { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
    { key: 'total_carbohydrates_g', label: 'Total Carbs', unit: 'g' },
    { key: 'dietary_fiber_g', label: 'Dietary Fiber', unit: 'g' },
    { key: 'total_sugars_g', label: 'Total Sugars', unit: 'g' },
    { key: 'protein_g', label: 'Protein', unit: 'g' },
    { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg' },
    { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
    { key: 'iron_mg', label: 'Iron', unit: 'mg' },
    { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
];

function calculateDifference(scanned: number | undefined, usda: number | undefined): { diff: number; percent: string } | null {
    if (scanned === undefined || usda === undefined || usda === 0) return null;
    const diff = scanned - usda;
    const percent = ((diff / usda) * 100).toFixed(0);
    return { diff, percent };
}

export function USDAComparison({ extractedData, onSelect, onSkip }: USDAComparisonProps) {
    const [searchQuery, setSearchQuery] = useState(extractedData.name || '');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<USDAFood[]>([]);
    const [selectedFood, setSelectedFood] = useState<USDAFood | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setSearching(true);
        setHasSearched(true);

        try {
            const response = await fetch(`/api/usda/search?query=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) throw new Error('Search failed');

            const data = await response.json();
            setResults(data.foods || []);
        } catch (error) {
            console.error('USDA search error:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectFood = async (food: USDAFood) => {
        // Fetch full nutrition data
        try {
            const response = await fetch(`/api/usda/search?fdcId=${food.fdcId}`);
            if (!response.ok) throw new Error('Failed to fetch food details');

            const fullFood = await response.json();
            setSelectedFood(fullFood);
        } catch (error) {
            console.error('Error fetching food details:', error);
            // Use the basic data we have
            setSelectedFood(food);
        }
    };

    const handleUseUSDAData = () => {
        if (selectedFood) {
            const usdaData = extractUSDANutrition(selectedFood);
            onSelect(usdaData, selectedFood.fdcId);
        }
    };

    const selectedUSDAData = selectedFood ? extractUSDANutrition(selectedFood) : null;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-white">Compare with USDA Database</h3>
                    <p className="text-slate-400 text-sm mt-1">
                        Find similar ingredients to validate your scanned data
                    </p>
                </div>
                <Button variant="outline" onClick={onSkip} className="border-slate-600 text-slate-300">
                    Skip Comparison
                </Button>
            </div>

            {/* Search */}
            <div className="flex gap-2">
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search USDA database..."
                    className="bg-slate-700/50 border-slate-600 text-white"
                />
                <Button
                    onClick={handleSearch}
                    disabled={searching}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    {searching ? 'Searching...' : 'Search'}
                </Button>
            </div>

            {/* Results */}
            {hasSearched && !selectedFood && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {results.length === 0 ? (
                        <p className="text-slate-400 text-center py-4">No results found</p>
                    ) : (
                        results.slice(0, 10).map((food) => (
                            <button
                                key={food.fdcId}
                                onClick={() => handleSelectFood(food)}
                                className="w-full text-left p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-slate-700 transition-colors"
                            >
                                <p className="text-white font-medium">{food.description}</p>
                                <div className="flex gap-2 mt-1">
                                    {food.brandName && (
                                        <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                                            {food.brandName}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-600">
                                        {food.dataType}
                                    </Badge>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Side-by-side Comparison */}
            {selectedFood && selectedUSDAData && (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-white text-lg">Nutrient Comparison (per 100g)</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFood(null)}
                                className="text-slate-400"
                            >
                                Change selection
                            </Button>
                        </div>
                        <p className="text-sm text-slate-400">
                            Comparing against: <span className="text-blue-400">{selectedFood.description}</span>
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-2 text-slate-400 font-medium">Nutrient</th>
                                        <th className="text-right py-2 text-emerald-400 font-medium">Scanned</th>
                                        <th className="text-right py-2 text-blue-400 font-medium">USDA</th>
                                        <th className="text-right py-2 text-slate-400 font-medium">Difference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPARISON_FIELDS.map((field) => {
                                        const scannedValue = extractedData[field.key as keyof ExtractedNutritionData] as number | undefined;
                                        const usdaValue = selectedUSDAData[field.key as keyof ExtractedNutritionData] as number | undefined;
                                        const diff = calculateDifference(scannedValue, usdaValue);

                                        const hasDifference = diff && Math.abs(diff.diff) > 0.1;
                                        const isHigherThanUSDA = diff && diff.diff > 0;

                                        return (
                                            <tr key={field.key} className="border-b border-slate-700/50">
                                                <td className="py-2 text-slate-300">{field.label}</td>
                                                <td className="text-right py-2 text-white">
                                                    {scannedValue !== undefined ? `${scannedValue}${field.unit}` : '-'}
                                                </td>
                                                <td className="text-right py-2 text-white">
                                                    {usdaValue !== undefined ? `${usdaValue}${field.unit}` : '-'}
                                                </td>
                                                <td className="text-right py-2">
                                                    {diff ? (
                                                        <span className={cn(
                                                            'font-medium',
                                                            hasDifference
                                                                ? isHigherThanUSDA
                                                                    ? 'text-amber-400'
                                                                    : 'text-emerald-400'
                                                                : 'text-slate-500'
                                                        )}>
                                                            {hasDifference ? (
                                                                <>
                                                                    {isHigherThanUSDA ? '+' : ''}{diff.percent}%
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-500">—</span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={handleUseUSDAData}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Use USDA Values
                            </Button>
                            <Button
                                onClick={onSkip}
                                variant="outline"
                                className="border-emerald-600 text-emerald-400 hover:bg-emerald-500/10"
                            >
                                Keep Scanned Values
                            </Button>
                        </div>

                        <p className="text-xs text-slate-500 mt-4">
                            💡 Tip: Large differences may indicate scanning errors or product-specific variations
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
