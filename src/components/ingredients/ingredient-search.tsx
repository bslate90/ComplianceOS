'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface IngredientSearchResult {
    id: string;
    name: string;
    user_code: string | null;
    brand: string | null;
    calories: number | null;
    sodium_mg: number | null;
    protein_g: number | null;
    total_fat_g: number | null;
    total_carbohydrates_g: number | null;
    updated_at: string;
    source: 'local' | 'usda';
    usda_fdc_id?: number;
}

interface IngredientSearchProps {
    onSelect: (ingredient: IngredientSearchResult) => void;
    placeholder?: string;
    className?: string;
}

// Get the top nutrient (highest value relative to typical amounts)
function getTopNutrient(ing: IngredientSearchResult): { name: string; value: string } | null {
    const nutrients = [
        { key: 'calories', name: 'Cal', value: ing.calories, threshold: 100 },
        { key: 'sodium_mg', name: 'Na', value: ing.sodium_mg, threshold: 500 },
        { key: 'protein_g', name: 'Pro', value: ing.protein_g, threshold: 10 },
        { key: 'total_fat_g', name: 'Fat', value: ing.total_fat_g, threshold: 10 },
        { key: 'total_carbohydrates_g', name: 'Carb', value: ing.total_carbohydrates_g, threshold: 25 },
    ];

    // Find nutrient with highest ratio to threshold
    let best: { name: string; value: string } | null = null;
    let bestRatio = 0;

    for (const n of nutrients) {
        if (n.value !== null && n.value !== undefined) {
            const ratio = n.value / n.threshold;
            if (ratio > bestRatio) {
                bestRatio = ratio;
                best = { name: n.name, value: `${n.value}${n.key.includes('_mg') ? 'mg' : n.key.includes('_g') ? 'g' : ''}` };
            }
        }
    }

    return best;
}

function truncateText(text: string, maxLength = 25): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

export function IngredientSearch({ onSelect, placeholder, className }: IngredientSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<IngredientSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [searchUSDA, setSearchUSDA] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const searchIngredients = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            // Search local ingredients
            const response = await fetch(`/api/ingredients?search=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();

            // Map to search result format
            const localResults: IngredientSearchResult[] = data.map((ing: IngredientSearchResult) => ({
                ...ing,
                source: 'local' as const,
            }));

            // Optionally search USDA
            if (searchUSDA) {
                const usdaResponse = await fetch(`/api/usda/search?query=${encodeURIComponent(searchQuery)}`);
                if (usdaResponse.ok) {
                    const usdaData = await usdaResponse.json();
                    const usdaResults: IngredientSearchResult[] = (usdaData.foods || []).slice(0, 5).map((food: {
                        fdcId: number;
                        description: string;
                        brandName?: string;
                        foodNutrients: Array<{ nutrientId: number; value: number }>;
                    }) => {
                        // Map USDA nutrientIds
                        const getNutrient = (id: number) => food.foodNutrients?.find((n) => n.nutrientId === id)?.value ?? null;
                        return {
                            id: `usda-${food.fdcId}`,
                            name: food.description,
                            user_code: null,
                            brand: food.brandName || null,
                            calories: getNutrient(1008),
                            sodium_mg: getNutrient(1093),
                            protein_g: getNutrient(1003),
                            total_fat_g: getNutrient(1004),
                            total_carbohydrates_g: getNutrient(1005),
                            updated_at: new Date().toISOString(),
                            source: 'usda' as const,
                            usda_fdc_id: food.fdcId,
                        };
                    });
                    setResults([...localResults, ...usdaResults]);
                } else {
                    setResults(localResults);
                }
            } else {
                setResults(localResults);
            }

            setSelectedIndex(0);
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [searchUSDA]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            searchIngredients(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, searchIngredients]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results.length > 0) {
            e.preventDefault();
            onSelect(results[selectedIndex]);
            setQuery('');
            setShowResults(false);
        } else if (e.key === 'Escape') {
            setShowResults(false);
        }
    };

    return (
        <div className={cn('relative', className)}>
            {/* Search Input */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder || 'Search by code, name, or USDA...'}
                        className="bg-slate-700/50 border-slate-600 text-white"
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
                        </div>
                    )}
                </div>
                <Button
                    type="button"
                    variant={searchUSDA ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchUSDA(!searchUSDA)}
                    className={cn(
                        'shrink-0',
                        searchUSDA
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'border-slate-600 text-slate-400'
                    )}
                >
                    + USDA
                </Button>
            </div>

            {/* Results Dropdown */}
            {showResults && results.length > 0 && (
                <div
                    className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto"
                    onMouseLeave={() => setShowResults(false)}
                >
                    {/* Header */}
                    <div className="grid grid-cols-[80px_1fr_80px_70px] gap-2 px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-700 sticky top-0 bg-slate-800">
                        <span>Code</span>
                        <span>Name</span>
                        <span>Top Nutrient</span>
                        <span>Updated</span>
                    </div>

                    {/* Results */}
                    {results.map((result, index) => {
                        const topNutrient = getTopNutrient(result);
                        return (
                            <button
                                key={result.id}
                                onClick={() => {
                                    onSelect(result);
                                    setQuery('');
                                    setShowResults(false);
                                }}
                                className={cn(
                                    'w-full grid grid-cols-[80px_1fr_80px_70px] gap-2 px-3 py-2 text-left transition-colors',
                                    index === selectedIndex
                                        ? 'bg-emerald-600/20'
                                        : 'hover:bg-slate-700'
                                )}
                            >
                                {/* Code */}
                                <span className="font-mono text-xs text-emerald-400 truncate">
                                    {result.user_code || '—'}
                                </span>

                                {/* Name */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-white text-sm truncate" title={result.name}>
                                        {truncateText(result.name)}
                                    </span>
                                    {result.source === 'usda' && (
                                        <Badge className="bg-blue-600/30 text-blue-400 text-xs shrink-0">
                                            USDA
                                        </Badge>
                                    )}
                                </div>

                                {/* Top Nutrient */}
                                <span className="text-xs text-slate-400 truncate">
                                    {topNutrient ? `${topNutrient.name}: ${topNutrient.value}` : '—'}
                                </span>

                                {/* Updated */}
                                <span className="text-xs text-slate-500">
                                    {formatDate(result.updated_at)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* No Results */}
            {showResults && query.length >= 2 && !loading && results.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-4 text-center text-slate-400 text-sm">
                    No ingredients found. {!searchUSDA && 'Try enabling USDA search.'}
                </div>
            )}
        </div>
    );
}
